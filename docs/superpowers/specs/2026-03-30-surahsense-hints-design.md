# SurahSense Hints System

## Summary

Add a hint bar to the SurahSense game with revelation place, verse count, 50/50 elimination, and an expand-summary option for summary mode.

## Hints

### Revelation Place (all modes)

- Toggle button in the hint bar
- Reveals "Meccan" or "Medinan"
- One-click reveal, stays visible for the rest of the question
- Data source: `allChapters` already loaded at game start (has `revelationPlace`)

### Verse Count (all modes)

- Toggle button in the hint bar
- Reveals the number of verses in the correct surah
- One-click reveal, stays visible for the rest of the question
- Data source: `allChapters` already loaded at game start (has `versesCount`)

### 50/50 (all modes, choices mode only)

- Eliminates 2 incorrect answer choices
- 3 uses per session (persists across questions, resets on "Play Again")
- Only shown when `answerMode === "choices"`
- Disabled after use on current question, when no uses remain, or after answering
- Eliminated choice IDs stored in state; `SurahChoiceGrid` filters them out

### Expand Summary (summary mode only)

- Only shown when clue type is `summary`
- Reveals the full chapter info text (`info.text`) instead of the short summary (`info.shortText`)
- One-click reveal, stays visible for the rest of the question

## File Changes

### `src/lib/fetch-chapters.js`

- `fetchChapterInfo`: return `summary` (shortText) and `fullSummary` (text) as separate fields

### `src/components/surahsense/SurahSenseHintBar.jsx` (new)

Props:
- `revelationPlaceRevealed`, `onRevealRevelationPlace` — toggle for revelation place
- `revelationPlace` — "makkah" or "madinah"
- `verseCountRevealed`, `onRevealVerseCount` — toggle for verse count
- `versesCount` — number
- `fiftyFiftyRemaining`, `fiftyFiftyDisabled`, `fiftyFiftyHidden`, `onFiftyFifty`
- `showExpandSummary` — whether to show the expand button (true only in summary mode)
- `summaryExpanded`, `onExpandSummary` — toggle for full summary

Layout: horizontal bar with hint buttons, similar to AyahFlow's HintBar.

### `src/components/surahsense/SummaryClue.jsx`

- Remove built-in hint buttons and state (revelation place / verse count reveals)
- Accept `expanded` and `fullSummary` props
- Show `fullSummary` when `expanded` is true, otherwise show `summary`

### `src/components/surahsense/SurahChoiceGrid.jsx`

- Accept optional `eliminatedIds` prop (Set or array)
- Filter out eliminated choices from render

### `src/app/surahsense/play/page.js`

New state:
- `revelationPlaceRevealed` (boolean, reset per question)
- `verseCountRevealed` (boolean, reset per question)
- `summaryExpanded` (boolean, reset per question)
- `fiftyFiftyRemaining` (number, starts at 3, persists across questions)
- `fiftyFiftyUsedThisRound` (boolean, reset per question)
- `eliminatedIds` (array, reset per question)

State resets: `revelationPlaceRevealed`, `verseCountRevealed`, `summaryExpanded`, `fiftyFiftyUsedThisRound`, and `eliminatedIds` reset in `buildClue` when the question changes.

`buildClue` changes for summary mode:
- Store `fullSummary` from `info.text` (redacted) alongside `summary` from `info.shortText` (redacted)

`handleFiftyFifty`:
- Pick 2 random incorrect choice IDs, add to `eliminatedIds`
- Decrement `fiftyFiftyRemaining`, set `fiftyFiftyUsedThisRound = true`

Wire `SurahSenseHintBar` between the clue area and answer area, passing correct chapter's `revelationPlace` and `versesCount` from `allChapters`.
