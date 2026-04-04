"use client";

export default function TranslationChoiceGrid({
  choices,
  correctKey,
  selectedKey,
  onSelect,
}) {
  function getState(choice) {
    if (!selectedKey) return "default";
    if (choice.verseKey === selectedKey && choice.verseKey === correctKey)
      return "correct";
    if (choice.verseKey === selectedKey && choice.verseKey !== correctKey)
      return "incorrect";
    if (choice.verseKey === correctKey) return "reveal";
    return "default";
  }

  const styles = {
    default:
      "border-[#e0e0d8] bg-surface hover:border-emerald-700/50 hover:bg-emerald-700/4 cursor-pointer",
    correct: "border-[1.5px] border-[#4caf82] bg-[#f0faf4]",
    incorrect: "border-[1.5px] border-[#e8a87c] bg-[#fff8f0] animate-shake",
    reveal: "border-[1.5px] border-[#4caf82] bg-[#f0faf4] opacity-60",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => (
        <button
          key={choice.verseKey}
          onClick={() => onSelect(choice.verseKey)}
          disabled={selectedKey !== null}
          className={`min-h-16 w-full rounded-[10px] border px-5 py-4 text-left transition-all duration-150 ${styles[getState(choice)]}`}
        >
          <p className="text-[15px] font-body leading-[1.6]">
            {choice.translation}
          </p>
        </button>
      ))}
    </div>
  );
}
