import React, { useState, useEffect, useRef } from "react";
import StarRating from "./StarRating";
import AgeGroupSelect from "./AgeGroupSelect";
import {
  FeedbackContext,
  FeedbackRatings,
  FeedbackSubmission,
  FeedbackImagePreparation,
  buildFeedbackSubmission,
  sendFeedback,
  AGE_GROUP_OPTIONS,
  AgeGroup,
  FEEDBACK_IMAGE_MAX_BYTES,
} from "../services/feedbackService";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Loader2,
  RefreshCw,
  UploadCloud,
  FileCheck,
  ChevronRight,
  X,
  Maximize2,
  Download,
} from "lucide-react";
import { Hairstyle, HairColor } from "../types";
import { HAIRSTYLES, HAIR_COLORS } from "../data";

interface FeedbackCardProps {
  isOpen?: boolean;
  onClose?: () => void;
  context: FeedbackContext | null;
  images: Record<string, string>; // result_key -> dataUrl
  activeResultKey: string;
  onSelectResultKey?: (key: string) => void;
  userWaitSeconds: number;
  originalFile: File | Blob | null;
  onSelectOriginalFile?: (file: File) => void;
  apiUrl: string;
  beforeUrl?: string;
  previewOnly?: boolean;
  hairstyle?: Hairstyle | null;
  hairColor?: HairColor | null;
}

