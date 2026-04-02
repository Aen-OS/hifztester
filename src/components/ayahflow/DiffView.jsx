"use client";

const STATUS_STYLES = {
  match: "text-emerald-400",
  wrong: "text-gold-500 line-through",
  extra: "text-gold-500 line-through",
  missing: "text-muted font-semibold",
};

function WordList({ words }) {
  return (
    <p dir="rtl" lang="ar" className="font-arabic text-xl leading-loose">
      {words.map((w, i) => (
        <span key={i} className={`${STATUS_STYLES[w.status]} mx-0.5`}>
          {w.word}
        </span>
      ))}
    </p>
  );
}

export default function DiffView({ diff }) {
  return (
    <div className="space-y-3">
      {/* User's answer */}
      <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gold-500">
          Your Answer
        </p>
        <WordList words={diff.typed} />
      </div>

      {/* Correct answer */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-400">
          Correct Answer
        </p>
        <WordList words={diff.correct} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span><span className="text-emerald-400">■</span> Matched</span>
        <span><span className="text-gold-500">■</span> Wrong / Extra</span>
        <span><span className="text-muted">■</span> Missing</span>
      </div>
    </div>
  );
}
