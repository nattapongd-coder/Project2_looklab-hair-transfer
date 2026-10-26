import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Hairstyle, HairColor, FaceTrackingData } from "../types";
import CameraView from "./CameraView";
import ImageUploadView from "./ImageUploadView";
import { AlertCircle, Settings } from "lucide-react";

export interface TryOnStageHandle {
  downloadPhoto: (withWatermark?: boolean) => void;
  downloadLiveSnapshot?: (withWatermark?: boolean) => void;
  clearPhoto: () => void;
}

interface TryOnStageProps {
  sourceMode: "camera" | "upload";
  setSourceMode: (mode: "camera" | "upload") => void;
  selectedHairstyle: Hairstyle | null;
  selectedColor: HairColor | null;
  onFaceTracked: (data: FaceTrackingData) => void;
  onCaptureReady: (videoElement: HTMLVideoElement | null) => void;
  onError: (message: string) => void;
  isGenerating: boolean;
  elapsedSec?: number;
  onGenerateAi: (mode?: "camera" | "upload") => void;
  uploadedImage: string | null;
  onImageUpload: (dataUrl: string) => void;
  onImageSelected?: (file: Blob | null) => void;
  onClearImage: () => void;
  uploadAiResultImage: string | null;
  onClearUploadAiResult?: () => void;
  cameraAiResultImage?: string | null;
  onClearCameraAiResult?: () => void;
  onRequestAiGenerate?: (
    faceBlob: Blob,
    explicitStyle?: Hairstyle | null,
    explicitColor?: HairColor | null
  ) => Promise<string | null>;
  onGeneratingLiveChange?: (isGenerating: boolean) => void;
  includeWatermark?: boolean;
  onToggleWatermark?: () => void;
  savedPreviousImage?: string | null;
  onSelectHairstyle?: (style: Hairstyle) => void;
  onSelectColor?: (color: HairColor) => void;
}

