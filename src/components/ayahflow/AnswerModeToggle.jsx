"use client";

export default function AnswerModeToggle({ value, onChange }) {
  return (
    <div className="flex w-full rounded-[10px] bg-[#f0f0eb] p-1">
      <button
        onClick={() => onChange("choices")}
        className={`flex-1 rounded-[8px] px-4 py-2 text-sm font-medium transition-all duration-150 ${
          value === "choices"
            ? "bg-surface text-emerald-700 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
            : "text-muted hover:text-ink"
        }`}
      >
        Choices
      </button>
      <button
        onClick={() => onChange("type")}
        className={`flex-1 rounded-[8px] px-4 py-2 text-sm font-medium transition-all duration-150 ${
          value === "type"
            ? "bg-surface text-emerald-700 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
            : "text-muted hover:text-ink"
        }`}
      >
        Type It
      </button>
    </div>
  );
}
