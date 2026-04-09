# Review Screen, Performance Metrics & Focus Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add post-game review screens with spaced-repetition confidence scoring, weakness-based scope selection, and configurable game length. Data persists in Supabase, tied to anonymous user identities that optionally link to Quran.com accounts.

**Architecture:** Server-centric — game results are collected in client state during play, POSTed to Next.js API routes at game end, which persist to Supabase. Confidence scores are computed server-side. UI changes are AyahFlow-only; data model is game-agnostic.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL), React 19, Tailwind CSS 4

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/001_initial_schema.sql` | Create | SQL migration for all 4 tables |
| `src/lib/user-identity.js` | Create | Server-side helper: get-or-create user from `itqaan_uid` cookie |
| `src/lib/confidence.js` | Create | Confidence formula: update + time-decay logic |
| `src/lib/juz-mapping.js` | Create | Verse-key → juz number lookup (static data) |
| `src/app/api/user/route.js` | Create | GET /api/user — get-or-create anonymous user |
| `src/app/api/sessions/route.js` | Create | POST /api/sessions — save game session + update confidence |
| `src/app/api/confidence/route.js` | Create | GET /api/confidence — ranked weakness data |
| `src/app/api/auth/quran/callback/route.js` | Modify | Link QF sub to user row after OAuth |
| `src/components/QuranAuthHeader.jsx` | Modify | Update header text for anonymous users |
| `src/components/ayahflow/ReviewScreen.jsx` | Create | Post-game review with expandable hierarchy |
| `src/components/ayahflow/GameLengthSelector.jsx` | Create | Question count / time limit selector |
| `src/components/ayahflow/FocusModeSelector.jsx` | Create | Weakness-ranked scope selector |
| `src/components/ayahflow/ScopeModeToggle.jsx` | Create | Manual / Focus Mode toggle |
| `src/components/ayahflow/GameTimer.jsx` | Create | Countdown timer for time-limited games |
| `src/app/ayahflow/page.js` | Modify | Add game length + focus mode to settings |
| `src/app/ayahflow/play/page.js` | Modify | Track per-question results, game length limits, show review |

---

### Task 1: Supabase Schema Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Users table: anonymous identity with optional Quran.com link
create table users (
  id uuid primary key default gen_random_uuid(),
  anon_token text unique not null,
  qf_sub text unique,
  created_at timestamptz default now()
);

-- Game sessions: one row per completed game
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  game text not null,
  settings jsonb not null default '{}',
  score_correct int not null default 0,
  score_total int not null default 0,
  duration_seconds int not null default 0,
  created_at timestamptz default now()
);

create index idx_game_sessions_user on game_sessions(user_id);

-- Question results: one row per question answered
create table question_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  user_id uuid not null references users(id),
  game text not null,
  verse_key text not null,
  correct boolean not null,
  user_answer text,
  response_ms int not null default 0,
  created_at timestamptz default now()
);

create index idx_question_results_user on question_results(user_id);
create index idx_question_results_session on question_results(session_id);

-- Verse confidence: spaced repetition state per ayah per user
create table verse_confidence (
  user_id uuid not null references users(id),
  verse_key text not null,
  confidence float not null default 0,
  last_tested_at timestamptz not null default now(),
  times_tested int not null default 0,
  times_correct int not null default 0,
  primary key (user_id, verse_key)
);

create index idx_verse_confidence_user on verse_confidence(user_id);
```

- [ ] **Step 2: Run the migration in Supabase**

Go to your Supabase project dashboard → SQL Editor → paste the SQL above → click "Run". Verify all 4 tables appear in the Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat: add Supabase schema for users, sessions, results, confidence"
```

---

### Task 2: User Identity Helper

**Files:**
- Create: `src/lib/user-identity.js`

- [ ] **Step 1: Create the user identity module**

This server-side helper reads the `itqaan_uid` cookie, looks up or creates a user in Supabase, and returns the user ID. It also sets the cookie on new users.

```js
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const COOKIE_NAME = "itqaan_uid";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

/**
 * Get or create the current user from the itqaan_uid cookie.
 * Returns { userId, isNew } where isNew is true if a user was just created.
 * Sets the cookie if it doesn't exist.
 */
export async function getOrCreateUser() {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const existingToken = cookieStore.get(COOKIE_NAME)?.value;

  if (existingToken) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("anon_token", existingToken)
      .single();

    if (data) {
      return { userId: data.id, isNew: false };
    }
  }

  // No cookie or user not found — create new user
  const anonToken = crypto.randomUUID();
  const { data, error } = await supabase
    .from("users")
    .insert({ anon_token: anonToken })
    .select("id")
    .single();

  if (error) throw new Error("Failed to create user");

  cookieStore.set(COOKIE_NAME, anonToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return { userId: data.id, isNew: true };
}

/**
 * Look up a user by their Quran.com sub claim.
 * Returns the user row or null.
 */
export async function findUserByQfSub(qfSub) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, anon_token")
    .eq("qf_sub", qfSub)
    .single();
  return data;
}

/**
 * Link a Quran.com sub to an existing user row.
 */
