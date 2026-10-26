"""FastAPI server for LOOKLAB HairFastGAN B24 on RunPod.

Same endpoints as the Colab notebook (sections 9-10) so the web works unchanged:
  GET  /health, /settings, /feedback-config
  POST /generate            -> {"images": {"result": <png base64>}, ...metadata}
  POST /jobs, GET /jobs/{id}, /jobs/{id}/result, /jobs/{id}/download
  POST /feedback
Colab Secrets are replaced by environment variables.
"""
import base64
import hashlib
import io
import json
import math
import os
import re
import shutil
import tempfile
import threading
import traceback
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

import requests
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageOps

import pipeline as P

API_TOKEN = os.environ.get('API_TOKEN', '').strip()
_LOAD_STATE = {'status': 'loading', 'error': None}

app = FastAPI(title='HairFastGAN B24 + Face 0.35 + Background (RunPod)')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])


# ---------------------------------------------------------------- startup
def _load_in_background():
    try:
        P.load_models()
        _LOAD_STATE['status'] = 'ok'
    except Exception as e:  # keep the server up so /health can report the problem
        traceback.print_exc()
        _LOAD_STATE.update(status='error', error=f'{type(e).__name__}: {e}')
        if os.environ.get('RUNPOD_ENDPOINT_ID'):
            # Serverless: a worker that can never become healthy only costs money — exit.
            print('!! serverless: โหลดโมเดลไม่สำเร็จ ปิด worker นี้', flush=True)
            os._exit(1)


@app.on_event('startup')
def _startup():
    if os.environ.get('SKIP_MODEL_LOAD') == '1':  # used only by the local smoke test
        _LOAD_STATE['status'] = 'ok'
        return
    threading.Thread(target=_load_in_background, daemon=True).start()


def require_ready():
    if _LOAD_STATE['status'] == 'loading':
        raise HTTPException(503, 'โมเดลกำลังโหลด กรุณารอสักครู่แล้วลองใหม่', headers={'Retry-After': '20'})
    if _LOAD_STATE['status'] == 'error':
        raise HTTPException(503, 'โหลดโมเดลไม่สำเร็จ: ' + str(_LOAD_STATE['error']))


def require_token(request: Request):
    """Optional: only enforced when API_TOKEN is set."""
    if not API_TOKEN:
        return
    auth = request.headers.get('authorization', '')
    token = auth[7:].strip() if auth.lower().startswith('bearer ') else request.headers.get('x-api-token', '').strip()
    if token != API_TOKEN:
        raise HTTPException(401, 'API token ไม่ถูกต้อง')


# ---------------------------------------------------------------- generation
def save_inputs(uploads):
    folder = Path(tempfile.mkdtemp(prefix='hfg_single_'))
    paths = []
    try:
        for role, upload in zip(('face', 'shape', 'color'), uploads):
            data = upload.file.read(20 * 1024 * 1024 + 1)
            if len(data) > 20 * 1024 * 1024:
                raise ValueError('ไฟล์เกิน 20 MB')
            with Image.open(io.BytesIO(data)) as im:
                p = folder / (role + '.png')
                ImageOps.exif_transpose(im).convert('RGB').save(p)
                paths.append(p)
        return folder, paths
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise


def result_payload(result):
    buf = io.BytesIO()
    result['image'].save(buf, format='PNG')
    return {**result['metadata'], 'images': {'result': base64.b64encode(buf.getvalue()).decode()}, 'image_count': 1}


@app.get('/')
def root():
    return {'service': 'looklab-hairfastgan', 'status': _LOAD_STATE['status'], 'docs': '/docs'}


@app.get('/ping')
def ping():
    """RunPod Serverless (load balancer) health check: 200 ready, 204 loading, 503 failed."""
    if _LOAD_STATE['status'] == 'ok':
        return {'status': 'healthy'}
    if _LOAD_STATE['status'] == 'loading':
        return Response(status_code=204)
    return Response(status_code=503)


