/**
 * Unicode ranges for Arabic tashkeel/diacritics:
 * \u0610-\u061A  — Quranic signs above/below
 * \u064B-\u065F  — Fathatan through Waslah
 * \u0670        — Superscript Alef
 * \u06D6-\u06DC  — Quranic annotation signs
 * \u06DF-\u06E4  — More Quranic signs
 * \u06E7-\u06E8  — Yeh/Noon above
 * \u06EA-\u06ED  — More diacritical marks
 */
const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;

export function stripTashkeel(text) {
  return text.replace(TASHKEEL_RE, "").trim();
}

/**
 * Compare typed text against correct text, word-by-word after normalization.
 * Returns { typed: [{ word, status }], correct: [{ word, status }], isMatch }
 * status: "match" | "wrong" | "extra" | "missing"
 */
export function diffWords(typedRaw, correctRaw) {
  const typedNorm = stripTashkeel(typedRaw).split(/\s+/).filter(Boolean);
  const correctNorm = stripTashkeel(correctRaw).split(/\s+/).filter(Boolean);
  const correctOriginal = correctRaw.trim().split(/\s+/).filter(Boolean);
  const typedOriginal = typedRaw.trim().split(/\s+/).filter(Boolean);

  const maxLen = Math.max(typedNorm.length, correctNorm.length);

  const typed = [];
  const correct = [];

  for (let i = 0; i < maxLen; i++) {
    const tWord = typedNorm[i];
    const cWord = correctNorm[i];

    if (tWord && cWord && tWord === cWord) {
      typed.push({ word: typedOriginal[i] || tWord, status: "match" });
      correct.push({ word: correctOriginal[i] || cWord, status: "match" });
    } else if (tWord && cWord) {
      typed.push({ word: typedOriginal[i] || tWord, status: "wrong" });
      correct.push({ word: correctOriginal[i] || cWord, status: "missing" });
    } else if (tWord && !cWord) {
      typed.push({ word: typedOriginal[i] || tWord, status: "extra" });
    } else if (!tWord && cWord) {
      correct.push({ word: correctOriginal[i] || cWord, status: "missing" });
    }
  }

  const isMatch = typedNorm.length === correctNorm.length &&
    typedNorm.every((w, i) => w === correctNorm[i]);

  return { typed, correct, isMatch };
}