export async function linkQfSub(userId, qfSub) {
  const supabase = await createClient();
  await supabase
    .from("users")
    .update({ qf_sub: qfSub })
    .eq("id", userId);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/user-identity.js
git commit -m "feat: add user identity helper for anonymous users and QF linking"
```

---

### Task 3: Confidence Formula Module

**Files:**
- Create: `src/lib/confidence.js`

- [ ] **Step 1: Create the confidence module**

```js
const CORRECT_BOOST = 0.15;
const INCORRECT_PENALTY = 0.25;
const DECAY_FACTOR = 0.97; // per day

/**
 * Compute the new raw confidence after an answer.
 * @param {number} current - current stored confidence (0-1)
 * @param {boolean} correct - whether the answer was correct
 * @returns {number} new confidence (0-1)
 */
export function updateConfidence(current, correct) {
  if (correct) {
    return Math.min(1.0, current + CORRECT_BOOST);
  }
  return Math.max(0.0, current - INCORRECT_PENALTY);
}

/**
 * Apply time decay to a confidence value.
 * @param {number} confidence - stored confidence (0-1)
 * @param {Date|string} lastTestedAt - when the ayah was last tested
 * @returns {number} decayed confidence (0-1)
 */
export function applyDecay(confidence, lastTestedAt) {
  const last = new Date(lastTestedAt);
  const now = new Date();
  const daysSince = (now - last) / (1000 * 60 * 60 * 24);
  if (daysSince <= 0) return confidence;
  return confidence * Math.pow(DECAY_FACTOR, daysSince);
}

/**
 * Compute initial confidence for a first-time ayah encounter.
 * @param {boolean} correct
 * @returns {number}
 */
export function initialConfidence(correct) {
  return correct ? CORRECT_BOOST : 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/confidence.js
git commit -m "feat: add confidence formula module for spaced repetition"
```

---

### Task 4: Juz Mapping Module

**Files:**
- Create: `src/lib/juz-mapping.js`

- [ ] **Step 1: Create the juz-mapping module**

This provides a lookup from verse key to juz number, and surah names. Used by the `/api/sessions` response to group results by juz.

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/juz-mapping.js
git commit -m "feat: add juz mapping and surah name lookup"
```

---

### Task 5: GET /api/user Route

**Files:**
- Create: `src/app/api/user/route.js`

- [ ] **Step 1: Create the route**

```js
import { getOrCreateUser } from "@/lib/user-identity";

export async function GET() {
  try {
    const { userId, isNew } = await getOrCreateUser();
    return Response.json({ user_id: userId, is_new: isNew });
  } catch {
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the route builds**

Run: `npx next build 2>&1 | grep "/api/user"`
Expected: `├ ƒ /api/user`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/route.js
git commit -m "feat: add GET /api/user route for anonymous identity"
```

---

### Task 6: POST /api/sessions Route

**Files:**
- Create: `src/app/api/sessions/route.js`

- [ ] **Step 1: Create the route**

This is the main route that saves a completed game session, updates confidence scores, and returns grouped results for the review screen.

```js
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
```

- [ ] **Step 2: Verify the route builds**

Run: `npx next build 2>&1 | grep "/api/sessions"`
Expected: `├ ƒ /api/sessions`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sessions/route.js
git commit -m "feat: add POST /api/sessions route with confidence updates"
```

---

### Task 7: GET /api/confidence Route

**Files:**
- Create: `src/app/api/confidence/route.js`

- [ ] **Step 1: Create the route**

```js
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
```

- [ ] **Step 2: Verify the route builds**

Run: `npx next build 2>&1 | grep "/api/confidence"`
Expected: `├ ƒ /api/confidence`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/confidence/route.js
git commit -m "feat: add GET /api/confidence route with time-decay ranking"
```

---

### Task 8: Modify Quran.com OAuth Callback for User Linking

**Files:**
- Modify: `src/app/api/auth/quran/callback/route.js`

- [ ] **Step 1: Update the callback route**

Add user linking after tokens are stored. The callback currently stores tokens and redirects. We add: decode `id_token` → find/create user → link `qf_sub`.

Replace the entire file content of `src/app/api/auth/quran/callback/route.js`:

```js
import { cookies } from "next/headers";
import { COOKIE_OPTIONS, TOKEN_COOKIE_NAMES } from "@/lib/qf-auth";
import { getOrCreateUser, findUserByQfSub, linkQfSub } from "@/lib/user-identity";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const cookieStore = await cookies();
  const savedState = cookieStore.get(TOKEN_COOKIE_NAMES.oauthState)?.value;
  const codeVerifier = cookieStore.get(TOKEN_COOKIE_NAMES.codeVerifier)?.value;

  // Validate state for CSRF protection
  if (!state || !savedState || state !== savedState) {
    return Response.redirect(`${baseUrl}/`);
  }

  if (!code || !codeVerifier) {
    return Response.redirect(`${baseUrl}/`);
  }

  // Exchange authorization code for tokens
  const authUrl = process.env.QF_AUTH_URL;
  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: `${baseUrl}/api/auth/quran/callback`,
    code_verifier: codeVerifier,
  });

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  let tokenData;
  try {
    const tokenRes = await fetch(`${authUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      return Response.redirect(`${baseUrl}/`);
    }

    tokenData = await tokenRes.json();
  } catch {
    return Response.redirect(`${baseUrl}/`);
  }

  // Store tokens in httpOnly cookies
  const maxAge = tokenData.expires_in || 3600;

  cookieStore.set(TOKEN_COOKIE_NAMES.accessToken, tokenData.access_token, {
    ...COOKIE_OPTIONS,
    maxAge,
  });

  if (tokenData.refresh_token) {
    cookieStore.set(
      TOKEN_COOKIE_NAMES.refreshToken,
      tokenData.refresh_token,
      { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 } // 30 days
    );
  }

  if (tokenData.id_token) {
    cookieStore.set(TOKEN_COOKIE_NAMES.idToken, tokenData.id_token, {
      ...COOKIE_OPTIONS,
      maxAge,
    });
  }

  // Clear temporary PKCE cookies
  cookieStore.delete(TOKEN_COOKIE_NAMES.oauthState);
  cookieStore.delete(TOKEN_COOKIE_NAMES.codeVerifier);

  // Link Quran.com identity to Supabase user
  if (tokenData.id_token) {
    try {
      // Decode JWT payload (no verification needed — we just got it from QF)
      const payload = JSON.parse(
        Buffer.from(tokenData.id_token.split(".")[1], "base64").toString()
      );
      const qfSub = payload.sub;

      if (qfSub) {
        const hasItqaanCookie = cookieStore.has("itqaan_uid");

        if (hasItqaanCookie) {
          // User has local identity — link QF sub to it
          const { userId } = await getOrCreateUser();
          await linkQfSub(userId, qfSub);
        } else {
          // New device — check if QF account already linked to a user
          const existingUser = await findUserByQfSub(qfSub);
          if (existingUser) {
            // Cross-device merge: set cookie to existing user's token
            cookieStore.set("itqaan_uid", existingUser.anon_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 365 * 24 * 60 * 60,
            });
          } else {
            // Brand new user with QF account — create and link
            const { userId } = await getOrCreateUser();
            await linkQfSub(userId, qfSub);
          }
        }
      }
    } catch {
      // Non-fatal — user linking failed but auth still works
    }
  }

  return Response.redirect(`${baseUrl}/`);
}
```

- [ ] **Step 2: Verify the build passes**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/quran/callback/route.js
git commit -m "feat: link Quran.com identity to Supabase user in OAuth callback"
```

