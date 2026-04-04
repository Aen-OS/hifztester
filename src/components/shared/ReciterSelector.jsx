"use client";

import { RECITERS, DEFAULT_RECITER_ID } from "@/lib/reciters";

export default function ReciterSelector({ value, onChange }) {
  const enabled = value !== null;

  function handleToggle() {
    if (enabled) {
      onChange(null);
    } else {
      onChange(DEFAULT_RECITER_ID);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <button
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            enabled ? "bg-emerald-700" : "bg-emerald-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5.5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm font-medium">Recitation</span>
      </div>

      {enabled && (
        <div className="mt-2 flex gap-1 rounded-[10px] bg-[#f0f0eb] p-1">
          {RECITERS.map((r) => (
            <button
              key={r.id}
              onClick={() => onChange(r.id)}
              className={`flex-1 rounded-[8px] px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                value === r.id
                  ? "bg-emerald-700 text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {r.short}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
