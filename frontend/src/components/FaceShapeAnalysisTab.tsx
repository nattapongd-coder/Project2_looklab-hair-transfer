import { useState } from "react";
import { Hairstyle, FaceTrackingData } from "../types";
import { HAIRSTYLES } from "../data";
import { HeartHandshake, Sparkles, CheckCircle, ArrowRight, UserCheck } from "lucide-react";

interface FaceShapeAnalysisTabProps {
  trackingData: FaceTrackingData;
  onSelectHairstyle: (style: Hairstyle) => void;
  disabled?: boolean;
}

export default function FaceShapeAnalysisTab({
  trackingData,
  onSelectHairstyle,
  disabled = false,
}: FaceShapeAnalysisTabProps) {
  // "Oblong" has no dedicated card in this tab, so it falls back to "Oval" (avoids an undefined lookup crash)
  const [analyzedShape, setAnalyzedShape] = useState<"Oval" | "Round" | "Square" | "Heart" | "Diamond">(
    trackingData.faceShape && trackingData.faceShape !== "Oblong" ? trackingData.faceShape : "Oval"
  );

  const shapeDetails = {
    Oval: {
      title: "รูปหน้ารูปไข่ (Oval Face Shape)",
      desc: "ใบหน้ารูปไข่มีสัดส่วนสมดุลอย่างสมบูรณ์แบบ สามารถใส่ทรงผมได้แทบทุกทรง!",
      recommendations: ["h01-long-waves-curtain-bangs", "h15-side-part-c-curve-bob", "h23-two-block-with-straight-fringe", "h10-classic-middle-part"],
    },
    Round: {
      title: "รูปหน้ากลม (Round Face Shape)",
      desc: "ช่วงโหนกแก้มและแก้มมีอิ่มเอิบ ความยาวและความกว้างใกล้เคียงกัน เหมาะกับทรงผมที่ช่วยเรียวหน้า",
      recommendations: ["h17-short-wolf-cut-with-fringe", "h03-korean-curtain-hair", "h04-side-part-quiff", "h20-middle-part-wavy-lob"],
    },
    Square: {
      title: "รูปหน้าเหลี่ยม (Square Face Shape)",
      desc: "กรอบหน้าและกรามมีความคมชัด โดดเด่น เหมาะกับทรงผมลอนนุ่มๆ ช่วยลดความคมของกราม",
      recommendations: ["h22-medium-s-waves-curtain-bangs", "h08-side-part-voluminous-curls", "h02-side-part-wavy-bob", "h06-long-layered-loose-waves"],
    },
    Heart: {
      title: "รูปหน้ารูปหัวใจ (Heart Face Shape)",
      desc: "หน้าผากกว้างและคางค่อนข้างเรียวแหลม เหมาะกับทรงผมระดับคางหรือทรงที่เพิ่มวอลลุ่มช่วงล่าง",
      recommendations: ["h15-side-part-c-curve-bob", "h05-straight-bob-see-through-bangs", "h12-middle-part-blunt-bob", "h20-middle-part-wavy-lob"],
    },
    Diamond: {
      title: "รูปหน้ารูปเพชร (Diamond Face Shape)",
      desc: "โหนกแก้มโดดเด่น หน้าผากและคางเรียวเล็ก เหมาะกับทรงผมปัดข้างหรือเปิดหน้าผาก",
      recommendations: ["h16-short-blunt-bob-wispy-bangs", "h21-slicked-side-part", "h19-textured-side-swept-quiff", "h14-straight-blunt-lob"],
    },
  };

  const current = shapeDetails[analyzedShape];
  const recommendedStyles = HAIRSTYLES.filter((s) => current.recommendations.includes(s.id));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-md space-y-3">
        <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full w-fit text-xs font-bold text-sky-100">
          <HeartHandshake size={14} />
          <span>FACE SHAPE DETECTOR</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black">วิเคราะห์รูปหน้า & แนะนำทรงผมสวมใส่</h2>
        <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-xl">
          ระบบวิเคราะห์ความสมดุลของโหนกแก้ม หน้าผาก และกรามเพื่อเลือกทรงผมที่ดึงเสน่ห์ใบหน้าของคุณออกมามากที่สุด
        </p>
      </div>

      {/* Shape Switcher / Result Box */}
      <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-6">
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <UserCheck className="text-blue-600" size={18} />
            เลือกลักษณะรูปหน้าเพื่อดูผลวิเคราะห์:
          </h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
            {(["Oval", "Round", "Square", "Heart", "Diamond"] as const).map((shape) => (
              <button
                key={shape}
                onClick={() => setAnalyzedShape(shape)}
                className={`px-4 py-2 rounded-2xl transition cursor-pointer shrink-0 flex items-center gap-2 ${
                  analyzedShape === shape
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {shape === "Oval" && (
                  <span className="w-3.5 h-4.5 rounded-[50%] border-2 border-current inline-block shrink-0" />
                )}
                {shape === "Round" && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-current inline-block shrink-0" />
                )}
                {shape === "Square" && (
                  <span className="w-3.5 h-3.5 rounded-xs border-2 border-current inline-block shrink-0" />
                )}
                {shape === "Heart" && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-3.5 h-3.5 shrink-0">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                )}
                {shape === "Diamond" && (
                  <span className="w-3 h-3 rotate-45 border-2 border-current inline-block shrink-0" />
                )}
                <span>
                  {shape === "Oval" && "รูปไข่ (Oval)"}
                  {shape === "Round" && "หน้ากลม (Round)"}
                  {shape === "Square" && "หน้าเหลี่ยม (Square)"}
                  {shape === "Heart" && "รูปหัวใจ (Heart)"}
                  {shape === "Diamond" && "รูปเพชร (Diamond)"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Shape Detail Card */}
        <div className="bg-blue-50/80 rounded-2xl p-5 border border-blue-100 space-y-2">
          <h4 className="font-extrabold text-blue-900 text-lg">{current.title}</h4>
          <p className="text-xs text-blue-800 leading-relaxed">{current.desc}</p>
        </div>

        {/* Top Recommended Hairstyles */}
        <div className="space-y-3 pt-2">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="text-blue-600" size={16} />
            3 ทรงผมแนะนำที่เหมาะกับรูปหน้านี้มากที่สุด:
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedStyles.map((style) => (
              <div
                key={style.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-200">
                    <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-900 text-xs">{style.name}</h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{style.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!disabled) onSelectHairstyle(style);
                  }}
                  disabled={disabled}
                  className={`w-full py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    disabled
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  }`}
                >
                  <span>{disabled ? "ระบบกำลังประมวลผล กรุณารอสักครู่..." : "ทดลองสวมใส่ทรงนี้"}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
