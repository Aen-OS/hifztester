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
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-emerald-700/12 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {revelationPlaceRevealed ? (
          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-[13px] font-medium text-ink">
            {revelationPlace === "makkah" ? "Meccan" : "Medinan"}
          </span>
        ) : (
          <button
            onClick={onRevealRevelationPlace}
            className="text-[13px] text-muted transition-colors hover:text-emerald-700"
          >
            Revelation
          </button>
        )}

        <span className="text-border">|</span>

        {verseCountRevealed ? (
          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-[13px] font-medium text-ink">
            {versesCount} verses
          </span>
        ) : (
          <button
            onClick={onRevealVerseCount}
            className="text-[13px] text-muted transition-colors hover:text-emerald-700"
          >
            Verses
          </button>
        )}

        {showExpandSummary && !summaryExpanded && (
          <button
            onClick={onExpandSummary}
            className="text-[13px] text-muted transition-colors hover:text-emerald-700"
          >
            More Detail
          </button>
        )}

        {showExpandSummary && summaryExpanded && (
          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-[13px] font-medium text-ink">
            Full summary shown
          </span>
        )}
      </div>

      {!fiftyFiftyHidden && (
        <button
          onClick={onFiftyFifty}
          disabled={fiftyFiftyDisabled}
          className={`ml-auto text-[13px] font-medium transition-colors ${
            fiftyFiftyDisabled
              ? "cursor-not-allowed text-emerald-200"
              : "text-muted hover:text-emerald-700"
          }`}
        >
          50/50 ({fiftyFiftyRemaining})
        </button>
      )}
    </div>
  );
}
