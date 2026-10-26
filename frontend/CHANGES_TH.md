# สรุปการแก้ไข LOOKLAB (looklab_final_02_fixed)

## 1. รูปผลลัพธ์ไม่แสดง (ช่อง "4. หลัง" เป็นไอคอนรูปแตก)

**สาเหตุ**
- `server.ts` แปลงข้อมูลจากเซิร์ฟเวอร์ประมวลผลเป็นรูป **โดยไม่ตรวจว่าเป็นรูปจริง** ถ้า backend ส่ง base64 แบบ URL-safe (`-` `_`), ส่งพาธไฟล์ที่ตอบกลับเป็นหน้า HTML หรือมีฟิลด์ข้อความอื่นปนมา ระบบก็ยังติดป้าย `data:image/png;base64,...` ให้ แล้วส่งต่อให้เบราว์เซอร์ → เปิดไม่ได้ = รูปแตก
- ฝั่งเว็บ (`hairFastGanService.ts`) รอโหลดรูป แต่ถ้า **โหลดไม่สำเร็จก็ยังถือว่าสำเร็จ** (`img.onerror = resolve`) แล้วพาไปหน้าผลลัพธ์พร้อมรูปที่เสีย
- เลือก "รูปหลัก" ผิดได้ เช่น ไปหยิบรูป `face` (รูปต้นฉบับ) หรือฟิลด์ที่ไม่ใช่รูปมาเป็นผลลัพธ์

**การแก้ไข**
- ไฟล์ใหม่ `serverImageUtils.ts`: ถอดรหัส base64 ทุกรูปแบบ (ปกติ / data URL / URL-safe / มีขึ้นบรรทัด / ไม่มี padding) และ **ตรวจ magic bytes** (JPEG/PNG/WEBP/GIF) ทุกรูป ดาวน์โหลดรูปจาก URL/พาธพร้อม RunPod key แปลงทุกรูปแบบขนาน (เร็วขึ้น) และไม่เลือกรูป input (`face`, `aligned`, ...) เป็นผลลัพธ์ถ้ามีรูปผลลัพธ์จริงอยู่
- `server.ts`: ถ้าไม่มีรูปที่เปิดได้เลย จะตอบ error ภาษาไทยที่ชัดเจนแทนการส่งรูปแตก, แก้บั๊กอ่าน body ซ้ำตอน error (`Body already used`), เพิ่ม route `/api/hairfastgan/jobs/:id` สำหรับงานแบบคิว (เดิมเรียก route ที่ไม่มีอยู่จริง)
- ฝั่งเว็บ: ตรวจว่าเบราว์เซอร์ decode รูปได้จริงก่อนแสดง ตัดรูปที่เสียทิ้ง แปลงทุกผลลัพธ์เป็น data URL (ให้ปุ่มดาวน์โหลด/แบบสอบถามใช้ได้)
- `ResultPage.tsx`, `BeforeAfterSlider.tsx`: ถ้ารูปยังเปิดไม่ได้ จะแสดงข้อความ "แสดงรูปผลลัพธ์ไม่ได้" แทนไอคอนรูปแตก

## 2. ทำไมประมวลผลนาน และสิ่งที่แก้

| จุดที่ช้า | เดิม | หลังแก้ |
|---|---|---|
| ขนาดไฟล์ที่อัปโหลดต่อครั้ง | ~6.6 MB (PNG 2–3 MB × 3 ไฟล์ ส่ง 2 ทอด: เบราว์เซอร์→เซิร์ฟเวอร์→RunPod) | ~0.8 MB (แปลงเป็น JPEG คุณภาพ 92%, หน้าไม่เกิน 1600px, รูปอ้างอิงไม่เกิน 1408px) |
| รูปอ้างอิงทรงผม/สีผม | ดาวน์โหลดใหม่ทุกครั้ง (`no-cache` + `?_t=` + server ปิด ETag) | แคชในเบราว์เซอร์ + โหลดล่วงหน้าทันทีที่เลือกทรง/สี |
| เตรียมรูปหน้า | ทำใหม่ทุกครั้ง | เตรียมไว้ตั้งแต่ตอนอัปโหลด และใช้ซ้ำเมื่อลองหลายทรง |
| แปลงรูปผลลัพธ์บนเซิร์ฟเวอร์ | ทีละรูปต่อกัน | พร้อมกันทุกรูป และไม่ส่ง base64 ซ้ำสองชุด |
| UI ระหว่างรอ | re-render ทั้งแอป 20 ครั้ง/วินาที | 10 ครั้ง/วินาที |
| ปุ่ม "ยกเลิก" | ปิดหน้าโหลดแต่คำขอยังวิ่งต่อ แล้วเด้งไปหน้าผลลัพธ์ทีหลัง | ยกเลิกคำขอจริง (AbortController) |

