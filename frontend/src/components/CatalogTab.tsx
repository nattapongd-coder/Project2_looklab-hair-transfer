import { useState } from "react";
import { Hairstyle, HairColor } from "../types";
import { HAIRSTYLES, HAIR_COLORS } from "../data";
import { ArrowRight, Check, Sparkles, Palette, Scissors, RotateCcw } from "lucide-react";

interface CatalogTabProps {
  onSelectHairstyle: (style: Hairstyle) => void;
  onSelectColor?: (color: HairColor | null) => void;
  hairstyles?: Hairstyle[];
  hairColors?: HairColor[];
  selectedHairstyle?: Hairstyle | null;
  selectedColor?: HairColor | null;
  originalImageUrl?: string | null;
  disabled?: boolean;
}

export default function CatalogTab({
  onSelectHairstyle,
  onSelectColor,
  hairstyles = HAIRSTYLES,
  hairColors = HAIR_COLORS,
  selectedHairstyle,
  selectedColor,
  originalImageUrl,
  disabled = false,
}: CatalogTabProps) {
  // Main Category Tab ("hairstyles" | "colors")
  const [catalogSection, setCatalogSection] = useState<"hairstyles" | "colors">("hairstyles");

  // Hairstyle Gender Filter ("all" | "female" | "male" | "unisex")
  const [styleFilter, setStyleFilter] = useState<"all" | "female" | "male" | "unisex">("all");

  // Hair Color Category Filter ("all" | "natural" | "warm" | "cool" | "fashion")
  const [colorFilter, setColorFilter] = useState<string>("all");

  const displayStyles = hairstyles.length > 0 ? hairstyles : HAIRSTYLES;
  const displayColors = hairColors.length > 0 ? hairColors : HAIR_COLORS;

  const filteredStyles = displayStyles.filter((s) => {
    if (s.id === "original_style") return true;
    if (styleFilter === "all") return true;
    if (styleFilter === "unisex") return s.gender === "unisex";
    return s.gender === styleFilter;
  });

  const filteredColors = displayColors.filter((c) => {
    if (colorFilter === "all") return true;
    if (colorFilter === "fashion") return c.category === "fashion" || c.category === "pastel";
    return c.category === colorFilter;
  });

  return (
    <div className="w-full max-w-[1680px] mx-auto space-y-6 animate-fade-in text-[#432B25]">
      {/* Editorial Header Banner */}
      <div className="bg-white border border-[#EFDCD3] rounded-[24px] p-6 sm:p-8 text-[#432B25] relative overflow-hidden shadow-[0_8px_30px_rgba(91,52,37,0.06)]">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <span className="inline-block bg-[#FFE3D5] text-[#F27D68] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs border border-[#EFDCD3]">
            LOOKLAB CATALOGUE
          </span>
          <h2 className="font-brand text-2xl sm:text-3xl font-extrabold tracking-tight text-[#432B25]">
            คลังทรงผมและเฉดสีผมยอดนิยม
          </h2>
          <p className="text-xs sm:text-sm text-[#80665D] leading-relaxed">
            เลือกทรงผมหรือสีผมที่คุณชื่นชอบเพื่อทดลองสวมใส่แบบเรียลไทม์ หรือสร้างภาพจำลองทรงผมเสมือนจริงคุณภาพสูง
          </p>
        </div>
      </div>

      {/* Primary Section Switcher: ทรงผม vs สีผม */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
        {/* Big Pill Switcher */}
        <div className="inline-flex bg-[#FFF1E9] p-1.5 rounded-2xl border border-[#EFDCD3] shadow-2xs">
          <button
            type="button"
            onClick={() => setCatalogSection("hairstyles")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              catalogSection === "hairstyles"
                ? "bg-[#F27D68] text-white shadow-xs"
                : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFE3D5]/60"
            }`}
          >
            <Scissors size={15} />
            <span>ทรงผม ({displayStyles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCatalogSection("colors")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              catalogSection === "colors"
                ? "bg-[#F27D68] text-white shadow-xs"
                : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFE3D5]/60"
            }`}
          >
            <Palette size={15} />
            <span>สีผม ({displayColors.length})</span>
          </button>
        </div>

        {/* Sub-Filters based on Active Section - 100% consistent with Try-On page */}
        {catalogSection === "hairstyles" ? (
          <div className="flex items-center bg-[#FFF1E9] p-1 rounded-full border border-[#EFDCD3] text-xs font-medium shadow-2xs">
            <button
              type="button"
              onClick={() => setStyleFilter("all")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                styleFilter === "all"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setStyleFilter("female")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                styleFilter === "female"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ผู้หญิง
            </button>
            <button
              type="button"
              onClick={() => setStyleFilter("male")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                styleFilter === "male"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ผู้ชาย
            </button>
            <button
              type="button"
              onClick={() => setStyleFilter("unisex")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                styleFilter === "unisex"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              Unisex
            </button>
          </div>
        ) : (
          <div className="flex items-center bg-[#FFF1E9] p-1 rounded-full border border-[#EFDCD3] text-xs font-medium shadow-2xs flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setColorFilter("all")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                colorFilter === "all"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setColorFilter("natural")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                colorFilter === "natural"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              ธรรมชาติ
            </button>
            <button
              type="button"
              onClick={() => setColorFilter("warm")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                colorFilter === "warm"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              โทนอุ่น
            </button>
            <button
              type="button"
              onClick={() => setColorFilter("cool")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                colorFilter === "cool"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              โทนเย็น / แอช
            </button>
            <button
              type="button"
              onClick={() => setColorFilter("fashion")}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer font-medium ${
                colorFilter === "fashion"
                  ? "bg-[#F27D68] text-white font-semibold shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25]"
              }`}
            >
              แฟชั่น / พาสเทล
            </button>
          </div>
        )}
      </div>

      {/* 1. HAIRSTYLES SECTION */}
      {catalogSection === "hairstyles" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStyles.map((style) => {
            const isSelected = selectedHairstyle?.id === style.id;
            return (
              <div
                key={style.id}
                className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                  isSelected
                    ? "border-2 border-[#F27D68] ring-2 ring-[#F27D68]/30 shadow-[0_4px_16px_rgba(242,125,104,0.18)]"
                    : "border-[#EFDCD3] hover:border-[#F27D68]/60 hover:shadow-md"
                }`}
              >
                <div className="space-y-3">
                  <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-[#FAF7F4]">
                    {style.id === "original_style" && !(originalImageUrl || style.thumbnail) ? (
                      <div className="w-full h-full bg-gradient-to-tr from-[#3a2e2b] via-[#654e47] to-[#9c8479] flex flex-col items-center justify-center text-white p-2 text-center">
                        <RotateCcw size={24} className="mb-1 text-[#FFE3D5]" />
                        <span className="text-xs font-bold">ทรงผมเดิม</span>
                        <span className="text-[10px] text-white/80">จะเปลี่ยนตามรูปที่อัปโหลด</span>
                      </div>
                    ) : (
                      <img
                        src={style.id === "original_style" ? (originalImageUrl || style.thumbnail) : style.thumbnail}
                        alt={style.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    )}
                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 bg-[#F27D68] text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Check size={12} className="stroke-[3]" />
                        <span>เลือกอยู่</span>
                      </span>
                    )}
                    {style.id === "original_style" ? (
                      <span className="absolute top-2.5 left-2.5 bg-[#EBF7F0]/95 text-[#2E6B47] font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs backdrop-blur-md border border-[#C6ECD4] flex items-center gap-1">
                        <RotateCcw size={11} className="text-[#2E6B47]" />
                        <span>คงทรงเดิม</span>
                      </span>
                    ) : style.isTrending ? (
                      <span className="absolute top-2.5 left-2.5 bg-[#FFE3D5]/95 text-[#F27D68] font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs backdrop-blur-md border border-[#EFDCD3] flex items-center gap-1">
                        <Sparkles size={11} className="fill-[#F27D68]" />
                        <span>ฮิต</span>
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h4 className="font-bold text-[#432B25] text-sm">
                      {style.name}
                    </h4>
                    {style.englishName && (
                      <p className="text-[11px] text-[#80665D] mt-0.5">{style.englishName}</p>
                    )}
                    {style.description && (
                      <p className="text-xs text-[#80665D] mt-2 leading-relaxed">
                        {style.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!disabled) onSelectHairstyle(style);
                  }}
                  disabled={disabled}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                    disabled
                      ? "bg-[#FFF1E9] text-[#A18B82] cursor-not-allowed opacity-60"
                      : isSelected
                      ? "bg-[#FFE3D5] text-[#F27D68] font-bold hover:bg-[#F27D68] hover:text-white shadow-xs"
                      : "bg-[#FFF8F4] hover:bg-[#F27D68] text-[#432B25] hover:text-white border border-[#EFDCD3]"
                  }`}
                >
                  <span>
                    {isSelected
                      ? "เลือกทรงนี้แล้ว (กลับไปลอง)"
                      : style.id === "original_style"
                      ? "ลองเปลี่ยนเฉพาะสีผม (คงทรงเดิม)"
                      : "ลองเปลี่ยนทรงนี้"}
                  </span>
                  <ArrowRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. HAIR COLORS SECTION */}
      {catalogSection === "colors" && (
        <div className="space-y-5">
          {/* Natural/Default Reset Option Card */}
          <div
            onClick={() => {
              if (!disabled && onSelectColor) onSelectColor(null);
            }}
            className={`bg-white rounded-2xl p-4 border transition-all flex items-center justify-between gap-4 shadow-sm cursor-pointer ${
              selectedColor === null
                ? "border-2 border-[#F27D68] ring-2 ring-[#F27D68]/30 shadow-[0_4px_16px_rgba(242,125,104,0.18)]"
                : "border-[#EFDCD3] hover:border-[#F27D68]/60 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#242426] via-[#432B25] to-[#80665D] flex items-center justify-center text-white border border-[#EFDCD3] shadow-xs shrink-0 overflow-hidden">
                {originalImageUrl ? (
                  <img src={originalImageUrl} alt="รูปภาพต้นฉบับ" className="w-full h-full object-cover" />
                ) : (
                  <RotateCcw size={18} />
                )}
              </div>
              <div>
                <h4 className="font-bold text-[#432B25] text-sm">
                  สีผมธรรมชาติเดิม (Original Color)
                </h4>
                <p className="text-[11px] text-[#80665D]">
                  คงเฉดสีผมตามรูปถ่ายต้นฉบับ โดยไม่เปลี่ยนโทนสีผมใหม่
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedColor === null
                  ? "bg-[#FFE3D5] text-[#F27D68]"
                  : "bg-[#FFF8F4] text-[#432B25] border border-[#EFDCD3]"
              }`}
            >
              {selectedColor === null ? "เลือกอยู่" : "ใช้สีธรรมชาติ"}
            </button>
          </div>

          {/* Hair Colors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredColors.map((color) => {
              const isSelected = selectedColor?.id === color.id;
              return (
                <div
                  key={color.id}
                  className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                    isSelected
                      ? "border-2 border-[#F27D68] ring-2 ring-[#F27D68]/30 shadow-[0_4px_16px_rgba(242,125,104,0.18)]"
                      : "border-[#EFDCD3] hover:border-[#F27D68]/60 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Swatch & Preview Image Container */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF7F4] border border-[#EFDCD3]">
                      {color.swatchImage ? (
                        <img
                          src={color.swatchImage}
                          alt={color.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: color.value }}
                        />
                      )}

                      {/* Floating Color Value Badge */}
                      <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#EFDCD3] flex items-center gap-1.5 shadow-2xs">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-[10px] font-mono font-bold text-[#432B25] uppercase">
                          {color.value}
                        </span>
                      </div>

                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 bg-[#F27D68] text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Check size={12} className="stroke-[3]" />
                          <span>เลือกอยู่</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-[#432B25] text-sm">
                        {color.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[#80665D] bg-[#FFF1E9] px-2 py-0.5 rounded-full border border-[#EFDCD3] capitalize">
                          {color.category || "แฟชั่น"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!disabled && onSelectColor) onSelectColor(color);
                    }}
                    disabled={disabled}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                      disabled
                        ? "bg-[#FFF1E9] text-[#A18B82] cursor-not-allowed opacity-60"
                        : isSelected
                        ? "bg-[#FFE3D5] text-[#F27D68] font-bold hover:bg-[#F27D68] hover:text-white shadow-xs"
                        : "bg-[#FFF8F4] hover:bg-[#F27D68] text-[#432B25] hover:text-white border border-[#EFDCD3]"
                    }`}
                  >
                    <span>{isSelected ? "เลือกสีนี้แล้ว (กลับไปลอง)" : "ลองเปลี่ยนสีนี้"}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
