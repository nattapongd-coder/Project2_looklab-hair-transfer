import { useState, useRef } from "react";
import { HairColor } from "../types";
import { HAIR_COLORS } from "../data";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";

interface HairColorSelectorProps {
  selected: HairColor | null;
  onSelect: (color: HairColor | null) => void;
  options?: HairColor[];
  originalImageUrl?: string | null;
  isCameraMode?: boolean;
  colorIntensity?: number;
  onIntensityChange?: (val: number) => void;
  hairVolume?: number;
  onVolumeChange?: (val: number) => void;
  hairShine?: number;
  onShineChange?: (val: number) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export default function HairColorSelector({
  selected,
  onSelect,
  options = HAIR_COLORS,
  originalImageUrl,
  isCameraMode = false,
  disabled = false,
  disabledReason,
}: HairColorSelectorProps) {
  // Filters identical to CatalogTab: "all" | "natural" | "warm" | "cool" | "fashion"
  const [toneFilter, setToneFilter] = useState<string>("all");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Use full set of colors (HAIR_COLORS or scanned options)
  const allColors = options && options.length > 0 ? options : HAIR_COLORS;

  const filteredColors = allColors.filter((color) => {
    if (toneFilter === "all") return true;
    if (toneFilter === "natural") return color.category === "natural";
    if (toneFilter === "warm") return color.category === "warm";
    if (toneFilter === "cool") return color.category === "cool";
    if (toneFilter === "fashion") return color.category === "fashion" || color.category === "pastel";
    return true;
  });

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* 1. Header with 'เลือกสีผม', count, filter tabs, and scroll controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap max-w-full">
          <div className="flex items-center gap-1.5 shrink-0">
            <h3 className="text-sm sm:text-base font-bold text-[#432B25] whitespace-nowrap">
              เลือกสีผม
            </h3>
            <span className="text-[11px] font-semibold text-[#80665D] bg-[#FFF1E9] border border-[#EFDCD3] px-2 py-0.5 rounded-full shrink-0">
              {filteredColors.length} สี
            </span>
          </div>

          {/* Tone Filters - 100% matched with CatalogTab */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#FFF1E9] border border-[#EFDCD3] p-0.5 rounded-full text-[10px] sm:text-[11px] max-w-full overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setToneFilter("all")}
              className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                toneFilter === "all"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setToneFilter("natural")}
              className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                toneFilter === "natural"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ธรรมชาติ
            </button>
            <button
              type="button"
              onClick={() => setToneFilter("warm")}
              className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                toneFilter === "warm"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              โทนอุ่น
            </button>
            <button
              type="button"
              onClick={() => setToneFilter("cool")}
              className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                toneFilter === "cool"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              โทนเย็น / แอช
            </button>
            <button
              type="button"
              onClick={() => setToneFilter("fashion")}
              className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                toneFilter === "fashion"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              แฟชั่น / พาสเทล
            </button>
          </div>
        </div>

        {/* Selected Color Name indicator and navigation arrows */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
          <span className="text-[11px] sm:text-xs text-[#F27D68] font-bold truncate max-w-[95px] xs:max-w-[130px] sm:max-w-[170px]">
            • {selected ? selected.name.split(" (")[0] : "สีธรรมชาติ"}
          </span>
          {/* Quick scroll arrows */}
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={scrollLeft}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FFF1E9] hover:bg-[#FFE3D5] text-[#80665D] border border-[#EFDCD3] flex items-center justify-center transition cursor-pointer shadow-2xs"
              aria-label="เลื่อนซ้าย"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft size={13} className="sm:w-[15px] sm:h-[15px]" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#FFF1E9] hover:bg-[#FFE3D5] text-[#80665D] border border-[#EFDCD3] flex items-center justify-center transition cursor-pointer shadow-2xs"
              aria-label="เลื่อนขวา"
              title="เลื่อนขวา"
            >
              <ChevronRight size={13} className="sm:w-[15px] sm:h-[15px]" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compact Circular Swatches Row with Horizontal Scroll (วงกลมขนาดพอดี เล็กลง คมชัด สวยงาม) */}
      <div
        ref={scrollContainerRef}
        className="flex items-start gap-2.5 sm:gap-3 custom-scrollbar-x pb-2.5 pt-1 px-1 overflow-x-auto"
      >
        {/* Reset / Natural Color option circle */}
        <button
          type="button"
          onClick={() => {
            if (!disabled) onSelect(null);
          }}
          disabled={disabled}
          className={`flex flex-col items-center shrink-0 cursor-pointer group transition-all ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          }`}
          title="ใช้สีผมธรรมชาติเดิม"
        >
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-200 relative overflow-hidden flex items-center justify-center shadow-xs ${
              selected === null
                ? "ring-2.5 ring-[#F27D68] ring-offset-2 ring-offset-white scale-105 shadow-[0_4px_14px_rgba(242,125,104,0.35)] bg-[#FFF1E9]"
                : "border-2 border-[#EFDCD3] bg-white hover:border-[#F27D68]/60 hover:scale-105"
            }`}
          >
            {/* ในหน้าอัปโหลดรูปแสดงรูปสีผมธรรมชาติของคุณ ในหน้ากล้องไม่ต้องแสดงรูป */}
            {originalImageUrl && !isCameraMode ? (
              <img
                src={originalImageUrl}
                alt="รูปภาพต้นฉบับ (สีผมธรรมชาติของคุณ)"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-[#3a2e2b] via-[#654e47] to-[#9c8479] flex flex-col items-center justify-center text-white">
                <RotateCcw size={17} className="mb-0.5" />
                <span className="text-[9px] font-bold">ธรรมชาติ</span>
              </div>
            )}
            {selected === null && (
              <span className="absolute inset-0 bg-[#F27D68]/40 backdrop-blur-[1px] flex items-center justify-center">
                <span className="bg-[#F27D68] text-white rounded-full p-1 shadow-xs flex items-center justify-center">
                  <Check size={14} className="stroke-[3]" />
                </span>
              </span>
            )}
          </div>
          <span
            className={`text-[11px] sm:text-xs block mt-1 text-center leading-tight truncate w-14 sm:w-16 ${
              selected === null ? "text-[#F27D68] font-bold" : "text-[#432B25] font-medium"
            }`}
          >
            สีธรรมชาติ
          </span>
        </button>

        {/* Dynamic Color Circles */}
        {filteredColors.map((color) => {
          const isSelected = selected?.id === color.id;
          const swatchSrc =
            color.swatchImage ||
            (color.colorReference?.startsWith("/") ? color.colorReference : undefined);
          const shortName = color.name.split(" (")[0];

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => {
                if (disabled) return;
                if (isSelected) {
                  onSelect(null); // click again to deselect
                } else {
                  onSelect(color);
                }
              }}
              disabled={disabled}
              className={`flex flex-col items-center shrink-0 cursor-pointer group transition-all ${
                disabled ? "opacity-60 cursor-not-allowed" : ""
              }`}
              title={isSelected ? `${color.name} (คลิกซ้ำเพื่อใช้สีธรรมชาติ)` : color.name}
              aria-label={color.name}
            >
              {/* Compact Circle Swatch (w-14 sm:w-16) */}
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-200 relative overflow-hidden flex items-center justify-center shadow-xs ${
                  isSelected
                    ? "ring-2.5 ring-[#F27D68] ring-offset-2 ring-offset-white scale-105 shadow-[0_4px_14px_rgba(242,125,104,0.4)]"
                    : "border-2 border-[#EFDCD3] hover:border-[#F27D68]/70 hover:scale-105"
                }`}
                style={{ backgroundColor: color.value }}
              >
                {/* Real High-Resolution Hair Color Photo */}
                {swatchSrc ? (
                  <img
                    src={swatchSrc}
                    alt={color.name}
                    className="w-full h-full object-cover object-top absolute inset-0 pointer-events-none transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : null}

                {/* Subtle radial sheen */}
                <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/25 via-transparent to-white/20 pointer-events-none" />

                {/* Color Dot Tag at bottom */}
                <div
                  className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border border-white shadow-xs"
                  style={{ backgroundColor: color.value }}
                />

                {/* Selected Checkmark overlay with dark scrim */}
                {isSelected && (
                  <span className="relative z-10 w-full h-full bg-black/45 flex items-center justify-center">
                    <Check
                      size={18}
                      className="stroke-[3] text-white drop-shadow-md"
                    />
                  </span>
                )}
              </div>

              {/* Color Name Label Underneath Circle */}
              <span
                className={`text-[11px] sm:text-xs block mt-1 text-center leading-tight truncate w-14 sm:w-16 ${
                  isSelected
                    ? "text-[#F27D68] font-bold"
                    : "text-[#432B25] font-medium group-hover:text-[#F27D68]"
                }`}
              >
                {shortName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Helpful Hint under color picker */}
      <div className="flex items-center justify-between text-[11px] text-[#80665D] pt-0.5 px-0.5">
        <span className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-[#F27D68] shrink-0" />
          <span>คลิกวงกลมเพื่อเลือกสีผม (คลิกซ้ำหรือกด &apos;สีธรรมชาติ&apos; เพื่อคืนค่ารูปต้นฉบับเดิม)</span>
        </span>
        {selected && (
          <button
            type="button"
            onClick={() => {
              if (!disabled) onSelect(null);
            }}
            disabled={disabled}
            className="text-[#F27D68] hover:text-[#E96A55] font-semibold cursor-pointer shrink-0 ml-2 hover:underline"
          >
            ล้างสีผม
          </button>
        )}
      </div>
    </div>
  );
}
