// Juz boundaries: each entry is [startChapter, startVerse]
// Juz N starts at JUZ_STARTS[N] and ends just before JUZ_STARTS[N+1]
const JUZ_STARTS = [
  null, // index 0 unused
  [1, 1],   [2, 142], [2, 253], [3, 93],  [4, 24],
  [4, 148], [5, 82],  [6, 111], [7, 88],  [8, 41],
  [9, 93],  [11, 6],  [12, 53], [15, 1],  [17, 1],
  [18, 75], [21, 1],  [23, 1],  [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47],
  [46, 1],  [51, 31], [58, 1],  [67, 1],  [78, 1],
];

/**
 * Get the juz number for a given verse key (e.g. "2:255" → 3).
 */
export function getJuzForVerse(verseKey) {
  const [ch, v] = verseKey.split(":").map(Number);
  for (let juz = 30; juz >= 1; juz--) {
    const [startCh, startV] = JUZ_STARTS[juz];
    if (ch > startCh || (ch === startCh && v >= startV)) {
      return juz;
    }
  }
  return 1;
}

// Surah names for display in review screen
const SURAH_NAMES = [
  "", // index 0 unused
  "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah",
  "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
  "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha",
  "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
  "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
  "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
  "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
  "Al-Waqi'ah", "Al-Hadid", "Al-Mujadilah", "Al-Hashr", "Al-Mumtahanah",
  "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
  "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
  "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
  "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin",
  "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil",
  "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
];

/**
 * Get the surah name for a chapter number.
 */
export function getSurahName(chapterId) {
  return SURAH_NAMES[chapterId] || `Surah ${chapterId}`;
}
