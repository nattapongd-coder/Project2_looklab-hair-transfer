import { useState, useEffect, useRef, ChangeEvent } from "react";
import { HAIRSTYLES, HAIR_COLORS, parseScannedAssets, normalizeKey, SAMPLE_MODELS } from "./data";
import { Hairstyle, HairColor, FaceTrackingData } from "./types";
import {
  checkHairFastGanConfig,
  generateHairFastResult,
  generateHairFastResultFull,
  HairFastGenerationOutput,
  prefetchReferenceImage,
  warmFacePreparation,
} from "./services/hairFastGanService";
import { captureWebcamFrame, extractColorFromImage } from "./utils/captureUtils";
import { applySavedLayouts, saveHairstyleLayout } from "./utils/appLayoutUtils";
import { createFeedbackContext, FeedbackContext } from "./services/feedbackService";
import { sanitizeUserErrorMessage } from "./utils/sanitizeError";

// Import Components
import Header from "./components/Header";
import TryOnStage, { TryOnStageHandle } from "./components/TryOnStage";
import HairColorSelector from "./components/HairColorSelector";
import HairstyleSelector from "./components/HairstyleSelector";
import CatalogTab from "./components/CatalogTab";
import LoadingResult from "./components/LoadingResult";
import ResultPage from "./components/ResultPage";
import ErrorMessage from "./components/ErrorMessage";
import UserGuideModal from "./components/UserGuideModal";
import FeedbackCard from "./components/FeedbackCard";
import BottomNavigation from "./components/BottomNavigation";
import SelectionSummaryBar from "./components/SelectionSummaryBar";

import {
  Upload,
  Camera,
  CameraOff,
  Sparkles,
  RefreshCw,
  Download,
  Loader2,
  Trash2,
  BookOpen,
  RotateCcw,
} from "lucide-react";

