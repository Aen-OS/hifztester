"use client";

export default function ScopeModeToggle({ value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-surface-raised">
      <button
        onClick={() => onChange("manual")}
        className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
          value === "manual"
            ? "bg-emerald-700 text-white"
            : "text-muted hover:text-ink"
        }`}
      >
        Manual
      </button>
      <button
        onClick={() => onChange("focus")}
        className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
          value === "focus"
            ? "bg-emerald-700 text-white"
            : "text-muted hover:text-ink"
        }`}
      >
        Focus Mode
      </button>
    </div>
  );
}
