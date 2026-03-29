# AyahFlow Translation & Transliteration Toggle — Design Spec

## Overview

Add translation and transliteration display controls to AyahFlow. Users can toggle English translations on/off, choose between translation sources, and toggle romanized transliteration on/off. Controls appear on both the settings screen and the game screen, with mid-game changes taking effect immediately.

## Data Layer

### Translation Config

**`src/lib/translations.js`** — centralized translation registry:

```js
export const TRANSLATIONS = [
  { id: "131", name: "Sahih International" },
  { id: "203", name: "Hilali & Khan" },
];
export const DEFAULT_TRANSLATION_ID = "131";
```

Adding a new translation = one line in the array.

### Fetch Layer Changes

**`src/lib/fetch-verses.js`**:

- Accept `translationId` parameter instead of using hardcoded `TRANSLATION_ID = "131"`.
- When translation is off (`translationId` is `null`), still fetch with default translation so data structure is consistent — the display layer hides it.
- Add transliteration field to the `fields` option in fetch requests.
- `normalizeVerse` gains a `transliteration` field extracted from the raw API response.

### Query Params

Passed from settings to `/ayahflow/play`:

- `translation=131` (on, with ID) or `translation=off`
- `transliteration=on` or `transliteration=off`

Defaults: `translation=131`, `transliteration=off`.

## Settings Screen

### Display Options Section

New section added after existing selectors (Scope, Difficulty, Answer Mode, Direction).

- **Section heading**: "Display Options" with subtitle "Choose what to show alongside the Arabic text"
- **Single-line layout**: Translation and Transliteration controls side by side
  - Stacks vertically on narrow screens (`flex-wrap: wrap`)
- **Translation control**: Toggle switch + select dropdown. Dropdown disabled/hidden when toggle is off.
- **Transliteration control**: Toggle switch only.
- Defaults: Translation on (Sahih International), Transliteration off.

### New Component

**`src/components/ayahflow/DisplayOptionsSelector.jsx`** — renders the section with both controls.

Props:
- `translationEnabled` / `onTranslationEnabledChange`
- `translationId` / `onTranslationIdChange`
- `transliterationEnabled` / `onTransliterationEnabledChange`

## Game Screen

### Top Bar Controls

Compact pill toggles in the top bar alongside existing score counter and End button.

- **Translation toggle**: Labeled "EN" with a mini toggle switch.
- **Transliteration toggle**: Labeled "Aa" with a mini toggle switch.
- No translation source dropdown on the game screen — only toggle on/off. To change which translation, go back to settings.

### New Component

**`src/components/ayahflow/DisplayOptionsToggle.jsx`** — compact toggle pills for the game screen.

Props:
- `translationEnabled` / `onTranslationToggle`
- `transliterationEnabled` / `onTransliterationToggle`

### Mid-Game Behavior

- **Toggling off**: Immediately hides translation/transliteration text on current and future questions. No refetch needed.
- **Toggling on**: Shows translation/transliteration text. Already-fetched verses have translation data (always fetched regardless of toggle state). Transliteration is also fetched alongside verse data.

## Display Components

### QuestionCard Changes

Conditionally render based on `showTranslation` and `showTransliteration` props:

1. Arabic text (Uthmani) — always shown
2. Transliteration — italic, muted gray (`text-gray-500`), shown when `showTransliteration` is true
3. Translation — lighter muted gray (`text-gray-400`), shown when `showTranslation` is true

### ChoiceCard Changes

Same conditional rendering for translation and transliteration text.

### Verse Data Shape

```js
{
  id, verseKey, chapterId, verseNumber,
  textUthmani,        // always present
  translation,        // always fetched, conditionally displayed
  transliteration,    // always fetched, conditionally displayed
  juzNumber, hizbNumber, pageNumber,
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/lib/translations.js` | New file — translation registry |
| `src/lib/fetch-verses.js` | Accept translationId param, add transliteration field |
| `src/components/ayahflow/DisplayOptionsSelector.jsx` | New — settings screen control |
| `src/components/ayahflow/DisplayOptionsToggle.jsx` | New — game screen compact toggles |
| `src/components/ayahflow/QuestionCard.jsx` | Conditional translation/transliteration display |
| `src/components/ayahflow/ChoiceCard.jsx` | Conditional translation/transliteration display |
| `src/app/ayahflow/page.js` | Add DisplayOptionsSelector, pass query params |
| `src/app/ayahflow/play/page.js` | Read new params, manage display state, pass props |
