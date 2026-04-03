"use client";

export default function AyahClue({ verses, showTranslation = true, showTransliteration = false }) {
  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      {verses.map((v) => (
        <div key={v.verseKey}>
          <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
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
