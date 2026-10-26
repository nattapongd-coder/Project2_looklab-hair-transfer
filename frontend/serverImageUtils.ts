/**
 * Server-side helpers that turn whatever the HairFastGAN RunPod endpoint returns
 * (raw base64, data URL, URL-safe base64, absolute URL, relative file path, nested object)
 * into a VERIFIED, self-contained image data URL.
 *
 * Every image is checked by its magic bytes, so an HTML error page, a JSON string or a
 * truncated payload can never reach the browser as a "broken image" again.
 *
 * Only Node built-ins are used, so this file can be unit-tested without Express.
 */

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface DecodedImage {
  mime: ImageMime;
  buffer: Buffer;
}

/** Detect the real image type from the first bytes of a buffer. Returns null if it is not an image. */
export function sniffImageMime(buf: Uint8Array | null | undefined): ImageMime | null {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "image/webp";
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  return null;
}

/** Minimum believable size for an image file (anything smaller is truncated garbage). */
const MIN_IMAGE_BYTES = 64;

/**
 * Decode a base64 string (plain, data URL, URL-safe, with whitespace/quotes/missing padding)
 * and verify it is a real image.
 */
export function decodeBase64Image(input: string): DecodedImage | null {
  if (typeof input !== "string") return null;
  let str = input.trim().replace(/^["']|["']$/g, "");
  if (!str) return null;

  if (str.startsWith("data:")) {
    const commaIdx = str.indexOf(",");
    if (commaIdx === -1) return null;
    const header = str.substring(0, commaIdx);
    if (!/;base64$/i.test(header)) return null;
    str = str.substring(commaIdx + 1);
  }

  // Remove whitespace / escaped newlines, convert URL-safe alphabet, fix padding
  str = str.replace(/\\n|\\r|\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(str)) return null;
  const pad = str.length % 4;
  if (pad === 1) return null;
  if (pad > 0) str += "=".repeat(4 - pad);

  const buffer = Buffer.from(str, "base64");
  if (buffer.length < MIN_IMAGE_BYTES) return null;
  const mime = sniffImageMime(buffer);
  if (!mime) return null;
  return { mime, buffer };
}

export function toDataUrl(img: DecodedImage): string {
  return `data:${img.mime};base64,${img.buffer.toString("base64")}`;
}

/** Credentials for the RunPod endpoint (read from .env by server.ts). */
export interface UpstreamAuth {
  /** RunPod API key (rpa_...) sent as "Authorization: Bearer <key>" */
  authKey?: string;
  /** Token checked by the HairFastGAN app itself, sent as "x-api-key" */
  appToken?: string;
}

/** Headers for every request to the RunPod endpoint. */
export function buildUpstreamHeaders(auth?: UpstreamAuth, accept = "image/*, application/json, */*"): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "LOOKLAB-Studio/2.0",
    Accept: accept,
  };
  const authKey = auth?.authKey?.replace(/^Bearer\s+/i, "").trim();
  const appToken = auth?.appToken?.replace(/^Bearer\s+/i, "").trim();
  if (authKey) headers["Authorization"] = `Bearer ${authKey}`;
  if (appToken) headers["x-api-key"] = appToken;
  return headers;
}

/** Resolve relative paths against the backend base URL and rewrite container-internal hosts. */
export function resolveUpstreamUrl(raw: string, baseUrl: string): string {
  let fullUrl = raw.trim();
  if (!/^https?:\/\//i.test(fullUrl)) {
    fullUrl = `${baseUrl.replace(/\/+$/, "")}/${fullUrl.replace(/^\.?\/+/, "")}`;
    return fullUrl;
  }
  try {
    const parsed = new URL(fullUrl);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname.startsWith("100.64.")
    ) {
      const baseParsed = new URL(baseUrl);
      parsed.protocol = baseParsed.protocol;
      parsed.host = baseParsed.host;
      fullUrl = parsed.toString();
    }
  } catch {
    // keep as is
  }
  return fullUrl;
}

