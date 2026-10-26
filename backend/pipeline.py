"""HairFastGAN B24 (fine-tuned) + segmentation + diffusion — web inference path.

Ported from the LOOKLAB Colab notebook (sections 4-7). Only the path the web uses
(`run_compare_profile`, build raw-background-smooth-gap-v4) is kept. Algorithm,
constants and prompts are unchanged; Colab/Drive specifics are replaced by env vars.
"""
import hashlib
import inspect
import os
import sys
import textwrap
import threading
import time
import types
import uuid
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageOps
from scipy.ndimage import distance_transform_edt

# ---------------------------------------------------------------- config (env)
REPO_DIR = Path(os.environ.get('HAIRFAST_REPO', '/opt/HairFastGAN'))
CHECKPOINT = Path(os.environ.get('CHECKPOINT_PATH', '/workspace/checkpoints/best.pt'))
# SHA-256 of trial_B/best.pt (epoch 24) recorded in the notebook. Set to "" to skip.
EXPECTED_SHA256 = os.environ.get(
    'CHECKPOINT_SHA256', '6195edd247917e7c34887945413e08b731faae736f5239dd2b28d9636e65f98b').strip().lower()
DEVICE = 'cuda'
SEG_MODEL_ID = os.environ.get('SEG_MODEL_ID', 'mattmdjaga/segformer_b2_clothes')
SEG_REVISION = os.environ.get('SEG_REVISION', 'main')
DIFFUSION_MODEL_ID = os.environ.get('DIFFUSION_MODEL_ID', 'stablediffusionapi/realistic-vision-v51')
DIFFUSION_REVISION = os.environ.get('DIFFUSION_REVISION', 'main')
# auto: offload only when the GPU has < 20 GB VRAM (Colab notebook used True)
DIFFUSION_CPU_OFFLOAD = os.environ.get('DIFFUSION_CPU_OFFLOAD', 'auto').strip().lower()

GPU_LOCK = threading.Lock()
DEFAULT_SEED = 3407
INPAINT_STRENGTH = .15
INPAINT_STEPS = 30
INPAINT_GUIDANCE = 2.5
JOINT_FACE_BLEND = 0.35
DIFFUSION_SIDE = 1024
COLOR_LOCK_MODE = 'auto'
DETAIL_GAIN = .65
DETAIL_MAX_RGB = 5.0
RAW_BG_GAP_PX = 4.0  # pixels at 1024, scaled with output size
RAW_BG_FEATHER_PX = 32.0
RAW_BG_DETAIL_AMOUNT = .45
COMPARE_WEB_PROFILE = {'strength': 0.15, 'steps': 30, 'guidance': 2.5, 'face_blend': 0.35}
COMPARE_WEB_BUILD = 'raw-background-smooth-gap-v4'

# Filled by load_models()
hair_fast = seg_processor = seg_model = inpaint_pipe = None
label_ids = {}
HAIR_ID = FACE_ID = None
ENVIRONMENT = {}
READY = False


