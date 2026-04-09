# Review Screen & Metrics for All Games — Design Spec

**Goal:** Extend the review screen, per-question result tracking, game length controls, and focus mode that were built for AyahFlow to the remaining four games: SurahSense, ManaMatch, TartibBlock, and KalamQuest.

**Prerequisite:** The AyahFlow review implementation is already complete. The data model (Supabase tables), API routes (`/api/sessions`, `/api/confidence`, `/api/user`), shared components (`ReviewScreen`, `GameLengthSelector`, `GameTimer`, `ScopeModeToggle`, `FocusModeSelector`), and utility modules (`user-identity.js`, `confidence.js`, `juz-mapping.js`) are all in place and game-agnostic.

**Approach:** Each game's play page needs the same pattern applied: track per-question results in a `resultsRef`, record timing, POST to `/api/sessions` at game end, and render `ReviewScreen` with the response. Settings pages gain the `GameLengthSelector` and `ScopeModeToggle`/`FocusModeSelector`. The shared components and API need zero changes.

---

## Important: How Review Metrics Differ Per Game

Before implementing, the brainstorm/design phase for this spec MUST explore how each game's review metrics should differ. The current `question_results` schema stores `verse_key`, `correct`, `user_answer`, and `response_ms` — this works cleanly for AyahFlow (one verse per question, binary correct/incorrect). But the other games have fundamentally different question structures:

### SurahSense
- **What's tested:** Surah identification (not individual ayahs)
- **Verse key question:** The `verse_key` field doesn't map neatly here. A SurahSense question tests knowledge of an entire surah, prompted by a page, ayah(s), or summary. Should `verse_key` store the surah ID (e.g. `"2"`) or a representative ayah? Or should there be a `surah_id` field?
- **Confidence granularity:** Should confidence be tracked per-surah rather than per-ayah? A user who can identify Al-Baqarah from any clue type has surah-level confidence, not ayah-level.
- **Clue type as a dimension:** Performance may vary dramatically by clue type (page layout vs. single ayah vs. summary). Should the review screen break down accuracy by clue type? Should confidence track this?
- **User answer:** The wrong answer is a surah ID, not a verse key.

### ManaMatch
- **What's tested:** Arabic-to-translation matching for a specific ayah
- **Verse key:** Maps cleanly — each question tests one verse.
- **Confidence interaction:** This tests translation comprehension, not sequential recall (which AyahFlow tests). Should ManaMatch confidence be tracked separately from AyahFlow confidence, or do they feed the same `verse_confidence` row? A user might know the meaning perfectly but not the sequence.
- **Consider:** Should the review screen show the translation alongside wrong answers so users can study what they confused?

### KalamQuest
- **What's tested:** Fill-in-the-blank (word level) OR missing-ayah (ayah level), depending on mode
- **Verse key:** The ayah mode maps cleanly. But word-blank mode tests recall of specific words within an ayah — the granularity is finer than verse-level.
- **User answer for word mode:** The wrong answer is a word/phrase, not a verse key. The `user_answer` field needs to handle this.
- **Mixed mode tracking:** A single session can mix ayah-mode and word-mode questions. Should the review screen separate these? Should they contribute differently to confidence?
- **Surah/page mode:** Similar to AyahFlow — tests knowledge of which ayah goes where in a sequence.

### TartibBlock
- **What's tested:** Ordering (words within an ayah, ayahs within a surah, or ayahs on a page)
- **Scoring is non-binary:** Unlike other games, TartibBlock scores per-block (e.g. "4/6 blocks correct"). The current `correct: boolean` field doesn't capture partial correctness.
- **Consider:** Should each block position be a separate `question_results` row? Or should `correct` be reinterpreted as a ratio? Or add a `score` float field?
- **Verse key ambiguity:** In word-ordering mode, `verse_key` is the ayah being reordered. In surah/page mode, the "question" spans multiple ayahs — which verse key(s) get stored?
- **Confidence:** Word ordering within an ayah tests a very different skill than knowing ayah sequence. Should these be separate confidence dimensions?

### Design Questions to Resolve

1. **Single vs. multi-dimensional confidence:** Should `verse_confidence` remain a single number per verse, or should it have per-game or per-skill dimensions (e.g., sequence recall, translation, word recall)?
2. **Schema extensions:** Does `question_results` need new fields (`surah_id`, `mode`, `partial_score`) or is the current schema sufficient with creative use of existing fields?
3. **Review screen grouping:** AyahFlow groups by juz → surah → ayah. SurahSense would group by surah directly. TartibBlock might group by mode (word/surah/page). Should each game define its own grouping strategy?
4. **Cross-game focus mode:** When Focus Mode ranks weak areas, should it aggregate confidence across all games, or let users filter by game?

These questions should be answered during the brainstorm phase before writing the implementation plan.

---

## 1. Per-Game Changes

### SurahSense

**Settings page (`src/app/surahsense/page.js`):**
- Add `ScopeModeToggle` + `FocusModeSelector` above existing scope selector
- Add `GameLengthSelector` section
- Pass `lengthMode` and `lengthValue` as URL params

