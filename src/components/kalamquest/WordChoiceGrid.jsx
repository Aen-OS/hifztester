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
    default: "border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer",
    correct: "border-green-500 bg-green-50",
    incorrect: "border-red-500 bg-red-50",
    reveal: "border-green-500 bg-green-50 opacity-60",
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
            className={`w-full rounded-xl border p-4 text-center transition-colors ${styles[state]}`}
          >
            <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
              {choice}
            </p>
          </button>
        );
      })}
    </div>
  );
}
