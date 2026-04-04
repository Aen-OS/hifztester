"use client";

import { RECITERS } from "@/lib/reciters";

export default function ReciterToggle({ value, onChange }) {
  return (
    <div className="flex rounded-[10px] bg-[#f0f0eb] p-1">
      {RECITERS.map((r) => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          className={`flex-1 rounded-[8px] px-2 py-1.5 text-xs font-medium transition-all duration-150 ${
            value === r.id
              ? "bg-surface text-emerald-700 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              : "text-muted hover:text-ink"
          }`}
        >
          {r.short}
        </button>
      ))}
    </div>
  );
}
