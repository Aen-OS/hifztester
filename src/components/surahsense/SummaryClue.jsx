"use client";

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

export default function SummaryClue({ summary, fullSummary, expanded }) {
  const text = expanded && fullSummary ? fullSummary : summary;

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm leading-relaxed text-gray-700">
        {stripHtml(text)}
      </p>
    </div>
  );
}
