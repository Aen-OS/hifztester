"use client";

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

export default function SummaryClue({ summary, fullSummary, expanded }) {
  const text = expanded && fullSummary ? fullSummary : summary;

  return (
    <div className="rounded-[14px] border border-emerald-700/15 bg-surface px-6 py-7">
      <p className="text-sm leading-relaxed text-ink">
        {stripHtml(text)}
      </p>
    </div>
  );
}