/** Download an image from the backend and verify its bytes. */
export async function fetchUpstreamImage(
  rawUrl: string,
  baseUrl: string,
  auth?: UpstreamAuth,
  timeoutMs = 30000
): Promise<DecodedImage | null> {
  const fullUrl = resolveUpstreamUrl(rawUrl, baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(fullUrl, {
      headers: buildUpstreamHeaders(auth, "image/*, */*"),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[ImageUtils] Upstream image HTTP ${res.status}: ${rawUrl}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = sniffImageMime(buffer);
    if (!mime || buffer.length < MIN_IMAGE_BYTES) {
      console.warn(
        `[ImageUtils] Upstream URL did not return an image (content-type: ${res.headers.get("content-type")}): ${rawUrl}`
      );
      return null;
    }
    return { mime, buffer };
  } catch (err: any) {
    console.warn(`[ImageUtils] Failed to fetch upstream image ${rawUrl}: ${err?.message || err}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeUrlOrPath(str: string): boolean {
  if (str.length > 2048) return false;
  if (/^https?:\/\//i.test(str)) return true;
  if (/\.(png|jpe?g|webp|jfif|gif)(\?.*)?$/i.test(str)) return true;
  return /^(\.?\/)?(results|outputs?|static|temp|tmp|files|images)\//i.test(str);
}

/**
 * Convert any image representation into a verified data URL.
 * Returns null when the value is not (or does not lead to) a real image.
 */
export async function normalizeToDataUrl(v: unknown, baseUrl: string, auth?: UpstreamAuth): Promise<string | null> {
  if (!v) return null;

  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const key of ["data", "b64", "base64", "image", "url", "path"]) {
      if (typeof o[key] === "string") {
        const r = await normalizeToDataUrl(o[key], baseUrl, auth);
        if (r) return r;
      }
    }
    return null;
  }

  if (typeof v !== "string") return null;
  const str = v.trim();
  if (!str) return null;

  // 1. Base64 / data URL (checked first: JPEG base64 starts with "/9j/" which looks like a path)
  const decoded = decodeBase64Image(str);
  if (decoded) return toDataUrl(decoded);

  // 2. URL or file path on the backend
  if (looksLikeUrlOrPath(str)) {
    const fetched = await fetchUpstreamImage(str, baseUrl, auth);
    if (fetched) return toDataUrl(fetched);
  }
  return null;
}

/** Keys that hold the INPUT images – never pick these as the "after" result while a real result exists. */
const INPUT_KEYS = new Set([
  "face", "aligned", "input", "original", "source", "shape", "color",
  "face_image", "shape_image", "color_image", "aligned_face",
]);

const PRIMARY_PRIORITY = [
  "hairfast", "B24", "b24", "result", "output", "final", "generated_image",
  "image", "image_url", "url", "diffusion", "raw_background",
];

export function pickPrimaryKey(images: Record<string, string>): string | null {
  for (const key of PRIMARY_PRIORITY) {
    if (images[key]) return key;
  }
  const nonInput = Object.keys(images).find((k) => !INPUT_KEYS.has(k));
  if (nonInput) return nonInput;
  return Object.keys(images)[0] || null;
}

const ROOT_SKIP_KEYS = new Set([
  "images", "seed", "mode", "preview_only", "status", "job_id", "id", "message", "detail",
  "error", "timing", "elapsed", "experiment_id", "hairstyle_id", "color_id", "timestamp",
]);

/**
 * Extract and verify every image contained in a backend JSON payload.
 * All conversions run in parallel. Image fields at the root are removed from the
 * returned payload so the same base64 is not sent to the browser twice.
 */
export async function normalizeResultJson(
  jsonData: Record<string, any>,
  baseUrl: string,
  auth?: UpstreamAuth
): Promise<{ payload: Record<string, any>; images: Record<string, string>; primaryKey: string | null; rejectedKeys: string[] }> {
  const candidates: Array<[string, unknown]> = [];

  if (jsonData.images) {
    if (Array.isArray(jsonData.images)) {
      jsonData.images.forEach((img: unknown, i: number) => {
        candidates.push([i === 0 ? "hairfast" : `result_${i + 1}`, img]);
      });
    } else if (typeof jsonData.images === "object") {
      for (const [k, v] of Object.entries(jsonData.images)) candidates.push([k, v]);
    } else if (typeof jsonData.images === "string") {
      candidates.push(["hairfast", jsonData.images]);
    }
  }

  const rootImageKeys: string[] = [];
  for (const [k, v] of Object.entries(jsonData)) {
    if (ROOT_SKIP_KEYS.has(k)) continue;
    if (candidates.some(([ck]) => ck === k)) continue;
    const isCandidate =
      PRIMARY_PRIORITY.includes(k) ||
      (typeof v === "string" && (v.startsWith("data:image/") || v.length > 300 || looksLikeUrlOrPath(v))) ||
      (v && typeof v === "object" && !Array.isArray(v) && ["data", "b64", "base64", "url"].some((x) => typeof (v as any)[x] === "string"));
    if (isCandidate) {
      candidates.push([k, v]);
      rootImageKeys.push(k);
    }
  }

  const results = await Promise.all(
    candidates.map(async ([k, v]) => [k, await normalizeToDataUrl(v, baseUrl, auth)] as const)
  );

  const images: Record<string, string> = {};
  const rejectedKeys: string[] = [];
  for (const [k, dataUrl] of results) {
    if (dataUrl) {
      if (!images[k]) images[k] = dataUrl;
    } else {
      rejectedKeys.push(k);
    }
  }

  // No "hairfast" alias copy here: duplicating a multi-MB base64 string doubles the response size.
  // The client resolves the primary image from primary_key.
  const primaryKey = pickPrimaryKey(images);

  const payload: Record<string, any> = { ...jsonData };
  for (const k of rootImageKeys) delete payload[k];
  payload.images = images;
  payload.primary_key = primaryKey;

  return { payload, images, primaryKey, rejectedKeys };
}

/**
 * Keep a JSON payload under maxBytes (Vercel Functions: 4.5 MB response limit).
 * Drops input images (face/aligned/...) first, then every image except the primary one.
 * Returns null if even the primary image alone is too large.
 */
export function trimPayloadForResponse<T extends Record<string, any>>(payload: T, maxBytes: number): T | null {
  const size = (p: unknown) => Buffer.byteLength(JSON.stringify(p));
  if (!Number.isFinite(maxBytes) || size(payload) <= maxBytes) return payload;
  const images: Record<string, string> = { ...(payload.images || {}) };
  const primary: string | null = payload.primary_key && images[payload.primary_key] ? payload.primary_key : pickPrimaryKey(images);

  for (const k of Object.keys(images)) {
    if (k !== primary && INPUT_KEYS.has(k)) delete images[k];
  }
  let next = { ...payload, images, primary_key: primary, trimmed: true } as T;
  if (size(next) <= maxBytes) return next;

  next = { ...payload, images: primary ? { [primary]: images[primary] } : {}, primary_key: primary, trimmed: true } as T;
  return size(next) <= maxBytes ? next : null;
}
