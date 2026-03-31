"use server";

import client from "./quran-client";
import { DEFAULT_TRANSLATION_ID } from "./translations";

const VERSE_FIELDS = { textUthmani: true };
const MAX_PER_PAGE = 50; // API maximum

function buildFetchOpts(translationId) {
  return {
    fields: VERSE_FIELDS,
    translations: [translationId],
    translationFields: { resourceName: true, languageName: true },
    words: true,
  };
}

function normalizeVerse(raw) {
  const words = (raw.words ?? []).filter((w) => w.charTypeName === "word");
  const transliteration = words
    .map((w) => w.transliteration?.text ?? "")
    .join(" ");
  const translation =
    raw.translations?.[0]?.text ??
    words.map((w) => w.translation?.text ?? "").join(" ");

  return {
    id: raw.id,
    verseKey: raw.verseKey,
    chapterId: Number(raw.chapterId ?? raw.verseKey.split(":")[0]),
    verseNumber: raw.verseNumber,
    textUthmani: raw.textUthmani,
    translation,
    transliteration,
    juzNumber: raw.juzNumber,
    hizbNumber: raw.hizbNumber,
    pageNumber: raw.pageNumber,
  };
}

// The SDK does NOT auto-paginate; each call returns one page (max 50).
// We paginate manually until all verses are fetched.

async function fetchAllPages(fetchFn, id, opts) {
  const all = [];
  let page = 1;
  while (true) {
    const batch = await fetchFn(id, {
      ...opts,
      perPage: MAX_PER_PAGE,
      page,
    });
    all.push(...batch);
    if (batch.length < MAX_PER_PAGE) break;
    page++;
  }
  return all;
}

// Group sorted numbers into contiguous runs.
// e.g., [1, 2, 3, 7, 8] → [[1, 2, 3], [7, 8]]
function groupContiguous(sortedIds) {
  const groups = [];
  let current = [sortedIds[0]];
  for (let i = 1; i < sortedIds.length; i++) {
    if (sortedIds[i] === current[current.length - 1] + 1) {
      current.push(sortedIds[i]);
    } else {
      groups.push(current);
      current = [sortedIds[i]];
    }
  }
  groups.push(current);
  return groups;
}

async function fetchRangeAllPages(from, to, opts) {
  const all = [];
  let page = 1;
  while (true) {
    const batch = await client.verses.findByRange(from, to, {
      ...opts,
      perPage: MAX_PER_PAGE,
      page,
    });
    all.push(...batch);
    if (batch.length < MAX_PER_PAGE) break;
    page++;
  }
  return all;
}

async function fetchByChapters(chapterIds, opts) {
  const sorted = [...chapterIds].sort((a, b) => a - b);
  const groups = groupContiguous(sorted);
  const results = await Promise.all(
    groups.map((group) => {
      const first = group[0];
      const last = group[group.length - 1];
      return fetchRangeAllPages(
        `${first}:1`,
        `${last}:${SURAH_AYAH_COUNTS[last]}`,
        opts,
      );
    }),
  );
  return results.flat();
}

async function fetchByJuzs(juzIds, opts) {
  const results = await Promise.all(
    juzIds.map((id) => fetchAllPages(client.verses.findByJuz.bind(client.verses), id, opts)),
  );
  return results.flat();
}

async function fetchByPages(pageNumbers, opts) {
  const results = await Promise.all(
    pageNumbers.map((num) => fetchAllPages(client.verses.findByPage.bind(client.verses), num, opts)),
  );
  return results.flat();
}

async function fetchByHizbs(hizbIds, opts) {
  const results = await Promise.all(
    hizbIds.map((id) => fetchAllPages(client.verses.findByHizb.bind(client.verses), id, opts)),
  );
  return results.flat();
}

async function fetchVerseByKey(verseKey, opts) {
  const raw = await client.verses.findByKey(verseKey, opts);
  return raw;
}

// Ayah counts per surah. Source: @quranjs/api versesMapping.
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

function getNextVerseKey(verseKey) {
  const [ch, v] = verseKey.split(":").map(Number);
  if (v < SURAH_AYAH_COUNTS[ch]) {
    return `${ch}:${v + 1}`;
  }
  const nextCh = ch === 114 ? 1 : ch + 1;
  return `${nextCh}:1`;
}

