import React from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { AGE_GROUP_OPTIONS, AgeGroup } from "../services/feedbackService";

export interface AgeGroupSelectProps {
  value: string;
  onChange: (value: AgeGroup | string) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  label?: string;
}

export default function AgeGroupSelect({
  value,
  onChange,
  error,
  disabled = false,
  required = true,
  id = "age-group-select",
  label = "คุณอยู่ในช่วงอายุใด?",
}: AgeGroupSelectProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-bold text-[#432B25] flex items-center gap-1"
        >
          <span>{label}</span>
          {required && (
            <span className="text-[#F27D68] font-bold" title="จำเป็นต้องเลือก">*</span>
          )}
        </label>
        {value ? (
          <span className="text-[11px] font-semibold text-[#2E6B47] bg-[#EBF7F0] px-2 py-0.5 rounded-full border border-[#C6ECD4]">
            เลือกแล้ว: {value}
          </span>
        ) : (
          <span className="text-[11px] text-[#80665D]">จำเป็นต้องระบุ</span>
        )}
      </div>

      <div className="relative">
        <select
          id={id}
          name="age_group"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full appearance-none bg-white border rounded-xl py-2.5 pl-3.5 pr-10 text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 ${
            error
              ? "border-rose-400 text-rose-900 bg-rose-50/30 focus:ring-rose-300 focus:border-rose-500"
              : value
              ? "border-[#47735C]/50 text-[#432B25] focus:ring-[#F27D68]/40 focus:border-[#F27D68]"
              : "border-[#EFDCD3] text-[#80665D] focus:ring-[#F27D68]/40 focus:border-[#F27D68]"
          }`}
        >
          <option value="" disabled>
            เลือกช่วงอายุ
          </option>
          {AGE_GROUP_OPTIONS.map((option) => (
            <option key={option} value={option} className="text-[#432B25] py-1">
              {option}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#80665D]">
          <ChevronDown size={17} />
        </div>
      </div>

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-rose-600 font-medium flex items-center gap-1.5 mt-1 animate-fade-in"
        >
          <AlertCircle size={13} className="shrink-0 text-rose-500" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
