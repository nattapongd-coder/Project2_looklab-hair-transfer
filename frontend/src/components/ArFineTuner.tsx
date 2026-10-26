import { useState } from "react";
import { Hairstyle } from "../types";
import { Sliders, Copy, Check, RotateCcw, ChevronDown, ChevronUp, FlipHorizontal, Eye, EyeOff } from "lucide-react";

interface ArFineTunerProps {
  selectedHairstyle: Hairstyle | null;
  onUpdateLayout: (updatedStyle: Hairstyle) => void;
}

export default function ArFineTuner({
  selectedHairstyle,
  onUpdateLayout,
}: ArFineTunerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!selectedHairstyle) return null;

  const handleValueChange = (key: "scaleX" | "scaleY" | "offsetX" | "offsetY", value: number) => {
    if (isNaN(value)) return;
    onUpdateLayout({
      ...selectedHairstyle,
      [key]: value,
    });
  };

  const toggleFlip = () => {
    onUpdateLayout({
      ...selectedHairstyle,
      isFlipped: !selectedHairstyle.isFlipped,
    });
  };

  const toggleFaceMask = () => {
    onUpdateLayout({
      ...selectedHairstyle,
      enableFaceMask: !selectedHairstyle.enableFaceMask,
    });
  };

  const handleReset = () => {
    onUpdateLayout({
      ...selectedHairstyle,
      scaleX: 1.75,
      scaleY: 1.40,
      offsetX: 0,
      offsetY: -0.15,
      isFlipped: false,
      enableFaceMask: false,
    });
  };

  const nameKey = selectedHairstyle.name.split(" (")[0].toLowerCase().trim();
  const configSnippet = `"${nameKey}": { scaleX: ${selectedHairstyle.scaleX}, scaleY: ${selectedHairstyle.scaleY}, offsetX: ${selectedHairstyle.offsetX}, offsetY: ${selectedHairstyle.offsetY}${selectedHairstyle.isFlipped ? ", isFlipped: true" : ""}${selectedHairstyle.enableFaceMask ? ", enableFaceMask: true" : ""} },`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(configSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#F4EAE2] border border-[#EFDCD3] rounded-2xl p-3.5 space-y-3 transition-all text-[#432B25]">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer group"
      >
        <h4 className="text-[#432B25] font-bold text-xs flex items-center gap-2">
          <Sliders size={14} className="text-[#F27D68]" />
          <span>ปรับแต่งสัดส่วน AR ({isOpen ? "เปิดอยู่" : "คลิกเพื่อปรับ"})</span>
        </h4>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#80665D] group-hover:text-[#F27D68]">
          <span>{isOpen ? "ซ่อน" : "ปรับแต่ง"}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {isOpen && (
        <div className="space-y-3 pt-2 border-t border-[#EFDCD3]">
          {/* Quick Info */}
          <div className="bg-white border border-[#EFDCD3] p-2.5 rounded-xl text-xs text-[#432B25] space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#F27D68]">
                กำลังปรับแต่ง: {selectedHairstyle.name}
              </p>
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#47735C] bg-[#EAF3EE] px-2 py-0.5 rounded-full border border-[#47735C]/20 shrink-0">
                <Check size={10} className="text-[#47735C]" />
                บันทึกอัตโนมัติ
              </span>
            </div>
          </div>

          {/* Quick Toggle Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleFlip}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedHairstyle.isFlipped
                  ? "bg-[#F27D68] text-white border-[#F27D68] shadow-xs"
                  : "bg-white text-[#432B25] border-[#EFDCD3] hover:bg-[#FFF1E9]"
              }`}
            >
              <FlipHorizontal size={14} />
              <span>{selectedHairstyle.isFlipped ? "สลับซ้าย-ขวา (เปิด)" : "สลับซ้าย-ขวา"}</span>
            </button>

            <button
              type="button"
              onClick={toggleFaceMask}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                !selectedHairstyle.enableFaceMask
                  ? "bg-[#F27D68] text-white border-[#F27D68] shadow-xs"
                  : "bg-white text-[#432B25] border-[#EFDCD3] hover:bg-[#FFF1E9]"
              }`}
            >
              {!selectedHairstyle.enableFaceMask ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{!selectedHairstyle.enableFaceMask ? "ทรงผมชัดเจน" : "เจาะรูโครงหน้า"}</span>
            </button>
          </div>

          {/* Fine-Tuning Sliders */}
          <div className="space-y-2.5">
            {/* Scale X */}
            <div className="space-y-1 bg-white p-2.5 border border-[#EFDCD3] rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-[#432B25]">
                <span>ความกว้าง (Scale X)</span>
                <input
                  type="number"
                  step="0.05"
                  value={selectedHairstyle.scaleX}
                  onChange={(e) => handleValueChange("scaleX", parseFloat(e.target.value))}
                  className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-[#F4EAE2] border border-[#EFDCD3] rounded focus:outline-none focus:border-[#F27D68] text-[#F27D68]"
                />
              </div>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.05"
                value={Math.min(Math.max(selectedHairstyle.scaleX, 0.1), 10.0)}
                onChange={(e) => handleValueChange("scaleX", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#FFE3D5] rounded-lg cursor-pointer accent-[#F27D68]"
              />
            </div>

            {/* Scale Y */}
            <div className="space-y-1 bg-white p-2.5 border border-[#EFDCD3] rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-[#432B25]">
                <span>ความสูง (Scale Y)</span>
                <input
                  type="number"
                  step="0.05"
                  value={selectedHairstyle.scaleY}
                  onChange={(e) => handleValueChange("scaleY", parseFloat(e.target.value))}
                  className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-[#F4EAE2] border border-[#EFDCD3] rounded focus:outline-none focus:border-[#F27D68] text-[#F27D68]"
                />
              </div>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.05"
                value={Math.min(Math.max(selectedHairstyle.scaleY, 0.1), 10.0)}
                onChange={(e) => handleValueChange("scaleY", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#FFE3D5] rounded-lg cursor-pointer accent-[#F27D68]"
              />
            </div>

            {/* Offset X */}
            <div className="space-y-1 bg-white p-2.5 border border-[#EFDCD3] rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-[#432B25]">
                <span>ซ้าย-ขวา (Offset X)</span>
                <input
                  type="number"
                  step="0.05"
                  value={selectedHairstyle.offsetX}
                  onChange={(e) => handleValueChange("offsetX", parseFloat(e.target.value))}
                  className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-[#F4EAE2] border border-[#EFDCD3] rounded focus:outline-none focus:border-[#F27D68] text-[#F27D68]"
                />
              </div>
              <input
                type="range"
                min="-5.0"
                max="5.0"
                step="0.02"
                value={Math.min(Math.max(selectedHairstyle.offsetX, -5.0), 5.0)}
                onChange={(e) => handleValueChange("offsetX", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#FFE3D5] rounded-lg cursor-pointer accent-[#F27D68]"
              />
            </div>

            {/* Offset Y */}
            <div className="space-y-1 bg-white p-2.5 border border-[#EFDCD3] rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-[#432B25]">
                <span>ขึ้น-ลง (Offset Y)</span>
                <input
                  type="number"
                  step="0.05"
                  value={selectedHairstyle.offsetY}
                  onChange={(e) => handleValueChange("offsetY", parseFloat(e.target.value))}
                  className="w-16 px-1.5 py-0.5 text-right font-mono font-bold text-xs bg-[#F4EAE2] border border-[#EFDCD3] rounded focus:outline-none focus:border-[#F27D68] text-[#F27D68]"
                />
              </div>
              <input
                type="range"
                min="-5.0"
                max="5.0"
                step="0.02"
                value={Math.min(Math.max(selectedHairstyle.offsetY, -5.0), 5.0)}
                onChange={(e) => handleValueChange("offsetY", parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#FFE3D5] rounded-lg cursor-pointer accent-[#F27D68]"
              />
            </div>
          </div>

          {/* Config Copy Area */}
          <div className="bg-white border border-[#EFDCD3] rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#80665D]">
                พารามิเตอร์ตำแหน่งเลย์เอาต์:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 text-[#80665D] hover:text-[#432B25] rounded-lg hover:bg-[#F4EAE2] transition-colors cursor-pointer"
                  title="รีเซ็ตเป็นค่าเริ่มต้น"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-[10px] font-bold bg-[#F27D68] hover:bg-[#E96A55] text-white px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                </button>
              </div>
            </div>
            <pre className="text-[10px] font-mono bg-[#F4EAE2] p-2 rounded-lg text-[#432B25] border border-[#EFDCD3] overflow-x-auto whitespace-pre-wrap">
              {configSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
