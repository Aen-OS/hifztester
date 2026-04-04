"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function SurahChoiceGrid({
  choices,
  correctId,
  selectedId,
  onSelect,
  eliminatedIds = [],
}) {
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
    default:
      "border-[#e0e0d8] bg-surface hover:border-emerald-700/50 hover:bg-emerald-700/4 cursor-pointer",
    correct: "border-[1.5px] border-[#4caf82] bg-[#f0faf4]",
    incorrect: "border-[1.5px] border-[#e8a87c] bg-[#fff8f0] animate-shake",
    reveal: "border-[1.5px] border-[#4caf82] bg-[#f0faf4] opacity-60",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleChoices.map((id) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          disabled={selectedId !== null}
          className={`min-h-16 w-full rounded-[10px] border px-5 py-4 text-left transition-all duration-150 ${styles[getState(id)]}`}>
          <div className="font-medium">
            {id}. {SURAH_NAMES[id]}
          </div>
        </button>
      ))}
    </div>
  );
}
