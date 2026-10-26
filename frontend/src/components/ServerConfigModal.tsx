import React, { useState, useEffect } from "react";
import { updateHairFastGanConfig } from "../services/hairFastGanService";
import { checkFeedbackConfig } from "../services/feedbackService";
import { Server, Save, X, Globe, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  isApiConfigured: boolean | null;
  onConfigChanged: (configured: boolean, url: string) => void;
}

export default function ServerConfigModal({
  isOpen,
  onClose,
  initialUrl = "",
  isApiConfigured,
  onConfigChanged,
}: ServerConfigModalProps) {
  const [serverUrlInput, setServerUrlInput] = useState(() => {
    try {
      return initialUrl || localStorage.getItem("hfar_hairfastgan_api_url") || "";
    } catch {
      return initialUrl;
    }
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveMessage, setConfigSaveMessage] = useState("");
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    connected: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<{
    configured: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (initialUrl && !serverUrlInput) {
      setServerUrlInput(initialUrl);
    }
  }, [initialUrl]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTestingHealth(true);
    setHealthStatus(null);
    try {
      const cleanUrl = serverUrlInput.trim();
      if (cleanUrl) {
        try {
          localStorage.setItem("hfar_hairfastgan_api_url", cleanUrl);
        } catch (e) {}
        await updateHairFastGanConfig(cleanUrl);
      }
      const res = await fetch("/api/hairfastgan/health");
      const data = await res.json();
      setHealthStatus(data);
      if (data.connected) {
        try {
          localStorage.setItem("hfar_hairfastgan_api_url", cleanUrl);
        } catch (e) {}
      }
      onConfigChanged(data.connected, cleanUrl);

      // Check feedback endpoint status
      const fbStatus = await checkFeedbackConfig(cleanUrl);
      setFeedbackStatus(fbStatus);
    } catch (err: any) {
      setHealthStatus({
        connected: false,
        message: `ไม่สามารถเชื่อมต่อได้: ${err.message || "Network Error"}`,
      });
      onConfigChanged(false, serverUrlInput.trim());
    } finally {
      setIsTestingHealth(false);
    }
  };

  const handleSaveServerConfig = async () => {
    const cleanUrl = serverUrlInput.trim();
    if (!cleanUrl) {
      setConfigSaveMessage("กรุณากรอก URL เซิร์ฟเวอร์ประมวลผล");
      return;
    }
    setIsSavingConfig(true);
    setConfigSaveMessage("");
    setHealthStatus(null);
    try {
      try {
        localStorage.setItem("hfar_hairfastgan_api_url", cleanUrl);
      } catch (e) {}

      await updateHairFastGanConfig(cleanUrl);
      
      const healthRes = await fetch("/api/hairfastgan/health");
      const healthData = await healthRes.json();
      setHealthStatus(healthData);
      onConfigChanged(healthData.connected, cleanUrl);

      if (healthData.connected) {
        setConfigSaveMessage("บันทึกและเชื่อมต่อเซิร์ฟเวอร์ประมวลผลสำเร็จ!");
        setTimeout(() => {
          onClose();
          setConfigSaveMessage("");
        }, 1200);
      } else {
        setConfigSaveMessage(healthData.message || "บันทึกแล้ว แต่ยังไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
      }
    } catch (e: any) {
      setConfigSaveMessage(`เกิดข้อผิดพลาด: ${e.message || e}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] border border-[#EFDCD3] shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 text-[#432B25]">
        <div className="flex items-center justify-between pb-3 border-b border-[#EFDCD3]">
          <div className="flex items-center gap-2.5 text-[#432B25]">
            <Server size={18} className="text-[#F27D68]" />
            <h3 className="font-bold text-sm">
              ตั้งค่าเซิร์ฟเวอร์ประมวลผล
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F4EAE2] text-[#80665D] hover:text-[#432B25] transition cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-[#432B25]">
          <p className="text-[#80665D] leading-relaxed">
            กรอก URL ของเซิร์ฟเวอร์ GPU (เช่น Colab ngrok, RunPod, Vast.ai) เพื่อประมวลผลทรงผม:
          </p>

          <div>
            <label className="block text-[11px] font-bold text-[#432B25] mb-1">
              API Endpoint URL
            </label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-2.5 text-[#80665D]" />
              <input
                type="url"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                placeholder="https://your-ai-server.example.com"
                className="w-full pl-9 pr-3 py-2 bg-[#F4EAE2] border border-[#EFDCD3] rounded-xl text-xs font-mono text-[#432B25] focus:outline-none focus:border-[#F27D68] transition placeholder-[#A18B82]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingHealth || !serverUrlInput.trim()}
              className="text-xs text-[#432B25] font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4EAE2] hover:bg-[#FFF1E9] border border-[#EFDCD3] hover:border-[#F27D68] transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={isTestingHealth ? "animate-spin text-[#F27D68]" : "text-[#F27D68]"} />
              <span>{isTestingHealth ? "กำลังตรวจสอบ..." : "ทดสอบการเชื่อมต่อ"}</span>
            </button>
            {isApiConfigured !== null && (
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  isApiConfigured
                    ? "bg-[#EAF3EE] text-[#47735C] border border-[#47735C]/30"
                    : "bg-[#FFF1E9] text-[#80665D] border border-[#EFDCD3]"
                }`}
              >
                {isApiConfigured ? "● เชื่อมต่อแล้ว" : "○ ยังไม่เชื่อมต่อ"}
              </span>
            )}
          </div>

          {healthStatus && (
            <div
              className={`p-2.5 rounded-xl text-[11.5px] font-medium flex items-start gap-2 ${
                healthStatus.connected
                  ? "bg-[#EAF3EE] text-[#47735C] border border-[#47735C]/30"
                  : "bg-[#FFF1E9] text-[#B64040] border border-[#F27D68]/30"
              }`}
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {healthStatus.connected ? "เชื่อมต่อสำเร็จ" : "โมเดลยังไม่พร้อมใช้งาน"}
                </p>
                <p className="text-[11px] mt-0.5">{healthStatus.message}</p>
              </div>
            </div>
          )}

          {feedbackStatus && (
            <div className="p-2.5 rounded-xl text-[11.5px] font-medium bg-[#FFF8F4] border border-[#EFDCD3] flex items-center justify-between text-[#80665D]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className={feedbackStatus.configured ? "text-emerald-600" : "text-amber-500"} />
                <span>สถานะแบบสอบถาม (POST /feedback):</span>
              </div>
              <span className={feedbackStatus.configured ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                {feedbackStatus.configured ? "พร้อมบันทึก (Configured)" : "ยังไม่ตั้งค่า Secret"}
              </span>
            </div>
          )}

          {configSaveMessage && !healthStatus && (
            <div className="p-2.5 rounded-xl text-[11.5px] font-medium flex items-center gap-2 bg-[#FFF1E9] text-[#432B25] border border-[#EFDCD3]">
              <AlertCircle size={14} className="shrink-0 text-[#F27D68]" />
              <span>{configSaveMessage}</span>
            </div>
          )}

          <div className="pt-3 border-t border-[#EFDCD3] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full border border-[#EFDCD3] text-[#80665D] hover:bg-[#F4EAE2] font-medium transition cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={handleSaveServerConfig}
              disabled={isSavingConfig}
              className="px-5 py-1.5 rounded-full bg-[#F27D68] hover:bg-[#E96A55] text-white font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={13} />
              <span>{isSavingConfig ? "กำลังบันทึก..." : "บันทึกและเชื่อมต่อ"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
