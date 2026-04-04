const AUDIO_CDN = "https://audio.qurancdn.com/";
const cache = new Map();

export async function fetchAudioUrl(reciterId, verseKey) {
  const cacheKey = `${reciterId}:${verseKey}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await fetch(
    `https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${verseKey}`
  );
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);

  const data = await res.json();
  const relativePath = data.audio_files?.[0]?.url;
  if (!relativePath) throw new Error("No audio file found");

  const fullUrl = `${AUDIO_CDN}${relativePath}`;
  cache.set(cacheKey, fullUrl);
  return fullUrl;
}
