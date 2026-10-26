import { FaceTrackingData, FaceShapeType, FaceShapeAnalysisResult } from "../types";

/**
 * Detailed face shape reference definitions with styling and coloring recommendations
 */
export function getFaceShapeData(
  shape: FaceShapeType,
  lengthToWidthRatio = 1.35,
  foreheadToJawRatio = 1.2,
  cheekToJawRatio = 1.25
): FaceShapeAnalysisResult {
  switch (shape) {
    case "Round":
      return {
        shape: "Round",
        shapeNameThai: "รูปหน้ากลม (Round Face)",
        shapeNameEnglish: "Round Face Shape",
        description: "สัดส่วนความยาวและความกว้างใกล้เคียงกัน โหนกแก้มอิ่มเอิบ คางโค้งมนอย่างนุ่มนวล",
        keyFeatures: ["ความยาวและความกว้างใกล้เคียงกัน", "โหนกแก้มอิ่มเอิบได้สัดส่วน", "กรอบหน้าโค้งมนละมุน"],
        lengthToWidthRatio,
        foreheadToJawRatio,
        cheekToJawRatio,
        recommendedHairstyleIds: [
          "h01-long-waves-curtain-bangs",
          "h05-side-part-quiff",
          "h22-wavy-middle-part-lifted-fringe",
        ],
        recommendedColorIds: [
          "c04-ash-beige-blonde",
          "c02-caramel-brown",
          "c24-burgundy-wine-red",
        ],
        stylingTips: "เน้นทรงผมที่เพิ่มวอลลุ่มช่วงกระหม่อมด้านบน หรือหน้าม้าปัดเคอร์เทนยาวเลยโหนกแก้ม จะช่วยหลอกสายตาให้รูปหน้าดูเรียวยาวขึ้นทันที",
        colorTips: "แนะนำเฉดสีสว่างโทนหม่นหรือสีเข้มคมชัด (เช่น Ash Beige หรือ Deep Burgundy) เพื่อเพิ่มมิติมุมมองแนวลึกให้ใบหน้าดูมีมิติเพรียวขึ้น",
      };

    case "Square":
      return {
        shape: "Square",
        shapeNameThai: "รูปหน้าเหลี่ยม (Square Face)",
        shapeNameEnglish: "Square Face Shape",
        description: "สันกรามและกรามมีความคมชัด สัดส่วนหน้าผากและกรามกว้างใกล้เคียงกัน ให้ลุคคมเข้มมีพลัง",
        keyFeatures: ["สันกรามชัดคม", "หน้าผากและกรามกว้างสมดุล", "โครงหน้าชัดเจนมีเสน่ห์"],
        lengthToWidthRatio,
        foreheadToJawRatio,
        cheekToJawRatio,
        recommendedHairstyleIds: [
          "h02-curly-lob-curtain-bangs",
          "h26-medium-s-waves-curtain-bangs",
          "h21-short-wolf-cut-fringe",
        ],
        recommendedColorIds: [
          "c08-milk-tea-brown",
          "c07-dusty-rose-gold",
          "c25-smoky-blue-grey",
        ],
        stylingTips: "เน้นลอนคลื่นนุ่มนวล (Soft Waves / Lob) หรือเลเยอร์ซอยปลาย ช่วยพรางช่วงกรามให้แลดูละมุนอ่อนหวาน หลีกเลี่ยงบ็อบตัดตรงทื่อระดับคาง",
        colorTips: "แนะนำโทนน้ำตาลซอฟต์วอร์มอย่าง Caramel Brown, Milk Tea Brown หรือ Dusty Rose Gold ที่ช่วยเบลอเหลี่ยมมุมของใบหน้าให้อบอุ่นเป็นธรรมชาติ",
      };

    case "Heart":
      return {
        shape: "Heart",
        shapeNameThai: "รูปหน้ารูปหัวใจ (Heart Face)",
        shapeNameEnglish: "Heart Face Shape",
        description: "หน้าผากกว้าง โหนกแก้มสวยเด่น และคางเรียวแหลม สัดส่วนรูปหน้าหวานน่ารักสไตล์เกาหลี",
        keyFeatures: ["หน้าผากกว้างได้รูป", "โหนกแก้มยกสูงสวย", "คางเรียวแหลมมีเสน่ห์"],
        lengthToWidthRatio,
        foreheadToJawRatio,
        cheekToJawRatio,
        recommendedHairstyleIds: [
          "h03-side-part-wavy-bob",
          "h24-middle-part-wavy-lob",
          "h04-korean-curtain-hair",
        ],
        recommendedColorIds: [
          "c06-cherry-red",
          "c05-rose-pink",
          "c26-cream-blonde",
        ],
        stylingTips: "เหมาะกับทรงบ็อบประบ่าหรือล็อบดัดลอนที่มีวอลลุ่มช่วงปลายผมระดับคาง เพื่อช่วยเติมเต็มความสมดุลให้คางที่เรียวเล็ก",
        colorTips: "แนะนำเฉดสีสดใสขับผิวอย่าง Cherry Red, Rose Pink หรือ Cream Blonde ช่วยดึงความโดดเด่นน่ารักสดใสของดวงตาและรอยยิ้ม",
      };

    case "Diamond":
      return {
        shape: "Diamond",
        shapeNameThai: "รูปหน้ารูปเพชร (Diamond Face)",
        shapeNameEnglish: "Diamond Face Shape",
        description: "โหนกแก้มโดดเด่นเป็นจุดที่กว้างที่สุด ขณะที่หน้าผากและปลายคางเรียวแคบ สวยเฉี่ยวมีมิติ",
        keyFeatures: ["โหนกแก้มโดดเด่นมีมิติ", "หน้าผากและคางเรียวแคบ", "สันกรามเรียวเฉี่ยว"],
        lengthToWidthRatio,
        foreheadToJawRatio,
        cheekToJawRatio,
        recommendedHairstyleIds: [
          "h13-shoulder-length-flipped-layers",
          "h17-side-swept-hollywood-waves",
          "h23-textured-side-swept-quiff",
        ],
        recommendedColorIds: [
          "c13-violet-ash-grey",
          "c16-blue-silver-highlights",
          "c01-deep-teal",
        ],
        stylingTips: "เหมาะกับทรงสไลด์เลเยอร์ประบ่าหรือผมแสกข้างดัดลอนใหญ่ (Side Swept Waves) ช่วยบาลานซ์โหนกแก้มให้เรียวสวย",
        colorTips: "โทนสีคูลแอชพรีเมียมอย่าง Violet Ash Grey, Silver Blue หรือสีไฮไลท์ จะช่วยขับสันกระดูกแก้มให้ดูหรูหราคมคายระดับโมเดล",
      };

    case "Oblong":
      return {
        shape: "Oblong",
        shapeNameThai: "รูปหน้ายาว (Oblong / Long Face)",
        shapeNameEnglish: "Oblong Face Shape",
        description: "สัดส่วนความยาวใบหน้ามากกว่าความกว้าง เส้นกรอบหน้าขนานตรง ให้ลุคสง่างามหรูหรา",
        keyFeatures: ["ความยาวใบหน้ามากกว่าความกว้าง", "กรอบหน้าขนานตรง", "หน้าผากและคางได้รูปสมมาตร"],
        lengthToWidthRatio,
        foreheadToJawRatio,
        cheekToJawRatio,
        recommendedHairstyleIds: [
          "h06-straight-bob-see-through-bangs",
          "h20-short-blunt-bob-wispy-bangs",
          "h27-two-block-straight-fringe",
        ],
        recommendedColorIds: [
          "c02-caramel-brown",
          "c08-milk-tea-brown",
          "c10-brown-beige-highlights",
        ],
        stylingTips: "หน้าม้าซีทรูหรือหน้าม้าเต่อจะช่วยลดความยาวของใบหน้าอย่างลงตัว พร้อมเพิ่มวอลลุ่มดัดลอนด้านข้างเพื่อขยายมิติด้านกว้าง",
        colorTips: "แนะนำทำสีโทนน้ำตาลเบจพร้อมไฮไลท์ซอฟต์ๆ ช่วยดึงสายตาออกด้านข้าง ทำให้ใบหน้าดูสมดุลกลมกลืนยิ่งขึ้น",
      };

    case "Oval":
    default:
      return {
        shape: "Oval",
        shapeNameThai: "รูปหน้ารูปไข่ (Oval Face)",
        shapeNameEnglish: "Oval Face Shape",
        description: "สัดส่วนทองคำสมดุลอย่างเป็นธรรมชาติ หน้าผากกว้างกว่าคางเล็กน้อย เข้าได้กับทรงผมและสีผมแทบทุกสไตล์!",
        keyFeatures: ["สัดส่วนใบหน้าสมดุลสมบูรณ์แบบ", "เส้นกรอบหน้าโค้งมนกลมกล่อม", "เหมาะกับทรงผมเกือบทุกสไตล์"],
        lengthToWidthRatio,
        foreheadToJawRatio,
        cheekToJawRatio,
        recommendedHairstyleIds: [
          "h01-long-waves-curtain-bangs",
          "h04-korean-curtain-hair",
          "h26-medium-s-waves-curtain-bangs",
        ],
        recommendedColorIds: [
          "c02-caramel-brown",
          "c04-ash-beige-blonde",
          "c14-purple-pink-blue-highlights",
        ],
        stylingTips: "รูปหน้าไข่เปิดโอกาสให้คุณสนุกได้กับทุกทรง! ทั้งผมยาวดัดลอนธรรมชาติ, บ็อบสั้นเกาหลี, หรือผมเสยเท่ๆ สามารถตัดได้ตามใจชอบ",
        colorTips: "เข้ากับทุกโทนสี ไม่ว่าจะเป็นโทนธรรมชาติคลาสสิก (Caramel Brown, Milk Tea) หรือโทนแฟชั่นโดดเด่น (Ash Beige, Rose Gold)",
      };
  }
}