def sha_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------- model loading
def _load_hairfast():
    """Notebook section 4: load HairFast + B epoch 24 weights + rotation policy."""
    global hair_fast
    os.chdir(REPO_DIR)  # HairFastGAN uses relative 'pretrained_models/...' paths
    if str(REPO_DIR) not in sys.path:
        sys.path.insert(0, str(REPO_DIR))
    from hair_swap import HairFast, get_parser
    hf = HairFast(get_parser().parse_args([]))

    if not CHECKPOINT.is_file():
        raise FileNotFoundError('ไม่พบ checkpoint B24: ' + str(CHECKPOINT))
    if EXPECTED_SHA256 and sha_file(CHECKPOINT) != EXPECTED_SHA256:
        raise RuntimeError('ไฟล์ไม่ใช่ B epoch 24 ที่ตรวจไว้ (sha256 ไม่ตรง)')
    ck = torch.load(CHECKPOINT, map_location='cpu', weights_only=True)
    assert ck['epoch'] == 24 and ck['config']['trial'] == 'B'
    b = hf.blend
    assert sha_file(b.opts.blending_checkpoint) == ck['start_blending_sha256'], \
        'blending checkpoint ตั้งต้นไม่ตรงกับที่ใช้ฝึก'
    enc = b.blending_encoder
    expected = {k for k, _ in enc.named_parameters() if k.startswith('modulation_module_list.')}
    assert set(ck['blending_trainable_state_dict']) == expected
    state = enc.state_dict()
    state.update(ck['blending_trainable_state_dict'])
    enc.load_state_dict(state, strict=True)
    b.post_process.load_state_dict(ck['post_process_state_dict'], strict=True)
    enc.eval()
    b.post_process.eval()
    del state, ck
    # Match the training cache: mixing .95; shape rotation OFF; color rotation ON.
    for obj in (hf.args, hf.embed.opts, hf.align.opts, b.opts):
        obj.mixing = .95
        obj.save_all = False
    method = hf.align.shape_module
    raw = textwrap.dedent(inspect.getsource(method))
    raw = '\n'.join(line for line in raw.splitlines() if not line.startswith('@'))
    anchor = '    # Rotate stage\n    if img1_in is not img2_in:'
    replacement = ('    # Shape OFF, color ON, same policy as training\n'
                   '    if im_name2 == "shape":\n'
                   '        I_rot = None\n        rot_mask = inp_mask2\n'
                   '    elif img1_in is not img2_in:')
    assert raw.count(anchor) == 1, 'Alignment source ไม่ตรงรุ่น'
    ns = dict(inspect.unwrap(method.__func__).__globals__)
    exec(compile(raw.replace(anchor, replacement), '<shape_rotation_policy>', 'exec'), ns)
    hf.align.shape_module = types.MethodType(torch.inference_mode()(ns['shape_module']), hf.align)
    hair_fast = hf
    print('โหลด B epoch 24 ครบ: Blending + Post-process | mix .95 | shape rotate OFF / color ON', flush=True)


def _want_offload():
    if DIFFUSION_CPU_OFFLOAD in ('1', 'true', 'yes'):
        return True
    if DIFFUSION_CPU_OFFLOAD in ('0', 'false', 'no'):
        return False
    total = torch.cuda.get_device_properties(0).total_memory / 1024 ** 3
    return total < 20


def _load_seg_and_diffusion():
    """Notebook section 5."""
    global seg_processor, seg_model, inpaint_pipe, label_ids, HAIR_ID, FACE_ID
    from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
    from diffusers import StableDiffusionInpaintPipeline, UniPCMultistepScheduler
    def _from_pretrained(cls, model_id, **kw):
        # Prefer the copy baked into the image (no network, same files every cold start);
        # fall back to downloading only if it is not in the cache (e.g. a new *_REVISION env).
        try:
            return cls.from_pretrained(model_id, local_files_only=True, **kw)
        except (OSError, ValueError) as e:
            print(f'{model_id}: ไม่พบใน cache ของ image ({type(e).__name__}) — ดาวน์โหลด', flush=True)
            return cls.from_pretrained(model_id, **kw)

    seg_processor = _from_pretrained(SegformerImageProcessor, SEG_MODEL_ID, revision=SEG_REVISION)
    seg_model = _from_pretrained(SegformerForSemanticSegmentation, SEG_MODEL_ID,
                                 revision=SEG_REVISION).to(DEVICE).eval()
    label_ids = {str(name).lower(): int(i) for i, name in seg_model.config.id2label.items()}
    HAIR_ID, FACE_ID = label_ids['hair'], label_ids['face']
    assert (HAIR_ID, FACE_ID) == (2, 11), 'ตรวจ mapping ของโมเดลก่อนทดลอง'

    # Safety checker disabled, same as the notebook.
    pipe = _from_pretrained(StableDiffusionInpaintPipeline, DIFFUSION_MODEL_ID, revision=DIFFUSION_REVISION,
                            torch_dtype=torch.float16, safety_checker=None)
    pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config)
    offload = _want_offload()
    if offload:
        pipe.enable_model_cpu_offload()
    else:
        pipe.to(DEVICE)
    vae = getattr(pipe, 'vae', None)
    if callable(getattr(vae, 'enable_slicing', None)):
        vae.enable_slicing()
    elif callable(getattr(pipe, 'enable_vae_slicing', None)):
        pipe.enable_vae_slicing()
    inpaint_pipe = pipe
    ENVIRONMENT.update(
        torch=torch.__version__, gpu=torch.cuda.get_device_name(0), cuda=torch.version.cuda,
        seg_model=SEG_MODEL_ID, seg_revision_requested=SEG_REVISION,
        seg_revision_resolved=getattr(seg_model.config, '_commit_hash', None),
        diffusion_model=DIFFUSION_MODEL_ID, diffusion_revision_requested=DIFFUSION_REVISION,
        unet_channels=pipe.unet.config.in_channels, scheduler=type(pipe.scheduler).__name__,
        cpu_offload=offload)
    print('Segmentation + diffusion พร้อม | offload:', offload, flush=True)