const TryOnStage = forwardRef<TryOnStageHandle, TryOnStageProps>(function TryOnStage(
  {
    sourceMode,
    setSourceMode,
    selectedHairstyle,
    selectedColor,
    onFaceTracked,
    onCaptureReady,
    onError,
    isGenerating,
    elapsedSec,
    onGenerateAi,
    uploadedImage,
    onImageUpload,
    onImageSelected,
    onClearImage,
    uploadAiResultImage,
    onClearUploadAiResult,
    cameraAiResultImage,
    onClearCameraAiResult,
    onRequestAiGenerate,
    onGeneratingLiveChange,
    includeWatermark = true,
    onToggleWatermark,
    savedPreviousImage,
    onSelectHairstyle,
    onSelectColor,
  },
  ref
) {
  const [isCameraUserEnabled, setIsCameraUserEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("hfar_camera_user_enabled") === "true";
    } catch {
      return false;
    }
  });

  const cleanSnapshotFnRef = useRef<(() => void) | null>(null);
  const modelDownloadFnRef = useRef<(() => void) | null>(null);

  const handleCameraToggle = (active: boolean) => {
    setIsCameraUserEnabled(active);
    try {
      if (active) {
        localStorage.setItem("hfar_camera_user_enabled", "true");
      } else {
        localStorage.removeItem("hfar_camera_user_enabled");
      }
    } catch (e) {}
  };

  const drawWatermarkOnCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    const fontSize = Math.max(14, Math.round(w * 0.03));
    ctx.font = `600 ${fontSize}px "Bodoni Moda", "Cormorant Garamond", "Cinzel", "Playfair Display", Georgia, serif`;
    try {
      ctx.letterSpacing = "0.28em";
    } catch (e) {}
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText("LOOKLAB", w - 24, h - 22);
    ctx.restore();
  };

  const downloadCanvas = (canvas: HTMLCanvasElement) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const hairName = selectedHairstyle?.name
          ? selectedHairstyle.name.split(" (")[0].replace(/[^a-zA-Z0-9\u0E00-\u0E7F_-]/g, "_")
          : "hairstyle";
        a.download = `LOOKLAB-${hairName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      "image/png",
      0.95
    );
  };

  // Download Model Result (ดาวน์โหลดภาพผลลัพธ์จากโมเดล)
  const handleDownloadPhoto = (withWatermark: boolean = true) => {
    if (sourceMode === "upload") {
      const sourceImgUrl = uploadAiResultImage;
      if (!sourceImgUrl) {
        onError("ยังไม่มีรูปภาพผลลัพธ์ กรุณาสร้างลุคใหม่ก่อนดาวน์โหลด");
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = sourceImgUrl;
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || 800;
        c.height = img.naturalHeight || 800;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, c.width, c.height);
          if (withWatermark) {
            drawWatermarkOnCanvas(ctx, c.width, c.height);
          }
          downloadCanvas(c);
        }
      };
      return;
    }

    // Camera Mode Download - requires camera AI model result to be ready
    if (modelDownloadFnRef.current) {
      modelDownloadFnRef.current();
      return;
    }

    if (!cameraAiResultImage) {
      onError("ยังไม่มีรูปภาพผลลัพธ์จากโมเดล กรุณาสร้างลุคใหม่ก่อนดาวน์โหลด");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = cameraAiResultImage;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 1024;
      c.height = img.naturalHeight || 1024;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        if (withWatermark) {
          drawWatermarkOnCanvas(ctx, c.width, c.height);
        }
        downloadCanvas(c);
      }
    };
  };

  useImperativeHandle(ref, () => ({
    downloadPhoto: (withWatermark?: boolean) =>
      handleDownloadPhoto(withWatermark !== undefined ? withWatermark : (includeWatermark ?? true)),
    downloadLiveSnapshot: () => {
      if (cleanSnapshotFnRef.current) {
        cleanSnapshotFnRef.current();
      } else {
        onError("กรุณาเปิดกล้องถ่ายภาพก่อนบันทึกภาพนิ่ง");
      }
    },
    clearPhoto: () => {
      if (onClearImage) onClearImage();
      if (onClearUploadAiResult) onClearUploadAiResult();
      if (onClearCameraAiResult) onClearCameraAiResult();
    },
  }));

  const hasAiResult = Boolean(
    (sourceMode === "upload" && uploadAiResultImage) ||
    (sourceMode === "camera" && cameraAiResultImage)
  );

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Main Preview Stage Frame - scales consistently with outer container width and viewport height */}
      <div
        id="camera-preview-stage"
        className="relative w-full aspect-[4/5] max-w-[480px] md:max-w-none rounded-[24px] overflow-hidden bg-[#F4EAE2] border border-[#EFDCD3] shadow-sm scroll-mt-6 transition-all duration-300 mx-auto"
      >
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {sourceMode === "camera" ? (
            <CameraView
              selectedHairstyle={selectedHairstyle}
              selectedColor={selectedColor}
              onFaceTracked={onFaceTracked}
              onCaptureReady={onCaptureReady}
              onError={onError}
              isGenerating={isGenerating}
              onImageUpload={onImageUpload}
              autoStart={isCameraUserEnabled}
              onCameraToggle={handleCameraToggle}
              onRequestAiGenerate={onRequestAiGenerate}
              onGeneratingLiveChange={onGeneratingLiveChange}
              activeAiResultUrl={cameraAiResultImage || null}
              includeWatermark={includeWatermark}
              onToggleWatermark={onToggleWatermark}
              onSwitchToUpload={() => setSourceMode("upload")}
              onRegisterCleanSnapshot={(fn) => {
                cleanSnapshotFnRef.current = fn;
              }}
              onRegisterModelDownload={(fn) => {
                modelDownloadFnRef.current = fn;
              }}
            />
          ) : (
            <ImageUploadView
              selectedHairstyle={selectedHairstyle}
              selectedColor={selectedColor}
              uploadedImage={uploadedImage}
              onImageUpload={onImageUpload}
              onImageSelected={onImageSelected}
              onClearImage={onClearImage}
              isGenerating={isGenerating}
              elapsedSec={elapsedSec}
              aiResultImage={uploadAiResultImage}
              onClearAiResult={onClearUploadAiResult}
              onFaceTracked={onFaceTracked}
              onError={onError}
              savedPreviousImage={savedPreviousImage}
              includeWatermark={includeWatermark}
              onToggleWatermark={onToggleWatermark}
              onSelectHairstyle={onSelectHairstyle}
              onSelectColor={onSelectColor}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default TryOnStage;