/**
 * Analyzes face shape based on MediaPipe 468/478 landmarks using biometric proportions
 */
export function analyzeFaceShape(
  landmarks: { x: number; y: number; z?: number }[]
): FaceShapeAnalysisResult {
  const foreheadTop = landmarks[10] || landmarks[151] || landmarks[9];
  const chin = landmarks[152] || landmarks[148] || landmarks[175];
  const leftCheek = landmarks[234] || landmarks[127] || landmarks[93];
  const rightCheek = landmarks[454] || landmarks[356] || landmarks[323];
  const leftForehead = landmarks[103] || landmarks[67] || landmarks[54];
  const rightForehead = landmarks[332] || landmarks[297] || landmarks[284];
  const leftJaw = landmarks[172] || landmarks[58] || landmarks[136];
  const rightJaw = landmarks[397] || landmarks[288] || landmarks[365];

  if (!foreheadTop || !chin || !leftCheek || !rightCheek) {
    return getFaceShapeData("Oval");
  }

  const faceLength = Math.hypot(chin.x - foreheadTop.x, chin.y - foreheadTop.y);
  const cheekWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
  const foreheadWidth = leftForehead && rightForehead
    ? Math.hypot(rightForehead.x - leftForehead.x, rightForehead.y - leftForehead.y)
    : cheekWidth * 0.85;
  const jawWidth = leftJaw && rightJaw
    ? Math.hypot(rightJaw.x - leftJaw.x, rightJaw.y - leftJaw.y)
    : cheekWidth * 0.75;

  const lengthToWidth = faceLength / Math.max(cheekWidth, 0.001);
  const foreheadToJaw = foreheadWidth / Math.max(jawWidth, 0.001);
  const cheekToJaw = cheekWidth / Math.max(jawWidth, 0.001);
  const cheekToForehead = cheekWidth / Math.max(foreheadWidth, 0.001);

  let shape: FaceShapeType = "Oval";

  if (lengthToWidth >= 1.48) {
    shape = "Oblong";
  } else if (cheekToJaw >= 1.25 && cheekToForehead >= 1.15) {
    shape = "Diamond";
  } else if (foreheadToJaw >= 1.26 && cheekToJaw >= 1.18) {
    shape = "Heart";
  } else if (lengthToWidth <= 1.22 && cheekToJaw >= 1.16) {
    shape = "Round";
  } else if (lengthToWidth <= 1.34 && cheekToJaw <= 1.18 && foreheadToJaw <= 1.18) {
    shape = "Square";
  } else {
    shape = "Oval";
  }

  return getFaceShapeData(shape, lengthToWidth, foreheadToJaw, cheekToJaw);
}

