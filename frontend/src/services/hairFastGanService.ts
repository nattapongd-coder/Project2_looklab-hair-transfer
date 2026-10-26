import { sanitizeUserErrorMessage } from "../utils/sanitizeError";

/**
 * Create a synthetic portrait face with specific hair tint color on canvas
 * to guarantee HairFastGAN face detection succeeds for any custom color or swatch.
 */
function createTintedPortraitBlob(colorHexOrRgb: string, label: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.resolve(new Blob([], { type: "image/jpeg" }));
  }

  // Background
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, 512, 512);

  // Face oval
  ctx.fillStyle = "#fed7aa";
  ctx.beginPath();
  ctx.ellipse(256, 280, 110, 140, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes, nose, mouth landmarks for basic face detection
  ctx.fillStyle = "#7c2d12";
  ctx.beginPath();
  ctx.ellipse(215, 260, 12, 8, 0, 0, Math.PI * 2); // left eye
  ctx.ellipse(297, 260, 12, 8, 0, 0, Math.PI * 2); // right eye
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = "#431407";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(215, 245, 18, Math.PI * 1.1, Math.PI * 1.9);
  ctx.arc(297, 245, 18, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();

  // Nose
  ctx.fillStyle = "#ea580c";
  ctx.beginPath();
  ctx.arc(256, 290, 6, 0, Math.PI * 2);
  ctx.fill();

  // Lips
  ctx.fillStyle = "#e11d48";
  ctx.beginPath();
  ctx.ellipse(256, 330, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair region with user selected color
  ctx.fillStyle = colorHexOrRgb.startsWith("#") || colorHexOrRgb.startsWith("rgb") ? colorHexOrRgb : "#b45309";
  ctx.beginPath();
  // Hair crown / top volume
  ctx.ellipse(256, 195, 140, 95, 0, 0, Math.PI * 2);
  // Left hair flank
  ctx.ellipse(145, 270, 45, 90, 0, 0, Math.PI * 2);
  // Right hair flank
  ctx.ellipse(367, 270, 45, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  // Re-clip face to keep forehead clean
  ctx.fillStyle = "#fed7aa";
  ctx.beginPath();
  ctx.ellipse(256, 280, 100, 125, 0, 0, Math.PI * 2);
  ctx.fill();

  // Redraw face features on top
  ctx.fillStyle = "#7c2d12";
  ctx.beginPath();
  ctx.ellipse(215, 260, 12, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(297, 260, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ea580c";
  ctx.beginPath();
  ctx.arc(256, 290, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e11d48";
  ctx.beginPath();
  ctx.ellipse(256, 330, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || new Blob([], { type: "image/jpeg" }));
    }, "image/jpeg", 0.95);
  });
}

// ---------------------------------------------------------------------------
// Image preparation (speed): HairFastGAN aligns every face to 1024x1024, so sending
// multi-megabyte PNGs only wastes upload time (browser -> server -> RunPod).
// We re-encode inputs as high-quality JPEG and cache the prepared reference images.
// ---------------------------------------------------------------------------

const FACE_MAX_SIDE = 1600;
const REFERENCE_MAX_SIDE = 1408;
const JPEG_QUALITY = 0.92;
/** Files already JPEG, small enough and within the size limit are sent untouched. */
const PASS_THROUGH_BYTES = 700 * 1024;

async function decodeToDrawable(blob: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob);
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close?.() };
    } catch (_) {
      // fall back to <img>
    }
  }
  const url = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("อ่านไฟล์รูปภาพไม่ได้"));
    el.src = url;
  }).catch((e) => {
    URL.revokeObjectURL(url);
    throw e;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

/**
 * Downscale (if needed) and re-encode an image as JPEG for upload.
 * Returns the original blob if it is already a compact JPEG or if anything fails.
 */
export async function prepareImageForUpload(blob: Blob, maxSide: number): Promise<Blob> {
  if (!blob || blob.size === 0) return blob;
  let decoded: Awaited<ReturnType<typeof decodeToDrawable>> | null = null;
  try {
    decoded = await decodeToDrawable(blob);
    const { width, height } = decoded;
    if (!width || !height) return blob;

    const scale = Math.min(1, maxSide / Math.max(width, height));
    const isCompactJpeg = blob.type === "image/jpeg" && blob.size <= PASS_THROUGH_BYTES;
    if (scale === 1 && isCompactJpeg) return blob;

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.fillStyle = "#ffffff"; // JPEG has no alpha – flatten transparent PNGs on white
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(decoded.source, 0, 0, w, h);

    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!out || out.size === 0) return blob;
    // Keep whichever is smaller when no resize was needed
    return scale === 1 && out.size >= blob.size && blob.type.startsWith("image/") ? blob : out;
  } catch (err) {
    console.warn("prepareImageForUpload failed, sending original file:", err);
    return blob;
  } finally {
    decoded?.release();
  }
}

/** The last prepared face photo – trying several styles on the same photo skips re-encoding it. */
let lastPreparedFace: { key: string; blob: Promise<Blob> } | null = null;

async function blobFingerprint(blob: Blob): Promise<string> {
  const head = new Uint8Array(await blob.slice(0, 2048).arrayBuffer());
  const tail = new Uint8Array(await blob.slice(Math.max(0, blob.size - 2048)).arrayBuffer());
  let h = 2166136261;
  for (const arr of [head, tail]) {
    for (let i = 0; i < arr.length; i++) {
      h ^= arr[i];
      h = Math.imul(h, 16777619);
    }
  }
  return `${blob.size}:${blob.type}:${(h >>> 0).toString(16)}`;
}

async function prepareFaceCached(faceBlob: Blob): Promise<Blob> {
  const key = await blobFingerprint(faceBlob).catch(() => "");
  if (key && lastPreparedFace?.key === key) return lastPreparedFace.blob;
  const job = prepareImageForUpload(faceBlob, FACE_MAX_SIDE);
  if (key) lastPreparedFace = { key, blob: job };
  return job;
}

/** Start preparing a face photo in the background (call right after the user uploads it). */
export function warmFacePreparation(faceBlob: Blob | null | undefined): void {
  if (faceBlob && faceBlob.size > 0) prepareFaceCached(faceBlob).catch(() => {});
}

/** Prepared reference images (shape / color) keyed by path, reused across generations. */
const referenceCache = new Map<string, Promise<Blob>>();

async function fetchAssetBlob(path: string): Promise<Blob> {
  const response = await fetch(path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:") ? path : encodeURI(path), {
    headers: { Accept: "image/*, */*" },
  });
  if (!response.ok) {
    throw new Error(`Asset not found (HTTP ${response.status})`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/html")) {
    throw new Error("Returned HTML page instead of image asset");
  }
  const blob = await response.blob();
  if (blob.size > 0 && (blob.type.startsWith("image/") || blob.type === "" || blob.type === "application/octet-stream")) {
    return blob;
  }
  throw new Error("Invalid blob or empty content");
}

/**
 * Fetch a reference image as an upload-ready Blob, supporting direct hex codes, local assets, and fallbacks.
 */
async function fetchImageAsBlobWithFallback(path: string, fallbackText: string): Promise<Blob> {
  // If path is a hex color (e.g. #0284c5 from custom slider)
  if (path && path.startsWith("#")) {
    return createTintedPortraitBlob(path, fallbackText);
  }

  if (!path || path.trim() === "") {
    return createTintedPortraitBlob("#3b82f6", fallbackText);
  }

  const cacheable = !path.startsWith("blob:") && !path.startsWith("data:");
  if (cacheable && referenceCache.has(path)) {
    return referenceCache.get(path)!;
  }

  const job = (async () => {
    try {
      const raw = await fetchAssetBlob(path);
      return await prepareImageForUpload(raw, REFERENCE_MAX_SIDE);
    } catch (error) {
      console.warn(`Could not fetch asset at "${path}". Using fallback.`, error);
      if (cacheable) referenceCache.delete(path);

      // Try fallback to real human photo assets (boy.png / women.png)
      try {
        const lower = fallbackText.toLowerCase();
        const isMale = ["male", "two-block", "quiff", "comma", "pompadour"].some((k) => lower.includes(k));
        const fallbackUrl = isMale ? "/assets/example/boy.png" : "/assets/example/women.png";
        const fbBlob = await fetchAssetBlob(fallbackUrl);
        return await prepareImageForUpload(fbBlob, REFERENCE_MAX_SIDE);
      } catch (_) {}

      return createTintedPortraitBlob("#475569", fallbackText);
    }
  })();

  if (cacheable) referenceCache.set(path, job);
  return job;
}

/** Warm the reference cache in the background (e.g. when the user picks a style or color). */
export function prefetchReferenceImage(path?: string | null): void {
  if (!path || path === "original" || path.startsWith("#") || path.startsWith("blob:") || path.startsWith("data:")) return;
  fetchImageAsBlobWithFallback(path, path).catch(() => {});
}

let lastResultUrl: string | null = null;

/**
 * Normalizes user-entered URL for RunPod / GPU servers.
 */
export function normalizeRunPodUrl(rawInput?: string): string {
  let url = (rawInput || "").trim();
  if (!url) return "";

  // If user pasted bare RunPod endpoint ID (e.g. ritw4sqswbnv8j)
  if (/^[a-zA-Z0-9_-]{8,32}$/.test(url)) {
    return `https://${url}.api.runpod.ai`;
  }

  // Prepend https:// if protocol is missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  url = url.replace(/\/+$/, "");

  // If user copied RunPod serverless queue URL: https://api.runpod.ai/v2/{endpoint_id}(/...)
  const runpodQueueMatch = url.match(/^https?:\/\/api\.runpod\.ai\/v2\/([a-zA-Z0-9_-]+)(?:\/(?:runsync|run|health|status|ping))?\/?$/i);
  if (runpodQueueMatch) {
    const endpointId = runpodQueueMatch[1];
    return `https://${endpointId}.api.runpod.ai`;
  }

  // Strip trailing standard API paths
  url = url.replace(/\/(?:generate|ping|health|docs|runsync|run|openapi\.json)\/?$/i, "");
  url = url.replace(/\/+$/, "");

  return url;
}

export interface GenerateParams {
  faceBlob: Blob;
  shapeImagePath: string;
  colorImagePath: string;
  hairstyleId: string;
  colorId: string;
  sourceEndpoint?: "/generate" | "/refine" | "/hairfast-jobs";
  refineContext?: {
    previousResultUrl?: string;
    experimentId?: string;
  };
  /** Abort the request (e.g. when the user presses "cancel"). */
  signal?: AbortSignal;
}

export interface GenerationTiming {
  prepareMs: number;
  requestMs: number;
  displayMs: number;
  upstreamMs?: number;
  serverPostprocessMs?: number;
  uploadKb?: number;
}

export interface HairFastGenerationOutput {
  images: Record<string, string>; // result_key -> dataUrl
  primaryKey: string;
  primaryUrl: string;
  seed: number | null;
  mode: string;
  previewOnly: boolean;
  userWaitSeconds: number;
  sourceEndpoint: string;
  timing?: GenerationTiming;
}

const PRIMARY_KEY_PRIORITY = ["hairfast", "B24", "b24", "result", "output", "final", "generated_image", "image"];
const INPUT_IMAGE_KEYS = new Set(["face", "aligned", "input", "original", "source", "shape", "color"]);

function sniffMimeFromBase64(b64: string): string {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("UklGR")) return "image/webp";
  if (b64.startsWith("R0lGOD")) return "image/gif";
  return "image/png";
}

