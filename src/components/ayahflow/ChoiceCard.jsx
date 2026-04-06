"use client";

import { endOfVerse } from "@/lib/verse-marker";

export default function ChoiceCard({
  verse,
  state,
  onClick,
  showTranslation = true,
  showTransliteration = false,
}) {
  const styles = {
    default:
      "border-[#e0e0d8] bg-surface hover:border-emerald-700/50 hover:bg-emerald-700/4 cursor-pointer",
    correct: "border-[1.5px] border-[#4caf82] bg-[#f0faf4]",
    incorrect: "border-[1.5px] border-[#e8a87c] bg-[#fff8f0] animate-shake",
    reveal: "border-[1.5px] border-[#4caf82] bg-[#f0faf4] opacity-60",
  };

  return (
    <button
      onClick={onClick}
      disabled={state !== "default"}
      className={`min-h-16 w-full rounded-[10px] border px-5 py-4 text-center transition-all duration-150 ${styles[state]}`}>
      <p dir="rtl" lang="ar" className="font-arabic text-[22px] leading-relaxed">
        {verse.textUthmani}{endOfVerse(verse.verseNumber)}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-1.5 text-xs italic text-muted">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-1.5 text-sm text-muted">{verse.translation}</p>
      )}
    </button>
  );
}
