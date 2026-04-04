"use client";

import useAudioPlayer from "@/hooks/useAudioPlayer";

export default function AudioPlayButton({ verseKey, reciterId }) {
  const { playVerse, isPlaying, isLoading, currentVerseKey } =
    useAudioPlayer(reciterId);

  const isActive = currentVerseKey === verseKey;

  return (
    <button
      onClick={() => playVerse(verseKey)}
      aria-label={isActive && isPlaying ? "Stop recitation" : "Play recitation"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-emerald-50"
    >
      {isActive && isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
      ) : isActive && isPlaying ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-emerald-700"
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-emerald-700/40"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