@app.get('/health')
def health():
    body = {'status': _LOAD_STATE['status'], 'trial': 'B', 'epoch': 24, 'image_count': 1,
            'build': P.COMPARE_WEB_BUILD}
    if _LOAD_STATE['error']:
        body['error'] = _LOAD_STATE['error']
    if P.ENVIRONMENT:
        body['gpu'] = P.ENVIRONMENT.get('gpu')
    return body


@app.get('/settings')
def api_settings():
    return {'modes': ['raw_diffusion_guarded_background'], 'image_count': 1,
            'build': P.COMPARE_WEB_BUILD, 'fixed_profile': True,
            'defaults': {**P.COMPARE_WEB_PROFILE, 'seed': 3407, 'color_lock': 'auto'},
            'note': 'Web uses the comparison defaults; legacy strength/steps/guidance/face_blend fields are recorded but overridden.'}


def _run(paths, **settings):
    return P.run_compare_profile(*paths, **settings)


@app.post('/generate', dependencies=[Depends(require_token)])
def generate(face_image: UploadFile = File(...), shape_image: UploadFile = File(...), color_image: UploadFile = File(...),
             seed: int = Form(P.DEFAULT_SEED), strength: float = Form(None), steps: int = Form(None),
             guidance: float = Form(None), face_blend: float = Form(P.JOINT_FACE_BLEND),
             color_lock: str = Form(P.COLOR_LOCK_MODE)):
    require_ready()
    try:
        folder, paths = save_inputs((face_image, shape_image, color_image))
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception:
        raise HTTPException(422, 'อ่านไฟล์รูปไม่ได้')
    try:
        return result_payload(_run(paths, seed=seed, strength=strength, steps=steps, guidance=guidance,
                                   face_blend=face_blend, color_lock=color_lock))
    except ValueError as e:
        raise HTTPException(422, str(e))
    finally:
        shutil.rmtree(folder, ignore_errors=True)


_POOL = ThreadPoolExecutor(max_workers=1)
_JOBS = {}
_JOBS_LOCK = threading.Lock()
_JOBS_KEEP = 50  # finished jobs kept in memory


def _prune_jobs():
    done = [k for k, v in _JOBS.items() if v['status'] in ('complete', 'error')]
    for k in done[:-_JOBS_KEEP]:
        _JOBS.pop(k, None)


def worker(job, folder, paths, settings):
    _JOBS[job]['status'] = 'running'
    try:
        result = _run(paths, **settings)
        _JOBS[job].update(status='complete', result=result)
    except Exception as e:
        _JOBS[job].update(status='error', error=str(e))
    finally:
        shutil.rmtree(folder, ignore_errors=True)


@app.post('/jobs', dependencies=[Depends(require_token)])
def submit(face_image: UploadFile = File(...), shape_image: UploadFile = File(...), color_image: UploadFile = File(...),
           seed: int = Form(P.DEFAULT_SEED), strength: float = Form(None), steps: int = Form(None),
           guidance: float = Form(None), face_blend: float = Form(P.JOINT_FACE_BLEND),
           color_lock: str = Form(P.COLOR_LOCK_MODE)):
    require_ready()
    try:
        P.validate_color_lock(color_lock)
    except ValueError as e:
        raise HTTPException(422, str(e))
    with _JOBS_LOCK:
        _prune_jobs()
        if sum(j['status'] in ('queued', 'running') for j in _JOBS.values()) >= 4:
            raise HTTPException(429, 'คิวเต็ม')
        try:
            folder, paths = save_inputs((face_image, shape_image, color_image))
        except ValueError as e:
            raise HTTPException(422, str(e))
        job = uuid.uuid4().hex
        _JOBS[job] = {'status': 'queued'}
    _POOL.submit(worker, job, folder, paths, dict(seed=seed, strength=strength, steps=steps, guidance=guidance,
                                                  face_blend=face_blend, color_lock=color_lock))
    return {'job_id': job, 'status': 'queued'}


