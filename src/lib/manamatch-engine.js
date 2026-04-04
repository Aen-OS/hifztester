import { shuffle, generateDistractors } from "./game-engine";

/**
 * Create a shuffled queue of verses for Ma'naMatch.
 * Excludes verses without translations.
 */
export function createManaMatchQueue(verses) {
  const eligible = verses.filter(
    (v) => v.translation && v.translation.trim().length > 0,
  );
  return shuffle([...eligible]);
}

/**
 * Build a Ma'naMatch question: Arabic prompt + 4 translation choices.
 *
 * Returns:
 * {
 *   prompt: verse,
 *   correctAnswer: { verseKey, translation },
 *   choices: [{ verseKey, translation }, ...] (4 items, shuffled)
 * }
 */
export function buildManaMatchQuestion(
  promptVerse,
  difficulty,
  scopeVerses,
  surahVerses,
) {
  const distractors = generateDistractors(
    promptVerse,
    difficulty,
    scopeVerses,
    surahVerses,
  );

  const correctChoice = {
    verseKey: promptVerse.verseKey,
    translation: promptVerse.translation,
  };

  const distractorChoices = distractors.map((v) => ({
    verseKey: v.verseKey,
    translation: v.translation,
  }));

  const choices = shuffle([correctChoice, ...distractorChoices]);

  return {
    prompt: promptVerse,
    correctAnswer: correctChoice,
    choices,
  };
}
