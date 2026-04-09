import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user-identity";
import { updateConfidence, initialConfidence } from "@/lib/confidence";
import { getJuzForVerse, getSurahName } from "@/lib/juz-mapping";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { game, settings, duration_seconds, results } = body;

  if (!game || !Array.isArray(results) || results.length === 0) {
    return Response.json({ error: "missing_fields" }, { status: 400 });
  }

  const { userId } = await getOrCreateUser();
  const supabase = await createClient();

  // 1. Insert game session
  const scoreCorrect = results.filter((r) => r.correct).length;
  const scoreTotal = results.length;

  const { data: session, error: sessionErr } = await supabase
    .from("game_sessions")
    .insert({
      user_id: userId,
      game,
      settings: settings || {},
      score_correct: scoreCorrect,
      score_total: scoreTotal,
      duration_seconds: duration_seconds || 0,
    })
    .select("id")
    .single();

  if (sessionErr) {
    return Response.json({ error: "session_save_failed" }, { status: 500 });
  }

  // 2. Bulk insert question results
  const rows = results.map((r) => ({
    session_id: session.id,
    user_id: userId,
    game,
    verse_key: r.verse_key,
    correct: r.correct,
    user_answer: r.correct ? null : r.user_answer || null,
    response_ms: r.response_ms || 0,
  }));

  await supabase.from("question_results").insert(rows);

  // 3. Update verse confidence
  const verseKeys = [...new Set(results.map((r) => r.verse_key))];

  const { data: existing } = await supabase
    .from("verse_confidence")
    .select("verse_key, confidence, times_tested, times_correct")
    .eq("user_id", userId)
    .in("verse_key", verseKeys);

  const existingMap = new Map(
    (existing || []).map((e) => [e.verse_key, e])
  );

  let strengthened = 0;
  let weakened = 0;
  const upserts = [];

  for (const r of results) {
    const prev = existingMap.get(r.verse_key);
    let newConf;
    let timesTested;
    let timesCorrect;

    if (prev) {
      newConf = updateConfidence(prev.confidence, r.correct);
      timesTested = prev.times_tested + 1;
      timesCorrect = prev.times_correct + (r.correct ? 1 : 0);
      if (newConf > prev.confidence) strengthened++;
      else if (newConf < prev.confidence) weakened++;
    } else {
      newConf = initialConfidence(r.correct);
      timesTested = 1;
      timesCorrect = r.correct ? 1 : 0;
      if (r.correct) strengthened++;
      else weakened++;
    }

    upserts.push({
      user_id: userId,
      verse_key: r.verse_key,
      confidence: newConf,
      last_tested_at: new Date().toISOString(),
      times_tested: timesTested,
      times_correct: timesCorrect,
    });
  }

  await supabase.from("verse_confidence").upsert(upserts, {
    onConflict: "user_id,verse_key",
  });

  // 4. Build grouped response
  const groups = buildGroups(results);

  return Response.json({
    session_id: session.id,
    score_correct: scoreCorrect,
    score_total: scoreTotal,
    duration_seconds: duration_seconds || 0,
    groups,
    confidence_delta: { strengthened, weakened },
  });
}

function buildGroups(results) {
  // Group results by surah
  const surahMap = new Map();
  for (const r of results) {
    const [ch] = r.verse_key.split(":").map(Number);
    if (!surahMap.has(ch)) {
      surahMap.set(ch, { surah: ch, surah_name: getSurahName(ch), correct: 0, total: 0, results: [] });
    }
    const s = surahMap.get(ch);
    s.total++;
    if (r.correct) s.correct++;
    s.results.push({
      verse_key: r.verse_key,
      correct: r.correct,
      response_ms: r.response_ms || 0,
      ...(r.correct ? {} : { user_answer: r.user_answer || null }),
    });
  }

  // Check if results span multiple juz
  const juzSet = new Set();
  for (const r of results) {
    juzSet.add(getJuzForVerse(r.verse_key));
  }

  if (juzSet.size > 1) {
    // Group by juz → surah
    const juzMap = new Map();
    for (const [ch, surahData] of surahMap) {
      const juz = getJuzForVerse(`${ch}:1`);
      if (!juzMap.has(juz)) {
        juzMap.set(juz, { juz, surahs: [] });
      }
      juzMap.get(juz).surahs.push(surahData);
    }
    return [...juzMap.values()].sort((a, b) => a.juz - b.juz);
  }

  // Single juz — return surahs directly
  return [...surahMap.values()].sort((a, b) => a.surah - b.surah);
}
