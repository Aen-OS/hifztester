# SurahSense — Design Spec

## Overview

SurahSense is a surah identification game. The player is shown a clue — a mushaf page, a single ayah, a group of ayaat, or a surah summary — and must guess which surah it belongs to. Four clue modes provide natural difficulty progression, with configurable distractor difficulty on top.

## Setup Page (`/surahsense`)

- **Scope selector**: Reuses existing ScopeSelector component with an added "All Surahs" option at the top. When "All Surahs" is selected, all 114 surahs are in play.
- **Mode selector**: Five options — Page, Single Ayah, Group of Ayaat, Summary, Mixed. Mixed randomly cycles through all four clue types each round.
- **Difficulty selector**: Reuses existing DifficultySelector. Affects distractor selection and ayah group size.
- **Answer mode**: Reuses AnswerModeSelector from AyahFlow — Choices or Type It.
- All selections passed as query params to `/surahsense/play`.

## Game Modes

### Page Mode
- Fetch all verses on a random mushaf page using the verses-by-page API endpoint.
- Display in a mushaf-style frame: parchment background (`#f5f0e0`), decorative double border, inner frame with lighter background (`#faf8f0`).
- Page number displayed **below** the text in a circled badge.
- If the page spans two surahs, the correct answer is chosen randomly from one of them.

### Single Ayah Mode
- Show one random ayah from the correct surah.
- Display Arabic text (Uthmani script) and English translation.
- No verse key shown (it would reveal the surah).

### Group of Ayaat Mode
- Show consecutive ayahs from the correct surah.
- Ayah count scales with difficulty: Easy = 5, Medium = 3, Hard = 2.
- Display Arabic text and English translations.
- No verse keys shown.

### Summary Mode
- Fetch chapter info from the API (summary text, revelation type, verse count).
- Initially show only the English summary text.
- Progressive hint reveals (each tap reveals the next hint):
  1. First reveal: Revelation type (Meccan / Medinan)
  2. Second reveal: Number of verses
- No surah name shown anywhere.

### Mixed Mode
- Each round randomly selects one of the four clue modes.
- All other rules for that mode apply as normal.

## Answer Mechanics

### Choices Mode
- Show 4 surah names as buttons in a 2x2 grid.
- Distractor selection based on difficulty:
  - **Easy**: Random surahs from the selected scope.
  - **Medium**: Surahs from the same juz as the correct surah.
  - **Hard**: Surahs with the same revelation type (Meccan/Medinan) AND similar verse count (within ±20 verses).
- On selection: highlight correct/incorrect, show correct surah name + number, 1200ms delay before advancing.

### Type It Mode
- Text input for English transliteration of the surah name.
- Validated with **case-insensitive matching** against the surah's transliterated name from `SURAH_NAMES`.
- On wrong answer: show the correct surah name + number. 2000ms delay before advancing.
- On correct answer: green highlight with surah name, 1200ms delay.

### Scoring
- Shared correct/total counter across all modes (same as AyahFlow pattern).
- Score not reset when toggling answer mode mid-game.

### Hints
- Summary mode has built-in progressive hints (no cost).
- No 50/50 hint (surah names are the choices — eliminating 2 of 3 distractors is too strong).
- No surah reveal hint (that would be the answer itself).

## Data Fetching

### New: `src/lib/fetch-chapters.js` (server action)
- `fetchChapterInfo(chapterId)` — Returns chapter summary, revelation type, verse count via `@quranjs/api`.
- `fetchAllChaptersInfo()` — Fetches metadata for all 114 chapters (for distractor selection and summary mode). Cached after first call.
- `fetchVersesForPage(pageNumber)` — Fetches all verses on a specific mushaf page.

### New: `src/lib/surahsense-engine.js` (client-side)
- `createSurahPromptQueue(surahs)` — Shuffles surahs into a prompt queue.
- `buildSurahQuestion(surah, mode, difficulty, allSurahs, scopeSurahs)` — Picks clue data and generates distractor surah names.
- `generateSurahDistractors(correctSurah, difficulty, allSurahs, scopeSurahs)` — Easy: random from scope. Medium: same juz. Hard: same revelation type + similar verse count.
- `matchSurahName(typed, correctName)` — Case-insensitive comparison for typing mode.

### Reused from AyahFlow
- `fetchVersesForScope()` — For fetching ayahs in Single Ayah and Group of Ayaat modes.
- `ScopeSelector`, `DifficultySelector`, `AnswerModeSelector`, `AnswerModeToggle`, `ScoreCounter`, `BackButton`.

## Data Flow

1. Setup page: user selects scope, mode, difficulty, answer mode.
2. Game page loads: fetch chapter metadata for all surahs in scope + fetch verses for scope.
3. Build prompt queue: shuffle eligible surahs.
4. Each round:
   - Pick next surah from queue.
   - Based on mode (or random mode if Mixed), generate the clue:
     - Page: pick a random page that contains verses from this surah, fetch page verses.
     - Single Ayah: pick a random verse from this surah.
     - Group of Ayaat: pick a random starting point, take N consecutive verses (N depends on difficulty).
     - Summary: use pre-fetched chapter info.
   - Generate 3 distractor surah names based on difficulty.
   - Display clue + answer options.
5. User answers → score → 1200ms/2000ms delay → next round.
6. End session → show results screen (same pattern as AyahFlow).

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MushafPage` | `src/components/surahsense/` | Mushaf-style frame with parchment bg, decorative borders, page number below |
| `AyahClue` | `src/components/surahsense/` | Single ayah or group of ayaat display (Arabic + translation, no verse keys) |
| `SummaryClue` | `src/components/surahsense/` | Chapter summary with progressive hint reveal buttons |
| `SurahChoiceGrid` | `src/components/surahsense/` | 2x2 grid of surah name buttons with correct/incorrect states |
| `SurahTypingInput` | `src/components/surahsense/` | English text input for typing surah name |
| `ModeSelector` | `src/components/surahsense/` | Setup page — 5 buttons: Page, Ayah, Ayaat, Summary, Mixed |

## New Route Files

| File | Purpose |
|------|---------|
| `src/app/surahsense/page.js` | Setup page |
| `src/app/surahsense/play/page.js` | Game page |

## Modified Files

| File | Changes |
|------|---------|
| `src/app/page.js` | Add second GameCard for SurahSense |
| `src/components/ayahflow/ScopeSelector.jsx` | Add "All Surahs" button above the existing scope type tabs. When clicked, sets scope to `{ type: "surah", values: [1..114] }`. |

## Unchanged

- All AyahFlow game files — no modifications.
- `game-engine.js` — SurahSense has its own engine.
- `normalize-arabic.js` — Not needed (typing mode uses English surah names).
