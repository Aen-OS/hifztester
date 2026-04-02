"use client";

export default function ChoiceCard({
  verse,
  state,
  onClick,
  showTranslation = true,
  showTransliteration = false,
}) {
  const styles = {
    default:
      "border-border hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer",
    correct: "border-emerald-400 bg-emerald-50",
    incorrect: "border-gold-300 bg-gold-50",
    reveal: "border-emerald-400 bg-emerald-50 opacity-60",
  };

  return (
    <button
      onClick={onClick}
      disabled={state !== "default"}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${styles[state]}`}>
      <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-1.5 text-xs italic text-muted">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-1.5 text-sm text-muted">{verse.translation}</p>
      )}
    </button>
  );
}
