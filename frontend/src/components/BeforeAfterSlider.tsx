import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeUrl?: string;
  afterUrl?: string;
  originalImage?: string;
  processedImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  originalLabel?: string;
  processedLabel?: string;
  showScriptOverlay?: boolean;
  beforeLabelClassName?: string;
  className?: string;
  includeWatermark?: boolean;
}

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  originalImage,
  processedImage,
  beforeLabel = "ก่อน",
  afterLabel = "หลัง",
  originalLabel,
  processedLabel,
  beforeLabelClassName,
  className,
  includeWatermark = true,
}: BeforeAfterSliderProps) {
  const finalBeforeUrl = beforeUrl || originalImage || "";
  const finalAfterUrl = afterUrl || processedImage || "";
  const finalBeforeLabel = originalLabel || beforeLabel;
  const finalAfterLabel = processedLabel || afterLabel;

  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [afterError, setAfterError] = useState(false);
  useEffect(() => {
    setAfterError(false);
  }, [finalAfterUrl]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none bg-[#FFF8F4] flex items-center justify-center group overflow-hidden ${
        className || ""
      }`}
    >
      {/* 1. Before Image (Original / Left Base) */}
      {finalBeforeUrl && (
        <img
          src={finalBeforeUrl}
          alt="ก่อน"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
      )}

      {/* "ก่อน" Badge in Translucent Dark Pill */}
      <div
        className={`bg-black/60 text-white text-[11px] sm:text-xs font-medium px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full backdrop-blur-md z-20 pointer-events-none shadow-sm absolute ${
          beforeLabelClassName || "bottom-2.5 sm:bottom-3.5 left-2.5 sm:left-3.5"
        }`}
      >
        {finalBeforeLabel}
      </div>

      {/* 2. After Image (AI Generated Hairstyle on Right clipped by slider) */}
      {finalAfterUrl && !afterError ? (
        <img
          src={finalAfterUrl}
          alt="หลัง"
          onError={() => setAfterError(true)}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          style={{
            clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-end pr-[8%] bg-[#FAF7F4]/90 pointer-events-none"
          style={{
            clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
          }}
        >
          <div className="flex flex-col items-center gap-1 text-[#80665D] text-[11px] font-semibold max-w-[40%] text-center">
            <ImageOff size={20} className="text-[#F27D68]" />
            <span>แสดงรูปผลลัพธ์ไม่ได้</span>
          </div>
        </div>
      )}

      {/* "หลัง" Badge at Bottom-Right in Translucent Dark Pill matching Image 03 */}
      <div className="absolute bottom-2.5 sm:bottom-3.5 right-2.5 sm:right-3.5 bg-black/60 text-white text-[11px] sm:text-xs font-medium px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full backdrop-blur-md z-20 pointer-events-none shadow-sm">
        {finalAfterLabel}
      </div>

      {/* 3. Slider Vertical Dividing Line and Circular White Handle with < > */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-sm z-30 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-full flex items-center justify-center text-[#432B25] shadow-lg border border-[#EFDCD3] transition-transform group-hover:scale-105"
          style={{
            marginLeft:
              sliderPosition < 6
                ? `${(6 - sliderPosition) * 2.8}px`
                : sliderPosition > 94
                ? `-${(sliderPosition - 94) * 2.8}px`
                : "0px",
          }}
        >
          <div className="flex items-center -space-x-1">
            <ChevronLeft size={13} className="stroke-[2.5] text-[#F27D68]" />
            <ChevronRight size={13} className="stroke-[2.5] text-[#F27D68]" />
          </div>
        </div>
      </div>

      {/* 4. Native transparent range slider for touch and mouse interaction */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={(e) => setSliderPosition(Number(e.target.value))}
        className="absolute inset-0 w-full h-full m-0 p-0 opacity-0 cursor-ew-resize z-30 touch-none"
        aria-label="เปรียบเทียบภาพก่อนและหลัง"
      />
    </div>
  );
}
