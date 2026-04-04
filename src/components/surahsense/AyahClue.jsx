"use client";

export default function AyahClue({ verses, showTranslation = true, showTransliteration = false }) {
  return (
    <div className="space-y-4 rounded-[14px] border border-emerald-700/15 bg-surface px-6 py-7">
      {verses.map((v) => (
        <div key={v.verseKey}>
          <p dir="rtl" lang="ar" className="font-arabic text-[26px] text-center leading-[2.0]">
            {v.textUthmani}
          </p>
          {showTransliteration && v.transliteration && (
            <p className="mt-1 text-xs italic text-muted">{v.transliteration}</p>
          )}
          {showTranslation && v.translation && (
            <p className="mt-1 text-sm text-muted">{v.translation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
