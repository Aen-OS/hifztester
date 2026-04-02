"use client";

const MODES = [
  {
    key: "choices",
    label: "Choices",
    description: "Pick the correct ayah from four options",
  },
  {
    key: "type",
    label: "Type It",
    description: "Type the ayah text from memory",
  },
];

export default function AnswerModeSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
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
