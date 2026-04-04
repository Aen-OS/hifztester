"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function TartibLockHintBar({
  chapterId,
  pageNumber,
  difficulty,
  surahRevealed,
  onRevealSurah,
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-emerald-700/12 px-4 py-2.5">
      <div className="flex items-center gap-3">
        {difficulty === "hard" && pageNumber && (
          <>
            <span className="text-[13px] font-medium text-ink">
              Page {pageNumber}
            </span>
            <span className="text-border">|</span>
          </>
        )}

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
    </div>
  );
}
