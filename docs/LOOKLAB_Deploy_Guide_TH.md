# LOOKLAB — Vercel + RunPod Native Sharp

ชุดนี้แยก frontend บน Vercel และ backend บน **RunPod GPU Pod แบบเปิดค้าง** ไม่ใช่ Serverless worker ตัวเก่า

## สถานะและสิ่งที่ต้องมี

โค้ดถูกย้ายจาก `LOOKLAB_Diffusion_Native_Sharp (1).ipynb` ที่แนบมาเป็น Python ปกติแล้ว ไม่ต้องเปิด Colab ไม่ต้อง ngrok และไม่ต้องรันเซลล์ทีละอันบน RunPod

ยังไม่มีการ deploy เข้าบัญชี Vercel/RunPod หรือทดสอบภาพจริงบน GPU ในการจัดทำชุดนี้ ต้องมี:

1. บัญชี Vercel และ RunPod ของคุณ
2. ไฟล์ **B epoch 24: `trial_B/best.pt`** จาก Drive ของคุณ (ไม่ได้อยู่ใน ZIP ที่แนบมา)
3. หากต้องบันทึกคะแนนลงชีท: Apps Script URL และ shared secret ชุดเดิม

ไฟล์ checkpoint ต้นทางที่โน้ตบุ๊กใช้:

```text
MyDrive/HairFastGAN_BPP_4Trials_PretrainedStart/9be83b9c2e/trial_B/best.pt
```

ต้องเป็น SHA256 นี้ (สคริปต์จะตรวจให้เอง):

```text
6195edd247917e7c34887945413e08b731faae736f5239dd2b28d9636e65f98b
```

อย่าใช้ pretrained blending checkpoint มาตั้งชื่อแทน เพราะจะไม่ใช่ B24 ที่ฝึกมา และโปรแกรมจะปฏิเสธไฟล์นั้น

## 1. เตรียม RunPod

1. เข้า https://console.runpod.io แล้วเลือก Pods → Deploy
2. ใช้ GPU NVIDIA ที่มี VRAM 24 GB ขึ้นไปเป็นจุดเริ่มต้น เช่น RTX 3090/4090; RAM 32 GB ขึ้นไป และพื้นที่ประมาณ 80–100 GB เป็นงบเผื่อดาวน์โหลดโมเดลและ cache ไม่ใช่ผลวัดขั้นต่ำจริง
3. ใช้ PyTorch template ที่มี Python 3.10/3.11, Ubuntu และ JupyterLab; สคริปต์ติดตั้ง PyTorch 2.4.1/CUDA 12.1 ลง virtual environment ให้ ไม่เลือก GPU รุ่นใหม่ที่ต้องใช้ CUDA ใหม่กว่านี้โดยไม่ทดสอบ
4. จัด persistent volume ที่ `/workspace` หากจะเก็บโมเดลข้ามการสร้าง/ลบ Pod ให้ใช้ Network Volume และตรวจว่าติดกับ Pod ก่อนอัปโหลด
5. Expose HTTP Ports: `8000,8888` (8888 สำหรับ Jupyter ตาม template)
6. ตรวจราคา GPU และ storage ที่หน้า deploy แล้วเริ่ม Pod ด้วยบัญชีของคุณ
7. เปิด Connect → JupyterLab แล้วเข้า `/workspace`

RunPod HTTP proxy ใช้รูปแบบ `https://POD_ID-8000.proxy.runpod.net` และมี timeout 100 วินาที ชุดนี้จึงใช้ POST `/jobs` รับหมายเลขงานทันที แล้ว GET สถานะเป็นช่วง ๆ

## 2. อัปโหลดโค้ดและ checkpoint

แตก ZIP บนเครื่องของคุณ ภายในมี `frontend/`, `backend/` และคู่มือนี้

อัปโหลด ZIP ชุดนี้เข้า `/workspace` ผ่าน JupyterLab แล้วเปิด Terminal:

```bash
mkdir -p /workspace/LOOKLAB
python3 -m zipfile -e /workspace/LOOKLAB_Vercel_RunPod_NativeSharp.zip /workspace/LOOKLAB
mkdir -p /workspace/LOOKLAB/models
```

ZIP ออกแบบให้แตกแล้วเห็น backend และ frontend โดยตรง หากคุณอัปโหลดเฉพาะโฟลเดอร์ backend ให้จัด path ให้เป็น `/workspace/LOOKLAB/backend`

ดาวน์โหลด `trial_B/best.pt` จาก Google Drive ของคุณ อัปโหลดไป `/workspace/LOOKLAB/models/` แล้วเปลี่ยนชื่อเป็น `B24_best.pt` (หรือแก้ B24_CHECKPOINT ให้ตรงชื่อจริง) ไม่ต้องส่ง checkpoint เข้า GitHub/Vercel