/** Turn a value from the server payload into a URL the browser can try to load. */
function toCandidateUrl(val: unknown): string | null {
  if (!val || typeof val !== "string") return null;
  const str = val.trim();
  if (!str) return null;

  if (str.startsWith("data:image/")) {
    const commaIdx = str.indexOf(",");
    if (commaIdx === -1) return null;
    return `${str.substring(0, commaIdx + 1)}${str.substring(commaIdx + 1).replace(/\s+/g, "")}`;
  }
  if (str.startsWith("blob:") || str.startsWith("/api/")) return str;

  if (/^https?:\/\//i.test(str) && str.length < 2048) {
    if (typeof window !== "undefined" && str.startsWith(window.location.origin)) return str;
    return `/api/hairfastgan/proxy-image?url=${encodeURIComponent(str)}`;
  }

  const cleanB64 = str.replace(/^["']|["']$/g, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (cleanB64.length > 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(cleanB64)) {
    return `data:${sniffMimeFromBase64(cleanB64)};base64,${cleanB64}`;
  }

  if ((str.startsWith("/") || str.startsWith("./") || /\.(png|jpe?g|webp|jfif|gif)(\?.*)?$/i.test(str)) && str.length < 2048) {
    return `/api/hairfastgan/proxy-image?url=${encodeURIComponent(str)}`;
  }
  return null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read failed")));
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Resolve true only if the browser can actually decode the image. */
function canDisplayImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Make sure a candidate result is a decodable, self-contained data URL
 * (the feedback form and downloads need data URLs, and a remote URL may expire).
 */
async function ensureDisplayableDataUrl(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    let dataUrl = url;
    if (!url.startsWith("data:")) {
      const res = await fetch(url, { signal, headers: { ...buildClientConfigHeaders(), Accept: "image/*" } });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.size || !(blob.type.startsWith("image/") || blob.type === "application/octet-stream")) return null;
      dataUrl = await blobToDataUrl(blob.type.startsWith("image/") ? blob : new Blob([blob], { type: "image/jpeg" }));
    }
    return (await canDisplayImage(dataUrl)) ? dataUrl : null;
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    return null;
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const err = new Error("ยกเลิกการประมวลผลแล้ว");
    err.name = "AbortError";
    throw err;
  }
}

