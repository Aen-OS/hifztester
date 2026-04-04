"use client";

/**
 * Multiple choice grid for word-level blanks.
 */
export default function WordChoiceGrid({
  choices,
  correctAnswer,
  selectedAnswer,
  onSelect,
  eliminatedAnswers = [],
}) {
  function getState(choice) {
    if (!selectedAnswer) return "default";
    if (choice === selectedAnswer && choice === correctAnswer) return "correct";
    if (choice === selectedAnswer && choice !== correctAnswer) return "incorrect";
    if (choice === correctAnswer) return "reveal";
    return "default";
  }

  const styles = {
    default: "border-[#e0e0d8] bg-surface hover:border-emerald-700/50 hover:bg-emerald-700/4 cursor-pointer",
    correct: "border-[1.5px] border-[#4caf82] bg-[#f0faf4]",
    incorrect: "border-[1.5px] border-[#e8a87c] bg-[#fff8f0] animate-shake",
    reveal: "border-[1.5px] border-[#4caf82] bg-[#f0faf4] opacity-60",
  };

  const visibleChoices = eliminatedAnswers.length > 0
    ? choices.filter((c) => !eliminatedAnswers.includes(c))
    : choices;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleChoices.map((choice, i) => {
        const state = getState(choice);
        return (
          <button
            key={i}
            onClick={() => onSelect(choice)}
            disabled={state !== "default"}
            className={`min-h-16 w-full rounded-[10px] border px-5 py-4 text-center transition-all duration-150 ${styles[state]}`}
          >
            <p dir="rtl" lang="ar" className="font-arabic text-[22px] leading-relaxed">
              {choice}
            </p>
          </button>
        );
      })}
    </div>
  );
}
