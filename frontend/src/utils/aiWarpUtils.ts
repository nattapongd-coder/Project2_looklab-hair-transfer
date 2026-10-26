/**
 * Mathematical and Real-Time Affine Transformation Utilities
 * for Live AI Model Hairstyle Transfer onto Video Streams.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface AffineTransform2D {
  a: number; // m00
  b: number; // m10
  c: number; // m01
  d: number; // m11
  tx: number; // m02
  ty: number; // m12
  scale: number;
  rotation: number; // in radians
}

export interface FaceAlignmentStatus {
  isAligned: boolean;
  message: string;
  type: "success" | "warning" | "error";
  score: number; // 0 to 1
  centerOffset: { x: number; y: number };
  headTilt: number; // in degrees
  faceSizeRatio: number;
}

// MediaPipe 468/478 Landmark Indices for key anchors
export const KEY_ANCHOR_INDICES = [
  33,  // Left eye outer
  133, // Left eye inner
  263, // Right eye outer
  362, // Right eye inner
  4,   // Nose tip
  168, // Nose root / between eyes
  61,  // Mouth left corner
  291, // Mouth right corner
  152, // Chin bottom
  10,  // Forehead top / hairline
  127, // Left cheek / ear edge
  356, // Right cheek / ear edge
];

// MediaPipe landmark mirror pairing map (swaps left and right facial features when matching unmirrored video landmarks to mirrored selfie frame)
export const MIRROR_LANDMARK_MAP: Record<number, number> = {
  33: 263,  // Left eye outer <-> Right eye outer
  263: 33,  // Right eye outer <-> Left eye outer
  133: 362, // Left eye inner <-> Right eye inner
  362: 133, // Right eye inner <-> Left eye inner
  61: 291,  // Mouth left corner <-> Mouth right corner
  291: 61,  // Mouth right corner <-> Mouth left corner
  127: 356, // Left cheek <-> Right cheek
  356: 127, // Right cheek <-> Left cheek
  4: 4,     // Nose tip
  168: 168, // Nose bridge
  152: 152, // Chin bottom
  10: 10,   // Forehead top
};

/**
 * Extracts normalized 2D points from MediaPipe landmarks
 */
export function extractAnchorPoints(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  width = 1,
  height = 1
): Point2D[] {
  if (!landmarks || landmarks.length === 0) return [];
  return KEY_ANCHOR_INDICES.map((idx) => {
    const pt = landmarks[idx] || landmarks[0];
    return {
      x: pt.x * width,
      y: pt.y * height,
    };
  });
}

/**
 * Extracts anchor points on the mirrored selfie screen from raw video landmarks,
 * mapping left/right facial landmarks properly so they match the mirrored AI generated portrait
 * without any flipping or swapped face orientation.
 */
export function extractMirroredScreenAnchorPoints(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  width = 1,
  height = 1
): Point2D[] {
  if (!landmarks || landmarks.length === 0) return [];
  return KEY_ANCHOR_INDICES.map((idx) => {
    const mappedIdx = MIRROR_LANDMARK_MAP[idx] ?? idx;
    const pt = landmarks[mappedIdx] || landmarks[idx] || landmarks[0];
    return {
      x: (1 - pt.x) * width,
      y: pt.y * height,
    };
  });
}

/**
 * Computes 2D Partial Affine / Similarity Transformation (Least Squares)
 * Mapping srcPoints -> dstPoints
 * Formula: dst = [a c tx; b d ty] * [src; 1]
 * where a = s*cos(theta), b = s*sin(theta), c = -s*sin(theta), d = s*cos(theta)
 */
