# TartibBlock — Design Spec

## Overview

TartibBlock is a Quran memorization game where users reorder scrambled blocks into the correct sequence. Blocks can be words within an ayah, ayahs within a surah, or ayahs on a mushaf page. The name combines "tartib" (Arabic for order/arrangement) with "block."

## Game Modes

### 1. Organise the Ayah
- Words of a single ayah are split into groups and scrambled
- User reorders the word groups into the correct sequence
- Difficulty scales the number of groups:
  - Easy: 3-4 word groups (consecutive word chunks)
  - Medium: 5-7 word groups
  - Hard: every individual word is a separate block

### 2. Organise the Surah
- Ayahs from a surah are scrambled
- User reorders them into the correct sequence
- Difficulty scales how many ayahs are shown:
  - Easy: 3-4 ayahs (randomly selected subset)
  - Medium: 5-7 ayahs
  - Hard: all ayahs in the surah

### 3. Organise the Page
- Ayahs from a mushaf page are scrambled
- User reorders them into the correct sequence
- Same difficulty scaling as Organise the Surah

### 4. Mixed
- Randomly selects between the three modes each round

## Interaction Mechanic

### Desktop — Drag and Drop
- Native HTML5 drag-and-drop API (draggable, onDragStart, onDragOver, onDrop)
- Drag handle icon on each block
- Visual feedback: dragged block becomes semi-transparent, drop target shows insertion indicator

### Mobile — Tap to Swap
- First tap selects a block (highlighted border)
- Second tap on a different block swaps their positions
- Tap selected block again to deselect
- Detect via pointer events

### Block States
- `default` — neutral styling
- `dragging` — semi-transparent while being dragged
- `selected` — highlighted border (tap mode)
- `correct` — green background (after submit)
- `incorrect` — red background (after submit)

## Submit & Feedback Flow

1. User arranges all blocks in their chosen order
2. User presses "Check Order" button
3. Each block flashes green (correct position) or red (wrong position)
4. Score shown for the round (e.g., "5/7 correct")
5. After a delay, the correct order is revealed
6. Advance to next question

## Scoring

- Per-round: count of blocks in correct position out of total blocks
- Across rounds: track `totalCorrect` and `totalBlocks`
- Final score: `totalCorrect / totalBlocks` as percentage
- Uses ScoreCounter component showing running totals

## Hints

- **Page number**: shown by default in hard mode
- **Reveal Surah**: button that reveals the surah name (hint)

## Settings Screen

Route: `/tartibblock`

Controls (reuse existing shared components):
- **Scope** — ScopeSelector (surah/juz/page/hizb + specific selection)
- **Game Mode** — New ModeSelector: Organise Ayah, Organise Surah, Organise Page, Mixed
- **Difficulty** — DifficultySelector (Easy/Medium/Hard)
- **Display Options** — DisplayOptionsSelector (Translation & Transliteration toggles)

No answer mode selector — the mechanic is always reordering blocks.

Navigates to `/tartibblock/play?scopeType=...&scopeValues=...&gameMode=ayah|surah|page|mixed&difficulty=...&translation=...&transliteration=...`

## Game Screen

Route: `/tartibblock/play`

### Flow
1. Parse query params via `useSearchParams()`
2. Fetch verses via `fetchVersesForScope()` (existing server function)
3. For page mode, also fetch via `fetchVersesForPage()` (existing)
4. Build prompt queue using `createTartibBlockQueue()`
5. Each round:
   - Pick next prompt from queue
   - For ayah mode: split ayah into word groups via `splitAyahIntoBlocks()`
   - For surah/page mode: select ayah subset via `selectAyahBlocks()`
   - Scramble blocks via `scrambleBlocks()`
   - Render SortableBlockList
   - Wait for user to arrange and submit
   - Score via `scoreArrangement()`
   - Show green/red feedback on blocks
   - After delay, reveal correct order
   - Advance to next round
6. After all prompts: results screen (total percentage, Play Again, New Settings)

### UI Components on Game Screen
- SortableBlockList — reorderable block list (drag + tap)
- BlockItem — individual block with drag handle and states
- TartibBlockHintBar — page number + reveal surah
- Reused: ScoreCounter, BackButton, DisplayOptionsToggle

## File Structure

```
src/app/tartibblock/page.js              — Settings screen ("use client")
src/app/tartibblock/play/page.js         — Game screen ("use client")
src/components/tartibblock/
  ModeSelector.jsx                       — 4-option game mode picker
  SortableBlockList.jsx                  — Drag + tap reorderable block list
  BlockItem.jsx                          — Single block with drag handle + states
  TartibBlockHintBar.jsx                 — Hint bar
src/lib/tartibblock-engine.js            — Game logic
```

## Game Engine (`tartibblock-engine.js`)

### Functions

- `createTartibBlockQueue(verses, mode)` — Builds a shuffled queue of prompts based on mode. For ayah/mixed: one prompt per verse. For surah: one per unique surah. For page: one per unique page.

- `splitAyahIntoBlocks(ayahText, difficulty)` — Splits ayah words into groups based on difficulty. Easy: 3-4 groups of consecutive words. Medium: 5-7 groups. Hard: one word per block. Returns `[{ id, text, correctIndex }]`.

- `selectAyahBlocks(verses, difficulty)` — Selects a subset of ayahs for surah/page mode. Easy: 3-4 ayahs. Medium: 5-7 ayahs. Hard: all ayahs. Returns `[{ id, verse, correctIndex }]`.

- `scrambleBlocks(blocks)` — Shuffles blocks ensuring the scrambled order differs from the correct order. Re-shuffles if result matches original.

- `scoreArrangement(blocks, userOrder)` — Compares user's arrangement against correct order. Returns `{ correctCount, totalCount, percentage, results }` where results is `[{ block, isCorrect }]`.

### Reused from existing modules
- `shuffle()` from `game-engine.js`
- `fetchVersesForScope()`, `fetchVersesForPage()` from `fetch-verses.js` / `fetch-chapters.js`

## Registration

Add a GameCard to `/src/app/page.js`:
```jsx
<GameCard
  title="TartibBlock"
  description="Arrange scrambled words or ayahs into the correct order."
  href="/tartibblock"
/>
```
