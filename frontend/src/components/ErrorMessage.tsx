import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export default function ErrorMessage({
  message,
  onRetry,
  title = "เกิดข้อผิดพลาด",
}: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="w-full bg-[#FFE9E1] border border-[#F27D68]/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
      <div className="text-[#B64040] shrink-0 mt-0.5 bg-white p-2 rounded-xl border border-[#F27D68]/20 shadow-2xs">
        <AlertCircle size={20} className="stroke-[2]" />
      </div>
      <div className="flex-1">
        <h5 className="font-bold text-[#432B25] text-sm mb-1">{title}</h5>
        <p className="text-xs text-[#80665D] font-normal leading-relaxed whitespace-pre-line">
          {message}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white bg-[#F27D68] hover:bg-[#E96A55] px-4 py-1.5 rounded-full transition cursor-pointer shadow-xs"
          >
            <RefreshCw size={12} />
            <span>ลองใหม่อีกครั้ง</span>
          </button>
        )}
      </div>
    </div>
  );
}
