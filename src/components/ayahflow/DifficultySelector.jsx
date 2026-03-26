"use client";

const DIFFICULTIES = [
  {
    key: "easy",
    label: "Easy",
    description: "Distractors from anywhere in your selected scope",
  },
  {
    key: "medium",
    label: "Medium",
    description: "Distractors from the same surah, non-adjacent",
  },
  {
    key: "hard",
    label: "Hard",
    description: "Distractors from the same surah, nearby ayahs",
  },
];

export default function DifficultySelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {DIFFICULTIES.map((d) => (
        <button
          key={d.key}
          onClick={() => onChange(d.key)}
          className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
            value === d.key
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 hover:border-gray-400"
          }`}
        >
          <div className="text-sm font-medium">{d.label}</div>
          <div
            className={`mt-1 text-xs ${
              value === d.key ? "text-gray-300" : "text-gray-500"
            }`}
          >
            {d.description}
          </div>
        </button>
      ))}
    </div>
  );
}
