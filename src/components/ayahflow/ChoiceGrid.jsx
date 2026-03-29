"use client";

import ChoiceCard from "./ChoiceCard";

export default function ChoiceGrid({ choices, correctKey, selectedKey, onSelect, eliminatedKeys = [], showTranslation = true, showTransliteration = false }) {
  function getState(choice) {
    if (!selectedKey) return "default";
    if (choice.verseKey === selectedKey && choice.verseKey === correctKey) return "correct";
    if (choice.verseKey === selectedKey && choice.verseKey !== correctKey) return "incorrect";
    if (choice.verseKey === correctKey) return "reveal";
    return "default";
  }

  const visibleChoices = eliminatedKeys.length > 0
    ? choices.filter((c) => !eliminatedKeys.includes(c.verseKey))
    : choices;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleChoices.map((choice) => (
        <ChoiceCard
          key={choice.verseKey}
          verse={choice}
          state={getState(choice)}
          onClick={() => onSelect(choice.verseKey)}
          showTranslation={showTranslation}
          showTransliteration={showTransliteration}
        />
      ))}
    </div>
  );
}
