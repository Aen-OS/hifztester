"use client";

const STATUS_STYLES = {
  match: "text-green-600",
  wrong: "text-red-500 line-through",
  extra: "text-red-500 line-through",
  missing: "text-yellow-600 font-semibold",
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
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-red-400">
          Your Answer
        </p>
        <WordList words={diff.typed} />
      </div>

      {/* Correct answer */}
      <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-green-500">
          Correct Answer
        </p>
        <WordList words={diff.correct} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span><span className="text-green-600">■</span> Matched</span>
        <span><span className="text-red-500">■</span> Wrong / Extra</span>
        <span><span className="text-yellow-600">■</span> Missing</span>
      </div>
    </div>
  );
}