## 3. ติดตั้ง backend ครั้งแรก

ใน Terminal ของ RunPod:

```bash
cd /workspace/LOOKLAB/backend
bash setup.sh
cp .env.example .env
```

เปิด `.env` ใน JupyterLab แก้ค่าต่อไปนี้:

```dotenv
LOOKLAB_DATA=/workspace/LOOKLAB/data
HAIRFAST_REPO=/workspace/LOOKLAB/HairFastGAN
B24_CHECKPOINT=/workspace/LOOKLAB/models/B24_best.pt
ALLOWED_ORIGINS=http://localhost:5173,https://YOUR_PROJECT.vercel.app
LOOKLAB_ACCESS_TOKEN=
JOB_TTL_SECONDS=3600
FEEDBACK_APPS_SCRIPT_URL=
FEEDBACK_SHARED_SECRET=
```

ตอนยังไม่มี Vercel URL ใช้ค่าตัวอย่างไว้ก่อน; หลังได้ URL จริงกลับมาแก้ ALLOWED_ORIGINS และ restart backend ห้ามใส่ `/` ท้าย origin และไม่ต้องใส่ path

`LOOKLAB_ACCESS_TOKEN`: ถ้าเป็นกลุ่มทดลองปิด ให้ใส่รหัสยาวที่กำหนดเอง ผู้ทดลองกรอกในหน้าตั้งค่าเซิร์ฟเวอร์ของเว็บ รหัสเก็บใน sessionStorage ของแท็บนั้น ไม่ต้องนำไปใส่ VITE_* หรือ commit ลง Git หากปล่อยว่าง API จะเป็นสาธารณะและใครทราบ URL ก็ส่งงานได้ CORS ไม่ใช่ระบบล็อกอิน หากจะเปิดเว็บสาธารณะขนาดใหญ่ต้องเพิ่มระบบสมาชิก/rate limit ที่ผูกกับผู้ใช้จริง

ตรวจ checkpoint แล้วเปิด API:

```bash
.venv/bin/python check_checkpoint.py
bash start.sh
```

ครั้งแรกโปรแกรมจะ clone HairFastGAN ที่ commit เดียวกับโน้ตบุ๊ก ดาวน์โหลด pretrained models, SegFormer และ diffusion ผ่าน Hugging Face จึงนานกว่าการเริ่มครั้งถัดไป ต้องมี internet และพื้นที่ว่างเพียงพอ หาก Hugging Face ขอ authentication ให้ตั้ง HF_TOKEN ผ่าน RunPod Environment Variables และใช้บัญชีที่มีสิทธิ์โมเดลนั้น

เปิด Terminal อีกแท็บตรวจ:

```bash
curl http://127.0.0.1:8000/health
```

- `loading` / HTTP 503 = กำลังโหลด
- `ok` / HTTP 200 = พร้อมสร้างภาพ
- `error` / HTTP 503 = อ่าน traceback ใน Terminal หรือ server.log

เมื่อทำงานได้แล้ว หากต้องการให้ทำงานต่อหลังปิด terminal ให้หยุดคำสั่ง foreground ด้วย Ctrl+C หนึ่งครั้งแล้วใช้:

```bash
cd /workspace/LOOKLAB/backend
nohup bash start.sh > server.log 2>&1 &
tail -f server.log
```

ห้ามเปิดหลาย process หรือใช้หลาย uvicorn workers เพราะจะโหลดโมเดลซ้ำและงานอยู่คนละหน่วยความจำ `nohup` อยู่ต่อหลังปิด terminal แต่ **ไม่ใช่ auto-start หลัง Pod reboot** เมื่อ restart Pod ต้องเรียก start.sh อีกครั้ง หรือเพิ่มคำสั่งนี้ใน startup script ของ template โดยคง startup เดิมของ Jupyter ไว้ด้วย

## 4. ทดสอบภาพจริงบน GPU ก่อนเชื่อมเว็บ

นำรูปหน้าคนจริง รูปทรงผม และรูปสีผมเข้า RunPod เช่น `/workspace/test/face.jpg`, `shape.jpg`, `color.jpg`

```bash
cd /workspace/LOOKLAB/backend
# ถ้าตั้งรหัสไว้ ให้ใส่รหัสเดียวกันใน environment ของ terminal นี้
# export LOOKLAB_ACCESS_TOKEN='รหัสของคุณ'
.venv/bin/python smoke_remote.py \
  --url http://127.0.0.1:8000 \
  --face /workspace/test/face.jpg \
  --shape /workspace/test/shape.jpg \
  --color /workspace/test/color.jpg \
  --output /workspace/test/native_sharp_result.png
```