def get_job(job_id):
    if job_id not in _JOBS:
        raise HTTPException(404, 'ไม่พบงาน')
    return _JOBS[job_id]


@app.get('/jobs/{job_id}')
def job_status(job_id: str):
    return {k: v for k, v in get_job(job_id).items() if k != 'result'}


@app.get('/jobs/{job_id}/result')
def job_result(job_id: str):
    j = get_job(job_id)
    if j['status'] != 'complete':
        raise HTTPException(409, j['status'])
    return result_payload(j['result'])


@app.get('/jobs/{job_id}/download')
def job_download(job_id: str):
    j = get_job(job_id)
    if j['status'] != 'complete':
        raise HTTPException(409, j['status'])
    result = j['result']
    stream = io.BytesIO()
    png = io.BytesIO()
    result['image'].save(png, format='PNG')
    with zipfile.ZipFile(stream, 'w', compression=zipfile.ZIP_STORED) as z:
        z.writestr('result.png', png.getvalue())
        z.writestr('metadata.json', json.dumps(result['metadata'], ensure_ascii=False, indent=2))
    return Response(stream.getvalue(), media_type='application/zip',
                    headers={'Content-Disposition': 'attachment; filename="result.zip"'})


# ---------------------------------------------------------------- feedback (section 10)
_FEEDBACK_SLOTS = threading.BoundedSemaphore(2)
_FEEDBACK_ID = re.compile(r'^[A-Za-z0-9_-]{8,100}$')
_FEEDBACK_IMAGE_MAX = 4 * 1024 * 1024
_FEEDBACK_AGE_GROUPS = ('ต่ำกว่า 18 ปี', '18–24 ปี', '25–34 ปี', '35–44 ปี', '45–54 ปี', '55 ปีขึ้นไป')