export default function FeedbackCard({
  isOpen = true,
  onClose,
  context,
  images,
  activeResultKey,
  onSelectResultKey,
  userWaitSeconds,
  originalFile,
  onSelectOriginalFile,
  apiUrl,
  beforeUrl,
  previewOnly = false,
  hairstyle,
  hairColor,
}: FeedbackCardProps) {
  // Map of submitted experiment_id + result_key -> true
  const [submittedMap, setSubmittedMap] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("hfar_submitted_feedback_keys");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // State for ratings for the active result
  const [ratings, setRatings] = useState<FeedbackRatings>({
    hairstyle: null,
    color: null,
    face: null,
    waiting: null,
    overall: null,
    website: null,
  });

  // State for age group selection
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [ageGroupError, setAgeGroupError] = useState<string | null>(null);

  const [suggestion, setSuggestion] = useState("");
  const [consent, setConsent] = useState(false);

  // Lightbox fullscreen image viewer state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("รูปภาพ");

  // Submission lifecycle state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [imagePrepInfo, setImagePrepInfo] = useState<FeedbackImagePreparation | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Cached frozen submission for identical retries
  const frozenSubmissionRef = useRef<FeedbackSubmission | null>(null);

  // File input ref for missing original file recovery
  const originalFileInputRef = useRef<HTMLInputElement | null>(null);

  const currentSubmissionKey = context ? `${context.experiment_id}_${activeResultKey}` : "";
  const isAlreadySubmitted = Boolean(submittedMap[currentSubmissionKey]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Listen to Escape key to close modal or lightbox
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, lightboxImage]);

  // Reset ratings & errors when experiment context or active result key changes
  useEffect(() => {
    setRatings({
      hairstyle: null,
      color: null,
      face: null,
      waiting: null,
      overall: null,
      website: null,
    });
    setAgeGroup("");
    setAgeGroupError(null);
    setSuggestion("");
    setConsent(false);
    setSubmitError(null);
    setSubmitSuccess(null);
    setImagePrepInfo(null);
    setIsPreparingImage(false);
    frozenSubmissionRef.current = null;
  }, [context?.experiment_id, activeResultKey]);

  // All hooks must run on every render – they are declared BEFORE the early return below
  // (they used to sit after it, which crashed React with "Rendered fewer hooks than expected"
  // whenever the questionnaire was closed).
  const [imgError, setImgError] = useState(false);

  const safeImages: Record<string, string> = images || {};
  const currentResultDataUrl =
    (activeResultKey && safeImages[activeResultKey]) ||
    safeImages["hairfast"] ||
    safeImages["B24"] ||
    safeImages["b24"] ||
    safeImages["result"] ||
    safeImages["output"] ||
    Object.values(safeImages)[0] ||
    "";

  useEffect(() => {
    setImgError(false);
  }, [currentResultDataUrl, activeResultKey]);

  if (!isOpen || !context || !images || Object.keys(images).length === 0) {
    return null;
  }


  const resolvedHairstyle =
    hairstyle ||
    (context.hairstyle_id ? HAIRSTYLES.find((h) => h.id === context.hairstyle_id) : null);
  const resolvedHairColor =
    hairColor ||
    (context.hair_color_id ? HAIR_COLORS.find((c) => c.id === context.hair_color_id) : null);

  const isOriginalStyle =
    !resolvedHairstyle ||
    resolvedHairstyle.id === "original_style" ||
    resolvedHairstyle.id === "original" ||
    context.hairstyle_id === "original_style" ||
    context.hairstyle_id === "original";

  // Always evaluate all criteria (both hairstyle and hair color reference matching)
  const isHairstyleRelevant = true;
  const isColorRelevant = true;

  // Check if age group is selected and valid
  const isAgeGroupValid = Boolean(
    ageGroup && AGE_GROUP_OPTIONS.includes(ageGroup as AgeGroup)
  );

  // Check if all ratings have been provided (including age group, overall satisfaction, and website satisfaction)
  const isRatingComplete =
    isAgeGroupValid &&
    ratings.hairstyle !== null &&
    ratings.hairstyle !== undefined &&
    ratings.color !== null &&
    ratings.color !== undefined &&
    ratings.face !== null &&
    ratings.face !== undefined &&
    ratings.waiting !== null &&
    ratings.waiting !== undefined &&
    ratings.overall !== null &&
    ratings.overall !== undefined &&
    ratings.website !== null &&
    ratings.website !== undefined &&
    Number.isInteger(ratings.website) &&
    ratings.website >= 1 &&
    ratings.website <= 5;

  const handleSubmit = async (isRetry: boolean = false) => {
    if (isSubmitting || isPreparingImage || isAlreadySubmitted) return;

    setSubmitError(null);
    setSubmitSuccess(null);

    let submissionToUse: FeedbackSubmission | null = null;

    try {
      if (isRetry && frozenSubmissionRef.current) {
        // Reuse exact frozen submission only if it contains age_group, overall_satisfaction_rating, website_satisfaction_rating, and valid prepared PNG blobs
        try {
          const parsed = JSON.parse(frozenSubmissionRef.current.serialized);
          const hasValidPreparedImages =
            !consent ||
            (frozenSubmissionRef.current.originalFile instanceof Blob &&
              frozenSubmissionRef.current.resultBlob instanceof Blob &&
              frozenSubmissionRef.current.originalFile.size <= FEEDBACK_IMAGE_MAX_BYTES &&
              frozenSubmissionRef.current.resultBlob.size <= FEEDBACK_IMAGE_MAX_BYTES);

          if (
            parsed.age_group &&
            AGE_GROUP_OPTIONS.includes(parsed.age_group) &&
            typeof parsed.overall_satisfaction_rating === "number" &&
            parsed.overall_satisfaction_rating >= 1 &&
            parsed.overall_satisfaction_rating <= 5 &&
            typeof parsed.website_satisfaction_rating === "number" &&
            Number.isInteger(parsed.website_satisfaction_rating) &&
            parsed.website_satisfaction_rating >= 1 &&
            parsed.website_satisfaction_rating <= 5 &&
            hasValidPreparedImages
          ) {
            submissionToUse = frozenSubmissionRef.current;
            if (submissionToUse.imagePreparation) {
              setImagePrepInfo(submissionToUse.imagePreparation);
            }
          } else {
            // Snapshot lacks fields or valid prepared images: rebuild new snapshot
            frozenSubmissionRef.current = null;
          }
        } catch {
          frozenSubmissionRef.current = null;
        }
      }

      if (!submissionToUse) {
        if (!ageGroup || !AGE_GROUP_OPTIONS.includes(ageGroup as AgeGroup)) {
          setAgeGroupError("กรุณาเลือกช่วงอายุของคุณ");
          throw new Error("กรุณาเลือกช่วงอายุ");
        }
        if (!ratings.website || !Number.isInteger(ratings.website) || ratings.website < 1 || ratings.website > 5) {
          throw new Error("กรุณาให้คะแนนความพึงพอใจในการใช้งานเว็บไซต์ 1–5 ดาว");
        }

        if (consent) {
          setIsPreparingImage(true);
        }

        // Build new frozen submission with complete ratings, ageGroup, and prepareFeedbackImage
        submissionToUse = await buildFeedbackSubmission({
          context,
          resultKey: activeResultKey,
          userWaitSeconds,
          ageGroup,
          ratings,
          suggestion,
          consent,
          originalFile,
          resultDataUrl: currentResultDataUrl,
        });

        // Verify prepared copies sizes <= 1.9 MiB each (Vercel request limit 4.5 MB)
        if (consent) {
          if (submissionToUse.originalFile && submissionToUse.originalFile.size > FEEDBACK_IMAGE_MAX_BYTES) {
            throw new Error("ขนาดสำเนารูปต้นฉบับเกินกำหนด 1.9 MiB กรุณาลองใหม่อีกครั้ง");
          }
          if (submissionToUse.resultBlob && submissionToUse.resultBlob.size > FEEDBACK_IMAGE_MAX_BYTES) {
            throw new Error("ขนาดสำเนารูปผลลัพธ์เกินกำหนด 1.9 MiB กรุณาลองใหม่อีกครั้ง");
          }
        }

        frozenSubmissionRef.current = submissionToUse;
        if (submissionToUse.imagePreparation) {
          setImagePrepInfo(submissionToUse.imagePreparation);
        }
      }
    } catch (validationErr: any) {
      setIsPreparingImage(false);
      setSubmitError(validationErr.message || "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    } finally {
      setIsPreparingImage(false);
    }

    setIsSubmitting(true);

    try {
      const response = await sendFeedback(apiUrl, submissionToUse);

      if (response && response.saved === true) {
        setSubmitSuccess(response.message || "ขอบคุณสำหรับความคิดเห็นของคุณ!");
        setSubmittedMap((prev) => {
          const next = { ...prev, [currentSubmissionKey]: true };
          try {
            localStorage.setItem("hfar_submitted_feedback_keys", JSON.stringify(next));
          } catch {}
          return next;
        });
        frozenSubmissionRef.current = null;

        // Auto return to main page after 1.8 seconds
        setTimeout(() => {
          if (onClose) onClose();
        }, 1800);
      } else {
        throw new Error("บันทึกไม่สำเร็จ");
      }
    } catch (err: any) {
      console.error("Feedback submit error:", err);
      const msg = err.message || "เกิดข้อผิดพลาดในการส่งแบบสอบถาม";
      setSubmitError(msg);

      // If backend returned 413, invalidate old frozen submission so next retry re-runs prepareFeedbackImage
      if (msg.includes("413") || msg.includes("เกินกำหนด") || msg.includes("Payload Too Large")) {
        frozenSubmissionRef.current = null;
      }

      if (msg.includes("ภาพนี้ได้ส่งแบบสอบถามเรียบร้อยแล้ว") || msg.includes("มีคำตอบแล้ว")) {
        setSubmittedMap((prev) => {
          const next = { ...prev, [currentSubmissionKey]: true };
          try {
            localStorage.setItem("hfar_submitted_feedback_keys", JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-[28px] border border-[#EFDCD3] shadow-2xl p-5 sm:p-7 max-h-[92vh] overflow-y-auto custom-scrollbar-y text-[#432B25] my-auto space-y-5">
        {/* Close Button top-right */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#FFF1E9] hover:bg-[#FFE3D5] text-[#80665D] hover:text-[#432B25] flex items-center justify-center transition cursor-pointer active:scale-95 z-20"
            aria-label="ปิดหน้าต่างและกลับสู่หน้าหลัก"
            title="ปิดหน้าต่างและกลับสู่หน้าหลัก"
          >
            <X size={18} />
          </button>
        )}

        {/* Hidden file input for original file fallback */}
        <input
          ref={originalFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0] && onSelectOriginalFile) {
              onSelectOriginalFile(e.target.files[0]);
              setSubmitError(null);
            }
          }}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EFDCD3] pb-4 pr-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#FFE3D5] text-[#F27D68] text-[11px] font-bold px-3 py-1 rounded-full mb-1">
              <Sparkles size={13} className="fill-[#F27D68]" />
              <span>แบบสอบถามประเมินความพึงพอใจ</span>
            </div>
            <h3 id="feedback-modal-title" className="text-xl sm:text-2xl font-extrabold text-[#432B25]">
              ประเมินผลลัพธ์ภาพทรงผม
            </h3>
            <p className="text-xs text-[#80665D] mt-0.5">
              ความคิดเห็นของคุณจะช่วยให้เราพัฒนาความแม่นยำและความเป็นธรรมชาติของทรงผมให้ดียิ่งขึ้น
            </p>
          </div>

          {/* Experiment Context & Waiting time badge */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1.5 bg-[#FFF1E9] border border-[#EFDCD3] px-3 py-1.5 rounded-xl text-xs text-[#80665D]">
              <Clock size={13} className="text-[#F27D68]" />
              <span>
                เวลารอผลลัพธ์:{" "}
                <strong className="text-[#432B25] font-bold">
                  {userWaitSeconds > 0 ? `${userWaitSeconds.toFixed(1)} วิ` : "เร็วมาก"}
                </strong>
              </span>
            </div>

            {previewOnly && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                ภาพตัวอย่าง (Preview)
              </span>
            )}
          </div>
        </div>

        {/* 4-Image Visual Comparison Display: Original Photo, Hairstyle Ref, Color Ref, AI Result */}
        {(() => {
          const currentHairstyle =
            hairstyle ||
            (context.hairstyle_id ? HAIRSTYLES.find((h) => h.id === context.hairstyle_id) : null);
          const currentHairColor =
            hairColor ||
            (context.hair_color_id ? HAIR_COLORS.find((c) => c.id === context.hair_color_id) : null);

          const isOriginalStyle =
            !currentHairstyle ||
            currentHairstyle.id === "original_style" ||
            currentHairstyle.id === "original" ||
            context.hairstyle_id === "original_style" ||
            context.hairstyle_id === "original";

          const isNaturalColor =
            !currentHairColor ||
            (!currentHairColor.colorReference && !currentHairColor.value) ||
            currentHairColor.id === "natural_original" ||
            currentHairColor.id === "original";

          const styleImgUrl = isOriginalStyle
            ? (beforeUrl || "")
            : (currentHairstyle?.thumbnail || currentHairstyle?.shapeReference || "");
          const colorImgUrl = isNaturalColor ? "" : (currentHairColor?.colorReference || currentHairColor?.swatchImage || "");
          const colorHex = isNaturalColor ? "" : (currentHairColor?.value || "");
          const styleName = isOriginalStyle
            ? "ทรงผมต้นฉบับ (รูปต้นฉบับ)"
            : (currentHairstyle?.name?.split(" (")[0] || context.hairstyle_name || "ทรงผม");
          const colorName = isNaturalColor
            ? "สีผมธรรมชาติ (รูปต้นฉบับ)"
            : (currentHairColor?.name?.split(" (")[0] || context.hair_color_name || "สีผมธรรมชาติ");

          return (
            <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-[#432B25] flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#F27D68]" />
                  <span>ภาพเปรียบเทียบประเมินผลลัพธ์ (รูปต้นฉบับ · เรฟทรงผม · เรฟสีผม · ผลลัพธ์)</span>
                </span>
              </div>

              {/* Grid of 4 images with equal cropping (aspect-[3/4]) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 items-start">
                {/* 1. รูปต้นฉบับ */}
                <div className="space-y-1.5 flex flex-col">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#432B25] truncate">1. รูปต้นฉบับ</span>
                  </div>
                  <div
                    onClick={() => {
                      if (beforeUrl) {
                        setLightboxImage(beforeUrl);
                        setLightboxTitle(context.mode === "camera" ? "รูปถ่ายจริงจากกล้อง (ต้นฉบับ)" : "รูปถ่ายที่คุณอัปโหลด (ต้นฉบับ)");
                      }
                    }}
                    className={`relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#FAF7F4] border border-[#EFDCD3] shadow-2xs flex items-center justify-center ${
                      beforeUrl ? "cursor-zoom-in group" : ""
                    }`}
                    title={beforeUrl ? "คลิกเพื่อขยายดูรูปต้นฉบับ" : undefined}
                  >
                    {beforeUrl ? (
                      <>
                        <img
                          src={beforeUrl}
                          alt="Original Face"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold pointer-events-none">
                          <Maximize2 size={14} />
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-center text-[10px] text-[#80665D]">
                        ไม่มีรูปต้นฉบับ
                      </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 bg-black/65 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs pointer-events-none">
                      {context.mode === "camera" ? "กล้องจริง" : "รูปอัปโหลด"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#80665D] truncate text-center font-medium">
                    {context.mode === "camera" ? "ภาพถ่ายจริงจากกล้อง" : "รูปถ่ายที่คุณอัปโหลด"}
                  </span>
                </div>

                {/* 2. เรฟทรงผม */}
                <div className="space-y-1.5 flex flex-col">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#432B25] truncate">2. เรฟทรงผม</span>
                  </div>
                  <div
                    onClick={() => {
                      if (styleImgUrl) {
                        setLightboxImage(styleImgUrl);
                        setLightboxTitle(`เรฟทรงผม: ${styleName}`);
                      }
                    }}
                    className={`relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-white border border-[#EFDCD3] shadow-2xs flex items-center justify-center ${
                      styleImgUrl ? "cursor-zoom-in group" : ""
                    }`}
                    title={styleImgUrl ? "คลิกเพื่อขยายดูเรฟทรงผม" : undefined}
                  >
                    {styleImgUrl ? (
                      <>
                        <img
                          src={styleImgUrl}
                          alt="Hairstyle Reference"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold pointer-events-none">
                          <Maximize2 size={14} />
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-center text-[10px] text-[#80665D]">
                        ไม่มีภาพเรฟทรงผม
                      </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 bg-[#432B25]/80 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs pointer-events-none">
                      เรฟทรงผม
                    </span>
                  </div>
                  <span className="text-[10px] text-[#80665D] truncate text-center font-medium" title={styleName}>
                    {styleName}
                  </span>
                </div>

                {/* 3. เรฟสีผม - ถ้าเป็นสีธรรมชาติ ให้แสดงรูปภาพต้นฉบับเป็นเรฟสีผมธรรมชาติ */}
                <div className="space-y-1.5 flex flex-col">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#432B25] truncate">3. เรฟสีผม</span>
                  </div>
                  <div
                    onClick={() => {
                      if (colorImgUrl) {
                        setLightboxImage(colorImgUrl);
                        setLightboxTitle(`เรฟสีผม: ${colorName}`);
                      } else if (beforeUrl) {
                        setLightboxImage(beforeUrl);
                        setLightboxTitle(`เรฟสีผม: ${colorName}`);
                      }
                    }}
                    className={`relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-white border border-[#EFDCD3] shadow-2xs flex items-center justify-center ${
                      colorImgUrl || beforeUrl ? "cursor-zoom-in group" : ""
                    }`}
                    title="คลิกเพื่อขยายดูเรฟสีผม"
                  >
                    {colorImgUrl ? (
                      <>
                        <img
                          src={colorImgUrl}
                          alt="Hair Color Reference"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold pointer-events-none">
                          <Maximize2 size={14} />
                        </div>
                      </>
                    ) : colorHex ? (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: colorHex }}
                      >
                        <span className="bg-white/85 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#432B25] shadow-2xs">
                          {colorHex}
                        </span>
                      </div>
                    ) : beforeUrl ? (
                      <>
                        <img
                          src={beforeUrl}
                          alt="สีผมธรรมชาติเดิม (รูปภาพต้นฉบับ)"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold pointer-events-none">
                          <Maximize2 size={14} />
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-center text-[10px] text-[#80665D]">
                        สีผมธรรมชาติ
                      </div>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 bg-[#432B25]/80 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs pointer-events-none">
                      {isNaturalColor ? "รูปต้นฉบับ (สีธรรมชาติ)" : "เรฟสีผม"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#80665D] truncate text-center font-medium" title={colorName}>
                    {colorName}
                  </span>
                </div>

                {/* 4. ผลลัพธ์ทรงผมใหม่ (ครอบเท่าเพื่อนเหมือนเดิม และกดขยายดูเต็มๆได้) */}
                <div className="space-y-1.5 flex flex-col">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#F27D68] truncate">4. ภาพผลลัพธ์ใหม่</span>
                    {currentResultDataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxImage(currentResultDataUrl);
                          setLightboxTitle(`ภาพผลลัพธ์การเปลี่ยนทรงผม (${styleName} · ${colorName})`);
                        }}
                        className="text-[10px] text-[#F27D68] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="กดขยายดูรูปเต็ม"
                      >
                        <Maximize2 size={11} />
                        <span>ขยายเต็ม</span>
                      </button>
                    )}
                  </div>
                  <div
                    onClick={() => {
                      if (currentResultDataUrl) {
                        setLightboxImage(currentResultDataUrl);
                        setLightboxTitle(`ภาพผลลัพธ์การเปลี่ยนทรงผม (${styleName} · ${colorName})`);
                      }
                    }}
                    className={`relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-white border-2 border-[#F27D68] shadow-sm flex items-center justify-center ${
                      currentResultDataUrl ? "cursor-zoom-in group" : ""
                    }`}
                    title={currentResultDataUrl ? "คลิกเพื่อขยายดูรูปผลลัพธ์แบบเต็มๆ" : undefined}
                  >
                    {currentResultDataUrl && !imgError ? (
                      <>
                        {/* ครอบเท่าเพื่อนเหมือนเดิม (object-cover) */}
                        <img
                          src={currentResultDataUrl}
                          alt="Hairstyle Result"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            console.error("Result image render error:", currentResultDataUrl.substring(0, 100));
                            setImgError(true);
                          }}
                        />
                        {/* Hover Overlay แนะนำการกดดูเต็มๆ */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white pointer-events-none backdrop-blur-2xs">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
                            <Maximize2 size={16} className="text-white drop-shadow-sm" />
                          </div>
                          <span className="text-[10px] font-bold bg-black/60 px-2.5 py-0.5 rounded-full text-white">
                            คลิกดูรูปเต็ม
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-center text-[10px] text-[#80665D] space-y-1">
                        <AlertCircle size={16} className="mx-auto text-[#F27D68]" />
                        <span className="block font-bold">ไม่พบรูปภาพผลลัพธ์</span>
                        <span className="block text-[9px] text-[#A18B82]">กำลังรอข้อมูลจากโมเดล</span>
                      </div>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 bg-[#F27D68] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs pointer-events-none">
                      ผลลัพธ์
                    </span>
                  </div>
                  <span className="text-[10px] text-[#F27D68] font-bold truncate text-center">
                    ลุคใหม่ (คลิกเพื่อขยาย)
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Already Submitted State */}
        {isAlreadySubmitted ? (
          <div className="bg-[#EBF7F0] border border-[#C6ECD4] rounded-2xl p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#D4F2E0] text-[#2B734B] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={30} />
            </div>
            <h4 className="font-extrabold text-lg text-[#1E5234]">
              {submitSuccess || "ขอบคุณสำหรับความคิดเห็นของคุณ!"}
            </h4>
            <p className="text-xs text-[#2E6B47] max-w-md mx-auto leading-relaxed">
              ขอบคุณที่ร่วมตอบแบบสอบถาม ความคิดเห็นของคุณเป็นประโยชน์อย่างยิ่งในการพัฒนาและปรับปรุงระบบให้ดียิ่งขึ้น
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-full bg-[#2B734B] hover:bg-[#235d3d] text-white text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
                >
                  กลับสู่หน้าหลักทันที
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Questionnaire Form */
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(false);
            }}
            className="space-y-5"
          >
            {/* Question: Age Group (Required, before star rating questions) */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl">
              <AgeGroupSelect
                value={ageGroup}
                onChange={(val) => {
                  setAgeGroup(val);
                  if (val) setAgeGroupError(null);
                }}
                error={ageGroupError}
                disabled={isSubmitting}
                required={true}
              />
            </div>

            {/* Question 1: Hairstyle Match to Reference (Always evaluated) */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl">
              <StarRating
                label={`1. ทรงผมในภาพผลลัพธ์ตรงตาม reference แค่ไหน? ${
                  isOriginalStyle
                    ? "(ทรงผมต้นฉบับ จากรูปต้นฉบับของคุณ)"
                    : context.hairstyle_name
                    ? `(${context.hairstyle_name})`
                    : ""
                }`}
                value={ratings.hairstyle}
                onChange={(score) => setRatings((prev) => ({ ...prev, hairstyle: score }))}
                labels={["ไม่ตรงเลย", "ตรงเล็กน้อย", "ตรงปานกลาง", "ตรงมาก", "ตรงตาม reference มากที่สุด"]}
                required={true}
                disabled={isSubmitting}
                helperText={
                  isOriginalStyle
                    ? "ประเมินว่าทรงผมในผลลัพธ์คงลักษณะทรงผมเดิมจากรูปต้นฉบับของคุณได้ดีเพียงใด (การทดลองเปลี่ยนเฉพาะสีผม)"
                    : undefined
                }
              />
            </div>

            {/* Question 2: Hair Color Match to Reference (Always evaluated, even for natural hair color) */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl">
              <StarRating
                label={`2. สีผมในภาพผลลัพธ์ตรงตาม reference แค่ไหน? ${
                  context.hair_color_name
                    ? `(${context.hair_color_name})`
                    : "(สีผมธรรมชาติ จากรูปต้นฉบับ)"
                }`}
                value={ratings.color}
                onChange={(score) => setRatings((prev) => ({ ...prev, color: score }))}
                labels={["ไม่ตรงเลย", "ตรงเล็กน้อย", "ตรงปานกลาง", "ตรงมาก", "ตรงตาม reference มากที่สุด"]}
                required={true}
                disabled={isSubmitting}
                helperText={
                  !resolvedHairColor ||
                  resolvedHairColor.id === "natural_original" ||
                  resolvedHairColor.id === "original" ||
                  context.hair_color_name?.includes("ธรรมชาติ")
                    ? "ประเมินว่าสีผมในผลลัพธ์ตรงตามสีผมธรรมชาติในรูปต้นฉบับของคุณมากน้อยเพียงใด"
                    : "ประเมินความตรงตามภาพอ้างอิงเฉดสีผมที่คุณเลือก"
                }
              />
            </div>

            {/* Question 3: Face Similarity */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl">
              <StarRating
                label="3. ใบหน้าในภาพผลลัพธ์เหมือนใบหน้าต้นฉบับแค่ไหน?"
                value={ratings.face}
                onChange={(score) => setRatings((prev) => ({ ...prev, face: score }))}
                labels={["ไม่เหมือนเลย", "เหมือนเล็กน้อย", "เหมือนปานกลาง", "เหมือนมาก", "เหมือนมากที่สุด"]}
                required={true}
                disabled={isSubmitting}
              />
            </div>

            {/* Question 4: Waiting Satisfaction */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl">
              <StarRating
                label="4. คุณพอใจกับระยะเวลาที่รอผลลัพธ์แค่ไหน?"
                value={ratings.waiting}
                onChange={(score) => setRatings((prev) => ({ ...prev, waiting: score }))}
                labels={[
                  "ไม่พอใจมาก รอนานมาก",
                  "ไม่พอใจ รอนาน",
                  "ปานกลาง",
                  "พอใจ รอไม่นาน",
                  "พอใจมาก รวดเร็ว",
                ]}
                required={true}
                disabled={isSubmitting}
                helperText={userWaitSeconds > 0 ? `ระยะเวลาประมวลผลจริง: ประมาณ ${userWaitSeconds.toFixed(1)} วินาที` : undefined}
              />
            </div>

            {/* Question 5: Overall Satisfaction */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl">
              <StarRating
                label="5. คุณพอใจกับผลลัพธ์โดยรวมมากแค่ไหน?"
                value={ratings.overall}
                onChange={(score) => setRatings((prev) => ({ ...prev, overall: score }))}
                labels={[
                  "ไม่พอใจมาก",
                  "ไม่พอใจ",
                  "ปานกลาง",
                  "พอใจ",
                  "พอใจมาก",
                ]}
                required={true}
                disabled={isSubmitting}
              />
            </div>

            {/* Question: Website Satisfaction */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl">
              <StarRating
                label="คุณพอใจกับการใช้งานเว็บไซต์นี้มากแค่ไหน?"
                value={ratings.website}
                onChange={(score) => setRatings((prev) => ({ ...prev, website: score }))}
                labels={[
                  "ไม่พอใจมาก",
                  "ไม่พอใจ",
                  "ปานกลาง",
                  "พอใจ",
                  "พอใจมาก",
                ]}
                required={true}
                disabled={isSubmitting}
              />
            </div>

            {/* Question: Suggestions (Optional Textarea, max 2000 chars) */}
            <div className="p-4 bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="feedback-suggestion"
                  className="text-xs sm:text-sm font-bold text-[#432B25]"
                >
                  ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)
                </label>
                <span className="text-[11px] text-[#A18B82]">
                  {suggestion.length} / 2000 ตัวอักษร
                </span>
              </div>
              <textarea
                id="feedback-suggestion"
                rows={3}
                maxLength={2000}
                disabled={isSubmitting}
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="แนะนำสิ่งที่อยากให้ปรับปรุง ความคิดเห็นเรื่องความเนียนของเส้นผม หรือฟังก์ชันที่ต้องการ..."
                className="w-full p-3 rounded-xl bg-white border border-[#EFDCD3] text-xs text-[#432B25] placeholder-[#A18B82] focus:outline-none focus:ring-2 focus:ring-[#F27D68] resize-y"
              />
            </div>

            {/* Consent Checkbox */}
            <div className="p-4 bg-[#FFF1E9]/70 border border-[#EFDCD3] rounded-2xl space-y-2.5">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  disabled={isSubmitting || isPreparingImage}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    frozenSubmissionRef.current = null;
                    setImagePrepInfo(null);
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-[#F27D68] accent-[#F27D68] cursor-pointer"
                />
                <div className="text-xs text-[#432B25]">
                  <span className="font-bold">
                    ยินยอมให้เก็บรูปต้นฉบับและรูปผลลัพธ์เพื่อประเมินและปรับปรุงระบบ
                  </span>
                  <p className="text-[11px] text-[#80665D] mt-1 leading-relaxed">
                    checkbox นี้ควบคุมการเก็บภาพประกอบแบบสอบถาม ส่วนการบันทึกภาพจากขั้นตอนประมวลผลเดิมเป็นไปตามนโยบายของระบบจริง
                  </p>
                  <p className="text-[11px] text-[#80665D]/90 mt-0.5 leading-relaxed">
                    (หากไม่ยินยอม คุณยังคงสามารถส่งคะแนนประเมินได้ตามปกติ โดยระบบจะไม่แนบรูปภาพไปกับแบบสอบถาม)
                  </p>
                </div>
              </label>

              {/* If consent is checked but original file is missing, offer file re-upload button */}
              {consent && !originalFile && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-amber-600" />
                    <span>ไม่พบไฟล์รูปต้นฉบับเดิม กรุณาเลือกไฟล์รูปต้นฉบับก่อนส่ง</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => originalFileInputRef.current?.click()}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    เลือกไฟล์ต้นฉบับ
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">ไม่สามารถส่งความคิดเห็นได้:</span>
                  <p className="mt-0.5">{submitError}</p>
                  {frozenSubmissionRef.current && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[11px] cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>ลองใหม่อีกครั้งด้วยข้อมูลเดิม</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Submit & Dismiss Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#EFDCD3]/80">
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold text-[#80665D] hover:text-[#432B25] hover:bg-[#FFF1E9] border border-[#EFDCD3] transition cursor-pointer"
                >
                  ไว้ทีหลัง (กลับหน้าหลัก)
                </button>
              ) : (
                <span className="text-[11px] text-[#80665D]">
                  * กรุณาตอบคำถามที่มีเครื่องหมายดอกจันให้ครบถ้วน
                </span>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isPreparingImage || !isRatingComplete}
                className={`w-full sm:w-auto px-7 py-3 rounded-full font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
                  isSubmitting || isPreparingImage || !isRatingComplete
                    ? "bg-[#EFDCD3] text-[#A18B82] cursor-not-allowed"
                    : "bg-[#F27D68] hover:bg-[#E96A55] active:bg-[#D85B48] text-white shadow-md hover:shadow-lg cursor-pointer active:scale-95"
                }`}
              >
                {isPreparingImage ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังเตรียมรูปภาพ…</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>กำลังบันทึกความคิดเห็น…</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>ส่งความคิดเห็น</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lightbox Fullscreen Image Viewer Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="รูปภาพขยายเต็มจอ"
        >
          {/* Lightbox Top Header Bar */}
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
                  {lightboxTitle || "ภาพขยายเต็มจอ"}
                </h4>
                <p className="text-[11px] text-white/70 truncate">
                  ภาพผลลัพธ์ AI ความละเอียดสูง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={lightboxImage}
                download={`looklab-${activeResultKey || "ai-result"}.jpg`}
                className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                onClick={(e) => e.stopPropagation()}
                title="ดาวน์โหลดรูปนี้"
              >
                <Download size={14} />
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-xl transition cursor-pointer"
                title="ปิดหน้าต่างขยายรูป (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Lightbox Center Image */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto overflow-hidden p-1 sm:p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Expanded Preview"
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/15 animate-in zoom-in-95 duration-200"
            />
          </div>

          {/* Lightbox Bottom Info */}
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
