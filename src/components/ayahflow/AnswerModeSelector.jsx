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
