/**
 * Feedback Service for HairFastGAN Hairstyle Evaluation
 * Integrates directly with FastAPI POST /feedback and GET /feedback-config
 */

export const AGE_GROUP_OPTIONS = [
  "ต่ำกว่า 18 ปี",
  "18–24 ปี",
  "25–34 ปี",
  "35–44 ปี",
  "45–54 ปี",
  "55 ปีขึ้นไป",
] as const;

export type AgeGroup = (typeof AGE_GROUP_OPTIONS)[number];

export interface FeedbackContext {
  readonly experiment_id: string;
  readonly experiment_type: "hairstyle" | "color" | "both";
  readonly hairstyle_id: string;
  readonly hairstyle_name: string;
  readonly hair_color_id: string;
  readonly hair_color_name: string;
  readonly mode: string;
  readonly seed: number | null;
  readonly source_endpoint: string;
}

export interface FeedbackRatings {
  hairstyle?: number | null;
  color?: number | null;
  face: number | null;
  waiting: number | null;
  overall: number | null;
  website: number | null;
}

export interface PreparedImageInfo {
  readonly blob: Blob;
  readonly resized: boolean;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly width: number;
  readonly height: number;
}

export interface FeedbackImagePreparation {
  readonly original: PreparedImageInfo;
  readonly result: PreparedImageInfo;
}

export interface FeedbackSubmission {
  readonly serialized: string;
  readonly originalFile: Blob | null;
  readonly resultBlob: Blob | null;
  readonly imagePreparation?: FeedbackImagePreparation | null;
  readonly experiment_id?: string;
  readonly result_key?: string;
}

export interface FeedbackSuccessResponse {
  saved: boolean;
  experiment_id: string;
  result_key: string;
  duplicate?: boolean;
  message?: string;
  detail?: string;
}

/**
 * Creates an immutable experiment snapshot before sending any generation request.
 */
export function createFeedbackContext({
  experimentType,
  hairstyleId = "",
  hairstyleName = "",
  hairColorId = "",
  hairColorName = "",
  mode = "",
  seed = null,
  sourceEndpoint = "/generate",
}: {
  experimentType: "hairstyle" | "color" | "both";
  hairstyleId?: string;
  hairstyleName?: string;
  hairColorId?: string;
  hairColorName?: string;
  mode?: string;
  seed?: number | null;
  sourceEndpoint?: string;
}): FeedbackContext {
  return Object.freeze({
    experiment_id: crypto.randomUUID(),
    experiment_type: experimentType,
    hairstyle_id: hairstyleId,
    hairstyle_name: hairstyleName,
    hair_color_id: hairColorId,
    hair_color_name: hairColorName,
    mode,
    seed,
    source_endpoint: sourceEndpoint,
  });
}

/**
 * Max size of EACH image copy attached to feedback. Two copies + metadata must fit in one request
 * under Vercel's 4.5 MB body limit, so each one is capped at 1.9 MiB (was 3.8 MiB → up to 7.6 MB total).
 */
export const FEEDBACK_IMAGE_MAX_BYTES = Math.floor(1.9 * 1024 * 1024);

/**
 * Convert a base64 Data URL to a Blob safely.
 * Throws if the image is not a valid base64 data URL.
 */
