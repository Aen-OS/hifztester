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
    default: "border-[#e0e0d8] bg-surface hover:border-emerald-700/50",
    dragging: "border-emerald-200 bg-emerald-50 opacity-95 scale-[1.02] shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
    selected: "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200",
    correct: "border-[1.5px] border-[#4caf82] bg-[#f0faf4]",
    incorrect: "border-[1.5px] border-[#e8a87c] bg-[#fff8f0]",
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
      className={`flex min-h-16 items-center gap-3 rounded-[10px] border px-5 py-4 transition-all duration-150 cursor-grab active:cursor-grabbing ${styles[state]}`}
    >
      <span className="flex-shrink-0 select-none">
        {state === "correct" ? (
          <span className="text-emerald-400 font-bold">{icons.correct}</span>
        ) : state === "incorrect" ? (
          <span className="text-gold-500 font-bold">{icons.incorrect}</span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-emerald-700/40">
            <circle cx="5" cy="3" r="1.5" fill="currentColor" />
            <circle cx="11" cy="3" r="1.5" fill="currentColor" />
            <circle cx="5" cy="8" r="1.5" fill="currentColor" />
            <circle cx="11" cy="8" r="1.5" fill="currentColor" />
            <circle cx="5" cy="13" r="1.5" fill="currentColor" />
            <circle cx="11" cy="13" r="1.5" fill="currentColor" />
          </svg>
        )}
      </span>

      <div className="flex-1 min-w-0">
        <p dir="rtl" lang="ar" className="font-arabic text-[22px] leading-relaxed">
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
