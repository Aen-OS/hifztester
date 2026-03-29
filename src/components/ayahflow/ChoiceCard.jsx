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
      "border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer",
    correct: "border-green-500 bg-green-50",
    incorrect: "border-red-500 bg-red-50",
    reveal: "border-green-500 bg-green-50 opacity-60",
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
        <p className="mt-1.5 text-xs italic text-gray-500">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-1.5 text-sm text-gray-500">{verse.translation}</p>
      )}
    </button>
  );
}