/**
 * Executes hairstyle generation and returns full metadata including all image keys and elapsed wait time.
 */
export async function generateHairFastResultFull({
  faceBlob,
  shapeImagePath,
  colorImagePath,
  hairstyleId,
  colorId,
  sourceEndpoint = "/generate",
  refineContext,
  signal,
}: GenerateParams): Promise<HairFastGenerationOutput> {
  const timestamp = Date.now();
  // Start performance timing at the moment the user requested the generation
  const startTime = performance.now();

  const isOriginalShape =
    hairstyleId === "original_style" || hairstyleId === "original" || shapeImagePath === "original" || !shapeImagePath;
  const isOriginalColor =
    colorId === "original" || colorId === "natural_original" || colorImagePath === "original" || !colorImagePath;

  // Prepare face + reference images in parallel (references are cached after the first use)
  const preparedFacePromise = prepareFaceCached(faceBlob);
  const [preparedFace, preparedShape, preparedColor] = await Promise.all([
    preparedFacePromise,
    isOriginalShape
      ? preparedFacePromise
      : fetchImageAsBlobWithFallback(shapeImagePath, `Shape: ${hairstyleId.toUpperCase()}`),
    isOriginalColor
      ? preparedFacePromise
      : fetchImageAsBlobWithFallback(colorImagePath, `Color: ${colorId.toUpperCase()}`),
  ]);
  throwIfAborted(signal);
  const tPrepared = performance.now();

  console.log(`[HairFastGAN Service #${timestamp}] Sending (${sourceEndpoint})`, {
    hairstyleId,
    colorId,
    faceKB: Math.round(preparedFace.size / 1024),
    shapeKB: Math.round(preparedShape.size / 1024),
    colorKB: Math.round(preparedColor.size / 1024),
    originalFaceKB: Math.round(faceBlob.size / 1024),
  });

  const ext = (b: Blob) => (b.type === "image/png" ? "png" : b.type === "image/webp" ? "webp" : "jpg");
  const shapeFileName = isOriginalShape
    ? `shape_original_${timestamp}.${ext(preparedShape)}`
    : `shape_${hairstyleId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${timestamp}.${ext(preparedShape)}`;
  const colorFileName = isOriginalColor
    ? `color_original_${timestamp}.${ext(preparedColor)}`
    : `color_${colorId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${timestamp}.${ext(preparedColor)}`;

  const formData = new FormData();
  formData.append("face_image", preparedFace, `face_${timestamp}.${ext(preparedFace)}`);
  formData.append("shape_image", preparedShape, shapeFileName);
  formData.append("color_image", preparedColor, colorFileName);
  formData.append("hairstyle_id", hairstyleId);
  formData.append("color_id", colorId);
  formData.append("timestamp", String(timestamp));

  if (refineContext?.previousResultUrl) {
    formData.append("previous_result", refineContext.previousResultUrl);
  }
  if (refineContext?.experimentId) {
    formData.append("parent_experiment_id", refineContext.experimentId);
  }

  const reqHeaders = buildClientConfigHeaders();
  reqHeaders["Accept"] = "application/json, image/*, */*";

  // Route through the server, which adds the RunPod API key from .env
  const response = await fetch(`/api/hairfastgan/generate?_t=${timestamp}`, {
    method: "POST",
    headers: reqHeaders,
    body: formData,
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(sanitizeUserErrorMessage(describeApiError(response.status, text)));
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  let payload: any = {};
  if (contentType.includes("application/json")) {
    payload = await response.json();
    // Asynchronous job ticket (/hairfast-jobs): poll through the server proxy until completed
    if (payload?.job_id && !payload.images) {
      payload = await pollHairFastJob(payload.job_id, signal);
    }
  } else {
    // Binary image response
    const resultBlob = await response.blob();
    payload = { images: { hairfast: await blobToDataUrl(resultBlob) } };
  }
  throwIfAborted(signal);
  const tResponse = performance.now();

  // Collect candidate URLs
  const candidates: Record<string, string> = {};
  const rawImages = payload?.images;
  if (Array.isArray(rawImages)) {
    rawImages.forEach((v: unknown, i: number) => {
      const u = toCandidateUrl(v);
      if (u) candidates[i === 0 ? "hairfast" : `result_${i + 1}`] = u;
    });
  } else if (rawImages && typeof rawImages === "object") {
    for (const [k, v] of Object.entries(rawImages)) {
      const u = toCandidateUrl(v);
      if (u) candidates[k] = u;
    }
  }
  for (const k of PRIMARY_KEY_PRIORITY) {
    if (!candidates[k] && payload?.[k]) {
      const u = toCandidateUrl(payload[k]);
      if (u) candidates[k] = u;
    }
  }

  // Verify every image can really be decoded by the browser (in parallel) and drop broken ones
  const verifiedEntries = await Promise.all(
    Object.entries(candidates).map(async ([k, u]) => [k, await ensureDisplayableDataUrl(u, signal)] as const)
  );
  const imagesMap: Record<string, string> = {};
  for (const [k, u] of verifiedEntries) {
    if (u) imagesMap[k] = u;
  }
  const broken = verifiedEntries.filter(([, u]) => !u).map(([k]) => k);
  if (broken.length) console.warn("[HairFastGAN Service] Dropped undisplayable result images:", broken);

  const keys = Object.keys(imagesMap);
  if (keys.length === 0) {
    throw new Error(
      Object.keys(candidates).length > 0
        ? "ได้รับข้อมูลจากเซิร์ฟเวอร์แล้ว แต่ไฟล์รูปผลลัพธ์เสียหรือเปิดไม่ได้ กรุณาลองใหม่อีกครั้ง"
        : "เซิร์ฟเวอร์ส่งคืนข้อมูลแต่ไม่พบรูปภาพผลลัพธ์"
    );
  }

  // Primary key resolution: server hint -> priority list -> any non-input key -> first key
  const serverHint = typeof payload?.primary_key === "string" ? payload.primary_key : "";
  const primaryKey =
    (serverHint && imagesMap[serverHint] ? serverHint : "") ||
    PRIMARY_KEY_PRIORITY.find((k) => imagesMap[k]) ||
    keys.find((k) => !INPUT_IMAGE_KEYS.has(k)) ||
    keys[0];
  // (No "hairfast" alias copy: it made the same result appear twice in the questionnaire)

  const primaryUrl = imagesMap[primaryKey];

  // End performance timing when image is decoded and ready to display
  const endTime = performance.now();
  const userWaitSeconds = Math.max(0, Math.min(86400, Number(((endTime - startTime) / 1000).toFixed(2))));
  const serverTiming = payload?.timing || {};
  const timing: GenerationTiming = {
    prepareMs: Math.round(tPrepared - startTime),
    requestMs: Math.round(tResponse - tPrepared),
    displayMs: Math.round(endTime - tResponse),
    upstreamMs: typeof serverTiming.upstream_ms === "number" ? serverTiming.upstream_ms : undefined,
    serverPostprocessMs: typeof serverTiming.postprocess_ms === "number" ? serverTiming.postprocess_ms : undefined,
    uploadKb: typeof serverTiming.upload_kb === "number" ? serverTiming.upload_kb : undefined,
  };
  console.log("[HairFastGAN Service] Timing (ms):", timing, "total s:", userWaitSeconds);

  lastResultUrl = primaryUrl;

  return {
    images: imagesMap,
    primaryKey,
    primaryUrl,
    seed: typeof payload?.seed === "number" ? payload.seed : null,
    mode: typeof payload?.mode === "string" ? payload.mode : "hairfastgan",
    previewOnly: Boolean(payload?.preview_only),
    userWaitSeconds,
    sourceEndpoint,
    timing,
  };
}

/** Turn any error body (our JSON, a hosting platform's JSON/HTML page, plain text) into readable text. */
function describeApiError(status: number, text: string): string {
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch (_) {}

  const pick = (v: any): string => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v === "object") return pick(v.message) || pick(v.detail) || pick(v.error) || pick(v.code) || JSON.stringify(v).slice(0, 200);
    return String(v);
  };

  // The hosting platform answered instead of our server (e.g. Vercel: {"error":{"code":"NOT_FOUND"}})
  const platformCode = data?.error && typeof data.error === "object" ? String(data.error.code || "") : "";
  if (status === 404 && (platformCode === "NOT_FOUND" || /<html|<!doctype/i.test(text) || !text)) {
    return "ไม่พบ API สร้างภาพบนเซิร์ฟเวอร์ (404) – ส่วน backend ยังไม่ได้ถูก deploy (บน Vercel ต้องมีโฟลเดอร์ api/ และไฟล์ vercel.json)";
  }
  if (platformCode === "FUNCTION_INVOCATION_TIMEOUT" || status === 504) {
    return "เซิร์ฟเวอร์ใช้เวลานานเกินกำหนด (RunPod อาจกำลัง cold start) กรุณาลองใหม่อีกครั้ง";
  }
  if (platformCode === "FUNCTION_PAYLOAD_TOO_LARGE" || status === 413) {
    return "ไฟล์รูปมีขนาดใหญ่เกินกำหนดของเซิร์ฟเวอร์ กรุณาใช้รูปที่เล็กลง";
  }

  const msg = data ? pick(data.error) || pick(data.detail) || pick(data.message) : "";
  if (msg) return msg;
  if (text && !/<html|<!doctype/i.test(text)) return text.substring(0, 150);
  return `เกิดข้อผิดพลาดในการประมวลผลทรงผม (HTTP ${status})`;
}

