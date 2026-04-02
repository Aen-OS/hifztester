"use client";

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

export default function SummaryClue({ summary, fullSummary, expanded }) {
  const text = expanded && fullSummary ? fullSummary : summary;

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm leading-relaxed text-ink">
        {stripHtml(text)}
      </p>
    </div>
  );
}
