สร้าง/ปรับเว็บไซต์ชื่อ FORME Hair Study สำหรับงานวิจัยประเมินภาพจำลองทรงผมและสีผมของผู้ชาย 40 คน ให้ใช้ Google AI Studio ช่วยออกแบบ frontend และส่งมอบ Index.html สำหรับ deploy ใน Google Apps Script HTML Service เชื่อม Google Sheets ผ่าน google.script.run ใช้ Code.gs ที่แนบเป็น backend contract อย่าเปลี่ยนเป็น Firebase หรือ localStorage ในโหมดจริง

แนบ Index.html, Code.gs และ README_TH.md แล้วทำตามนี้:

1. หน้าตาเรียบหรูสะอาด โทนครีม #F7F5F0 กับม่วงเข้ม #514167 ลาเวนเดอร์ #EEE8F3 ตัวอักษรไทยอ่านง่าย ขนาดเนื้อหาอย่างน้อย 14px ปุ่มกดง่ายบนมือถือ border-radius 12–20px ใช้พื้นที่ว่างพอดี ไม่ทำหน้าแน่นเหมือนตารางเอกสาร ไม่ใส่ gradient รุนแรงหรือกราฟที่ตกแต่งโดยไม่มีข้อมูล รองรับมือถือ iPad และ desktop
2. หน้าเข้าสู่ระบบเพียงหน้าเดียว มีแบรนด์ FORME / HAIR STUDY, คำโปรย “ทรงผมที่ใช่ เริ่มจากมุมมองของคุณ”, ช่องรหัสตัวเลข รองรับ 6 หลักผู้เข้าร่วมและ 12 หลักแอดมิน ระบบตรวจ role จาก backend ห้าม hardcode รหัสแอดมินใน frontend โหมดจริงห้ามแสดงปุ่มเข้าสู่แอดมินโดยข้ามการตรวจรหัส
3. ผู้เข้าร่วมเห็นเฉพาะภาพของตนประมาณ 20 ภาพ ทุกภาพแสดง 4 ส่วน: ใบหน้าต้นฉบับ Reference ทรงผม Reference สีผม ผลลัพธ์ ภาพผลลัพธ์ใหญ่ที่สุดและขยายได้ แสดง “ภาพที่ X / N” และ progress ที่นับเฉพาะบันทึกสำเร็จ บน desktop อ้างอิง 3 ภาพเล็กเหนือผลลัพธ์ใหญ่ด้านซ้าย แบบประเมินด้านขวา บนมือถือภาพอยู่เหนือแบบประเมิน อย่าตัดทรงผมหรือหน้าเมื่อแสดงภาพ (object-fit:contain)
4. ห้ามเปิดเผยว่าแต่ละภาพมาจาก FGAN หรือ Barbershop ห้ามรับ model/tuning_variant ผ่าน API ผู้เข้าร่วม รหัสภาพที่ browser รับต้อง opaque ไม่มีคำใบ้จากชื่อไฟล์ หมายเลขภาพใช้ตามลำดับแสดง ภาพจริงต้องส่งผ่าน Apps Script หลังตรวจ session+assignment ไม่ใช้ Drive public links
5. ทุกภาพมี 6 ข้อ ข้อ 1–5 ให้คะแนน 1–5 ไม่เลือกไว้ล่วงหน้า:
   (1) ทรงผมใกล้เคียงกับภาพอ้างอิงมากเพียงใด?
   (2) สีผมตรงกับภาพอ้างอิงมากเพียงใด?
   (3) ภาพดูสมจริงและเป็นธรรมชาติมากเพียงใด?
   (4) ใบหน้ายังคงเหมือนตัวคุณมากเพียงใด?
   (5) คุณพึงพอใจกับภาพนี้สำหรับการใช้งานจริงมากเพียงใด?
   1=น้อยที่สุด 2=น้อย 3=ปานกลาง 4=มาก 5=มากที่สุด
   (6) หากต้องรอให้ระบบสร้างภาพที่มีคุณภาพเหมือนภาพนี้ คุณยินดีรอได้นานที่สุดเท่าใด?
   ตัวเลือก: น้อยกว่า 1 นาที / 1–5 นาที / มากกว่า 5–10 นาที / มากกว่า 10–20 นาที / มากกว่า 20–40 นาที / มากกว่า 40 นาที เก็บ wait_bin เป็น integer 0–5 แยกจาก Likert scores ถามข้อเวลาทุกรูป ไม่ใช่แค่ตอนท้าย และไม่บอกเวลาโมเดลจริงก่อนให้ตอบ
