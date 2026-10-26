import { User, Scissors, Palette, Upload, Camera, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { Hairstyle, HairColor } from "../types";

interface SelectionSummaryBarProps {
  sourceMode?: "camera" | "upload";
  userPhotoUrl: string | null;
  selectedHairstyle: Hairstyle | null;
  selectedColor: HairColor | null;
  isGenerating?: boolean;
  canGenerate?: boolean;
  generatingElapsedSec?: number;
  onUploadClick: () => void;
  onHairstyleClick: () => void;
  onColorClick: () => void;
  onGenerate?: () => void;
  variant?: "floating" | "embedded" | "sticky";
}

// Helper to provide concise display name without long parenthetical suffixes
function getShortStyleName(style: Hairstyle): string {
  if (style.id === "original_style") return "ทรงเดิม";
  if (style.name) return style.name.split(" (")[0];
  return style.englishName || "ทรงผม";
}

export default function SelectionSummaryBar({
  sourceMode = "upload",
  userPhotoUrl,
  selectedHairstyle,
  selectedColor,
  isGenerating = false,
  generatingElapsedSec,
  onUploadClick,
  onHairstyleClick,
  onColorClick,
  onGenerate,
  variant = "floating",
}: SelectionSummaryBarProps) {
  const isCameraMode = sourceMode === "camera";
  const showGenerateButton = sourceMode === "upload" && Boolean(onGenerate);

  // Determine color presentation: thumbnail or swatch
  const colorThumbnail =
    selectedColor?.swatchImage ||
    (selectedColor?.colorReference && selectedColor.colorReference.trim() !== ""
      ? selectedColor.colorReference
      : null);
  const colorHex = selectedColor?.value || "#4A2E18";

  return (
    <aside
      id="selection-summary-bar"
      aria-label="แถบสรุปตัวเลือกทรงผมและสีผม"
      style={{
        bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))",
      }}
      className={
        variant === "floating"
          ? "fixed left-1/2 -translate-x-1/2 z-[38] w-[calc(100%-1.25rem)] sm:w-[calc(100%-2rem)] lg:w-[calc(100%-3rem)] xl:w-[calc(100%-4rem)] max-w-[1680px] pointer-events-none transition-all duration-300"
          : "sticky z-[38] w-full pointer-events-none transition-all duration-300"
      }
    >
      <div className="w-full bg-[#FFF8F4]/98 backdrop-blur-xl border border-[#EFDCD3] shadow-[0_10px_35px_rgba(67,43,37,0.18)] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 pointer-events-auto flex flex-col md:flex-row items-stretch md:items-center gap-1.5 sm:gap-2">
        {/* 3 Summary Choices: User Photo / Camera + Hairstyle + Hair Color */}
        <div className="grid grid-cols-3 divide-x divide-[#EFDCD3]/80 min-w-0 flex-1">
          {/* 1. รูปใบหน้า / กล้อง (User Photo or Camera) */}
          <button
            type="button"
            onClick={onUploadClick}
            disabled={isGenerating}
            className="group flex items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-2.5 py-1 rounded-xl hover:bg-[#FFE3D5]/50 transition-colors cursor-pointer min-w-0 text-left border border-transparent hover:border-[#EFDCD3] active:scale-[0.98] select-none disabled:opacity-60 disabled:cursor-not-allowed"
            title={
              isCameraMode
                ? (userPhotoUrl ? "คลิกเพื่อเลื่อนขึ้นไปที่กล้องถ่ายภาพ" : "คลิกเพื่อเลื่อนขึ้นไปเปิดกล้อง")
                : (userPhotoUrl ? "คลิกเพื่อเปลี่ยนรูปใบหน้าของคุณ" : "คลิกเพื่ออัปโหลดรูปใบหน้าของคุณ")
            }
            aria-label={
              isCameraMode
                ? (userPhotoUrl ? "ภาพถ่ายจากกล้อง พร้อมใช้งาน คลิกเพื่อเลื่อนไปที่กล้อง" : "คลิกเพื่อเลื่อนขึ้นไปเปิดกล้อง")
                : (userPhotoUrl ? "รูปของคุณ พร้อมใช้งาน คลิกเพื่อเปลี่ยนรูป" : "ยังไม่มีรูป คลิกเพื่ออัปโหลดรูป")
            }
          >
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 border border-[#EFDCD3] bg-[#FFE3D5]/60 flex items-center justify-center shadow-2xs">
              {isCameraMode ? (
                <div className="flex flex-col items-center justify-center text-[#F27D68]">
                  <Camera size={16} />
                </div>
              ) : userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt="รูปใบหน้าของคุณ"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#F27D68]">
                  <Upload size={15} className="sm:hidden" />
                  <User size={17} className="hidden sm:block" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#80665D] block truncate">
                {isCameraMode ? "กล้องของคุณ" : "รูปของคุณ"}
              </span>
              <span
                className={`text-[11px] sm:text-xs font-bold block truncate ${
                  isCameraMode || userPhotoUrl ? "text-[#432B25]" : "text-[#F27D68]"
                }`}
              >
                {isCameraMode ? "กล้องสดเรียลไทม์" : userPhotoUrl ? "พร้อมใช้" : "อัปโหลดรูป"}
              </span>
            </div>
          </button>

          {/* 2. ทรงผม (Hairstyle) */}
          <button
            type="button"
            onClick={onHairstyleClick}
            disabled={isGenerating}
            className="group flex items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-2.5 py-1 rounded-xl hover:bg-[#FFE3D5]/50 transition-colors cursor-pointer min-w-0 text-left border border-transparent hover:border-[#EFDCD3] active:scale-[0.98] select-none disabled:opacity-60 disabled:cursor-not-allowed"
            title={selectedHairstyle ? `ทรงผม: ${selectedHairstyle.name} (คลิกเพื่อเลือกทรงอื่น)` : "คลิกเพื่อเลือกทรงผม"}
            aria-label={selectedHairstyle ? `ทรงผมที่เลือก: ${selectedHairstyle.name}` : "ยังไม่ได้เลือกทรงผม คลิกเพื่อเลือก"}
          >
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 border border-[#EFDCD3] bg-[#FFF1E9] flex items-center justify-center shadow-2xs">
              {selectedHairstyle ? (
                selectedHairstyle.id === "original_style" ? (
                  isCameraMode ? (
                    /* ในโหมดกล้อง เมื่อเลือกทรงผมเดิม ไม่แสดงรูปถ่าย ให้แสดงไอคอนทรงเดิม */
                    <div className="w-full h-full bg-gradient-to-tr from-[#3a2e2b] via-[#654e47] to-[#9c8479] flex items-center justify-center text-[#FFE3D5]">
                      <RotateCcw size={16} />
                    </div>
                  ) : userPhotoUrl || selectedHairstyle.thumbnail ? (
                    <img
                      src={userPhotoUrl || selectedHairstyle.thumbnail}
                      alt={selectedHairstyle.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-[#3a2e2b] via-[#654e47] to-[#9c8479] flex items-center justify-center text-[#FFE3D5]">
                      <RotateCcw size={16} />
                    </div>
                  )
                ) : (selectedHairstyle.thumbnail || selectedHairstyle.previewOverlay) ? (
                  <img
                    src={selectedHairstyle.thumbnail || selectedHairstyle.previewOverlay}
                    alt={selectedHairstyle.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Scissors size={16} className="text-[#80665D]" />
                )
              ) : (
                <Scissors size={16} className="text-[#80665D]" />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#80665D] block truncate">
                ทรงผม
              </span>
              <span
                className={`text-[11px] sm:text-xs font-bold block truncate ${
                  selectedHairstyle ? "text-[#432B25]" : "text-[#F27D68]"
                }`}
                title={selectedHairstyle?.name}
              >
                {selectedHairstyle ? getShortStyleName(selectedHairstyle) : "เลือกทรงผม"}
              </span>
            </div>
          </button>

          {/* 3. สีผม (Hair Color) */}
          <button
            type="button"
            onClick={onColorClick}
            disabled={isGenerating}
            className="group flex items-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-2.5 py-1 rounded-xl hover:bg-[#FFE3D5]/50 transition-colors cursor-pointer min-w-0 text-left border border-transparent hover:border-[#EFDCD3] active:scale-[0.98] select-none disabled:opacity-60 disabled:cursor-not-allowed"
            title={selectedColor ? `สีผม: ${selectedColor.name} (คลิกเพื่อเลือกสีอื่น)` : "สีธรรมชาติ (คลิกเพื่อเลือกสีอื่น)"}
            aria-label={selectedColor ? `สีผมที่เลือก: ${selectedColor.name}` : "สีผมธรรมชาติ"}
          >
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 border border-[#EFDCD3] bg-[#FFF1E9] flex items-center justify-center shadow-2xs">
              {selectedColor ? (
                colorThumbnail ? (
                  <img
                    src={colorThumbnail}
                    alt={selectedColor?.name || "สีผม"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: colorHex }}
                  />
                )
              ) : !isCameraMode && userPhotoUrl ? (
                /* ในหน้าอัปโหลดรูป แสดงรูปสีผมธรรมชาติของคุณ */
                <img
                  src={userPhotoUrl}
                  alt="สีผมธรรมชาติของคุณ"
                  className="w-full h-full object-cover"
                />
              ) : (
                /* ในหน้ากล้อง ไม่ต้องแสดงรูปสีผมธรรมชาติ ใช้ไอคอน/สีธรรมชาติ */
                <div className="w-full h-full bg-gradient-to-tr from-[#3a2e2b] via-[#654e47] to-[#9c8479] flex items-center justify-center text-white">
                  <Palette size={16} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#80665D] block truncate">
                สีผม
              </span>
              <span
                className="text-[11px] sm:text-xs font-bold block truncate text-[#432B25]"
                title={selectedColor ? selectedColor?.name : "สีธรรมชาติ"}
              >
                {selectedColor ? (selectedColor.name.split(" (")[0] || selectedColor.name) : "สีธรรมชาติ"}
              </span>
            </div>
          </button>
        </div>

        {/* 4. ปุ่มสร้างลุคใหม่ของคุณ (เด่นชัด สวยงาม มีแสงเงา เรืองแสงแบบปุ่มหลักเดิม) */}
        {showGenerateButton && (
          <button
            type="button"
            id="btn-generate-look-ai"
            onClick={onGenerate}
            disabled={isGenerating}
            title={
              !userPhotoUrl
                ? "คลิกเพื่ออัปโหลดรูปภาพและสร้างลุคใหม่ของคุณ"
                : "สร้างลุคใหม่ของคุณ"
            }
            aria-label="สร้างลุคใหม่ของคุณ"
            className={`group relative flex items-center justify-center gap-2 px-5 sm:px-6 h-11 sm:h-12 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base transition-all duration-200 select-none cursor-pointer shrink-0 active:scale-[0.98] w-full md:w-auto shadow-[0_8px_25px_rgba(242,125,104,0.48)] hover:shadow-[0_12px_32px_rgba(242,125,104,0.62)] ${
              isGenerating
                ? "bg-[#EFDCD3] text-[#A18B82] cursor-not-allowed shadow-none"
                : "animate-pulse-glow-2s bg-gradient-to-r from-[#F27D68] via-[#FF755D] to-[#E96A55] hover:from-[#E96A55] hover:to-[#D85B48] active:bg-[#D85B48] text-white ring-2 ring-white/80 hover:ring-white"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span className="whitespace-nowrap font-bold">
                  {typeof generatingElapsedSec === "number"
                    ? `ระบบกำลังประมวลผล (${generatingElapsedSec.toFixed(1)} วินาที)`
                    : "กำลังประมวลผล..."}
                </span>
              </>
            ) : (
              <>
                <Sparkles size={18} className="fill-white text-white shrink-0 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-200" />
                <span className="whitespace-nowrap font-bold tracking-wide">สร้างลุคใหม่ของคุณ</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
