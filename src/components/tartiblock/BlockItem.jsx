"use client";

export default function BlockItem({
  text,
  translation,
  transliteration,
  state = "default",
  showTranslation = false,
  showTransliteration = false,
  onTap,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggable = true,
}) {
  const styles = {
    default: "border-border bg-surface hover:border-emerald-200",
    dragging: "border-emerald-200 bg-emerald-50 opacity-50",
    selected: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200",
    correct: "border-emerald-400 bg-emerald-50",
    incorrect: "border-gold-300 bg-gold-50",
  };

  const icons = {
    correct: "✓",
    incorrect: "✗",
  };

  return (
    <div
      draggable={draggable && state !== "correct" && state !== "incorrect"}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onTap}
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors cursor-grab active:cursor-grabbing ${styles[state]}`}
    >
      <span className="flex-shrink-0 text-muted select-none">
        {state === "correct" ? (
          <span className="text-emerald-400 font-bold">{icons.correct}</span>
        ) : state === "incorrect" ? (
          <span className="text-gold-500 font-bold">{icons.incorrect}</span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        )}
      </span>

      <div className="flex-1 min-w-0">
        <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
          {text}
        </p>
        {showTransliteration && transliteration && (
          <p className="mt-1 text-xs italic text-muted truncate">
            {transliteration}
          </p>
        )}
        {showTranslation && translation && (
          <p className="mt-1 text-sm text-muted truncate">
            {translation}
          </p>
        )}
      </div>
    </div>
  );
}
