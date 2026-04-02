"use client";

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
      <div
        className="rounded-xl border-4 border-double p-4"
        style={{ borderColor: "#d4c8a0", background: "#f5f0e0" }}
      >
        <div
          className="relative rounded-lg border p-4"
          style={{ borderColor: "#e8dfc8", background: "#faf8f0" }}
        >
          <div
            className="pointer-events-none absolute inset-1 rounded border"
            style={{ borderColor: "#e8dfc8" }}
          />
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
                  className="mx-1 inline-block rounded border-2 border-dashed px-6 py-1 text-sm"
                  style={{ borderColor: "#c4b88a", color: "#8a7a5a" }}
                >
                  ؟
                </span>
              ) : (
                <span key={item.verseKey}>{item.textUthmani} </span>
              ),
            )}
          </div>
        </div>
        {label && (
          <div className="mt-3 flex justify-center">
            <span
              className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: "#c4b88a", color: "#8a7a5a" }}
            >
              {label}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-6 text-center">
      {label && (
        <p className="mb-4 text-sm font-medium text-gray-500">{label}</p>
      )}
      <div dir="rtl" lang="ar" className="font-arabic space-y-2 text-xl leading-relaxed sm:text-2xl">
        {contextAyahs.map((item) =>
          item.gap ? (
            <div
              key={item.verseKey}
              className="mx-auto rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-400"
            >
              ؟ ـــــــــــــ ؟
            </div>
          ) : (
            <p key={item.verseKey} className="px-2">
              {item.textUthmani}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
