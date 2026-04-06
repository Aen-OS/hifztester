"use client";

import { endOfVerse } from "@/lib/verse-marker";

/**
 * Display a list of ayahs with one replaced by a gap marker.
 * Props:
 *   contextAyahs: array from getContextAyahs() — verse objects or { gap: true, verseKey }
 *   label: string — e.g. "Surah Al-Fatiha" or "Page 604"
 *   useMushafLayout: boolean — if true, render inline (page style); else list (surah style)
 */
export default function AyahGapDisplay({ contextAyahs, label, useMushafLayout }) {
  if (useMushafLayout) {
    return (
      <div className="rounded-[14px] border border-emerald-700/15 p-7" style={{ background: "#faf8f3" }}>
        <div
          dir="rtl"
          lang="ar"
          className="font-arabic px-2 text-lg leading-[2.4] sm:text-xl"
          style={{ color: "#1a1a1a", textAlign: "justify" }}
        >
          {contextAyahs.map((item) =>
            item.gap ? (
              <span
                key={item.verseKey}
                className="mx-1 inline-block rounded border-2 border-dashed border-emerald-700/30 px-6 py-1 text-sm text-muted"
              >
                ؟
              </span>
            ) : (
              <span key={item.verseKey}>{item.textUthmani}{endOfVerse(item.verseNumber)}{" "}</span>
            ),
          )}
        </div>
        {label && (
          <div className="mt-4 flex justify-center">
            <span className="inline-block rounded-full bg-emerald-700/8 px-3 py-1 text-[13px] text-muted">
              {label}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-emerald-700/15 bg-surface px-6 py-7 text-center">
      {label && (
        <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">{label}</p>
      )}
      <div dir="rtl" lang="ar" className="font-arabic space-y-2 text-[26px] leading-[2.0]">
        {contextAyahs.map((item) =>
          item.gap ? (
            <div
              key={item.verseKey}
              className="mx-auto rounded-lg border-2 border-dashed border-emerald-700/30 bg-emerald-50 px-4 py-3 text-base text-muted"
            >
              ؟ ـــــــــــــ ؟
            </div>
          ) : (
            <p key={item.verseKey} className="px-2">
              {item.textUthmani}{endOfVerse(item.verseNumber)}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