def load_models():
    global READY
    if not torch.cuda.is_available():
        raise RuntimeError('ไม่พบ GPU (torch.cuda.is_available() == False)')
    major, minor = torch.cuda.get_device_capability(0)
    arch = f'sm_{major}{minor}'
    supported = torch.cuda.get_arch_list()
    print(f'GPU {torch.cuda.get_device_name(0)} ({arch}) | torch {torch.__version__} '
          f'cuda {torch.version.cuda} | supports {supported}', flush=True)
    # CUDA binary compatibility: an sm_XY cubin runs on any GPU with the same major X and minor >= Y
    # (e.g. sm_86 code runs on sm_89 4090/L4/L40S); PTX (compute_XY) JIT-compiles on any newer GPU.
    def _arch_ok():
        for a in supported:
            kind, _, num = a.partition('_')
            if not num.isdigit() or len(num) < 2:
                continue
            a_major, a_minor = int(num[:-1]), int(num[-1])
            if kind == 'sm' and a_major == major and a_minor <= minor:
                return True
            if kind == 'compute' and (a_major, a_minor) <= (major, minor):
                return True
        return False
    if supported and not _arch_ok():
        raise RuntimeError(f'GPU {torch.cuda.get_device_name(0)} ({arch}) ไม่รองรับโดย PyTorch ใน image นี้ '
                           f'(รองรับ {supported}) — เลือก GPU รุ่นอื่น หรือ build image ด้วย CUDA ที่ใหม่กว่า')
    t = time.perf_counter()
    _load_hairfast()
    _load_seg_and_diffusion()
    READY = True
    print(f'Models ready in {time.perf_counter() - t:.1f}s on {torch.cuda.get_device_name(0)}', flush=True)


# ---------------------------------------------------------------- helpers (section 6)
def segment_labels(image):
    inputs = seg_processor(images=image.convert('RGB'), return_tensors='pt').to(DEVICE)
    with torch.inference_mode():
        logits = seg_model(**inputs).logits
        logits = torch.nn.functional.interpolate(logits, size=image.size[::-1], mode='bilinear', align_corners=False)
    return logits.argmax(1)[0].cpu().numpy().astype(np.uint8)


def padded(image, target=512, mask=False):
    scale = target / max(image.size)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    resized = image.resize(size, Image.Resampling.NEAREST if mask else Image.Resampling.LANCZOS)
    canvas = Image.new(image.mode, (target, target), 0)
    x, y = (target - size[0]) // 2, (target - size[1]) // 2
    canvas.paste(resized, (x, y))
    return canvas, (x, y, x + size[0], y + size[1])


