# Review Screen, Performance Metrics & Focus Mode — Design Spec

**Goal:** Add post-game review screens with per-ayah performance tracking, spaced-repetition confidence scoring, weakness-based scope selection, and configurable game length. Data persists in Supabase, tied to an anonymous user identity that can optionally link to a Quran.com account for cross-device sync.

**Scope:** Data model and API routes are game-agnostic from the start. UI changes are AyahFlow-only for this phase — other games connect to the same infrastructure later.

---

## 1. Data Model (Supabase)

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Auto-generated internal ID |
| `anon_token` | text (unique) | Random token stored in `itqaan_uid` cookie |
| `qf_sub` | text (unique, nullable) | Quran.com user ID from OAuth `id_token` `sub` claim |
| `created_at` | timestamptz | |

### `game_sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | |
| `game` | text | `ayahflow`, `kalamquest`, `surahsense`, `tartiblock`, `manamatch` |
| `settings` | jsonb | Snapshot of game config (difficulty, mode, direction, scope, etc.) |
| `score_correct` | int | |
| `score_total` | int | |
| `duration_seconds` | int | Wall clock time of session |
| `created_at` | timestamptz | |

### `question_results`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `session_id` | uuid (FK → game_sessions) | |
| `user_id` | uuid (FK → users) | Denormalized for faster queries |
| `game` | text | Denormalized |
| `verse_key` | text | e.g. `2:255` — the ayah being tested |
| `correct` | boolean | |
| `user_answer` | text (nullable) | Verse key the user chose (only stored on incorrect answers) |
| `response_ms` | int | Time to answer in milliseconds |
| `created_at` | timestamptz | |

### `verse_confidence`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid (FK → users) | |
| `verse_key` | text | |
| `confidence` | float | 0.0 to 1.0. Decays over time. |
| `last_tested_at` | timestamptz | Used for time-based decay calculation |
| `times_tested` | int | Total encounters |
| `times_correct` | int | Total correct |
| PK | `(user_id, verse_key)` | Composite primary key |

### Confidence formula

- **On correct answer:** `confidence = min(1.0, confidence + 0.15)`
- **On incorrect answer:** `confidence = max(0.0, confidence - 0.25)`
- **Time decay (applied on read):** `effective_confidence = confidence * 0.97^(days_since_last_tested)`
  - Untested ayahs lose ~20% confidence per week, drifting toward "weak"
- **New ayah (first encounter):** starts at 0.15 if correct, 0.0 if incorrect

---

## 2. Anonymous User Identity & Quran.com Linking

### First visit

1. First API call checks for `itqaan_uid` cookie
2. If missing: generate UUID, create `users` row with `anon_token = UUID`, set cookie (1-year expiry, httpOnly, sameSite lax)
3. All API calls identify the user by this cookie

### Connecting Quran.com

1. User completes existing OAuth flow
2. In `/api/auth/quran/callback`, after storing QF tokens: decode `id_token` to extract `sub`
3. Look up user by `itqaan_uid` cookie → set `qf_sub = sub` on that row
4. All anonymous history is preserved under the same user

### Cross-device merge

1. New device, no `itqaan_uid` cookie
2. User connects Quran.com → get `sub`
3. Look up `users` by `qf_sub` → found: set `itqaan_uid` cookie to that user's `anon_token`
4. User now sees all cross-device history

### Disconnecting

1. Clear QF tokens (existing logout flow)
2. Set `qf_sub = null` on user row
3. `itqaan_uid` cookie remains — user keeps local access to data

### Header prompt

For anonymous (non-QF-connected) users, the header text changes from "Connect Quran.com" to **"Connect Quran.com to sync your progress across devices"**.

---

## 3. API Routes

### `GET /api/user`

- Reads `itqaan_uid` cookie
- If found: look up user, return `{ user_id }`
- If missing: create user, set cookie, return `{ user_id }`

### `POST /api/sessions`

Request body:
```json
{
  "game": "ayahflow",
  "settings": { "difficulty": "hard", "direction": "next", "answerMode": "choices" },
  "duration_seconds": 272,
  "results": [
    { "verse_key": "2:142", "correct": true, "response_ms": 3200 },
    { "verse_key": "2:144", "correct": false, "user_answer": "2:146", "response_ms": 8100 }
  ]
}
```

Server-side:
1. Identify user from `itqaan_uid` cookie
2. Insert `game_sessions` row
3. Bulk insert `question_results` rows
4. Update `verse_confidence` for each tested ayah (upsert with confidence adjustment)
5. Return session summary for review screen display:
```json
{
  "session_id": "uuid",
  "score_correct": 18,
  "score_total": 20,
  "duration_seconds": 272,
  "groups": [
    {
      "juz": 1,
      "surahs": [
        {
          "surah": 2,
          "surah_name": "Al-Baqarah",
          "correct": 12,
          "total": 13,
          "results": [
            { "verse_key": "2:142", "correct": true, "response_ms": 3200 },
            { "verse_key": "2:144", "correct": false, "response_ms": 8100, "user_answer": "2:146" }
          ]
        }
      ]
    }
  ],
  "confidence_delta": { "strengthened": 18, "weakened": 2 }
}
```
The `groups` array adapts: multi-juz sessions include juz grouping, single-juz sessions omit it and return surahs directly. The `user_answer` field is only present on incorrect results.

