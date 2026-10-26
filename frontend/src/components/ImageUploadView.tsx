import { useEffect, useRef, useState, DragEvent } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { Hairstyle, HairColor, FaceTrackingData } from "../types";
import { processFaceLandmarks, createAlignedFaceImage, analyzeFaceShape, getFaceShapeData } from "../utils/faceTrackingUtils";
import BeforeAfterSlider from "./BeforeAfterSlider";
import {
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Split,
  RefreshCw,
  Clock,
  RotateCcw,
  Maximize2,
  X,
  Download,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

interface ImageUploadViewProps {
  selectedHairstyle?: Hairstyle | null;
  selectedColor?: HairColor | null;
  onFaceTracked?: (data: FaceTrackingData) => void;
  onImageSelected?: (blob: Blob | null) => void;
  onError?: (message: string) => void;
  isGenerating?: boolean;
  elapsedSec?: number;
  uploadedImage?: string | null;
  onImageUpload?: (dataUrl: string) => void;
  onClearImage?: () => void;
  aiResultImage?: string | null;
  onClearAiResult?: () => void;
  onStartCamera?: () => void;
  savedPreviousImage?: string | null;
  includeWatermark?: boolean;
  onToggleWatermark?: () => void;
  onSelectHairstyle?: (style: Hairstyle) => void;
  onSelectColor?: (color: HairColor) => void;
}

export default function ImageUploadView({
  selectedHairstyle,
  selectedColor,
  onFaceTracked,
  onImageSelected,
  onError,
  isGenerating,
  elapsedSec: propElapsedSec,
  uploadedImage,
  onImageUpload,
  onClearImage,
  aiResultImage,
  onClearAiResult,
  onStartCamera,
  savedPreviousImage,
  includeWatermark = true,
  onToggleWatermark,
  onSelectHairstyle,
  onSelectColor,
}: ImageUploadViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(uploadedImage || null);
  const [alignedImageUrl, setAlignedImageUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [faceMessage, setFaceMessage] = useState<string>("");
  const [viewMode, setViewMode] = useState<"slider" | "ai" | "original">("slider");
  const [internalElapsedSec, setInternalElapsedSec] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  // Real-time stopwatch timer for AI processing countdown/up in seconds
  useEffect(() => {
    if (!isGenerating || propElapsedSec !== undefined) {
      setInternalElapsedSec(0);
      return;
    }
    const startTime = performance.now();
    const interval = setInterval(() => {
      setInternalElapsedSec((performance.now() - startTime) / 1000);
    }, 50);
    return () => clearInterval(interval);
  }, [isGenerating, propElapsedSec]);

  const currentElapsedSeconds = propElapsedSec !== undefined ? propElapsedSec : internalElapsedSec;

  const lastTrackingDataRef = useRef<FaceTrackingData | null>(null);

  useEffect(() => {
    if (uploadedImage) {
      setImageUrl(uploadedImage);
      setIsProcessingImage(true);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = uploadedImage;
      img.onload = async () => {
        imgRef.current = img;
        await processImageWithLandmarks(img);
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setIsProcessingImage(false);
      };
    } else {
      setImageUrl(null);
      setAlignedImageUrl(null);
    }
  }, [uploadedImage]);

  useEffect(() => {
    if (aiResultImage) {
      setViewMode("slider");
    }
  }, [aiResultImage]);

  const getLandmarker = async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        outputFaceBlendshapes: false,
        runningMode: "IMAGE",
        numFaces: 1,
      });
      landmarkerRef.current = landmarker;
      return landmarker;
    } catch (err) {
      console.warn("MediaPipe FaceLandmarker load error, falling back:", err);
      return null;
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      if (onError) onError("กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)");
      return;
    }

    if (onError) onError("");
    setIsProcessingImage(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setImageUrl(dataUrl);
        if (onImageUpload) onImageUpload(dataUrl);
        if (onImageSelected) onImageSelected(file);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = dataUrl;
        img.onload = async () => {
          imgRef.current = img;
          await processImageWithLandmarks(img);
          setIsProcessingImage(false);
        };
        img.onerror = () => {
          setIsProcessingImage(false);
          if (onError) onError("ไม่สามารถโหลดรูปภาพนี้ได้ กรุณาลองใช้รูปภาพอื่น");
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = async (samplePath: string, sampleLabel: string) => {
    try {
      setIsProcessingImage(true);
      if (onError) onError("");
      const response = await fetch(samplePath);
      const blob = await response.blob();
      const sampleFile = new File([blob], `${sampleLabel}.jpg`, { type: "image/jpeg" });

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setImageUrl(dataUrl);
          if (onImageUpload) onImageUpload(dataUrl);
          if (onImageSelected) onImageSelected(sampleFile);

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = dataUrl;
          img.onload = async () => {
            imgRef.current = img;
            await processImageWithLandmarks(img);
            setIsProcessingImage(false);
          };
          img.onerror = () => {
            setIsProcessingImage(false);
          };
        }
      };
      reader.readAsDataURL(sampleFile);
    } catch (err: any) {
      console.error("Failed to load sample photo:", err);
      setIsProcessingImage(false);
    }
  };

  const [showFaceDetectionCircle, setShowFaceDetectionCircle] = useState(true);
  const showFaceDetectionCircleRef = useRef(true);
  showFaceDetectionCircleRef.current = showFaceDetectionCircle;
  const animFrameRef = useRef<number | null>(null);

  const redrawCanvas = (
    img: HTMLImageElement,
    tracking?: FaceTrackingData | null,
    showCircle?: boolean,
    animTime?: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== (img.naturalWidth || 800) || canvas.height !== (img.naturalHeight || 800)) {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 800;
    }
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const shouldShow = showCircle !== undefined ? showCircle : showFaceDetectionCircleRef.current;
    const data = tracking !== undefined ? tracking : lastTrackingDataRef.current;

    // Draw Modern High-Tech Camera AF Face Guide (กรอบสี่เหลี่ยม + วงกลม/วงรี จางๆ บางเบา ไม่บังใบหน้า พร้อมกระพริบและเปล่งแสงนุ่มนวล ไม่มีข้อความในวงกลม)
    if (shouldShow && data && data.isFaceValid) {
      const scale = Math.max(1, Math.min(w, h) / 600);
      const t = animTime ?? performance.now();

      // Pulsing & Blinking Calculations (กระพริบและเปล่งแสงแบบกล้อง AF นุ่มนวล)
      // 1. Smooth rhythmic breathing pulse (ความสว่างของเส้นกรอบ 0.0 - 1.0)
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.005);
      // 2. Camera autofocus lock blinking (กระพริบไฟสถานะ AF เป็นจังหวะ)
      const blinkCycle = Math.floor(t / 400) % 2 === 0;
      // 3. Subtle breathing scale
      const breath = 1 + 0.005 * Math.sin(t * 0.004);

      const cx = data.centerX * w;
      const cy = data.centerY * h;
      const rx = (data.width * w * 0.5) * 1.15 * breath;
      const ry = (data.height * h * 0.5) * 1.25 * breath;
      const rollRad = (data.roll || 0) * (Math.PI / 180);

      ctx.save();

      // ==========================================
      // 1. Sleek Camera AF Bounding Box (กรอบสี่เหลี่ยมตรวจจับใบหน้าแบบโปร่งใส บางเบา)
      // ==========================================
      const bW = rx * 1.18;
      const bH = ry * 1.18;
      const rectX = cx - bW;
      const rectY = cy - bH;
      const rectW = bW * 2;
      const rectH = bH * 2;

      // Note: No filled color over the face area to keep face 100% natural and unobscured

      // Delicate dashed bounding box outline (จางๆ บางเบา)
      ctx.strokeStyle = `rgba(0, 242, 147, ${0.12 + 0.08 * pulse})`;
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));
      ctx.setLineDash([Math.round(5 * scale), Math.round(5 * scale)]);
      ctx.strokeRect(rectX, rectY, rectW, rectH);
      ctx.setLineDash([]);

      // 4 High-Tech L-Shaped Corner Brackets (เส้นเล็ง 4 มุม) - บางคมชัด ไม่หนาทึบ + กระพริบนุ่มนวล
      const bracketLen = Math.round(22 * scale);
      const strokeW = Math.max(1.5, Math.round(2 * scale));

      const drawCorners = (color: string, width: number, blur: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = blur > 0 ? "rgba(0, 242, 147, 0.6)" : "transparent";
        ctx.shadowBlur = blur;

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(rectX, rectY + bracketLen);
        ctx.lineTo(rectX, rectY);
        ctx.lineTo(rectX + bracketLen, rectY);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(rectX + rectW - bracketLen, rectY);
        ctx.lineTo(rectX + rectW, rectY);
        ctx.lineTo(rectX + rectW, rectY + bracketLen);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(rectX, rectY + rectH - bracketLen);
        ctx.lineTo(rectX, rectY + rectH);
        ctx.lineTo(rectX + bracketLen, rectY + rectH);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(rectX + rectW - bracketLen, rectY + rectH);
        ctx.lineTo(rectX + rectW, rectY + rectH);
        ctx.lineTo(rectX + rectW, rectY + rectH - bracketLen);
        ctx.stroke();
      };

      // Sleek luminous neon emerald corner brackets (บางเบา จางๆ ไม่บดบัง)
      drawCorners(
        `rgba(0, 242, 147, ${0.55 + 0.25 * pulse})`,
        strokeW,
        Math.round((3 + 3 * pulse) * scale)
      );

      ctx.shadowBlur = 0;

      // 4 Corner Precision Crosshair Reticles (+) at outer boundary
      const crossLen = Math.round(4 * scale);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + 0.2 * pulse})`;
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));

      const drawCross = (x: number, y: number) => {
        ctx.beginPath();
        ctx.moveTo(x - crossLen, y);
        ctx.lineTo(x + crossLen, y);
        ctx.moveTo(x, y - crossLen);
        ctx.lineTo(x, y + crossLen);
        ctx.stroke();
      };

      const cornerOffset = 7 * scale;
      drawCross(rectX + cornerOffset, rectY + cornerOffset);
      drawCross(rectX + rectW - cornerOffset, rectY + cornerOffset);
      drawCross(rectX + cornerOffset, rectY + rectH - cornerOffset);
      drawCross(rectX + rectW - cornerOffset, rectY + rectH - cornerOffset);

      // Blinking Active AF Lock Beacon Dot (จุดไฟสถานะกระพริบที่มุมนอกกรอบ)
      if (blinkCycle) {
        const beaconX = rectX + bracketLen + 6 * scale;
        const beaconY = rectY - 3 * scale;
        ctx.fillStyle = "rgba(0, 242, 147, 0.9)";
        ctx.shadowColor = "#00F293";
        ctx.shadowBlur = Math.round(5 * scale);
        ctx.beginPath();
        ctx.arc(beaconX, beaconY, Math.max(2, Math.round(2.5 * scale)), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ==========================================
      // 2. High-Precision Biometric Face Oval Guide (วงกลม/วงรีตรวจจับใบหน้าแบบโปร่งใส จางสวยงาม)
      // ==========================================
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rollRad);

      // Outer Rotating/Pulsing Dashed Ring (จางๆ บางเฉียบ)
      ctx.strokeStyle = `rgba(0, 242, 147, ${0.15 + 0.12 * pulse})`;
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));
      ctx.setLineDash([Math.round(4 * scale), Math.round(6 * scale)]);
      ctx.lineDashOffset = -t * 0.015;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx + 6 * scale, ry + 6 * scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Main Biometric Oval Ring - Glowing Neon Emerald (บาง จาง ไม่ทับปิดใบหน้า)
      ctx.strokeStyle = `rgba(0, 242, 147, ${0.55 + 0.25 * pulse})`;
      ctx.lineWidth = Math.max(1.2, Math.round(1.8 * scale));
      ctx.shadowColor = "rgba(0, 242, 147, 0.7)";
      ctx.shadowBlur = Math.round((3 + 3 * pulse) * scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4 Cardinal Aiming Ticks (เส้นเล็งขอบวงรี 4 ทิศ เล็กๆ พอดีขอบ)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + 0.25 * pulse})`;
      ctx.lineWidth = Math.max(1, Math.round(1 * scale));
      const tickSize = Math.round(5 * scale);

      // Top (Forehead guide tick)
      ctx.beginPath();
      ctx.moveTo(0, -ry - tickSize * 0.5);
      ctx.lineTo(0, -ry + tickSize * 0.5);
      ctx.stroke();

      // Bottom (Chin guide tick)
      ctx.beginPath();
      ctx.moveTo(0, ry - tickSize * 0.5);
      ctx.lineTo(0, ry + tickSize * 0.5);
      ctx.stroke();

      // Left & Right (Cheek ticks)
      const eyeLevelY = -ry * 0.08;
      ctx.beginPath();
      ctx.moveTo(-rx - tickSize * 0.5, eyeLevelY);
      ctx.lineTo(-rx + tickSize * 0.5, eyeLevelY);
      ctx.moveTo(rx - tickSize * 0.5, eyeLevelY);
      ctx.lineTo(rx + tickSize * 0.5, eyeLevelY);
      ctx.stroke();

      // Notice: No center crosshair or dot over the eyes/nose to keep face 100% visible

      // Subtle blinking chin accent dot (กระพริบเบาๆ ที่ริมขอบคาง)
      if (blinkCycle) {
        ctx.fillStyle = "rgba(0, 242, 147, 0.85)";
        ctx.beginPath();
        ctx.arc(0, ry, Math.max(1.5, Math.round(2 * scale)), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.restore();
    }
  };

  // Real-time animation loop for pulsing and realistic blinking face tracking HUD
  useEffect(() => {
    if (imageUrl && !aiResultImage && showFaceDetectionCircle) {
      let active = true;
      const animate = (timestamp: number) => {
        if (!active) return;
        if (imgRef.current && canvasRef.current && lastTrackingDataRef.current?.isFaceValid) {
          redrawCanvas(imgRef.current, lastTrackingDataRef.current, true, timestamp);
        }
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);

      return () => {
        active = false;
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      };
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (imgRef.current) {
        redrawCanvas(imgRef.current, lastTrackingDataRef.current, false, 0);
      }
    }
  }, [imageUrl, aiResultImage, showFaceDetectionCircle]);

  const processImageWithLandmarks = async (img: HTMLImageElement) => {
    const landmarker = await getLandmarker();
    if (!landmarker) {
      const fallbackAnalysis = getFaceShapeData("Oval");
      const fallbackData: FaceTrackingData = {
        centerX: 0.5,
        centerY: 0.42,
        width: 0.35,
        height: 0.45,
        roll: 0,
        foreheadY: 0.28,
        isFaceValid: true,
        message: "พร้อมสร้างภาพทรงผม",
        faceShape: "Oval",
        shapeAnalysis: fallbackAnalysis,
      };
      lastTrackingDataRef.current = fallbackData;
      if (onFaceTracked) onFaceTracked(fallbackData);
      setFaceDetected(true);
      setFaceMessage("พร้อมสร้างภาพทรงผม");
      redrawCanvas(img, fallbackData);
      return;
    }

    try {
      const results = landmarker.detect(img);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const trackingData = processFaceLandmarks(landmarks, lastTrackingDataRef.current, 1.0);

        lastTrackingDataRef.current = trackingData;
        if (!trackingData.shapeAnalysis) {
          const directAnalysis = analyzeFaceShape(landmarks);
          trackingData.shapeAnalysis = directAnalysis;
          trackingData.faceShape = directAnalysis.shape;
        }

        if (onFaceTracked) onFaceTracked(trackingData);
        setFaceDetected(trackingData.isFaceValid);
        setFaceMessage(trackingData.message || "พร้อมสร้างภาพทรงผม");

        const alignedFace = createAlignedFaceImage(img, landmarks, trackingData, 600);
        setAlignedImageUrl(alignedFace);

        redrawCanvas(img, trackingData);
      } else {
        const noFaceData: FaceTrackingData = {
          centerX: 0.5,
          centerY: 0.5,
          width: 0.3,
          height: 0.4,
          roll: 0,
          foreheadY: 0.3,
          isFaceValid: false,
          message: "ไม่พบใบหน้าในรูปภาพ",
        };
        lastTrackingDataRef.current = noFaceData;
        if (onFaceTracked) onFaceTracked(noFaceData);
        setFaceDetected(false);
        setFaceMessage("ไม่พบใบหน้า กรุณาใช้รูปถ่ายหน้าตรงที่ชัดเจน");
        redrawCanvas(img, noFaceData);
      }
    } catch (err) {
      console.warn("Landmark detection exception:", err);
      setFaceDetected(true);
      redrawCanvas(img);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };



  return (
    <div className="relative w-full h-full overflow-hidden bg-[#FFF8F4] select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {imageUrl ? (
        /* Image Display State */
        <div className="absolute inset-0 w-full h-full bg-[#FFF8F4] overflow-hidden">
          {aiResultImage ? (
            /* Result Mode: Before/After Slider or Full Result */
            viewMode === "slider" ? (
              <BeforeAfterSlider
                className="absolute inset-0 w-full h-full"
                beforeUrl={alignedImageUrl || imageUrl}
                afterUrl={aiResultImage}
                beforeLabel="ก่อน"
                afterLabel="หลัง"
                showScriptOverlay={false}
                beforeLabelClassName="bottom-4 left-4"
                includeWatermark={includeWatermark}
              />
            ) : viewMode === "original" ? (
              <div className="absolute inset-0 w-full h-full">
                <img
                  src={alignedImageUrl || imageUrl}
                  alt="Original"
                  className="w-full h-full object-cover object-center"
                />
                <span className="absolute bottom-2.5 sm:bottom-3.5 left-2.5 sm:left-3.5 bg-black/60 text-white text-[11px] sm:text-xs font-medium px-3 sm:px-3.5 py-1 rounded-full shadow-sm backdrop-blur-xs">
                  ก่อน (ภาพต้นฉบับ)
                </span>
              </div>
            ) : (
              <div
                onClick={() => setIsLightboxOpen(true)}
                className="absolute inset-0 w-full h-full cursor-zoom-in group select-none"
                title="คลิกเพื่อขยายดูรูปผลลัพธ์เต็มๆ"
              >
                <img
                  src={aiResultImage}
                  alt="AI Result"
                  className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-300"
                />
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white pointer-events-none backdrop-blur-2xs">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
                    <Maximize2 size={20} className="text-white drop-shadow-sm" />
                  </div>
                  <span className="text-xs font-bold bg-black/60 px-3 py-1 rounded-full text-white shadow-sm">
                    คลิกเพื่อขยายดูรูปเต็มๆ
                  </span>
                </div>

                <div className="absolute bottom-2.5 sm:bottom-3.5 right-2.5 sm:right-3.5 z-20">
                  <span className="bg-[#F27D68] text-white text-[11px] sm:text-xs font-medium px-3 sm:px-3.5 py-1 rounded-full shadow-sm">
                    หลัง (ทรงผมใหม่)
                  </span>
                </div>
              </div>
            )
          ) : (
            /* User Uploaded Photo Preview (Prior to AI generation) */
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover object-center block"
              />
            </div>
          )}

          {/* Top Status and Mode Badges (Responsive, locked safely inside canvas container boundaries) */}
          <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 flex items-center justify-between gap-1 sm:gap-2 z-30 pointer-events-none">
            {/* Left: Detection Status or View Switcher */}
            <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
              {faceDetected !== null && !aiResultImage && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-xs border transition-all duration-200 ${
                    faceDetected
                      ? "bg-emerald-600/90 text-white border-emerald-400/80 shadow-emerald-500/20"
                      : "bg-amber-600/90 text-white border-amber-400/80 shadow-amber-500/20"
                  }`}
                >
                  {faceDetected ? (
                    <CheckCircle2 size={13} className="shrink-0 text-white" />
                  ) : (
                    <AlertCircle size={13} className="shrink-0 text-white" />
                  )}
                  <span className="truncate max-w-[150px] sm:max-w-none">
                    {faceMessage || (faceDetected ? "พร้อมสร้างภาพทรงผม" : "กรุณาหันหน้าตรง")}
                  </span>
                </span>
              )}

              {aiResultImage && (
                <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-md p-0.5 rounded-full border border-[#EFDCD3] shadow-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("slider")}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap ${
                      viewMode === "slider"
                        ? "bg-[#F27D68] text-white shadow-xs"
                        : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFF1E9]/60"
                    }`}
                    title="สไลด์เปรียบเทียบภาพก่อนและหลัง"
                  >
                    <Split size={12} />
                    <span>สไลด์</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("ai")}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 active:scale-95 whitespace-nowrap ${
                      viewMode === "ai"
                        ? "bg-[#F27D68] text-white shadow-xs"
                        : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFF1E9]/60"
                    }`}
                    title="ดูภาพผลลัพธ์ทรงผม"
                  >
                    <Sparkles size={12} />
                    <span>ผลลัพธ์</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Face Circle Toggle, Selected Style badge, Change photo button & Reset/Delete photo button */}
            <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
              {/* ปุ่มเปิด/ปิดกรอบวงกลมตรวจจับใบหน้าบนรูป (ปุ่มสลับกรอบหน้า) */}
              {!aiResultImage && faceDetected && (
                <button
                  type="button"
                  onClick={() => {
                    const next = !showFaceDetectionCircle;
                    setShowFaceDetectionCircle(next);
                    if (imgRef.current) {
                      redrawCanvas(imgRef.current, lastTrackingDataRef.current, next);
                    }
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full backdrop-blur-md shadow-xs border flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0 ${
                    showFaceDetectionCircle
                      ? "bg-white/95 text-[#47735C] border-[#47735C]/40 ring-1 ring-[#47735C]/20 shadow-xs"
                      : "bg-white/85 text-[#80665D] border-[#EFDCD3]"
                  }`}
                  title={showFaceDetectionCircle ? "คลิกเพื่อซ่อนกรอบและวงกลมตรวจจับใบหน้า" : "คลิกเพื่อแสดงกรอบและวงกลมตรวจจับใบหน้า"}
                  aria-label="เปิดหรือปิดกรอบตรวจจับใบหน้า"
                >
                  {showFaceDetectionCircle ? (
                    <Eye size={13} className="text-[#47735C] shrink-0" />
                  ) : (
                    <EyeOff size={13} className="text-[#80665D] shrink-0" />
                  )}
                </button>
              )}

              {selectedHairstyle && !aiResultImage && (
                <div
                  className="bg-white/95 backdrop-blur-md p-1 sm:py-1 sm:pl-1 sm:pr-2 rounded-full border border-[#EFDCD3] shadow-xs flex items-center gap-1 shrink-0"
                  title={`ทรงผมที่เลือก: ${selectedHairstyle.name}`}
                >
                  <img
                    src={
                      selectedHairstyle.id === "original_style" && (imageUrl || uploadedImage)
                        ? (imageUrl || uploadedImage || "")
                        : selectedHairstyle.thumbnail
                    }
                    alt={selectedHairstyle.name}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-[#EFDCD3] shrink-0"
                  />
                  <span className="text-[10px] font-bold text-[#432B25] hidden lg:inline truncate max-w-[75px] leading-tight">
                    {selectedHairstyle.name.split(" (")[0]}
                  </span>
                </div>
              )}

              {/* ปุ่มเปลี่ยนรูป */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white/95 hover:bg-white text-[#432B25] hover:text-[#F27D68] text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 sm:px-3 h-7 sm:h-8 rounded-full backdrop-blur-md shadow-xs border border-[#EFDCD3] flex items-center gap-1 transition cursor-pointer active:scale-95 shrink-0"
                title="เปลี่ยนรูปภาพจากเครื่อง"
              >
                <RefreshCw size={12} className="text-[#F27D68] shrink-0" />
                <span className="hidden xs:inline">เปลี่ยนรูป</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClearImage) onClearImage();
                }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-[#80665D] hover:text-[#B64040] border border-[#EFDCD3] flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 backdrop-blur-md shrink-0"
                title="ลบรูปภาพและเริ่มต้นใหม่"
                aria-label="ลบรูปภาพ"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>


          {/* Loading Overlay */}
          {(isProcessingImage || isGenerating) && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-5 text-[#432B25] z-40 animate-fade-in">
              {/* 1. ด้านบน: รูปที่อัปโหลดไว้ด้านบน (Uploaded Photo at the Top) */}
              {uploadedImage && (
                <div className="flex flex-col items-center pt-1 sm:pt-2">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-2 ring-[#F27D68]/30 bg-[#FAF7F4] flex items-center justify-center">
                      <img
                        src={uploadedImage}
                        alt="Uploaded face"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-2 inset-x-0 mx-auto w-fit bg-[#432B25] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap">
                      รูปต้นฉบับของคุณ
                    </span>
                  </div>
                </div>
              )}

              {/* 2. ตรงกลาง: Status & Spinner */}
              <div className="flex flex-col items-center my-auto py-2 text-center">
                <div className="w-11 h-11 rounded-full bg-[#FFE3D5] flex items-center justify-center text-[#F27D68] shadow-xs animate-spin mb-2">
                  <Loader2 size={22} />
                </div>
                {isGenerating && (
                  <div className="inline-flex items-center gap-1.5 bg-[#FFF1E9] border border-[#F27D68]/30 px-3 py-1 rounded-full text-[11px] font-bold text-[#F27D68] mb-1.5 shadow-2xs">
                    <Clock size={12} className="text-[#F27D68] animate-spin" />
                    <span>เวลาประมวลผลจริง: {currentElapsedSeconds.toFixed(1)} วินาที</span>
                  </div>
                )}
                <h5 className="text-xs sm:text-sm font-bold text-[#432B25]">
                  {isGenerating
                    ? "กำลังจำลองลุคทรงผมใหม่เสมือนจริง"
                    : "ระบบกำลังวิเคราะห์โครงหน้า"}
                </h5>
                <p className="text-[10px] text-[#80665D] mt-0.5 max-w-[260px]">
                  {isGenerating
                    ? "กรุณารอสักครู่ ระบบกำลังผสานทรงผมและเฉดสีผม"
                    : "กรุณารอสักครู่ ระบบกำลังตรวจจับตำแหน่งใบหน้า"}
                </p>
              </div>

              {/* 3. ด้านล่าง: ทรงผมและสีผมที่เลือกอยู่ด้านล่าง (Hairstyle & Hair Color at Bottom) */}
              <div className="w-full max-w-xs bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-2.5 pb-2">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#80665D] mb-1.5 text-center">
                  ทรงผมและสีผมที่เลือก
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1.5 bg-white border border-[#EFDCD3] rounded-xl p-1.5 shadow-2xs">
                    {selectedHairstyle?.id === "original_style" && (imageUrl || uploadedImage) ? (
                      <img
                        src={imageUrl || uploadedImage || ""}
                        alt="ทรงผมต้นฉบับเดิม (รูปภาพต้นฉบับของคุณ)"
                        className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                      />
                    ) : selectedHairstyle?.thumbnail ? (
                      <img
                        src={selectedHairstyle.thumbnail}
                        alt={selectedHairstyle.name}
                        className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#FAF7F4] border border-[#EFDCD3] flex items-center justify-center text-[9px] text-[#80665D] shrink-0">
                        ทรงผม
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="block text-[8px] font-semibold text-[#80665D]">เรฟทรงผม</span>
                      <span className="text-[10px] font-bold text-[#432B25] truncate block">
                        {selectedHairstyle?.id === "original_style"
                          ? "ทรงผมต้นฉบับ (รูปต้นฉบับ)"
                          : (selectedHairstyle?.name?.split(" (")[0] || "ทรงผม")}
                      </span>
                    </div>
                  </div>

                  {/* Selected Hair Color - ถ้าเป็นสีธรรมชาติ ให้แสดงรูปภาพต้นฉบับเป็นเรฟสีผมธรรมชาติ */}
                  <div className="flex items-center gap-1.5 bg-white border border-[#EFDCD3] rounded-xl p-1.5 shadow-2xs">
                    {selectedColor?.colorReference ? (
                      <img
                        src={selectedColor.colorReference}
                        alt={selectedColor.name}
                        className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                      />
                    ) : selectedColor?.value ? (
                      <div
                        className="w-8 h-8 rounded-lg border border-black/10 shrink-0"
                        style={{ backgroundColor: selectedColor.value }}
                      />
                    ) : (imageUrl || uploadedImage) ? (
                      <img
                        src={imageUrl || uploadedImage || ""}
                        alt="สีผมธรรมชาติเดิม (รูปภาพต้นฉบับของคุณ)"
                        className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#FAF7F4] border border-[#EFDCD3] flex items-center justify-center text-[8px] text-[#80665D] shrink-0">
                        รูปต้นฉบับ
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="block text-[8px] font-semibold text-[#80665D]">เรฟสีผม</span>
                      <span className="text-[10px] font-bold text-[#432B25] truncate block">
                        {selectedColor && selectedColor.id !== "natural_original" && selectedColor.id !== "original"
                          ? selectedColor.name.split(" (")[0]
                          : "สีผมธรรมชาติ (รูปต้นฉบับ)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Upload Dropzone State */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full h-full p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-colors overflow-hidden ${
            isDragging
              ? "bg-[#FFF1E9] border-2 border-dashed border-[#F27D68]"
              : "bg-[#FFF8F4]"
          }`}
        >
          {/* Coral Circle Icon */}
          <div className="w-13 h-13 rounded-full bg-[#FFE3D5] text-[#F27D68] flex items-center justify-center mb-3 shadow-xs">
            <Upload size={22} className="stroke-[2.2]" />
          </div>

          <h4 className="font-bold text-lg sm:text-xl text-[#432B25] mb-1">
            เพิ่มรูปของคุณ แล้วลองลุคใหม่
          </h4>

          {/* Guidance prompt */}
          <p className="text-xs sm:text-sm text-[#80665D] max-w-xs mb-4 font-normal leading-relaxed">
            อัปโหลดรูปถ่ายหน้าตรง เพื่อทดลองทรงผมและสีผมเสมือนจริง
          </p>

          {/* Action Button: Upload from device (Centered) */}
          <div className="flex flex-col items-center justify-center w-full max-w-xs space-y-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-6 rounded-full bg-[#F27D68] hover:bg-[#E96A55] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              title="เลือกรูปภาพจากเครื่องของคุณ"
            >
              <Upload size={16} />
              <span>อัปโหลดรูปภาพ</span>
            </button>

            {/* Saved Previous Photo Option (ถ้ามีรูปเดิมที่บันทึกไว้ในเครื่องนี้) */}
            {savedPreviousImage && (
              <button
                type="button"
                onClick={() => {
                  if (onImageUpload) onImageUpload(savedPreviousImage);
                }}
                className="group w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-[#FFE3D5]/50 border border-[#EFDCD3] hover:border-[#F27D68] shadow-2xs hover:shadow-xs transition cursor-pointer active:scale-95"
                title="คลิกเพื่อนำรูปเดิมที่บันทึกไว้ในเครื่องนี้กลับมาใช้"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#EFDCD3] shrink-0 group-hover:scale-105 transition bg-[#FAF7F4]">
                    <img
                      src={savedPreviousImage}
                      alt="รูปเดิมที่บันทึกไว้"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-[11px] font-bold text-[#432B25] group-hover:text-[#F27D68] block truncate">
                      ใช้รูปเดิมของคุณ
                    </span>
                    <span className="text-[9px] text-[#80665D] block truncate">
                      (บันทึกเฉพาะในเครื่องนี้เท่านั้น คนอื่นไม่เห็น)
                    </span>
                  </div>
                </div>
                <div className="flex items-center text-[#F27D68] text-[10px] font-bold shrink-0">
                  <span>เลือกรูปนี้</span>
                  <RotateCcw size={11} className="ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Sample photos selector centered below upload button */}
          <div className="mt-4 pt-3.5 border-t border-[#EFDCD3]/70 w-full max-w-xs flex flex-col items-center">
            <span className="text-[10px] font-medium text-[#80665D] mb-2">
              หรือลองใช้รูปตัวอย่าง:
            </span>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectSample("/assets/example/women.png", "woman_sample")}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-[#FFE3D5]/60 border border-[#EFDCD3] hover:border-[#F27D68] shadow-2xs hover:shadow-xs transition cursor-pointer active:scale-95"
                title="เลือกรูปตัวอย่างผู้หญิง"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#EFDCD3] shrink-0 group-hover:scale-105 transition">
                  <img
                    src="/assets/example/women.png"
                    alt="ตัวอย่างผู้หญิง"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#432B25] group-hover:text-[#F27D68] transition">
                  ผู้หญิง
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSample("/assets/example/boy.png", "boy_sample")}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white hover:bg-[#FFE3D5]/60 border border-[#EFDCD3] hover:border-[#F27D68] shadow-2xs hover:shadow-xs transition cursor-pointer active:scale-95"
                title="เลือกรูปตัวอย่างผู้ชาย"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-[#EFDCD3] shrink-0 group-hover:scale-105 transition">
                  <img
                    src="/assets/example/boy.png"
                    alt="ตัวอย่างผู้ชาย"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#432B25] group-hover:text-[#F27D68] transition">
                  ผู้ชาย
                </span>
              </button>
            </div>
          </div>

          <span className="text-[11px] text-[#A18B82] mt-3">
            ลากไฟล์มาวางที่นี่ได้เช่นกัน
          </span>
        </div>
      )}

      {/* Lightbox Fullscreen Image Viewer Modal */}
      {isLightboxOpen && aiResultImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="รูปภาพผลลัพธ์ขยายเต็มจอ"
        >
          {/* Header */}
          <div
            className="w-full max-w-5xl flex items-center justify-between gap-3 text-white pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#F27D68]/20 border border-[#F27D68]/40 flex items-center justify-center text-[#F27D68] shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-white truncate">
                  ภาพผลลัพธ์ทรงผมแบบเต็มตา
                </h4>
                <p className="text-[11px] text-white/70 truncate">
                  {selectedHairstyle?.name?.split(" (")[0] || "ทรงผมใหม่"} · {selectedColor?.name?.split(" (")[0] || "สีผมใหม่"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={aiResultImage}
                download="ai-hairstyle-result.jpg"
                className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                title="ดาวน์โหลดรูปผลลัพธ์"
              >
                <Download size={14} />
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </a>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-xl transition cursor-pointer"
                title="ปิดหน้าต่างขยายรูป (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Centered Full Image */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto overflow-hidden p-1 sm:p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={aiResultImage}
              alt="AI Result Expanded"
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/15 animate-in zoom-in-95 duration-200"
            />
          </div>

          {/* Footer Info */}
          <div
            className="text-center text-white/75 text-xs pt-2 pb-1 flex items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="bg-white/10 px-3.5 py-1 rounded-full backdrop-blur-xs text-[11px]">
              คลิกที่ว่างรอบนอก หรือกดปุ่ม X หรือ Esc เพื่อปิด
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
