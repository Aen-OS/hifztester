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
    default: "border-gray-200 bg-white hover:border-gray-400",
    dragging: "border-gray-400 bg-gray-50 opacity-50",
    selected: "border-blue-500 bg-blue-50 ring-2 ring-blue-200",
    correct: "border-green-500 bg-green-50",
    incorrect: "border-red-500 bg-red-50",
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
      <span className="flex-shrink-0 text-gray-400 select-none">
        {state === "correct" ? (
          <span className="text-green-600 font-bold">{icons.correct}</span>
        ) : state === "incorrect" ? (
          <span className="text-red-600 font-bold">{icons.incorrect}</span>
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
          <p className="mt-1 text-xs italic text-gray-500 truncate">
            {transliteration}
          </p>
        )}
        {showTranslation && translation && (
          <p className="mt-1 text-sm text-gray-500 truncate">
            {translation}
          </p>
        )}
      </div>
    </div>
  );
}