---

### Task 9: Update Header Text for Anonymous Users

**Files:**
- Modify: `src/components/QuranAuthHeader.jsx`

- [ ] **Step 1: Update the "Connect" link text**

In `src/components/QuranAuthHeader.jsx`, find the not-connected state (line 70-74) and change the link text:

Replace:
```jsx
            Connect Quran.com
```

With:
```jsx
            Connect Quran.com to sync your progress across devices
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuranAuthHeader.jsx
git commit -m "feat: update header prompt to mention progress syncing"
```

---

### Task 10: Review Screen Component

**Files:**
- Create: `src/components/ayahflow/ReviewScreen.jsx`

- [ ] **Step 1: Create the review screen component**

```jsx
"use client";

import { useState } from "react";

function accuracyColor(pct) {
  if (pct >= 90) return "text-emerald-700";
  if (pct >= 70) return "text-amber-500";
  return "text-red-500";
}

function barColor(pct) {
  if (pct >= 90) return "bg-emerald-700";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function AyahList({ results }) {
  const wrong = results.filter((r) => !r.correct);
  const correctCount = results.filter((r) => r.correct).length;
  const showAll = results.length <= 6;

  return (
    <div className="mt-2 space-y-0.5 text-xs">
      {(showAll ? results : wrong).map((r, i) => (
        <div
          key={i}
          className={`flex items-center justify-between rounded px-2 py-1 ${
            r.correct ? "" : "bg-red-500/10"
          }`}
        >
          <span className={r.correct ? "text-muted" : "text-red-500"}>
            {r.verse_key} {r.correct ? "✓" : "✗"}
          </span>
          {!r.correct && r.user_answer && (
            <span className="text-muted">You answered {r.user_answer}</span>
          )}
        </div>
      ))}
      {!showAll && correctCount > 0 && (
        <p className="px-2 text-muted">+ {correctCount} more correct</p>
      )}
    </div>
  );
}

function SurahRow({ surah_name, correct, total, results }) {
  const [expanded, setExpanded] = useState(false);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div
      className="cursor-pointer rounded-lg bg-surface-raised p-3"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm">{surah_name}</span>
        <span className={`text-xs font-semibold ${accuracyColor(pct)}`}>
          {correct}/{total} — {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${barColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {expanded ? (
        <AyahList results={results} />
      ) : (
        <p className="mt-2 text-[11px] text-muted">Tap to expand</p>
      )}
    </div>
  );
}

function JuzGroup({ juz, surahs }) {
  const [expanded, setExpanded] = useState(false);
  const totalCorrect = surahs.reduce((sum, s) => sum + s.correct, 0);
  const totalAll = surahs.reduce((sum, s) => sum + s.total, 0);
  const pct = totalAll > 0 ? Math.round((totalCorrect / totalAll) * 100) : 0;

  return (
    <div className="rounded-lg bg-surface-raised p-3">
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Juz {juz}</span>
          <span className={`text-xs font-semibold ${accuracyColor(pct)}`}>
            {totalCorrect}/{totalAll} — {pct}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${barColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {expanded ? (
        <div className="ml-2 mt-3 space-y-2">
          {surahs.map((s) => (
            <SurahRow key={s.surah} {...s} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          Tap to expand · {surahs.map((s) => s.surah_name).join(", ")}
        </p>
      )}
    </div>
  );
}

export default function ReviewScreen({
  data,
  isConnected,
  onPlayAgain,
  onNewSettings,
}) {
  const { score_correct, score_total, duration_seconds, groups, confidence_delta } = data;
  const pct = score_total > 0 ? Math.round((score_correct / score_total) * 100) : 0;
  const isMultiJuz = groups.length > 0 && groups[0].juz !== undefined;

  return (
    <div className="mx-auto max-w-[680px] px-5 py-8">
      {/* Score summary */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-ink">Session Complete</h2>
        <p className="mt-3 text-5xl font-bold text-emerald-700">
          {score_correct}/{score_total}
        </p>
        <p className="mt-1 text-sm text-muted">
          {pct}% accuracy · {formatDuration(duration_seconds)}
        </p>
      </div>

      {/* Performance breakdown */}
      <div className="mt-8">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          Performance by {isMultiJuz ? "Juz" : "Surah"}
        </h3>
        <div className="space-y-2">
          {isMultiJuz
            ? groups.map((g) => <JuzGroup key={g.juz} {...g} />)
            : groups.map((g) => <SurahRow key={g.surah} {...g} />)}
        </div>
      </div>

      {/* Confidence delta */}
      {confidence_delta && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Confidence Updated
          </h3>
          <div className="rounded-lg bg-surface-raised p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Strengthened</span>
              <span className="text-emerald-700">
                {confidence_delta.strengthened} ayahs ↑
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">Needs work</span>
              <span className="text-red-500">
                {confidence_delta.weakened} ayahs ↓
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sync prompt for anonymous users */}
      {!isConnected && (
        <a
          href="/api/auth/quran"
          className="mt-6 block rounded-lg border border-emerald-700/30 bg-emerald-700/5 p-3 text-center text-xs text-emerald-700 transition-colors hover:bg-emerald-700/10"
        >
          Connect Quran.com to sync your progress across devices
        </a>
      )}

      {/* Action buttons */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-lg bg-emerald-700 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
        >
          Play Again
        </button>
        <button
          onClick={onNewSettings}
          className="flex-1 rounded-lg border border-border py-3 text-sm font-medium transition-colors hover:bg-surface-raised"
        >
          New Settings
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/ReviewScreen.jsx
git commit -m "feat: add ReviewScreen component with expandable juz/surah/ayah hierarchy"
```

