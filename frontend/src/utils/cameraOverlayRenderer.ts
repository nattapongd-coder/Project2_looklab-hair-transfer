import { FaceAlignmentStatus } from "./aiWarpUtils";

export interface CameraOverlayRenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  status: FaceAlignmentStatus;
  isCountingDown: boolean;
  countdownRemainingSec: number;
  countdownDurationMs: number;
  countdownStartTimestamp: number | null;
  isGeneratingModelLive: boolean;
  inferenceTimeSec: number;
  isAiModelLoaded: boolean;
  isLiveAiWarpEnabled: boolean;
  flashOpacity: number;
  showAlignmentGuide?: boolean;
}

export function drawCameraOverlay(options: CameraOverlayRenderOptions): number {
  const {
    ctx,
    width: w,
    height: h,
    status,
    isCountingDown,
    countdownRemainingSec: remainingSec,
    countdownDurationMs,
    countdownStartTimestamp,
    isGeneratingModelLive,
    inferenceTimeSec,
    isAiModelLoaded,
    isLiveAiWarpEnabled,
    flashOpacity,
    showAlignmentGuide = true,
  } = options;

  // If alignment guide is disabled (โหมดอิสระ / หยุดจับเวลา), DO NOT draw the oval circle or darkening!
  if (!showAlignmentGuide) {
    if (flashOpacity > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, flashOpacity)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      return Math.max(0, flashOpacity - 0.08);
    }
    return 0;
  }

  // Strictly maintain human face anatomical proportion: width/height = 0.72 (height/width = 1.388)
  // Prevents oval stretching or distortion on PC (16:9), iPad (4:3), and mobile phones (9:16 / 3:4)
  const FACE_OVAL_RATIO = 0.72;

  // Inspect actual CSS container dimensions to calculate visible viewport slice
  const canvasElem = ctx.canvas;
  const clientW = canvasElem?.clientWidth || 0;
  const clientH = canvasElem?.clientHeight || 0;
  const containerAR = clientH > 0 && clientW > 0 ? clientW / clientH : 4 / 5;
  const canvasAR = w / h;

  let visibleW: number;
  let visibleH: number;

  if (canvasAR >= containerAR) {
    // Video is wider than display container (Desktop PC, iPad, or landscape webcam)
    visibleH = h;
    visibleW = h * containerAR;
  } else {
    // Video is taller than display container (Mobile portrait camera 9:16 vs 4:5 container)
    visibleW = w;
    visibleH = w / containerAR;
  }

  // Calculate visible slice origin in canvas pixel coordinates
  const visibleLeft = (w - visibleW) * 0.5;
  const visibleTop = (h - visibleH) * 0.5;

  // Center strictly in the visible viewport slice: horizontal center, 42% from visible top
  const cx = visibleLeft + visibleW * 0.5;
  const cy = visibleTop + visibleH * 0.42;

  // Calculate proportional face radii bounded by visible dimensions
  const ry = Math.min(visibleH * 0.28, (visibleW / FACE_OVAL_RATIO) * 0.28);
  const rx = ry * FACE_OVAL_RATIO;

  // Dynamic UI scale factor relative to a baseline visible height of 540px
  const uiScale = Math.max(0.65, visibleH / 540);

  const t = performance.now();
  // Smooth rhythmic pulse (0.0 to 1.0)
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.005);
  // Blinking cycle for AF indicators
  const blinkCycle = Math.floor(t / 400) % 2 === 0;
  // Subtle breathing scale
  const breath = 1 + 0.004 * Math.sin(t * 0.004);

  const effRx = rx * breath;
  const effRy = ry * breath;

  const elapsed = isCountingDown && countdownStartTimestamp
    ? performance.now() - countdownStartTimestamp
    : 0;
  const countdownProgress = isCountingDown
    ? Math.min(1.0, elapsed / countdownDurationMs)
    : 0;
  const digit = isCountingDown ? Math.min(5, Math.max(1, Math.ceil(remainingSec))) : null;

  ctx.save();

  // Color theme based on state:
  // Aligned: Modern Neon Emerald #00F293 / rgba(0, 242, 147, ...)
  // Counting down: Sky Blue #38BDF8 / rgba(56, 189, 248, ...)
  // Generating: Coral #F27D68 / rgba(242, 125, 104, ...)
  // Warning/Adjusting: Warm Amber #F59E0B / rgba(245, 158, 11, ...)
  const isAligned = status.isAligned;
  const themeRgb = isGeneratingModelLive
    ? "242, 125, 104"
    : isCountingDown
    ? "56, 189, 248"
    : isAligned
    ? "0, 242, 147"
    : "245, 158, 11";

  // ==========================================
  // 1. Subtle Dark Vignette Cutout (วงกลมเด่นชัดเจน ตัดขอบมืดนุ่มนวลรอบนอก)
  // ==========================================
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  // Cut out the inner oval so the face area remains clear and bright
  ctx.ellipse(cx, cy, effRx * 1.02, effRy * 1.02, 0, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();

  // ==========================================
  // 2. Prominent Biometric Face Circle / Oval Guide (วงกลมเด่นๆ ไร้กรอบสี่เหลี่ยม)
  // ==========================================
  ctx.save();
  ctx.translate(cx, cy);

  // Outer Rotating/Pulsing Dashed Halo Ring (วงแหวนประรอบนอกหมุนและกะพริบ)
  ctx.strokeStyle = `rgba(${themeRgb}, ${0.3 + 0.2 * pulse})`;
  ctx.lineWidth = Math.max(1.5, Math.round(2 * uiScale));
  ctx.setLineDash([Math.round(6 * uiScale), Math.round(6 * uiScale)]);
  ctx.lineDashOffset = -t * 0.018;
  ctx.beginPath();
  ctx.ellipse(0, 0, effRx + 8 * uiScale, effRy + 8 * uiScale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Main Prominent Neon Oval Ring (เส้นวงกลมคมชัด หนา เด่นชัดเจน)
  ctx.strokeStyle = `rgba(${themeRgb}, ${0.88 + 0.12 * pulse})`;
  ctx.lineWidth = Math.max(2.8, Math.round(3.8 * uiScale));
  ctx.shadowColor = `rgba(${themeRgb}, 0.85)`;
  ctx.shadowBlur = Math.round((8 + 6 * pulse) * uiScale);
  ctx.beginPath();
  ctx.ellipse(0, 0, effRx, effRy, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 4 Cardinal Aiming Ticks (เส้นเล็งขอบวงรี 4 ทิศ พอดีขอบ)
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + 0.3 * pulse})`;
  ctx.lineWidth = Math.max(1.4, Math.round(1.8 * uiScale));
  const tickSize = Math.round(7 * uiScale);

  // Top (Forehead guide tick)
  ctx.beginPath();
  ctx.moveTo(0, -effRy - tickSize * 0.6);
  ctx.lineTo(0, -effRy + tickSize * 0.6);
  ctx.stroke();

  // Bottom (Chin guide tick)
  ctx.beginPath();
  ctx.moveTo(0, effRy - tickSize * 0.6);
  ctx.lineTo(0, effRy + tickSize * 0.6);
  ctx.stroke();

  // Left & Right (Cheek ticks)
  const eyeLevelY = -effRy * 0.08;
  ctx.beginPath();
  ctx.moveTo(-effRx - tickSize * 0.6, eyeLevelY);
  ctx.lineTo(-effRx + tickSize * 0.6, eyeLevelY);
  ctx.moveTo(effRx - tickSize * 0.6, eyeLevelY);
  ctx.lineTo(effRx + tickSize * 0.6, eyeLevelY);
  ctx.stroke();

  // Subtle blinking chin accent dot (กระพริบเบาๆ ที่ริมขอบคาง)
  if (blinkCycle) {
    ctx.fillStyle = `rgba(${themeRgb}, 0.95)`;
    ctx.shadowColor = `rgb(${themeRgb})`;
    ctx.shadowBlur = Math.round(5 * uiScale);
    ctx.beginPath();
    ctx.arc(0, effRy, Math.max(2, Math.round(2.6 * uiScale)), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Smooth Glowing Countdown Progress Arc around the Oval
  if (isCountingDown) {
    ctx.setLineDash([]);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = Math.max(3, Math.round(5.5 * uiScale));
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = Math.round(12 * uiScale);
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      effRx + Math.round(5 * uiScale),
      effRy + Math.round(5 * uiScale),
      0,
      -Math.PI / 2,
      -Math.PI / 2 + countdownProgress * Math.PI * 2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Glowing / rotating progress arc around the oval when AI is generating
  if (isGeneratingModelLive) {
    const spinAngle = (t / 450) % (Math.PI * 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = "#F27D68";
    ctx.lineWidth = Math.max(3, Math.round(5.5 * uiScale));
    ctx.shadowColor = "#F27D68";
    ctx.shadowBlur = Math.round(14 * uiScale);
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      effRx + Math.round(5 * uiScale),
      effRy + Math.round(5 * uiScale),
      0,
      spinAngle,
      spinAngle + Math.PI * 1.2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Countdown Number in Center when counting down (5... 4... 3... 2... 1...)
  if (isCountingDown && digit !== null) {
    const fractionalPart = remainingSec % 1.0;
    const pulseScale = 1.0 + (fractionalPart * 0.15);
    const badgeR = Math.round(44 * pulseScale * uiScale);

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
    ctx.lineWidth = Math.max(2, Math.round(3 * uiScale));
    ctx.beginPath();
    ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(42 * pulseScale * uiScale)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = Math.round(8 * uiScale);
    ctx.fillText(String(digit), 0, -2 * uiScale);
    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.round(10.5 * uiScale)}px system-ui, sans-serif`;
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(`กำลังถ่ายภาพ ${remainingSec.toFixed(1)}s`, 0, badgeR + Math.round(15 * uiScale));
  }

  ctx.restore();

  // Camera Shutter Flash Effect
  let newFlashOpacity = flashOpacity;
  if (flashOpacity > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashOpacity})`;
    ctx.fillRect(0, 0, w, h);
    newFlashOpacity = Math.max(0, flashOpacity - 0.12);
  }

  ctx.restore();
  return newFlashOpacity;
}
