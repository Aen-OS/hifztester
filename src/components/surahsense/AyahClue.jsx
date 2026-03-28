"use client";

export default function AyahClue({ verses }) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      {verses.map((v) => (
        <div key={v.verseKey}>
          <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
            {v.textUthmani}
          </p>
          <p className="mt-1 text-sm text-gray-500">{v.translation}</p>
        </div>
      ))}
    </div>
  );
}
