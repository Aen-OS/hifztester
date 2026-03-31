"use client";

export default function SurahSenseHintBar({
  revelationPlace,
  revelationPlaceRevealed,
  onRevealRevelationPlace,
  versesCount,
  verseCountRevealed,
  onRevealVerseCount,
  showExpandSummary,
  summaryExpanded,
  onExpandSummary,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  fiftyFiftyHidden,
  onFiftyFifty,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {revelationPlaceRevealed ? (
          <span className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
            {revelationPlace === "makkah" ? "Meccan" : "Medinan"}
          </span>
        ) : (
          <button
            onClick={onRevealRevelationPlace}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Revelation
          </button>
        )}

        {verseCountRevealed ? (
          <span className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
            {versesCount} verses
          </span>
        ) : (
          <button
            onClick={onRevealVerseCount}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Verses
          </button>
        )}

        {showExpandSummary && !summaryExpanded && (
          <button
            onClick={onExpandSummary}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            More Detail
          </button>
        )}

        {showExpandSummary && summaryExpanded && (
          <span className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
            Full summary shown
          </span>
        )}
      </div>

      {!fiftyFiftyHidden && (
        <button
          onClick={onFiftyFifty}
          disabled={fiftyFiftyDisabled}
          className={`ml-auto rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            fiftyFiftyDisabled
              ? "cursor-not-allowed border border-gray-100 text-gray-300"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          50/50 ({fiftyFiftyRemaining})
        </button>
      )}
    </div>
  );
}
