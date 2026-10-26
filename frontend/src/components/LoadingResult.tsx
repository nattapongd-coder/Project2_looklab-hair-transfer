import { useEffect, useState } from "react";
import { Loader2, Sparkles, X, Clock } from "lucide-react";
import { Hairstyle, HairColor } from "../types";

interface LoadingResultProps {
  style: Hairstyle | null;
  color: HairColor | null;
  userImage?: string | null;
  onCancel?: () => void;
  elapsedSec?: number;
  initialElapsedSec?: number;
}

export default function LoadingResult({
  style,
  color,
  userImage,
  onCancel,
  elapsedSec: propElapsedSec,
  initialElapsedSec = 0,
}: LoadingResultProps) {
  const [internalElapsedSec, setInternalElapsedSec] = useState<number>(initialElapsedSec);

  // If elapsedSec is provided externally from parent, use that directly; otherwise run internal clock
  useEffect(() => {
    if (propElapsedSec !== undefined) return;
    const startTime = performance.now();
    const interval = setInterval(() => {
      setInternalElapsedSec((performance.now() - startTime) / 1000);
    }, 50);
    return () => clearInterval(interval);
  }, [propElapsedSec]);

  const currentSeconds = propElapsedSec !== undefined ? propElapsedSec : internalElapsedSec;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-[28px] p-6 sm:p-7 shadow-2xl border border-[#EFDCD3] text-center relative overflow-hidden flex flex-col items-center">
        {/* Soft background peach glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#FFE3D5]/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[#FFE9E1]/50 rounded-full blur-2xl pointer-events-none" />

        {/* 1. ด้านบน: รูปต้นฉบับที่อัปโหลดไว้ (Uploaded or Captured User Photo) */}
        {userImage && (
          <div className="mb-4 flex flex-col items-center relative">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-2 ring-[#F27D68]/30 bg-[#FAF7F4] flex items-center justify-center">
                <img
                  src={userImage}
                  alt="Original Face"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit bg-[#432B25] text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs border border-white/30 whitespace-nowrap">
                รูปต้นฉบับของคุณ
              </span>
            </div>
          </div>
        )}

        {/* 2. ตรงกลาง: Pulsating Loader & Status Title with Live Stopwatch */}
        <div className="relative w-12 h-12 my-2 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#FFE3D5] rounded-full animate-ping opacity-75" />
          <div className="relative w-11 h-11 bg-[#F27D68] rounded-full flex items-center justify-center text-white shadow-md">
            <Loader2 size={20} className="animate-spin" />
          </div>
        </div>

        {/* Real-time processing stopwatch badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#FFF1E9] border border-[#F27D68]/30 px-3.5 py-1 rounded-full text-xs font-bold text-[#F27D68] mb-2 shadow-2xs">
          <Clock size={13} className="text-[#F27D68] animate-spin" />
          <span>เวลาประมวลผลจริง: {currentSeconds.toFixed(1)} วินาที</span>
        </div>

        <h3 className="font-brand text-xl sm:text-2xl font-extrabold text-[#432B25] mb-1">
          กำลังสร้างลุคทรงผมใหม่
        </h3>
        <p className="text-[#80665D] text-xs mb-3.5 max-w-xs mx-auto leading-relaxed">
          กรุณารอสักครู่ ระบบกำลังคำนวณโครงหน้าและผสานทรงผมเสมือนจริง
        </p>

        {/* Indeterminate progress bar */}
        <div className="w-full bg-[#FFE3D5] h-1.5 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-[#F27D68] rounded-full animate-indeterminate-bar" />
        </div>

        <div className="w-full flex justify-between items-center text-[11px] font-medium text-[#80665D] mb-4 px-1">
          <span>สถานะ:</span>
          <span className="font-bold text-[#F27D68] font-mono text-xs">กำลังประมวลผล ({currentSeconds.toFixed(1)}s)</span>
        </div>

        {/* 3. ด้านล่าง: ทรงผมและสีผมที่เลือก (Selected Hairstyle & Hair Color) */}
        <div className="w-full bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-3 mb-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#80665D] mb-2 text-center">
            ทรงผมและสีผมที่เลือก
          </span>
          <div className="grid grid-cols-2 gap-2 text-left">
            {/* Selected Hairstyle */}
            <div className="flex items-center gap-2 bg-white border border-[#EFDCD3] rounded-xl p-2 shadow-2xs">
              {style?.id === "original_style" && userImage ? (
                <img
                  src={userImage}
                  alt="ทรงผมต้นฉบับเดิม (รูปภาพต้นฉบับของคุณ)"
                  className="w-10 h-10 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                />
              ) : style?.thumbnail ? (
                <img
                  src={style.thumbnail}
                  alt={style.name}
                  className="w-10 h-10 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#FAF7F4] border border-[#EFDCD3] flex items-center justify-center text-[10px] text-[#80665D] shrink-0">
                  ทรงผม
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] font-semibold text-[#80665D]">
                  เรฟทรงผม
                </span>
                <span className="text-xs font-bold text-[#432B25] truncate block">
                  {style?.id === "original_style"
                    ? "ทรงผมต้นฉบับ (รูปต้นฉบับ)"
                    : (style?.name?.split(" (")[0] || "ทรงผม")}
                </span>
              </div>
            </div>

            {/* Selected Hair Color - ถ้าเป็นสีธรรมชาติ ให้แสดงรูปภาพต้นฉบับเป็นเรฟสีผมธรรมชาติ */}
            <div className="flex items-center gap-2 bg-white border border-[#EFDCD3] rounded-xl p-2 shadow-2xs">
              {color?.colorReference ? (
                <img
                  src={color.colorReference}
                  alt={color.name}
                  className="w-10 h-10 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                />
              ) : color?.value ? (
                <div
                  className="w-10 h-10 rounded-lg border border-black/10 shrink-0 shadow-2xs"
                  style={{ backgroundColor: color.value }}
                />
              ) : userImage ? (
                <img
                  src={userImage}
                  alt="สีผมธรรมชาติเดิม (รูปภาพต้นฉบับของคุณ)"
                  className="w-10 h-10 rounded-lg object-cover border border-[#EFDCD3] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#FAF7F4] border border-[#EFDCD3] flex items-center justify-center text-[10px] text-[#80665D] shrink-0">
                  รูปต้นฉบับ
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] font-semibold text-[#80665D]">
                  เรฟสีผม
                </span>
                <span className="text-xs font-bold text-[#432B25] truncate block">
                  {color && color.id !== "natural_original" && color.id !== "original"
                    ? color.name.split(" (")[0]
                    : "สีผมธรรมชาติ (รูปต้นฉบับ)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel button if applicable */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 mx-auto text-xs font-semibold text-[#80665D] hover:text-[#432B25] transition py-1.5 px-4 rounded-full border border-[#EFDCD3] bg-[#F4EAE2] hover:bg-[#FFF1E9] cursor-pointer"
          >
            <X size={13} />
            <span>ยกเลิกการสร้างภาพ</span>
          </button>
        )}
      </div>
    </div>
  );
}
