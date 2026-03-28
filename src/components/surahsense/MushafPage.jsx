"use client";

export default function MushafPage({ verses, pageNumber }) {
  return (
    <div className="rounded-xl border-4 border-double p-4" style={{ borderColor: "#d4c8a0", background: "#f5f0e0" }}>
      <div
        className="relative rounded-lg border p-4"
        style={{ borderColor: "#e8dfc8", background: "#faf8f0" }}
      >
        <div
          className="pointer-events-none absolute inset-1 rounded border"
          style={{ borderColor: "#e8dfc8" }}
        />
        <div dir="rtl" lang="ar" className="font-arabic px-2 text-lg leading-[2.4] sm:text-xl" style={{ color: "#1a1a1a", textAlign: "justify" }}>
          {verses.map((v) => (
            <span key={v.verseKey}>
              {v.textUthmani}{" "}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs"
          style={{ borderColor: "#c4b88a", color: "#8a7a5a" }}
        >
          {pageNumber}
        </span>
      </div>
    </div>
  );
}
