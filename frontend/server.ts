import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import {
  buildUpstreamHeaders,
  decodeBase64Image,
  fetchUpstreamImage,
  normalizeResultJson,
  sniffImageMime,
  type UpstreamAuth,
  trimPayloadForResponse,
} from "./serverImageUtils.ts";

// ---------------------------------------------------------------------------
// Environment loading (RunPod settings)
// Files are searched in the folder you run `npm run dev` from AND the folder of server.ts:
//   .env.local, .env, .env.txt (Windows often saves ".env" as ".env.txt")
// and, as a last resort, .env.example – only for variables that hold real values
// (not the "your-endpoint-id" / "rpa_xxxx" placeholders). Existing process env always wins.
// A report of what was found is printed at startup.
// ---------------------------------------------------------------------------
const ENV_KEYS = ["HAIRFASTGAN_API_URL", "RUNPOD_API_KEY", "HAIRFASTGAN_API_TOKEN"] as const;
const isPlaceholderValue = (v?: string) =>
  !v || /your-endpoint-id|rpa_x{6,}|^MY_[A-Z_]+$/i.test(v.trim());

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim(); // strip inline comment
    }
    out[m[1]] = value;
  }
  return out;
}

const envLoadReport: string[] = [];
(function loadEnvFiles() {
  const dirs = Array.from(
    new Set([process.cwd(), process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : process.cwd()])
  );
  const fromProcess = new Set(ENV_KEYS.filter((k) => !isPlaceholderValue(process.env[k])));
  for (const name of [".env.local", ".env", ".env.txt", ".env.example"]) {
    for (const dir of dirs) {
      const file = path.join(dir, name);
      if (!fs.existsSync(file)) continue;
      let parsed: Record<string, string> = {};
      try {
        parsed = parseEnvFile(fs.readFileSync(file, "utf-8"));
      } catch (e: any) {
        envLoadReport.push(`  ! cannot read ${file}: ${e?.message}`);
        continue;
      }
      const used: string[] = [];
      for (const [k, v] of Object.entries(parsed)) {
        if (name === ".env.example" && isPlaceholderValue(v)) continue; // never load template placeholders
        if (process.env[k] === undefined || (isPlaceholderValue(process.env[k]) && !isPlaceholderValue(v))) {
          process.env[k] = v;
          if ((ENV_KEYS as readonly string[]).includes(k)) used.push(k);
        }
      }
      envLoadReport.push(`  found ${file}${used.length ? ` -> ${used.join(", ")}` : ""}`);
      if (name === ".env.example" && used.length) {
        envLoadReport.push("  ! RunPod values were read from .env.example – please rename/copy it to .env");
      }
    }
  }
  if (fromProcess.size) envLoadReport.push(`  from system environment: ${[...fromProcess].join(", ")}`);
  if (!envLoadReport.some((l) => l.includes("found"))) {
    envLoadReport.push(`  no .env file found in: ${dirs.join(" , ")}`);
  }
})();

const app = express();
const PORT = 3000;

// Setup multer for parsing multipart/form-data
// Limit size to 10MB per file
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("ประเภทไฟล์ไม่ถูกต้อง ต้องเป็นไฟล์รูปภาพเท่านั้น"));
    }
  },
});

// Configure JSON parser for JSON bodies if needed
// On Vercel (Build Output API) every /api/* request is routed to one function as /api?__path=<rest>.
// Restore the original path so the Express routes below match exactly like they do locally.
app.use((req, _res, next) => {
  if (req.url.includes("__path=")) {
    const u = new URL(req.url, "http://localhost");
    const rest = u.searchParams.get("__path") || "";
    u.searchParams.delete("__path");
    const search = u.searchParams.toString();
    req.url = `/api/${rest.replace(/^\/+/, "")}${search ? `?${search}` : ""}`;
    (req as any).query = Object.fromEntries(u.searchParams.entries());
  }
  next();
});

app.use(express.json());

// Default fixed layout configurations requested for hair overlays (Locked on Backend)
const DEFAULT_HAIR_LAYOUTS: Record<string, { scaleX: number; scaleY: number; offsetX: number; offsetY: number; isFlipped?: boolean }> = {
  "two block": { scaleX: 2.1, scaleY: 1.65, offsetX: 0, offsetY: 0.02, isFlipped: true },
  "comma": { scaleX: 2.9, scaleY: 2.3, offsetX: 0.06, offsetY: 0.38, isFlipped: true },
  "korean long layered perm": { scaleX: 4.25, scaleY: 3.55, offsetX: 0.1, offsetY: 1.08, isFlipped: true },
  "korean short bob": { scaleX: 3, scaleY: 2.8, offsetX: 0, offsetY: 0.44, isFlipped: true },
  "modern quiff": { scaleX: 2.61, scaleY: 2.1, offsetX: 0, offsetY: 0.06, isFlipped: true },
  "pompadour": { scaleX: 2.65, scaleY: 2.05, offsetX: 0.05, offsetY: 0.18, isFlipped: true },
  "curtain": { scaleX: 2.45, scaleY: 1.8, offsetX: 0.12, offsetY: 0.22, isFlipped: true },
  "blunt bob": { scaleX: 3.05, scaleY: 2.25, offsetX: 0.08, offsetY: 0.46, isFlipped: true },
  "bob": { scaleX: 3.15, scaleY: 2.15, offsetX: 0.12, offsetY: 0.32, isFlipped: true },
  "build perm": { scaleX: 6, scaleY: 3.95, offsetX: 0, offsetY: 1.12, isFlipped: true },
};

const LAYOUT_CONFIG_FILE = path.join(process.cwd(), "layouts_config.json");

