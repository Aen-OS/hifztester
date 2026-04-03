// src/lib/tartiblock-engine.js
import { shuffle } from "@/lib/game-engine";

/**
 * Build a shuffled prompt queue for TartibLock.
 * - ayah mode: each verse is a prompt (user reorders word blocks)
 * - surah mode: each unique surah becomes a prompt (user reorders ayah blocks)
 * - page mode: each unique page becomes a prompt (user reorders ayah blocks)
 * - mixed: each verse is a prompt, with a random mode assigned per round
 */
export function createTartibLockQueue(verses, mode) {
  if (mode === "surah") {
    const surahIds = [...new Set(verses.map((v) => v.chapterId))];
    return shuffle([...surahIds]).map((id) => ({ type: "surah", surahId: id }));
  }
  if (mode === "page") {
    const pageNums = [...new Set(verses.map((v) => v.pageNumber))];
    return shuffle([...pageNums]).map((p) => ({ type: "page", pageNumber: p }));
  }
  const modes = ["ayah", "surah", "page"];
  return shuffle([...verses]).map((v) => ({
    type: mode === "mixed" ? modes[Math.floor(Math.random() * modes.length)] : "ayah",
    verse: v,
    surahId: v.chapterId,
    pageNumber: v.pageNumber,
  }));
}

/**
 * Split an ayah's text into word-group blocks based on difficulty.
 * Easy: 3-4 groups, Medium: 5-7 groups, Hard: one word per block.
 * Returns [{ id, text, correctIndex }]
 */
export function splitAyahIntoBlocks(ayahText, difficulty) {
  const words = ayahText.trim().split(/\s+/);
  if (words.length === 0) return [];

  let targetGroups;
  switch (difficulty) {
    case "easy":
      targetGroups = Math.min(words.length, 3 + Math.floor(Math.random() * 2)); // 3-4
      break;
    case "medium":
      targetGroups = Math.min(words.length, 5 + Math.floor(Math.random() * 3)); // 5-7
      break;
    case "hard":
      targetGroups = words.length; // every word
      break;
    default:
      targetGroups = Math.min(words.length, 4);
  }

  // Distribute words evenly across groups
  const baseSize = Math.floor(words.length / targetGroups);
  const remainder = words.length % targetGroups;
  const blocks = [];
  let idx = 0;

  for (let g = 0; g < targetGroups; g++) {
    const size = baseSize + (g < remainder ? 1 : 0);
    const text = words.slice(idx, idx + size).join(" ");
    blocks.push({ id: `block-${g}`, text, correctIndex: g });
    idx += size;
  }

  return blocks;
}

/**
 * Select a subset of ayahs as blocks for surah/page mode.
 * Easy: 3-4 ayahs, Medium: 5-7, Hard: all.
 * If the source has fewer ayahs than the target, uses all.
 * Returns [{ id, verse, correctIndex }]
 */
export function selectAyahBlocks(verses, difficulty) {
  let count;
  switch (difficulty) {
    case "easy":
      count = 3 + Math.floor(Math.random() * 2); // 3-4
      break;
    case "medium":
      count = 5 + Math.floor(Math.random() * 3); // 5-7
      break;
    case "hard":
      count = verses.length;
      break;
    default:
      count = 4;
  }

  // For easy/medium, pick a consecutive run to preserve meaningful ordering
  const selected =
    count >= verses.length
      ? verses
      : (() => {
          const maxStart = verses.length - count;
          const start = Math.floor(Math.random() * (maxStart + 1));
          return verses.slice(start, start + count);
        })();

  return selected.map((v, i) => ({
    id: `block-${i}`,
    verse: v,
    correctIndex: i,
  }));
}

/**
 * Scramble blocks ensuring the result differs from the correct order.
 * Returns a new array (does not mutate input).
 */
export function scrambleBlocks(blocks) {
  if (blocks.length <= 1) return [...blocks];

  let scrambled = shuffle([...blocks]);
  // Re-shuffle if the scrambled order is identical to the original
  let attempts = 0;
  while (
    attempts < 10 &&
    scrambled.every((b, i) => b.correctIndex === i)
  ) {
    scrambled = shuffle([...scrambled]);
    attempts++;
  }

  return scrambled;
}

/**
 * Score the user's arrangement against the correct order.
 * `userOrder` is the array of blocks in the user's current order.
 * Returns { correctCount, totalCount, percentage, results }
 * where results is [{ block, isCorrect }].
 */
export function scoreArrangement(userOrder) {
  const results = userOrder.map((block, i) => ({
    block,
    isCorrect: block.correctIndex === i,
  }));

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return { correctCount, totalCount, percentage, results };
}