6. ปุ่มย้อนกลับ และบันทึกไปภาพถัดไป ต้องครบ 6 ข้อ บันทึกสำเร็จจริงก่อนเปลี่ยนหน้า ถ้าพลาดต้องแสดง error ที่อ่านเข้าใจง่าย พร้อมกดซ้ำได้ บันทึกหนึ่งแถวต่อ participant_id+image_id เขียนทับเมื่อแก้คำตอบ ลำดับสุ่มของแต่ละคนต้องคงที่เมื่อกลับมา เมื่อครบแสดงหน้าขอบคุณพร้อมทบทวนคำตอบ
7. แอดมินมี dashboard แยก role และตรวจสิทธิ์ backend ทุกครั้ง มี KPI จำนวนผู้เข้าร่วม จำนวนทำครบ จำนวนชุดคำตอบ/เป้าหมาย ความพึงพอใจเฉลี่ยข้อ 5 มีแถบคะแนนรายข้อ 1–5 แยก FGAN/Barbershop มีกราฟสัดส่วน wait_bin ทั้ง 6 ช่วง มีตารางโมเดล×การจูน V1–V4 พร้อม n และเวลาเฉลี่ยจริง (generation_seconds/60 ถ้ามีข้อมูล) มีหน้า progress รายคนและตารางคำตอบรายภาพ กรอง model/tuning_variant/participant และ CSV ตามตัวกรอง อย่าคำนวณค่าเฉลี่ยนาทีจากรหัส wait_bin อย่าใช้ฟิลด์ overall_satisfaction_rating
8. ไม่สร้างผลลัพธ์การวิจัยขึ้นมา ถ้าโหมดสาธิตต้องมีป้าย “ข้อมูลสมมติ ยังไม่เชื่อม Google Sheets” แบบชัดเจน โหมดจริงต้องแสดง empty state เมื่อยังไม่มีคำตอบ ไม่ใส่ค่าตัวอย่างแทนข้อมูลที่ขาด อย่าเรียกสัดส่วนคะแนน 3–5 ว่า Top-3 และอย่าประกาศผู้ชนะเชิงสถิติจากแค่ค่าเฉลี่ย
9. backend contract:
   login(code) → {token,role,participant_id}
   logout(token) → {ok}
   getParticipant(token) → {participant_id,items:[{image_id}],answers:{[image_id]:{q1,q2,q3,q4,q5,wait_bin}}}
   getImage(token,image_id) → {original,hair,color,result} เป็น image data URLs ที่ผ่านการตรวจสิทธิ์
   saveResponse(token,{image_id,q1,q2,q3,q4,q5,wait_bin}) → {ok}
   getDashboard(token) → {participants:[{participant_id,status,total}],responses:[{participant_id,image_id,pair_id,model,tuning_variant,q1,q2,q3,q4,q5,wait_bin,generation_seconds,updated_at}]}
   Backend throws Error เมื่อผิดสิทธิ์หรือบันทึกผิด ให้ใช้ withFailureHandler ห้ามรายงานสำเร็จเมื่อผิดพลาด