ได้ PNG และ metadata JSON ข้างกัน ตรวจภาพหน้า/ผมและ `timings_seconds` ก่อนประกาศว่า GPU ใช้งานสมบูรณ์ การเรียกครั้งแรกอาจดาวน์โหลดโมเดลย่อยของ face alignment เพิ่ม ภาพชุดนี้เป็น 1024 ตาม pipeline ไม่ใช่การ upscale 4K/8K

จากนั้นเปิด `https://POD_ID-8000.proxy.runpod.net/health` บนเครื่องของคุณ ต้องได้ `ok` ด้วย

## 5. นำ frontend ขึ้น Vercel

### วิธี A: GitHub + Vercel

1. สร้าง repository แล้วใส่ไฟล์ใน `frontend/` ลง root ของ repository หรือใส่ทั้งโปรเจกต์แล้วเลือก Root Directory เป็น `frontend`
2. ไม่อัปโหลด node_modules, dist, .env, checkpoint หรือไฟล์ backend weights
3. ใน Vercel เลือก Add New → Project → Import repository
4. ตั้งค่า:

| ช่อง | ค่า |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` ถ้า push ทั้งชุด; `.` ถ้า push เฉพาะเนื้อหา frontend |
| Node.js | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment Variable | `VITE_API_BASE_URL` |
| Value | `https://POD_ID-8000.proxy.runpod.net` |

5. ตั้ง environment variable สำหรับ Production และ Preview ตามที่ใช้ แล้ว Deploy
6. หากเปลี่ยน URL ภายหลังต้อง Redeploy เพราะ Vite ฝังค่านี้ตอน build ไม่ใส่ `/jobs` หรือ `/generate` ต่อท้าย URL

### วิธี B: Vercel CLI ไม่ต้องสร้าง Git repository

ติดตั้ง Node.js 22 บนเครื่องคุณ เปิด terminal ใน frontend:

```bash
npm ci
npx vercel login
npx vercel link
npx vercel env add VITE_API_BASE_URL production
# เมื่อถาม value ใส่ https://POD_ID-8000.proxy.runpod.net
npx vercel --prod
```

เลือกบัญชีและชื่อโปรเจกต์ของคุณตามคำถาม CLI ไม่ต้องนำ RunPod API key หรือ shared secret ไปใส่ frontend

## 6. เชื่อม CORS และทดสอบครบวงจร

เมื่อได้ URL เช่น `https://looklab-demo.vercel.app` แก้ใน backend `.env`:

```dotenv
ALLOWED_ORIGINS=https://looklab-demo.vercel.app,http://localhost:5173
```

Restart backend ด้วยการหยุด process ที่คุณเปิดไว้ แล้วเรียก `bash start.sh` หรือ nohup ตามข้อ 3 เพียงหนึ่ง instance

เปิดเว็บ Vercel:

1. รายการทรงผมและสีผมต้องขึ้นครบ
2. หน้า setting → ทดสอบการเชื่อมต่อ ต้องแจ้งโมเดลพร้อม
3. หากใช้ access token ให้กรอกก่อนสร้างภาพ
4. เลือกภาพหน้า ทรงผม สีผม กดสร้าง
5. ใน browser Network จะเห็น `POST /jobs` → `GET /jobs/<id>` → `GET /jobs/<id>/result`
6. ต้องได้ผลภาพหนึ่งใบและดาวน์โหลดได้
7. ลองจากเครื่อง/มือถืออีกเครื่อง ส่วนกล้องต้องอนุญาต camera permission และใช้ HTTPS; MediaPipe ยังโหลดโมเดลจาก CDN เหมือนต้นฉบับ
8. Vercel preview deployment มี origin คนละตัว ถ้าทดสอบ Preview ให้เพิ่ม URL นั้นใน ALLOWED_ORIGINS แล้ว restart เช่นกัน

## 7. เปิดระบบคะแนน Google Sheets เดิม

ใส่ค่าที่เคยใช้ใน Colab Secrets ลง backend `.env`:

```dotenv
FEEDBACK_APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
FEEDBACK_SHARED_SECRET=ค่าเดิมที่ตรงกับAppsScriptอย่างน้อย32ตัวอักษร
```

Restart backend แล้วตรวจ `/feedback-config` (ต้องส่ง Authorization หากตั้งรหัส) ต้องได้ configured true ซึ่งยืนยันเพียงรูปแบบ config ยังไม่ยืนยันสิทธิ์ Sheets/Drive ทดลองส่งคะแนนจริงหนึ่งชุดจากเว็บและตรวจว่าเกิดแถวในชีท คงรูปแบบ metadata/consent/idempotency ของโน้ตบุ๊กไว้

