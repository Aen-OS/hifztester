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
    <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        {difficulty === "hard" && pageNumber && (
          <>
            <span className="text-sm font-medium text-ink">
              Page {pageNumber}
            </span>
            <span className="text-emerald-200">|</span>
          </>
        )}

        {surahRevealed ? (
          <span className="text-sm font-medium text-ink">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onRevealSurah}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:bg-emerald-50 hover:text-ink"
          >
            Reveal Surah
          </button>
        )}
      </div>
    </div>
  );
}
