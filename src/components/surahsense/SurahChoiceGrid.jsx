"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function SurahChoiceGrid({ choices, correctId, selectedId, onSelect, eliminatedIds = [] }) {
  const eliminatedSet = new Set(eliminatedIds);
  const visibleChoices = choices.filter((id) => !eliminatedSet.has(id));

  function getState(id) {
    if (selectedId === null) return "default";
    if (id === selectedId && id === correctId) return "correct";
    if (id === selectedId && id !== correctId) return "incorrect";
    if (id === correctId) return "reveal";
    return "default";
  }

  const styles = {
    default: "border-border hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer",
    correct: "border-emerald-400 bg-emerald-50",
    incorrect: "border-gold-300 bg-gold-50",
    reveal: "border-emerald-400 bg-emerald-50 opacity-60",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleChoices.map((id) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          disabled={selectedId !== null}
          className={`w-full rounded-lg border p-4 text-left transition-colors ${styles[getState(id)]}`}
        >
          <div className="text-base font-medium">
            {id}. {SURAH_NAMES[id]}
          </div>
        </button>
      ))}
    </div>
  );
}
