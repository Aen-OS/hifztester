# AyahFlow Hints & 50/50 Lifeline

## Overview

Add a hint system and 50/50 lifeline to the AyahFlow game page. A horizontal "hint bar" sits between the QuestionCard and ChoiceGrid, giving users contextual information about the question verse and the ability to eliminate wrong choices.

## Features

### 1. Hint Bar

A new `HintBar` component rendered between QuestionCard and ChoiceGrid. Layout:

- **Left side**: Verse identification hints (ayah number + surah reveal toggle)
- **Right side**: 50/50 lifeline button with remaining-uses counter

### 2. Ayah Number (Always Visible)

- Displays the ayah (verse) number of the current question's prompt verse
- Shown as static text, e.g. "Ayah 5"
- Source: `question.prompt.verseNumber`
- Always visible — no toggle needed

### 3. Surah Reveal Toggle

- Hidden by default on each new question
- Toggle button (e.g. eye icon or "Reveal Surah" label) reveals **both**:
  - Surah number (e.g. "Surah 2")
  - Surah name (e.g. "Al-Baqarah")
- Displayed together, e.g. "Surah 2 — Al-Baqarah"
- Source: `question.prompt.chapterId` for number, `SURAH_NAMES[chapterId]` for name
- Resets to hidden on each new question

### 4. 50/50 Lifeline

- Button displays remaining uses, e.g. "50/50 (3)"
- **3 total uses per game session** (persists across questions, does not reset)
- On click: removes 2 random **incorrect** choices from the ChoiceGrid
  - Keeps the correct answer + 1 random wrong choice visible
  - Removed choices are hidden (not rendered), not grayed out
- Button is **disabled** when:
  - Already activated on the current question
  - No uses remaining (counter at 0)
  - User has already selected an answer for the current question
- Eliminated choices reset on each new question

### 5. Scoring

No scoring penalty for using hints or 50/50. Score tracks correct/total as before.

## State Changes (in AyahFlowGameInner)

| State variable | Type | Initial | Reset per question | Description |
|---|---|---|---|---|
| `surahRevealed` | boolean | `false` | Yes | Whether the surah hint is shown |
| `fiftyFiftyRemaining` | number | `3` | No | Uses left for the session |
| `eliminatedKeys` | string[] | `[]` | Yes | verseKeys of the 2 removed choices |
| `fiftyFiftyUsedThisRound` | boolean | `false` | Yes | Prevents double-use per question |

Reset logic: when `question` changes (new question loaded), reset `surahRevealed` to `false`, `eliminatedKeys` to `[]`, and `fiftyFiftyUsedThisRound` to `false`.

## Shared Data: SURAH_NAMES

`SURAH_NAMES` is currently defined in `src/components/ayahflow/ScopeSelector.jsx`. Extract it to a shared module `src/lib/quran-data.js` so both ScopeSelector and the game page can import it.

## Component Structure

```
QuestionCard
HintBar              <-- NEW
  |- Ayah number (left, always visible)
  |- Surah reveal toggle + revealed text (left)
  |- 50/50 button with counter (right)
ChoiceGrid
  |- ChoiceCard (filtered by eliminatedKeys)
```

### HintBar Props

```js
{
  ayahNumber: number,           // from question.prompt.verseNumber
  chapterId: number,            // from question.prompt.chapterId
  surahRevealed: boolean,
  onToggleSurah: () => void,
  fiftyFiftyRemaining: number,
  fiftyFiftyDisabled: boolean,  // derived: usedThisRound || remaining === 0 || selectedKey !== null
  onFiftyFifty: () => void,
}
```

### ChoiceGrid Changes

ChoiceGrid receives `eliminatedKeys` and filters out choices whose `verseKey` is in that array before rendering.

## File Changes Summary

| File | Change |
|---|---|
| `src/lib/quran-data.js` | **New** — exports `SURAH_NAMES` array |
| `src/components/ayahflow/ScopeSelector.jsx` | Import `SURAH_NAMES` from `quran-data.js`, remove local copy |
| `src/components/ayahflow/HintBar.jsx` | **New** — hint bar component |
| `src/components/ayahflow/ChoiceGrid.jsx` | Accept `eliminatedKeys` prop, filter choices |
| `src/app/ayahflow/play/page.js` | Add hint/50/50 state, wire HintBar, pass eliminatedKeys to ChoiceGrid |