export async function resultImageBlob(dataUrl: string): Promise<Blob> {
  if (typeof dataUrl !== "string" || !/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) {
    throw new Error("ต้องใช้ภาพจาก result.images[resultKey] ที่แสดงอยู่จริง");
  }
  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * Prepare only the copies attached to feedback; keep source files and displayed results intact.
 */
export async function prepareFeedbackImage(file: Blob): Promise<PreparedImageInfo> {
  if (!(file instanceof Blob)) throw new Error("ไม่พบไฟล์รูปภาพ");
  let image: any,
    release = () => {};
  if (typeof createImageBitmap === "function") {
    image = await createImageBitmap(file);
    release = () => {
      if (typeof image.close === "function") image.close();
    };
  } else {
    const url = URL.createObjectURL(file);
    try {
      image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("อ่านรูปภาพไม่ได้"));
        img.src = url;
      });
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
    release = () => URL.revokeObjectURL(url);
  }

  try {
    const sourceWidth = image.width,
      sourceHeight = image.height;
    if (!sourceWidth || !sourceHeight) throw new Error("ขนาดรูปภาพไม่ถูกต้อง");
    const initialScale = Math.min(1, 2048 / Math.max(sourceWidth, sourceHeight));
    let width = Math.max(1, Math.round(sourceWidth * initialScale));
    let height = Math.max(1, Math.round(sourceHeight * initialScale));
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 20; attempt++) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("เบราว์เซอร์ไม่รองรับการเตรียมรูป");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("แปลงรูปภาพไม่สำเร็จ");
      if (blob.size <= FEEDBACK_IMAGE_MAX_BYTES) {
        return Object.freeze({
          blob,
          resized: width !== sourceWidth || height !== sourceHeight,
          sourceWidth,
          sourceHeight,
          width,
          height,
        });
      }
      if (Math.max(width, height) <= 256) break;
      const scale = Math.min(0.8, Math.sqrt(FEEDBACK_IMAGE_MAX_BYTES / blob.size) * 0.9);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }
    throw new Error("ย่อรูปภาพไม่สำเร็จ กรุณาเลือกไฟล์ใหม่");
  } finally {
    release();
  }
}

/**
 * Freeze a submission once to keep it for identical retries. Never regenerate UUID on retry.
 */
export async function buildFeedbackSubmission({
  context,
  resultKey,
  userWaitSeconds,
  ageGroup = "",
  ratings,
  suggestion = "",
  consent,
  originalFile,
  resultDataUrl,
}: {
  context: FeedbackContext;
  resultKey: string;
  userWaitSeconds: number;
  ageGroup?: string;
  ratings: FeedbackRatings;
  suggestion?: string;
  consent: boolean;
  originalFile: Blob | File | null;
  resultDataUrl: string;
}): Promise<FeedbackSubmission> {
  if (!ageGroup || !ageGroup.trim() || !AGE_GROUP_OPTIONS.includes(ageGroup as AgeGroup)) {
    throw new Error("กรุณาเลือกช่วงอายุ");
  }
  if (context.experiment_type !== "color" && (!ratings.hairstyle || ratings.hairstyle < 1 || ratings.hairstyle > 5)) {
    throw new Error("กรุณาเลือกคะแนนประเมินทรงผมตรงตาม reference (1–5 ดาว)");
  }
  if (context.experiment_type !== "hairstyle" && (!ratings.color || ratings.color < 1 || ratings.color > 5)) {
    throw new Error("กรุณาเลือกคะแนนประเมินสีผมตรงตาม reference (1–5 ดาว)");
  }
  if (!ratings.face || ratings.face < 1 || ratings.face > 5) {
    throw new Error("กรุณาเลือกคะแนนความเหมือนของใบหน้า (1–5 ดาว)");
  }
  if (!ratings.waiting || ratings.waiting < 1 || ratings.waiting > 5) {
    throw new Error("กรุณาเลือกคะแนนความพึงพอใจต่อเวลาที่รอ (1–5 ดาว)");
  }
  if (!ratings.overall || typeof ratings.overall !== "number" || ratings.overall < 1 || ratings.overall > 5) {
    throw new Error("กรุณาเลือกคะแนนความพึงพอใจต่อผลลัพธ์โดยรวม (1–5 ดาว)");
  }
  if (!Number.isInteger(ratings?.website) || ratings.website! < 1 || ratings.website! > 5) {
    throw new Error("กรุณาให้คะแนนความพึงพอใจในการใช้งานเว็บไซต์ 1–5 ดาว");
  }

  const metadata = {
    ...context,
    result_key: resultKey,
    user_wait_seconds: Math.max(0, Math.min(86400, Number(userWaitSeconds.toFixed(2)))),
    age_group: ageGroup,
    hairstyle_rating: context.experiment_type === "color" ? null : ratings.hairstyle,
    hair_color_rating: context.experiment_type === "hairstyle" ? null : ratings.color,
    face_similarity_rating: ratings.face,
    waiting_satisfaction_rating: ratings.waiting,
    overall_satisfaction_rating: Math.round(ratings.overall),
    website_satisfaction_rating: Math.round(ratings.website!),
    suggestion: (suggestion || "").trim().slice(0, 2000),
    image_storage_consent: Boolean(consent),
  };

  const serialized = JSON.stringify(metadata);
  let resultBlob: Blob | null = null,
    preparedOriginal: Blob | null = null,
    imagePreparation: FeedbackImagePreparation | null = null;
  if (consent) {
    if (!(originalFile instanceof Blob)) {
      throw new Error("ไม่พบรูปต้นฉบับ กรุณาเลือกไฟล์เดิมอีกครั้ง");
    }
    const original = await prepareFeedbackImage(originalFile);
    const result = await prepareFeedbackImage(await resultImageBlob(resultDataUrl));
    preparedOriginal = original.blob;
    resultBlob = result.blob;
    imagePreparation = Object.freeze({ original, result });
  }

  return Object.freeze({
    serialized,
    originalFile: preparedOriginal,
    resultBlob,
    imagePreparation,
    experiment_id: context.experiment_id,
    result_key: resultKey,
  });
}