ผลทดสอบกับ backend จำลอง: เวลาฝั่งเว็บ+เซิร์ฟเวอร์ (ไม่รวม GPU) เหลือราว 0.1–0.2 วินาที
**เวลาที่เหลือเกือบทั้งหมดคือเวลาของเซิร์ฟเวอร์ GPU** ดูได้จาก Console ของเบราว์เซอร์ (`Timing (ms)` → `upstreamMs`) และ log ของ server (`upstream ... ms`)

ถ้า `upstreamMs` ยังสูง ให้แก้ฝั่ง Python/GPU:
- โหลดโมเดล HairFastGAN **ครั้งเดียวตอนเริ่มเซิร์ฟเวอร์** (global) ไม่ใช่โหลดใหม่ทุก request และยิง warm-up 1 ครั้งหลังโหลด
- RunPod Serverless: ตั้ง Active/Min Workers = 1 เพื่อเลี่ยง cold start (ครั้งแรกอาจนาน 30–90 วินาที)
- เลือก GPU ที่แรงพอใน RunPod (เช่น A10/L4 ขึ้นไป) GPU เล็กจะช้ากว่ามาก
- ส่งผลลัพธ์กลับเป็น JPEG base64 แทน PNG และส่งเฉพาะรูปที่ใช้จริง

## 3. บั๊กอื่นที่พบและแก้

- `server.ts`: `new Blob([buffer])` ผิด type กับ TypeScript/@types/node รุ่นใหม่ (5 จุด), health check หยุดที่ `/ping` แม้ได้ 404 (ตอนนี้ลอง `/health`, `/`, `/docs` ต่อ), feedback proxy ไม่ส่ง token จาก request และไม่ส่ง header ngrok, timeout ตั้งค่าได้ผ่าน `HAIRFASTGAN_TIMEOUT_MS` (ค่าเริ่มต้น 180 วินาที), รายการไฟล์ assets เรียงตามชื่อ
- `types.ts`: ขาดฟิลด์ `rawLandmarks` ที่ `CameraView.tsx` ใช้ (type error)
- `FaceShapeAnalysisTab.tsx`: ถ้ารูปหน้าเป็น "Oblong" หน้าจอจะ crash (`shapeDetails["Oblong"]` ไม่มี)
- `sanitizeError.ts`: เช็ก "No faces detected" ก่อน "image 1/2" ทำให้ข้อความเฉพาะไม่เคยแสดง, การลบคำ "GAN" ไปตัดคำอื่นที่มีตัวอักษรนี้
- `App.tsx`: เทียบสีที่ยังไม่รู้ค่ากับ `#888888` แต่ `data.ts` ตั้งไว้ `#777777` ทำให้ไม่เคยดึงสีจากรูป, หน้าผลลัพธ์อาจหยิบผลของโหมดกล้องผิดโหมด
- `feedbackService.ts`: ส่งแบบสอบถามผ่านเซิร์ฟเวอร์เสมอ และแสดงข้อความ error จากเซิร์ฟเวอร์ได้ถูกต้อง
- `CameraView.tsx`: ลดความถี่ตัวจับเวลาเป็น 100ms

## 4. ใช้ RunPod อย่างเดียว (เอา ngrok ออกทั้งหมด)

**ตั้งค่าในไฟล์ `.env` เท่านั้น** (คัดลอกจาก `.env.example` ระบบไม่อ่าน `.env.example`) แล้วรีสตาร์ท `npm run dev`

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `HAIRFASTGAN_API_URL` | RunPod Serverless Load Balancer endpoint `https://<ENDPOINT_ID>.api.runpod.ai` (ต้องมี `POST /generate`, `GET /ping`) |
| `RUNPOD_API_KEY` | RunPod API key (`rpa_...`) ส่งเป็น `Authorization: Bearer <key>` |
| `HAIRFASTGAN_API_TOKEN` | token ของแอป ส่งเป็น `x-api-key` (ถ้ามี key เดียว ใส่ตัวเดียวก็พอ ระบบใช้แทนกันได้) |