Apps Script ต้นฉบับไม่ได้แนบมาจึงไม่ได้แก้หรือ deploy ใหม่ในชุดนี้ ถ้าไม่ตั้งค่าทั้งสอง การสร้างภาพยังทำงานได้ แต่บันทึกคะแนนลงชีทไม่ได้

## รายละเอียดที่เปลี่ยน

- backend เดิม app.py ใช้โมเดล pretrained และ refine 512 ถูกแทนด้วย pipeline B24 + Diffusion + Native Sharp จากโน้ตบุ๊ก
- สืบทอด torch-native StyleGAN operators และตรวจ B24 checksum/state dict
- คง strength .15, steps 30, guidance 2.5, seed 3407, side 1024 และ CPU offload ตามโน้ตบุ๊ก
- mixing ในโค้ดต้นฉบับเป็น .75 แต่ log/metadata เขียน .95: คงค่าจริง .75 แล้วแก้ log/metadata ไม่เปลี่ยนไปใช้ .95
- ใช้ core `run_compare_profile` ตัวเดียวกับเว็บในโน้ตบุ๊ก ไม่เพิ่ม Real-ESRGAN/Swin2SR
- รูปจากเบราว์เซอร์ส่งตรงไป RunPod ไม่ผ่าน Vercel function
- เปลี่ยนรายการ assets/layouts เป็นไฟล์ JSON ที่สร้างตอน build
- layout ที่ปรับผ่าน UI เก็บเฉพาะ browser ด้วย localStorage; หากต้องการ default ร่วมทุกเครื่อง ให้แก้ `frontend/layouts_config.json` แล้ว deploy ใหม่
- ถ้ารูปอ้างอิงหายจะแจ้งผิดพลาด ไม่เปลี่ยนเป็นรูปตัวอย่างคนละรูปโดยเงียบ ๆ
- คิว GPU ครั้งละ 1 งาน รับรอได้รวม 4 งาน; คิว/ผลอยู่ใน RAM ของ process เดียว รีสตาร์ตแล้วหาย
- ผลเก็บไม่เกิน 1 ชั่วโมง และจำกัด 32 งานที่เก็บพร้อมกัน งานเก่าอาจถูกลบก่อน 1 ชั่วโมงเมื่อมีงานมาก
- ภาพอัปโหลดชั่วคราวลบหลังประมวลผล; feedback ที่ยินยอมเก็บภาพยังไป Drive/Sheets ตามระบบเดิม

## แก้ปัญหา

| อาการ | ตรวจ/แก้ |
|---|---|
| Missing B24 checkpoint | อัปโหลดไฟล์ให้ตรง B24_CHECKPOINT |
| Wrong checkpoint SHA256 | ใช้ trial_B/best.pt ตัวที่โน้ตบุ๊กระบุ ไม่ใช่ last.pt/โมเดลคนละ trial |
| /health เป็น error | เปิด server.log ดู traceback ต้นเหตุ; ตรวจ checkpoint, network, disk, CUDA |
| CORS/Failed to fetch | ตรวจ VITE_API_BASE_URL และ ALLOWED_ORIGINS ให้ตรง domain ปัจจุบัน; restart backend/Redeploy frontend ตามค่าที่แก้ |
| HTTP 401 | กรอกรหัสใน setting ของเว็บให้ตรง LOOKLAB_ACCESS_TOKEN |
| HTTP 429 | รอคิวว่างแล้วลองอีกครั้ง |
| HTTP 404 เมื่อติดตามงาน | งานหมดอายุหรือ Pod/process restart ต้องสร้างใหม่ |
| โหลดโมเดลไม่ได้ 401/403 | ตรวจสิทธิ์ Hugging Face และ HF_TOKEN ของบัญชีคุณ |
| CUDA out of memory | ใช้ GPU VRAM มากขึ้น; ตรวจว่าไม่มี API หลาย workers/หลาย process; คง offload True |
| ชีทไม่รับข้อมูล | ตรวจ Apps Script URL /exec, secret, สิทธิ์ deployment/Sheets/Drive; configured ไม่เท่ากับ saved |
| หน้าเว็บค้างขณะโหลดกล้อง | ตรวจ camera permission และการเข้าถึง CDN MediaPipe |

## การตรวจที่ทำในชุดส่งมอบ

ดู `VALIDATION.md` สำหรับผล build และ API test จริง แยกจากสิ่งที่ต้องทดสอบบน GPU dependency versions เป็นชุดติดตั้งที่จัดเตรียม ไม่ใช่ freeze จาก Colab เครื่องคุณ เพราะโน้ตบุ๊กไม่ได้แนบ pip freeze ที่ใช้สร้างภาพไว้

## เอกสารผู้ให้บริการ

- https://docs.runpod.io/pods/configuration/expose-ports
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/environment-variables/managing-environment-variables
- https://vercel.com/docs/cli/deploy