10. ส่งคืน HTML/CSS/JS ใน Index.html ไฟล์เดียวที่ใช้ Apps Script ได้ทันที และแจ้งการแก้ API contract ถ้าจำเป็น โดยไม่แอบเปลี่ยนฝั่ง backend ไม่มีรหัสลับใน bundle หาก preview ภายนอก Apps Script ต้องใช้ mock adapter ที่ติดป้ายชัดเจนและไม่ปะปนข้อมูลจริง


ข้อกำหนดเพิ่ม v2 — ต้องรักษาพฤติกรรม backend ต่อไปนี้:
11. เว็บใช้ผลลัพธ์ที่มีอยู่แล้วทั้งหมด ไม่เรียก /generate, Colab, Python backend หรือ ngrok แอดมินต้องเพิ่มภาพและแก้ไขภาพผ่านเว็บไซต์ได้เอง เมนูจัดการชุดภาพมี 5 upload slots: original/hair/color/FGAN result/Barbershop result เลือกผู้เข้าร่วมและ pair_id กำหนดการจูนของสองโมเดลแยกกัน แชร์ Reference เดียวกัน มี preview ไฟล์เดิมและไฟล์ใหม่ก่อนบันทึก ใช้ JPG/PNG/WebP <=2 MB ต่อไฟล์
12. เพิ่มเมนูจัดการผู้ใช้ เปลี่ยนรหัส 6 หลักเฉพาะคน กรอกเองหรือสุ่ม ตรวจซ้ำ backend มีระงับ/เปิดใช้ เปลี่ยนรหัสแล้วตรวจ auth_hash ของ session เดิมไม่ผ่าน ไม่ส่ง hash หรือรหัสทุกคนมาที่ client
13. การเปลี่ยนเนื้อหาภาพ/เงื่อนไขของคู่เดิมสร้าง version ใหม่ของทั้งคู่และปิด version เก่า แม้ยังไม่มีคำตอบ เพื่อกันหน้าที่เปิดค้างส่งคะแนนของภาพเก่า ชื่อโมเดลจริงแสดงเฉพาะฝั่ง admin คะแนนเก่ายังเข้าถึงจากเมนูประวัติได้ ห้ามโยกคะแนนเก่าไปภาพใหม่ ห้ามลบข้อมูลถาวรเมื่อกดซ่อน มี optimistic fingerprint ป้องกัน overwrite จาก editor เก่า
14. APIs เพิ่มเติม:
 adminGetManagement(token) → {participants:[{participant_id,status}],images:[{image_id,participant_id,pair_id,model,tuning_variant,original_file_id,hair_file_id,color_file_id,result_file_id,generation_seconds,enabled,fingerprint,answer_count}]}
 adminReadImage(token,image_id,kind) → {data}; kind เป็น original/hair/color/result
 adminUploadImage(token,{mime,base64}) → {file_id}; ตรวจ role ก่อนอ่าน bytes และเก็บไฟล์ private Drive
 adminSavePair(token,{participant_id,pair_id,enabled,original_file_id,hair_file_id,color_file_id,records:[{image_id,fingerprint,model,tuning_variant,result_file_id,generation_seconds},...สองโมเดล]}) → {ok,revised,image_ids}; new record ใช้ image_id/fingerprint ว่าง เวลาใช้ number >=0 หรือ ''
 adminSetPairEnabled(token,participant_id,pair_id,image_ids,enabled) → {ok}
 adminResetCode(token,participant_id,new_code) → {ok,login_code}
 adminSetParticipantStatus(token,participant_id,'active'|'disabled') → {ok}
 getDashboard เพิ่ม archived_responses เป็นคำตอบเก่าที่ไม่รวม active dashboard เมนูประวัติและ CSV ต้องใช้รายการนี้ได้
15. ตรวจการบันทึกจากหน้าเก่าหลัง image revision และการ upload หลังหมด session ห้าม bypass role ผ่านปุ่ม demo โหมดสาธิตอยู่ในหน่วยความจำของแท็บเท่านั้น ไม่ใช้เป็นหลักฐานว่า Google เชื่อมจริง
