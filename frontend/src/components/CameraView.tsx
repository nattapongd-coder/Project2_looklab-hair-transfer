import { useEffect, useRef, useState } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { Hairstyle, HairColor, FaceTrackingData } from "../types";
import { processFaceLandmarks } from "../utils/faceTrackingUtils";
import {
  Point2D,
  AffineTransform2D,
  extractAnchorPoints,
  extractMirroredScreenAnchorPoints,
  estimateSimilarityTransform,
  smoothTransform,
  checkFaceAlignment,
  createFeatheredHeadMaskCanvas,
  FaceAlignmentStatus,
} from "../utils/aiWarpUtils";
import { playCameraShutterSound, playCountdownTickSound, primeAudioContext } from "../utils/audioUtils";
import { drawCameraOverlay } from "../utils/cameraOverlayRenderer";
import { sanitizeUserErrorMessage } from "../utils/sanitizeError";
import {
  Camera,
  CameraOff,
  Loader2,
  Sparkles,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Split,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock,
  Settings,
  AlertTriangle,
  Upload,
} from "lucide-react";

interface CameraViewProps {
  selectedHairstyle: Hairstyle | null;
  selectedColor: HairColor | null;
  onFaceTracked: (data: FaceTrackingData) => void;
  onCaptureReady: (videoElement: HTMLVideoElement | null) => void;
  onError: (message: string) => void;
  isGenerating: boolean;
  onImageUpload?: (dataUrl: string) => void;
  autoStart?: boolean;
  onCameraToggle?: (active: boolean) => void;
  onRequestAiGenerate?: (
    faceBlob: Blob,
    explicitStyle?: Hairstyle | null,
    explicitColor?: HairColor | null
  ) => Promise<string | null>;
  onGeneratingLiveChange?: (isGenerating: boolean) => void;
  activeAiResultUrl?: string | null;
  includeWatermark?: boolean;
  onToggleWatermark?: () => void;
  onSwitchToUpload?: () => void;
  onRegisterCleanSnapshot?: (fn: () => void) => void;
  onRegisterModelDownload?: (fn: () => void) => void;
}

const COUNTDOWN_DURATION_MS = 5000; // 5-second photo countdown like real camera snapshot

