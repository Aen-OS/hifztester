# AyahFlow: Typing Answer Mode

## Overview

Add an alternative answer mode to AyahFlow where users type the Arabic text of the answer ayah instead of selecting from multiple choices. Users can toggle between "Choices" and "Type It" modes both on the setup page (as a default) and mid-game via a segmented control.

## Setup Page

- New **AnswerModeSelector** component with two options: **Choices** (default) and **Type It**
- Styled consistently with the existing DifficultySelector
- Selected mode passed to `/ayahflow/play` as a `mode` query param (`choices` or `type`)

## Game Page: Answer Mode Toggle

- A **segmented control** ("Choices" | "Type It") renders between the HintBar and the answer area
- Initialized from the `mode` query param, switchable at any time mid-game
- Switching modes does **not** reset the current question — only swaps the answer UI
- When "Type It" is active:
  - ChoiceGrid is replaced by a **TypingInput** component (RTL textarea + Submit button)
  - 50/50 hint is **disabled** (not relevant without choices)
  - Surah reveal hint remains available

## Typing Input

- RTL `<textarea>` with Arabic placeholder text
- Submit button below the textarea
- On submit, the typed text is validated against the correct answer

## Answer Validation

- Both typed text and correct ayah text are **normalized** by stripping tashkeel/diacritics (harakat, tanween, shadda, sukun, etc.) before comparison
- Comparison is an **exact match** on the normalized strings
- **Correct answer**: green highlight, 1200ms delay, advance (same as choice mode)
- **Wrong answer**: show stacked DiffView (see below), 3000ms delay before advancing

## Diff View (Wrong Answer)

Stacked comparison with word-by-word coloring:

- **Top block — "YOUR ANSWER"**: user's typed text displayed word-by-word
  - Green: word matches the corresponding word in the correct answer
  - Red (with strikethrough): word is wrong or extra
- **Bottom block — "CORRECT ANSWER"**: full correct ayah text
  - Green: word was matched by the user
  - Yellow: word was missing or divergent in the user's answer
- Diff is computed **word-by-word** on normalized (diacritics-stripped) text using a simple left-to-right alignment: split both strings by whitespace, walk both word arrays in parallel, mark matches (green), mismatches (red in user's / yellow in correct), and any remaining words in the longer array as extra (red) or missing (yellow)
- A legend below shows the color meanings

## Score Tracking

- Score (correct/total) is shared across both modes — switching modes does not reset the score
- A typed correct answer counts the same as a choice correct answer

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AnswerModeSelector` | `src/components/ayahflow/` | Setup page — two-button selector |
| `AnswerModeToggle` | `src/components/ayahflow/` | Game page — segmented control |
| `TypingInput` | `src/components/ayahflow/` | RTL textarea + Submit button |
| `DiffView` | `src/components/ayahflow/` | Stacked your-answer vs correct comparison |

## New Utilities

| Module | Location | Purpose |
|--------|----------|---------|
| `normalize-arabic.js` | `src/lib/` | Strip tashkeel/diacritics, word-level diff function |

## Modified Files

| File | Changes |
|------|---------|
| `src/app/ayahflow/page.js` | Add AnswerModeSelector, pass `mode` in query params |
| `src/app/ayahflow/play/page.js` | Read `mode` param, manage `answerMode` state, conditionally render ChoiceGrid vs TypingInput, handle typed submission, show DiffView on wrong answer, disable 50/50 in typing mode, use 3000ms delay for wrong typed answers |
| `src/components/ayahflow/HintBar.jsx` | Accept prop to disable 50/50 in typing mode |

## Unchanged

- `game-engine.js` — no changes needed
- `fetch-verses.js` — no changes needed
- `ChoiceGrid.jsx` / `ChoiceCard.jsx` — no changes needed
- `QuestionCard.jsx` — no changes needed
