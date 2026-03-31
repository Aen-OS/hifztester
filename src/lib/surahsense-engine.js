import { SURAH_NAMES } from "@/lib/quran-data";

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createSurahPromptQueue(surahIds) {
  return shuffle(surahIds);
}

/**
 * Generate 3 distractor surah IDs.
 * - Easy: random from scope
 * - Medium: nearby pages (proxy for same juz)
 * - Hard: same revelationPlace + similar versesCount (±20)
 */
export function generateSurahDistractors(correctSurah, difficulty, allChapters, scopeSurahIds) {
  const correctId = correctSurah.id;
  const usedIds = new Set([correctId]);
  const distractors = [];

  function addFromPool(pool) {
    const candidates = shuffle(pool.filter((ch) => !usedIds.has(ch.id)));
    for (const c of candidates) {
      if (distractors.length >= 3) break;
      distractors.push(c);
      usedIds.add(c.id);
    }
  }

  const scopeSet = new Set(scopeSurahIds);

  if (difficulty === "hard") {
    const hardPool = allChapters.filter(
      (ch) =>
        scopeSet.has(ch.id) &&
        ch.revelationPlace === correctSurah.revelationPlace &&
        Math.abs(ch.versesCount - correctSurah.versesCount) <= 20,
    );
    addFromPool(hardPool);
  }

  if (difficulty === "hard" || difficulty === "medium") {
    if (distractors.length < 3) {
      const correctPages = new Set(correctSurah.pages || []);
      const mediumPool = allChapters.filter(
        (ch) =>
          scopeSet.has(ch.id) &&
          (ch.pages || []).some((p) => {
            for (const cp of correctPages) {
              if (Math.abs(p - cp) <= 20) return true;
            }
            return false;
          }),
      );
      addFromPool(mediumPool);
    }
  }

  // Easy fallback: any surah from scope
  if (distractors.length < 3) {
    const easyPool = allChapters.filter((ch) => scopeSet.has(ch.id));
    addFromPool(easyPool);
  }

  return distractors;
}

export function pickRandomPage(chapter) {
  const pages = chapter.pages || [];
  if (pages.length === 0) return null;
  return pages[Math.floor(Math.random() * pages.length)];
}

export function pickRandomAyaat(surahVerses, count) {
  if (surahVerses.length <= count) return surahVerses;
  const maxStart = surahVerses.length - count;
  const start = Math.floor(Math.random() * (maxStart + 1));
  return surahVerses.slice(start, start + count);
}

export function getAyaatCount(difficulty) {
  switch (difficulty) {
    case "easy": return 5;
    case "medium": return 3;
    case "hard": return 2;
    default: return 3;
  }
}

const ALL_MODES = ["page", "ayah", "ayaat", "summary"];
export function pickRandomMode() {
  return ALL_MODES[Math.floor(Math.random() * ALL_MODES.length)];
}

/**
 * Remove occurrences of the surah name from the summary text so the
 * player cannot simply read it off the clue.  Handles common
 * transliteration variants (with/without prefix, hyphens, apostrophes).
 */
export function redactSurahName(text, surahId) {
  const name = SURAH_NAMES[surahId];
  if (!name) return text;

  // Build patterns: full name and the bare word after "Al-" / "Ash-" etc.
  const variants = [name];
  const dashIdx = name.indexOf("-");
  if (dashIdx !== -1) {
    variants.push(name.slice(dashIdx + 1)); // e.g. "Baqarah" from "Al-Baqarah"
  }

  for (const v of variants) {
    // Escape regex specials first, then make hyphens/apostrophes flexible
    const escaped = v
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/[-']/g, "[-'\\s]?");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    text = text.replace(re, "______");
  }
  return text;
}

function normalize(str) {
  return str.toLowerCase().replace(/[-'\s]/g, "");
}

function stripPrefix(name) {
  const dashIdx = name.indexOf("-");
  return dashIdx !== -1 ? name.slice(dashIdx + 1) : name;
}

export function matchSurahName(typed, correctId) {
  const correctName = SURAH_NAMES[correctId] || "";
  const input = normalize(typed.trim());
  if (!input) return false;
  return (
    input === normalize(correctName) ||
    input === normalize(stripPrefix(correctName))
  );
}
