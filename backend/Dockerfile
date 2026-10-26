# CUDA 12.8 = รุ่นแรกที่รองรับ Blackwell (sm_120: RTX PRO 6000 / RTX 5090 / B200)
FROM nvidia/cuda:12.8.1-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 python3-pip python3.11-venv python3.11-dev \
        build-essential cmake \
        git git-lfs ffmpeg libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && git lfs install \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3

WORKDIR /app

# --- Python dependencies ---
COPY requirements.txt .
# torch 2.7.1+cu128 รองรับ sm_75 ... sm_90, sm_100, sm_120 (Turing ถึง Blackwell)
RUN pip3 install --no-cache-dir torch==2.7.1 torchvision==0.22.1 torchaudio==2.7.1 \
        --index-url https://download.pytorch.org/whl/cu128 \
    && pip3 install --no-cache-dir -r requirements.txt

# --- HairFastGAN code (small) — pinned to the same commit as the notebook ---
ARG HAIRFAST_REVISION=49e98019c9243d1991c19d45764fc3340a498de2
RUN git clone https://github.com/AIRI-Institute/HairFastGAN.git /app/HairFastGAN \
    && git -C /app/HairFastGAN checkout ${HAIRFAST_REVISION}

# --- Native PyTorch StyleGAN ops (same backend the B24 checkpoint was fine-tuned with,
#     notebook section 3). Replaces the nvcc-compiled fused_act/upfirdn2d extensions, so
#     inference matches training and nothing needs compiling for a specific GPU arch. ---
COPY patch_stylegan_native.py /app/
RUN python3 /app/patch_stylegan_native.py /app/HairFastGAN

# Target common GPU architectures explicitly (no live GPU is attached during
# `docker build`, so we can't auto-detect one — this also silences the
# "TORCH_CUDA_ARCH_LIST is not set" warning). Covers Turing/Ampere/Ada/Hopper/Blackwell,
# i.e. T4, A10/A10G, A5000/A6000, L4, 3090/4090, H100, B200 (10.0), RTX 5090 / RTX PRO 6000 (12.0).
# +PTX ทำให้ GPU รุ่นใหม่กว่านี้ยัง JIT ได้
ENV TORCH_CUDA_ARCH_LIST="7.5;8.0;8.6;8.9;9.0;10.0;12.0+PTX"

# torch>=2.6 เปลี่ยนค่า default ของ torch.load เป็น weights_only=True ซึ่งทำให้ checkpoint
# ของ HairFastGAN/e4e (เรียก torch.load โดยไม่ระบุ weights_only) โหลดพัง
# env นี้คืนค่า default เดิม (False) เฉพาะจุดที่ไม่ได้ระบุ — best.pt ใน pipeline.py ยังใช้ weights_only=True เหมือนเดิม
ENV TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1

# --- Build-time warmup: import hair_swap.py (WITHOUT instantiating HairFast,
#     since that would try to move weights onto a GPU that doesn't exist at
#     build time). This import cascades through every module HairFastGAN
#     needs (dlib, fpie, CLIP, ...), so a missing dependency shows up HERE in
#     `docker build` logs instead of after a RunPod deploy. StyleGAN ops are the
#     native PyTorch version (patched above), so no CUDA extension is compiled. ---
RUN cd /app/HairFastGAN && python3 -c "import sys; sys.path.insert(0, '.'); import hair_swap; assert sys.modules['models.stylegan2.op.upfirdn2d'].upfirdn2d_op is None and sys.modules['models.stylegan2.op.fused_act'].fused is None; print('hair_swap imports OK — native StyleGAN ops.')"

# --- HairFastGAN pretrained weights (baked into the image so cold start
#     never needs to hit the network for model files) ---
RUN git clone https://huggingface.co/AIRI-Institute/HairFastGAN /app/hf_weights \
    && mv /app/hf_weights/pretrained_models /app/HairFastGAN/pretrained_models \
    && ( [ -d /app/hf_weights/input ] && mv /app/hf_weights/input /app/HairFastGAN/input || true ) \
    && rm -rf /app/hf_weights

# --- Pin the HF stack to the versions already tested with this pipeline
#     (they also run fine on torch 2.7.1; pinned so results stay the same as before).
#     Placed AFTER the weight clone so Docker re-uses the cached layers above. ---
RUN pip3 install --no-cache-dir \
        "transformers==4.46.3" "diffusers==0.31.0" "accelerate==1.1.1" \
        "huggingface_hub==0.26.5" "tokenizers>=0.20,<0.21" \
    && python3 -c "import torch, transformers, diffusers; print('torch', torch.__version__, '| transformers', transformers.__version__, '| diffusers', diffusers.__version__)"

# --- Pre-download the refine-step models (SegFormer + SD inpainting) too,
#     so they're baked in rather than downloaded on first request ---
RUN python3 -c "\
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation; \
SegformerImageProcessor.from_pretrained('mattmdjaga/segformer_b2_clothes'); \
SegformerForSemanticSegmentation.from_pretrained('mattmdjaga/segformer_b2_clothes'); \
from diffusers import StableDiffusionInpaintPipeline; \
import torch; \
StableDiffusionInpaintPipeline.from_pretrained('stablediffusionapi/realistic-vision-v51', torch_dtype=torch.float16, safety_checker=None) \
"

# --- LOOKLAB fine-tuned B24 server (same API as the Colab notebook) ---
# best.pt (trial B, epoch 24) is downloaded at start-up from the private HF repo
# set in CHECKPOINT_HF_REPO / CHECKPOINT_HF_FILENAME / HF_TOKEN (endpoint env vars).
COPY pipeline.py server.py download_assets.py app.py /app/
ENV HAIRFAST_REPO=/app/HairFastGAN \
    CHECKPOINT_PATH=/app/checkpoints/best.pt

ENV PORT=80
EXPOSE 80

CMD ["python3", "app.py"]