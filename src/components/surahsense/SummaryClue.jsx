"use client";

import { useState } from "react";

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

export default function SummaryClue({ summary, revelationPlace, versesCount }) {
  const [hintsRevealed, setHintsRevealed] = useState(0);

  function revealNext() {
    setHintsRevealed((prev) => Math.min(prev + 1, 2));
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm leading-relaxed text-gray-700">
        {stripHtml(summary)}
      </p>

      {hintsRevealed >= 1 && (
        <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium">Revelation:</span>{" "}
          {revelationPlace === "makkah" ? "Meccan" : "Medinan"}
        </div>
      )}

      {hintsRevealed >= 2 && (
        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium">Verses:</span> {versesCount}
        </div>
      )}

      {hintsRevealed < 2 && (
        <button
          onClick={revealNext}
          className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          Reveal hint ({2 - hintsRevealed} remaining)
        </button>
      )}
    </div>
  );
}
