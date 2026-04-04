# Ma'naMatch Game + Audio Playback System

**Date:** 2026-04-04
**Status:** Approved

## Overview

Ma'naMatch is a new Quran memorization game where users match an Arabic ayah to its correct English translation from 4 choices. Additionally, a shared audio playback system is introduced for Ma'naMatch and AyahFlow, allowing users to hear ayahs recited aloud.

## Ma'naMatch Game

### Gameplay Loop

1. Show an Arabic ayah (Uthmani script) as the prompt in a question card
2. Optionally show transliteration below the Arabic
3. Optionally play audio of the ayah (if reciter enabled)
4. Show 4 English translation choices in a 2x2 grid
5. User picks the correct translation
6. Correct: green flash (#f0faf4 bg, #4caf82 border), advance after 1.2s
7. Wrong: orange flash (#fff8f0 bg, #e8a87c border) + shake animation, reveal correct, advance after 2s
8. Score tracked as correct/total
9. Queue auto-regenerates when exhausted

### Difficulty (Tiered Distractors)

- **Easy:** Distractor translations from random verses anywhere in the selected scope
- **Medium:** Distractor translations from the same surah, non-adjacent ayahs
- **Hard:** Distractor translations from the same surah, nearby ayahs (thematically similar)

Same tiered pattern used by AyahFlow, KalamQuest, etc. Reuses `fetchSurahForDistractors` for medium/hard.

### Engine — `src/lib/manamatch-engine.js`

Exports:

- `createManaMatchQueue(verses)` — shuffles verses into a prompt queue, excluding any verses that lack a translation. Same shuffle pattern as `createPromptQueue` in game-engine.js.
- `buildManaMatchQuestion(promptVerse, difficulty, scopeVerses, surahVerses)` — returns:
  ```
  {
    prompt: verse,              // full verse object (for Arabic text, verseKey, etc.)
    correctAnswer: {
      verseKey: string,
      translation: string
    },
    choices: [                  // array of 4 items, shuffled
      { verseKey: string, translation: string }
    ]
  }
  ```
- Distractor selection follows the existing tiered logic:
  - Hard: same surah, within ±5 ayahs
  - Medium: same surah, >6 ayahs away
  - Easy: any verse in scope
  - Fallback to next tier if insufficient distractors found

### Setup Page — `src/app/manamatch/page.js`

"use client" page. Sections:

1. Back button + title ("Ma'naMatch") + subtitle ("Match the translation to the Arabic verse") in muted color
2. **Scope** — reuses `ScopeSelector` from `@/components/ayahflow/ScopeSelector`
3. **Difficulty** — reuses `DifficultySelector` from `@/components/ayahflow/DifficultySelector`
4. **Display Options** — transliteration toggle only (translation is inherent to the game). Render inline toggle, not the full `DisplayOptionsSelector`.
5. **Translation** — dropdown or selector to pick which English translation to use. Defaults to Sahih International (ID "131"). Uses the same `TRANSLATIONS` list from `src/lib/translations.js`. This is important because the translation IS the answer — the user should know which translation they're being tested on.
6. **Audio** — `ReciterSelector` (off by default)
7. **Start button** — disabled when `scope.values.length === 0`

URL params passed to play page: `scopeType`, `scopeValues`, `difficulty`, `transliteration` (on/off), `reciter` (reciter ID or "off"), `translation` (translation ID, always passed since translations are the core mechanic).

### Play Page — `src/app/manamatch/play/page.js`

"use client" page wrapped in Suspense. Same architecture as AyahFlow play page.

**Layout (h-dvh flex column, max-w-[680px], px-5):**

- **Nav bar:** Back button left, outlined End button right
- **Question zone (flex-1, centered, scrollable):**
  - Score pill (top-left)
  - Question card: "MATCH THE TRANSLATION" label (13px uppercase tracked muted) + Arabic text (26px centered rtl) + transliteration (if enabled) + AudioPlayButton (if reciter enabled)
  - Controls row: ReciterToggle (if audio on) + transliteration toggle
- **Answer zone (pinned bottom, border-t):**
  - 4 translation choice cards in 2-column grid

**State management:**
- Same patterns as AyahFlow: loading, error, verses, promptQueue, promptIndex, question, selectedKey, score, showResults
- No answer mode toggle (choices only)
- `surahCacheRef` for medium/hard difficulty distractor fetching

### Components — `src/components/manamatch/`

**`ManaMatchQuestionCard.jsx`**
- Props: `verse`, `showTransliteration`, `reciterId`
- Styling: rounded-[14px], border-emerald-700/15, bg-surface, px-6 py-7, text-center
- Prompt label: "MATCH THE TRANSLATION" — 13px uppercase tracking-[0.08em] muted
- Arabic: font-arabic text-[26px] leading-[2.0] centered rtl
- Transliteration: mt-3 text-sm italic text-muted (conditional)
- AudioPlayButton: mt-3, centered (conditional on reciterId)

**`TranslationChoiceGrid.jsx`**
- Props: `choices`, `correctKey`, `selectedKey`, `onSelect`
- Grid: `grid gap-3 sm:grid-cols-2`
- Each card: min-h-16, rounded-[10px], border-[#e0e0d8], px-5 py-4, text-left
- Text: 15px, LTR, line-height 1.6, normal font-body
- States: default (hover: border-emerald-700/50, bg-emerald-700/4), correct (#f0faf4 bg, #4caf82 1.5px border), incorrect (#fff8f0 bg, #e8a87c 1.5px border + shake), reveal (correct style at 60% opacity)
- transition-all duration-150

### Home Screen Change

Add Ma'naMatch as the 5th game card. The 5th card is centered below the 2x2 grid. Implementation: after the `grid-cols-2` div, add a separate flex container with `justify-center` containing the 5th GameCard with a fixed max-width matching the grid column width.

- Title: "Ma'naMatch"
- Description: "Match the translation to the Arabic verse."
- href: `/manamatch`

## Audio Playback System

### Reciters — `src/lib/reciters.js`

```javascript
export const RECITERS = [
  { id: "7", name: "Mishary Rashid Alafasy" },
  { id: "2", name: "Abdul Basit (Murattal)" },
  { id: "4", name: "Abu Bakr al-Shatri" },
];
export const DEFAULT_RECITER_ID = "7";
```

### Audio Fetching — `src/lib/fetch-audio.js`

- `fetchAudioUrl(reciterId, verseKey)` — GET `https://api.quran.com/api/v4/recitations/{reciterId}/by_ayah/{verseKey}`, extract `audio_files[0].url`, prepend `https://audio.qurancdn.com/` to get full URL
- In-memory cache (Map) keyed by `{reciterId}:{verseKey}` to avoid duplicate fetches per session
- Returns the full audio URL string

### Hook — `src/hooks/useAudioPlayer.js`

```
useAudioPlayer(reciterId) → { playVerse, stop, isPlaying, currentVerseKey }
```

- Creates a single `<audio>` element via `useRef` (reused across all playVerse calls)
- `playVerse(verseKey)`: fetches URL via `fetchAudioUrl`, sets `audio.src`, calls `audio.play()`. If already playing, stops current and starts new.
- `isPlaying`: tracked via `useState`, updated by audio `play`/`ended`/`pause` events
- `currentVerseKey`: which verse is currently playing, null if idle
- `stop()`: pauses audio, resets state
- Cleanup on unmount: pause audio, remove event listeners
- Error handling: on fetch or playback error, silently stop (set isPlaying=false, no UI error)

### UI Components — `src/components/shared/`

**`AudioPlayButton.jsx`**
- Props: `verseKey`, `reciterId`, `size?` (default "sm")
- Uses `useAudioPlayer` hook internally
- Renders a small circular button (32px) with:
  - Idle: play/speaker icon in emerald-700/40
  - Loading: small spinner
  - Playing: filled/pulsing icon in emerald-700
- Tap while idle = play. Tap while playing = stop.
- Styling: rounded-full, transition-colors

**`ReciterSelector.jsx`**
- Props: `value` (reciter ID or null), `onChange`
- For setup pages
- Toggle switch "Enable recitation" (off by default)
- When on: shows pill-shaped selector with 3 reciters (same styling as scope type tabs — active pill has emerald-700 bg white text, inactive transparent muted text)
- When off: `onChange(null)`

**`ReciterToggle.jsx`**
- Props: `value` (reciter ID), `onChange`
- For play pages — only rendered when reciter is enabled
- Compact pill group showing 3 reciter short names (e.g. "Alafasy", "Abdul Basit", "al-Shatri")
- Same segmented control style as AnswerModeToggle (#f0f0eb bg, white active segment with shadow)

### Integration: AyahFlow

**Setup page (`src/app/ayahflow/page.js`):**
- Add new section after Display Options: "Audio" with `ReciterSelector`
- Add `reciter` to URL params (value or "off")

**Play page (`src/app/ayahflow/play/page.js`):**
- Read `reciter` param from URL
- Pass `reciterId` to `QuestionCard` (which conditionally renders `AudioPlayButton`)
- Add `ReciterToggle` in the controls row alongside `DisplayOptionsToggle` (only if reciter !== "off")

**QuestionCard (`src/components/ayahflow/QuestionCard.jsx`):**
- Add optional `reciterId` prop
- When provided: render `AudioPlayButton` below the Arabic text (or below transliteration if shown)

## Files Changed (Existing)

- `src/app/page.js` — add 5th game card, centered below grid
- `src/app/ayahflow/page.js` — add ReciterSelector section + reciter URL param
- `src/app/ayahflow/play/page.js` — read reciter param, render ReciterToggle, pass reciterId to QuestionCard
- `src/components/ayahflow/QuestionCard.jsx` — add optional reciterId prop, conditionally render AudioPlayButton

## Files Created (New)

- `src/lib/manamatch-engine.js` — queue creation, question building, distractor generation
- `src/lib/reciters.js` — reciter list and default
- `src/lib/fetch-audio.js` — audio URL fetching with cache
- `src/hooks/useAudioPlayer.js` — shared audio playback hook
- `src/app/manamatch/page.js` — setup page
- `src/app/manamatch/play/page.js` — play page
- `src/components/manamatch/ManaMatchQuestionCard.jsx` — Arabic prompt card
- `src/components/manamatch/TranslationChoiceGrid.jsx` — translation choice cards
- `src/components/shared/AudioPlayButton.jsx` — play/stop button
- `src/components/shared/ReciterSelector.jsx` — setup page reciter picker
- `src/components/shared/ReciterToggle.jsx` — play page reciter switcher
