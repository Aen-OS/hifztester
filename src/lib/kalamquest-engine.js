// src/lib/kalamquest-engine.js
import { shuffle } from "@/lib/game-engine";
import { stripTashkeel } from "@/lib/normalize-arabic";

/**
 * Build a shuffled prompt queue for KalamQuest.
 * - ayah mode: each verse is a prompt (user fills in blanked words)
 * - surah mode: each unique surah becomes a prompt (user fills missing ayah)
 * - page mode: each unique page becomes a prompt (user fills missing ayah)
 * - mixed: each verse is a prompt, with a random mode assigned per round
 */
export function createKalamQuestQueue(verses, mode) {
  if (mode === "surah") {
    const surahIds = [...new Set(verses.map((v) => v.chapterId))];
    return shuffle([...surahIds]).map((id) => ({ type: "surah", surahId: id }));
  }
  if (mode === "page") {
    const pageNums = [...new Set(verses.map((v) => v.pageNumber))];
    return shuffle([...pageNums]).map((p) => ({ type: "page", pageNumber: p }));
  }
  // ayah or mixed — one prompt per verse
  const modes = ["ayah", "surah", "page"];
  return shuffle([...verses]).map((v) => ({
    type: mode === "mixed" ? modes[Math.floor(Math.random() * modes.length)] : "ayah",
    verse: v,
    // For mixed surah/page prompts, attach the surah/page from the verse
    surahId: v.chapterId,
    pageNumber: v.pageNumber,
  }));
}

/**
 * Blank out words in an ayah based on difficulty.
 * Returns { display, blankedWords, blankedIndices }
 * - display: array of { word, blanked } objects
 * - blankedWords: the original words that were blanked (in order)
 * - blankedIndices: which indices were blanked
 */
export function blankWords(ayahText, difficulty) {
  const words = ayahText.trim().split(/\s+/);
  if (words.length === 0) return { display: [], blankedWords: [], blankedIndices: [] };

  // Determine how many words to blank
  let ratio;
  switch (difficulty) {
    case "easy":
      ratio = 0.2;
      break;
    case "medium":
      ratio = 0.4;
      break;
    case "hard":
      ratio = 0.6;
      break;
    default:
      ratio = 0.2;
  }

  let count = Math.max(1, Math.round(words.length * ratio));
  count = Math.min(count, words.length);

  // Pick indices to blank, preferring non-adjacent
  const indices = pickNonAdjacentIndices(words.length, count);

  const blankedWords = indices.map((i) => words[i]);
  const blankedSet = new Set(indices);
  const display = words.map((word, i) => ({
    word,
    blanked: blankedSet.has(i),
  }));

  return { display, blankedWords, blankedIndices: indices };
}

/**
 * Pick `count` indices from 0..length-1, preferring non-adjacent.
 * Falls back to adjacent if not enough non-adjacent slots available.
 */
function pickNonAdjacentIndices(length, count) {
  if (count >= length) return Array.from({ length }, (_, i) => i);

  // Try non-adjacent first
  const available = Array.from({ length }, (_, i) => i);
  const selected = [];
  const used = new Set();

  // Shuffle available indices
  const shuffled = shuffle([...available]);

  for (const idx of shuffled) {
    if (selected.length >= count) break;
    const hasAdjacentSelected = used.has(idx - 1) || used.has(idx + 1);
    if (!hasAdjacentSelected) {
      selected.push(idx);
      used.add(idx);
    }
  }

  // Fill remaining with any unused indices if non-adjacent wasn't enough
  if (selected.length < count) {
    for (const idx of shuffled) {
      if (selected.length >= count) break;
      if (!used.has(idx)) {
        selected.push(idx);
        used.add(idx);
      }
    }
  }

  return selected.sort((a, b) => a - b);
}

/**
 * Generate 3 distractor ayahs for surah/page mode.
 * Uses tiered difficulty like AyahFlow's generateDistractors.
 */
