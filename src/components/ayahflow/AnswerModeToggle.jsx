"use client";

export default function AnswerModeToggle({ value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      <button
        onClick={() => onChange("choices")}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          value === "choices"
            ? "bg-emerald-700 text-white"
            : "text-muted hover:bg-emerald-50 hover:text-ink"
        }`}
      >
        Choices
      </button>
      <button
        onClick={() => onChange("type")}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          value === "type"
            ? "bg-emerald-700 text-white"
            : "text-muted hover:bg-emerald-50 hover:text-ink"
        }`}
      >
        Type It
      </button>
    </div>
  );
}