- ลบ header / ข้อความ / การตรวจจับ ngrok และ Colab ออกทั้งหมด
- เลิกรับ URL / key จากเบราว์เซอร์ (เดิมเก็บ RunPod key ไว้ใน localStorage ซึ่งไม่ปลอดภัย และค่าเก่าในเบราว์เซอร์ไปแทนค่าใน `.env`) และล้างค่าเก่าที่ค้างในเบราว์เซอร์ให้อัตโนมัติ
- เลิกใช้ `hairfastgan_config.json` สำหรับ URL/key และลบหน้าต่าง `ServerConfigModal` ที่ไม่มีปุ่มเปิดใช้งานอยู่แล้ว
- ไม่ใส่ API key ใน URL (`?api_key=`) อีกต่อไป ส่งผ่าน header อย่างเดียว ไม่หลุดไปใน log
- การส่งแบบสอบถามวิ่งผ่านเซิร์ฟเวอร์ทุกครั้ง (key อยู่ฝั่งเซิร์ฟเวอร์)
- ตอนเปิด `npm run dev` จะพิมพ์ RunPod endpoint ที่ใช้ และบอกว่าพบ `RUNPOD_API_KEY` / `HAIRFASTGAN_API_TOKEN` หรือไม่
- error 401/404 บอกชัดว่าให้ตรวจตัวแปรตัวไหนใน `.env`; ถ้า `/generate` ได้ 404 จะอ่าน `/openapi.json` หา route ที่ถูกแล้วลองใหม่อัตโนมัติ

## 5. แก้ "RunPod endpoint: NOT CONFIGURED"

- ระบบค้นหาไฟล์ทั้งในโฟลเดอร์ที่รัน `npm run dev` และโฟลเดอร์ของ `server.ts`: `.env.local`, `.env`, `.env.txt` (Windows มักบันทึกเป็น `.env.txt` โดยไม่รู้ตัว)
- ถ้าใส่ค่าจริงไว้ใน `.env.example` ระบบจะอ่านให้ด้วย แต่อ่านเฉพาะค่าจริง ค่าตัวอย่างจะถูกข้าม และจะเตือนให้เปลี่ยนชื่อเป็น `.env`
- รองรับไฟล์ที่มี BOM, ขึ้นบรรทัดแบบ Windows (CRLF), ค่าในเครื่องหมายคำพูด และ comment ท้ายบรรทัด
- ตอนเริ่มเซิร์ฟเวอร์จะพิมพ์ว่าเจอไฟล์ไหน อ่านตัวแปรอะไร และสถานะของแต่ละตัว (set / missing / PLACEHOLDER)
- zip ชุดนี้ **ไม่มี `.env.example`** เพื่อไม่ให้ทับไฟล์ที่คุณใส่ค่าจริงไว้

## 6. Deploy บน Vercel (แก้ "[object Object]")

**สาเหตุ:** Vercel deploy แค่หน้าเว็บ ส่วน `server.ts` ที่ดูแล `/api/...` ไม่ได้ถูกรัน Vercel จึงตอบ 404 เป็น `{"error":{"code":"NOT_FOUND"}}` และหน้าเว็บแสดง object นั้นเป็น `[object Object]`

**การแก้ไข (Build Output API)**
- `scripts/vercel-build.mjs` (Vercel รันผ่าน `vercel.json`): build หน้าเว็บด้วย Vite แล้ว bundle `server.ts` ทั้งหมดเป็น **ไฟล์ JavaScript ไฟล์เดียว** เป็น Vercel Function ที่รับทุก `/api/*` Vercel ไม่ต้อง compile TypeScript เอง จึงไม่มีปัญหา import/tsconfig ตอนรัน
- ลบโฟลเดอร์ `api/` แบบเดิม (ให้ Vercel compile TS เอง ซึ่งพังง่าย)
- `server.ts`: `export default app`, ไม่เปิดพอร์ตเองเมื่ออยู่บน Vercel, คืน path เดิมของ request ก่อนเข้า route, โหลด vite เฉพาะตอน dev, ลบ Gemini client ที่ไม่ได้ใช้
- จำกัดขนาดคำตอบไม่เกิน 4.5 MB อัตโนมัติ (ตัดรูป input ออกก่อน เหลือรูปผลลัพธ์), ไม่ส่งรูปซ้ำ
- `/api/hairfastgan/config` บอกสถานะตัวแปร (set / missing) และ `runtime` เพื่อเช็คบน Vercel
- หน้าเว็บแสดงข้อความ error ภาษาไทยเสมอ ไม่มี `[object Object]` อีก
- `npm run build` เก็บ server ไว้ที่ `server-dist/`, `npm start` ใช้งานได้บน Windows
- timeout ของ function 300 วินาที ปรับได้ด้วย env `VERCEL_MAX_DURATION`

## 7. รวมหน้าเว็บจาก remix-looklab_final