export function generateAyahDistractors(correctVerse, difficulty, scopeVerses, surahVerses) {
  const correctKey = correctVerse.verseKey;
  const correctNum = correctVerse.verseNumber;
  const correctChapter = correctVerse.chapterId;

  function getCandidates(tier) {
    switch (tier) {
      case "hard":
        return surahVerses.filter(
          (v) =>
            v.verseKey !== correctKey &&
            v.chapterId === correctChapter &&
            Math.abs(v.verseNumber - correctNum) <= 5,
        );
      case "medium":
        return surahVerses.filter(
          (v) =>
            v.verseKey !== correctKey &&
            v.chapterId === correctChapter &&
            Math.abs(v.verseNumber - correctNum) > 5,
        );
      case "easy":
        return scopeVerses.filter((v) => v.verseKey !== correctKey);
      default:
        return [];
    }
  }

  const distractors = [];
  const usedKeys = new Set([correctKey]);
  const tiers =
    difficulty === "hard"
      ? ["hard", "medium", "easy"]
      : difficulty === "medium"
        ? ["medium", "easy"]
        : ["easy"];

  for (const tier of tiers) {
    if (distractors.length >= 3) break;
    const candidates = getCandidates(tier).filter((v) => !usedKeys.has(v.verseKey));
    const shuffled = shuffle([...candidates]);
    for (const c of shuffled) {
      if (distractors.length >= 3) break;
      distractors.push(c);
      usedKeys.add(c.verseKey);
    }
  }

  return distractors;
}

/**
 * Generate 3 distractor word options for ayah mode (word blanks).
 * Each distractor is a string (same number of words as the blanked segment).
 * Pulls words from other ayahs in scope at similar positions.
 */
export function generateWordDistractors(blankedWords, blankedIndices, scopeVerses, correctVerseKey) {
  const distractors = [];
  const usedSet = new Set([blankedWords.join(" ")]);
  const wordCount = blankedWords.length;

  // Collect candidate word segments from other ayahs
  const candidates = [];
  for (const v of scopeVerses) {
    if (v.verseKey === correctVerseKey) continue;
    const words = v.textUthmani.trim().split(/\s+/);
    // For each blanked index, try to grab the same position from other verses
    for (const idx of blankedIndices) {
      if (idx < words.length) {
        const segment = words.slice(idx, idx + wordCount).join(" ");
        if (segment.split(/\s+/).length === wordCount && !usedSet.has(segment)) {
          candidates.push(segment);
          usedSet.add(segment);
        }
      }
    }
  }

  const shuffled = shuffle([...candidates]);
  for (const c of shuffled) {
    if (distractors.length >= 3) break;
    distractors.push(c);
  }

  // If not enough, grab random word segments from scope
  if (distractors.length < 3) {
    for (const v of shuffle([...scopeVerses])) {
      if (distractors.length >= 3) break;
      if (v.verseKey === correctVerseKey) continue;
      const words = v.textUthmani.trim().split(/\s+/);
      if (words.length >= wordCount) {
        const start = Math.floor(Math.random() * (words.length - wordCount + 1));
        const segment = words.slice(start, start + wordCount).join(" ");
        if (!usedSet.has(segment)) {
          distractors.push(segment);
          usedSet.add(segment);
        }
      }
    }
  }

  return distractors;
}

/**
 * Get surrounding context ayahs for a gap in surah/page mode.
 * Returns the array with the gap ayah removed, trimmed by difficulty.
 */
export function getContextAyahs(allAyahs, gapIndex, difficulty) {
  let before, after;
  switch (difficulty) {
    case "easy":
      before = gapIndex;
      after = allAyahs.length - gapIndex - 1;
      break;
    case "medium":
      before = Math.min(gapIndex, 4);
      after = Math.min(allAyahs.length - gapIndex - 1, 4);
      break;
    case "hard":
      before = Math.min(gapIndex, 2);
      after = Math.min(allAyahs.length - gapIndex - 1, 2);
      break;
    default:
      before = gapIndex;
      after = allAyahs.length - gapIndex - 1;
  }

  const start = gapIndex - before;
  const end = gapIndex + after + 1;
  const context = [];
  for (let i = start; i < end; i++) {
    if (i === gapIndex) {
      context.push({ gap: true, verseKey: allAyahs[i].verseKey });
    } else {
      context.push(allAyahs[i]);
    }
  }
  return context;
}

/**
 * Check if typed words match the correct blanked words.
 * Tashkeel-insensitive comparison.
 */
export function checkWordAnswer(typedWords, correctWords) {
  if (typedWords.length !== correctWords.length) return false;
  return typedWords.every(
    (typed, i) => stripTashkeel(typed) === stripTashkeel(correctWords[i]),
  );
}