def tensor_to_pil(value, value_range='zero_one'):
    if isinstance(value, Image.Image):
        return value.convert('RGB')
    if torch.is_tensor(value):
        t = value.detach().cpu()
        if t.ndim == 4 and t.shape[0] == 1:
            t = t[0]
        if t.ndim != 3 or t.shape[0] != 3:
            raise ValueError(f'Unexpected tensor shape: {tuple(t.shape)}')
        a = t.permute(1, 2, 0).numpy()
    else:
        a = np.asarray(value)
    if a.dtype == np.uint8:
        return Image.fromarray(a).convert('RGB')
    if value_range == 'minus_one_one':
        a = (a + 1) / 2
    if not np.isfinite(a).all() or a.min() < -0.02 or a.max() > 1.02:
        raise ValueError('Tensor range ไม่ตรง config: ตรวจ OUTPUT_TENSOR_RANGE ห้าม normalize อัตโนมัติ')
    return Image.fromarray(np.rint(a.clip(0, 1) * 255).astype(np.uint8)).convert('RGB')


def resolve_inpaint_settings(strength=None, steps=None, guidance=None):
    import math
    strength = float(INPAINT_STRENGTH if strength is None else strength)
    steps = INPAINT_STEPS if steps is None else steps
    guidance = float(INPAINT_GUIDANCE if guidance is None else guidance)
    if isinstance(steps, bool) or not isinstance(steps, (int, np.integer)) or not 1 <= steps <= 100:
        raise ValueError('steps ต้องเป็นจำนวนเต็ม 1–100')
    steps = int(steps)
    if not math.isfinite(strength) or not 0 < strength <= 1:
        raise ValueError('strength ต้องมากกว่า 0 และไม่เกิน 1')
    if not math.isfinite(guidance) or not 1 <= guidance <= 20:
        raise ValueError('guidance ต้องอยู่ในช่วง 1–20')
    if int(steps * strength) < 1:
        raise ValueError('steps × strength ต้องไม่น้อยกว่า 1')
    return {'strength': strength, 'steps': steps, 'guidance': guidance}


def resolve_joint_settings(face_blend=JOINT_FACE_BLEND):
    import math
    face_blend = float(face_blend)
    if not math.isfinite(face_blend) or not 0 <= face_blend <= 1:
        raise ValueError('face_blend ต้องอยู่ในช่วง 0–1')
    return {'face_blend': face_blend}


def validate_color_lock(mode):
    mode = str(mode).strip().lower()
    if mode not in ('auto', 'smoke_gray', 'blue', 'off'):
        raise ValueError('color_lock ต้องเป็น auto, smoke_gray, blue หรือ off')
    return mode


def smootherstep(t):
    t = np.clip(t, 0, 1).astype(np.float32)
    return t * t * t * (t * (t * 6 - 15) + 10)


def outside_distance(mask):
    mask = np.asarray(mask, dtype=bool)
    if not mask.any():
        return np.full(mask.shape, np.inf, dtype=np.float32)
    return distance_transform_edt(~mask).astype(np.float32)


def detail_only_masks(base, face_blend):
    labels = segment_labels(base)  # exactly one parser pass
    hair = labels == HAIR_ID
    face = labels == FACE_ID
    if not hair.any():
        raise ValueError('ตรวจไม่พบผม')

    def inside(mask, width):
        distance = distance_transform_edt(np.pad(mask, 1))[1:-1, 1:-1]
        return smootherstep(distance / max(1., width * min(base.size) / 1024.))
    # No hair silhouette displacement: taper inside each edit region only.
    hair_alpha = inside(hair, 4.)
    face_alpha = inside(face, 6.) * float(face_blend)
    alpha = np.maximum(hair_alpha, face_alpha).astype(np.float32)
    return dict(hair=hair, face=face, alpha=alpha,
                raw_mask=Image.fromarray((alpha > 0).astype('uint8') * 255))