/** All RunPod credentials stay on the server, so the browser sends no extra headers. */
function buildClientConfigHeaders(): Record<string, string> {
  return {};
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        const err = new Error("ยกเลิกการประมวลผลแล้ว");
        err.name = "AbortError";
        reject(err);
      },
      { once: true }
    );
  });

/**
 * Poll an async job from /hairfast-jobs through the server proxy (/api/hairfastgan/jobs/:id),
 * which adds credentials and normalizes the result images.
 */
async function pollHairFastJob(jobId: string, signal?: AbortSignal): Promise<any> {
  const maxAttempts = 120; // ~3 minutes
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(i < 10 ? 1000 : 2000, signal);
    try {
      const res = await fetch(`/api/hairfastgan/jobs/${encodeURIComponent(jobId)}`, {
        headers: buildClientConfigHeaders(),
        signal,
      });
      const data = await res.json().catch(() => null);
      if (!data) continue;
      if (data.status === "failed") {
        const jobErr = new Error(sanitizeUserErrorMessage(data.error || "การประมวลผลล้มเหลว"));
        jobErr.name = "JobFailedError";
        throw jobErr;
      }
      if (data.images && Object.keys(data.images).length > 0) {
        return data;
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || e?.name === "JobFailedError") throw e;
    }
  }
  throw new Error("หมดเวลารอผลลัพธ์จากคิวประมวลผล (Job Timeout)");
}

