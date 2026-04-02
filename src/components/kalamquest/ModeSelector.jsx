"use client";

const MODES = [
  { key: "ayah", label: "Complete Ayah", description: "Fill in missing words within an ayah" },
  { key: "surah", label: "Complete Surah", description: "Identify the missing ayah in a surah" },
  { key: "page", label: "Complete Page", description: "Identify the missing ayah on a page" },
  { key: "mixed", label: "Mixed", description: "Random mix of all challenge types" },
];

export default function ModeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            value === m.key
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-border hover:border-emerald-200"
          }`}
        >
          <div className="text-sm font-medium">{m.label}</div>
          <div
            className={`mt-1 text-xs ${
              value === m.key ? "text-emerald-200" : "text-muted"
            }`}
          >
            {m.description}
          </div>
        </button>
      ))}
    </div>
  );
}