/**
 * Calculates face tracking metrics from MediaPipe Face Landmarker results
 */
export function processFaceLandmarks(
  landmarks: { x: number; y: number; z: number }[] | undefined,
  prevData: FaceTrackingData | null,
  lerpFactor = 0.25 // Smooth movement factor (0.1 to 0.3 is optimal)
): FaceTrackingData {
  if (!landmarks || landmarks.length === 0) {
    return {
      centerX: prevData ? prevData.centerX : 0.5,
      centerY: prevData ? prevData.centerY : 0.5,
      width: prevData ? prevData.width : 0.3,
      height: prevData ? prevData.height : 0.4,
      roll: prevData ? prevData.roll : 0,
      foreheadY: prevData ? prevData.foreheadY : 0.3,
      isFaceValid: false,
      message: "ไม่พบใบหน้า",
    };
  }

  // Key landmarks indices:
  // 4: Nose tip
  // 6: Nose bridge (between eyes)
  // 10: Forehead top center (hairline)
  // 152: Chin bottom center
  // 234: Left cheek boundary (outermost left edge of face)
  // 454: Right cheek boundary (outermost right edge of face)
  // 33: Left eye outer corner (viewer's right, but subject's left eye)
  // 263: Right eye outer corner (viewer's left, but subject's right eye)
  
  const noseTip = landmarks[4];
  const noseBridge = landmarks[6];
  const foreheadTop = landmarks[10];
  const chin = landmarks[152];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  if (!noseTip || !foreheadTop || !chin || !leftCheek || !rightCheek || !leftEye || !rightEye) {
    return {
      centerX: prevData ? prevData.centerX : 0.5,
      centerY: prevData ? prevData.centerY : 0.5,
      width: prevData ? prevData.width : 0.3,
      height: prevData ? prevData.height : 0.4,
      roll: prevData ? prevData.roll : 0,
      foreheadY: prevData ? prevData.foreheadY : 0.3,
      isFaceValid: false,
      message: "ไม่พบใบหน้า",
    };
  }

  // 1. Calculate center (approximate using middle of nose bridge / tip or bounding box)
  const targetCenterX = (leftCheek.x + rightCheek.x) / 2;
  const targetCenterY = (foreheadTop.y + chin.y) / 2;

  // 2. Calculate face dimensions (width and height)
  // Using Euclidean distance
  const targetWidth = Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y);
  const targetHeight = Math.hypot(foreheadTop.x - chin.x, foreheadTop.y - chin.y);

  // 3. Calculate forehead position (Y coordinate of landmark 10)
  const targetForeheadY = foreheadTop.y;

  // 4. Calculate head roll (tilt angle in degrees)
  // Calculate angle between left eye and right eye
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  let targetRoll = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Normalize roll so horizontal is 0
  if (targetRoll > 180) targetRoll -= 360;
  if (targetRoll < -180) targetRoll += 360;

  // 5. Interpolate (lerp) values to avoid jittering
  let centerX = targetCenterX;
  let centerY = targetCenterY;
  let width = targetWidth;
  let height = targetHeight;
  let roll = targetRoll;
  let foreheadY = targetForeheadY;

  if (prevData) {
    centerX = prevData.centerX + (targetCenterX - prevData.centerX) * lerpFactor;
    centerY = prevData.centerY + (targetCenterY - prevData.centerY) * lerpFactor;
    width = prevData.width + (targetWidth - prevData.width) * lerpFactor;
    height = prevData.height + (targetHeight - prevData.height) * lerpFactor;
    
    // Smooth angle interpolation (avoid 360 wrap-around jumps)
    let rollDiff = targetRoll - prevData.roll;
    if (rollDiff > 180) rollDiff -= 360;
    if (rollDiff < -180) rollDiff += 360;
    roll = prevData.roll + rollDiff * lerpFactor;
    
    foreheadY = prevData.foreheadY + (targetForeheadY - prevData.foreheadY) * lerpFactor;
  }

  // 6. Validation and message calculation
  let isFaceValid = true;
  let message = "พร้อมสร้างภาพทรงผม";

  // Check centering (expanded framing tolerance: 0.15 to 0.85 horizontally, 0.15 to 0.85 vertically)
  if (centerX < 0.15 || centerX > 0.85 || centerY < 0.15 || centerY > 0.85) {
    isFaceValid = false;
    message = "กรุณาจัดใบหน้าให้อยู่ในกรอบ";
  } 
  // Check face distance (width) with wider detection radius
  // Normalized width allowed between 0.12 and 0.75
  else if (width < 0.12) {
    isFaceValid = false;
    message = "กรุณาเข้ามาใกล้อีกเล็กน้อย";
  } else if (width > 0.75) {
    isFaceValid = false;
    message = "กรุณาถอยออกเล็กน้อย";
  }
  // Check if head is looking straight with wider tolerance
  else {
    const distLeft = Math.abs(noseBridge.x - leftCheek.x);
    const distRight = Math.abs(rightCheek.x - noseBridge.x);
    const yawRatio = distLeft / (distRight || 0.001);

    if (yawRatio < 0.4 || yawRatio > 2.2 || Math.abs(roll) > 25) {
      isFaceValid = false;
      message = "กรุณาหันหน้าตรง";
    }
  }

  const shapeAnalysis = analyzeFaceShape(landmarks);

  return {
    centerX,
    centerY,
    width,
    height,
    roll,
    foreheadY,
    isFaceValid,
    message,
    faceShape: shapeAnalysis.shape,
    shapeAnalysis,
  };
}