/**
 * Sends the captured face image and user-selected hairstyle & color references to the server proxy
 * and returns a Data URL for the resulting image (maintains backwards compatibility).
 */
export async function generateHairFastResult(params: GenerateParams): Promise<string> {
  const output = await generateHairFastResultFull(params);
  return output.primaryUrl;
}

/** Older versions saved the RunPod URL / API key in the browser. The key must not live there – remove it. */
function clearLegacyBrowserConfig(): void {
  try {
    localStorage.removeItem("hfar_hairfastgan_api_url");
    localStorage.removeItem("hfar_hairfastgan_api_token");
  } catch (_) {}
}
clearLegacyBrowserConfig();

/**
 * Checks whether the RunPod endpoint is configured on the server (.env).
 */
export async function checkHairFastGanConfig(): Promise<{ configured: boolean; apiUrl: string | null; hasToken?: boolean }> {
  try {
    const response = await fetch("/api/hairfastgan/config");
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error("Failed to check RunPod config", e);
  }
  return { configured: false, apiUrl: null, hasToken: false };
}

/**
 * The RunPod URL and keys are configured in .env on the server
 * (HAIRFASTGAN_API_URL, HAIRFASTGAN_API_TOKEN, RUNPOD_API_KEY). Kept for API compatibility:
 * returns the current server status and never stores anything in the browser.
 */
export async function updateHairFastGanConfig(
  _apiUrl?: string,
  _apiToken?: string
): Promise<{ configured: boolean; apiUrl: string | null; hasToken?: boolean }> {
  clearLegacyBrowserConfig();
  return checkHairFastGanConfig();
}
