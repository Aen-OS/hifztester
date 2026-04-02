# KalamQuest — Design Spec

## Overview

KalamQuest is a Quran memorization game where users fill in missing content — blanked words within an ayah, a missing ayah within a surah, or a missing ayah on a mushaf page. It tests recall by presenting familiar passages with gaps.

## Game Modes

### 1. Complete the Ayah
- A single ayah is displayed with some words blanked out
- User fills in the missing words
- Difficulty scales the number of blanked words:
  - Easy: ~20% of words (1-2 words)
  - Medium: ~40% of words (3-4 words)
  - Hard: ~60%+ of words (5+ words)
- Blanked positions are chosen randomly, preferring non-adjacent positions to preserve reading flow

### 2. Complete the Surah
- A surah is displayed with one ayah replaced by a blank
- User identifies/provides the missing ayah
- Difficulty controls how much surrounding context is shown:
  - Easy: full surah visible
  - Medium: 3-4 ayahs before and after the gap
  - Hard: 1-2 ayahs before and after the gap

### 3. Complete the Page
- A mushaf page is displayed with one ayah replaced by a blank
- User identifies/provides the missing ayah
- Same difficulty-based context rules as Complete the Surah
- Uses mushaf-style layout (reuses MushafPage component from SurahSense)

### 4. Mixed
- Randomly selects between the three modes each round

## Answer Modes

### Choices
- Complete the Ayah: 4 options (1 correct word/phrase + 3 distractors)
- Complete the Surah/Page: 4 full ayah options (1 correct + 3 distractors)
- Distractor generation:
  - Easy: random ayahs/words from scope
  - Medium: same surah, non-adjacent ayahs
  - Hard: nearby ayahs in same surah (within 5 ayahs)
- Immediate feedback: green = correct, red = wrong + show correct answer

### Typing
- Complete the Ayah: input field(s) for each blanked word
- Complete the Surah/Page: text area for the full ayah
- Answer checking: tashkeel-insensitive via `stripTashkeel()` + word-by-word diff via `diffWords()` from `normalize-arabic.js`
- Shows green/red word-by-word diff after submission

## Settings Screen

Route: `/kalamquest`

Controls (all reuse existing shared components):
- **Scope** — ScopeSelector (surah/juz/page/hizb + specific selection)
- **Game Mode** — New ModeSelector: Complete Ayah, Complete Surah, Complete Page, Mixed
- **Difficulty** — DifficultySelector (Easy/Medium/Hard)
- **Answer Mode** — AnswerModeSelector (Choices/Type)
- **Display Options** — DisplayOptionsSelector (Translation & Transliteration toggles)

Navigates to `/kalamquest/play?scopeType=...&scopeValues=...&gameMode=ayah|surah|page|mixed&difficulty=...&answerMode=choices|type&translation=...&transliteration=...`

## Game Screen

Route: `/kalamquest/play`

### Flow
1. Parse query params via `useSearchParams()`
2. Fetch verses via `fetchVersesForScope()` (existing server function)
3. For page mode, also fetch via `fetchVersesForPage()` (existing)
4. Build prompt queue using `createKalamQuestQueue()`
5. Each round:
   - Pick next prompt from queue
   - For ayah mode: call `blankWords()` to create word blanks
   - For surah/page mode: select ayah to blank, gather context
   - Generate distractors
   - Render question display
   - Wait for user answer
   - Check correctness, show feedback
   - Update score, advance to next
6. After all prompts: show results screen (score, Play Again, New Settings)

### UI Components on Game Screen
- QuestionDisplay (renders current question for all modes)
- WordBlankDisplay (ayah with blanked words — ayah mode)
- AyahGapDisplay (surah/page with missing ayah — surah/page mode)
- WordChoiceGrid (choices for word blanks — ayah mode choices)
- Reused: ChoiceGrid/TypingInput (surah/page mode answers)
- Reused: AnswerModeToggle, ScoreCounter, BackButton
- Reused: MushafPage from SurahSense (page mode)

### Hints (HintBar)
- Reveal surah name (if not already shown in context)
- 50/50: eliminate 2 wrong choices (choices mode only)

## Scoring
- ScoreCounter: X/Y correct (Z%)
- One point per fully correct answer
- For typing in ayah mode: all blanked words must be correct for the point

## File Structure

```
src/app/kalamquest/page.js              — Settings screen ("use client")
src/app/kalamquest/play/page.js         — Game screen ("use client")
src/components/kalamquest/
  ModeSelector.jsx                      — 4-option game mode picker
  QuestionDisplay.jsx                   — Renders current question (delegates to sub-displays)
  WordBlankDisplay.jsx                  — Ayah with blanked words
  AyahGapDisplay.jsx                    — Surah/page context with missing ayah
  WordChoiceGrid.jsx                    — Multiple choice grid for word blanks
src/lib/kalamquest-engine.js            — Game logic
```

## Game Engine (`kalamquest-engine.js`)

### Functions

- `createKalamQuestQueue(verses, mode, scopeType)` — Builds a shuffled queue of prompts based on mode. For mixed mode, assigns a random mode per prompt.
- `blankWords(ayahText, difficulty)` — Returns `{ display, blankedWords, blankedIndices }`. Selects word positions to blank based on difficulty percentage. Prefers non-adjacent blanks.
- `generateAyahDistractors(correctAyah, difficulty, scopeVerses, surahVerses)` — Generates 3 distractor ayahs for surah/page modes. Easy: random from scope. Medium: same surah non-adjacent. Hard: nearby in same surah.
- `generateWordDistractors(correctWords, difficulty, scopeVerses)` — Generates 3 distractor word options for ayah mode. Pulls words from other ayahs in scope, matched by position/length similarity.
- `getContextAyahs(allAyahs, gapIndex, difficulty)` — Returns surrounding ayahs based on difficulty. Easy: all. Medium: 3-4 each side. Hard: 1-2 each side.
- `checkWordAnswer(typed, correctWords)` — Uses `stripTashkeel()` for tashkeel-insensitive comparison.

### Reused from existing modules
- `shuffle()` from `game-engine.js`
- `stripTashkeel()`, `diffWords()` from `normalize-arabic.js`
- `fetchVersesForScope()`, `fetchVersesForPage()` from `fetch-verses.js`
- `fetchAllChaptersInfo()` from `fetch-chapters.js`

## Registration

Add a GameCard to `/src/app/page.js`:
```jsx
<GameCard
  title="KalamQuest"
  description="Fill in the missing words or ayahs to test your memorization"
  href="/kalamquest"
/>
```
