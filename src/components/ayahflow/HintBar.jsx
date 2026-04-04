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
    <div className="flex items-center justify-between rounded-[10px] border border-emerald-700/12 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-medium text-ink">
          Ayah {ayahNumber}
        </span>

        <span className="text-border">|</span>

        {surahRevealed ? (
          <span className="text-[13px] font-medium text-ink">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onToggleSurah}
            className="text-[13px] text-muted transition-colors hover:text-emerald-700"
          >
            Reveal Surah
          </button>
        )}
      </div>

      {!fiftyFiftyHidden && (
        <button
          onClick={onFiftyFifty}
          disabled={fiftyFiftyDisabled}
          className={`text-[13px] font-medium transition-colors ${
            fiftyFiftyDisabled
              ? "cursor-not-allowed text-emerald-200"
              : "text-muted hover:text-emerald-700"
          }`}
        >
          50/50 ({fiftyFiftyRemaining})
        </button>
      )}
    </div>
  );
}