export function estimateSimilarityTransform(
  srcPoints: Point2D[],
  dstPoints: Point2D[]
): AffineTransform2D {
  const n = Math.min(srcPoints.length, dstPoints.length);
  if (n < 2) {
    return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0, scale: 1, rotation: 0 };
  }

  // 1. Calculate centroids
  let srcCx = 0;
  let srcCy = 0;
  let dstCx = 0;
  let dstCy = 0;

  for (let i = 0; i < n; i++) {
    srcCx += srcPoints[i].x;
    srcCy += srcPoints[i].y;
    dstCx += dstPoints[i].x;
    dstCy += dstPoints[i].y;
  }
  srcCx /= n;
  srcCy /= n;
  dstCx /= n;
  dstCy /= n;

  // 2. Center coordinates & accumulate covariance
  let dotProd = 0;
  let crossProd = 0;
  let srcVariance = 0;

  for (let i = 0; i < n; i++) {
    const sx = srcPoints[i].x - srcCx;
    const sy = srcPoints[i].y - srcCy;
    const dx = dstPoints[i].x - dstCx;
    const dy = dstPoints[i].y - dstCy;

    dotProd += sx * dx + sy * dy;
    crossProd += sx * dy - sy * dx;
    srcVariance += sx * sx + sy * sy;
  }

  if (srcVariance < 1e-6) {
    return {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      tx: dstCx - srcCx,
      ty: dstCy - srcCy,
      scale: 1,
      rotation: 0,
    };
  }

  // 3. Compute scale, rotation angle theta
  const a = dotProd / srcVariance;
  const b = crossProd / srcVariance;
  const scale = Math.sqrt(a * a + b * b);
  const rotation = Math.atan2(b, a);

  // 4. Compute translations tx, ty
  const c = -b;
  const d = a;
  const tx = dstCx - (a * srcCx + c * srcCy);
  const ty = dstCy - (b * srcCx + d * srcCy);

  return { a, b, c, d, tx, ty, scale, rotation };
}

/**
 * Exponential Moving Average (EMA) smoothing for transforms to eliminate camera noise & micro-jitter
 */
export function smoothTransform(
  prev: AffineTransform2D | null,
  curr: AffineTransform2D,
  alpha = 0.35
): AffineTransform2D {
  if (!prev) return curr;

  return {
    a: prev.a + alpha * (curr.a - prev.a),
    b: prev.b + alpha * (curr.b - prev.b),
    c: prev.c + alpha * (curr.c - prev.c),
    d: prev.d + alpha * (curr.d - prev.d),
    tx: prev.tx + alpha * (curr.tx - prev.tx),
    ty: prev.ty + alpha * (curr.ty - prev.ty),
    scale: prev.scale + alpha * (curr.scale - prev.scale),
    rotation: prev.rotation + alpha * (curr.rotation - prev.rotation),
  };
}

/**
 * Checks whether user's face is positioned correctly inside the oval guide
 */
export function checkFaceAlignment(
  landmarks: Array<{ x: number; y: number; z?: number }> | null
): FaceAlignmentStatus {
  if (!landmarks || landmarks.length < 10) {
    return {
      isAligned: false,
      message: "ไม่พบใบหน้า กรุณาให้ใบหน้าอยู่หน้ากล้อง",
      type: "error",
      score: 0,
      centerOffset: { x: 0, y: 0 },
      headTilt: 0,
      faceSizeRatio: 0,
    };
  }

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[4];
  const chin = landmarks[152];
  const forehead = landmarks[10];

  // Head tilt (roll in degrees)
  const dy = rightEye.y - leftEye.y;
  const dx = rightEye.x - leftEye.x;
  const tiltDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Face size
  const faceHeight = Math.abs(chin.y - forehead.y);
  const faceWidth = Math.abs(rightEye.x - leftEye.x) * 2.2;

  // Center offset relative to ideal target center (0.5, 0.42)
  const centerX = (leftEye.x + rightEye.x) / 2;
  const centerY = (forehead.y + chin.y) / 2;
  const offX = centerX - 0.5;
  const offY = centerY - 0.42;
  const distFromCenter = Math.sqrt(offX * offX + offY * offY);

  // Conditions
  const isCentered = distFromCenter < 0.12;
  const isSizeGood = faceHeight >= 0.22 && faceHeight <= 0.65;
  const isTooFar = faceHeight < 0.22;
  const isTooClose = faceHeight > 0.65;
  const isStraight = Math.abs(tiltDeg) < 14;

  let message = "พร้อมสำหรับสลับทรงผม";
  let type: "success" | "warning" | "error" = "success";
  let score = 1.0;

  if (isTooFar) {
    message = "ขยับเข้ามาใกล้กล้องอีกเล็กน้อย";
    type = "warning";
    score = 0.5;
  } else if (isTooClose) {
    message = "ขยับถอยห่างจากกล้องเล็กน้อย";
    type = "warning";
    score = 0.5;
  } else if (!isCentered) {
    message = "ขยับใบหน้าให้อยู่ตรงกลางกรอบ";
    type = "warning";
    score = 0.6;
  } else if (!isStraight) {
    message = "หันหน้าตรง ไม่เอียงศีรษะ";
    type = "warning";
    score = 0.7;
  }

  const isAligned = isCentered && isSizeGood && isStraight;

  return {
    isAligned,
    message,
    type,
    score,
    centerOffset: { x: offX, y: offY },
    headTilt: tiltDeg,
    faceSizeRatio: faceHeight,
  };
}