/**
 * Creates an aligned, cropped square face image (FFHQ standard format 512x512)
 * matching HairFastGAN's aligned face output for 1:1 Before/After comparisons
 */
export function createAlignedFaceImage(
  img: HTMLImageElement,
  landmarks?: { x: number; y: number; z?: number }[] | null,
  fallbackTracking?: FaceTrackingData | null,
  outputSize = 512
): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return img.src;

    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    if (!imgW || !imgH) return img.src;

    // Fill background with black or neutral dark
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, outputSize, outputSize);

    if (landmarks && landmarks.length >= 300) {
      // 33, 133: Left eye (viewer's left)
      // 263, 362: Right eye (viewer's right)
      const l1 = landmarks[33] || landmarks[133];
      const l2 = landmarks[133] || landmarks[33];
      const r1 = landmarks[263] || landmarks[362];
      const r2 = landmarks[362] || landmarks[263];

      const lx = ((l1.x + l2.x) / 2) * imgW;
      const ly = ((l1.y + l2.y) / 2) * imgH;
      const rx = ((r1.x + r2.x) / 2) * imgW;
      const ry = ((r1.y + r2.y) / 2) * imgH;

      const eyeCenterX = (lx + rx) / 2;
      const eyeCenterY = (ly + ry) / 2;
      const dx = rx - lx;
      const dy = ry - ly;
      const eyeDist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // FFHQ alignment standard:
      // Eye level in output: ~46% from top
      // Eye distance in output: ~27% of output size (~138px in 512x512)
      const targetEyeCenter = { x: outputSize * 0.5, y: outputSize * 0.46 };
      const targetEyeDist = outputSize * 0.27;
      const scale = targetEyeDist / Math.max(eyeDist, 10);

      ctx.save();
      ctx.translate(targetEyeCenter.x, targetEyeCenter.y);
      ctx.rotate(-angle);
      ctx.scale(scale, scale);
      ctx.translate(-eyeCenterX, -eyeCenterY);
      ctx.drawImage(img, 0, 0, imgW, imgH);
      ctx.restore();

      return canvas.toDataURL("image/jpeg", 0.95);
    } else if (fallbackTracking && fallbackTracking.isFaceValid) {
      const cx = fallbackTracking.centerX * imgW;
      const cy = fallbackTracking.centerY * imgH;
      const faceW = fallbackTracking.width * imgW;
      const faceH = fallbackTracking.height * imgH;
      const faceSize = Math.max(faceW, faceH);
      const cropSize = faceSize * 2.2;
      const angle = (fallbackTracking.roll || 0) * (Math.PI / 180);

      const targetEyeCenter = { x: outputSize * 0.5, y: outputSize * 0.46 };
      const scale = outputSize / Math.max(cropSize, 20);

      ctx.save();
      ctx.translate(targetEyeCenter.x, targetEyeCenter.y);
      ctx.rotate(-angle);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      ctx.drawImage(img, 0, 0, imgW, imgH);
      ctx.restore();

      return canvas.toDataURL("image/jpeg", 0.95);
    }

    // Fallback: center square crop
    const minDim = Math.min(imgW, imgH);
    const sx = (imgW - minDim) / 2;
    const sy = (imgH - minDim) / 2;
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, outputSize, outputSize);
    return canvas.toDataURL("image/jpeg", 0.95);
  } catch (err) {
    console.error("Failed to generate aligned face image:", err);
    return img.src;
  }
}
