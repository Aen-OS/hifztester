"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function HintBar({
  ayahNumber,
  chapterId,
  surahRevealed,
  onToggleSurah,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  fiftyFiftyHidden,
  onFiftyFifty,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">
          Ayah {ayahNumber}
        </span>

        <span className="text-gray-300">|</span>

        {surahRevealed ? (
          <span className="text-sm font-medium text-gray-700">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onToggleSurah}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Reveal Surah
          </button>
        )}
      </div>

      {!fiftyFiftyHidden && (
        <button
          onClick={onFiftyFifty}
          disabled={fiftyFiftyDisabled}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            fiftyFiftyDisabled
              ? "cursor-not-allowed border border-gray-100 text-gray-300"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          50/50 ({fiftyFiftyRemaining})
        </button>
      )}
    </div>
  );
}