---

### Task 11: Game Length Selector Component

**Files:**
- Create: `src/components/ayahflow/GameLengthSelector.jsx`

- [ ] **Step 1: Create the component**

```jsx
"use client";

const QUESTION_PRESETS = [10, 20, 30, 50];
const TIME_PRESETS = [5, 10, 15, 20]; // minutes

export default function GameLengthSelector({ value, onChange }) {
  // value = { mode: "questions"|"time"|"unlimited", count: number, minutes: number }
  const { mode, count, minutes } = value;

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex overflow-hidden rounded-lg bg-surface-raised">
        <button
          onClick={() => onChange({ ...value, mode: "questions" })}
          className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
            mode === "questions"
              ? "bg-emerald-700 text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          By Questions
        </button>
        <button
          onClick={() => onChange({ ...value, mode: "time" })}
          className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
            mode === "time"
              ? "bg-emerald-700 text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          By Time
        </button>
      </div>

      {/* Presets */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {mode === "time"
          ? TIME_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => onChange({ ...value, mode: "time", minutes: m })}
                className={`rounded-lg border py-2.5 text-center text-sm transition-colors ${
                  mode === "time" && minutes === m
                    ? "border-emerald-700 font-semibold text-emerald-700"
                    : "border-border text-ink hover:border-emerald-700/50"
                }`}
              >
                {m}m
              </button>
            ))
          : QUESTION_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => onChange({ ...value, mode: "questions", count: n })}
                className={`rounded-lg border py-2.5 text-center text-sm transition-colors ${
                  mode === "questions" && count === n
                    ? "border-emerald-700 font-semibold text-emerald-700"
                    : "border-border text-ink hover:border-emerald-700/50"
                }`}
              >
                {n}
              </button>
            ))}
      </div>

      {/* Unlimited toggle */}
      <label className="mt-3 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={mode === "unlimited"}
          onChange={(e) =>
            onChange({
              ...value,
              mode: e.target.checked ? "unlimited" : "questions",
            })
          }
          className="h-4 w-4 rounded border-border accent-emerald-700"
        />
        <span className="text-xs text-muted">Unlimited (end manually)</span>
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/GameLengthSelector.jsx
git commit -m "feat: add GameLengthSelector component"
```

---

### Task 12: Game Timer Component

**Files:**
- Create: `src/components/ayahflow/GameTimer.jsx`

- [ ] **Step 1: Create the component**

```jsx
"use client";

import { useState, useEffect, useRef } from "react";

export default function GameTimer({ minutes, onTimeUp }) {
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const calledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0 && !calledRef.current) {
          calledRef.current = true;
          onTimeUp();
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [minutes, onTimeUp]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const isLow = remaining <= 60;

  return (
    <span
      className={`inline-block rounded-[20px] px-3 py-1 text-[13px] ${
        isLow
          ? "bg-red-500/10 text-red-500"
          : "bg-emerald-700/8 text-emerald-700"
      }`}
    >
      {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/GameTimer.jsx
git commit -m "feat: add GameTimer countdown component"
```

---

### Task 13: Focus Mode Selector Component

**Files:**
- Create: `src/components/ayahflow/ScopeModeToggle.jsx`
- Create: `src/components/ayahflow/FocusModeSelector.jsx`

- [ ] **Step 1: Create the scope mode toggle**

```jsx
"use client";

export default function ScopeModeToggle({ value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg bg-surface-raised">
      <button
        onClick={() => onChange("manual")}
        className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
          value === "manual"
            ? "bg-emerald-700 text-white"
            : "text-muted hover:text-ink"
        }`}
      >
        Manual
      </button>
      <button
        onClick={() => onChange("focus")}
        className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
          value === "focus"
            ? "bg-emerald-700 text-white"
            : "text-muted hover:text-ink"
        }`}
      >
        Focus Mode
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the focus mode selector**

```jsx
"use client";

import { useState, useEffect } from "react";

function confidenceColor(conf) {
  if (conf >= 0.75) return "text-emerald-700";
  if (conf >= 0.5) return "text-amber-500";
  return "text-red-500";
}

