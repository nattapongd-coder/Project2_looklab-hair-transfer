"""Entry point (CMD python3 app.py) — LOOKLAB HairFastGAN with the fine-tuned B24 checkpoint.

1. download best.pt from the private Hugging Face repo (sha256-checked)
2. start the FastAPI server (server.py) on $PORT (80 on RunPod Serverless load balancer)
   /ping -> 204 while models load, 200 when ready (fine-tuned B24 loaded), 503 on failure
Pretrained HairFastGAN / SegFormer / SD weights are already baked into the image.
"""
import os
import sys

sys.path.insert(0, '/app')
os.environ.setdefault('HAIRFAST_REPO', '/app/HairFastGAN')
os.environ.setdefault('CHECKPOINT_PATH', '/app/checkpoints/best.pt')

import download_assets  # noqa: E402  (reads the env vars above)

print('== LOOKLAB HairFastGAN (fine-tuned B24) | port', os.environ.get('PORT', '80'), flush=True)
download_assets.ensure_checkpoint()  # exits the worker if best.pt is missing / wrong sha256

import uvicorn  # noqa: E402

uvicorn.run('server:app', host='0.0.0.0', port=int(os.environ.get('PORT', '80')),
            workers=1, timeout_keep_alive=75)
