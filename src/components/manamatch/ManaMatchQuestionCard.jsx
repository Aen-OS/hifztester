"use client";

import AudioPlayButton from "@/components/shared/AudioPlayButton";

export default function ManaMatchQuestionCard({
  verse,
  showTransliteration = false,
  reciterId = null,
}) {
  return (
    <div className="rounded-[14px] border border-emerald-700/15 bg-surface px-6 py-7 text-center">
      <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
        Match the translation
      </p>
      <p
        dir="rtl"
        lang="ar"
        className="font-arabic text-[26px] leading-[2.0]"
      >
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-3 text-sm italic text-muted">
          {verse.transliteration}
        </p>
      )}
      {reciterId && (
        <div className="mt-3 flex justify-center">
          <AudioPlayButton verseKey={verse.verseKey} reciterId={reciterId} />
        </div>
      )}
    </div>
  );
}