/**
 * Creates a soft-edged feathered portrait mask keeping the face and hairstyle 100% sharp and clear,
 * while softly feathering and blurring the outer background edges that are not the face and hairstyle,
 * so the portrait seamlessly dissolves and blends into the live camera stream without sharp rectangular borders.
 */
export function createFeatheredHeadMaskCanvas(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  landmarks?: Array<{ x: number; y: number }>,
  featherPx = 28
): HTMLCanvasElement {
  const width = sourceImage.width || 512;
  const height = sourceImage.height || 512;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. Draw source image onto canvas
  ctx.drawImage(sourceImage, 0, 0, width, height);

  // 2. Create alpha mask canvas for face & hairstyle isolation with feathered background edges
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const mCtx = mask.getContext("2d");
  if (!mCtx) return canvas;

  // Compute face and hairstyle center & boundary from landmarks
  let cx = width * 0.5;
  let cy = height * 0.46;
  let rx = width * 0.40;
  let ry = height * 0.46;

  if (landmarks && landmarks.length >= 10) {
    const leftCheek = landmarks[234] || landmarks[127] || landmarks[93];
    const rightCheek = landmarks[454] || landmarks[356] || landmarks[323];
    const forehead = landmarks[10] || landmarks[9] || landmarks[8];
    const chin = landmarks[152] || landmarks[175] || landmarks[148];

    if (leftCheek && rightCheek && forehead && chin) {
      cx = ((leftCheek.x + rightCheek.x) / 2) * width;
      const faceMidY = ((forehead.y + chin.y) / 2) * height;
      const faceW = Math.abs(rightCheek.x - leftCheek.x) * width;
      const faceH = Math.abs(chin.y - forehead.y) * height;

      // Include hairstyle volume (top, sides, and neck)
      cy = faceMidY - faceH * 0.06;
      rx = Math.max(faceW * 0.88, width * 0.36);
      ry = Math.max(faceH * 0.90, height * 0.42);
    }
  }

  // Draw smooth radial/elliptical gradient:
  // Core (face + hairstyle volume): 100% solid opacity across 94% of area
  // Outer perimeter (background boundary): เบลอนิดเดียวพอที่ขอบนอกสุด
  const maxR = Math.max(rx, ry);
  const grad = mCtx.createRadialGradient(cx, cy, maxR * 0.82, cx, cy, maxR);
  grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.92, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.97, "rgba(255, 255, 255, 0.65)");
  grad.addColorStop(1.0, "rgba(255, 255, 255, 0.0)");

  mCtx.save();
  mCtx.translate(cx, cy);
  mCtx.scale(rx / maxR, ry / maxR);
  mCtx.translate(-cx, -cy);
  mCtx.fillStyle = grad;
  mCtx.fillRect(0, 0, width * (maxR / rx), height * (maxR / ry));
  mCtx.restore();

  // Edge margin vignette: เบลอขอบเพียงเล็กน้อยที่ริมขอบบางๆ (2.5%) เพื่อให้กลืนพอดี
  const edgeMarginX = Math.max(6, Math.round(width * 0.025));
  const edgeMarginY = Math.max(6, Math.round(height * 0.025));

  mCtx.globalCompositeOperation = "destination-in";

  // Horizontal gradient mask
  const hGrad = mCtx.createLinearGradient(0, 0, width, 0);
  hGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  hGrad.addColorStop(edgeMarginX / width, "rgba(0, 0, 0, 1)");
  hGrad.addColorStop(1 - edgeMarginX / width, "rgba(0, 0, 0, 1)");
  hGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  mCtx.fillStyle = hGrad;
  mCtx.fillRect(0, 0, width, height);

  // Vertical gradient mask
  const vGrad = mCtx.createLinearGradient(0, 0, 0, height);
  vGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  vGrad.addColorStop(edgeMarginY / height, "rgba(0, 0, 0, 1)");
  vGrad.addColorStop(1 - edgeMarginY / height, "rgba(0, 0, 0, 1)");
  vGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  mCtx.fillStyle = vGrad;
  mCtx.fillRect(0, 0, width, height);

  // 3. Apply soft feathered mask to source image
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);

  return canvas;
}

