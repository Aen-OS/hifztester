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
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-border hover:border-emerald-200"
          }`}
        >
          <div className="text-sm font-medium">{d.label}</div>
          <div
            className={`mt-1 text-xs ${
              value === d.key ? "text-emerald-200" : "text-muted"
            }`}
          >
            {d.description}
          </div>
        </button>
      ))}
    </div>
  );
}
