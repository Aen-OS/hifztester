# AyahFlow — Design Spec

## Overview

AyahFlow is a Quran memorization game within Rabt, a web app for Quran memorization tools. The user is shown a Quran ayah and must identify the next ayah from four multiple-choice options. An optional toggle adds a "previous ayah" question for the same prompt. Text is displayed in Uthmani script with Sahih International English translation.

## User Flow

### 1. Landing Page (`/`)

- Rabt branding and tagline
- Grid of game cards — only AyahFlow for MVP, designed to accommodate more games later
- Each card shows game name, brief description, and links to its setup page

### 2. AyahFlow Setup (`/ayahflow`)

The user configures three settings before starting:

**Scope selector** — tabs to switch between scope types:

| Scope type | Selection method | SDK call |
|---|---|---|
| Surah | Multi-select dropdown (1–114) | `client.verses.findByChapter()` per surah |
| Juz | Multi-select dropdown (1–30) | `client.verses.findByJuz()` per juz |
| Page | Individual picks or numeric range | `client.verses.findByPage()` per page |
| Hizb | Multi-select dropdown or range (1–60) | `client.verses.findByHizb()` per hizb |

**Difficulty selector** — three tiers:

| Difficulty | Distractor sourcing |
|---|---|
| Easy | Random ayahs from anywhere in the fetched scope |
| Medium | Same surah as the correct answer, >6 positions away |
| Hard | Same surah as the correct answer, within 5 positions |

**Previous ayah toggle** — off by default. When on, each round has two questions for the same prompt ayah: "What comes next?" then "What came before?"

**Start button** — triggers verse fetching and navigates to the game screen.

### 3. AyahFlow Game (`/ayahflow/play`)

Each round:

1. Display the prompt ayah (Uthmani + English translation)
2. Show "What comes next?" with 4 shuffled choices
3. User picks → immediate correct/incorrect highlight → brief pause
4. If previous-ayah toggle is on: show "What came before?" with 4 new shuffled choices for the same prompt → same feedback flow
5. Advance to next round

Session counter visible throughout (e.g., "7/12 correct"). "End" button shows a brief results summary (final score, accuracy percentage) with options to play again (same settings) or return to setup.

**Session length:** The game runs indefinitely — there is no fixed round count. The counter shows `correct/total` and increments with each question answered. The user ends the session when they choose.

**Prompt selection:** Sampling without replacement. The engine shuffles the eligible prompt ayahs at the start and cycles through them. Once all have been used, the pool is reshuffled for a new cycle. No ayah repeats until the full pool is exhausted.

## Architecture

### Data Flow

```
Setup screen
  → User selects scope + difficulty + direction toggle
  → Hits "Start"
  → Server Action fetches all verses for scope (parallel Promise.all calls)
  → Returns verse array to client

Game screen (all client-side)
  → game-engine picks prompt ayah (shuffled, no-replacement cycle)
  → Determines correct answer(s) — next ayah, and previous if toggled
  → Generates 3 distractors per question based on difficulty
  → Shuffles 4 choices per question
  → Renders prompt + choices
  → User answers → feedback → next round
```

### Fetching Strategy

- All scope selections call the per-unit SDK method in parallel via `Promise.all`
- Each call requests `fields: { textUthmani: true }` and `translations: ['131']` (Sahih International)
- Results are merged into a single verse array and passed to the client
- **Pagination:** If the SDK returns paginated results, the Server Action must loop through all pages (incrementing `page` param) until all verses are collected. Use `perPage: 50` (API max) to minimize round-trips.
- **Loading state:** Show a loading spinner with "Loading verses..." during the bulk fetch. If the fetch fails (network error, API down), show an error message with a retry button.

### Verse Data Contract

Each verse passed to the client has this shape:

