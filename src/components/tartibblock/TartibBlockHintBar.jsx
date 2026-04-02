"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function TartibBlockHintBar({
  chapterId,
  pageNumber,
  difficulty,
  surahRevealed,
  onRevealSurah,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        {difficulty === "hard" && pageNumber && (
          <>
            <span className="text-sm font-medium text-gray-700">
              Page {pageNumber}
            </span>
            <span className="text-gray-300">|</span>
          </>
        )}

        {surahRevealed ? (
          <span className="text-sm font-medium text-gray-700">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onRevealSurah}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Reveal Surah
          </button>
        )}
      </div>
    </div>
  );
}
