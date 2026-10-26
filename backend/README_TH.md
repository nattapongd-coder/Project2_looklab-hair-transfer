# LOOKLAB Serverless + โมเดล finetune (B epoch 24)

ชุดนี้ใช้ CUDA 12.8 + torch 2.7.1 (รองรับ Blackwell) และตั้งค่า HairFastGAN ให้**ตรงกับ notebook / ตอนฝึก**:
- clone HairFastGAN ที่ commit `49e98019…` เดียวกับ notebook
- `patch_stylegan_native.py` เปลี่ยน StyleGAN ops เป็น native PyTorch แบบเดียวกับ notebook ส่วน 3 (B24 ถูก finetune ด้วย backend นี้) และไม่ต้อง compile CUDA ตามรุ่น GPU
- SegFormer / Stable Diffusion โหลดจาก cache ใน image ก่อน ไม่ดึงเวอร์ชันใหม่จาก Hugging Face ตอน cold start

- `app.py` (ตัวใหม่) ดาวน์โหลด `best.pt` จาก Hugging Face repo แล้วเปิด server ที่ `$PORT` (80)
- `server.py` มี API ชุดเดียวกับ notebook: `/generate`, `/jobs`, `/feedback`, `/health` และมี `/ping` ไว้ให้ Load Balancer เช็คสถานะ
- `pipeline.py` โหลด HairFast แล้วใส่ Blending + Post-process ที่ finetune ตรวจ sha256 / epoch 24 / trial B และใช้ diffusion โปรไฟล์ `raw-background-smooth-gap-v4` แบบเดียวกับ notebook
- pretrained ทั้งหมด (HairFastGAN, SegFormer, Stable Diffusion) ถูก**อบไว้ใน image แล้ว** จึง**ไม่ต้องใช้ Network Volume**

## ขั้นตอน
1. แตกไฟล์ทับโฟลเดอร์เดิม (สำรอง `app.py` ตัวเก่าไว้ก่อน)
2. build + push
   ```
   docker build --platform linux/amd64 -t <dockerhub-user>/looklab-hairfastgan:ft2 .
   docker push <dockerhub-user>/looklab-hairfastgan:ft2
   ```
3. แก้ endpoint Serverless ตัวเดิม (Load Balancer) ให้ใช้ image `:ft2`
4. Environment variables ของ endpoint:
   - `HF_TOKEN` = token ของ Hugging Face (แนะนำใช้ Secret)
   - `CHECKPOINT_HF_REPO` = `<hf-user>/<repo>` (repo ที่เก็บ `best.pt` ของคุณ ดู docs/CHECKPOINTS.md)
   - `CHECKPOINT_HF_FILENAME` = `best.pt`
5. **GPU:** image นี้ใช้ CUDA 12.8 + torch 2.7.1 จึงรองรับตั้งแต่ T4/A-series/4090/L4/L40S/A100/H100 ไปจนถึง **Blackwell** (RTX 5090, RTX PRO 6000 รวมถึง MIG slice, B200) — ไม่รองรับ GPU ก่อน Turing (P100/V100) แล้ว ควรมี VRAM อย่างน้อย 24 GB
6. Container disk อย่างน้อย 10 GB (ไฟล์ best.pt 886 MB จะถูกดาวน์โหลดลงดิสก์นี้ทุกครั้งที่ worker เปิดใหม่)

## ตรวจใน Logs
```
== LOOKLAB HairFastGAN (fine-tuned B24) | port 80
ดาวน์โหลด checkpoint จาก Hugging Face: <hf-user>/<repo>/best.pt
checkpoint พร้อม: /app/checkpoints/best.pt
GPU NVIDIA ... (sm_89) | torch ... | supports [...]
โหลด B epoch 24 ครบ: Blending + Post-process | mix .95 | shape rotate OFF / color ON
Models ready in ...s
```
จากนั้น `/ping` จะตอบ 200 และพร้อมรับงาน
ถ้าโหลดโมเดลไม่สำเร็จ (ไม่มี token, sha256 ไม่ตรง หรือได้ GPU ที่ไม่รองรับ) worker จะพิมพ์สาเหตุแล้ว**ปิดตัวเอง** ไม่ค้างกินเงิน