```js
{
  id: number,              // unique verse ID
  verseKey: string,        // "chapter:verse" e.g. "2:255"
  chapterId: number,       // surah number (1–114)
  verseNumber: number,     // ayah number within surah
  textUthmani: string,     // Uthmani script text
  translation: string,     // Sahih International English text
  juzNumber: number,       // for scope metadata
  hizbNumber: number,      // for scope metadata
  pageNumber: number       // for scope metadata
}
```

### Correct Answers & Scope Boundaries

The correct "next" or "previous" ayah may fall outside the user's selected scope. For example, if the user selects only Surah 2, the last ayah (2:286) has its "next" as 3:1.

**Rule:** The correct answer is always the actual next/previous ayah in Quran order (circular), regardless of scope. If it's not in the fetched pool, the Server Action for fetching the scope also fetches one ayah beyond each boundary:

- For each contiguous block of fetched verses, also fetch the ayah immediately after the last verse and the ayah immediately before the first verse
- These "boundary ayahs" are included in the verse pool but are never selected as prompt ayahs — they only serve as correct answers or distractors

This avoids mid-game on-demand fetches for correct answers.

### Distractor Sourcing & The Loop Rule

The Quran is treated as circular for game logic:

- The last ayah of Surah 114 wraps to the first ayah of Surah 1
- If a prompt ayah is the last in its surah, "next" is the first ayah of the following surah
- If a prompt ayah is the first in its surah, "previous" is the last ayah of the preceding surah

**On-demand surah fetch for distractors:** When Medium or Hard difficulty requires same-surah ayahs not present in the fetched scope, the game engine requests them via a Server Action (`findByChapter`). Results are cached in client state so each surah is only fetched once per session.

**Short surah fallback:** If a surah has too few ayahs to fill 3 distractors for the required difficulty tier (e.g., Surah 108 has only 3 ayahs), fill as many as possible from the required tier, then fill remaining slots from the next easier tier. Hard → Medium → Easy.

Distractor constraints:
- Never duplicate the correct answer
- Never duplicate each other
- Always exactly 3 distractors + 1 correct answer = 4 choices

### File Structure

```
src/
  app/
    page.js                      → Landing page (game selector grid)
    ayahflow/
      page.js                    → AyahFlow setup screen
      play/
        page.js                  → AyahFlow game screen
  components/
    GameCard.jsx                 → Game card for landing page
    ayahflow/
      ScopeSelector.jsx          → Scope type tabs + multi-select/range UI
      DifficultySelector.jsx     → Easy/Medium/Hard picker
      DirectionToggle.jsx        → Previous ayah toggle
      QuestionCard.jsx           → Displays prompt ayah text
      ChoiceCard.jsx             → Single answer choice with feedback states
      ChoiceGrid.jsx             → Renders 4 ChoiceCards
      ScoreCounter.jsx           → Session score display
  lib/
    quran-client.js              → Server-side QuranClient instance
    fetch-verses.js              → Server Actions for fetching verses by scope
    game-engine.js               → Client-side: question generation, distractor logic, shuffle
```

Note: `game-engine.js` runs client-side despite being in `lib/`. It contains no server dependencies — only pure functions operating on the verse array.

### Tech Stack

- **Framework**: Next.js 16.2.1 (App Router)
- **React**: 19.2.4
- **Styling**: Tailwind CSS 4
- **API client**: @quranjs/api 2.1.0 (server-side only, used in Server Actions)
- **Arabic font**: Scheherazade New (loaded via Google Fonts)
- **Auth**: None (MVP)
- **Persistence**: None (MVP)

## Design Direction

Minimal and clean, inspired by quran.foundation:
- Light background, generous whitespace
- Arabic text displayed prominently in Uthmani script using a dedicated Arabic font
- English translation in smaller, secondary text
- Correct/incorrect feedback via color highlights (green/red)
- Responsive for mobile and desktop

## Out of Scope (MVP)

- Audio playback
- User accounts / authentication
- Score persistence / progress tracking
- Range selection for Surah and Juz scope types
- Leaderboards or social features
