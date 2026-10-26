"""Make sure HairFastGAN pretrained models and the fine-tuned B24 checkpoint exist.

Everything is cached under /workspace (RunPod volume) so it downloads only once.

Checkpoint sources, tried in this order when CHECKPOINT_PATH does not exist yet:
  1. CHECKPOINT_HF_REPO (+ CHECKPOINT_HF_FILENAME, HF_TOKEN for private repos)
  2. CHECKPOINT_GDRIVE_ID  (Google Drive file id, shared "Anyone with the link")
  3. CHECKPOINT_URL        (any direct https URL)
Or upload the file yourself to CHECKPOINT_PATH (default /workspace/checkpoints/best.pt).
"""
import hashlib
import os
import shutil
import sys
from pathlib import Path

REPO_DIR = Path(os.environ.get('HAIRFAST_REPO', '/opt/HairFastGAN'))
MODELS_DIR = Path(os.environ.get('PRETRAINED_DIR', '/workspace/models/pretrained_models'))
CHECKPOINT = Path(os.environ.get('CHECKPOINT_PATH', '/workspace/checkpoints/best.pt'))
EXPECTED_SHA256 = os.environ.get(
    'CHECKPOINT_SHA256', '6195edd247917e7c34887945413e08b731faae736f5239dd2b28d9636e65f98b').strip().lower()
REQUIRED = ['StyleGAN/ffhq.pt', 'encoder4editing/e4e_ffhq_encode.pt',
            'ShapeAdaptor/shape_predictor_68_face_landmarks.dat', 'ShapeAdaptor/mask_generator.pth',
            'PostProcess/latent_avg.pt', 'PostProcess/pp_model.pth', 'Blending/checkpoint.pth',
            'Rotate/rotate_best.pth', 'ArcFace/backbone_ir50.pth', 'BiSeNet/seg.pth',
            'FeatureStyleEncoder/143_enc.pth']


def sha_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def models_complete():
    return all((MODELS_DIR / r).is_file() and (MODELS_DIR / r).stat().st_size > 1000 for r in REQUIRED)


def ensure_pretrained():
    if not models_complete():
        from huggingface_hub import snapshot_download
        print('ดาวน์โหลด HairFastGAN pretrained_models (ครั้งแรกครั้งเดียว ~หลาย GB)...', flush=True)
        # Download straight into the volume (no second copy in the HF cache).
        stage = MODELS_DIR.parent / '_hf_download'
        snapshot_download('AIRI-Institute/HairFastGAN', allow_patterns=['pretrained_models/**'],
                          local_dir=str(stage))
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        for src in (stage / 'pretrained_models').iterdir():
            dst = MODELS_DIR / src.name
            if dst.exists():
                shutil.rmtree(dst) if dst.is_dir() else dst.unlink()
            shutil.move(str(src), str(dst))
        shutil.rmtree(stage, ignore_errors=True)
    for r in REQUIRED:  # catches Git-LFS pointer files too
        p = MODELS_DIR / r
        if not p.is_file() or p.stat().st_size < 1000:
            sys.exit(f'โมเดลขาดหรือไม่สมบูรณ์: {p}')
    # Link the cached folder into the repo (code uses relative 'pretrained_models/...').
    link = REPO_DIR / 'pretrained_models'
    if link.is_symlink() or link.is_file():
        link.unlink()
    elif link.is_dir():
        shutil.rmtree(link)
    link.symlink_to(MODELS_DIR, target_is_directory=True)
    for d in ('input', 'output'):
        (REPO_DIR / d).mkdir(exist_ok=True)
    print('pretrained_models พร้อม:', MODELS_DIR, flush=True)


def _download_checkpoint():
    CHECKPOINT.parent.mkdir(parents=True, exist_ok=True)
    tmp = CHECKPOINT.with_suffix('.part')
    hf_repo = os.environ.get('CHECKPOINT_HF_REPO', '').strip()
    gdrive = os.environ.get('CHECKPOINT_GDRIVE_ID', '').strip()
    url = os.environ.get('CHECKPOINT_URL', '').strip()
    if hf_repo:
        from huggingface_hub import hf_hub_download
        name = os.environ.get('CHECKPOINT_HF_FILENAME', 'best.pt').strip()
        print(f'ดาวน์โหลด checkpoint จาก Hugging Face: {hf_repo}/{name}', flush=True)
        # local_dir: download straight next to the target (no second copy in the HF cache)
        stage = CHECKPOINT.parent / '_hf_download'
        p = hf_hub_download(hf_repo, name, repo_type=os.environ.get('CHECKPOINT_HF_REPO_TYPE', 'model'),
                            token=os.environ.get('HF_TOKEN') or None, local_dir=str(stage))
        shutil.move(p, tmp)
        shutil.rmtree(stage, ignore_errors=True)
    elif gdrive:
        import gdown
        print('ดาวน์โหลด checkpoint จาก Google Drive id:', gdrive, flush=True)
        if not gdown.download(id=gdrive, output=str(tmp), quiet=False):
            sys.exit('ดาวน์โหลดจาก Google Drive ไม่สำเร็จ: ตรวจว่าแชร์ไฟล์แบบ Anyone with the link')
    elif url:
        import requests
        print('ดาวน์โหลด checkpoint จาก URL', flush=True)
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(tmp, 'wb') as f:
                for chunk in r.iter_content(8 * 1024 * 1024):
                    f.write(chunk)
    else:
        sys.exit(f'ไม่พบ checkpoint ที่ {CHECKPOINT}\n'
                 'อัปโหลด best.pt ไปที่ path นี้ หรือตั้ง env CHECKPOINT_HF_REPO / CHECKPOINT_GDRIVE_ID / CHECKPOINT_URL')
    tmp.replace(CHECKPOINT)


def ensure_checkpoint():
    if not CHECKPOINT.is_file():
        _download_checkpoint()
    if EXPECTED_SHA256:
        digest = sha_file(CHECKPOINT)
        if digest != EXPECTED_SHA256:
            sys.exit(f'checkpoint sha256 ไม่ตรง\n  ได้: {digest}\n  ต้องการ: {EXPECTED_SHA256}\n'
                     'ถ้าตั้งใจใช้ไฟล์อื่น ตั้ง CHECKPOINT_SHA256 ให้ตรงไฟล์ใหม่')
    print('checkpoint พร้อม:', CHECKPOINT, flush=True)


if __name__ == '__main__':
    ensure_pretrained()
    ensure_checkpoint()
