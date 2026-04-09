import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user-identity";
import { applyDecay } from "@/lib/confidence";
import { getJuzForVerse, getSurahName } from "@/lib/juz-mapping";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const groupBy = searchParams.get("group_by") || "surah";

  const { userId } = await getOrCreateUser();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("verse_confidence")
    .select("verse_key, confidence, last_tested_at")
    .eq("user_id", userId);

  if (!rows || rows.length === 0) {
    return Response.json({ items: [] });
  }

  // Apply time decay and group
  const groupMap = new Map();

  for (const row of rows) {
    const decayed = applyDecay(row.confidence, row.last_tested_at);
    const [ch] = row.verse_key.split(":").map(Number);

    let key;
    if (groupBy === "juz") {
      key = getJuzForVerse(row.verse_key);
    } else {
      key = ch;
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, { sum: 0, count: 0 });
    }
    const g = groupMap.get(key);
    g.sum += decayed;
    g.count++;
  }

  const items = [];
  for (const [key, g] of groupMap) {
    const item = {
      avg_confidence: Math.round((g.sum / g.count) * 100) / 100,
      verses_tested: g.count,
    };
    if (groupBy === "juz") {
      item.juz = key;
    } else {
      item.surah = key;
      item.surah_name = getSurahName(key);
    }
    items.push(item);
  }

  // Sort by lowest confidence first
  items.sort((a, b) => a.avg_confidence - b.avg_confidence);

  return Response.json({ items });
}
