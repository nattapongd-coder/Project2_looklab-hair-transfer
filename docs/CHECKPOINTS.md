# ไฟล์น้ำหนักโมเดล (checkpoint)

ลิงก์ Google Drive: <https://drive.google.com/drive/folders/18LlsvAafcwGm6ktxQW99V1dVlpgTXctn>

| ไฟล์ใน Drive | โมเดล | ใช้ทำอะไร | sha256 ของไฟล์ข้างใน |
|---|---|---|---|
| `HairfastGAN_Tiral…zip` | HairFastGAN Trial B Epoch 24 (`best.pt`, ประมาณ 886 MB) | **เว็บ LOOKLAB** และการทดลองฝั่ง HairFastGAN | `6195edd247917e7c34887945413e08b731faae736f5239dd2b28d9636e65f98b` |
| `Barbershop_Tiral…zip` | Barbershop-FT Trial A Epoch 30 (`final_epoch30.pt`) | การทดลองฝั่ง Barbershop (ไม่ได้ใช้บนเว็บ) | `a158b74e1ab38d0e4bba91de1337786aff9e4a1a7ad1d8566b7abfdb9ec9553a` |

## ตรวจว่าไฟล์ถูกต้อง

หลังแตก zip แล้ว ให้รันคำสั่งนี้แล้วเทียบผลกับ sha256 ในตารางด้านบน

```bash
sha256sum best.pt
```

## ใช้กับระบบหลังบ้าน (`backend`)

ระบบหลังบ้านมองหาไฟล์ B24 ที่ `CHECKPOINT_PATH` (ค่าเริ่มต้นคือ `/workspace/checkpoints/best.pt`) และจะไม่ยอมทำงานถ้า sha256 ไม่ตรง

มี 3 วิธีให้เลือก:

1. **วางไฟล์เอง:** วาง `best.pt` ไว้ที่ path ข้างต้น
2. **ฝากไว้ที่ Hugging Face repo ของตัวเอง:** แล้วตั้ง environment variable ดังนี้
   - `CHECKPOINT_HF_REPO`
   - `CHECKPOINT_HF_FILENAME=best.pt`
   - `HF_TOKEN` (ถ้า repo เป็น private)
3. **ใช้ Google Drive:** อัปโหลด `best.pt` แบบไม่บีบอัด แล้วตั้ง `CHECKPOINT_GDRIVE_ID` เป็น file id ของไฟล์นั้น

ไฟล์ pretrained อื่นๆ ระบบดาวน์โหลดจาก `AIRI-Institute/HairFastGAN` บน Hugging Face ให้อัตโนมัติ (ดู `backend/download_assets.py`) ได้แก่
- StyleGAN
- e4e
- Blending
- PostProcess
- Rotate
- BiSeNet
- ArcFace