def refine_b24_details(base, masks, seed, settings):
    canvas, box = padded(base, target=DIFFUSION_SIDE)
    mask, _ = padded(masks['raw_mask'], target=DIFFUSION_SIDE, mask=True)
    with torch.inference_mode():
        result = inpaint_pipe(
            image=canvas, mask_image=mask, height=DIFFUSION_SIDE, width=DIFFUSION_SIDE,
            prompt='Same portrait, same hairstyle and hair color, fine natural hair detail, clear eyes, natural skin texture, realistic photograph.',
            negative_prompt='changed hairstyle, changed hair color, changed face, waxy skin, blur, halos, noise',
            num_images_per_prompt=1, strength=settings['strength'], num_inference_steps=settings['steps'],
            guidance_scale=settings['guidance'], generator=torch.Generator(device=DEVICE).manual_seed(int(seed)))
    flags = getattr(result, 'nsfw_content_detected', None)
    if flags is not None and any(flags):
        raise ValueError('โมเดลระงับภาพผลลัพธ์')
    return result.images[0].convert('RGB').crop(box).resize(base.size, Image.Resampling.LANCZOS)


def finish_raw_background(raw, b24_masks):
    from scipy.ndimage import gaussian_filter
    if RAW_BG_GAP_PX < 0 or RAW_BG_FEATHER_PX <= 0 or not 0 <= RAW_BG_DETAIL_AMOUNT <= 1:
        raise ValueError('ตรวจค่า RAW_BG_GAP_PX / FEATHER / DETAIL_AMOUNT')
    # Hair may move in raw diffusion: protect both B24 and raw hair.
    labels = segment_labels(raw)
    if 'background' not in label_ids:
        raise ValueError('ไม่พบ background label')
    bg = labels == label_ids['background']
    hair = (labels == HAIR_ID) | b24_masks['hair']
    scale = min(raw.size) / 1024.
    hair_distance = outside_distance(hair)
    gap = RAW_BG_GAP_PX * scale
    feather = max(1., RAW_BG_FEATHER_PX * scale)
    bg_distance = distance_transform_edt(np.pad(bg, 1))[1:-1, 1:-1]
    safe_distance = np.minimum(hair_distance, bg_distance)
    alpha = (smootherstep((safe_distance - gap) / feather) * bg).astype(np.float32)
    rgb = np.asarray(raw.convert('RGB'), dtype=np.float32)
    luminance = rgb @ np.array([.299, .587, .114], np.float32)
    detail = luminance - gaussian_filter(luminance, max(.8, 1.2 * scale))
    detail = np.sign(detail) * np.maximum(np.abs(detail) - .5, 0.)
    delta = np.clip(RAW_BG_DETAIL_AMOUNT * detail, -4., 4.) * alpha
    delta = np.clip(delta, -rgb.min(axis=2), 255 - rgb.max(axis=2))
    out = (rgb.astype(np.int16) + np.rint(delta).astype(np.int16)[:, :, None]).astype(np.uint8)
    protected = (safe_distance <= gap) | ~bg
    assert not alpha[protected].any()
    assert np.array_equal(out[protected], rgb.astype(np.uint8)[protected])
    return Image.fromarray(out), alpha, dict(
        method='raw_background_smooth_gap_detail', gap_px_at_1024=RAW_BG_GAP_PX,
        feather_px_at_1024=RAW_BG_FEATHER_PX, amount=RAW_BG_DETAIL_AMOUNT,
        protected_raw_max_diff=0, extra_diffusion_passes=0)


