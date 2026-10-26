import { useState } from "react";
import { Hairstyle } from "../types";
import { HAIRSTYLES } from "../data";
import { Check, ArrowRight, RotateCcw, Sparkles } from "lucide-react";

interface HairstyleSelectorProps {
  selected: Hairstyle | null;
  onSelect: (style: Hairstyle) => void;
  options?: Hairstyle[];
  originalImageUrl?: string | null;
  isCameraMode?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onViewAllCatalog?: () => void;
}

// Helper to provide the concise display name
function getShortDisplayName(style: Hairstyle): string {
  if (style.id === "original_style") {
    return "ทรงผมต้นฉบับ";
  }
  if (style.name) {
    return style.name.split(" (")[0];
  }
  return style.englishName || style.name || "ทรงผม";
}

export default function HairstyleSelector({
  selected,
  onSelect,
  options = HAIRSTYLES,
  originalImageUrl,
  isCameraMode = false,
  disabled = false,
  disabledReason,
  onViewAllCatalog,
}: HairstyleSelectorProps) {
  const [genderFilter, setGenderFilter] = useState<"all" | "female" | "male" | "unisex">("all");

  const filteredOptions = options.filter((style) => {
    // "ทรงผมต้นฉบับ" is unisex and always available in all tabs
    if (style.id === "original_style") return true;
    if (genderFilter === "all") return true;
    if (genderFilter === "unisex") return style.gender === "unisex";
    return style.gender === genderFilter;
  });

  // Show all filtered hairstyles directly in scrollable container
  const displayedCards = filteredOptions;

  return (
    <div className="w-full space-y-3">
      {/* 1. Header with 'เลือกทรงผม' and Gender Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap max-w-full">
          <div className="flex items-center gap-1.5 shrink-0">
            <h3 className="text-sm sm:text-base font-bold text-[#432B25] whitespace-nowrap">
              เลือกทรงผม
            </h3>
            <span className="text-[11px] font-semibold text-[#80665D] bg-[#FFF1E9] border border-[#EFDCD3] px-2 py-0.5 rounded-full shrink-0">
              {displayedCards.length} ทรง
            </span>
          </div>

          {/* Gender Filter Tabs */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#FFF1E9] border border-[#EFDCD3] p-0.5 rounded-full text-[10px] sm:text-[11px] max-w-full overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setGenderFilter("all")}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                genderFilter === "all"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter("female")}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                genderFilter === "female"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ผู้หญิง
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter("male")}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                genderFilter === "male"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ผู้ชาย
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter("unisex")}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full transition cursor-pointer font-medium shrink-0 whitespace-nowrap ${
                genderFilter === "unisex"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              Unisex
            </button>
          </div>
        </div>

        {/* 'แคตตาล็อก ->' Link */}
        {onViewAllCatalog && (
          <button
            type="button"
            onClick={onViewAllCatalog}
            className="text-xs text-[#F27D68] hover:text-[#E96A55] flex items-center gap-1 transition cursor-pointer font-semibold shrink-0 self-center ml-auto sm:ml-0"
          >
            <span className="text-[11px] sm:text-xs">แคตตาล็อก</span>
            <ArrowRight size={13} className="shrink-0" />
          </button>
        )}
      </div>

      {/* Disabled Notification */}
      {disabled && (
        <div className="bg-[#FFF1E9] border border-[#EFDCD3] rounded-xl px-3 py-2 text-xs text-[#80665D] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F27D68] animate-ping" />
          <span>{disabledReason || "ระบบกำลังประมวลผล กรุณารอสักครู่"}</span>
        </div>
      )}

      {/* 2. Hairstyle Cards Grid with Vertical Scrollbar (แท็บบาร์เลื่อนขึ้นลง ดูทรงทั้งหมด) */}
      <div className="max-h-[340px] sm:max-h-[380px] custom-scrollbar-y pr-1.5 -mr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 py-0.5">
          {displayedCards.map((style) => {
            const isSelected = selected?.id === style.id;
            const shortTitle = getShortDisplayName(style);

            return (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  if (!disabled) onSelect(style);
                }}
                disabled={disabled}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-200 flex flex-col p-2 text-left ${
                  disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${
                  isSelected
                    ? "bg-[#FFF1E9] border-2 border-[#F27D68] shadow-[0_4px_16px_rgba(242,125,104,0.18)]"
                    : "bg-white border border-[#EFDCD3] hover:border-[#F27D68]/60 hover:shadow-xs"
                }`}
              >
                {/* Photo Container */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#FAF7F4]">
                  {style.id === "original_style" ? (
                    (!isCameraMode && (originalImageUrl || style.thumbnail)) ? (
                      <img
                        src={originalImageUrl || style.thumbnail}
                        alt="ทรงผมต้นฉบับของคุณ"
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#3a2e2b] via-[#654e47] to-[#9c8479] flex flex-col items-center justify-center text-white p-1 text-center">
                        <RotateCcw size={18} className="mb-0.5 text-[#FFE3D5]" />
                        <span className="text-[10px] font-bold">ทรงเดิม</span>
                        <span className="text-[8px] text-white/80">
                          {isCameraMode ? "กล้องสดเรียลไทม์" : "จากรูปของคุณ"}
                        </span>
                      </div>
                    )
                  ) : (
                    <img
                      src={style.thumbnail}
                      alt={style.name}
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                      }}
                    />
                  )}

                  {/* Corner Badge */}
                  {style.id === "original_style" ? (
                    <span className="absolute bottom-1.5 left-1.5 bg-[#47735C] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                      ทรงเดิม
                    </span>
                  ) : style.isTrending ? (
                    <span className="absolute bottom-1.5 left-1.5 bg-[#FFE3D5]/90 text-[#F27D68] text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-[#EFDCD3] shadow-2xs">
                      ฮิต
                    </span>
                  ) : null}

                  {/* Top-Right Circle Checkmark when Selected */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#F27D68] text-white flex items-center justify-center shadow-md">
                      <Check size={13} className="stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Bottom Name Label underneath photo */}
                <div className="w-full pt-1.5 pb-0.5 text-center">
                  <span
                    className={`text-xs block truncate ${
                      isSelected
                        ? "text-[#F27D68] font-bold"
                        : "text-[#432B25] font-medium group-hover:text-[#F27D68]"
                    }`}
                  >
                    {shortTitle}
                  </span>
                  {style.id === "original_style" && (
                    <span className="text-[9px] text-[#80665D] block truncate leading-tight mt-0.5">
                      เปลี่ยนเฉพาะสีผม
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