ใช้หน้าตาและการทำงานจาก remix และใส่ backend RunPod + Vercel ที่แก้แล้ว
- จาก remix: สร้างภาพเสร็จแล้วอยู่หน้าหลัก รูปผลลัพธ์แสดงในกรอบรูป และหน้าต่างแบบสอบถามเด้งขึ้นทันที (ไม่มีหน้าผลลัพธ์แยก), ตัวเลือกทรงผม/สีผมจัดวางพอดีมือถือ, เพิ่มสีผม C14–C20, จับคู่ไฟล์สีผมได้แม่นขึ้น, Header และ scrollbar ใหม่
- `server.ts` และ `hairFastGanService.ts` ของ remix เป็นเวอร์ชันเก่า (ngrok/Colab) จึงใช้เวอร์ชันที่แก้แล้วแทน
- แก้บั๊ก `FeedbackCard.tsx`: มี React hook อยู่หลัง `return null` ทำให้หน้าเว็บพังตอนปิดแบบสอบถาม ("Rendered fewer hooks than expected")
- แบบสอบถามไม่แสดงรูปต้นฉบับ (face/aligned) เป็นตัวเลือกให้ประเมินอีก แสดงเฉพาะรูปผลลัพธ์

## 8. ส่งแบบสอบถามไม่ได้ ("The origin web server returned an invalid or incomplete response to Cloudflare")

- ข้อความนี้มาจากด่านหน้า (Cloudflare) ของ RunPod แปลว่า worker ตอบ `/feedback` ไม่สมบูรณ์ ส่วนใหญ่เกิดเพราะ worker ถูกปิดไประหว่างที่ผู้ใช้กรอกแบบสอบถาม แล้วกำลังเปิดใหม่ (cold start) หรือโค้ด `/feedback` บน RunPod เกิด error
- เซิร์ฟเวอร์ลองส่งซ้ำอัตโนมัติสูงสุด 3 ครั้ง (รอ 4 และ 10 วินาที) เมื่อได้ 502/503/504/520–524 โดยไม่สร้างข้อมูลซ้ำ เพราะแต่ละการส่งใช้ UUID เดิม
- แปลง error เป็นภาษาไทยที่บอกสาเหตุ (ไม่มี route `/feedback`, key ผิด, worker ล่ม) และบันทึกรายละเอียดลง log ของ Vercel
- ลดขนาดรูปที่แนบในแบบสอบถามเหลือไม่เกิน 1.9 MB ต่อรูป (เดิม 3.8 MB ×2 = 7.6 MB เกินขีดจำกัด 4.5 MB ของ Vercel)

## การตรวจสอบที่ทำ
- Type-check ทั้งโปรเจกต์ (TypeScript) ผ่าน
- Unit test `serverImageUtils.ts` 14 กรณี (base64 หลายรูปแบบ, URL, หน้า HTML แทนรูป, เลือกรูปหลัก, ส่ง RunPod auth header) ผ่าน
- รัน server.ts จริงกับ RunPod จำลอง: มีทั้ง 2 key, มีแค่ HAIRFASTGAN_API_TOKEN, key ผิด (ได้ข้อความ 401 ชัดเจน), เบราว์เซอร์ส่ง URL อื่นมา (ถูกเพิกเฉย), ใช้ค่าตัวอย่างจาก .env.example (แจ้งว่ายังไม่ตั้งค่า), route ชื่ออื่น (ค้นเจอจาก openapi.json)
- รัน `scripts/vercel-build.mjs` แล้วจำลอง routing ของ Vercel เรียก function ที่ bundle แล้ว: config / health / generate / proxy-image / หน้าเว็บ ทำงานครบ ทั้งกรณีที่ Vercel ส่ง URL เดิมและ URL ที่ถูก rewrite
- จำลองการเรียก Vercel Function (`VERCEL=1`): ไม่เปิดพอร์ตเอง, อ่าน env ได้, คำตอบ 8 MB ถูกย่อเหลือ ~0.2 MB โดยยังมีรูปผลลัพธ์
- ทดสอบหน้าเว็บ remix ในเบราว์เซอร์: สร้างภาพ → อยู่หน้าหลัก + แบบสอบถามเด้งพร้อมรูปผลลัพธ์, ปิดแบบสอบถามแล้วไม่มี error
- ทดสอบส่งแบบสอบถามผ่าน function จำลอง Vercel: RunPod ล่ม 1 ครั้งแล้วกลับมา → สำเร็จ, ล่มตลอด → ข้อความภาษาไทย, ไม่มี route → บอกให้เพิ่ม route
- ทดสอบในเบราว์เซอร์จริง (Chromium) กับ backend จำลอง 3 แบบ: ส่ง base64 แบบ URL-safe → แสดงรูปได้, ส่ง URL ของไฟล์ → แสดงรูปได้, ส่งหน้า HTML → ขึ้นข้อความ error ที่ชัดเจน, ปุ่มยกเลิกหยุดงานได้จริง, จำลอง 404 ของ Vercel → ขึ้นข้อความภาษาไทยแทน [object Object]

> หมายเหตุ: หลังแตกไฟล์ให้รัน `npm install` แล้ว `npm run dev` ตามปกติ ไม่มี dependency ใหม่
