// Ayah counts per surah. Source: @quranjs/api versesMapping.
// Duplicated from fetch-verses.js because game-engine runs client-side
// and cannot import server-only modules. Kept in sync manually.
const SURAH_AYAH_COUNTS = [
  0, // index 0 unused
  7,
  286,
  200,
  176,
  120,
  165,
  206,
  75,
  129,
  109, // 1-10
  123,
  111,
  43,
  52,
  99,
  128,
  111,
  110,
  98,
  135, // 11-20
  112,
  78,
  118,
  64,
  77,
  227,
  93,
  88,
  69,
  60, // 21-30
  34,
  30,
  73,
  54,
  45,
  83,
  182,
  88,
  75,
  85, // 31-40
  54,
  53,
  89,
  59,
  37,
  35,
  38,
  29,
  18,
  45, // 41-50
  60,
  49,
  62,
  55,
  78,
  96,
  29,
  22,
  24,
  13, // 51-60
  14,
  11,
  11,
  18,
  12,
  12,
  30,
  52,
  52,
  44, // 61-70
  28,
  28,
  20,
  56,
  40,
  31,
  50,
  40,
  46,
  42, // 71-80
  29,
  19,
  36,
  25,
  22,
  17,
  19,
  26,
  30,
  20, // 81-90
  15,
  21,
  11,
  8,
  8,
  19,
  5,
  8,
  8,
  11, // 91-100
  11,
  8,
  3,
  9,
  5,
  4,
  7,
  3,
  6,
  3, // 101-110
  5,
  4,
  5,
  6, // 111-114
];

export function getNextVerseKey(verseKey) {
  const [ch, v] = verseKey.split(":").map(Number);
  if (v < SURAH_AYAH_COUNTS[ch]) return `${ch}:${v + 1}`;
  const nextCh = ch === 114 ? 1 : ch + 1;
  return `${nextCh}:1`;
}

export function getPrevVerseKey(verseKey) {
  const [ch, v] = verseKey.split(":").map(Number);
  if (v > 1) return `${ch}:${v - 1}`;
  const prevCh = ch === 1 ? 114 : ch - 1;
  return `${prevCh}:${SURAH_AYAH_COUNTS[prevCh]}`;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Derive a comparable key from any prompt-queue item.
 * Works for plain verse objects, surah/page prompt objects, and raw IDs.
 */
export function queueItemKey(item) {
  if (item == null) return undefined;
  if (typeof item === "number" || typeof item === "string") return item;
  return (
    item.verseKey ?? item.verse?.verseKey ?? item.surahId ?? item.pageNumber
  );
}

/**
 * If the first item in `queue` has the same key as `lastKey`, swap it with
 * another random position so the user never sees the same prompt twice in a row
 * across queue boundaries.
 */
export function avoidRepeat(queue, lastKey) {
  if (
    queue.length > 1 &&
    lastKey !== undefined &&
    queueItemKey(queue[0]) === lastKey
  ) {
    const swapIdx = 1 + Math.floor(Math.random() * (queue.length - 1));
    [queue[0], queue[swapIdx]] = [queue[swapIdx], queue[0]];
  }
  return queue;
}

export function createPromptQueue(verses, boundaryKeys) {
  const boundarySet = new Set(boundaryKeys);
  const eligible = verses.filter((v) => !boundarySet.has(v.verseKey));
  return shuffle([...eligible]);
}

export function buildVerseMap(verses) {
  const map = new Map();
  for (const v of verses) {
    map.set(v.verseKey, v);
  }
  return map;
}

export function generateDistractors(
  correctVerse,
  difficulty,
  scopeVerses,
  surahVerses,
) {
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
            Math.abs(v.verseNumber - correctNum) > 6,
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
    const candidates = getCandidates(tier).filter(
      (v) => !usedKeys.has(v.verseKey),
    );
    shuffle(candidates);
    for (const c of candidates) {
      if (distractors.length >= 3) break;
      distractors.push(c);
      usedKeys.add(c.verseKey);
    }
  }

  return distractors;
}

export function buildQuestion(
  promptVerse,
  direction,
  difficulty,
  verseMap,
  scopeVerses,
  surahVerses,
) {
  const correctKey =
    direction === "next"
      ? getNextVerseKey(promptVerse.verseKey)
      : getPrevVerseKey(promptVerse.verseKey);

  const correctAnswer = verseMap.get(correctKey);
  if (!correctAnswer) {
    throw new Error(
      `Correct answer ${correctKey} not found in verse map. Boundary ayah may be missing.`,
    );
  }

  const distractors = generateDistractors(
    correctAnswer,
    difficulty,
    scopeVerses,
    surahVerses,
  );
  const choices = shuffle([correctAnswer, ...distractors]);

  return {
    prompt: promptVerse,
    direction,
    correctAnswer,
    choices,
  };
}