def validate_feedback(data):
    if not isinstance(data, dict):
        raise ValueError('metadata ต้องเป็น JSON object')
    allowed = {'experiment_id', 'result_key', 'experiment_type', 'hairstyle_id', 'hairstyle_name',
               'hair_color_id', 'hair_color_name', 'mode', 'seed', 'source_endpoint',
               'user_wait_seconds', 'hairstyle_rating', 'hair_color_rating',
               'face_similarity_rating', 'waiting_satisfaction_rating', 'suggestion',
               'image_storage_consent', 'overall_satisfaction_rating', 'age_group', 'website_satisfaction_rating'}
    if set(data) - allowed:
        raise ValueError('พบชื่อข้อมูลที่ไม่รองรับ')
    out = dict(data)
    if out.get('age_group') not in _FEEDBACK_AGE_GROUPS:
        raise ValueError('กรุณาเลือกช่วงอายุจาก 6 ตัวเลือกที่กำหนด')
    if not isinstance(out.get('experiment_id'), str) or not _FEEDBACK_ID.fullmatch(out['experiment_id']):
        raise ValueError('experiment_id ต้องยาว 8–100 ตัว ใช้ตัวอักษรอังกฤษ ตัวเลข - หรือ _')
    for name, limit in [('result_key', 120), ('hairstyle_id', 100), ('hairstyle_name', 200),
                        ('hair_color_id', 100), ('hair_color_name', 200), ('mode', 120),
                        ('source_endpoint', 100), ('suggestion', 2000)]:
        value = out.get(name, '')
        if not isinstance(value, str) or len(value) > limit:
            raise ValueError(f'{name} ต้องเป็นข้อความไม่เกิน {limit} ตัวอักษร')
        out[name] = value.strip()
    if not out['result_key']:
        raise ValueError('ต้องระบุ result_key ของภาพที่กำลังประเมิน')
    kind = out.get('experiment_type')
    if kind not in ('hairstyle', 'color', 'both'):
        raise ValueError('experiment_type ต้องเป็น hairstyle, color หรือ both')
    if kind in ('hairstyle', 'both') and not out['hairstyle_name']:
        raise ValueError('ต้องระบุชื่อทรงผมที่ใช้สร้างผลลัพธ์')
    if kind in ('color', 'both') and not out['hair_color_name']:
        raise ValueError('ต้องระบุชื่อสีผมที่ใช้สร้างผลลัพธ์')
    required = ['face_similarity_rating', 'waiting_satisfaction_rating', 'overall_satisfaction_rating',
                'website_satisfaction_rating']
    if kind in ('hairstyle', 'both'):
        required.append('hairstyle_rating')
    if kind in ('color', 'both'):
        required.append('hair_color_rating')
    for name in ('hairstyle_rating', 'hair_color_rating', 'face_similarity_rating', 'waiting_satisfaction_rating',
                 'overall_satisfaction_rating', 'website_satisfaction_rating'):
        value = out.get(name)
        if name in required:
            if type(value) is not int or not 1 <= value <= 5:
                raise ValueError(f'{name} ต้องเป็นคะแนนจำนวนเต็ม 1–5')
        elif value is not None:
            raise ValueError(f'{name} ไม่เกี่ยวข้องกับการทดลองนี้ ให้ส่ง null หรือไม่ส่ง')
        out[name] = value
    if type(out.get('image_storage_consent')) is not bool:
        raise ValueError('image_storage_consent ต้องเป็น true หรือ false')
    wait = out.get('user_wait_seconds')
    if type(wait) not in (int, float) or not math.isfinite(wait) or not 0 <= wait <= 86400:
        raise ValueError('user_wait_seconds ต้องเป็นตัวเลข 0–86400')
    out['user_wait_seconds'] = round(float(wait), 3)
    seed = out.get('seed')
    if seed is not None and (type(seed) is not int or not 0 <= seed <= 4294967295):
        raise ValueError('seed ไม่ถูกต้อง')
    out['seed'] = seed
    return out


def feedback_settings():
    url = os.environ.get('FEEDBACK_APPS_SCRIPT_URL', '').strip()
    secret = os.environ.get('FEEDBACK_SHARED_SECRET', '')
    if not url or not secret:
        raise HTTPException(503, 'ตั้ง env FEEDBACK_APPS_SCRIPT_URL และ FEEDBACK_SHARED_SECRET ใน RunPod ก่อน')
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.netloc != 'script.google.com' or not re.fullmatch(
            r'/macros/s/[A-Za-z0-9_-]+/exec', parsed.path) or parsed.query:
        raise HTTPException(503, 'FEEDBACK_APPS_SCRIPT_URL ต้องเป็น URL Web app ของ Apps Script ที่ลงท้าย /exec')
    if len(secret) < 32:
        raise HTTPException(503, 'FEEDBACK_SHARED_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร')
    return url, secret


