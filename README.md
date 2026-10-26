# LOOKLAB — การถ่ายโอนทรงผมและสีผมด้วย GAN เสริมด้วย Diffusion Model

**GAN-based Hair Transfer with Diffusion Post-processing for Seamless Hairline and Texture Refinement**

รายวิชา CP414782 โครงงานทางปัญญาประดิษฐ์ 2 สาขาวิชาปัญญาประดิษฐ์ วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น ปีการศึกษา 2569

| | |
|---|---|
| ผู้จัดทำ | นายณัฐพงษ์ ด้างถางคำ, นายธนเดช วาตรีบุญเรือง |
| อาจารย์ที่ปรึกษา | อ.ดร.ญานิกา คงโสรส |
| เว็บแอปพลิเคชัน | <https://looklab2.vercel.app/> |
| เล่มรายงาน | [`report/MySeniorProject2_5_Final_ver01.pdf`](report/MySeniorProject2_5_Final_ver01.pdf) |
| ไฟล์น้ำหนักโมเดล | <https://drive.google.com/drive/folders/18LlsvAafcwGm6ktxQW99V1dVlpgTXctn> (ดู [`docs/CHECKPOINTS.md`](docs/CHECKPOINTS.md)) |

> README นี้อธิบายว่าแต่ละไฟล์คืออะไร ใช้ทำอะไร และต้องรันตามลำดับไหน ส่วนรายละเอียดเชิงทฤษฎี สมการ และการอภิปรายผลอยู่ในเล่มรายงาน
> - บทที่ 3: วิธีดำเนินการ
> - บทที่ 4: ผลการทดลอง
> - บทที่ 5: สรุปและข้อเสนอแนะ

---

## สารบัญ