function getStoredLayouts() {
  try {
    if (fs.existsSync(LAYOUT_CONFIG_FILE)) {
      const content = fs.readFileSync(LAYOUT_CONFIG_FILE, "utf-8");
      return { ...DEFAULT_HAIR_LAYOUTS, ...JSON.parse(content) };
    }
  } catch (err) {
    console.warn("Could not read layouts_config.json, using defaults:", err);
  }
  return { ...DEFAULT_HAIR_LAYOUTS };
}

function saveStoredLayouts(data: Record<string, any>) {
  try {
    fs.writeFileSync(LAYOUT_CONFIG_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save layouts_config.json:", err);
  }
}

// Backend API: Get fixed/saved hairstyle layout configurations
app.get("/api/config/layouts", (req, res) => {
  const layouts = getStoredLayouts();
  res.json(layouts);
});

// Backend API: Save or update hairstyle layout configuration
app.post("/api/config/layouts", (req, res) => {
  const newLayouts = req.body;
  if (newLayouts && typeof newLayouts === "object") {
    const current = getStoredLayouts();
    const updated = { ...current, ...newLayouts };
    saveStoredLayouts(updated);
    return res.json({ success: true, layouts: updated });
  }
  res.status(400).json({ error: "ข้อมูลรูปแบบไม่ถูกต้อง" });
});

/**
 * Normalizes user-entered URL for RunPod / GPU servers.
 * Handles:
 * - RunPod Serverless load balancer: https://[ENDPOINT_ID].api.runpod.ai
 * - RunPod Serverless queue URL: https://api.runpod.ai/v2/[ENDPOINT_ID] -> converted to load balancer URL
 * - RunPod Pod proxy: https://[POD_ID]-80.proxy.runpod.net
 * - Raw endpoint ID: [ENDPOINT_ID] -> https://[ENDPOINT_ID].api.runpod.ai
 * - Strips trailing /generate, /ping, /health, /docs, /runsync, /run, /
 */
export function normalizeRunPodUrl(rawInput?: string): string {
  let url = (rawInput || "").trim();
  if (!url) return "";

  // If user pasted a bare RunPod endpoint/pod ID (e.g. ritw4sqswbnv8j or 8-30 alphanumeric chars)
  if (/^[a-zA-Z0-9_-]{8,32}$/.test(url)) {
    return `https://${url}.api.runpod.ai`;
  }

  // Prepend https:// if protocol is missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Clean trailing slashes
  url = url.replace(/\/+$/, "");

  // If user copied RunPod serverless queue URL: https://api.runpod.ai/v2/{endpoint_id}(/runsync|/run|/health)?
  // Convert it to RunPod load balancing URL: https://{endpoint_id}.api.runpod.ai
  const runpodQueueMatch = url.match(/^https?:\/\/api\.runpod\.ai\/v2\/([a-zA-Z0-9_-]+)(?:\/(?:runsync|run|health|status|ping))?\/?$/i);
  if (runpodQueueMatch) {
    const endpointId = runpodQueueMatch[1];
    return `https://${endpointId}.api.runpod.ai`;
  }

  // Strip trailing standard API paths so append /generate or /ping won't duplicate
  url = url.replace(/\/(?:generate|ping|health|docs|runsync|run|openapi\.json)\/?$/i, "");
  url = url.replace(/\/+$/, "");

  return url;
}

/**
 * RunPod configuration – read ONLY from .env / .env.local:
 *   HAIRFASTGAN_API_URL    RunPod endpoint, e.g. https://<ENDPOINT_ID>.api.runpod.ai
 *   RUNPOD_API_KEY         RunPod API key (rpa_...) -> "Authorization: Bearer <key>" (required by RunPod)
 *   HAIRFASTGAN_API_TOKEN  token checked by the HairFastGAN app itself -> "x-api-key: <token>"
 * If only one of the two keys is set, it is used for both headers.
 * Nothing is taken from the browser, so the API key never leaves the server.
 */
const isPlaceholder = isPlaceholderValue;
const envValue = (name: string) => {
  const v = (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
  return isPlaceholder(v) ? "" : v;
};

function getHairFastGanUrl(_req?: express.Request): string {
  return normalizeRunPodUrl(envValue("HAIRFASTGAN_API_URL"));
}

function getUpstreamAuth(): UpstreamAuth {
  const runpodKey = envValue("RUNPOD_API_KEY");
  const appToken = envValue("HAIRFASTGAN_API_TOKEN");
  return {
    authKey: runpodKey || appToken,
    appToken: appToken || runpodKey,
  };
}

/** Short, safe description of a URL for messages/logs (no query string). */
function describeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return url.split("?")[0];
  }
}

const NOT_CONFIGURED_MESSAGE =
  "ยังไม่ได้ตั้งค่า RunPod กรุณาใส่ HAIRFASTGAN_API_URL, RUNPOD_API_KEY (และ HAIRFASTGAN_API_TOKEN ถ้ามี) ในไฟล์ .env แล้วรีสตาร์ท npm run dev";

// 1. API: Report RunPod configuration status (values come from .env only)
app.get("/api/hairfastgan/config", (_req, res) => {
  const apiUrl = getHairFastGanUrl();
  const auth = getUpstreamAuth();
  res.json({
    configured: !!apiUrl,
    apiUrl: apiUrl || null,
    hasToken: !!auth.authKey,
    source: "env",
    runtime: process.env.VERCEL ? "vercel" : "node",
    env: Object.fromEntries(
      ENV_KEYS.map((k) => [k, envValue(k) ? "set" : process.env[k] ? "placeholder" : "missing"])
    ),
  });
});