def feedback_image(upload):
    if upload is None:
        raise HTTPException(422, 'เมื่อยินยอมเก็บภาพ ต้องส่ง original_image และ result_image')
    raw = upload.file.read(12 * 1024 * 1024 + 1)
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(413, 'รูปใหญ่เกิน 12 MB')
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format not in ('PNG', 'JPEG', 'WEBP') or image.width * image.height > 16_000_000:
                raise HTTPException(422, 'รองรับ PNG/JPG/WEBP ไม่เกิน 16 ล้านพิกเซล')
            image = ImageOps.exif_transpose(image).convert('RGB')
            source_size = image.size
            for _ in range(20):
                buffer = io.BytesIO()
                image.save(buffer, format='PNG')
                encoded = buffer.getvalue()
                if len(encoded) <= _FEEDBACK_IMAGE_MAX:
                    return {'base64': base64.b64encode(encoded).decode('ascii'),
                            'mime_type': 'image/png', 'source_size': list(source_size),
                            'saved_size': list(image.size), 'resized': image.size != source_size}
                if max(image.size) <= 256:
                    break
                scale = min(0.8, 2048 / max(image.size))
                image = image.resize((max(1, round(image.width * scale)),
                                      max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
            raise HTTPException(413, 'ไม่สามารถย่อรูปให้ต่ำกว่า 4 MB ได้ กรุณาเลือกไฟล์ภาพใหม่')
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'อ่านไฟล์รูปไม่ได้')


@app.get('/feedback-config')
def feedback_config():
    try:
        feedback_settings()
        ready = True
    except HTTPException:
        ready = False
    return {'configured': ready, 'endpoint': '/feedback', 'format': 'multipart/form-data',
            'image_limit_bytes_after_png_conversion': _FEEDBACK_IMAGE_MAX,
            'ratings_min': 1, 'ratings_max': 5,
            'note': 'configured ตรวจเฉพาะ env vars ไม่ได้ยืนยันสิทธิ์ Sheets/Drive; ทดสอบจริงตามคู่มือ'}


@app.post('/feedback', dependencies=[Depends(require_token)])
def submit_feedback(metadata: str = Form(..., max_length=12000),
                    original_image: UploadFile | None = File(None),
                    result_image: UploadFile | None = File(None)):
    acquired = _FEEDBACK_SLOTS.acquire(blocking=False)
    try:
        if not acquired:
            raise HTTPException(429, 'กำลังบันทึกความคิดเห็นอื่น กรุณาลองใหม่', headers={'Retry-After': '5'})
        try:
            data = validate_feedback(json.loads(metadata))
        except (ValueError, TypeError) as exc:
            raise HTTPException(422, str(exc))
        url, secret = feedback_settings()
        images = {}
        if data['image_storage_consent']:
            images = {'original': feedback_image(original_image), 'result': feedback_image(result_image)}
        canonical = json.dumps({'metadata': data, 'images': images}, sort_keys=True, separators=(',', ':'),
                               ensure_ascii=False)
        payload = {'secret': secret, 'metadata': data, 'images': images,
                   'payload_hash': hashlib.sha256(canonical.encode('utf-8')).hexdigest()}
        try:
            upstream = requests.post(url, json=payload, timeout=(10, 75))
            upstream.raise_for_status()
            answer = upstream.json()
        except (requests.RequestException, ValueError):
            raise HTTPException(502, 'ยังยืนยันการบันทึกไม่ได้ ตรวจ Apps Script แล้วลองใหม่ด้วย experiment_id และคำตอบเดิม')
        if not isinstance(answer, dict) or answer.get('ok') is not True:
            code = answer.get('code') if isinstance(answer, dict) else None
            if code == 'CONFLICT':
                raise HTTPException(409, 'ภาพนี้มีคำตอบที่บันทึกแล้วต่างจากคำตอบครั้งนี้ ไม่สร้างแถวซ้ำ')
            if code == 'BUSY':
                raise HTTPException(503, 'ระบบเก็บข้อมูลกำลังทำงาน กรุณาลองใหม่ด้วยข้อมูลเดิม')
            raise HTTPException(502, 'บันทึกไม่สำเร็จ ตรวจ Script Properties / สิทธิ์ Sheets และ Drive')
        if answer.get('experiment_id') != data['experiment_id'] or answer.get('result_key') != data['result_key']:
            raise HTTPException(502, 'ผลยืนยันไม่ตรงกับการทดลอง')
        return {'saved': True, 'experiment_id': data['experiment_id'], 'result_key': data['result_key'],
                'duplicate': answer.get('duplicate') is True, 'message': 'ขอบคุณสำหรับความคิดเห็น'}
    finally:
        if acquired:
            _FEEDBACK_SLOTS.release()
        for upload in (original_image, result_image):
            if upload is not None:
                upload.file.close()
