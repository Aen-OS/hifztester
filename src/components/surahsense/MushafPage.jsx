"use client";

export default function MushafPage({ verses, pageNumber }) {
  return (
    <div className="rounded-[14px] border border-emerald-700/15 p-7" style={{ background: "#faf8f3" }}>
      <div
        dir="rtl"
        lang="ar"
        className="font-arabic px-2 text-lg leading-[2.4] sm:text-xl"
        style={{ color: "#1a1a1a", textAlign: "justify" }}
      >
        {verses.map((v) => (
          <span key={v.verseKey}>
            {v.textUthmani}{" "}
          </span>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <span className="inline-block rounded-full bg-emerald-700/8 px-3 py-1 text-[13px] text-muted">
          {pageNumber}
        </span>
      </div>
    </div>
  );
}
