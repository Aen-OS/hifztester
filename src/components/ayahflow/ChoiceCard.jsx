"use client";

export default function ChoiceCard({ verse, state, onClick }) {
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
      <p className="mt-2 text-sm text-gray-500">{verse.translation}</p>
      {/* <p className="mt-1 text-xs text-gray-400">{verse.verseKey}</p> */}
    </button>
  );
}
