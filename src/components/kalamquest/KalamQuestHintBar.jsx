"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function KalamQuestHintBar({
  chapterId,
  surahRevealed,
  onRevealSurah,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  fiftyFiftyHidden,
  onFiftyFifty,
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-emerald-700/12 px-4 py-2.5">
      <div className="flex items-center gap-3">
        {surahRevealed ? (
          <span className="text-[13px] font-medium text-ink">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onRevealSurah}
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
