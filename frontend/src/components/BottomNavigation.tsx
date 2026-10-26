import { Sparkles, BookOpen } from "lucide-react";

interface BottomNavigationProps {
  activeTab: "try-on" | "catalog";
  setActiveTab: (tab: "try-on" | "catalog") => void;
}

export default function BottomNavigation({
  activeTab,
  setActiveTab,
}: BottomNavigationProps) {
  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="เมนูนำทางหลักด้านล่าง"
      style={{
        bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
      className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.25rem)] sm:w-[calc(100%-2rem)] lg:w-[calc(100%-3rem)] xl:w-[calc(100%-4rem)] max-w-[1680px] pointer-events-none transition-all duration-300"
    >
      <div className="w-full bg-[#FFF8F4]/95 backdrop-blur-xl border border-[#EFDCD3] shadow-[0_10px_35px_rgba(67,43,37,0.14)] rounded-full p-1.5 flex items-center justify-between gap-2 pointer-events-auto">
        <button
          type="button"
          id="btn-nav-try-on"
          onClick={() => setActiveTab("try-on")}
          className={`flex-1 h-11 px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 select-none active:scale-95 ${
            activeTab === "try-on"
              ? "bg-[#F27D68] text-white shadow-xs"
              : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFE3D5]/50"
          }`}
          title="สลับไปหน้าลองทรงผม"
        >
          <Sparkles
            size={16}
            className={activeTab === "try-on" ? "fill-white text-white" : "text-[#80665D]"}
          />
          <span>ลองทรงผม</span>
        </button>

        <button
          type="button"
          id="btn-nav-catalog"
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 h-11 px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 select-none active:scale-95 ${
            activeTab === "catalog"
              ? "bg-[#F27D68] text-white shadow-xs"
              : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFE3D5]/50"
          }`}
          title="สลับไปหน้าแคตตาล็อกทรงผมและเฉดสี"
        >
          <BookOpen
            size={16}
            className={activeTab === "catalog" ? "text-white" : "text-[#80665D]"}
          />
          <span>แคตตาล็อก</span>
        </button>
      </div>
    </nav>
  );
}
