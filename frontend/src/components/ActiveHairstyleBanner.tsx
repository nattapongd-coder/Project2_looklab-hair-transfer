import { Hairstyle } from "../types";
import { Sparkles } from "lucide-react";

interface ActiveHairstyleBannerProps {
  selectedHairstyle: Hairstyle | null;
  onAiRecommend?: () => void;
  disabled?: boolean;
}

export default function ActiveHairstyleBanner({
  selectedHairstyle,
  onAiRecommend,
  disabled = false,
}: ActiveHairstyleBannerProps) {
  return (
    <div className="w-full bg-[#F4EAE2] border border-[#EFDCD3] rounded-2xl p-4 text-[#432B25] relative overflow-hidden shadow-2xs">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#F27D68] uppercase tracking-wider">
              ทรงผมที่เลือก
            </span>
            {selectedHairstyle?.id === "original_style" && (
              <span className="inline-block bg-[#EBF7F0] text-[#2E6B47] px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[#C6ECD4]">
                คงทรงเดิม · เปลี่ยนเฉพาะสีผม
              </span>
            )}
            {disabled && (
              <span className="inline-block bg-[#FFE3D5] text-[#F27D68] px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#EFDCD3]">
                กำลังสร้างภาพ...
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-[#432B25]">
            {selectedHairstyle?.name || "ทรงผมสไตล์เกาหลี"}
          </h4>

          {selectedHairstyle?.description && (
            <p className="text-[11px] text-[#80665D] leading-relaxed line-clamp-1">
              {selectedHairstyle.description}
            </p>
          )}
        </div>

        {onAiRecommend && (
          <button
            type="button"
            onClick={() => {
              if (!disabled) onAiRecommend();
            }}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer ${
              disabled
                ? "bg-white/60 text-[#A18B82] cursor-not-allowed opacity-60"
                : "bg-white hover:bg-[#FFE3D5] text-[#432B25] hover:text-[#F27D68] border border-[#EFDCD3] shadow-2xs"
            }`}
          >
            <Sparkles size={12} className={disabled ? "text-[#A18B82]" : "text-[#F27D68]"} />
            <span>สุ่มทรงแนะนำ</span>
          </button>
        )}
      </div>
    </div>
  );
}
