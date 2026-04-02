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
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink">
          Ayah {ayahNumber}
        </span>

        <span className="text-emerald-200">|</span>

        {surahRevealed ? (
          <span className="text-sm font-medium text-ink">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onToggleSurah}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:bg-emerald-50 hover:text-ink"
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
              ? "cursor-not-allowed border border-emerald-50 text-emerald-200"
              : "border border-border text-ink hover:bg-emerald-50"
          }`}
        >
          50/50 ({fiftyFiftyRemaining})
        </button>
      )}
    </div>
  );
}