// Warm-up: wake a RunPod worker as soon as someone opens the page, so the cold start
// (container start + model load, often 30-90 s) happens while the user is still choosing a photo/style.
let lastWarmupAt = 0;
app.get("/api/hairfastgan/warmup", async (_req, res) => {
  const apiUrl = getHairFastGanUrl();
  if (!apiUrl) return res.json({ ok: false, configured: false });
  // Many tabs / visitors may call this – one ping per 30 s is enough to keep the endpoint awake
  if (Date.now() - lastWarmupAt < 30000) return res.json({ ok: true, skipped: true });
  lastWarmupAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const started = Date.now();
  try {
    const r = await fetch(`${apiUrl.replace(/\/+$/, "")}/ping`, {
      headers: buildUpstreamHeaders(getUpstreamAuth(), "application/json, */*"),
      signal: controller.signal,
    });
    // 200 = worker warm and ready, 204 = worker started and still loading the model
    return res.json({ ok: r.ok, status: r.status, ready: r.status === 200, ms: Date.now() - started });
  } catch (e: any) {
    // Timing out here is normal during a cold start – the request has already woken the endpoint
    return res.json({ ok: false, waking: e?.name === "AbortError", ms: Date.now() - started });
  } finally {
    clearTimeout(timer);
  }
});

// The URL / keys can no longer be changed from the browser – they live in .env
app.post("/api/hairfastgan/config", (_req, res) => {
  const apiUrl = getHairFastGanUrl();
  res.json({
    success: false,
    configured: !!apiUrl,
    apiUrl: apiUrl || null,
    message: "การตั้งค่า RunPod อยู่ในไฟล์ .env (HAIRFASTGAN_API_URL, HAIRFASTGAN_API_TOKEN, RUNPOD_API_KEY)",
  });
});

