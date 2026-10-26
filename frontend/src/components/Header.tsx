import { BookOpen } from "lucide-react";

interface HeaderProps {
  activeTab: "try-on" | "catalog";
  setActiveTab: (tab: "try-on" | "catalog") => void;
  onOpenGuide?: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  onOpenGuide,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#F4EAE2]/90 backdrop-blur-md border-b border-[#EFDCD3]">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo */}
        <div
          onClick={() => setActiveTab("try-on")}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
        >
          {/* Coral flowing hair icon mark */}
          <div className="w-8 h-8 flex items-center justify-center shrink-0 text-[#F27D68]">
            <svg
              viewBox="0 0 36 36"
              fill="none"
              stroke="currentColor"
              className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-105"
            >
              <path
                d="M8 30C8 19 14 11 20 6C17 12 16 19 19 30"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M14 30C14 21 19 14 25 9C22 15 22 22 25 30"
                strokeWidth="2.1"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M20 30C21 24 24 18 29 13C27 18 27 24 29 30"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.65"
              />
            </svg>
          </div>

          <span className="font-brand text-xl sm:text-2xl font-extrabold tracking-[0.14em] text-[#432B25] block leading-none">
            LOOKLAB
          </span>
        </div>

        {/* Right: User Guide Button ("เปลี่ยนข้างบนเป็นคู่มือ") */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            id="btn-header-guide"
            onClick={onOpenGuide}
            className="h-9 px-3.5 sm:px-4 rounded-full bg-white border border-[#EFDCD3] hover:border-[#F27D68] text-[#432B25] hover:text-[#F27D68] flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs hover:shadow active:scale-95 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0"
            title="เปิดดูคู่มือการใช้งาน"
            aria-label="คู่มือการใช้งาน"
          >
            <BookOpen size={16} className="text-[#F27D68] stroke-[2] shrink-0" />
            <span className="inline">คู่มือ</span>
          </button>
        </div>
      </div>
    </header>
  );
}