### `GET /api/confidence`

Query params: `?group_by=juz` or `?group_by=surah`

Returns confidence scores grouped and ranked by weakness:
```json
{
  "items": [
    { "juz": 2, "avg_confidence": 0.43, "verses_tested": 84 },
    { "juz": 5, "avg_confidence": 0.58, "verses_tested": 62 }
  ]
}
```

Applies time decay on read. Only includes juz/surahs the user has practiced.

---

## 4. Post-Game Review Screen

Replaces the current "Session Complete" screen. Shown after every game ends.

### Layout (top to bottom)

1. **Score + time** — `18/20` with percentage and duration
2. **Performance breakdown** — grouped hierarchy that adapts to scope:
   - Multi-juz scope → Juz → Surah → Ayah
   - Single juz or multi-surah → Surah → Ayah
   - Single surah → Ayah list directly
3. **Surah/Juz bars** — accuracy percentage with color-coded progress bar:
   - Green: ≥90%
   - Amber: ≥70%
   - Red: <70%
4. **Expandable ayah list** — within each surah, wrong answers highlighted in red with what the user actually chose. Correct answers shown with checkmark. Long lists collapse with "+ N more correct".
5. **Confidence summary** — "Strengthened: 18 ayahs ↑" / "Needs work: 2 ayahs ↓"
6. **Sync prompt** (anonymous users only) — green banner: "Connect Quran.com to sync your progress across devices"
7. **Action buttons** — "Play Again" and "New Settings" (same as today)

### Data source

The review screen renders from the `/api/sessions` POST response, which returns the full session data including per-surah/juz grouping and confidence deltas.

---

## 5. Settings Screen — Game Length

New section on the settings page, below existing options.

### Question count mode (default)

- Preset buttons: 10, 20, 30, 50
- Checkbox: "Unlimited" (preserves current behavior — end manually)
- Default: 20 questions

### Time mode

- Preset buttons: 5m, 10m, 15m, 20m
- When timer expires mid-question, user finishes that question, then review screen appears
- Timer displayed during gameplay as small countdown in the score area

### Toggle

Tab-style toggle between "By Questions" and "By Time" at the top of the section.

---

## 6. Settings Screen — Focus on Weak Areas

New toggle at the top of the scope selection area, switching between "Manual" and "Focus Mode."

### Manual mode

Existing scope selector (surah/juz/page/hizb tabs) — unchanged.

### Focus Mode

#### One-tap automatic

"Practice Weakest Areas" button — auto-selects the lowest confidence ayahs across all practiced material. System determines scope entirely.

#### Guided selection

- Granularity toggle: "By Juz" / "By Surah"
- Ranked list of juz or surahs sorted by lowest average confidence
- Each item shows confidence percentage, color-coded (red <50%, amber 50-75%, green >75%)
- User can select/deselect items to override the auto-selection
- Only juz/surahs the user has practiced appear

#### New user state

If user has no session history: Focus Mode shows "Not enough data yet — play a few sessions to unlock Focus Mode." Manual mode remains available.

---

## 7. Game-Ending Behavior

Three ways a game ends:

### Question limit reached

After the Nth answer, show normal feedback delay, then transition to review screen.

### Time limit reached

Let user finish current question when timer expires. Show feedback, then transition to review screen. Timer visible during gameplay.

### Manual end (unlimited or early exit)

User taps "End Session." If ≥1 question answered: show review screen. If 0: navigate to settings.

### Session persistence

POST to `/api/sessions` happens at transition to review screen in all three cases.

### Play Again

Resets score and results array, generates new prompt queue, keeps same game length setting. Previous session is already saved.

---

## 8. Quran.com Callback Modification

In `/api/auth/quran/callback`, after storing tokens, add user linking:

1. Decode `id_token` JWT to extract `sub` claim
2. Read `itqaan_uid` cookie
3. If user exists by cookie: set `qf_sub = sub`
4. If no cookie but user exists by `qf_sub`: set cookie to that user's `anon_token`
5. If neither: create new user with both fields

---

## 9. What This Spec Does NOT Cover

- Review screens for games other than AyahFlow (future work — same infrastructure)
- Supabase Row Level Security policies (will be defined during implementation)
- Migration path if confidence formula needs tuning (can adjust coefficients without schema change)
- Detailed error states for API failures during session save
