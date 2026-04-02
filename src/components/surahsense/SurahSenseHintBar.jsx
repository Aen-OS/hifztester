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
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {revelationPlaceRevealed ? (
          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-medium text-ink">
            {revelationPlace === "makkah" ? "Meccan" : "Medinan"}
          </span>
        ) : (
          <button
            onClick={onRevealRevelationPlace}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:bg-emerald-50 hover:text-ink"
          >
            Revelation
          </button>
        )}

        {verseCountRevealed ? (
          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-medium text-ink">
            {versesCount} verses
          </span>
        ) : (
          <button
            onClick={onRevealVerseCount}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:bg-emerald-50 hover:text-ink"
          >
            Verses
          </button>
        )}

        {showExpandSummary && !summaryExpanded && (
          <button
            onClick={onExpandSummary}
            className="rounded-lg border border-border px-3 py-1 text-sm text-muted hover:bg-emerald-50 hover:text-ink"
          >
            More Detail
          </button>
        )}

        {showExpandSummary && summaryExpanded && (
          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-medium text-ink">
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
              ? "cursor-not-allowed border border-emerald-50 text-emerald-200"
              : "border border-border text-ink hover:bg-emerald-50"
          }`}
        >
          50/50 ({fiftyFiftyRemaining})
        </button>
      )}
    </div>
  );
}