/**
 * Sends feedback submission to the backend as multipart/form-data.
 * Always sent through the server proxy (/api/hairfastgan/feedback) so the RunPod key stays on the server.
 */
export async function sendFeedback(
  apiUrl: string,
  submission: FeedbackSubmission
): Promise<FeedbackSuccessResponse> {
  const form = new FormData();
  form.append("metadata", submission.serialized);
  if (submission.originalFile) {
    form.append("original_image", submission.originalFile, "original.png");
  }
  if (submission.resultBlob) {
    form.append("result_image", submission.resultBlob, "result.png");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 100000);

  try {
    // Always through the server, which adds the RunPod API key from .env
    const response = await fetch("/api/hairfastgan/feedback", {
      method: "POST",
      body: form,
      signal: controller.signal,
    }).catch((err: any) => {
      if (err?.name === "AbortError") throw new Error("หมดเวลาการส่งแบบสอบถาม กรุณาลองใหม่อีกครั้ง");
      throw err;
    });

    let answer: any;
    try {
      answer = await response.json();
    } catch {
      throw new Error(`ไม่ได้รับ JSON จากเซิร์ฟเวอร์ (HTTP ${response.status}) กรุณาตรวจสอบว่า RunPod worker มี route /feedback`);
    }

    if (!response.ok || answer?.saved !== true) {
      if (response.status === 409) {
        throw new Error("ภาพนี้ได้ส่งแบบสอบถามเรียบร้อยแล้ว");
      }
      if (response.status === 413) {
        throw new Error("ขนาดไฟล์รูปภาพเกินกำหนดของเซิร์ฟเวอร์ (413) กรุณาลองส่งใหม่อีกครั้ง");
      }
      throw new Error(
        typeof answer?.detail === "string"
          ? answer.detail
          : typeof answer?.error === "string"
          ? answer.error
          : typeof answer?.message === "string"
          ? answer.message
          : "บันทึกไม่สำเร็จ"
      );
    }

    return answer as FeedbackSuccessResponse;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks whether backend feedback configuration is ready via GET /feedback-config.
 */
export async function checkFeedbackConfig(
  _apiUrl?: string
): Promise<{ configured: boolean; message?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("/api/hairfastgan/feedback-config", { signal: controller.signal });
    if (res.ok) {
      const data = await res.json();
      return { configured: !!data.configured, message: data.message };
    }
  } catch (e: any) {
    console.warn("Failed to check feedback config:", e);
  } finally {
    clearTimeout(timer);
  }
  return { configured: false };
}