export default function CameraView({
  selectedHairstyle,
  selectedColor,
  onFaceTracked,
  onCaptureReady,
  onError,
  isGenerating,
  onImageUpload,
  autoStart = false,
  onCameraToggle,
  onRequestAiGenerate,
  onGeneratingLiveChange,
  activeAiResultUrl,
  includeWatermark = true,
  onToggleWatermark,
  onSwitchToUpload,
  onRegisterCleanSnapshot,
  onRegisterModelDownload,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const imageLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoadingLandmarker, setIsLoadingLandmarker] = useState(false);
  const [landmarkerError, setLandmarkerError] = useState<string | null>(null);
  const [savedToastMessage, setSavedToastMessage] = useState<string | null>(null);

  // Latest detected raw landmarks from live video stream (used for clean snapshot capture)
  const latestLiveLandmarksRef = useRef<Array<{ x: number; y: number; z?: number }> | null>(null);

  // Live AI Model Warp States
  const [isLiveAiWarpEnabled, setIsLiveAiWarpEnabled] = useState(true);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [featherRadius, setFeatherRadius] = useState(26);
  const [blendOpacity, setBlendOpacity] = useState(1.0);
  const [showLiveTuning, setShowLiveTuning] = useState(false);


  // Auto countdown & circle guide mode:
  // true = alignment circle shown, requires face inside circle, auto counts down 5s to capture
  // false = free mode, circle hidden, no countdown capture, real-time result tracks face everywhere
  const [isAutoCountdownActive, setIsAutoCountdownActive] = useState<boolean>(true);
  const isAutoCountdownActiveRef = useRef(isAutoCountdownActive);
  isAutoCountdownActiveRef.current = isAutoCountdownActive;

  // Face alignment & Hold timer states
  const [alignmentStatus, setAlignmentStatus] = useState<FaceAlignmentStatus>({
    isAligned: false,
    message: "กำลังเริ่มการจัดตำแหน่ง...",
    type: "warning",
    score: 0,
    centerOffset: { x: 0, y: 0 },
    headTilt: 0,
    faceSizeRatio: 0,
  });

  const countdownStartTimestampRef = useRef<number | null>(null);
  const lastTickSecondRef = useRef<number | null>(null);
  const flashOpacityRef = useRef<number>(0);
  const isCaptureRequestedRef = useRef(false);
  const [countdownRemainingSec, setCountdownRemainingSec] = useState<number | null>(null);
  const isAutoInferenceTriggeredRef = useRef(false);
  const postGenerationCooldownUntilRef = useRef<number>(0);

  // Inference Timer & Model status
  const [isGeneratingModelLive, setIsGeneratingModelLive] = useState(false);
  const isGeneratingModelLiveRef = useRef(isGeneratingModelLive);
  isGeneratingModelLiveRef.current = isGeneratingModelLive;
  const [liveProcessingPhoto, setLiveProcessingPhoto] = useState<string | null>(null);

  const [inferenceTimeSec, setInferenceTimeSec] = useState(0);
  const [lastInferenceDuration, setLastInferenceDuration] = useState<number | null>(null);
  const [modelErrorMessage, setModelErrorMessage] = useState<string | null>(null);
  const inferenceTimerIntervalRef = useRef<any>(null);
  const inferenceStartTimeRef = useRef<number | null>(null);
  const inferenceTimeSecRef = useRef<number>(0);

  // Current Live AI Model Texture & Base Landmarks
  const aiModelImageRef = useRef<HTMLImageElement | null>(null);
  const aiModelLandmarksRef = useRef<Point2D[] | null>(null);
  const aiModelRawLandmarksRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const aiModelMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAiModelLoaded, setIsAiModelLoaded] = useState(false);
  const isAiModelLoadedRef = useRef(isAiModelLoaded);
  isAiModelLoadedRef.current = isAiModelLoaded;

  const isLiveAiWarpEnabledRef = useRef(isLiveAiWarpEnabled);
  isLiveAiWarpEnabledRef.current = isLiveAiWarpEnabled;

  // Transform smoother ref
  const lastTransformRef = useRef<AffineTransform2D | null>(null);

  // Tracking data ref
  const trackingDataRef = useRef<FaceTrackingData>({
    centerX: 0.5,
    centerY: 0.5,
    width: 0.3,
    height: 0.4,
    roll: 0,
    foreheadY: 0.3,
    isFaceValid: false,
    message: "ไม่พบใบหน้า",
  });

  // Stable props refs
  const selectedHairstyleRef = useRef(selectedHairstyle);
  selectedHairstyleRef.current = selectedHairstyle;

  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;

  const onRequestAiGenerateRef = useRef(onRequestAiGenerate);
  onRequestAiGenerateRef.current = onRequestAiGenerate;

  const isGeneratingPropsRef = useRef(isGenerating);
  isGeneratingPropsRef.current = isGenerating;

  // Real-time stopwatch timer for AI processing countdown/up counting in seconds
  useEffect(() => {
    const isInferring = isGenerating || isGeneratingModelLive;
    if (isInferring) {
      if (inferenceStartTimeRef.current === null) {
        inferenceStartTimeRef.current = performance.now();
      }
      setInferenceTimeSec(0);
      inferenceTimeSecRef.current = 0;

      if (inferenceTimerIntervalRef.current) {
        clearInterval(inferenceTimerIntervalRef.current);
      }
      inferenceTimerIntervalRef.current = setInterval(() => {
        if (inferenceStartTimeRef.current !== null) {
          const elapsed = (performance.now() - inferenceStartTimeRef.current) / 1000;
          inferenceTimeSecRef.current = elapsed;
          setInferenceTimeSec(elapsed);
        }
      }, 100);
    } else {
      if (inferenceTimerIntervalRef.current) {
        clearInterval(inferenceTimerIntervalRef.current);
        inferenceTimerIntervalRef.current = null;
      }
      if (inferenceStartTimeRef.current !== null) {
        const finalDuration = (performance.now() - inferenceStartTimeRef.current) / 1000;
        setLastInferenceDuration(finalDuration);
        inferenceStartTimeRef.current = null;
      }
      setInferenceTimeSec(0);
      inferenceTimeSecRef.current = 0;
    }

    return () => {
      if (inferenceTimerIntervalRef.current) {
        clearInterval(inferenceTimerIntervalRef.current);
      }
    };
  }, [isGenerating, isGeneratingModelLive]);

  // Load / Update AI Model Texture when activeAiResultUrl changes
  useEffect(() => {
    if (activeAiResultUrl) {
      loadAiModelResult(activeAiResultUrl);
    }
  }, [activeAiResultUrl]);

  // Auto-sync re-inference when hairstyle or color changes while camera is active
  const lastHairstyleKeyRef = useRef<string | null>(null);
  const lastColorKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const styleKey = selectedHairstyle ? `${selectedHairstyle.id}_${selectedHairstyle.shapeReference}` : null;
    const colorKey = selectedColor ? `${selectedColor.id}_${selectedColor.value}_${selectedColor.colorReference}` : "no_color";

    const hairChanged = styleKey !== lastHairstyleKeyRef.current && lastHairstyleKeyRef.current !== null;
    const colorChanged = colorKey !== lastColorKeyRef.current && lastColorKeyRef.current !== null;

    lastHairstyleKeyRef.current = styleKey;
    lastColorKeyRef.current = colorKey;

    if (hairChanged || colorChanged) {
      // Clear old model overlay when user selects a new style or color
      aiModelImageRef.current = null;
      setIsAiModelLoaded(false);

      if (isCameraActive && isAutoSyncEnabled) {
        // Clear previous error and request fresh countdown re-capture
        setModelErrorMessage(null);
        isCaptureRequestedRef.current = true;
        countdownStartTimestampRef.current = null;
        lastTickSecondRef.current = null;
      }
    }
  }, [
    selectedHairstyle?.id,
    selectedHairstyle?.shapeReference,
    selectedColor?.id,
    selectedColor?.value,
    selectedColor?.colorReference,
    isCameraActive,
    isAutoSyncEnabled,
  ]);

  // Initialize MediaPipe Face Landmarker for VIDEO and IMAGE modes
  const initFaceLandmarkers = async () => {
    if (videoLandmarkerRef.current && imageLandmarkerRef.current) {
      return {
        video: videoLandmarkerRef.current,
        image: imageLandmarkerRef.current,
      };
    }

    setIsLoadingLandmarker(true);
    setLandmarkerError(null);
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );

      const [videoLandmarker, imageLandmarker] = await Promise.all([
        FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1,
        }),
        FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          outputFaceBlendshapes: false,
          runningMode: "IMAGE",
          numFaces: 1,
        }),
      ]);

      videoLandmarkerRef.current = videoLandmarker;
      imageLandmarkerRef.current = imageLandmarker;
      setIsLoadingLandmarker(false);
      return { video: videoLandmarker, image: imageLandmarker };
    } catch (err: any) {
      console.error("MediaPipe Face Landmarker initialization failed:", err);
      const msg = "ไม่สามารถโหลดระบบตรวจจับใบหน้าได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
      setLandmarkerError(msg);
      setIsLoadingLandmarker(false);
      onError(msg);
      return null;
    }
  };

  // Start Webcam stream immediately without waiting for landmarker download
  const startCamera = async () => {
    try {
      primeAudioContext();
      onError("");
      setModelErrorMessage(null);

      // Kick off landmarkers initialization in background concurrently
      const landmarkersPromise = initFaceLandmarkers();

      // Immediately request camera stream so user sees the camera turn on right away!
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(async () => {
            setIsCameraActive(true);
            setHasCameraPermission(true);
            onCaptureReady(videoRef.current);
            onCameraToggle?.(true);
            countdownStartTimestampRef.current = null;
            lastTickSecondRef.current = null;
            setCountdownRemainingSec(null);
            isAutoInferenceTriggeredRef.current = false;

            // Once landmarkers finish in background, start tracking loop
            await landmarkersPromise;
            startTrackingLoop();
          });
        };
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setHasCameraPermission(false);
      setIsCameraActive(false);
      onError("กรุณาอนุญาตให้แอปพลิเคชันเข้าถึงกล้องถ่ายภาพของคุณ");
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    try {
      localStorage.removeItem("hfar_camera_user_enabled");
    } catch {}
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    onCaptureReady(null);
    onCameraToggle?.(false);
    countdownStartTimestampRef.current = null;
    lastTickSecondRef.current = null;
    setCountdownRemainingSec(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (inferenceTimerIntervalRef.current) {
      clearInterval(inferenceTimerIntervalRef.current);
      inferenceTimerIntervalRef.current = null;
    }

    const resetData: FaceTrackingData = {
      centerX: 0.5,
      centerY: 0.5,
      width: 0.3,
      height: 0.4,
      roll: 0,
      foreheadY: 0.3,
      isFaceValid: false,
      message: "ไม่พบใบหน้า",
    };
    trackingDataRef.current = resetData;
    onFaceTracked(resetData);
  };

  // Preload landmarkers in background on mount
  useEffect(() => {
    initFaceLandmarkers();
  }, []);

  // Auto start camera if enabled
  useEffect(() => {
    if (autoStart && !isCameraActive && hasCameraPermission !== false) {
      startCamera();
    }
  }, [autoStart]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoLandmarkerRef.current) {
        videoLandmarkerRef.current.close();
      }
      if (imageLandmarkerRef.current) {
        imageLandmarkerRef.current.close();
      }
      if (inferenceTimerIntervalRef.current) {
        clearInterval(inferenceTimerIntervalRef.current);
      }
    };
  }, []);

  // Process and load AI Model generated image result as live warp texture
  const loadAiModelResult = async (imageUrl: string) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });

      aiModelImageRef.current = img;

      // Extract base facial landmarks from the AI generated portrait
      const imgLandmarker = imageLandmarkerRef.current || (await initFaceLandmarkers())?.image;
      if (imgLandmarker) {
        const detection = imgLandmarker.detect(img);
        if (detection.faceLandmarks && detection.faceLandmarks.length > 0) {
          const rawLandmarks = detection.faceLandmarks[0];
          aiModelRawLandmarksRef.current = rawLandmarks;
          const anchorPts = extractAnchorPoints(rawLandmarks, img.width, img.height);
          aiModelLandmarksRef.current = anchorPts;

          // Create soft feathered head mask isolating head/upper head (ส่วนครึ่งหัวหรือส่วนหัว)
          const maskCanvas = createFeatheredHeadMaskCanvas(img, rawLandmarks, featherRadius);
          aiModelMaskCanvasRef.current = maskCanvas;
        } else {
          aiModelRawLandmarksRef.current = null;
          // Fallback anchor box if landmarks not found in generated image
          aiModelLandmarksRef.current = [
            { x: img.width * 0.38, y: img.height * 0.42 },
            { x: img.width * 0.45, y: img.height * 0.42 },
            { x: img.width * 0.62, y: img.height * 0.42 },
            { x: img.width * 0.55, y: img.height * 0.42 },
            { x: img.width * 0.5, y: img.height * 0.52 },
            { x: img.width * 0.5, y: img.height * 0.46 },
            { x: img.width * 0.42, y: img.height * 0.64 },
            { x: img.width * 0.58, y: img.height * 0.64 },
            { x: img.width * 0.5, y: img.height * 0.78 },
            { x: img.width * 0.5, y: img.height * 0.2 },
            { x: img.width * 0.28, y: img.height * 0.48 },
            { x: img.width * 0.72, y: img.height * 0.48 },
          ];
          aiModelMaskCanvasRef.current = createFeatheredHeadMaskCanvas(img, [], featherRadius);
        }
      }

      setIsAiModelLoaded(true);
      isAiModelLoadedRef.current = true;
      setIsLiveAiWarpEnabled(true);
      isLiveAiWarpEnabledRef.current = true;
      setIsAutoCountdownActive(true);
      isAutoCountdownActiveRef.current = true;
      // 4-second grace period after generation so user can view result and press stop without instant re-capture
      postGenerationCooldownUntilRef.current = Date.now() + 4000;
      setModelErrorMessage(null);
    } catch (err) {
      console.error("Failed to load AI model texture for real-time warp:", err);
    }
  };

  // Trigger background re-inference using current stable webcam frame
  const triggerBackgroundLiveInference = async () => {
    const generateFn = onRequestAiGenerateRef.current || onRequestAiGenerate;
    if (!videoRef.current || isGeneratingModelLive || !generateFn) return;

    // Safety check: ensure camera video is active and a valid face is detected in the frame
    if (!trackingDataRef.current.isFaceValid) {
      console.log("Skipping background re-inference: No valid face currently tracked in camera frame.");
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      return;
    }

    const currentStyle = selectedHairstyleRef.current;
    const currentColor = selectedColorRef.current;

    const startTime = Date.now();
    try {
      setIsGeneratingModelLive(true);
      onGeneratingLiveChange?.(true);
      setModelErrorMessage(null);
      setInferenceTimeSec(0);

      // Start stopwatch timer
      if (inferenceTimerIntervalRef.current) clearInterval(inferenceTimerIntervalRef.current);
      inferenceTimerIntervalRef.current = setInterval(() => {
        setInferenceTimeSec((Date.now() - startTime) / 1000);
      }, 100);

      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = video.videoWidth || 640;
      snapCanvas.height = video.videoHeight || 480;
      const sCtx = snapCanvas.getContext("2d");
      if (!sCtx) return;

      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = "high";
      // Mirror horizontally so the captured photo and AI result match what the user sees in the camera preview (ไม่สลับฝั่งหน้าเรา)
      sCtx.save();
      sCtx.translate(snapCanvas.width, 0);
      sCtx.scale(-1, 1);
      sCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      sCtx.restore();
      try {
        const snapPreview = snapCanvas.toDataURL("image/jpeg", 0.9);
        setLiveProcessingPhoto(snapPreview);
      } catch (e) {}

      const blob = await new Promise<Blob | null>((resolve) =>
        snapCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.95)
      );

      if (blob) {
        const newResultUrl = await generateFn(blob, currentStyle, currentColor);
        if (newResultUrl) {
          await loadAiModelResult(newResultUrl);
          const duration = (Date.now() - startTime) / 1000;
          setLastInferenceDuration(duration);
        }
      }
    } catch (e: any) {
      console.warn("Background AI hairstyle generation error:", e);
      const errMsg = e?.message || "ไม่สามารถประมวลผลทรงผมได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
      setModelErrorMessage(sanitizeUserErrorMessage(errMsg));
    } finally {
      if (inferenceTimerIntervalRef.current) {
        clearInterval(inferenceTimerIntervalRef.current);
        inferenceTimerIntervalRef.current = null;
      }
      setIsGeneratingModelLive(false);
      onGeneratingLiveChange?.(false);
    }
  };

  // High-Frequency Real-Time Tracking & AI Model Warp Loop (60 FPS)
  const startTrackingLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const run = () => {
      if (!videoRef.current || !displayCanvasRef.current || !videoLandmarkerRef.current) {
        animationFrameRef.current = requestAnimationFrame(run);
        return;
      }

      const video = videoRef.current;
      const canvas = displayCanvasRef.current;
      const ctx = canvas.getContext("2d");

      if (video.paused || video.ended || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(run);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      let liveRawLandmarks;
      try {
        const result = videoLandmarkerRef.current.detectForVideo(video, performance.now());
        if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
          liveRawLandmarks = result.faceLandmarks[0];
          latestLiveLandmarksRef.current = liveRawLandmarks;
        } else {
          latestLiveLandmarksRef.current = null;
        }
      } catch (e) {
        console.error("Error in real-time landmark tracking:", e);
      }

      // Check alignment status
      const alignStatus = checkFaceAlignment(liveRawLandmarks || null);
      setAlignmentStatus(alignStatus);

      // Countdown handling: When auto-countdown circle mode is ON, face is aligned inside the circle, not generating, and not in post-gen cooldown
      const isCurrentlyInferring =
        isGeneratingModelLiveRef.current ||
        isGeneratingPropsRef.current ||
        isAutoInferenceTriggeredRef.current;
      const isAutoCountdown = isAutoCountdownActiveRef.current;
      const isModelLoaded = isAiModelLoadedRef.current;
      const isInCooldown = Date.now() < postGenerationCooldownUntilRef.current;

      // Do NOT count down or capture if model is currently inferring/processing or in cooldown
      // เมื่อได้ผลลัพธ์แล้วและปิดตาอยู่ (!isLiveAiWarpEnabled): วงกลมจะหาย และไม่จับเวลา ไม่ส่งผลเข้าโมเดล จนกว่าจะเปิดตา
      const hasAiResult = isModelLoaded || Boolean(activeAiResultUrl);
      const isEyeClosed = hasAiResult && !isLiveAiWarpEnabledRef.current;

      const needsCapture =
        isAutoCountdown &&
        !isEyeClosed &&
        !isCurrentlyInferring &&
        !isInCooldown;

      if (alignStatus.isAligned && needsCapture) {
        if (countdownStartTimestampRef.current === null) {
          countdownStartTimestampRef.current = performance.now();
          lastTickSecondRef.current = null;
        }

        const elapsed = performance.now() - countdownStartTimestampRef.current;
        const remainingMs = Math.max(0, COUNTDOWN_DURATION_MS - elapsed);
        const currentSec = Math.ceil(remainingMs / 1000);
        const remainingSecFloat = remainingMs / 1000;

        if (currentSec !== lastTickSecondRef.current && currentSec > 0) {
          lastTickSecondRef.current = currentSec;
          playCountdownTickSound(currentSec === 1);
        }

        setCountdownRemainingSec(remainingSecFloat);

        if (elapsed >= COUNTDOWN_DURATION_MS && !isAutoInferenceTriggeredRef.current) {
          isAutoInferenceTriggeredRef.current = true;
          flashOpacityRef.current = 1.0;
          playCameraShutterSound();
          isCaptureRequestedRef.current = false;
          countdownStartTimestampRef.current = null;
          lastTickSecondRef.current = null;
          setCountdownRemainingSec(null);

          triggerBackgroundLiveInference().finally(() => {
            isAutoInferenceTriggeredRef.current = false;
          });
        }
      } else {
        if (countdownStartTimestampRef.current !== null) {
          countdownStartTimestampRef.current = null;
          lastTickSecondRef.current = null;
          setCountdownRemainingSec(null);
        }
      }

      // Process standard tracking data
      const currentTracking = processFaceLandmarks(
        liveRawLandmarks,
        trackingDataRef.current,
        0.32
      );
      trackingDataRef.current = currentTracking;

      // Render onto display canvas
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw live video feed in mirror view (selfie mirror perspective)
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const currentAiImg = aiModelImageRef.current;
        // เมื่อมีผลลัพธ์จากโมเดลแล้ว แสดงรูปผลลัพธ์เต็มๆ แทนใบหน้าจริงเรา โดยติดตามตำแหน่งใบหน้าจริงแบบเรียลไทม์ 60 FPS
        // ไม่ต้องเบลอแล้ว แสดงผลลัพธ์เต็มๆ คมชัด ไม่สลับฝั่ง (ตรงกับภาพเซลฟี่ที่เห็นในกระจกและรูปถ่าย)
        // เมื่อกดปิดตา: วงกลมตรวจจับจะหายไป แต่รูปผลลัพธ์เต็มที่แทนใบหน้าเรายังคงอยู่เหมือนเดิม
        if (currentAiImg && isAiModelLoadedRef.current) {
          if (liveRawLandmarks && liveRawLandmarks.length > 0) {
            drawWarpedAiModelResult(ctx, canvas.width, canvas.height, liveRawLandmarks);
          } else if (lastTransformRef.current) {
            const modelTexture = currentAiImg;
            const { a, b, c, d, tx, ty } = lastTransformRef.current;
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.globalAlpha = 1.0;
            ctx.transform(a, b, c, d, tx, ty);
            ctx.drawImage(modelTexture, 0, 0);
            ctx.restore();
          }
        }

        // 3. Draw Framing Guide & Boundary on screen
        const isCountingDown =
          alignStatus.isAligned &&
          countdownStartTimestampRef.current !== null &&
          !isCurrentlyInferring &&
          !isEyeClosed;
        const elapsed = isCountingDown && countdownStartTimestampRef.current
          ? performance.now() - countdownStartTimestampRef.current
          : 0;
        const remainingSec = isCountingDown
          ? Math.max(0, (COUNTDOWN_DURATION_MS - elapsed) / 1000)
          : 0;

        // Keep alignment circle visible in auto-countdown mode so user has their guide
        // เมื่อกดปิดตา: วงกลมจะหายไปทันทีตามที่ผู้ใช้สั่ง ("เพื่อเรากดปุ่มตาคือวงกลมจะหาย")
        const showAlignmentGuide = isAutoCountdown && !isEyeClosed;

        // Compute live, accurate real-time inference elapsed seconds on every 60fps frame
        if (isCurrentlyInferring) {
          if (inferenceStartTimeRef.current === null) {
            inferenceStartTimeRef.current = performance.now();
          }
        }
        const liveInferenceTime = isCurrentlyInferring && inferenceStartTimeRef.current !== null
          ? (performance.now() - inferenceStartTimeRef.current) / 1000
          : inferenceTimeSecRef.current;

        flashOpacityRef.current = drawCameraOverlay({
          ctx,
          width: canvas.width,
          height: canvas.height,
          status: alignStatus,
          isCountingDown,
          countdownRemainingSec: remainingSec,
          countdownDurationMs: COUNTDOWN_DURATION_MS,
          countdownStartTimestamp: countdownStartTimestampRef.current,
          isGeneratingModelLive: isCurrentlyInferring,
          inferenceTimeSec: liveInferenceTime,
          isAiModelLoaded: isModelLoaded,
          isLiveAiWarpEnabled: isLiveAiWarpEnabledRef.current,
          showAlignmentGuide,
          flashOpacity: flashOpacityRef.current,
        });
      }

      onFaceTracked(currentTracking);
      animationFrameRef.current = requestAnimationFrame(run);
    };

    animationFrameRef.current = requestAnimationFrame(run);
  };

  // Real-Time 60 FPS Mathematical Warp Function (Exact 1:1 Face Scale Tracking)
  const drawWarpedAiModelResult = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    liveRawLandmarks: Array<{ x: number; y: number; z?: number }>
  ) => {
    const srcAnchors = aiModelLandmarksRef.current;
    // แสดงรูปผลลัพธ์เต็มๆ โดยตรง ไม่เบลอขอบ คมชัดเท่ากับกล้องสด
    const modelTexture = aiModelImageRef.current;
    if (!srcAnchors || !modelTexture || !liveRawLandmarks) return;

    // Convert live landmarks to screen pixel space in mirrored selfie coordinates (ไม่สลับฝั่ง)
    const dstAnchors: Point2D[] = extractMirroredScreenAnchorPoints(liveRawLandmarks, canvasWidth, canvasHeight);

    // Compute mathematical affine transformation (srcAnchors -> dstAnchors)
    const rawTransform = estimateSimilarityTransform(srcAnchors, dstAnchors);
    const smoothedTransform = smoothTransform(lastTransformRef.current, rawTransform, 0.4);
    lastTransformRef.current = smoothedTransform;

    const { a, b, c, d, tx, ty } = smoothedTransform;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 1.0;

    // Apply affine matrix transform in natural space
    ctx.transform(a, b, c, d, tx, ty);

    // วาดภาพผลลัพธ์เต็มๆ คมชัด แทนตำแหน่งใบหน้าจริงแบบ 1:1
    ctx.drawImage(modelTexture, 0, 0);

    ctx.restore();
  };

  // Toggle countdown circle mode: Stop = hide circle, free tracking; Open = show circle, 5s countdown
  const handleToggleCountdownCircle = () => {
    if (isGeneratingModelLiveRef.current) return;
    setIsAutoCountdownActive((prev) => {
      const next = !prev;
      isAutoCountdownActiveRef.current = next;
      if (next) {
        // Open circle -> prepare for countdown
        postGenerationCooldownUntilRef.current = 0;
        isCaptureRequestedRef.current = true;
        countdownStartTimestampRef.current = null;
        lastTickSecondRef.current = null;
      } else {
        // Stop circle -> free tracking everywhere, no countdown or capture
        isCaptureRequestedRef.current = false;
        countdownStartTimestampRef.current = null;
        lastTickSecondRef.current = null;
        setCountdownRemainingSec(null);
      }
      return next;
    });
  };

  // Manual Trigger to Generate AI Model with 5s photo countdown
  const handleStartLiveAiSwap = async () => {
    if (!videoRef.current || !onRequestAiGenerate || isGeneratingModelLiveRef.current) return;
    setIsAutoCountdownActive(true);
    isAutoCountdownActiveRef.current = true;
    postGenerationCooldownUntilRef.current = 0;
    isCaptureRequestedRef.current = true;
    countdownStartTimestampRef.current = null;
    lastTickSecondRef.current = null;
  };

  // Helper to draw elegant LOOKLAB watermark on any canvas
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
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText("LOOKLAB", w - 24, h - 22);
    ctx.restore();
  };

  // 1. Snapshot and Download Live Camera Photo WITHOUT face detection circle / alignment overlay
  // ("แต่ถ้าถ่ายในนั้นจะไม่เอาวงกลมตรวจหน้ามานะ")
  const handleDownloadCleanRealtimeSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      onError("กล้องยังไม่พร้อมสำหรับการถ่ายภาพ กรุณารอสักครู่");
      return;
    }

    // Camera flash effect on screen & shutter click sound
    flashOpacityRef.current = 1.0;
    playCameraShutterSound();

    // Create high-res offscreen canvas matching native video stream dimensions
    const cleanCanvas = document.createElement("canvas");
    cleanCanvas.width = video.videoWidth;
    cleanCanvas.height = video.videoHeight;
    const ctx = cleanCanvas.getContext("2d");
    if (!ctx) return;

    // 1. Mirror Context for natural selfie perspective
    ctx.save();
    ctx.translate(cleanCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, cleanCanvas.width, cleanCanvas.height);
    ctx.restore();

    // 2. Render warped AI model result in screen coordinates (ไม่สลับฝั่ง)
    const currentAiImg = aiModelImageRef.current;
    if (currentAiImg && isAiModelLoadedRef.current) {
      const liveLandmarks = latestLiveLandmarksRef.current || trackingDataRef.current?.rawLandmarks;
      if (liveLandmarks && liveLandmarks.length > 0) {
        drawWarpedAiModelResult(ctx, cleanCanvas.width, cleanCanvas.height, liveLandmarks);
      } else if (lastTransformRef.current) {
        const modelTexture = currentAiImg;
        const { a, b, c, d, tx, ty } = lastTransformRef.current;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.globalAlpha = 1.0;
        ctx.transform(a, b, c, d, tx, ty);
        ctx.drawImage(modelTexture, 0, 0);
        ctx.restore();
      }
    }

    // 3. NOTICE: We deliberately DO NOT call drawCameraOverlay!
    // Absolute guarantee: ZERO face detection circle, ZERO oval guide, ZERO status badges, ZERO countdown numbers!

    // 4. Draw optional watermark
    if (includeWatermark) {
      drawWatermarkOnCanvas(ctx, cleanCanvas.width, cleanCanvas.height);
    }

    // 5. Download clean image
    cleanCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const hairName = selectedHairstyle?.name
          ? selectedHairstyle.name.split(" (")[0].replace(/[^a-zA-Z0-9\u0E00-\u0E7F_-]/g, "_")
          : "style";
        a.download = `LOOKLAB-Realtime-Camera-${hairName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Feedback toast notification
        setSavedToastMessage("บันทึกภาพนิ่งเรียลไทม์สำเร็จ (ไม่ติดวงกลมตรวจหน้า)");
        setTimeout(() => setSavedToastMessage(null), 3500);
      },
      "image/jpeg",
      0.95
    );
  };

  // 2. Download Model Generated Result (ปุ่มบันทึกรูปผลลัพธ์ที่ได้จากโมเดล)
  const handleDownloadModelResult = () => {
    const targetUrl = activeAiResultUrl || (aiModelImageRef.current ? aiModelImageRef.current.src : null);
    if (!targetUrl) {
      onError("ยังไม่มีรูปผลลัพธ์จากโมเดล กรุณากดสร้างลุคใหม่ก่อน");
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = targetUrl;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 1024;
      c.height = img.naturalHeight || 1024;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        if (includeWatermark) {
          drawWatermarkOnCanvas(ctx, c.width, c.height);
        }
        c.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const hairName = selectedHairstyle?.name
              ? selectedHairstyle.name.split(" (")[0].replace(/[^a-zA-Z0-9\u0E00-\u0E7F_-]/g, "_")
              : "model";
            a.download = `LOOKLAB-Model-${hairName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setSavedToastMessage("บันทึกรูปผลลัพธ์จากโมเดลสำเร็จ");
            setTimeout(() => setSavedToastMessage(null), 3500);
          },
          "image/png",
          0.98
        );
      }
    };
  };

  // Register parent handlers for external triggering if needed
  useEffect(() => {
    onRegisterCleanSnapshot?.(handleDownloadCleanRealtimeSnapshot);
  }, [onRegisterCleanSnapshot, includeWatermark, selectedHairstyle]);

  useEffect(() => {
    onRegisterModelDownload?.(handleDownloadModelResult);
  }, [onRegisterModelDownload, activeAiResultUrl, includeWatermark, selectedHairstyle]);

  // Capture current frame for Uploaded Photo mode
  const handleCaptureToUploadMode = () => {
    const canvas = displayCanvasRef.current;
    if (!canvas || !onImageUpload) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    onImageUpload(dataUrl);
  };

  return (
    <div className="relative w-full h-full bg-[#432B25] overflow-hidden">
      {/* Hidden Video Feed Source */}
      <video
        ref={videoRef}
        id="camera-video"
        className="hidden"
        playsInline
        muted
      />

      {/* Main Display Canvas (Video or Full AI Model Result at Camera Resolution) */}
      <canvas
        ref={displayCanvasRef}
        id="camera-canvas"
        className="absolute inset-0 w-full h-full object-cover object-center block"
      />

      {/* Off-State Overlay when camera is stopped */}
      {!isCameraActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 text-center bg-[#FFF8F4] text-[#432B25] z-20 overflow-y-auto">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-[#FFE3D5] rounded-full flex items-center justify-center mb-2.5 text-[#F27D68] border border-[#EFDCD3] shadow-xs shrink-0">
            <Camera size={20} className="sm:w-5 sm:h-5 text-[#F27D68]" />
          </div>
          <h3 className="font-brand text-base sm:text-lg font-bold text-[#432B25] mb-1">
            กล้องสดลองทรงผมเรียลไทม์
          </h3>
          <p className="text-[#80665D] text-[11px] sm:text-xs max-w-[280px] sm:max-w-xs mb-3.5 sm:mb-4 leading-relaxed">
            เปิดกล้องแล้วจัดตำแหน่งใบหน้าให้อยู่ในกรอบ ระบบจะตรวจจับและสลับทรงผมให้คุณเห็นทันทีแบบเรียลไทม์
          </p>
          <div className="flex flex-row flex-wrap items-center justify-center gap-2 max-w-full px-2">
            <button
              id="btn-open-camera"
              onClick={startCamera}
              disabled={isLoadingLandmarker}
              className="h-8.5 sm:h-9 px-3.5 sm:px-4 rounded-full bg-[#F27D68] hover:bg-[#E96A55] text-white font-semibold text-xs shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap shrink-0"
            >
              {isLoadingLandmarker ? (
                <>
                  <Loader2 size={13} className="animate-spin text-white shrink-0" />
                  <span>กำลังโหลดระบบ...</span>
                </>
              ) : (
                <>
                  <Camera size={13} className="shrink-0" />
                  <span>เปิดกล้อง (Camera)</span>
                </>
              )}
            </button>

            {onSwitchToUpload && (
              <button
                type="button"
                onClick={onSwitchToUpload}
                className="h-8.5 sm:h-9 px-3 sm:px-3.5 rounded-full bg-white hover:bg-[#FFE3D5]/50 text-[#80665D] hover:text-[#432B25] font-semibold text-xs border border-[#EFDCD3] shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap shrink-0"
              >
                <Upload size={13} className="shrink-0" />
                <span>สลับไปอัปโหลดรูป</span>
              </button>
            )}
          </div>

          {landmarkerError && (
            <p className="text-[#B64040] text-xs mt-2.5 bg-[#FFE9E1] px-3 py-1.5 rounded-lg border border-[#F27D68]/30 max-w-xs">
              {landmarkerError}
            </p>
          )}
        </div>
      )}

      {/* Camera Top Status Bar (Responsive, locked safely inside container boundaries, matching ImageUploadView) */}
      {isCameraActive && (
        <div className="absolute top-2 sm:top-3 inset-x-2 sm:inset-x-3 flex items-center justify-between gap-1 sm:gap-2 z-30 pointer-events-none">
          {/* Left: Detection Status & Countdown / Inference Timer Badge */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-xs border transition-all duration-200 ${
                isGeneratingModelLive || isGenerating
                  ? "bg-[#F27D68]/95 text-white border-[#F27D68]/80 shadow-orange-500/20"
                  : alignmentStatus.isAligned
                  ? "bg-emerald-600/90 text-white border-emerald-400/80 shadow-emerald-500/20"
                  : "bg-amber-600/90 text-white border-amber-400/80 shadow-amber-500/20"
              }`}
            >
              {isGeneratingModelLive || isGenerating ? (
                <Loader2 size={13} className="shrink-0 text-white animate-spin" />
              ) : alignmentStatus.isAligned ? (
                <CheckCircle2 size={13} className="shrink-0 text-white" />
              ) : (
                <AlertCircle size={13} className="shrink-0 text-white" />
              )}
              <span className="truncate max-w-[150px] sm:max-w-none">
                {isGeneratingModelLive || isGenerating
                  ? `กำลังสร้างภาพทรงผม (${inferenceTimeSec.toFixed(1)}s)`
                  : (isAiModelLoaded || activeAiResultUrl) && !isLiveAiWarpEnabled
                  ? "ซ่อนวงกลมตรวจหน้า (หยุดจับเวลา)"
                  : countdownRemainingSec !== null && countdownRemainingSec > 0
                  ? `ถ่ายภาพใน ${countdownRemainingSec.toFixed(1)}s`
                  : alignmentStatus.isAligned
                  ? (activeAiResultUrl ? "แสดงลุคใหม่เรียลไทม์" : "พร้อมสร้างภาพทรงผม")
                  : alignmentStatus.message || "กรุณาหันหน้าตรง"}
              </span>
            </span>
          </div>

          {/* Right: Face Circle Toggle button (ขึ้นตอนได้ผลลัพธ์แล้วเท่านั้น) & Stop Camera */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end">
            {/* ปุ่มดวงตา: ซ่อน/แสดงวงกลมตรวจจับและตัวนับเวลา (ภาพผลลัพธ์ยังคงแสดงแนบหน้าตามปกติ) */}
            {(isAiModelLoaded || activeAiResultUrl) && (
              <button
                type="button"
                onClick={() => {
                  setIsLiveAiWarpEnabled((prev) => {
                    const next = !prev;
                    isLiveAiWarpEnabledRef.current = next;
                    if (!next) {
                      // เมื่อกดปิดตา: วงกลมจะหาย และไม่จับเวลา ไม่ส่งผลเข้าโมเดล จนกว่าจะเปิดตา
                      // แต่รูปผลลัพธ์เต็มที่แทนใบหน้าเรายังอยู่เหมือนเดิม
                      countdownStartTimestampRef.current = null;
                      lastTickSecondRef.current = null;
                      setCountdownRemainingSec(null);
                    } else {
                      // เมื่อเปิดตากลับมา: ให้เวลาจัดระเบียบ 2 วินาที ก่อนเริ่มนับใหม่เมื่อหันหน้าตรง
                      postGenerationCooldownUntilRef.current = Date.now() + 2000;
                      countdownStartTimestampRef.current = null;
                      lastTickSecondRef.current = null;
                      setCountdownRemainingSec(null);
                    }
                    return next;
                  });
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full backdrop-blur-md shadow-xs border flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0 ${
                  isLiveAiWarpEnabled
                    ? "bg-white/95 text-[#F27D68] border-[#F27D68]/40 ring-1 ring-[#F27D68]/20 shadow-xs"
                    : "bg-white/85 text-[#80665D] border-[#EFDCD3]"
                }`}
                title={
                  isLiveAiWarpEnabled
                    ? "ปิดตา: ซ่อนวงกลมตรวจจับและหยุดจับเวลา (ภาพทรงผมยังแสดงอยู่)"
                    : "เปิดตา: แสดงวงกลมตรวจจับและเริ่มจับเวลาส่งเข้าโมเดล"
                }
                aria-label="เปิด/ปิด วงกลมตรวจจับและตัวจับเวลา"
              >
                {isLiveAiWarpEnabled ? (
                  <Eye size={13} className="text-[#F27D68] shrink-0" />
                ) : (
                  <EyeOff size={13} className="text-[#80665D] shrink-0" />
                )}
              </button>
            )}

            <button
              type="button"
              id="btn-close-camera"
              onClick={stopCamera}
              className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-black/60 hover:bg-black/80 text-white text-[11px] sm:text-xs font-semibold border border-white/20 backdrop-blur-md transition cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
              title="ปิดกล้องถ่ายภาพ (Stop Camera)"
            >
              <CameraOff size={12} className="text-rose-400 shrink-0" />
              <span>ปิดกล้อง</span>
            </button>
          </div>
        </div>
      )}

      {/* Persistent Error Alert if processing is offline or failed */}
      {isCameraActive && modelErrorMessage && (
        <div className="absolute top-14 left-3 right-3 z-30 bg-rose-950/95 border border-rose-600 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">ไม่สามารถประมวลผลทรงผมได้ในขณะนี้</p>
                <p className="text-[11px] text-rose-300 mt-0.5 leading-relaxed">
                  {sanitizeUserErrorMessage(modelErrorMessage)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModelErrorMessage(null)}
              className="text-rose-300 hover:text-white text-xs cursor-pointer p-1"
              title="ปิดแจ้งเตือน"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-900">
            <button
              type="button"
              onClick={triggerBackgroundLiveInference}
              disabled={isGeneratingModelLive}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={12} className={isGeneratingModelLive ? "animate-spin" : ""} />
              <span>ลองใหม่อีกครั้ง</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Tuning Panel */}
      {isCameraActive && showLiveTuning && isAiModelLoaded && (
        <div className="absolute top-14 right-3 z-20 bg-slate-900/95 border border-slate-700 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs w-64 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-1.5">
            <span>การผสมผสานทรงผมเรียลไทม์</span>
            <button
              onClick={() => setShowLiveTuning(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>ความนุ่มของขอบ (Feather):</span>
              <span className="font-bold text-sky-400">{featherRadius}px</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={featherRadius}
              onChange={(e) => {
                const val = Number(e.target.value);
                setFeatherRadius(val);
                if (aiModelImageRef.current) {
                  aiModelMaskCanvasRef.current = createFeatheredHeadMaskCanvas(
                    aiModelImageRef.current,
                    aiModelRawLandmarksRef.current || undefined,
                    val
                  );
                }
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>ความโปร่งใส (Opacity):</span>
              <span className="font-bold text-sky-400">{Math.round(blendOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.0"
              step="0.05"
              value={blendOpacity}
              onChange={(e) => setBlendOpacity(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
            <span>ส่งเข้าโมเดลใหม่เมื่อเปลี่ยนทรงผม:</span>
            <input
              type="checkbox"
              checked={isAutoSyncEnabled}
              onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
              className="accent-blue-500 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Toast Feedback Banner */}
      {savedToastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-[#432B25]/95 text-white border border-[#F27D68]/40 px-4 py-2 rounded-full shadow-lg text-xs font-semibold backdrop-blur-md flex items-center gap-2 animate-fade-in pointer-events-none whitespace-nowrap">
          <CheckCircle2 size={14} className="text-[#47735C]" />
          <span>{savedToastMessage}</span>
        </div>
      )}

      {/* Real-Time Snapshot Button at Bottom-Right (ปุ่มบันทึกภาพไว้ขวามือด้านล่างเพื่อถ่ายภาพนิ่งเรียลไทม์ที่ทดสอบผลลัพธ์) */}
      {isCameraActive && (
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 pointer-events-auto">
          <button
            type="button"
            id="btn-realtime-snapshot"
            onClick={handleDownloadCleanRealtimeSnapshot}
            className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-full bg-white/95 hover:bg-white text-[#432B25] text-xs sm:text-sm font-bold border border-[#EFDCD3] shadow-md hover:shadow-lg backdrop-blur-md transition flex items-center gap-1.5 sm:gap-2 active:scale-95 cursor-pointer ring-1 ring-black/5"
            title="ถ่ายภาพนิ่งเรียลไทม์ที่ทดสอบผลลัพธ์ (สะอาดตา ไม่ติดวงกลมตรวจจับ)"
          >
            <Camera size={15} className="text-[#F27D68] shrink-0" />
            <span>บันทึกภาพนิ่ง</span>
          </button>
        </div>
      )}

    </div>
  );
}
