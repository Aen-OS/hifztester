"use client";

const MODES = [
  { key: "page", label: "Page", description: "Identify the surah from a mushaf page" },
  { key: "ayah", label: "Single Ayah", description: "Identify from one ayah" },
  { key: "ayaat", label: "Group of Ayaat", description: "Identify from a few consecutive ayaat" },
  { key: "summary", label: "Summary", description: "Identify from the surah's description" },
  { key: "mixed", label: "Mixed", description: "Random mix of all clue types" },
];

export default function ModeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            value === m.key
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 hover:border-gray-400"
          } ${m.key === "mixed" ? "col-span-2 sm:col-span-1" : ""}`}
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