**Play page (`src/app/surahsense/play/page.js`):**
- Add `resultsRef`, `questionStartRef`, `sessionStartRef` refs
- Add `reviewData`, `reviewLoading`, `isConnected`, `timeUp` state
- Add `lengthMode`/`lengthValue` from search params
- On each answer (`handleSelect` / `handleTypedSubmit`): call `recordResult()` with the surah-level verse key and timing
- Replace `handleEnd` → `setShowResults(true)` with `submitSession()` that POSTs to `/api/sessions`
- Replace inline "Session Complete" block with `<ReviewScreen />`
- Add `<GameTimer />` when `lengthMode === "time"`
- Add `handlePlayAgain` that resets `resultsRef`, `sessionStartRef`, `timeUp`
- Check QF auth status on mount for `isConnected`

### ManaMatch

**Settings page (`src/app/manamatch/page.js`):**
- Add `ScopeModeToggle` + `FocusModeSelector`
- Add `GameLengthSelector`
- Pass length params through URL

**Play page (`src/app/manamatch/play/page.js`):**
- Same pattern as SurahSense: add refs, state, `recordResult`, `submitSession`, `ReviewScreen`, `GameTimer`
- `recordResult` maps cleanly — each question has a single verse key

### KalamQuest

**Settings page (`src/app/kalamquest/page.js`):**
- Add `ScopeModeToggle` + `FocusModeSelector`
- Add `GameLengthSelector`
- Pass length params through URL

**Play page (`src/app/kalamquest/play/page.js`):**
- Add refs, state, and `submitSession`/`ReviewScreen`/`GameTimer` pattern
- `recordResult` in word-blank mode: use the ayah's `verse_key`, store the user's wrong word answer in `user_answer`
- `recordResult` in surah/page mode: use the gap verse's `verse_key`, store wrong ayah's verse key in `user_answer`
- Both modes feed the same `resultsRef` array

### TartibBlock

**Settings page (`src/app/tartiblock/page.js`):**
- Add `ScopeModeToggle` + `FocusModeSelector`
- Add `GameLengthSelector`
- Pass length params through URL

**Play page (`src/app/tartiblock/play/page.js`):**
- Add refs, state, and `submitSession`/`ReviewScreen`/`GameTimer` pattern
- **Scoring nuance:** TartibBlock uses `scoreArrangement()` which returns per-block results. For `recordResult`, record one result per block: each block's verse key (or the parent ayah's verse key for word-mode), `correct` = `isCorrect` for that block position. This preserves per-block granularity in `question_results`.
- Alternative (simpler): Record one result per round with `correct = true` only if all blocks are correct. The user's arrangement could be stored as a JSON string in `user_answer`. **Decide during brainstorm.**

---

## 2. Shared Infrastructure — No Changes Needed

These are already game-agnostic and work for all games without modification:

- `POST /api/sessions` — accepts any `game` string, stores results
- `GET /api/confidence` — groups by juz/surah regardless of game
- `GET /api/user` — game-independent
- `ReviewScreen` component — renders from `/api/sessions` response format
- `GameLengthSelector` — game-independent
- `GameTimer` — game-independent
- `ScopeModeToggle` + `FocusModeSelector` — game-independent
- `confidence.js` — game-independent formula
- `user-identity.js` — game-independent

---

## 3. Implementation Pattern (Repeated Per Game)

Each game follows the exact same integration pattern. For each game:

### Settings page additions:
1. Import `GameLengthSelector`, `ScopeModeToggle`, `FocusModeSelector`
2. Add `scopeMode`, `focusScope`, `gameLength` state
3. Add sections to JSX (scope toggle, focus mode, game length)
4. Update `handleStart` to pass `lengthMode`/`lengthValue` + handle focus scope

### Play page additions:
1. Import `ReviewScreen`, `GameTimer`
2. Add state: `reviewData`, `reviewLoading`, `isConnected`, `timeUp`
3. Add refs: `resultsRef`, `questionStartRef`, `sessionStartRef`
4. Read `lengthMode`/`lengthValue` from search params
5. Add `useEffect` to check QF auth status
6. Set `sessionStartRef` after initial load
7. Reset `questionStartRef` at start of each new question
8. Add `recordResult(verseKey, correct, userAnswer)` function
9. Call `recordResult` in every answer handler
10. Add `checkGameEnd()` and call it in `advance()`
11. Add `submitSession()` that POSTs to `/api/sessions`
12. Replace `handleEnd` body with `submitSession()` call
13. Replace inline results screen with `<ReviewScreen />`
14. Add `handlePlayAgain` that resets all tracking state
15. Add `<GameTimer />` in score area when time mode active
16. Add `reviewLoading` spinner state

---

## 4. Verification

After each game is integrated:
1. `npx next build` passes
2. Play a session with question limit → review screen appears with grouped results
3. Play a session with time limit → timer shows, review appears after time up
4. Play unlimited → "End" button triggers review
5. Focus Mode loads confidence data (or shows "not enough data" for new users)
6. "Play Again" resets cleanly and starts a new session
7. Check Supabase tables: `game_sessions` and `question_results` rows appear with correct `game` field
