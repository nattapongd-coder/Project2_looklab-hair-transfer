import { useEffect, useState } from "react";
import { Hairstyle, HairColor } from "../types";
import BeforeAfterSlider from "./BeforeAfterSlider";
import FeedbackCard from "./FeedbackCard";
import { FeedbackContext } from "../services/feedbackService";
import { HairFastGenerationOutput } from "../services/hairFastGanService";
import { ArrowLeft, Camera, Download, Sparkles, Maximize2, X, ImageOff } from "lucide-react";

interface ResultPageProps {
  beforeUrl: string;
  afterUrl: string;
  selectedStyle: Hairstyle | null;
  selectedColor: HairColor | null;
  onTryAnotherStyle: () => void;
  onRetake: () => void;
  feedbackContext?: FeedbackContext | null;
  generationOutput?: HairFastGenerationOutput | null;
  activeResultKey?: string;
  onSelectResultKey?: (key: string) => void;
  originalFile?: File | Blob | null;
  onSelectOriginalFile?: (file: File) => void;
  apiUrl?: string;
}

export default function ResultPage({
  beforeUrl,
  afterUrl,
  selectedStyle,
  selectedColor,
  onTryAnotherStyle,
  onRetake,
  feedbackContext,
  generationOutput,
  activeResultKey,
  onSelectResultKey,
  originalFile,
  onSelectOriginalFile,
  apiUrl,
}: ResultPageProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  // True when the browser cannot decode the result image (shows a message instead of a broken icon)
  const [afterImageError, setAfterImageError] = useState<boolean>(false);
  useEffect(() => {
    setAfterImageError(false);
  }, [afterUrl]);
  const canShowAfter = Boolean(afterUrl) && !afterImageError;
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("hfar_include_watermark");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
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

  const handleDownload = () => {
    if (!canShowAfter) return;

    if (!includeWatermark) {
      const link = document.createElement("a");
      link.href = afterUrl;
      link.download = `LOOKLAB-${selectedStyle?.name || "hairstyle"}-${selectedColor?.name || "color"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = afterUrl;
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 800;
      c.height = img.naturalHeight || 800;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        ctx.save();
        const fontSize = Math.max(14, Math.round(c.width * 0.03));
        ctx.font = `600 ${fontSize}px "Bodoni Moda", "Cormorant Garamond", "Cinzel", "Playfair Display", Georgia, serif`;
        try {
          ctx.letterSpacing = "0.28em";
        } catch (e) {}
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText("LOOKLAB", c.width - 24, c.height - 22);
        ctx.restore();

        c.toBlob(
          (blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `LOOKLAB-${selectedStyle?.name || "hairstyle"}-${selectedColor?.name || "color"}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          },
          "image/jpeg",
          0.95
        );
      }
    };
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-[24px] shadow-[0_8px_30px_rgba(91,52,37,0.06)] border border-[#EFDCD3] overflow-hidden animate-fade-in p-6 sm:p-8 text-[#432B25]">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#EFDCD3] pb-5 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-[#FFE3D5] text-[#F27D68] border border-[#EFDCD3] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-1.5">
            <Sparkles size={11} className="fill-[#F27D68]" />
            LOOKLAB HAIRSTYLIST
          </span>
          <h3 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#432B25]">
            ลุคใหม่ของคุณเสร็จสมบูรณ์
          </h3>
        </div>

        <div className="flex items-center gap-3 bg-[#FFF1E9] border border-[#EFDCD3] px-4 py-2 rounded-2xl text-xs">
          <div className="border-r border-[#EFDCD3] pr-3 flex items-center gap-2">
            {selectedStyle?.thumbnail && (
              <img
                src={selectedStyle.thumbnail}
                alt={selectedStyle.name}
                className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
              />
            )}
            <div>
              <span className="block text-[10px] text-[#80665D] font-medium">ทรงผม</span>
              <span className="font-bold text-[#432B25]">{selectedStyle?.name?.split(" (")[0] || "ไม่ระบุ"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedColor?.swatchImage ? (
              <img
                src={selectedColor.swatchImage}
                alt={selectedColor.name}
                className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
              />
            ) : (
              <img
                src={beforeUrl}
                alt="สีธรรมชาติ (รูปต้นฉบับ)"
                className="w-8 h-8 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
              />
            )}
            <div>
              <span className="block text-[10px] text-[#80665D] font-medium">เฉดสีผม</span>
              <span className="font-bold text-[#432B25]">
                {selectedColor ? selectedColor.name.split(" (")[0] : "สีผมธรรมชาติ (รูปต้นฉบับ)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Core display with slider and actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Drag Slider (58%) */}
        <div className="lg:col-span-7 w-full flex justify-center">
          <BeforeAfterSlider
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            beforeLabel="ก่อน"
            afterLabel="หลัง"
            showScriptOverlay={false}
            className="aspect-square max-w-[512px] max-h-[512px] w-full mx-auto rounded-[24px] shadow-sm border border-[#EFDCD3]"
          />
        </div>

        {/* Details & Actions Panel (42%) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h4 className="text-[#432B25] font-bold text-xs flex items-center justify-between">
              <span>ภาพเปรียบเทียบและการประเมิน (รูปต้นฉบับ · เรฟทรงผม · เรฟสีผม · ผลลัพธ์)</span>
            </h4>

            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              {/* 1. รูปต้นฉบับ */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-[#80665D] block truncate">1. ก่อน (รูปต้นฉบับ)</span>
                <div className="aspect-square rounded-xl overflow-hidden border border-[#EFDCD3] bg-[#FAF7F4] flex items-center justify-center relative">
                  <img src={beforeUrl} alt="Before" className="w-full h-full object-cover object-center" />
                  <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                    ต้นฉบับ
                  </span>
                </div>
              </div>

              {/* 2. เรฟทรงผม */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-[#80665D] block truncate" title={selectedStyle?.name || "เรฟทรงผม"}>
                  2. เรฟทรงผม
                </span>
                <div className="aspect-square rounded-xl overflow-hidden border border-[#EFDCD3] bg-[#FAF7F4] flex items-center justify-center relative">
                  {selectedStyle?.thumbnail ? (
                    <img src={selectedStyle.thumbnail} alt={selectedStyle.name} className="w-full h-full object-cover object-center" />
                  ) : (
                    <div className="text-[10px] text-[#80665D] p-2 text-center">เรฟทรงผม</div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 bg-[#432B25]/80 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                    เรฟผม
                  </span>
                </div>
              </div>

              {/* 3. เรฟสีผม */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-[#80665D] block truncate" title={selectedColor?.name || "สีผมธรรมชาติเดิม (รูปต้นฉบับ)"}>
                  3. เรฟสีผม
                </span>
                <div className="aspect-square rounded-xl overflow-hidden border border-[#EFDCD3] bg-[#FAF7F4] flex items-center justify-center relative">
                  {selectedColor?.colorReference ? (
                    <img src={selectedColor.colorReference} alt={selectedColor.name} className="w-full h-full object-cover object-center" />
                  ) : selectedColor?.value ? (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: selectedColor.value }}>
                      <span className="bg-white/85 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-[#432B25]">
                        {selectedColor.value}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={beforeUrl}
                      alt="สีผมธรรมชาติเดิม (รูปภาพต้นฉบับ)"
                      className="w-full h-full object-cover object-center"
                    />
                  )}
                  <span className="absolute bottom-1.5 left-1.5 bg-[#432B25]/80 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {selectedColor ? "เรฟสี" : "รูปต้นฉบับ (สีธรรมชาติ)"}
                  </span>
                </div>
              </div>

              {/* 4. หลัง (ทรงผมใหม่) - ครอบเท่าเพื่อนและกดขยายดูรูปเต็มได้ */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#F27D68] truncate">4. หลัง (ทรงผมใหม่)</span>
                  {canShowAfter && (
                    <button
                      type="button"
                      onClick={() => setLightboxImage(afterUrl)}
                      className="text-[#F27D68] font-bold hover:underline flex items-center gap-0.5 cursor-pointer text-[9px]"
                      title="กดขยายดูรูปเต็ม"
                    >
                      <Maximize2 size={10} />
                      <span>ขยาย</span>
                    </button>
                  )}
                </div>
                <div
                  onClick={() => canShowAfter && setLightboxImage(afterUrl)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 border-[#F27D68] bg-[#FAF7F4] flex items-center justify-center shadow-xs relative ${
                    canShowAfter ? "cursor-zoom-in group" : ""
                  }`}
                  title={canShowAfter ? "คลิกเพื่อขยายดูรูปเต็มๆ" : undefined}
                >
                  {canShowAfter ? (
                    <img
                      src={afterUrl}
                      alt="ผลลัพธ์ทรงผมใหม่"
                      onError={() => {
                        console.error("Result image could not be displayed:", afterUrl.substring(0, 80));
                        setAfterImageError(true);
                      }}
                      className="w-full h-full object-cover object-center transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 p-2 text-center text-[#80665D]">
                      <ImageOff size={18} className="text-[#F27D68]" />
                      <span className="text-[10px] font-bold leading-tight">แสดงรูปผลลัพธ์ไม่ได้</span>
                      <span className="text-[9px] leading-tight">กด "ลองทรงอื่น" แล้วสร้างใหม่อีกครั้ง</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white pointer-events-none backdrop-blur-2xs">
                    <Maximize2 size={16} className="text-white drop-shadow-sm" />
                    <span className="text-[9px] font-bold bg-black/60 px-2 py-0.5 rounded-full">
                      คลิกดูรูปเต็ม
                    </span>
                  </div>
                  <span className="absolute bottom-1.5 right-1.5 bg-[#F27D68] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs pointer-events-none">
                    ผลลัพธ์
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-4">
              <h5 className="text-xs font-bold text-[#432B25] mb-1 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#F27D68]" />
                ระบบจำลองทรงผมเสมือนจริง
              </h5>
              <p className="text-[11px] text-[#80665D] leading-relaxed">
                จำลองทรงผมและเฉดสีผมเสมือนจริง โดยคงเค้าโครงใบหน้า แสงเงาธรรมชาติ และสีผิวเดิมของคุณไว้สมบูรณ์แบบ
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2 border-t border-[#EFDCD3]">
            {/* Watermark toggle option before saving */}
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-semibold text-xs text-[#432B25]">ลายน้ำภาพ LOOKLAB</span>
              <button
                type="button"
                onClick={handleToggleWatermark}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border select-none ${
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

            <button
              type="button"
              onClick={handleDownload}
              disabled={!canShowAfter}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#F27D68] hover:bg-[#E96A55] text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              <span>บันทึกภาพลงอุปกรณ์</span>
              <span className="text-[11px] font-normal opacity-85">
                ({includeWatermark ? "มีลายน้ำ" : "ไม่มีลายน้ำ"})
              </span>
            </button>

            {/* Button to open Feedback Questionnaire Modal */}
            {generationOutput && (
              <button
                type="button"
                onClick={() => setShowFeedbackModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FFF1E9] hover:bg-[#FFE3D5] text-[#F27D68] border border-[#F27D68]/30 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                title="เปิดหน้าต่างแบบสอบถามประเมินผลลัพธ์ภาพทรงผม"
              >
                <Sparkles size={14} className="fill-[#F27D68]" />
                <span>แบบสอบถามประเมินผลลัพธ์</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onTryAnotherStyle}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF8F4] text-[#432B25] border border-[#EFDCD3] font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft size={14} />
                <span>ลองทรงอื่น</span>
              </button>

              <button
                type="button"
                onClick={onRetake}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF8F4] text-[#432B25] border border-[#EFDCD3] font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Camera size={14} />
                <span>เปลี่ยนรูป</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Questionnaire Modal Window */}
      {feedbackContext && generationOutput && (
        <FeedbackCard
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          context={feedbackContext}
          images={generationOutput.images}
          activeResultKey={activeResultKey || generationOutput.primaryKey}
          onSelectResultKey={onSelectResultKey}
          userWaitSeconds={generationOutput.userWaitSeconds}
          originalFile={originalFile || null}
          onSelectOriginalFile={onSelectOriginalFile}
          apiUrl={apiUrl || ""}
          beforeUrl={beforeUrl}
          hairstyle={selectedStyle}
          hairColor={selectedColor}
          previewOnly={generationOutput.previewOnly}
        />
      )}

      {/* Lightbox Fullscreen Image Viewer Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 select-none animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
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
                  ภาพผลลัพธ์ทรงผมใหม่แบบเต็มตา
                </h4>
                <p className="text-[11px] text-white/70 truncate">
                  {selectedStyle?.name?.split(" (")[0]} · {selectedColor?.name?.split(" (")[0] || "สีธรรมชาติ"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="ดาวน์โหลดรูปผลลัพธ์"
              >
                <Download size={14} />
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>
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

          {/* Centered Image */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-auto overflow-hidden p-1 sm:p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Expanded Result"
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/15 animate-in zoom-in-95 duration-200"
            />
          </div>

          {/* Footer Info */}
          <div
            className="text-center text-white/75 text-xs pt-2 pb-1 flex items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="bg-white/10 px-3.5 py-1 rounded-full backdrop-blur-xs text-[11px]">
              คลิกที่ว่างรอบนอก หรือกดปุ่ม X เพื่อปิด
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
