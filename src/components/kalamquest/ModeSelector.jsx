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
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 hover:border-gray-400"
          }`}
        >
          <div className="text-sm font-medium">{m.label}</div>
          <div
            className={`mt-1 text-xs ${
              value === m.key ? "text-gray-300" : "text-gray-500"
            }`}
          >
            {m.description}
          </div>
        </button>
      ))}
    </div>
  );
}
