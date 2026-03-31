"use server";

import client from "./quran-client";

const TRANSLATION_ID = "131"; // Sahih International
const VERSE_FIELDS = { textUthmani: true };

function normalizeVerse(raw) {
  return {
    id: raw.id,
    verseKey: raw.verseKey,
    chapterId: Number(raw.chapterId ?? raw.verseKey.split(":")[0]),
    verseNumber: raw.verseNumber,
    textUthmani: raw.textUthmani,
    translation: raw.translations?.[0]?.text ?? "",
    juzNumber: raw.juzNumber,
    hizbNumber: raw.hizbNumber,
    pageNumber: raw.pageNumber,
  };
}

export async function fetchChapterInfo(chapterId) {
  const [info, chapter] = await Promise.all([
    client.chapters.findInfoById(String(chapterId)),
    client.chapters.findById(String(chapterId)),
  ]);
  return {
    id: chapter.id,
    name: chapter.nameSimple,
    nameArabic: chapter.nameArabic,
    versesCount: chapter.versesCount,
    revelationPlace: chapter.revelationPlace,
    revelationOrder: chapter.revelationOrder,
    pages: chapter.pages,
    summary: info.shortText || info.text || "",
    fullSummary: info.text || info.shortText || "",
  };
}

export async function fetchAllChaptersInfo() {
  const chapters = await client.chapters.findAll();
  return chapters.map((ch) => ({
    id: ch.id,
    name: ch.nameSimple,
    nameArabic: ch.nameArabic,
    versesCount: ch.versesCount,
    revelationPlace: ch.revelationPlace,
    revelationOrder: ch.revelationOrder,
    pages: ch.pages,
  }));
}

export async function fetchVersesForPage(pageNumber) {
  const MAX_PER_PAGE = 50;
  const all = [];
  let page = 1;
  while (true) {
    const batch = await client.verses.findByPage(pageNumber, {
      fields: VERSE_FIELDS,
      translations: [TRANSLATION_ID],
      perPage: MAX_PER_PAGE,
      page,
    });
    all.push(...batch);
    if (batch.length < MAX_PER_PAGE) break;
    page++;
  }
  return all.map(normalizeVerse);
}