export default function App() {
  // Navigation Tab State ("try-on" | "catalog")
  const [activeTab, setActiveTab] = useState<"try-on" | "catalog">("try-on");

  // Source mode: "upload" (default) or "camera"
  const [sourceMode, setSourceMode] = useState<"upload" | "camera">(() => {
    try {
      return localStorage.getItem("hfar_camera_user_enabled") === "true" ? "camera" : "upload";
    } catch {
      return "upload";
    }
  });

  // Stateful lists for hairstyles and hair colors
  const [hairstyles, setHairstyles] = useState<Hairstyle[]>(() => applySavedLayouts(HAIRSTYLES));
  const [hairColors, setHairColors] = useState<HairColor[]>(HAIR_COLORS);

  // Selection State
  const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle | null>(() => {
    const initialStyles = applySavedLayouts(HAIRSTYLES);
    return initialStyles.find((s) => s.id === "h01-long-waves-curtain-bangs") || initialStyles[0] || null;
  });
  const [selectedColor, setSelectedColor] = useState<HairColor | null>(null);

  // Sync ref mirrors for latest state access in async operations
  const selectedHairstyleRef = useRef<Hairstyle | null>(selectedHairstyle);
  selectedHairstyleRef.current = selectedHairstyle;

  const selectedColorRef = useRef<HairColor | null>(selectedColor);
  selectedColorRef.current = selectedColor;

  // Tracking & Camera States
  const [faceTracking, setFaceTracking] = useState<FaceTrackingData>({
    centerX: 0.5,
    centerY: 0.5,
    width: 0.3,
    height: 0.4,
    roll: 0,
    foreheadY: 0.3,
    isFaceValid: false,
    message: "พร้อมสำหรับประมวลผล",
  });
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Uploaded Image State: Starts null on fresh visit so user must upload anew every time
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Saved previous photo stored in localStorage of this device only ("เก็บอันเดิมไว้ในเครื่องนี้ เครื่องใครเครื่องมัน")
  const [savedPreviousImage, setSavedPreviousImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem("hfar_saved_image") || null;
    } catch {
      return null;
    }
  });

  // Independent AI Result States
  const [uploadAiResultUrl, setUploadAiResultUrl] = useState<string | null>(null);
  const [cameraAiResultUrl, setCameraAiResultUrl] = useState<string | null>(null);

  // Genuine user original face file/blob (NEVER aligned face or HairFastGAN intermediate output)
  const [originalInputFile, setOriginalInputFile] = useState<File | Blob | null>(null);

  // Automatically prime originalInputFile Blob when uploadedImage changes
  useEffect(() => {
    if (uploadedImage) {
      imageToBlob(uploadedImage)
        .then((blob) => {
          if (blob) {
            setOriginalInputFile(blob);
            // Compress the photo for upload in the background so "generate" can send it immediately
            warmFacePreparation(blob);
          }
        })
        .catch((err) => {
          console.warn("Failed to prime originalInputFile blob from image:", err);
        });
    } else {
      setOriginalInputFile(null);
    }
  }, [uploadedImage]);

  // Active AI generation output with all result keys and performance timing
  const [generationOutput, setGenerationOutput] = useState<HairFastGenerationOutput | null>(null);
  const [feedbackContext, setFeedbackContext] = useState<FeedbackContext | null>(null);
  const [activeResultKey, setActiveResultKey] = useState<string>("hairfast");
  // Feedback Questionnaire Modal Window ("หน้าต่างขึ้นมาให้กรอก กรอกเสร็จค่อยกลับมาหน้าหลัก")
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);

  const tryOnStageRef = useRef<TryOnStageHandle | null>(null);

  const handleImageUpload = (dataUrl: string) => {
    setUploadedImage(dataUrl);
    setUploadAiResultUrl(null);
    setGenerationOutput(null);
    setFeedbackContext(null);
    setGlobalError("");
    if (dataUrl) {
      imageToBlob(dataUrl).then((blob) => {
        if (blob) setOriginalInputFile(blob);
      });
      try {
        // บันทึกรูปเดิมไว้ใน localStorage ของเครื่องนี้ (เครื่องใครเครื่องมัน ไม่ส่งให้คนอื่น)
        localStorage.setItem("hfar_saved_image", dataUrl);
        setSavedPreviousImage(dataUrl);
      } catch (e) {
        console.warn("Failed to save uploaded image to localStorage:", e);
      }
    } else {
      setOriginalInputFile(null);
    }
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    setCapturedImageUrl("");
    setUploadAiResultUrl(null);
    setOriginalInputFile(null);
    setGenerationOutput(null);
    setFeedbackContext(null);
    setGlobalError("");
  };

  // App Phase/Workflow State
  const [appStep, setAppStep] = useState<"ar" | "result">("ar");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLiveGenerating, setIsLiveGenerating] = useState(false);
  const [generatingElapsedSec, setGeneratingElapsedSec] = useState<number>(0);
  const [globalError, setGlobalError] = useState("");

  const isCurrentlyGenerating = isGenerating || isLiveGenerating;

  // Real-time stopwatch timer for AI processing countdown/up in seconds
  useEffect(() => {
    if (!isCurrentlyGenerating) {
      setGeneratingElapsedSec(0);
      return;
    }
    const startTime = performance.now();
    setGeneratingElapsedSec(0);
    // 100 ms is enough for the 0.1 s display; 50 ms re-rendered the whole App 20x per second
    const interval = setInterval(() => {
      setGeneratingElapsedSec((performance.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [isCurrentlyGenerating]);

  // Wake the RunPod worker while the user is still on the page (avoids the 30-90 s cold start on
  // the first generation). Pings on open, when the tab becomes visible again, and every 3 minutes
  // while the tab is visible so the worker is not scaled down while someone is using the site.
  useEffect(() => {
    let lastPing = 0;
    const ping = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastPing < 60000) return;
      lastPing = Date.now();
      fetch("/api/hairfastgan/warmup").catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 3 * 60 * 1000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  // Abort controller of the running generation (used by the "cancel" button)
  const generationAbortRef = useRef<AbortController | null>(null);

  // Warm the reference-image cache as soon as the user picks a style / color,
  // so the upload is ready by the time they press "generate"
  useEffect(() => {
    if (selectedHairstyle && selectedHairstyle.id !== "original_style") {
      prefetchReferenceImage(selectedHairstyle.shapeReference);
    }
  }, [selectedHairstyle?.shapeReference]);

  useEffect(() => {
    if (selectedColor?.colorReference) {
      prefetchReferenceImage(selectedColor.colorReference);
    }
  }, [selectedColor?.colorReference]);

  // RunPod endpoint status (configured on the server in .env)
  const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);
  const [serverUrlInput, setServerUrlInput] = useState("");

  // User Guide Modal: opens automatically on first visit unless "Don't show again" was checked
  const [showGuideModal, setShowGuideModal] = useState<boolean>(() => {
    try {
      return localStorage.getItem("hfar_hide_welcome_guide") !== "true";
    } catch {
      return true;
    }
  });

  const handleSetDontShowGuideAgain = (dontShow: boolean) => {
    try {
      if (dontShow) {
        localStorage.setItem("hfar_hide_welcome_guide", "true");
      } else {
        localStorage.removeItem("hfar_hide_welcome_guide");
      }
    } catch (e) {
      console.warn("Failed to save guide preference to localStorage:", e);
    }
  };

  // Captured photo URL for result view
  const [capturedImageUrl, setCapturedImageUrl] = useState("");

  // Current active test photo for the user:
  // In upload mode: uploadedImage (the photo uploaded or selected by user)
  // In camera mode: capturedImageUrl only (never leak uploaded photo into camera mode)
  const currentTestPhotoUrl =
    sourceMode === "upload"
      ? (uploadedImage || null)
      : (capturedImageUrl || null);

  // Synchronize "ทรงผมต้นฉบับ" (original_style) thumbnail whenever the test photo changes
  // ("ทรงผมต้นฉบับต้องเปลี่ยนตามรูปที่อัปโหลดตลอดทุกครั้งที่เปลี่ยนรูปทดสอบ")
  useEffect(() => {
    const photoToUse = currentTestPhotoUrl || "";
    setHairstyles((prev) =>
      prev.map((s) =>
        s.id === "original_style"
          ? { ...s, thumbnail: photoToUse }
          : s
      )
    );
    setSelectedHairstyle((prev) => {
      if (prev && prev.id === "original_style") {
        return { ...prev, thumbnail: photoToUse };
      }
      return prev;
    });
  }, [currentTestPhotoUrl]);

  const scrollToCameraStage = () => {
    const stageElem =
      document.getElementById("camera-preview-stage") ||
      document.querySelector("#camera-preview-stage") ||
      document.querySelector("video") ||
      document.querySelector("canvas");

    if (stageElem) {
      const headerOffset = 70;
      const elementPosition = stageElem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });

      stageElem.classList.add("ring-4", "ring-[#F27D68]/60");
      setTimeout(() => {
        stageElem.classList.remove("ring-4", "ring-[#F27D68]/60");
      }, 1800);

      const openCameraBtn = document.getElementById("btn-open-camera");
      if (openCameraBtn) {
        (openCameraBtn as HTMLButtonElement).click();
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSetSourceMode = (mode: "upload" | "camera") => {
    setSourceMode(mode);
    try {
      if (mode === "camera") {
        localStorage.setItem("hfar_camera_user_enabled", "true");
      } else {
        localStorage.removeItem("hfar_camera_user_enabled");
      }
    } catch (e) {}

    // When switching to camera mode, automatically jump and focus on the camera stage
    if (mode === "camera") {
      setTimeout(() => {
        scrollToCameraStage();
      }, 100);
    }
  };

  // Load backend layout configurations & dynamic scanned assets on mount
  useEffect(() => {
    let active = true;

    const fetchConfigAndLayouts = async () => {
      const config = await checkHairFastGanConfig();
      if (active) {
        setIsApiConfigured(config.configured);
        if (config.apiUrl) setServerUrlInput(config.apiUrl);
      }

      let backendLayouts = null;
      try {
        const layoutRes = await fetch("/api/config/layouts");
        if (layoutRes.ok) {
          backendLayouts = await layoutRes.json();
        }
      } catch (e) {
        console.warn("Backend layout config not reached, using defaults:", e);
      }

      if (active && backendLayouts) {
        setHairstyles((prevStyles) => {
          const updated = applySavedLayouts(prevStyles, backendLayouts);
          setSelectedHairstyle((current) => {
            if (!current) return updated[0];
            const found = updated.find(
              (s) => s.id === current.id || normalizeKey(s.name) === normalizeKey(current.name)
            );
            return found || current || updated[0];
          });
          return updated;
        });
      }
    };

    const loadDynamicAssets = async () => {
      try {
        const response = await fetch("/api/assets");
        if (response.ok && active) {
          const scanned = await response.json();
          const { hairstyles: dynamicStyles, hairColors: dynamicColors } = parseScannedAssets(scanned);

          if (dynamicStyles.length > 0 && active) {
            const stylesWithSaved = applySavedLayouts(dynamicStyles);
            setHairstyles(stylesWithSaved);
            setSelectedHairstyle((prev) => {
              if (!prev) return stylesWithSaved[0];
              const found = stylesWithSaved.find(
                (s) => s.id === prev.id || normalizeKey(s.name) === normalizeKey(prev.name)
              );
              return found || prev || stylesWithSaved[0];
            });
          }

          if (dynamicColors.length > 0 && active) {
            const extractedColors = await Promise.all(
              dynamicColors.map(async (color) => {
                // parseScannedAssets() marks unknown colors with "#777777" (was compared to "#888888", so this never ran)
                if ((color.value === "#777777" || color.value === "#888888") && color.colorReference) {
                  const extractedHex = await extractColorFromImage(color.colorReference);
                  return { ...color, value: extractedHex };
                }
                return color;
              })
            );

            if (active) {
              setHairColors(extractedColors);
              setSelectedColor((prev) => {
                if (!prev) return null;
                const found = extractedColors.find((c) => c.id === prev.id);
                return found || prev;
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load scanned assets:", err);
      }
    };

    fetchConfigAndLayouts();
    loadDynamicAssets();

    return () => {
      active = false;
    };
  }, []);

  // Update layout parameters for fine-tuning & persist to backend API
  const handleUpdateHairstyleLayout = async (updatedStyle: Hairstyle) => {
    setSelectedHairstyle(updatedStyle);
    setHairstyles((prev) => prev.map((s) => (s.id === updatedStyle.id ? updatedStyle : s)));
    await saveHairstyleLayout(updatedStyle);
  };

  // Convert Data URL to Blob safely
  const dataUrlToBlob = (dataUrl: string): Blob => {
    try {
      const arr = dataUrl.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.error("Error converting data URL to blob:", e);
      return new Blob([], { type: "image/jpeg" });
    }
  };

  const imageToBlob = async (imageSource: string): Promise<Blob> => {
    if (imageSource.startsWith("data:")) {
      return dataUrlToBlob(imageSource);
    }
    const res = await fetch(imageSource);
    return await res.blob();
  };

  // Main AI generation pipeline for HairFastGAN
  const handleGenerateRealisticHair = async (preferredMode?: "camera" | "upload") => {
    const activeMode = preferredMode || sourceMode;

    if (activeMode === "upload" && !uploadedImage) {
      setGlobalError("กรุณาอัปโหลดรูปภาพใบหน้าของคุณก่อนสร้างลุคใหม่");
      fileInputRef.current?.click();
      return;
    }

    const currentStyle = selectedHairstyleRef.current || selectedHairstyle;
    const currentColor = selectedColorRef.current !== undefined ? selectedColorRef.current : selectedColor;

    if (!currentStyle) {
      setGlobalError("กรุณาเลือกทรงผมที่ต้องการก่อนสร้างภาพ");
      return;
    }

    // Start real-time stopwatch immediately from 0.0s upon user click
    generationAbortRef.current?.abort();
    const abortController = new AbortController();
    generationAbortRef.current = abortController;

    setIsGenerating(true);
    setGlobalError("");
    setGenerationOutput(null);

    let faceBlob: Blob | null = null;
    let originalPhotoUrl = "";

    try {
      if (activeMode === "upload") {
        if (uploadedImage) {
          try {
            faceBlob = await imageToBlob(uploadedImage);
            originalPhotoUrl = uploadedImage;
            if (!originalInputFile && faceBlob) {
              setOriginalInputFile(faceBlob);
            }
          } catch (err) {
            console.error("Failed to convert uploaded image to blob:", err);
          }
        }
      } else {
        // Camera Mode snapshot
        if (videoElement && videoElement.readyState >= 2) {
          try {
            faceBlob = await captureWebcamFrame(videoElement);
            originalPhotoUrl = URL.createObjectURL(faceBlob);
            setOriginalInputFile(faceBlob); // Preserve genuine camera snapshot
          } catch (err: any) {
            console.error("Failed to capture webcam frame:", err);
          }
        }

        if (!faceBlob) {
          // Fallback to checking canvas
          const canvas = document.querySelector("canvas");
          if (canvas) {
            faceBlob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95)
            );
            if (faceBlob) {
              originalPhotoUrl = URL.createObjectURL(faceBlob);
              setOriginalInputFile(faceBlob);
            }
          }
        }
      }

      if (!faceBlob) {
        throw new Error(
          activeMode === "upload"
            ? "ไม่สามารถอ่านไฟล์รูปภาพของคุณได้ กรุณาลองอัปโหลดใหม่อีกครั้ง"
            : "กรุณาเปิดกล้องและจัดตำแหน่งใบหน้าให้อยู่ในกรอบก่อนกดสร้างลุคใหม่ของคุณ"
        );
      }

      // Both hairstyle and hair color are always evaluated (even for natural hair color or original hairstyle)
      const isOriginalStyle = currentStyle.id === "original_style" || currentStyle.id === "original";
      const initialContext = createFeedbackContext({
        experimentType: "both",
        hairstyleId: currentStyle.id,
        hairstyleName: isOriginalStyle ? "ทรงผมต้นฉบับ (รูปต้นฉบับ)" : currentStyle.name,
        hairColorId: currentColor ? currentColor.id : "natural_original",
        hairColorName: currentColor ? currentColor.name : "สีผมธรรมชาติ (รูปต้นฉบับ)",
        mode: activeMode,
        seed: null,
        sourceEndpoint: "/generate",
      });

      setFeedbackContext(initialContext);

      if (originalPhotoUrl) {
        setCapturedImageUrl(originalPhotoUrl);
      }

      const colorImagePath = currentColor?.colorReference
        ? currentColor.colorReference
        : currentColor?.value
        ? currentColor.value
        : (originalPhotoUrl || "original");
      const colorId = currentColor ? currentColor.id : "original";
      const shapeImagePath = isOriginalStyle ? "original" : currentStyle.shapeReference;

      // 2 & 3. Execute generation and record elapsed user wait time
      const output = await generateHairFastResultFull({
        faceBlob,
        shapeImagePath,
        colorImagePath,
        hairstyleId: currentStyle.id,
        colorId,
        sourceEndpoint: "/generate",
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      // Update experiment context with returned seed & mode
      const finalizedContext: FeedbackContext = Object.freeze({
        ...initialContext,
        seed: output.seed,
        mode: output.mode || activeMode,
      });

      setFeedbackContext(finalizedContext);
      setGenerationOutput(output);
      setActiveResultKey(output.primaryKey);

      if (activeMode === "upload") {
        setUploadAiResultUrl(output.primaryUrl);
      } else {
        setCameraAiResultUrl(output.primaryUrl);
      }
      setAppStep("ar");
      setShowFeedbackModal(true);
    } catch (err: any) {
      if (err?.name === "AbortError" || abortController.signal.aborted) {
        console.info("Hairstyle generation cancelled by user");
        return;
      }
      console.error("Hairstyle generation failed:", err);
      const friendlyMessage = sanitizeUserErrorMessage(err.message);
      setGlobalError(friendlyMessage);
    } finally {
      if (generationAbortRef.current === abortController) {
        generationAbortRef.current = null;
        setIsGenerating(false);
      }
    }
  };

  const handleCancelGeneration = () => {
    generationAbortRef.current?.abort();
    generationAbortRef.current = null;
    setIsGenerating(false);
  };

  const handleRequestAiGenerateLive = async (
    faceBlob: Blob,
    explicitStyle?: Hairstyle | null,
    explicitColor?: HairColor | null
  ): Promise<string | null> => {
    const currentStyle = explicitStyle || selectedHairstyleRef.current || selectedHairstyle;
    const currentColor = explicitColor !== undefined ? explicitColor : (selectedColorRef.current !== undefined ? selectedColorRef.current : selectedColor);

    if (!currentStyle) return null;

    // Convert live camera faceBlob to URL so it is preserved for evaluation!
    const cameraSnapUrl = URL.createObjectURL(faceBlob);
    setCapturedImageUrl(cameraSnapUrl);
    setOriginalInputFile(faceBlob); // Preserve genuine live capture frame

    const isOriginalStyle = currentStyle.id === "original_style" || currentStyle.id === "original";
    const initialContext = createFeedbackContext({
      experimentType: "both",
      hairstyleId: currentStyle.id,
      hairstyleName: isOriginalStyle ? "ทรงผมต้นฉบับ (รูปต้นฉบับ)" : currentStyle.name,
      hairColorId: currentColor ? currentColor.id : "natural_original",
      hairColorName: currentColor ? currentColor.name : "สีผมธรรมชาติ (รูปต้นฉบับ)",
      mode: "camera",
      seed: null,
      sourceEndpoint: "/generate",
    });

    setFeedbackContext(initialContext);

    try {
      const colorImagePath = currentColor?.colorReference
        ? currentColor.colorReference
        : currentColor?.value
        ? currentColor.value
        : (cameraSnapUrl || "original");
      const colorId = currentColor ? currentColor.id : "original";
      const shapeImagePath = isOriginalStyle ? "original" : currentStyle.shapeReference;

      const output = await generateHairFastResultFull({
        faceBlob,
        shapeImagePath,
        colorImagePath,
        hairstyleId: currentStyle.id,
        colorId,
        sourceEndpoint: "/generate",
      });

      const finalizedContext: FeedbackContext = Object.freeze({
        ...initialContext,
        seed: output.seed,
        mode: output.mode || "camera",
      });

      setFeedbackContext(finalizedContext);
      setGenerationOutput(output);
      setActiveResultKey(output.primaryKey);

      setCameraAiResultUrl(output.primaryUrl);
      setShowFeedbackModal(true);
      return output.primaryUrl;
    } catch (err: any) {
      const friendlyMessage = sanitizeUserErrorMessage(err.message);
      throw new Error(friendlyMessage);
    }
  };

  const handleSelectHairstyle = (style: Hairstyle) => {
    if (isCurrentlyGenerating) return;
    setSelectedHairstyle(style);
  };

  const handleSelectColor = (color: HairColor | null) => {
    if (isCurrentlyGenerating) return;
    setSelectedColor(color);
  };

  const handleAiRecommend = () => {
    if (isCurrentlyGenerating) return;
    const trending = hairstyles.filter((s) => s.isTrending);
    const pool = trending.length > 0 ? trending : hairstyles;
    if (pool.length > 0) {
      const randomStyle = pool[Math.floor(Math.random() * pool.length)];
      setSelectedHairstyle(randomStyle);
    }
  };

  const handleClearCurrentPhoto = () => {
    if (sourceMode === "upload") {
      handleClearImage();
    } else {
      setCameraAiResultUrl(null);
    }
  };

  const [includeWatermark, setIncludeWatermark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("hfar_include_watermark");
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const handleToggleWatermark = () => {
    setIncludeWatermark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hfar_include_watermark", String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleDownloadCurrentPhoto = () => {
    if (tryOnStageRef.current) {
      tryOnStageRef.current.downloadPhoto(includeWatermark);
    }
  };

  const handleDownloadLiveSnapshot = () => {
    if (tryOnStageRef.current?.downloadLiveSnapshot) {
      tryOnStageRef.current.downloadLiveSnapshot(includeWatermark);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerUpload = () => {
    handleSetSourceMode("upload");
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOriginalInputFile(file); // Preserve genuine user input file
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          handleImageUpload(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  // Reusable Main Heading Block
  const headingBlock = (
    <div>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#432B25] tracking-tight leading-tight">
        ลุคใหม่ <span className="text-[#F27D68]">เริ่มที่คุณ</span>
      </h2>
      <p className="text-xs sm:text-sm text-[#80665D] mt-1.5 font-normal leading-relaxed">
        ลองทรงผมและสีที่ใช่ ก่อนเปลี่ยนลุคจริง
      </p>
    </div>
  );

  // Reusable Mode Toggle Buttons Block (อัปโหลดรูป / เปิดกล้อง)
  const modeToggleBlock = (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => {
          if (sourceMode === "upload") {
            fileInputRef.current?.click();
          } else {
            handleSetSourceMode("upload");
          }
        }}
        className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
          sourceMode === "upload"
            ? "bg-[#F27D68] text-white shadow-xs hover:bg-[#E96A55]"
            : "bg-[#FFF1E9] hover:bg-[#FFE3D5] text-[#432B25] border border-[#EFDCD3]"
        }`}
      >
        <Upload size={16} />
        <span>อัปโหลดรูป</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (sourceMode === "camera") {
            handleSetSourceMode("upload");
          } else {
            handleSetSourceMode("camera");
          }
        }}
        className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
          sourceMode === "camera"
            ? "bg-[#F27D68] text-white shadow-xs hover:bg-[#E96A55]"
            : "bg-[#FFF1E9] hover:bg-[#FFE3D5] text-[#432B25] border border-[#EFDCD3]"
        }`}
        title={sourceMode === "camera" ? "คลิกเพื่อปิดกล้องและสลับไปอัปโหลดรูป" : "คลิกเพื่อเปิดกล้อง"}
      >
        {sourceMode === "camera" ? (
          <>
            <CameraOff size={16} />
            <span>ปิดกล้อง</span>
          </>
        ) : (
          <>
            <Camera size={16} />
            <span>เปิดกล้อง</span>
          </>
        )}
      </button>
    </div>
  );

  // Uploaded photo thumbnail preview card
  const uploadedPhotoPreviewCard = sourceMode === "upload" ? (
    uploadedImage ? (
      <div className="bg-[#FFF1E9]/70 border border-[#EFDCD3] rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={uploadedImage}
            alt="รูปถ่ายที่เลือก"
            className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
          />
          <div className="truncate text-xs">
            <span className="block font-semibold text-[#432B25] truncate">
              {uploadedImage.includes("/assets/example/")
                ? (SAMPLE_MODELS.find((m) => m.image === uploadedImage)?.name || "รูปตัวอย่าง")
                : "รูปภาพของคุณ"}
            </span>
            <span className="text-[10px] text-[#80665D] block truncate">
              {uploadedImage.includes("/assets/example/")
                ? "กำลังทดลองด้วยรูปตัวอย่าง"
                : "พร้อมสำหรับทดลองทรงผม"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Small sample photo switchers */}
          <div className="flex items-center gap-1 mr-0.5">
            {SAMPLE_MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => handleImageUpload(model.image)}
                className={`w-6 h-6 rounded-full overflow-hidden border transition cursor-pointer active:scale-95 ${
                  uploadedImage === model.image
                    ? "border-[#F27D68] ring-1 ring-[#F27D68]"
                    : "border-[#EFDCD3] opacity-75 hover:opacity-100"
                }`}
                title={`สลับเป็นรูปตัวอย่าง${model.name}`}
              >
                <img src={model.image} alt={model.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Quick switch to saved previous image on this device if different */}
          {savedPreviousImage && savedPreviousImage !== uploadedImage && (
            <button
              type="button"
              onClick={() => handleImageUpload(savedPreviousImage)}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#432B25] bg-white hover:bg-[#FFE3D5] border border-[#EFDCD3] transition cursor-pointer"
              title="สลับกลับไปใช้รูปเดิมของคุณ (ในเครื่องนี้)"
            >
              รูปเดิม
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#F27D68] hover:bg-[#FFE3D5] transition cursor-pointer"
            title="อัปโหลดรูปภาพของคุณเอง"
          >
            เปลี่ยนรูป
          </button>
          <button
            type="button"
            onClick={handleClearImage}
            className="p-1 rounded-lg text-[#80665D] hover:text-[#B64040] hover:bg-white transition cursor-pointer"
            title="ล้างรูปภาพเพื่อเลือกใหม่"
            aria-label="ล้างรูปภาพ"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    ) : (
      <div className="bg-[#FFF8F4] border border-dashed border-[#F27D68]/50 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FFE3D5] text-[#F27D68] flex items-center justify-center shrink-0">
            <Upload size={15} />
          </div>
          <div className="truncate text-xs">
            <span className="block font-semibold text-[#432B25] truncate">
              ยังไม่ได้อัปโหลดรูปภาพ
            </span>
            <span className="text-[10px] text-[#80665D] block truncate">
              อัปโหลดรูปเพื่อทดลองทรงผม
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {savedPreviousImage && (
            <button
              type="button"
              onClick={() => handleImageUpload(savedPreviousImage)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#432B25] bg-white hover:bg-[#FFE3D5] border border-[#EFDCD3] transition cursor-pointer flex items-center gap-1 shadow-2xs"
              title="ใช้รูปเดิมที่คุณเคยอัปโหลดไว้ในเครื่องนี้"
            >
              <RotateCcw size={11} className="text-[#F27D68]" />
              <span>ใช้รูปเดิม</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-[#F27D68] hover:bg-[#E96A55] transition cursor-pointer shadow-2xs"
          >
            อัปโหลด
          </button>
        </div>
      </div>
    )
  ) : null;

  // Handle clicking the main CTA button: in camera mode scrolls and opens live camera stage, in upload mode generates look
  const handleGenerateAiButtonClick = () => {
    if (isCurrentlyGenerating) return;

    if (sourceMode === "camera") {
      scrollToCameraStage();
    } else {
      if (!uploadedImage) {
        setGlobalError("กรุณาอัปโหลดรูปภาพใบหน้าของคุณก่อนเริ่มจำลองทรงผม หรือเปิดกล้องเพื่อถ่ายทอดสด");
        scrollToCameraStage();
        fileInputRef.current?.click();
        return;
      }
      handleGenerateRealisticHair("upload");
    }
  };

  // Big Main Generation CTA Button (ปุ่มสร้างลุคใหม่ของคุณ และปุ่มทดลองเปิดกล้องเรียลไทม์ - ไม่เลื่อนตามตามคำสั่งผู้ใช้)
  const generateAiButtonBlock = (
    <button
      id="btn-generate-look-ai"
      type="button"
      onClick={handleGenerateAiButtonClick}
      disabled={isCurrentlyGenerating}
      title={
        sourceMode === "camera"
          ? "เปิดและไปยังกล้องเรียลไทม์ทันที"
          : "สร้างลุคใหม่ของคุณ"
      }
      className={`w-full h-12 px-5 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
        isCurrentlyGenerating
          ? "bg-[#EFDCD3] text-[#A18B82] cursor-not-allowed shadow-[0_4px_16px_rgba(242,125,104,0.15)]"
          : "animate-pulse-glow-2s bg-[#F27D68] hover:bg-[#E96A55] active:bg-[#D85B48] active:scale-[0.99] text-white shadow-[0_8px_25px_rgba(242,125,104,0.45)] hover:shadow-[0_12px_30px_rgba(242,125,104,0.55)] ring-2 ring-white/60"
      }`}
    >
      {isCurrentlyGenerating ? (
        <>
          <Loader2 size={16} className="animate-spin text-white" />
          <span>
            {sourceMode === "camera"
              ? "กำลังประมวลผล..."
              : `ระบบกำลังประมวลผล (${generatingElapsedSec.toFixed(1)} วินาที)`}
          </span>
        </>
      ) : sourceMode === "camera" ? (
        <>
          <Sparkles size={16} className="fill-white" />
          <span>ทดลองเปิดกล้องเรียลไทม์</span>
        </>
      ) : (
        <>
          <Sparkles size={16} className="fill-white" />
          <span>สร้างลุคใหม่ของคุณ</span>
        </>
      )}
    </button>
  );

  // Bottom action bar under the hero preview image - only active when model result is ready for the current mode
  const hasAiModelResult = Boolean(
    sourceMode === "upload" ? uploadAiResultUrl : cameraAiResultUrl
  );

  const previewBottomBar = (
    <div className="w-full bg-white border border-[#EFDCD3] rounded-2xl p-3 sm:p-4 shadow-xs space-y-2.5">
      {/* Watermark Toggle Control */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 text-[#5B3425]">
          <span className="font-semibold text-xs text-[#432B25]">ลายน้ำภาพ LOOKLAB</span>
          <span className="text-[10px] text-[#80665D] hidden sm:inline">(แสดงมุมขวาล่าง)</span>
        </div>
        <button
          type="button"
          onClick={handleToggleWatermark}
          className={`h-8 flex items-center justify-center gap-1.5 px-3 rounded-full text-xs font-semibold transition cursor-pointer border select-none active:scale-95 ${
            includeWatermark
              ? "bg-[#FFF1E9] text-[#F27D68] border-[#F27D68]/40 shadow-2xs hover:bg-[#FFE3D5]"
              : "bg-[#F5F2F0] text-[#80665D] border-[#E0D5D0] hover:bg-[#EAE4E0]"
          }`}
          title={includeWatermark ? "เปิดลายน้ำอยู่ (คลิกเพื่อปิด)" : "ปิดลายน้ำอยู่ (คลิกเพื่อเปิด)"}
        >
          <span
            className={`w-2 h-2 rounded-full transition-colors ${
              includeWatermark ? "bg-[#F27D68]" : "bg-[#A18B82]"
            }`}
          />
          <span>{includeWatermark ? "เปิดลายน้ำ" : "ปิดลายน้ำ"}</span>
        </button>
      </div>

      {/* Action Download Buttons */}
      {/* Action Download Button - ปุ่มบันทึกภาพผลลัพธ์เป็นสีส้ม */}
      <button
        type="button"
        id="btn-download-model-result"
        onClick={handleDownloadCurrentPhoto}
        disabled={!hasAiModelResult || isCurrentlyGenerating}
        className={`w-full h-11 px-5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs ${
          hasAiModelResult && !isCurrentlyGenerating
            ? "bg-[#F27D68] hover:bg-[#E96A55] active:bg-[#D85B48] text-white shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer ring-1 ring-white/30"
            : "bg-[#FFF1E9] text-[#A18B82] border border-[#EFDCD3] cursor-not-allowed opacity-60"
        }`}
        title={
          hasAiModelResult
            ? `บันทึกภาพผลลัพธ์จำลองทรงผม (${includeWatermark ? "พร้อมลายน้ำ LOOKLAB" : "ไม่มีลายน้ำ"})`
            : "ปุ่มบันทึกภาพจะกดได้เมื่อระบบประมวลผลเสร็จแล้วเท่านั้น"
        }
      >
        <Sparkles size={16} className={hasAiModelResult ? "text-white fill-white" : "text-[#A18B82]"} />
        <span>บันทึกภาพผลลัพธ์</span>
        <span className="text-[11px] font-normal opacity-85">
          ({includeWatermark ? "มีลายน้ำ" : "ไม่มีลายน้ำ"})
        </span>
      </button>

      {/* Button to open Feedback Questionnaire Modal */}
      {hasAiModelResult && (
        <button
          type="button"
          onClick={() => setShowFeedbackModal(true)}
          className="w-full h-11 px-5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 bg-[#FFF1E9] hover:bg-[#FFE3D5] text-[#F27D68] border border-[#F27D68]/30 shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
          title="เปิดหน้าต่างแบบสอบถามประเมินผลลัพธ์ภาพทรงผม"
        >
          <Sparkles size={15} className="fill-[#F27D68]" />
          <span>แบบสอบถามประเมินผลลัพธ์</span>
        </button>
      )}
    </div>
  );

  // Summary bar action handlers: smooth scroll & focus on corresponding sections
  const handleSummaryUploadClick = () => {
    if (sourceMode === "camera") {
      const target =
        document.getElementById("btn-open-camera") ||
        document.getElementById("camera-preview-stage");
      if (target) {
        const yOffset = -90;
        const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        target.classList.add("ring-4", "ring-[#F27D68]/40", "rounded-[24px]");
        setTimeout(() => target.classList.remove("ring-4", "ring-[#F27D68]/40", "rounded-[24px]"), 1500);
      }
      const openCameraBtn = document.getElementById("btn-open-camera") as HTMLButtonElement | null;
      if (openCameraBtn) {
        openCameraBtn.focus();
        openCameraBtn.click();
      }
    } else {
      if (uploadedImage) {
        const el = document.getElementById("section-upload-photo");
        if (el) {
          const yOffset = -90;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
          el.classList.add("ring-2", "ring-[#F27D68]/50", "rounded-2xl");
          setTimeout(() => el.classList.remove("ring-2", "ring-[#F27D68]/50", "rounded-2xl"), 1500);
        }
      } else {
        fileInputRef.current?.click();
      }
    }
  };

  const handleSummaryHairstyleClick = () => {
    const el = document.getElementById("section-hairstyle-selector");
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      el.classList.add("ring-2", "ring-[#F27D68]/50", "rounded-2xl");
      setTimeout(() => el.classList.remove("ring-2", "ring-[#F27D68]/50", "rounded-2xl"), 1500);
    }
  };

  const handleSummaryColorClick = () => {
    const el = document.getElementById("section-hair-color-selector");
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      el.classList.add("ring-2", "ring-[#F27D68]/50", "rounded-2xl");
      setTimeout(() => el.classList.remove("ring-2", "ring-[#F27D68]/50", "rounded-2xl"), 1500);
    }
  };

  // Selection summary bar element - always floating above bottom navigation bar in both modes
  const selectionSummaryBarElement = (
    <SelectionSummaryBar
      variant="floating"
      sourceMode={sourceMode}
      userPhotoUrl={sourceMode === "camera" ? null : (uploadedImage || null)}
      selectedHairstyle={selectedHairstyle}
      selectedColor={selectedColor}
      isGenerating={isCurrentlyGenerating}
      generatingElapsedSec={generatingElapsedSec}
      onUploadClick={handleSummaryUploadClick}
      onHairstyleClick={handleSummaryHairstyleClick}
      onColorClick={handleSummaryColorClick}
      onGenerate={sourceMode === "upload" ? handleGenerateAiButtonClick : undefined}
    />
  );

  return (
    <div className="min-h-screen bg-[#FFF8F4] text-[#432B25] flex flex-col selection:bg-[#FFE3D5] selection:text-[#F27D68]">
      {/* Hidden File Input for Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* 1. Header Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGuide={() => setShowGuideModal(true)}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 pt-4 w-full">
          <ErrorMessage message={globalError} onRetry={() => setGlobalError("")} />
        </div>
      )}

      <main
        className={`flex-1 max-w-[1680px] w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 lg:py-8 ${
          activeTab === "try-on" && appStep === "ar"
            ? "pb-64 sm:pb-56 md:pb-48 lg:pb-44"
            : "pb-28 sm:pb-24"
        }`}
      >
        {activeTab === "try-on" && (
          appStep === "ar" ? (
            <div className="w-full">
              {/* Responsive Unified Grid: On Tablet (md+) & Desktop (lg+) 2-column layout; On Mobile (< md) clean vertical stack */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 xl:gap-8 items-start w-full">
                {/* 1. PREVIEW STAGE COLUMN (Mobile: Top order-1; Tablet/Desktop: Right column order-2 md:col-span-7) */}
                <div className="order-1 md:order-2 md:col-span-7 xl:col-span-7 2xl:col-span-7 w-full space-y-3.5">
                  {/* On Mobile: Show Heading Block at the top */}
                  <div className="md:hidden">
                    {headingBlock}
                  </div>

                  {/* Top Bar with [อัปโหลดรูป] [เปิดกล้อง] placed in front of "Find Your New You" */}
                  <div className="flex items-center justify-between gap-3 min-h-[42px] flex-wrap w-full">
                    <div className="flex items-center gap-2">
                      {modeToggleBlock}
                    </div>
                    <div className="font-script text-2xl sm:text-3xl lg:text-4xl text-[#F27D68]/90 font-normal leading-none pr-1 select-none pointer-events-none">
                      Find Your New You
                    </div>
                  </div>

                  {/* Single Unified 4:5 Preview Stage Frame */}
                  <TryOnStage
                    ref={tryOnStageRef}
                    sourceMode={sourceMode}
                    setSourceMode={handleSetSourceMode}
                    selectedHairstyle={selectedHairstyle}
                    selectedColor={selectedColor}
                    onFaceTracked={setFaceTracking}
                    onCaptureReady={setVideoElement}
                    onError={setGlobalError}
                    isGenerating={isGenerating}
                    elapsedSec={generatingElapsedSec}
                    onGenerateAi={handleGenerateRealisticHair}
                    uploadedImage={uploadedImage}
                    onImageUpload={handleImageUpload}
                    onImageSelected={(file) => setOriginalInputFile(file)}
                    onClearImage={handleClearImage}
                    uploadAiResultImage={uploadAiResultUrl}
                    onClearUploadAiResult={() => setUploadAiResultUrl(null)}
                    cameraAiResultImage={cameraAiResultUrl}
                    onClearCameraAiResult={() => setCameraAiResultUrl(null)}
                    onRequestAiGenerate={handleRequestAiGenerateLive}
                    onGeneratingLiveChange={setIsLiveGenerating}
                    includeWatermark={includeWatermark}
                    onToggleWatermark={handleToggleWatermark}
                    savedPreviousImage={savedPreviousImage}
                    onSelectHairstyle={handleSelectHairstyle}
                    onSelectColor={handleSelectColor}
                  />

                  {/* Action Buttons Bar underneath the Preview Stage */}
                  {previewBottomBar}
                </div>

                {/* 2. TOOLS & SELECTORS COLUMN (Mobile: Bottom order-2; Tablet/Desktop: Left column order-1 md:col-span-5) */}
                <div className="order-2 md:order-1 md:col-span-5 xl:col-span-5 2xl:col-span-5 w-full space-y-4 xl:space-y-5 pb-6 sm:pb-8">
                  {/* On Tablet & Desktop: Show Heading Block above Tools Card */}
                  <div className="hidden md:block">
                    {headingBlock}
                  </div>

                  {/* Main Tools Card - เว้นระยะห่างไม่ให้ซ้อนทับกับแถบสรุปตัวเลือกด้านล่าง */}
                  <div className="bg-white rounded-[24px] border border-[#EFDCD3] p-5 sm:p-6 shadow-[0_8px_30px_rgba(91,52,37,0.06)] space-y-5 mb-10 sm:mb-12">
                    <div id="section-upload-photo" className="scroll-mt-24 transition-all duration-300">
                      {uploadedPhotoPreviewCard}
                    </div>

                    {/* Choose Hairstyle */}
                    <div id="section-hairstyle-selector" className="scroll-mt-24 transition-all duration-300">
                      <HairstyleSelector
                        selected={selectedHairstyle}
                        onSelect={handleSelectHairstyle}
                        options={hairstyles}
                        originalImageUrl={sourceMode === "camera" ? null : uploadedImage}
                        isCameraMode={sourceMode === "camera"}
                        disabled={isCurrentlyGenerating}
                        disabledReason="ระบบกำลังประมวลผล กรุณารอสักครู่"
                        onViewAllCatalog={() => setActiveTab("catalog")}
                      />
                    </div>

                    {/* Choose Hair Color */}
                    <div id="section-hair-color-selector" className="scroll-mt-24 transition-all duration-300">
                      <HairColorSelector
                        selected={selectedColor}
                        onSelect={handleSelectColor}
                        options={hairColors}
                        originalImageUrl={sourceMode === "camera" ? null : uploadedImage}
                        isCameraMode={sourceMode === "camera"}
                        disabled={isCurrentlyGenerating}
                      />
                    </div>

                    {/* In camera mode: Standalone CTA Button; In upload mode: removed per user request (ลบปุ่มนี้ออกในหน้าอัปโหลด) */}
                    {sourceMode === "camera" && generateAiButtonBlock}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ResultPage
              beforeUrl={
                generationOutput?.images?.["face"] ||
                generationOutput?.images?.["aligned"] ||
                generationOutput?.images?.["input"] ||
                currentTestPhotoUrl ||
                ""
              }
              afterUrl={
                (sourceMode === "upload"
                  ? uploadAiResultUrl || cameraAiResultUrl
                  : cameraAiResultUrl || uploadAiResultUrl) || ""
              }
              selectedStyle={selectedHairstyle}
              selectedColor={selectedColor}
              onTryAnotherStyle={() => setAppStep("ar")}
              onRetake={() => {
                if (capturedImageUrl && capturedImageUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(capturedImageUrl);
                }
                setCapturedImageUrl("");
                setUploadAiResultUrl(null);
                setCameraAiResultUrl(null);
                setGenerationOutput(null);
                setFeedbackContext(null);
                setAppStep("ar");
              }}
              feedbackContext={feedbackContext}
              generationOutput={generationOutput}
              activeResultKey={activeResultKey}
              onSelectResultKey={(key) => {
                setActiveResultKey(key);
                if (generationOutput?.images[key]) {
                  if (sourceMode === "upload") {
                    setUploadAiResultUrl(generationOutput.images[key]);
                  } else {
                    setCameraAiResultUrl(generationOutput.images[key]);
                  }
                }
              }}
              originalFile={originalInputFile}
              onSelectOriginalFile={(file) => setOriginalInputFile(file)}
              apiUrl={serverUrlInput}
            />
          )
        )}

        {/* TAB 2: Catalog Tab */}
        {activeTab === "catalog" && (
          <CatalogTab
            hairstyles={hairstyles}
            selectedHairstyle={selectedHairstyle}
            hairColors={hairColors}
            selectedColor={selectedColor}
            originalImageUrl={currentTestPhotoUrl}
            disabled={isCurrentlyGenerating}
            onSelectHairstyle={(style) => {
              if (isCurrentlyGenerating) return;
              setSelectedHairstyle(style);
              setActiveTab("try-on");
            }}
            onSelectColor={(color) => {
              if (isCurrentlyGenerating) return;
              setSelectedColor(color);
              setActiveTab("try-on");
            }}
          />
        )}
      </main>

      {/* 3. Fullscreen Loader during AI generation (only for upload mode; camera mode has its live canvas message box) */}
      {isGenerating && sourceMode === "upload" && (
        <LoadingResult
          style={selectedHairstyle}
          color={selectedColor}
          userImage={uploadedImage || capturedImageUrl}
          elapsedSec={generatingElapsedSec}
          onCancel={handleCancelGeneration}
        />
      )}

      {/* 4. Comprehensive User Guide Modal */}
      <UserGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onSetDontShowAgain={handleSetDontShowGuideAgain}
      />

      {/* 6. Feedback Questionnaire Modal Dialog Window ("หน้าต่างขึ้นมาให้กรอก กรอกเสร็จค่อยจะกลับมาหน้าหลัก") */}
      {generationOutput && (
        <FeedbackCard
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          context={feedbackContext}
          images={generationOutput.images}
          activeResultKey={activeResultKey}
          onSelectResultKey={(key) => {
            setActiveResultKey(key);
            if (generationOutput.images[key]) {
              if (sourceMode === "upload") {
                setUploadAiResultUrl(generationOutput.images[key]);
              } else {
                setCameraAiResultUrl(generationOutput.images[key]);
              }
            }
          }}
          userWaitSeconds={generationOutput.userWaitSeconds}
          originalFile={originalInputFile}
          onSelectOriginalFile={(file) => setOriginalInputFile(file)}
          apiUrl={serverUrlInput}
          beforeUrl={currentTestPhotoUrl || ""}
          hairstyle={selectedHairstyle}
          hairColor={selectedColor}
          previewOnly={generationOutput.previewOnly}
        />
      )}

      {/* 7. Floating Selection Summary Bar (แถบนี้ในทั้งสองหน้าต้องเลื่อนตามแถบ bottom navigation เสมอ) */}
      {activeTab === "try-on" && appStep === "ar" && selectionSummaryBarElement}

      {/* 8. Floating Bottom Navigation Bar ("เปลี่ยนสองอันนี้เป็น bottom navigation ให้หน่อย ข้างบนเหลือแค่คำแนะนำพอ") */}
      <BottomNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