# ---------------------------------------------------------------- run (section 7)
def run_detail_core(inputs=None, before=None, seed=3407, strength=.15, steps=30, guidance=2.5, face_blend=.35):
    settings = resolve_inpaint_settings(strength, steps, guidance)
    resolve_joint_settings(face_blend)
    if not 0 <= int(seed) <= 4294967295:
        raise ValueError('seed ไม่ถูกต้อง')
    timings = {}

    def clock():
        if torch.cuda.is_available():
            torch.cuda.synchronize()
        return time.perf_counter()
    queued = time.perf_counter()
    with GPU_LOCK:
        timings['queue_wait'] = time.perf_counter() - queued
        start = clock()
        if before is None:
            if inputs is None or len(inputs) != 3:
                raise ValueError('ต้องมีหน้า/ทรง/สี 3 ภาพ')
            t = clock()
            swapped = hair_fast.swap(*(str(v) for v in inputs), align=True, seed=int(seed))
            if not isinstance(swapped, tuple) or len(swapped) != 4:
                raise RuntimeError('swap format ไม่ตรงรุ่น')
            before = tensor_to_pil(swapped[0])
            timings['B24'] = clock() - t
            del swapped
        else:
            before = before.convert('RGB').copy()
            timings['B24'] = 0.
        t = clock()
        masks = detail_only_masks(before, face_blend)
        timings['mask'] = clock() - t
        t = clock()
        raw = refine_b24_details(before, masks, seed, settings)
        timings['diffusion'] = clock() - t
        t = clock()
        after, bg_alpha, bg_info = finish_raw_background(raw, masks)
        timings['raw_background_finish'] = clock() - t
        timings['total_processing'] = clock() - start
    return dict(before=before, raw_diffusion=raw, after=after, masks=masks, background_alpha=bg_alpha,
                background_info=bg_info, settings=settings, seed=int(seed),
                timings_seconds={k: round(v, 4) for k, v in timings.items()})


def run_single_fast(face_path, shape_path, color_path, seed=3407, face_blend=.35,
                    strength=.15, steps=30, guidance=2.5, color_lock='auto'):
    validate_color_lock(color_lock)
    result = run_detail_core([face_path, shape_path, color_path], seed=seed,
                             strength=.15 if strength is None else strength,
                             steps=30 if steps is None else steps,
                             guidance=2.5 if guidance is None else guidance, face_blend=face_blend)
    timings = result['timings_seconds']
    metadata = dict(
        experiment_id=uuid.uuid4().hex, mode='raw_diffusion_guarded_background', result_key='result',
        trial='B', epoch=24, mixing=.95, shape_rotation=False, color_rotation=True,
        seed=int(seed), face_blend=float(face_blend), diffusion_side=DIFFUSION_SIDE,
        settings=result['settings'], output_base='raw_diffusion', face_blend_applied=False,
        color_lock={'applied': 'none_raw_selected', 'legacy_requested': color_lock},
        background_repair={**result['background_info'], 'passes': 0}, diffusion_passes=1,
        detail_gain=DETAIL_GAIN, detail_max_RGB=DETAIL_MAX_RGB,
        timings_seconds=timings, metrics={'seconds': timings['total_processing']})
    print('B24 shared comparison core:', timings, flush=True)
    return dict(image=result['after'], metadata=metadata)


def run_compare_profile(face_path, shape_path, color_path, seed=3407,
                        strength=None, steps=None, guidance=None, face_blend=None, color_lock='auto'):
    # Fixed profile selected for web parity; legacy UI settings are recorded, not applied.
    requested = dict(strength=strength, steps=steps, guidance=guidance, face_blend=face_blend)
    print(COMPARE_WEB_BUILD, 'effective:', COMPARE_WEB_PROFILE, 'side:', DIFFUSION_SIDE, 'seed:', seed, flush=True)
    result = run_single_fast(face_path, shape_path, color_path, seed=seed,
                             color_lock=color_lock, **COMPARE_WEB_PROFILE)
    result['metadata']['build'] = COMPARE_WEB_BUILD
    result['metadata']['profile'] = 'same_as_compare_cell_defaults'
    result['metadata']['requested_legacy_settings'] = requested
    return result
