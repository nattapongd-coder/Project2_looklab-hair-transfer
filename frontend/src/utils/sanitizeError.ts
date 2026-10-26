/**
 * Utility to sanitize user-facing error messages, removing AI model names (such as HairFastGAN)
 * and presenting friendly, actionable Thai explanations.
 */
export function sanitizeUserErrorMessage(rawMsg: string | null | undefined): string {
  if (!rawMsg) return "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ประมวลผล กรุณาลองใหม่อีกครั้ง";

  let msg = String(rawMsg);
  if (msg.includes("[object Object]")) {
    return "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ประมวลผล กรุณาลองใหม่อีกครั้ง";
  }

  // Strip technical model names (whole words only, so words like "ORGANIZATION" stay intact)
  // Environment variable names (e.g. HAIRFASTGAN_API_TOKEN) are kept intact so the user knows what to fix
  msg = msg
    .replace(/[A-Za-z0-9_]*HairFast(?:GAN)?[A-Za-z0-9_]*/gi, (m) => (m.includes("_") ? m : m.replace(/HairFast(?:GAN)?/i, "")))
    .replace(/\bGAN\b/g, "")
    .replace(/โมเดล\s*/gi, "ระบบ");

  // Specific common cases (most specific first – the generic check used to hide the image 1 / image 2 cases)
  if (msg.includes("No faces detected in the image 1")) {
    return "ไม่พบใบหน้าในภาพทรงผมอ้างอิง กรุณาเลือกทรงผมอื่น";
  }

  if (msg.includes("No faces detected in the image 2")) {
    return "ไม่พบใบหน้าในภาพสีผมอ้างอิง กรุณาเลือกสีผมอื่น";
  }

  if (msg.includes("No faces detected")) {
    return "ไม่พบใบหน้าในรูปภาพ กรุณาหันหน้าตรงและให้มีแสงสว่างเพียงพอ";
  }

  if (/AbortError|aborted/i.test(msg)) {
    return "ยกเลิกการประมวลผลแล้ว";
  }

  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED")) {
    return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ประมวลผลได้ กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง";
  }

  if (msg.includes("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์") || msg.includes("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์")) {
    return "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ประมวลผล กรุณาลองใหม่อีกครั้ง";
  }

  const cleaned = msg.replace(/เซิร์ฟเวอร์\s+ประมวลผล/g, "เซิร์ฟเวอร์ประมวลผล").trim();
  if (!cleaned || cleaned === "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" || cleaned === "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ ") {
    return "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ประมวลผล กรุณาลองใหม่อีกครั้ง";
  }

  return cleaned;
}
