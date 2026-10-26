/**
 * Captures the current frame of the HTML5 video element without any overlays.
 * It corrects the horizontal mirror so the captured image has natural orientation.
 * Exports the image as a high-quality JPEG Blob.
 */
export function captureWebcamFrame(videoElement: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!videoElement || videoElement.readyState < 2) {
      reject(new Error("กล้องถ่ายภาพยังไม่พร้อมใช้งาน"));
      return;
    }

    const canvas = document.createElement("canvas");
    
    // Capture the video at its actual native resolution for high-quality GAN generation
    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 480;
    
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("ไม่สามารถเปิดใช้งานโมดูลวาดภาพได้"));
      return;
    }

    // Mirror horizontally so the captured photo matches the user's selfie / mirror preview exactly (ไม่สลับฝั่งหน้าเรา)
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, width, height);
    ctx.restore();

    // Export to JPEG with high quality (0.95)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("ไม่สามารถบันทึกข้อมูลภาพจากกล้องได้"));
        }
      },
      "image/jpeg",
      0.95
    );
  });
}

/**
 * Loads an image from a URL and extracts its average dominant hex color
 * using a 1x1 offscreen canvas.
 */
export function extractColorFromImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve("#8a8d8f"); // fallback
          return;
        }
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        // Convert to hex
        const hex = "#" + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + data[2]).toString(16).slice(1);
        resolve(hex);
      } catch (err) {
        console.warn("Failed to extract color from image, falling back:", err);
        resolve("#8a8d8f");
      }
    };
    img.onerror = () => {
      resolve("#8a8d8f");
    };
  });
}

/**
 * Converts any image URL (blob URL, web path, or object URL) to a permanent Base64 Data URL.
 * This ensures saved gallery snapshots remain static, immutable, and persistent in localStorage.
 */
export async function urlToDataUrl(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:image/")) return url;

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve((reader.result as string) || url);
      };
      reader.onerror = () => {
        resolve(url);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to convert URL to DataURL, using original:", e);
    return url;
  }
}