1. [ภาพรวมของงาน](#1-ภาพรวมของงาน)
2. [ผลลัพธ์หลัก](#2-ผลลัพธ์หลัก)
3. [โครงสร้างโฟลเดอร์](#3-โครงสร้างโฟลเดอร์)
4. [รายละเอียดแต่ละส่วน](#4-รายละเอียดแต่ละส่วน)
5. [วิธีใช้งานเว็บ (รันบนเครื่อง / deploy)](#5-วิธีใช้งานเว็บ)
6. [วิธีทำการทดลองซ้ำบน Colab](#6-วิธีทำการทดลองซ้ำบน-colab)
7. [ไฟล์ผลลัพธ์ ↔ ตารางในเล่ม](#7-ไฟล์ผลลัพธ์--ตารางในเล่ม)
8. [ข้อจำกัดและสิ่งที่ควรรู้ก่อนพัฒนาต่อ](#8-ข้อจำกัดและสิ่งที่ควรรู้ก่อนพัฒนาต่อ)
9. [เครดิต ภาพ และความเป็นส่วนตัว](#9-เครดิต-ภาพ-และความเป็นส่วนตัว)

---

## 1. ภาพรวมของงาน

ระบบรับภาพเข้า 3 ภาพ
- **ใบหน้า**: คนที่ต้องการเปลี่ยนผม
- **ทรงผมอ้างอิง**
- **สีผมอ้างอิง**

แล้วสร้างภาพใบหน้าเดิมที่มีทรงผมและสีผมตามภาพอ้างอิง ส่วนใบหน้า ผิว เสื้อผ้า และฉากหลังต้องเหมือนเดิมมากที่สุด

```
ภาพหน้า + ทรง + สี
      │
      ▼
[1] GAN ถ่ายโอนผม ─── HairFastGAN B24 (ปรับจูนแล้ว)  ← ใช้บนเว็บ
      │               หรือ Barbershop-FT A30          ← ใช้เปรียบเทียบเท่านั้น (ช้า)
      ▼
[2] Stable Diffusion Inpainting เฉพาะบริเวณผม (Realistic Vision v5.1)
      │   strength 0.15 · UniPC 30 steps · CFG 2.5 · seed 3407 · คืนใบหน้าเดิม 0.35
      ▼
[3] เก็บรายละเอียดพื้นหลัง (ซ่อมช่องว่างระหว่างผมเดิมกับผมใหม่)
      ▼
[4] Native Sharp ─ เพิ่มความคมเฉพาะผมและหน้า (ใช้ในการทดลอง; เว็บใช้ถึงขั้น [3])
      ▼
   ภาพผลลัพธ์ 1024 × 1024
```

### ขั้นตอนการวิจัย

| ขั้น | ทำอะไร | โฟลเดอร์ |
|---|---|---|
| 0 | ลองโมเดลต้นฉบับ พบว่า HairFastGAN ให้สีเป็นปื้นและหน้าซีด ส่วน Barbershop ช้ามาก | `finetune/pretrained_demo/` |
| 1 | แบ่งข้อมูลเป็น train 150 ชุด / validation 9 ชุด / test 10 ชุด โดยคนเดียวกันไม่ข้ามชุด | `data/dataset_split/` |
| 2 | ปรับจูน HairFastGAN และ Barbershop อย่างละ 4 trial (A–D) × 30 epoch | `finetune/hairfastgan/`, `finetune/barbershop/` |
| 3 | เลือก checkpoint จากชุด validation (คะแนนรวม + เกณฑ์ผ่าน 5 ด่าน) ได้ **HFG B24** และ **Barbershop-FT A30** | `finetune/selection/` |
| 4 | วัดผลบนชุด test 10 เคส คิดผลต่างแบบจับคู่และ 95% CI ด้วยบูตสแตรป | `evaluation/test_metrics/` |
| 5 | พัฒนาขั้นขัดเกลาด้วย Diffusion + เก็บพื้นหลัง + Native Sharp | `refine/` |
| 6 | เปรียบเทียบทั้งสองโมเดล ทั้งก่อนและหลัง Diffusion | `evaluation/diffusion_compare/` |
| 7 | ประเมินโดยผู้ใช้ 41 คน (164 คำตอบ, blind) และทดลองใช้เว็บจริง 100 ครั้ง | `evaluation/survey_analysis/` |
| 8 | ทำเว็บ LOOKLAB (Vercel + RunPod) | `frontend/`, `backend/` |

### ฟังก์ชันสูญเสีย (loss) หลัก 5 ด้าน

ทั้งสองโมเดลใช้ loss ชุดเดียวกัน (โค้ดอยู่ในโน้ตบุ๊กใน `finetune/`)

| ด้าน | วัดอะไร |
|---|---|
| สีผม | ความต่างของสีในบริเวณผม (ค่า L และ a,b ในปริภูมิสี Lab แบบ quantile) |
| ทรงผม | ความตรงกันของ mask ผมกับทรงเป้าหมาย |
| ความเหมือนใบหน้า | 1 − cosine ของ ArcFace |
| บริเวณที่ต้องคงเดิม | ความต่างของพิกเซลนอกบริเวณผม |
| รายละเอียดเส้นผม | ความต่างของรายละเอียดความถี่สูงในบริเวณผม |

HairFastGAN มีเทอมเสริมเพิ่ม 2 อย่าง ได้แก่ วัดสีและทรงที่ภาพกลางทาง (`pre_*`) และ latent anchor ที่กันไม่ให้รหัสแฝงห่างจากค่าเดิม

### Trial ของ HairFastGAN

| Trial | Blending LR | PostProcess LR |
|---|---:|---:|
| A | 1e-5 | 1e-6 |
| **B** | **1e-5** | **5e-7** |
| C | 5e-6 | 1e-6 |
| D | 5e-6 | 5e-7 |

- ทุก trial เริ่มจากน้ำหนัก pretrained ต้นฉบับเดียวกัน
- Barbershop-FT ปรับจูนเฉพาะชั้น `convs[6:]` และ `to_rgbs` ส่วนท้ายของ StyleGAN2 ค่า LR ของแต่ละ trial ดูได้ในบทที่ 3

---

## 2. ผลลัพธ์หลัก

ผลบนชุดทดสอบ 10 เคส จากไฟล์ [`results/final_test_means.csv`](results/final_test_means.csv)

| โมเดล | สีผมคลาดเคลื่อน (L+ab) ↓ | IoU ทรงผม ↑ | ArcFace ↑ | MAE นอกผม ↓ | SSIM นอกผม ↑ |
|---|---:|---:|---:|---:|---:|
| HairFastGAN (ก่อนปรับจูน) | 13.03 | 0.904 | 0.728 | 0.041 | 0.904 |
| **HairFastGAN B24** | **8.99** | **0.920** | **0.794** | **0.014** | **0.947** |
| Barbershop (ก่อนปรับจูน) | 8.77 | 0.885 | 0.711 | 0.036 | 0.899 |
| Barbershop-FT A30 | 7.86 | 0.888 | 0.724 | 0.033 | 0.911 |

- **เวลาต่อภาพ (Colab):** HairFastGAN ประมาณ 10 วินาที, Barbershop-FT ประมาณ 657 วินาที, HairFastGAN + Diffusion ประมาณ 13 วินาที
- **ผู้ใช้ 41 คน:** Diffusion ทำให้ภาพสมจริงขึ้น แต่ความเหมือนใบหน้าลดลงเล็กน้อย HFG B24 + Diffusion ได้ความพึงพอใจสูงสุด (3.90/5)
- **ทดลองใช้เว็บจริง 100 ครั้ง:** ความพึงพอใจโดยรวม 4.73/5 และเวลารอมีค่ามัธยฐาน 14.9 วินาที

จากผลทั้งหมด จึงเลือก **HairFastGAN B24 + Diffusion** ไปใช้บนเว็บ

---

## 3. โครงสร้างโฟลเดอร์

```
looklab-hair-transfer/
├── README.md
├── finetune/
│   ├── pretrained_demo/       ทดลองโมเดลต้นฉบับ (ก่อนปรับจูน) ใน Colab
│   ├── hairfastgan/           ปรับจูน HairFastGAN Trial A–D × 30 epoch
│   ├── barbershop/            ปรับจูน Barbershop Trial A–D × 30 epoch
│   └── selection/             คิดคะแนน validation + เกณฑ์ผ่าน + เลือก/ล็อก checkpoint
├── evaluation/
│   ├── test_metrics/          วัดผลชุดทดสอบ + ผลต่างแบบจับคู่ + 95% CI
│   ├── diffusion_compare/     เทียบ B24 กับ A30 ก่อน/หลัง Diffusion
│   ├── survey_analysis/       วิเคราะห์แบบประเมิน 41 คน + feedback เว็บ 100 ครั้ง
│   └── plots/                 สคริปต์วาดกราฟทั้งหมดในเล่ม + ข้อมูลที่ใช้
├── refine/                    ขั้นขัดเกลาด้วย Diffusion (+ experiments/ รุ่นทดลองก่อนหน้า)
├── backend/                   FastAPI + Dockerfile สำหรับ RunPod Serverless
├── frontend/                  เว็บ LOOKLAB (React/Vite + Express server.ts, deploy บน Vercel)
├── data/                      การแบ่งชุดข้อมูล (json, ไม่มีรูป) + แคตตาล็อกทรง/สีบนเว็บ
├── results/                   ผลวัดดิบ (CSV/JSON) ที่มาของตัวเลขในเล่ม
├── report/                    ซอร์ส LaTeX (Overleaf) + PDF เล่มฉบับสมบูรณ์
└── docs/                      คู่มือ deploy + วิธีดาวน์โหลด checkpoint
```

---

## 4. รายละเอียดแต่ละส่วน

ทุกโน้ตบุ๊กออกแบบให้รันบน **Google Colab (GPU)** และเก็บไฟล์ใน Google Drive
- ในเซลล์แรก ๆ ของแต่ละโน้ตบุ๊กมีตัวแปร path (เช่น `STUDY_ROOT`, `DATASET_ZIP`) ต้องแก้ให้ชี้ไปที่ Drive ของตัวเอง
- ไฟล์โน้ตบุ๊กถูกลบ output ออกแล้วเพื่อลดขนาด ผลที่ได้จริงดูได้ใน `results/`

### `finetune/pretrained_demo/`

| ไฟล์ | ทำอะไร |
|---|---|
| `HairFastGAN_Pretrained_Thai_Colab.ipynb` | รัน HairFastGAN ต้นฉบับกับภาพของตัวเอง (หน้า/ทรง/สี) บน T4 ได้ เหมาะใช้เริ่มทำความเข้าใจโมเดล |
| `Barbershop_Pretrained_Thai_Colab.ipynb` | รัน Barbershop ต้นฉบับแบบเดียวกัน (ใช้เวลาหลายนาทีต่อภาพ) |

### `finetune/hairfastgan/`

| ไฟล์ | ทำอะไร |
|---|---|
| `HairFastGAN_BPP_4Trials_PretrainedStart.ipynb` | ปรับจูนโมดูล Blending + PostProcess ของ HairFastGAN 4 trial × 30 epoch ด้วย train 150 ชุด บันทึก loss ราย epoch และ checkpoint ลง Drive โค้ด loss ทั้ง 5 ด้านอยู่ในโน้ตบุ๊กนี้ |

### `finetune/barbershop/`

| ไฟล์ | ทำอะไร |
|---|---|
| `Barbershop_4Trials_Matched_HairFastGAN.ipynb` | สร้างและเก็บรหัส (F, S) ของ Barbershop ไว้ใน cache แล้วปรับจูนน้ำหนักร่วม (`convs[6:]`, `to_rgbs`) 4 trial × 30 epoch ใช้ loss และข้อมูลชุดเดียวกับ HairFastGAN (4,500 รอบอัปเดตต่อ trial) |

### `finetune/selection/`

| ไฟล์ | ทำอะไร |
|---|---|
| `HairFastGAN_OneZIP_Validation_PLUS_Locked_Test.ipynb` | อ่านผล train/validation ของ A–D, วาดกราฟ, คิดคะแนน validation และเกณฑ์ผ่าน แล้ว**ล็อก checkpoint ก่อนดูชุด test** ได้ HFG = **B epoch 24** |
| `Barbershop_Epoch30_Validation_Standalone.ipynb` | ประเมิน Barbershop A–D ที่ epoch 30 บน validation 9 ชุด |
| `Barbershop_selection_amendment_TH.md` | บันทึกเหตุผลที่แก้กติกาเลือกของ Barbershop (เกณฑ์รายละเอียดเดิมเข้มกว่า HFG อย่างไม่เท่าเทียม) จึงได้ **A epoch 30** |

### `evaluation/`

| ไฟล์ | ทำอะไร |
|---|---|
| `test_metrics/HairFastGAN_Barbershop_Common_Evaluation.ipynb` | วัดทุกโมเดลด้วยฟังก์ชันเดียวกันบน validation 9 + test 10 ชุด คิดผลต่างแบบจับคู่กับ baseline และ 95% CI (บูตสแตรป 10,000 รอบ) |
| `diffusion_compare/Barbershop_A30_vs_HairFastGAN_B24_Complete.ipynb` | อัปโหลดภาพ 3 ภาพแล้วเทียบ A30 กับ B24 ทั้งก่อนและหลัง Diffusion พร้อมจับเวลา |
| `diffusion_compare/Barbershop_Baseline_vs_HairFastGAN_B24_Diffusion.ipynb` | ใส่ขั้น Diffusion → พื้นหลัง → Native Sharp กับผล GAN ทั้งสองโมเดล ได้ 4 ขั้น × 2 โมเดล |
| `survey_analysis/FORME_plot_all.py` | วิเคราะห์แบบประเมิน 41 คน (`--answers data/FS_AnswerSets.csv --questions data/FS_Questions.csv`) |
| `survey_analysis/feedback_charts_separate.py` | วาดกราฟ feedback จากการใช้เว็บ 100 ครั้ง (`data/web_feedback.csv`) |
| `survey_analysis/build_report.py` | สร้างรายงานสรุปแบบประเมิน (ดู `README_build_report_th.md`) |
| `survey_analysis/web_form/` | ฟอร์มประเมิน (Google Apps Script: `Code.gs` + `Index.html`) ที่ใช้เก็บคำตอบ |
| `plots/plot_all_graphs.py` | วาดกราฟทั้งหมดในเล่มจาก `plots/data/` ไปไว้ที่ `plots/out/` (มีฟังก์ชัน `boot_ci` สำหรับ CI ของแบบประเมิน) |
| `plots/plot_train_val.py` | วาดกราฟ train/validation ราย epoch |

### `refine/`

| ไฟล์ | ทำอะไร |
|---|---|
| `LOOKLAB_Diffusion_Native_Sharp.ipynb` | **ตัวหลัก** ขั้นขัดเกลาที่ใช้กับ B24 ได้แก่ Diffusion (strength .15, 30 steps, CFG 2.5) → เก็บพื้นหลัง → Native Sharp (ผม .65, หน้า .25, เปลี่ยนได้ไม่เกิน 5 ระดับ RGB) |
| `experiments/*.ipynb` | รุ่นทดลองก่อนหน้า (EyeModes, Rotation ON/OFF, strict post-process) เก็บไว้ดูแนวคิดที่ลองแล้วไม่ได้เลือกใช้ |

### `backend/` — เซิร์ฟเวอร์โมเดลบน RunPod

| ไฟล์ | ทำอะไร |
|---|---|
| `Dockerfile` | CUDA 12.8 + PyTorch 2.7.1 และติดตั้ง HairFastGAN, SegFormer, Stable Diffusion ไว้ใน image |
| `app.py` | จุดเริ่ม: ดาวน์โหลด checkpoint B24 → เปิด server ที่พอร์ต 80 |
| `server.py` | FastAPI: `/generate`, `/jobs`, `/jobs/{id}/result`, `/feedback`, `/health`, `/ping` |
| `pipeline.py` | โหลด B24 (ตรวจ sha256 / epoch 24 / trial B), mixing 0.95, Diffusion และเก็บพื้นหลัง |
| `download_assets.py` | ดาวน์โหลด pretrained ของ HairFastGAN และ `best.pt` |
| `patch_stylegan_native.py` | เปลี่ยน CUDA ops ของ StyleGAN เป็น PyTorch ล้วน (แบบเดียวกับตอนฝึก) |

### `frontend/` — เว็บ LOOKLAB

| ไฟล์ / โฟลเดอร์ | ทำอะไร |
|---|---|
| `src/App.tsx` | หน้าเว็บหลัก: อัปโหลด/ถ่ายภาพ เลือกทรงและสี ดูผล ให้คะแนน |
| `src/services/hairFastGanService.ts` | เรียก API สร้างภาพและติดตามสถานะงาน |
| `src/services/feedbackService.ts` | ส่งแบบประเมินหลังใช้งาน |
| `src/utils/faceTrackingUtils.ts` | ตรวจจับใบหน้าในโหมดกล้องบนเครื่องผู้ใช้ (MediaPipe) |
| `server.ts`, `api/index.ts` | เซิร์ฟเวอร์ตัวกลาง Express (รันเป็นฟังก์ชันบน Vercel) ทำหน้าที่เก็บ API key ไว้ฝั่งเซิร์ฟเวอร์และย่อภาพก่อนส่งต่อไป RunPod |
| `public/assets/hairs`, `public/assets/colors` | ภาพทรงผม 23 แบบ และสีผม 28 แบบบนเว็บ (ชื่อไทย–อังกฤษอยู่ใน `data/hairstyle_catalog/`) |

### `data/`

| ไฟล์ | เนื้อหา |
|---|---|
| `dataset_split/*.json` | ภาพไหนอยู่ train / validation / test (ไม่มีรูป ตัดชื่อไฟล์ต้นฉบับออกแล้ว) อ่านรายละเอียดได้ใน `dataset_split/README_TH.md` |
| `hairstyle_catalog/` | ชื่อทรงและสีบนเว็บ (ไทย–อังกฤษ) |

---

## 5. วิธีใช้งานเว็บ

### 5.1 รันหน้าเว็บบนเครื่อง

ต้องมี Node.js (แนะนำรุ่น LTS ล่าสุด) และ RunPod endpoint ที่รัน `backend/` อยู่แล้ว

```bash
cd frontend
cp .env.example .env      # ใส่ค่าตามตารางด้านล่าง
npm install
npm run dev               # เปิด http://localhost:3000
```

| ตัวแปรใน `frontend/.env` | ความหมาย |
|---|---|
| `HAIRFASTGAN_API_URL` | URL ของ RunPod endpoint เช่น `https://<ENDPOINT_ID>.api.runpod.ai` |
| `RUNPOD_API_KEY` | API key ของ RunPod (`rpa_...`) |
| `HAIRFASTGAN_API_TOKEN` | token ที่ส่งไปใน header `x-api-key` ถ้ามี key เดียวใส่ซ้ำกับ `RUNPOD_API_KEY` ได้ (ต้องมีอย่างน้อยหนึ่งตัวจากสองตัวนี้) |
| `HAIRFASTGAN_TIMEOUT_MS` | (ไม่บังคับ) เวลารอสูงสุด ค่าเริ่มต้น 180000 ms |

build สำหรับใช้งานจริงด้วย `npm run build` แล้วรันด้วย `npm start` หรือ deploy ขึ้น Vercel โดยตั้งค่าตัวแปรข้างต้นใน Project Settings → Environment Variables

### 5.2 Deploy ระบบหลังบ้านบน RunPod

ขั้นตอนเต็มอยู่ใน [`backend/README_TH.md`](backend/README_TH.md) และ [`docs/LOOKLAB_Deploy_Guide_TH.md`](docs/LOOKLAB_Deploy_Guide_TH.md) สรุปได้ดังนี้

```bash
cd backend
docker build --platform linux/amd64 -t <dockerhub-user>/looklab-hairfastgan:ft2 .
docker push <dockerhub-user>/looklab-hairfastgan:ft2
```

1. สร้าง RunPod **Serverless endpoint แบบ Load Balancer** โดยใช้ image ข้างต้น
2. เลือก GPU ที่มี VRAM ≥ 24 GB และ container disk ≥ 10 GB
3. ตั้ง environment variables ตามตารางนี้

| ตัวแปร | ความหมาย |
|---|---|
| `CHECKPOINT_HF_REPO` + `CHECKPOINT_HF_FILENAME` + `HF_TOKEN` | ที่อยู่ของ `best.pt` (B24) บน Hugging Face |
| หรือ `CHECKPOINT_GDRIVE_ID` / `CHECKPOINT_URL` | ทางเลือกแทน Hugging Face (ดู `docs/CHECKPOINTS.md`) |
| `API_TOKEN` | (ไม่บังคับ) ถ้าตั้งไว้ คำขอต้องส่ง `Authorization: Bearer <token>` หรือ header `x-api-token` มาให้ตรงกัน ถ้าเว้นว่างจะไม่ตรวจ (บน RunPod แบบ Load Balancer ปกติเว้นว่าง เพราะ RunPod ตรวจ API key ให้แล้ว) |
| `FEEDBACK_APPS_SCRIPT_URL`, `FEEDBACK_SHARED_SECRET` | (ไม่บังคับ) ส่งแบบประเมินไปเก็บใน Google Sheet |
| `DIFFUSION_CPU_OFFLOAD` | (ไม่บังคับ) `auto` / `1` / `0` สำหรับ GPU ที่ VRAM น้อย |

> ⚠️ ห้าม commit `.env`, key หรือ token ใดๆ ขึ้น GitHub ไฟล์ `.gitignore` กันไว้ให้แล้ว

---

## 6. วิธีทำการทดลองซ้ำบน Colab

**สิ่งที่ต้องเตรียม**
- Colab GPU ระดับ A100 หรือ L4 ขึ้นไป (โน้ตบุ๊ก demo ใช้ T4 ได้)
- Google Drive สำหรับเก็บ cache, checkpoint และผลลัพธ์
- ชุดข้อมูลภาพของตัวเอง จัดตามโครงสร้างใน `data/dataset_split/README_TH.md`
- checkpoint B24 / A30 จาก Drive (ใช้เมื่อต้องการข้ามขั้นฝึก)

**ลำดับการรัน**

```
finetune/hairfastgan ─┐
                      ├─► finetune/selection ─► evaluation/test_metrics ─► refine ─► evaluation/diffusion_compare
finetune/barbershop ──┘                                                                     │
                                                       evaluation/survey_analysis ◄─────────┘ (ภาพที่ใช้ทำแบบประเมิน)
```

ถ้าต้องการแค่ลองผล ไม่ต้องฝึกใหม่ ให้ดาวน์โหลด checkpoint แล้วเปิด `evaluation/diffusion_compare/Barbershop_A30_vs_HairFastGAN_B24_Complete.ipynb` ได้เลย

**รันสคริปต์วิเคราะห์บนเครื่อง** (ไม่ต้องใช้ GPU)

```bash
pip install pandas numpy matplotlib scipy
python evaluation/plots/plot_all_graphs.py
python evaluation/survey_analysis/feedback_charts_separate.py
python evaluation/survey_analysis/FORME_plot_all.py --answers evaluation/survey_analysis/data/FS_AnswerSets.csv --questions evaluation/survey_analysis/data/FS_Questions.csv
```

กราฟใช้ฟอนต์ไทย IBM Plex Sans Thai ถ้าเครื่องไม่มีฟอนต์นี้ ตัวอักษรไทยในกราฟอาจไม่แสดง

---

## 7. ไฟล์ผลลัพธ์ ↔ ตารางในเล่ม

| ผลในเล่ม | ไฟล์ |
|---|---|
| กราฟ train/validation ราย epoch ของ HFG และการเลือก B24 | `results/hairfastgan/train_val_test_report/01_train_val/` |
| ผล test ของ HFG baseline และ A–D | `results/hairfastgan/HairFastGAN_test_results.json`, `.../03_test/` |
| ผล validation ของ Barbershop A–D ที่ epoch 30 | `results/barbershop/02_epoch30_validation/` |
| ผล test ของ Barbershop-FT A30 + paired delta + 95% CI | `results/barbershop/03_amended_test_A30/` |
| ตารางผลบนชุดทดสอบ (สรุป) | `results/final_test_means.csv` |
| เวลาฝึกและเวลาประมวลผลของ Barbershop | `results/barbershop/01_first_run_selected_epoch0/separate_compute_times.csv` |
| แบบประเมินผู้ใช้ 41 คน | `evaluation/survey_analysis/data/FS_AnswerSets.csv` |
| ทดลองใช้เว็บ 100 ครั้ง | `evaluation/survey_analysis/data/web_feedback.csv` |

> `results/barbershop/01_first_run_selected_epoch0/` คือการรันรอบแรกของ Barbershop ซึ่งกติกาเดิมเลือก epoch 0 ทุก trial ค่าจึงเท่ากับ baseline **ไม่ใช่ผลของ A30** เหตุผลของการแก้กติกาอยู่ใน `finetune/selection/Barbershop_selection_amendment_TH.md`

---

## 8. ข้อจำกัดและสิ่งที่ควรรู้ก่อนพัฒนาต่อ

**เรื่องการทำซ้ำ**
- **ไม่มีภาพชุดข้อมูลใน repo** เพื่อความเป็นส่วนตัวของผู้ที่อยู่ในภาพ จึงรันโน้ตบุ๊กฝึกซ้ำด้วยข้อมูลชุดเดิมไม่ได้ ต้องใช้ชุดข้อมูลของตัวเอง หรือติดต่ออาจารย์ที่ปรึกษา
- **path ในโน้ตบุ๊ก** ชี้ไปที่ Google Drive ของผู้จัดทำ (`/content/drive/MyDrive/...`) ต้องแก้เป็นของตัวเอง

**เรื่องการตั้งค่าโมเดล**
- **ค่า mixing ของ HairFastGAN ต้องเป็น 0.95** ให้ตรงกับตอนฝึก ใน `backend/pipeline.py` ตั้งไว้แล้ว ถ้าแก้ ผลจะไม่ตรงกับในเล่ม
- **checkpoint ต้องตรง sha256** ระบบหลังบ้านจะไม่ทำงานถ้าไฟล์ไม่ใช่ B24 ตัวจริง ค่า sha256 อยู่ใน `docs/CHECKPOINTS.md`

**เรื่องผลลัพธ์**
- **Barbershop-FT ช้า** ประมาณ 11 นาทีต่อภาพ จึงไม่เหมาะใช้กับเว็บ
- **Diffusion มี trade-off** ภาพสมจริงขึ้น แต่ ArcFace ลดลงเล็กน้อย จึงใช้ strength ต่ำ (0.15) และคืนใบหน้าเดิมบางส่วน
- **ขนาดชุดข้อมูลเล็ก** (train 150 / test 10) ผลต่างของ Barbershop-FT หลายตัวชี้วัดจึงมี CI คร่อม 0

**แนวทางพัฒนาต่อ** (จากข้อเสนอแนะในบทที่ 5)
- Barbershop: เพิ่มรอบการค้นหาเพื่อให้ทรงผมดีขึ้น (แลกกับเวลาที่นานขึ้น)
- Diffusion: ลดความแรงเฉพาะบริเวณใบหน้า หรือแก้ไขเฉพาะบริเวณผม เพื่อให้ใบหน้าเหมือนเดิม
- ข้อมูล: เพิ่มจำนวนชุดทดสอบ และบันทึกน้ำหนักของ Barbershop-FT ทุก epoch เพื่อเลือก checkpoint ได้ทุก epoch
- เว็บ: แก้ผมบางทรงที่ฟูเกินจริง และลดเวลารอในโหมดกล้อง (ตอนนี้ประมาณ 15 วินาที)

---

## 9. เครดิต ภาพ และความเป็นส่วนตัว

งานนี้ต่อยอดจากโค้ดและโมเดลต้นฉบับต่อไปนี้ ถ้าจะนำไปใช้ต่อ ต้องทำตามสัญญาอนุญาตของแต่ละโครงการด้วย

| โครงการ | ที่มา |
|---|---|
| HairFastGAN | <https://github.com/AIRI-Institute/HairFastGAN> (Nikolaev et al., 2024) |
| Barbershop | <https://github.com/ZPdesu/Barbershop> (Zhu et al., 2021) |
| Stable Diffusion / Realistic Vision v5.1 | Hugging Face `stablediffusionapi/realistic-vision-v51` |
| SegFormer | Hugging Face `mattmdjaga/segformer_b2_clothes` |
| ArcFace | Deng et al. |
| MediaPipe Face Landmarker | Google |

**ภาพและข้อมูลส่วนบุคคล**
- repo นี้ไม่มีภาพชุดข้อมูลที่ใช้ฝึกหรือทดสอบ ไฟล์ใน `data/` มีแค่รหัสภาพ และไม่มีภาพของผู้ตอบแบบสอบถาม
- ข้อมูลแบบประเมินใช้รหัสผู้ตอบแบบไม่ระบุตัวตน (`U001`, …)
- feedback จากเว็บตัดคอลัมน์ที่ใช้ระบุตัวผู้ส่งออกแล้ว
- ภาพใน `report/latex/images` เป็นภาพประกอบชุดเดียวกับในเล่มรายงาน
- ภาพทรงและสีผมใน `frontend/public/assets` เป็นภาพตัวอย่างบนเว็บ
- ถ้าจะนำภาพเหล่านี้ไปใช้นอกเหนือจากการศึกษา ให้ตรวจสิทธิ์ของภาพก่อน
