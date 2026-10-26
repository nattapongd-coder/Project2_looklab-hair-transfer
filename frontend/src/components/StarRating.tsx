import React, { useId, useState } from "react";

interface StarRatingProps {
  label: string;
  value?: number | null;
  onChange: (score: number) => void;
  labels: string[]; // exactly 5 labels
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export default function StarRating({
  label,
  value = null,
  onChange,
  labels,
  required = true,
  disabled = false,
  helperText,
}: StarRatingProps) {
  const generatedId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const display = hover ?? value ?? 0;

  return (
    <fieldset disabled={disabled} className="border-0 p-0 m-0 mb-5">
      <legend className="text-xs sm:text-sm font-bold text-[#432B25] mb-1.5 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-[#F27D68]">*</span>}
      </legend>
      {helperText && (
        <p className="text-[11px] text-[#80665D] mb-2 leading-relaxed">
          {helperText}
        </p>
      )}

      <div
        onMouseLeave={() => setHover(null)}
        className="flex items-center gap-1.5 sm:gap-2 select-none"
      >
        {[1, 2, 3, 4, 5].map((score) => {
          const isFilled = score <= display;
          return (
            <label
              key={score}
              onMouseEnter={() => !disabled && setHover(score)}
              className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all ${
                disabled
                  ? "cursor-default opacity-60"
                  : "cursor-pointer hover:bg-[#FFE3D5]/50 active:scale-95"
              }`}
            >
              <input
                type="radio"
                name={generatedId}
                value={score}
                checked={value === score}
                onChange={() => !disabled && onChange(score)}
                required={required}
                aria-label={`${score} ดาว — ${labels[score - 1] || ""}`}
                className="absolute inset-0 m-0 opacity-0 w-full h-full cursor-inherit focus-visible:outline-none peer"
                onFocus={() => !disabled && setHover(score)}
                onBlur={() => setHover(null)}
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-[#F27D68] peer-focus-visible:rounded-md ${
                  isFilled ? "scale-105" : "hover:scale-105"
                }`}
                fill={isFilled ? "#E5A72D" : "none"}
                stroke={isFilled ? "#B47A13" : "#C4B5AE"}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 2.7 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9Z" />
              </svg>
            </label>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className={`text-xs mt-1.5 font-medium transition-colors ${
          value ? "text-[#432B25]" : "text-[#A18B82]"
        }`}
      >
        {value ? (
          <span className="inline-flex items-center gap-1.5 bg-[#FFF1E9] px-2.5 py-0.5 rounded-full border border-[#EFDCD3]">
            <span className="font-bold text-[#F27D68]">{value}/5 ดาว</span>
            <span>—</span>
            <span className="font-medium">{labels[value - 1]}</span>
          </span>
        ) : (
          <span>กรุณาเลือกคะแนน 1–5 ดาว</span>
        )}
      </p>
    </fieldset>
  );
}