function getPrevVerseKey(verseKey) {
  const [ch, v] = verseKey.split(":").map(Number);
  if (v > 1) {
    return `${ch}:${v - 1}`;
  }
  const prevCh = ch === 1 ? 114 : ch - 1;
  return `${prevCh}:${SURAH_AYAH_COUNTS[prevCh]}`;
}

/**
 * Main entry point: fetch all verses for a given scope,
 * plus boundary ayahs for correct answers at scope edges.
 * Returns { verses, boundaryKeys } where boundaryKeys is an Array
 * of verseKeys that should not be used as prompts.
 */
export async function fetchVersesForScope(scopeType, scopeValues, translationId = DEFAULT_TRANSLATION_ID) {
  const opts = buildFetchOpts(translationId);
  let rawVerses;

  switch (scopeType) {
    case "surah":
      rawVerses = await fetchByChapters(scopeValues, opts);
      break;
    case "juz":
      rawVerses = await fetchByJuzs(scopeValues, opts);
      break;
    case "page":
      rawVerses = await fetchByPages(scopeValues, opts);
      break;
    case "hizb":
      rawVerses = await fetchByHizbs(scopeValues, opts);
      break;
    default:
      throw new Error(`Unknown scope type: ${scopeType}`);
  }

  const seen = new Set();
  const verses = [];
  for (const raw of rawVerses) {
    const normalized = normalizeVerse(raw);
    if (!seen.has(normalized.verseKey)) {
      seen.add(normalized.verseKey);
      verses.push(normalized);
    }
  }

  verses.sort((a, b) => {
    if (a.chapterId !== b.chapterId) return a.chapterId - b.chapterId;
    return a.verseNumber - b.verseNumber;
  });

  const verseKeySet = new Set(verses.map((v) => v.verseKey));
  const boundaryKeys = new Set();
  const boundaryFetches = [];

  if (verses.length > 0) {
    const firstKey = verses[0].verseKey;
    const lastKey = verses[verses.length - 1].verseKey;

    const prevOfFirst = getPrevVerseKey(firstKey);
    const nextOfLast = getNextVerseKey(lastKey);

    if (!verseKeySet.has(prevOfFirst)) {
      boundaryKeys.add(prevOfFirst);
      boundaryFetches.push(fetchVerseByKey(prevOfFirst, opts));
    }
    if (!verseKeySet.has(nextOfLast)) {
      boundaryKeys.add(nextOfLast);
      boundaryFetches.push(fetchVerseByKey(nextOfLast, opts));
    }

    for (let i = 0; i < verses.length - 1; i++) {
      const expectedNext = getNextVerseKey(verses[i].verseKey);
      if (expectedNext !== verses[i + 1].verseKey) {
        const beforeGap = verses[i].verseKey;
        const afterGap = verses[i + 1].verseKey;

        const nextOfBefore = getNextVerseKey(beforeGap);
        const prevOfAfter = getPrevVerseKey(afterGap);

        if (!verseKeySet.has(nextOfBefore) && !boundaryKeys.has(nextOfBefore)) {
          boundaryKeys.add(nextOfBefore);
          boundaryFetches.push(fetchVerseByKey(nextOfBefore, opts));
        }
        if (!verseKeySet.has(prevOfAfter) && !boundaryKeys.has(prevOfAfter)) {
          boundaryKeys.add(prevOfAfter);
          boundaryFetches.push(fetchVerseByKey(prevOfAfter, opts));
        }
      }
    }
  }

  const boundaryRaw = await Promise.all(boundaryFetches);
  const boundaryVerses = boundaryRaw.map(normalizeVerse);

  return {
    verses: [...verses, ...boundaryVerses],
    boundaryKeys: Array.from(boundaryKeys),
  };
}

export async function fetchSurahForDistractors(chapterId, translationId = DEFAULT_TRANSLATION_ID) {
  const opts = buildFetchOpts(translationId);
  const rawVerses = await client.verses.findByChapter(chapterId, opts);
  return rawVerses.map(normalizeVerse);
}