export default function FocusModeSelector({ value, onChange }) {
  // value = { granularity: "juz"|"surah", selected: number[], auto: boolean }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/confidence?group_by=${value.granularity}`);
        const data = await res.json();
        setItems(data.items || []);
        setHasData((data.items || []).length > 0);
      } catch {
        setItems([]);
        setHasData(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [value.granularity]);

  if (loading) {
    return (
      <div className="py-6 text-center text-xs text-muted">
        Loading confidence data...
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-lg bg-surface-raised p-4 text-center">
        <p className="text-sm text-muted">Not enough data yet</p>
        <p className="mt-1 text-xs text-muted">
          Play a few sessions to unlock Focus Mode
        </p>
      </div>
    );
  }

  function handleAutoSelect() {
    // Auto-select weakest 2 items (or all if fewer)
    const weakest = items.slice(0, Math.min(2, items.length));
    const keys = weakest.map((it) => it.juz ?? it.surah);
    onChange({ ...value, selected: keys, auto: true });
  }

  function toggleItem(key) {
    const selected = value.selected.includes(key)
      ? value.selected.filter((k) => k !== key)
      : [...value.selected, key];
    onChange({ ...value, selected, auto: false });
  }

  return (
    <div>
      {/* Auto-select button */}
      <button
        onClick={handleAutoSelect}
        className="w-full rounded-lg border border-emerald-700/30 bg-emerald-700/5 p-3 text-center transition-colors hover:bg-emerald-700/10"
      >
        <span className="text-sm font-semibold text-emerald-700">
          Practice Weakest Areas
        </span>
        <br />
        <span className="text-[11px] text-emerald-700/70">
          Auto-selects your lowest confidence ayahs
        </span>
      </button>

      {/* Granularity toggle */}
      <div className="mt-4 flex overflow-hidden rounded-lg bg-surface-raised">
        <button
          onClick={() => onChange({ ...value, granularity: "juz", selected: [], auto: false })}
          className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
            value.granularity === "juz"
              ? "bg-border text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          By Juz
        </button>
        <button
          onClick={() => onChange({ ...value, granularity: "surah", selected: [], auto: false })}
          className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
            value.granularity === "surah"
              ? "bg-border text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          By Surah
        </button>
      </div>

      {/* Ranked list */}
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const key = item.juz ?? item.surah;
          const label = item.juz ? `Juz ${item.juz}` : item.surah_name;
          const isSelected = value.selected.includes(key);
          const confPct = Math.round(item.avg_confidence * 100);

          return (
            <button
              key={key}
              onClick={() => toggleItem(key)}
              className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors ${
                isSelected
                  ? "border border-emerald-700/50 bg-surface-raised"
                  : "border border-border bg-surface-raised"
              }`}
            >
              <div>
                <span className="text-sm">{label}</span>
                <span className={`ml-2 text-xs ${confidenceColor(item.avg_confidence)}`}>
                  {confPct}% confidence
                </span>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded text-[11px] ${
                  isSelected
                    ? "bg-emerald-700 text-white"
                    : "border border-border"
                }`}
              >
                {isSelected && "✓"}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Ranked by lowest confidence. Only {value.granularity === "juz" ? "juz" : "surahs"} you've practiced appear.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ayahflow/ScopeModeToggle.jsx src/components/ayahflow/FocusModeSelector.jsx
git commit -m "feat: add Focus Mode scope selector with weakness ranking"
```

---

### Task 14: Modify AyahFlow Settings Page

**Files:**
- Modify: `src/app/ayahflow/page.js`

- [ ] **Step 1: Replace the entire settings page**

The page gains three new features: scope mode toggle (manual/focus), game length selector, and focus mode parameters passed through URL.

Replace the entire content of `src/app/ayahflow/page.js`:

```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";
import DifficultySelector from "@/components/ayahflow/DifficultySelector";
import DirectionToggle from "@/components/ayahflow/DirectionToggle";
import AnswerModeSelector from "@/components/ayahflow/AnswerModeSelector";
import BackButton from "@/components/BackButton";
import DisplayOptionsSelector from "@/components/ayahflow/DisplayOptionsSelector";
import ReciterSelector from "@/components/shared/ReciterSelector";
import GameLengthSelector from "@/components/ayahflow/GameLengthSelector";
import ScopeModeToggle from "@/components/ayahflow/ScopeModeToggle";
import FocusModeSelector from "@/components/ayahflow/FocusModeSelector";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

export default function AyahFlowSetup() {
  const router = useRouter();
  const [scopeMode, setScopeMode] = useState("manual");
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [focusScope, setFocusScope] = useState({
    granularity: "juz",
    selected: [],
    auto: false,
  });
  const [difficulty, setDifficulty] = useState("easy");
  const [testPrevious, setTestPrevious] = useState(false);
  const [answerMode, setAnswerMode] = useState("choices");
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);
  const [reciterId, setReciterId] = useState(null);
  const [gameLength, setGameLength] = useState({
    mode: "questions",
    count: 20,
    minutes: 10,
  });

  function handleStart() {
    let scopeType, scopeValues;

    if (scopeMode === "focus" && focusScope.selected.length > 0) {
      scopeType = focusScope.granularity === "juz" ? "juz" : "surah";
      scopeValues = focusScope.selected.join(",");
    } else {
      scopeType = scope.type;
      scopeValues = scope.values.join(",");
    }

    const params = new URLSearchParams({
      scopeType,
      scopeValues,
      difficulty,
      mode: answerMode,
      testPrevious: testPrevious.toString(),
      translation: translationEnabled ? translationId : "off",
      transliteration: transliterationEnabled ? "on" : "off",
      reciter: reciterId ?? "off",
      lengthMode: gameLength.mode,
      lengthValue:
        gameLength.mode === "time"
          ? gameLength.minutes.toString()
          : gameLength.mode === "questions"
            ? gameLength.count.toString()
            : "0",
    });
    router.push(`/ayahflow/play?${params.toString()}`);
  }

  const canStart =
    scopeMode === "focus"
      ? focusScope.selected.length > 0
      : scope.values.length > 0;

  return (
    <div className="mx-auto max-w-[480px] px-4 py-12">
      <BackButton />
      <h1 className="mt-4 text-3xl font-bold text-emerald-700">AyahFlow</h1>
      <p className="mt-1 text-muted">
        Guess the next ayah from multiple choices
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Scope
          </h2>
          <ScopeModeToggle value={scopeMode} onChange={setScopeMode} />
          <div className="mt-4">
            {scopeMode === "manual" ? (
              <ScopeSelector value={scope} onChange={setScope} />
            ) : (
              <FocusModeSelector value={focusScope} onChange={setFocusScope} />
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Session Length
          </h2>
          <GameLengthSelector value={gameLength} onChange={setGameLength} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Difficulty
          </h2>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Answer Mode
          </h2>
          <AnswerModeSelector value={answerMode} onChange={setAnswerMode} />
        </section>

        <section>
          <DirectionToggle enabled={testPrevious} onChange={setTestPrevious} />
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Display Options
          </h2>
          <p className="mb-3 mt-1 text-xs text-muted">
            Choose what to show alongside the Arabic text
          </p>
          <DisplayOptionsSelector
            translationEnabled={translationEnabled}
            onTranslationEnabledChange={setTranslationEnabled}
            translationId={translationId}
            onTranslationIdChange={setTranslationId}
            transliterationEnabled={transliterationEnabled}
            onTransliterationEnabledChange={setTransliterationEnabled}
          />
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-medium uppercase tracking-wide text-muted">
            Audio
          </h2>
          <ReciterSelector value={reciterId} onChange={setReciterId} />
        </section>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/ayahflow/page.js
git commit -m "feat: add game length and focus mode to AyahFlow settings"
```

---

### Task 15: Modify AyahFlow Play Page — Results Tracking, Game Length, Review Screen

**Files:**
- Modify: `src/app/ayahflow/play/page.js`

- [ ] **Step 1: Replace the entire play page**

This is the largest change. Key modifications:
- Track per-question results in a `results` array (verse_key, correct, user_answer, response_ms)
- Read `lengthMode` and `lengthValue` from URL params
- End game when question limit or time limit is reached
- POST results to `/api/sessions` when game ends
- Show ReviewScreen instead of the old "Session Complete" screen
- Track session start time for duration calculation

Replace the entire content of `src/app/ayahflow/play/page.js`:

```jsx
"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchVersesForScope,
  fetchSurahForDistractors,
} from "@/lib/fetch-verses";
import {
  createPromptQueue,
  buildVerseMap,
  buildQuestion,
  getNextVerseKey,
  getPrevVerseKey,
  queueItemKey,
  avoidRepeat,
} from "@/lib/game-engine";
import QuestionCard from "@/components/ayahflow/QuestionCard";
import ChoiceGrid from "@/components/ayahflow/ChoiceGrid";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import HintBar from "@/components/ayahflow/HintBar";
import { endOfVerseNoNumber } from "@/lib/verse-marker";
import AnswerModeToggle from "@/components/ayahflow/AnswerModeToggle";
import TypingInput from "@/components/ayahflow/TypingInput";
import DiffView from "@/components/ayahflow/DiffView";
import { diffWords } from "@/lib/normalize-arabic";
import DisplayOptionsToggle from "@/components/ayahflow/DisplayOptionsToggle";
import ReciterToggle from "@/components/shared/ReciterToggle";
import ReviewScreen from "@/components/ayahflow/ReviewScreen";
import GameTimer from "@/components/ayahflow/GameTimer";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

const NEXT_DELAY_MS = 1200;
const TYPING_WRONG_DELAY_MS = 3000;

function AyahFlowGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const testPrevious = searchParams.get("testPrevious") === "true";
  const initialMode = searchParams.get("mode") ?? "choices";
  const lengthMode = searchParams.get("lengthMode") ?? "unlimited";
  const lengthValue = Number(searchParams.get("lengthValue") ?? "0");

  const translationParam = searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID;
  const transliterationParam = searchParams.get("transliteration") === "on";
  const reciterParam = searchParams.get("reciter") ?? "off";
  const translationId = translationParam === "off" ? DEFAULT_TRANSLATION_ID : translationParam;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verses, setVerses] = useState([]);
  const [boundaryKeys, setBoundaryKeys] = useState([]);
  const [verseMap, setVerseMap] = useState(new Map());
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [phase, setPhase] = useState("next");
  const [showResults, setShowResults] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [surahRevealed, setSurahRevealed] = useState(false);
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
  const [eliminatedKeys, setEliminatedKeys] = useState([]);
  const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);
  const [answerMode, setAnswerMode] = useState(initialMode);
  const [typingDiff, setTypingDiff] = useState(null);
  const [showTranslation, setShowTranslation] = useState(translationParam !== "off");
  const [showTransliteration, setShowTransliteration] = useState(transliterationParam);
  const [reciterId, setReciterId] = useState(reciterParam !== "off" ? reciterParam : null);
  const [timeUp, setTimeUp] = useState(false);

  const surahCacheRef = useRef({});
  const verseMapRef = useRef(new Map());
  const resultsRef = useRef([]);
  const questionStartRef = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());

  // Check QF auth status for review screen sync prompt
  useEffect(() => {
    fetch("/api/auth/quran/status")
      .then((r) => r.json())
      .then((d) => setIsConnected(d.connected))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/ayahflow");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(scopeType, scopeValues, translationId);
        const map = buildVerseMap(result.verses);
        setVerses(result.verses);
        setBoundaryKeys(result.boundaryKeys);
        setVerseMap(map);
        verseMapRef.current = map;

        const queue = createPromptQueue(result.verses, result.boundaryKeys);
        setPromptQueue(queue);
        setPromptIndex(0);
        sessionStartRef.current = Date.now();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getSurahVerses = useCallback(async (chapterId) => {
    if (surahCacheRef.current[chapterId])
      return surahCacheRef.current[chapterId];

    const fetched = await fetchSurahForDistractors(chapterId, translationId);
    surahCacheRef.current[chapterId] = fetched;

    const newMap = new Map(verseMapRef.current);
    for (const v of fetched) {
      if (!newMap.has(v.verseKey)) newMap.set(v.verseKey, v);
    }
    verseMapRef.current = newMap;
    setVerseMap(newMap);

    return fetched;
  }, []);

  const buildQuestionForPrompt = useCallback(async (prompt, dir, allVerses) => {
    const correctVerseKey =
      dir === "next"
        ? getNextVerseKey(prompt.verseKey)
        : getPrevVerseKey(prompt.verseKey);
    const correctVerse = verseMapRef.current.get(correctVerseKey);

    let surahVerses = allVerses.filter(
      (v) => v.chapterId === correctVerse.chapterId,
    );
    if (difficulty !== "easy") {
      surahVerses = await getSurahVerses(correctVerse.chapterId);
    }

    return buildQuestion(
      prompt,
      dir,
      difficulty,
      verseMapRef.current,
      allVerses,
      surahVerses,
    );
  }, [difficulty, getSurahVerses]);

  const lastBuildRef = useRef(null);

  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    const key = `${promptIndex}-${phase}`;
    if (lastBuildRef.current === key) return;
    lastBuildRef.current = key;

    async function build() {
      const prompt = promptQueue[promptIndex];
      const direction = phase === "previous" ? "previous" : "next";
      const q = await buildQuestionForPrompt(prompt, direction, verses);
      setQuestion(q);
      setSurahRevealed(false);
      setEliminatedKeys([]);
      setFiftyFiftyUsedThisRound(false);
      setSelectedKey(null);
      setTypingDiff(null);
      questionStartRef.current = Date.now();
    }

    build();
  }, [promptQueue, promptIndex, phase, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitSession() {
    if (resultsRef.current.length === 0) {
      router.push("/ayahflow");
      return;
    }

    setReviewLoading(true);
    const durationSeconds = Math.round(
      (Date.now() - sessionStartRef.current) / 1000
    );

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "ayahflow",
          settings: {
            scopeType,
            scopeValues,
            difficulty,
            testPrevious,
            answerMode: initialMode,
            lengthMode,
            lengthValue,
          },
          duration_seconds: durationSeconds,
          results: resultsRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviewData(data);
      } else {
        // Fallback: show basic results even if save fails
        setReviewData({
          score_correct: score.correct,
          score_total: score.total,
          duration_seconds: durationSeconds,
          groups: [],
          confidence_delta: null,
        });
      }
    } catch {
      setReviewData({
        score_correct: score.correct,
        score_total: score.total,
        duration_seconds: Math.round(
          (Date.now() - sessionStartRef.current) / 1000
        ),
        groups: [],
        confidence_delta: null,
      });
    } finally {
      setReviewLoading(false);
      setShowResults(true);
    }
  }

  function recordResult(verseKey, correct, userAnswer) {
    const responseMs = Date.now() - questionStartRef.current;
    resultsRef.current.push({
      verse_key: verseKey,
      correct,
      ...(correct ? {} : { user_answer: userAnswer || null }),
      response_ms: responseMs,
    });
  }

  function checkGameEnd() {
    const count = resultsRef.current.length;
    if (lengthMode === "questions" && count >= lengthValue) {
      return true;
    }
    if (timeUp) {
      return true;
    }
    return false;
  }

  function advance() {
    if (checkGameEnd()) {
      submitSession();
      return;
    }

    if (phase === "next" && testPrevious) {
      setPhase("previous");
    } else {
      setPhase("next");
      const nextIdx = promptIndex + 1;
      if (nextIdx >= promptQueue.length) {
        const lastKey = queueItemKey(promptQueue[promptQueue.length - 1]);
        const newQueue = createPromptQueue(verses, boundaryKeys);
        avoidRepeat(newQueue, lastKey);
        setPromptQueue(newQueue);
        setPromptIndex(0);
      } else {
        setPromptIndex(nextIdx);
      }
    }
  }

  function handleSelect(verseKey) {
    if (selectedKey) return;
    setSelectedKey(verseKey);

    const isCorrect = verseKey === question.correctAnswer.verseKey;
    recordResult(
      question.correctAnswer.verseKey,
      isCorrect,
      isCorrect ? null : verseKey
    );
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => {
      advance();
    }, NEXT_DELAY_MS);
  }

  function handleTypedSubmit(typedText) {
    if (selectedKey) return;

    const result = diffWords(typedText, question.correctAnswer.textUthmani);

    if (result.isMatch) {
      setSelectedKey(question.correctAnswer.verseKey);
      recordResult(question.correctAnswer.verseKey, true, null);
      setScore((prev) => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
      }));

      setTimeout(() => {
        advance();
      }, NEXT_DELAY_MS);
    } else {
      setSelectedKey("__wrong__");
      setTypingDiff(result);
      recordResult(question.correctAnswer.verseKey, false, typedText);
      setScore((prev) => ({
        correct: prev.correct,
        total: prev.total + 1,
      }));

      setTimeout(() => {
        setTypingDiff(null);
        advance();
      }, TYPING_WRONG_DELAY_MS);
    }
  }

  function handleEnd() {
    submitSession();
  }

  const handleTimeUp = useCallback(() => {
    setTimeUp(true);
  }, []);

  function handlePlayAgain() {
    setShowResults(false);
    setReviewData(null);
    setScore({ correct: 0, total: 0 });
    setFiftyFiftyRemaining(3);
    setTimeUp(false);
    resultsRef.current = [];
    sessionStartRef.current = Date.now();
    const newQueue = createPromptQueue(verses, boundaryKeys);
    setPromptQueue(newQueue);
    setPromptIndex(0);
    setPhase("next");
  }

  function handleFiftyFifty() {
    if (fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedKey) return;

    const incorrectChoices = question.choices.filter(
      (c) => c.verseKey !== question.correctAnswer.verseKey,
    );
    const shuffled = incorrectChoices.sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, 2).map((c) => c.verseKey);

    setEliminatedKeys(toEliminate);
    setFiftyFiftyUsedThisRound(true);
    setFiftyFiftyRemaining((prev) => prev - 1);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          <p className="mt-4 text-sm text-muted">Loading verses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gold-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-400">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (reviewLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          <p className="mt-4 text-sm text-muted">Saving session...</p>
        </div>
      </div>
    );
  }

  if (showResults && reviewData) {
    return (
      <ReviewScreen
        data={reviewData}
        isConnected={isConnected}
        onPlayAgain={handlePlayAgain}
        onNewSettings={() => router.push("/ayahflow")}
      />
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex h-dvh max-w-[680px] flex-col px-5">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <BackButton />
        <button
          onClick={handleEnd}
          className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm text-emerald-700 transition-colors hover:bg-emerald-50">
          End
        </button>
      </div>

      {/* Question zone */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto py-4">
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <ScoreCounter correct={score.correct} total={score.total} />
            {lengthMode === "time" && (
              <GameTimer minutes={lengthValue} onTimeUp={handleTimeUp} />
            )}
          </div>
          <QuestionCard
            verse={question.prompt}
            direction={question.direction}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
            reciterId={reciterId}
          />
          <div>
            <HintBar
              ayahNumber={question.prompt.verseNumber}
              chapterId={question.prompt.chapterId}
              surahRevealed={surahRevealed}
              onToggleSurah={() => setSurahRevealed(true)}
              fiftyFiftyRemaining={fiftyFiftyRemaining}
              fiftyFiftyDisabled={fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedKey !== null}
              fiftyFiftyHidden={answerMode === "type"}
              onFiftyFifty={handleFiftyFifty}
            />
          </div>
          <div className="flex items-center justify-between">
            {reciterId ? (
              <ReciterToggle value={reciterId} onChange={setReciterId} />
            ) : (
              <div />
            )}
            <DisplayOptionsToggle
              translationEnabled={showTranslation}
              onTranslationToggle={() => setShowTranslation((prev) => !prev)}
              transliterationEnabled={showTransliteration}
              onTransliterationToggle={() => setShowTransliteration((prev) => !prev)}
            />
          </div>
        </div>
      </div>

      {/* Answer zone */}
      <div className="border-t border-border bg-surface py-3">
        <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
        <div className="mt-3">
          {answerMode === "choices" ? (
            <ChoiceGrid
              choices={question.choices}
              correctKey={question.correctAnswer.verseKey}
              selectedKey={selectedKey}
              onSelect={handleSelect}
              eliminatedKeys={eliminatedKeys}
              showTranslation={showTranslation}
              showTransliteration={showTransliteration}
            />
          ) : typingDiff ? (
            <DiffView diff={typingDiff} />
          ) : selectedKey ? (
            <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 text-center">
              <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed text-emerald-700">
                {question.correctAnswer.textUthmani}{endOfVerseNoNumber()}
              </p>
              <p className="mt-2 text-sm text-emerald-400">Correct!</p>
            </div>
          ) : (
            <TypingInput onSubmit={handleTypedSubmit} disabled={selectedKey !== null} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AyahFlowGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
        </div>
      }>
      <AyahFlowGameInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run: `npx next build 2>&1 | tail -10`
Expected: Clean build with all routes listed.

- [ ] **Step 3: Commit**

```bash
git add src/app/ayahflow/play/page.js
git commit -m "feat: add per-question tracking, game length limits, and review screen to AyahFlow"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Supabase schema migration (4 tables) |
| 2 | User identity helper (get-or-create from cookie) |
| 3 | Confidence formula module |
| 4 | Juz mapping + surah names |
| 5 | GET /api/user route |
| 6 | POST /api/sessions route (save + confidence update + grouped response) |
| 7 | GET /api/confidence route (weakness ranking) |
| 8 | Modify OAuth callback for user linking |
| 9 | Update header text for anonymous users |
| 10 | ReviewScreen component (expandable juz/surah/ayah hierarchy) |
| 11 | GameLengthSelector component (questions/time/unlimited) |
| 12 | GameTimer countdown component |
| 13 | Focus Mode components (ScopeModeToggle + FocusModeSelector) |
| 14 | Modify AyahFlow settings page |
| 15 | Modify AyahFlow play page (tracking, limits, review) |