// Test connection to the RunPod endpoint
app.get("/api/hairfastgan/health", async (_req, res) => {
  const apiUrl = getHairFastGanUrl();
  const auth = getUpstreamAuth();

  if (!apiUrl) {
    return res.status(200).json({ connected: false, isReady: false, message: NOT_CONFIGURED_MESSAGE });
  }

  const startTime = Date.now();
  const controller = new AbortController();
  // 25s timeout to allow cold-starting RunPod workers to acknowledge
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const headers = buildUpstreamHeaders(auth, "application/json, */*");
    const base = apiUrl.replace(/\/+$/, "");

    // /ping is the RunPod load-balancer health route (200 = ready, 204 = still initializing)
    let response: Response | null = null;
    let endpointTested = "/ping";
    for (const endpoint of ["/ping", "/health", ""]) {
      try {
        endpointTested = endpoint || "/";
        const r = await fetch(`${base}${endpoint}`, { method: "GET", headers, signal: controller.signal });
        response = r;
        if (r.status !== 404 && r.status !== 405) break;
      } catch (e: any) {
        if (e?.name === "AbortError") throw e;
      }
    }
    const latencyMs = Date.now() - startTime;

    if (!response) {
      return res.json({ connected: false, isReady: false, message: "ไม่สามารถเชื่อมต่อ RunPod ได้ (ไม่มีการตอบกลับ)", apiUrl });
    }

    const status = response.status;
    if (status === 200) {
      return res.json({
        connected: true, isReady: true, statusCode: 200, latencyMs, apiUrl, endpointTested,
        message: `เชื่อมต่อ RunPod สำเร็จ โมเดลพร้อมใช้งาน (${latencyMs}ms)`,
      });
    }
    if (status === 204) {
      return res.json({
        connected: true, isReady: false, statusCode: 204, latencyMs, apiUrl, endpointTested,
        message: "เชื่อมต่อ RunPod ได้แล้ว แต่ worker กำลังโหลดโมเดลเข้า GPU (204 Initializing) กรุณารอสักครู่แล้วลองใหม่",
      });
    }
    if (status === 401 || status === 403) {
      return res.json({
        connected: false, isReady: false, statusCode: status, latencyMs, apiUrl,
        message: `RunPod ปฏิเสธการยืนยันตัวตน (${status}) กรุณาตรวจสอบ RUNPOD_API_KEY ในไฟล์ .env`,
      });
    }
    if (status === 404) {
      return res.json({
        connected: false, isReady: false, statusCode: 404, latencyMs, apiUrl,
        message: `ไม่พบ endpoint บน RunPod (404) กรุณาตรวจสอบ HAIRFASTGAN_API_URL (รูปแบบ https://<ENDPOINT_ID>.api.runpod.ai)`,
      });
    }
    return res.json({
      connected: response.ok, isReady: response.ok, statusCode: status, latencyMs, apiUrl,
      message: `RunPod ตอบกลับด้วยรหัส HTTP ${status}`,
    });
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    return res.json({
      connected: false,
      isReady: false,
      apiUrl,
      message: isTimeout
        ? "หมดเวลารอ RunPod (25 วินาที) worker อาจกำลัง cold start กรุณาตรวจสอบใน RunPod Console"
        : `ไม่สามารถเชื่อมต่อ RunPod ได้: ${err?.message || "Connection failed"}`,
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

// 2. API: Generate hairstyle strictly using HairFastGAN backend
/** Vercel Functions can return at most 4.5 MB – keep a safety margin. No limit when self-hosted. */
const MAX_RESPONSE_BYTES = process.env.VERCEL ? 4_200_000 : Number.POSITIVE_INFINITY;
const GENERATE_TIMEOUT_MS = Number(process.env.HAIRFASTGAN_TIMEOUT_MS) || 180000;

/** Translate upstream error text into a friendly Thai message. */
function translateUpstreamError(status: number, rawMessage: string): string {
  let errorMessage = rawMessage || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ประมวลผล กรุณาลองใหม่อีกครั้ง";
  if (status === 401 || status === 403) {
    // Show what RunPod / the app actually said – it tells which key is wrong
    const detail = errorMessage && !/<html|<!doctype/i.test(errorMessage) ? ` [คำตอบจาก RunPod: ${errorMessage.substring(0, 160)}]` : "";
    const where = process.env.VERCEL ? "ใน Vercel → Settings → Environment Variables แล้ว Redeploy" : "ในไฟล์ .env แล้วรีสตาร์ท npm run dev";
    return `RunPod ปฏิเสธการยืนยันตัวตน (${status} Unauthorized) กรุณาตรวจสอบ RUNPOD_API_KEY / HAIRFASTGAN_API_TOKEN ${where}${detail}`;
  }
  if (status === 404) {
    return "ไม่พบ endpoint บน RunPod (404 Not Found) กรุณาตรวจสอบ HAIRFASTGAN_API_URL ในไฟล์ .env";
  }
  if (status === 502 || status === 503 || status === 504) {
    return `เซิร์ฟเวอร์ประมวลผลยังไม่พร้อมให้บริการ (HTTP ${status}) อาจกำลัง Cold-Start หรือดาวน์โหลด Checkpoint กรุณารอ 20-30 วินาทีแล้วลองใหม่อีกครั้ง`;
  }
  if (errorMessage.includes("No faces detected in the image 0")) {
    return "ไม่พบใบหน้าในรูปถ่ายของคุณ กรุณาหันหน้าตรงเข้าหากล้อง ให้เห็นใบหน้าชัดเจนและมีแสงสว่างเพียงพอ";
  }
  if (errorMessage.includes("No faces detected in the image 1")) {
    return "ไม่พบใบหน้าในภาพทรงผมอ้างอิง (Shape Image) กรุณาเลือกทรงผมอื่น";
  }
  if (errorMessage.includes("No faces detected in the image 2")) {
    return "ไม่พบใบหน้าในภาพสีผมอ้างอิง (Color Image) กรุณาเลือกสีผมอื่น";
  }
  if (errorMessage.includes("No faces detected")) {
    return "โมเดลตรวจไม่พบใบหน้าในภาพ กรุณาขยับหน้าให้อยู่กึ่งกลางกรอบและไม่ให้ผมหรือมือบดบังใบหน้า";
  }
  if (/<html|<!doctype/i.test(errorMessage)) {
    return `เซิร์ฟเวอร์ประมวลผลตอบกลับเป็นหน้าเว็บแทนผลลัพธ์ (HTTP ${status}) กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงานอยู่`;
  }
  return errorMessage.substring(0, 300);
}

/** Generate route per backend base URL, discovered from /openapi.json when "/generate" is 404. */
const discoveredGeneratePath = new Map<string, string>();

/**
 * Ask a FastAPI backend which routes it has (GET /openapi.json).
 * Returns the POST paths, or null if the document is not available.
 */
async function fetchOpenApiPostPaths(apiUrl: string, auth: UpstreamAuth): Promise<string[] | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const r = await fetch(`${apiUrl.replace(/\/+$/, "")}/openapi.json`, {
      headers: buildUpstreamHeaders(auth, "application/json"),
      signal: controller.signal,
    }).finally(() => clearTimeout(t));
    if (!r.ok) return null;
    const doc: any = await r.json();
    if (!doc?.paths || typeof doc.paths !== "object") return null;
    return Object.entries(doc.paths)
      .filter(([, ops]: [string, any]) => ops && typeof ops === "object" && ops.post)
      .map(([p]) => p);
  } catch {
    return null;
  }
}

/** Pick the most likely generation route from a list of POST paths. */
function pickGeneratePath(paths: string[]): string | null {
  const scored = paths
    .filter((p) => !/feedback|refine|jobs?\b|upload|login|token/i.test(p) && !p.includes("{"))
    .map((p) => ({
      p,
      score: (/generate/i.test(p) ? 3 : 0) + (/hair|swap|style|transfer|infer|predict|run/i.test(p) ? 2 : 0) - p.split("/").length * 0.1,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.p || null;
}

/** Read an error body exactly once (text), then try to parse JSON from it. */
async function readUpstreamError(response: Response): Promise<string> {
  let text = "";
  try {
    text = await response.text();
  } catch (_) {
    return "";
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed?.detail) return typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
    if (parsed?.error) return String(parsed.error);
    if (parsed?.message) return String(parsed.message);
  } catch (_) {}
  return text;
}

/**
 * Turn a successful upstream response (JSON or binary) into the JSON payload sent to the browser:
 * { images: { hairfast: "data:image/...", ... }, primary_key, seed, mode, preview_only, ... }
 * Throws an Error with a user-facing message if no displayable image is found.
 */
async function buildClientPayloadFromUpstream(
  response: Response,
  apiUrl: string,
  auth: UpstreamAuth
): Promise<Record<string, any>> {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  // Binary image (or octet-stream) response
  if (contentType.includes("image/") || contentType.includes("application/octet-stream")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const mime = sniffImageMime(buffer);
    if (!mime) {
      throw new Error("เซิร์ฟเวอร์ประมวลผลส่งไฟล์กลับมา แต่ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง (ไฟล์เสียหรือว่างเปล่า)");
    }
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    return {
      images: { hairfast: dataUrl },
      primary_key: "hairfast",
      seed: null,
      mode: "hairfastgan",
      preview_only: false,
    };
  }

  const text = await response.text();
  let jsonData: any = null;
  try {
    jsonData = JSON.parse(text);
  } catch (_) {
    // Some servers reply with a bare base64 string / data URL as text
    const decoded = decodeBase64Image(text);
    if (decoded) {
      return {
        images: { hairfast: `data:${decoded.mime};base64,${decoded.buffer.toString("base64")}` },
        primary_key: "hairfast",
        seed: null,
        mode: "hairfastgan",
        preview_only: false,
      };
    }
    if (contentType.includes("text/html") || /<html|<!doctype/i.test(text)) {
      throw new Error("RunPod ส่งคืนหน้าเว็บแทนผลลัพธ์รูปภาพ กรุณาตรวจสอบว่า worker กำลังรันแอป HairFastGAN อยู่ (ดู Logs ใน RunPod Console)");
    }
    throw new Error("เซิร์ฟเวอร์ประมวลผลส่งคืนข้อมูลประเภทอื่นที่ไม่ใช่รูปภาพ");
  }

  if (typeof jsonData === "string") {
    jsonData = { image: jsonData };
  }
  if (!jsonData || typeof jsonData !== "object") {
    throw new Error("เซิร์ฟเวอร์ประมวลผลส่งคืนข้อมูลที่ไม่ถูกต้อง");
  }

  // Asynchronous job ticket – the browser will poll /api/hairfastgan/jobs/:id
  if (jsonData.job_id && !jsonData.images && !jsonData.image && !jsonData.result) {
    return { job_id: jsonData.job_id, status: jsonData.status || "queued" };
  }

  if (jsonData.status === "failed" || (jsonData.error && !jsonData.images)) {
    throw new Error(translateUpstreamError(500, String(jsonData.error || jsonData.detail || "การประมวลผลล้มเหลว")));
  }

  const { payload, images, rejectedKeys } = await normalizeResultJson(jsonData, apiUrl, auth);
  if (Object.keys(images).length === 0) {
    console.warn(
      "[HairFastGAN] JSON returned without any valid image. Keys:",
      Object.keys(jsonData),
      "rejected:",
      rejectedKeys
    );
    throw new Error(
      "เซิร์ฟเวอร์ประมวลผลตอบกลับสำเร็จ แต่ไม่พบรูปภาพผลลัพธ์ที่เปิดได้ " +
        `(ได้รับฟิลด์: ${Object.keys(jsonData).slice(0, 8).join(", ") || "-"})`
    );
  }
  if (rejectedKeys.length > 0) {
    console.warn("[HairFastGAN] Ignored non-image / unreachable fields:", rejectedKeys);
  }
  return payload;
}

app.post(
  "/api/hairfastgan/generate",
  upload.fields([
    { name: "face_image", maxCount: 1 },
    { name: "shape_image", maxCount: 1 },
    { name: "color_image", maxCount: 1 },
  ]),
  async (req, res) => {
    const tStart = Date.now();
    try {
      const apiUrl = getHairFastGanUrl(req);
      if (!apiUrl || apiUrl.trim() === "") {
        return res.status(503).json({
          error: NOT_CONFIGURED_MESSAGE,
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const faceFile = files?.["face_image"]?.[0];
      const shapeFile = files?.["shape_image"]?.[0];
      const colorFile = files?.["color_image"]?.[0];

      if (!faceFile || !shapeFile || !colorFile) {
        return res.status(400).json({
          error: "กรุณาอัปโหลดไฟล์ให้ครบถ้วน: face_image, shape_image, and color_image",
        });
      }

      // Forward to HairFastGAN FastAPI backend
      const externalFormData = new FormData();
      const timestamp = Date.now();
      const toBlob = (f: Express.Multer.File) =>
        new Blob([new Uint8Array(f.buffer)], { type: f.mimetype || "image/jpeg" });

      externalFormData.append("face_image", toBlob(faceFile), faceFile.originalname || `face_${timestamp}.jpg`);
      externalFormData.append("shape_image", toBlob(shapeFile), shapeFile.originalname || `shape_${timestamp}.jpg`);
      externalFormData.append("color_image", toBlob(colorFile), colorFile.originalname || `color_${timestamp}.jpg`);

      if (req.body.hairstyle_id) externalFormData.append("hairstyle_id", req.body.hairstyle_id);
      if (req.body.color_id) externalFormData.append("color_id", req.body.color_id);
      if (req.body.timestamp) externalFormData.append("timestamp", req.body.timestamp);

      const auth = getUpstreamAuth();
      const headers = buildUpstreamHeaders(auth, "application/json, image/*, text/plain, */*");
      const generatePath = discoveredGeneratePath.get(apiUrl) || "/generate";
      const targetUrl = `${apiUrl.replace(/\/+$/, "")}${generatePath}`;

      const uploadBytes = faceFile.size + shapeFile.size + colorFile.size;
      console.log(
        `[HairFastGAN] -> ${describeUrl(apiUrl)}${generatePath} (upload ${(uploadBytes / 1024).toFixed(0)} KB, RunPod key: ${auth.authKey ? "yes" : "MISSING"})`
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);
      // Stop waiting for the upstream job if the browser cancels / disconnects
      const onClientClose = () => {
        if (!res.writableEnded) controller.abort();
      };
      res.on("close", onClientClose);

      let response: Response;
      try {
        // A dropped connection (worker restarting / being replaced after an env change) is retried once
        const isDroppedConnection = (e: any) => {
          const c = e?.code || e?.cause?.code || "";
          return (
            e?.name !== "AbortError" &&
            (["ECONNRESET", "UND_ERR_SOCKET", "UND_ERR_CLOSED", "EPIPE", "ECONNREFUSED"].includes(c) ||
              /other side closed|socket hang up|fetch failed/i.test(`${e?.message} ${e?.cause?.message}`))
          );
        };
        try {
          response = await fetch(targetUrl, { method: "POST", body: externalFormData, headers, signal: controller.signal });
        } catch (firstErr: any) {
          if (!isDroppedConnection(firstErr) || controller.signal.aborted) throw firstErr;
          console.warn(`[HairFastGAN] connection dropped (${firstErr?.cause?.code || firstErr?.cause?.message || firstErr?.message}) – retrying once in 5 s`);
          await new Promise((r) => setTimeout(r, 5000));
          response = await fetch(targetUrl, { method: "POST", body: externalFormData, headers, signal: controller.signal });
        }

        // 404: look up the real route in /openapi.json and retry once
        if (response.status === 404 && !discoveredGeneratePath.has(apiUrl)) {
          {
            const postPaths = await fetchOpenApiPostPaths(apiUrl, auth);
            const altPath = postPaths ? pickGeneratePath(postPaths) : null;
            if (altPath && altPath !== generatePath) {
              console.warn(`[HairFastGAN] ${generatePath} returned 404 – retrying with route from openapi.json: ${altPath}`);
              discoveredGeneratePath.set(apiUrl, altPath);
              response = await fetch(`${apiUrl.replace(/\/+$/, "")}${altPath}`, {
                method: "POST",
                body: externalFormData,
                headers,
                signal: controller.signal,
              });
            } else if (postPaths) {
              (req as any)._availablePostPaths = postPaths;
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
        res.off("close", onClientClose);
      }
      const tUpstream = Date.now();

      if (!response.ok) {
        const raw = await readUpstreamError(response);
        const status = response.status >= 400 ? response.status : 502;
        console.warn(`[HairFastGAN] Upstream HTTP ${response.status} from ${describeUrl(response.url || targetUrl)}: ${raw.substring(0, 300)}`);
        const where = describeUrl(apiUrl);

        if (status === 404) {
          const available: string[] | undefined = (req as any)._availablePostPaths;
          return res.status(404).json({
            error:
              `ไม่พบ Endpoint ${generatePath} ที่ ${where} (404 Not Found)` +
              (available && available.length
                ? ` เซิร์ฟเวอร์นี้มี POST route: ${available.slice(0, 6).join(", ")}`
                : " กรุณาตรวจสอบ HAIRFASTGAN_API_URL ใน .env (รูปแบบ https://<ENDPOINT_ID>.api.runpod.ai) และว่า endpoint ของ RunPod เป็นแบบ Load Balancer ที่มี route POST /generate"),
          });
        }
        return res.status(status).json({ error: translateUpstreamError(status, raw) });
      }

      let payload: Record<string, any>;
      try {
        payload = await buildClientPayloadFromUpstream(response, apiUrl, auth);
      } catch (e: any) {
        return res.status(502).json({ error: e?.message || "ไม่พบรูปภาพผลลัพธ์จากเซิร์ฟเวอร์ประมวลผล" });
      }
      const tDone = Date.now();

      const timing = {
        upstream_ms: tUpstream - tStart,
        postprocess_ms: tDone - tUpstream,
        total_server_ms: tDone - tStart,
        upload_kb: Math.round(uploadBytes / 1024),
      };
      console.log(
        `[HairFastGAN] <- done: upstream ${timing.upstream_ms} ms, post-process ${timing.postprocess_ms} ms, keys: ${Object.keys(
          payload.images || {}
        ).join(", ")}`
      );
      res.setHeader(
        "Server-Timing",
        `upstream;dur=${timing.upstream_ms}, postprocess;dur=${timing.postprocess_ms}`
      );
      res.setHeader("Cache-Control", "no-store");
      const fitted = trimPayloadForResponse({ ...payload, timing }, MAX_RESPONSE_BYTES);
      if (!fitted) {
        return res.status(502).json({ error: "รูปผลลัพธ์มีขนาดใหญ่เกินกว่าที่ส่งกลับได้ (จำกัด 4.5 MB บน Vercel) กรุณาให้ RunPod ส่งรูปเป็น JPEG" });
      }
      return res.json(fitted);
    } catch (error: any) {
      console.error("HairFastGAN integration error:", error);
      const code = error?.code || error?.cause?.code;

      if (error?.name === "AbortError" || error?.name === "TimeoutError" || code === "ETIMEDOUT" || code === "UND_ERR_HEADERS_TIMEOUT") {
        return res.status(504).json({
          error: `ระบบใช้เวลาประมวลผลนานเกินไป (เกิน ${Math.round(GENERATE_TIMEOUT_MS / 1000)} วินาที) เซิร์ฟเวอร์ GPU อาจกำลังเริ่มทำงาน กรุณาลองใหม่อีกครั้ง`,
        });
      }
      if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ECONNRESET" || /fetch failed/i.test(error?.message || "")) {
        const reason = String(error?.cause?.code || error?.cause?.message || error?.code || error?.message || "").substring(0, 80);
        const hint =
          code === "ENOTFOUND"
            ? "ไม่พบโดเมนของ endpoint – ตรวจสอบ HAIRFASTGAN_API_URL (Endpoint ID ถูกต้องหรือไม่)"
            : "RunPod ตัดการเชื่อมต่อกลางคัน – worker อาจกำลังรีสตาร์ทหรือเปลี่ยนชุดใหม่หลังแก้ค่า env/secret ให้รอจน worker ใน RunPod Console เป็นสถานะ Running/Idle แล้วลองใหม่";
        return res.status(502).json({
          error: `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ประมวลผลได้ (${reason}) ${hint}`,
        });
      }
      return res.status(500).json({
        error: "เกิดข้อผิดพลาดระหว่างสร้างภาพ กรุณาลองใหม่อีกครั้ง",
      });
    }
  }
);

// 2.02 API: Poll an asynchronous job (/hairfast-jobs/:id) through the server proxy
app.get("/api/hairfastgan/jobs/:jobId", async (req, res) => {
  try {
    const apiUrl = getHairFastGanUrl(req);
    if (!apiUrl) return res.status(503).json({ error: NOT_CONFIGURED_MESSAGE });
    const auth = getUpstreamAuth();
    const jobId = encodeURIComponent(String(req.params.jobId || ""));
    const targetUrl = `${apiUrl.replace(/\/+$/, "")}/hairfast-jobs/${jobId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch(targetUrl, {
        headers: buildUpstreamHeaders(auth, "application/json, image/*, */*"),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const raw = await readUpstreamError(response);
      return res.status(response.status).json({ error: translateUpstreamError(response.status, raw) });
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data?.status === "failed") {
        return res.json({ status: "failed", error: translateUpstreamError(500, String(data.error || data.detail || "")) });
      }
      const hasImages = data?.images || data?.image || data?.result || data?.B24 || data?.output;
      if (!hasImages && data?.status !== "completed") {
        return res.json({ status: data?.status || "running", progress: data?.progress ?? null });
      }
      const { payload, images } = await normalizeResultJson(data, apiUrl, auth);
      if (Object.keys(images).length === 0) {
        return res.json({ status: "failed", error: "งานประมวลผลเสร็จแล้ว แต่ไม่พบรูปภาพผลลัพธ์ที่เปิดได้" });
      }
      const fittedJob = trimPayloadForResponse({ ...payload, status: "completed" }, MAX_RESPONSE_BYTES);
      return fittedJob ? res.json(fittedJob) : res.json({ status: "failed", error: "รูปผลลัพธ์มีขนาดใหญ่เกินกว่าที่ส่งกลับได้" });
    }

    const payload = await buildClientPayloadFromUpstream(response, apiUrl, auth);
    return res.json({ ...payload, status: "completed" });
  } catch (err: any) {
    console.error("[Job poll error]", err);
    return res.status(502).json({ error: err?.message || "ตรวจสอบสถานะงานไม่สำเร็จ" });
  }
});

// 2.05 API: Secure upstream image proxy with RunPod credentials
app.get("/api/hairfastgan/proxy-image", async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send("Missing target image url parameter");
    }

    const apiUrl = getHairFastGanUrl(req);
    const auth = getUpstreamAuth();
    if (!apiUrl && !/^https?:\/\//i.test(rawUrl)) {
      return res.status(503).send("HairFastGAN server URL is not configured");
    }

    const img = await fetchUpstreamImage(rawUrl, apiUrl || rawUrl, auth);
    if (!img) {
      return res.status(502).send("Upstream did not return a valid image");
    }

    res.setHeader("Content-Type", img.mime);
    res.setHeader("Cache-Control", "private, max-age=86400");
    return res.send(img.buffer);
  } catch (err: any) {
    console.error("[Proxy-Image Error]", err);
    return res.status(500).send("Error streaming proxy image");
  }
});

// 2.1 API: Feedback proxy
app.post(
  "/api/hairfastgan/feedback",
  upload.fields([
    { name: "original_image", maxCount: 1 },
    { name: "result_image", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const apiUrl = getHairFastGanUrl(req);
      if (!apiUrl) {
        return res.status(503).json({ error: NOT_CONFIGURED_MESSAGE });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const metadata = req.body.metadata;

      const externalFormData = new FormData();
      if (metadata) externalFormData.append("metadata", metadata);

      const origFile = files?.["original_image"]?.[0];
      if (origFile) {
        externalFormData.append(
          "original_image",
          new Blob([new Uint8Array(origFile.buffer)], { type: origFile.mimetype || "image/png" }),
          origFile.originalname || "original.png"
        );
      }

      const resFile = files?.["result_image"]?.[0];
      if (resFile) {
        externalFormData.append(
          "result_image",
          new Blob([new Uint8Array(resFile.buffer)], { type: resFile.mimetype || "image/png" }),
          resFile.originalname || "result.png"
        );
      }

      const auth = getUpstreamAuth();
      const headers = buildUpstreamHeaders(auth, "application/json, */*");
      const targetUrl = `${apiUrl.replace(/\/+$/, "")}/feedback`;

      // RunPod (behind Cloudflare) answers 502/503/520-524 while a worker is cold-starting or was just
      // scaled down – common here because the user spends minutes filling the form after generating.
      // Retry a few times; the submission carries a fixed UUID so a retry cannot create a duplicate.
      const RETRYABLE = new Set([429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
      const waits = [0, 4000, 10000];
      let response: Response | null = null;
      let rawText = "";
      for (let attempt = 0; attempt < waits.length; attempt++) {
        if (waits[attempt]) await new Promise((r) => setTimeout(r, waits[attempt]));
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 90000);
        try {
          response = await fetch(targetUrl, { method: "POST", headers, body: externalFormData, signal: controller.signal });
          rawText = await response.text().catch(() => "");
        } catch (e: any) {
          response = null;
          rawText = e?.name === "AbortError" ? "timeout" : e?.message || "network error";
        } finally {
          clearTimeout(timer);
        }
        if (response && !RETRYABLE.has(response.status)) break;
        console.warn(
          `[Feedback] attempt ${attempt + 1}/${waits.length} -> ${response ? `HTTP ${response.status}` : rawText}: ${rawText.substring(0, 200)}`
        );
      }

      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (_) {}

      if (!response || !response.ok) {
        const status = response?.status || 502;
        const upstreamMsg =
          (data && (typeof data.detail === "string" ? data.detail : typeof data.error === "string" ? data.error : data.message)) ||
          rawText.substring(0, 200);
        console.warn(`[Feedback] failed HTTP ${status}: ${String(upstreamMsg).substring(0, 300)}`);

        let error: string;
        if (status === 409 || status === 413 || status === 422 || status === 400) {
          // Meaningful app-level answers (duplicate, too large, validation) – pass them through
          error = typeof upstreamMsg === "string" && upstreamMsg ? upstreamMsg : `ส่งแบบสอบถามไม่สำเร็จ (HTTP ${status})`;
        } else if (status === 404) {
          error = "เซิร์ฟเวอร์ RunPod ไม่มี route POST /feedback (404) – ต้องเพิ่ม route นี้ในแอป HairFastGAN บน RunPod";
        } else if (status === 401 || status === 403) {
          error = `RunPod ปฏิเสธการยืนยันตัวตน (${status}) – ตรวจสอบ RUNPOD_API_KEY / HAIRFASTGAN_API_TOKEN`;
        } else if (/cloudflare|origin web server|invalid or incomplete/i.test(String(upstreamMsg)) || status >= 520) {
          error =
            `RunPod worker ตอบกลับไม่สมบูรณ์ระหว่างบันทึกแบบสอบถาม (HTTP ${status}) – worker อาจกำลังเริ่มทำงานใหม่ ` +
            "หรือโค้ด /feedback บน RunPod เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง และดู Logs ของ worker ใน RunPod Console";
        } else if (!response) {
          error = `เชื่อมต่อ RunPod ไม่ได้ระหว่างส่งแบบสอบถาม (${rawText}) กรุณาลองใหม่อีกครั้ง`;
        } else {
          error = `ส่งแบบสอบถามไม่สำเร็จ (HTTP ${status})${upstreamMsg ? `: ${String(upstreamMsg).substring(0, 150)}` : ""}`;
        }
        return res.status(status >= 400 ? status : 502).json({ error, detail: error, upstream_status: status });
      }

      if (!data) {
        return res.status(502).json({ error: "RunPod ตอบกลับ /feedback ไม่ใช่ JSON", detail: "RunPod ตอบกลับ /feedback ไม่ใช่ JSON" });
      }
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error("Feedback proxy error:", err);
      return res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการส่งแบบสอบถาม" });
    }
  }
);

// 2.2 API: Feedback config proxy
app.get("/api/hairfastgan/feedback-config", async (req, res) => {
  try {
    const apiUrl = getHairFastGanUrl(req);
    if (!apiUrl) {
      return res.json({ configured: false });
    }
    const auth = getUpstreamAuth();
    const headers = buildUpstreamHeaders(auth, "application/json, */*");
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/feedback-config`, {
      method: "GET",
      headers,
    });
    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
    return res.status(response.status).json({ configured: false });
  } catch (e: any) {
    return res.json({ configured: false, error: e.message });
  }
});

// 3. API: Scan public assets folder to dynamically list hairstyles and colors
app.get("/api/assets", (req, res) => {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const overlayDir = path.join(publicDir, "assets", "overlay");
    const hairDir = fs.existsSync(path.join(publicDir, "assets", "hairs"))
      ? path.join(publicDir, "assets", "hairs")
      : path.join(publicDir, "assets", "hair");
    const colorDir = fs.existsSync(path.join(publicDir, "assets", "colors"))
      ? path.join(publicDir, "assets", "colors")
      : path.join(publicDir, "assets", "color");

    const overlays = fs.existsSync(overlayDir) ? fs.readdirSync(overlayDir) : [];
    const hairs = fs.existsSync(hairDir) ? fs.readdirSync(hairDir) : [];
    const colors = fs.existsSync(colorDir) ? fs.readdirSync(colorDir) : [];

    const isImage = (filename: string) => /\.(png|jpe?g|webp)$/i.test(filename);

    res.json({
      overlays: overlays.filter(isImage).sort(),
      hairs: hairs.filter(isImage).sort(),
      colors: colors.filter(isImage).sort(),
    });
  } catch (error: any) {
    console.error("Failed to scan assets directory:", error);
    res.status(500).json({ error: error.message });
  }
});

// Express Error Handler for multer/files
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "ขนาดไฟล์รูปภาพใหญ่เกินไป จำกัดไม่เกิน 10MB" });
    }
    return res.status(400).json({ error: `ข้อผิดพลาดในการอัปโหลด: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message || err });
  }
  next();
});

// Serve public assets directly with no-cache so newly uploaded files are immediately served
const publicDir = path.join(process.cwd(), "public");
const assetsDir = path.join(publicDir, "assets");
// Assets are revalidated with ETag/Last-Modified, so the browser re-uses its cached copy (304) instead of
// downloading the 2-3 MB reference images again for every generation, while new files still show up immediately.
const assetStaticOptions = { maxAge: "10m", etag: true, lastModified: true };
app.use("/assets", express.static(assetsDir, assetStaticOptions));
app.use("/public/assets", express.static(assetsDir, assetStaticOptions));
app.use(express.static(publicDir, assetStaticOptions));

// Serve frontend assets and pages (local / self-hosted only – on Vercel the frontend is static
// and this Express app runs as the Vercel Function in api/index.ts)
async function startServer() {
  // `npm start` runs the bundled server-dist/server.cjs → serve the built frontend from dist/
  const isProduction = process.env.NODE_ENV === "production" || /\.cjs$/.test(process.argv[1] || "");
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log("- Env files:");
    envLoadReport.forEach((l) => console.log(l));
    const activeUrl = getHairFastGanUrl();
    const activeAuth = getUpstreamAuth();
    const status = (k: string) =>
      envValue(k) ? "set" : process.env[k] ? "PLACEHOLDER (still the example value)" : "missing";
    console.log(
      activeUrl
        ? `- RunPod endpoint: ${describeUrl(activeUrl)}`
        : "- RunPod endpoint: NOT CONFIGURED"
    );
    for (const k of ENV_KEYS) console.log(`    ${k}: ${status(k)}`);
    if (!activeUrl) {
      console.warn("  ! Put HAIRFASTGAN_API_URL=https://<ENDPOINT_ID>.api.runpod.ai in a file named .env next to package.json, then restart");
    } else if (!activeAuth.authKey) {
      console.warn("  ! No RUNPOD_API_KEY / HAIRFASTGAN_API_TOKEN – RunPod will answer 401");
    }
    console.log(`- API config endpoint: http://localhost:${PORT}/api/hairfastgan/config`);
    console.log(`- API generate endpoint: http://localhost:${PORT}/api/hairfastgan/generate`);
  });
}

// On Vercel the app is exported as a serverless function (api/index.ts) instead of listening on a port
if (!process.env.VERCEL) {
  startServer();
}

export default app;
