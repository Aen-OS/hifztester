# KalamQuest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a KalamQuest game where users fill in missing words within an ayah, a missing ayah within a surah, or a missing ayah on a mushaf page.

**Architecture:** Three game modes (ayah/surah/page + mixed) sharing a common settings screen, game loop, and engine. Follows the same patterns as AyahFlow and SurahSense: settings page collects params → navigates to play page → game loop with score/hints/results.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, @quranjs/api

---

## File Structure

```
src/lib/kalamquest-engine.js                    — Game logic (create)
src/components/kalamquest/ModeSelector.jsx       — 4-option mode picker (create)
src/components/kalamquest/WordBlankDisplay.jsx    — Ayah with blanked words (create)
src/components/kalamquest/AyahGapDisplay.jsx      — Surah/page with missing ayah (create)
src/components/kalamquest/WordChoiceGrid.jsx       — Word-level multiple choice (create)
src/components/kalamquest/KalamQuestHintBar.jsx    — Hint bar (create)
src/app/kalamquest/page.js                        — Settings screen (create)
src/app/kalamquest/play/page.js                   — Game screen (create)
src/app/page.js                                   — Home page (modify: add GameCard)
```

---

### Task 1: Game Engine — `kalamquest-engine.js`

**Files:**
- Create: `src/lib/kalamquest-engine.js`

- [ ] **Step 1: Create the engine file with all functions**

```js
// src/lib/kalamquest-engine.js
import { shuffle } from "@/lib/game-engine";
import { stripTashkeel } from "@/lib/normalize-arabic";

/**
 * Build a shuffled prompt queue for KalamQuest.
 * - ayah mode: each verse is a prompt (user fills in blanked words)
 * - surah mode: each unique surah becomes a prompt (user fills missing ayah)
 * - page mode: each unique page becomes a prompt (user fills missing ayah)
 * - mixed: each verse is a prompt, with a random mode assigned per round
 */
export function createKalamQuestQueue(verses, mode) {
  if (mode === "surah") {
    const surahIds = [...new Set(verses.map((v) => v.chapterId))];
    return shuffle([...surahIds]).map((id) => ({ type: "surah", surahId: id }));
  }
  if (mode === "page") {
    const pageNums = [...new Set(verses.map((v) => v.pageNumber))];
    return shuffle([...pageNums]).map((p) => ({ type: "page", pageNumber: p }));
  }
  // ayah or mixed — one prompt per verse
  const modes = ["ayah", "surah", "page"];
  return shuffle([...verses]).map((v) => ({
    type: mode === "mixed" ? modes[Math.floor(Math.random() * modes.length)] : "ayah",
    verse: v,
    // For mixed surah/page prompts, attach the surah/page from the verse
    surahId: v.chapterId,
    pageNumber: v.pageNumber,
  }));
}

/**
 * Blank out words in an ayah based on difficulty.
 * Returns { display, blankedWords, blankedIndices }
 * - display: array of { word, blanked } objects
 * - blankedWords: the original words that were blanked (in order)
 * - blankedIndices: which indices were blanked
 */
export function blankWords(ayahText, difficulty) {
  const words = ayahText.trim().split(/\s+/);
  if (words.length === 0) return { display: [], blankedWords: [], blankedIndices: [] };

  // Determine how many words to blank
  let ratio;
  switch (difficulty) {
    case "easy":
      ratio = 0.2;
      break;
    case "medium":
      ratio = 0.4;
      break;
    case "hard":
      ratio = 0.6;
      break;
    default:
      ratio = 0.2;
  }

  let count = Math.max(1, Math.round(words.length * ratio));
  count = Math.min(count, words.length);

  // Pick indices to blank, preferring non-adjacent
  const indices = pickNonAdjacentIndices(words.length, count);

  const blankedWords = indices.map((i) => words[i]);
  const blankedSet = new Set(indices);
  const display = words.map((word, i) => ({
    word,
    blanked: blankedSet.has(i),
  }));

  return { display, blankedWords, blankedIndices: indices };
}

/**
 * Pick `count` indices from 0..length-1, preferring non-adjacent.
 * Falls back to adjacent if not enough non-adjacent slots available.
 */
function pickNonAdjacentIndices(length, count) {
  if (count >= length) return Array.from({ length }, (_, i) => i);

  // Try non-adjacent first
  const available = Array.from({ length }, (_, i) => i);
  const selected = [];
  const used = new Set();

  // Shuffle available indices
  const shuffled = shuffle([...available]);

  for (const idx of shuffled) {
    if (selected.length >= count) break;
    const hasAdjacentSelected = used.has(idx - 1) || used.has(idx + 1);
    if (!hasAdjacentSelected) {
      selected.push(idx);
      used.add(idx);
    }
  }

  // Fill remaining with any unused indices if non-adjacent wasn't enough
  if (selected.length < count) {
    for (const idx of shuffled) {
      if (selected.length >= count) break;
      if (!used.has(idx)) {
        selected.push(idx);
        used.add(idx);
      }
    }
  }

  return selected.sort((a, b) => a - b);
}

/**
 * Generate 3 distractor ayahs for surah/page mode.
 * Uses tiered difficulty like AyahFlow's generateDistractors.
 */
export function generateAyahDistractors(correctVerse, difficulty, scopeVerses, surahVerses) {
  const correctKey = correctVerse.verseKey;
  const correctNum = correctVerse.verseNumber;
  const correctChapter = correctVerse.chapterId;

  function getCandidates(tier) {
    switch (tier) {
      case "hard":
        return surahVerses.filter(
          (v) =>
            v.verseKey !== correctKey &&
            v.chapterId === correctChapter &&
            Math.abs(v.verseNumber - correctNum) <= 5,
        );
      case "medium":
        return surahVerses.filter(
          (v) =>
            v.verseKey !== correctKey &&
            v.chapterId === correctChapter &&
            Math.abs(v.verseNumber - correctNum) > 5,
        );
      case "easy":
        return scopeVerses.filter((v) => v.verseKey !== correctKey);
      default:
        return [];
    }
  }

  const distractors = [];
  const usedKeys = new Set([correctKey]);
  const tiers =
    difficulty === "hard"
      ? ["hard", "medium", "easy"]
      : difficulty === "medium"
        ? ["medium", "easy"]
        : ["easy"];

  for (const tier of tiers) {
    if (distractors.length >= 3) break;
    const candidates = getCandidates(tier).filter((v) => !usedKeys.has(v.verseKey));
    const shuffled = shuffle([...candidates]);
    for (const c of shuffled) {
      if (distractors.length >= 3) break;
      distractors.push(c);
      usedKeys.add(c.verseKey);
    }
  }

  return distractors;
}

/**
 * Generate 3 distractor word options for ayah mode (word blanks).
 * Each distractor is a string (same number of words as the blanked segment).
 * Pulls words from other ayahs in scope at similar positions.
 */
export function generateWordDistractors(blankedWords, blankedIndices, scopeVerses, correctVerseKey) {
  const distractors = [];
  const usedSet = new Set([blankedWords.join(" ")]);
  const wordCount = blankedWords.length;

  // Collect candidate word segments from other ayahs
  const candidates = [];
  for (const v of scopeVerses) {
    if (v.verseKey === correctVerseKey) continue;
    const words = v.textUthmani.trim().split(/\s+/);
    // For each blanked index, try to grab the same position from other verses
    for (const idx of blankedIndices) {
      if (idx < words.length) {
        const segment = words.slice(idx, idx + wordCount).join(" ");
        if (segment.split(/\s+/).length === wordCount && !usedSet.has(segment)) {
          candidates.push(segment);
          usedSet.add(segment);
        }
      }
    }
  }

  const shuffled = shuffle([...candidates]);
  for (const c of shuffled) {
    if (distractors.length >= 3) break;
    distractors.push(c);
  }

  // If not enough, grab random word segments from scope
  if (distractors.length < 3) {
    for (const v of shuffle([...scopeVerses])) {
      if (distractors.length >= 3) break;
      if (v.verseKey === correctVerseKey) continue;
      const words = v.textUthmani.trim().split(/\s+/);
      if (words.length >= wordCount) {
        const start = Math.floor(Math.random() * (words.length - wordCount + 1));
        const segment = words.slice(start, start + wordCount).join(" ");
        if (!usedSet.has(segment)) {
          distractors.push(segment);
          usedSet.add(segment);
        }
      }
    }
  }

  return distractors;
}

/**
 * Get surrounding context ayahs for a gap in surah/page mode.
 * Returns the array with the gap ayah removed, trimmed by difficulty.
 */
export function getContextAyahs(allAyahs, gapIndex, difficulty) {
  let before, after;
  switch (difficulty) {
    case "easy":
      before = gapIndex;
      after = allAyahs.length - gapIndex - 1;
      break;
    case "medium":
      before = Math.min(gapIndex, 4);
      after = Math.min(allAyahs.length - gapIndex - 1, 4);
      break;
    case "hard":
      before = Math.min(gapIndex, 2);
      after = Math.min(allAyahs.length - gapIndex - 1, 2);
      break;
    default:
      before = gapIndex;
      after = allAyahs.length - gapIndex - 1;
  }

  const start = gapIndex - before;
  const end = gapIndex + after + 1;
  const context = [];
  for (let i = start; i < end; i++) {
    if (i === gapIndex) {
      context.push({ gap: true, verseKey: allAyahs[i].verseKey });
    } else {
      context.push(allAyahs[i]);
    }
  }
  return context;
}

/**
 * Check if typed words match the correct blanked words.
 * Tashkeel-insensitive comparison.
 */
export function checkWordAnswer(typedWords, correctWords) {
  if (typedWords.length !== correctWords.length) return false;
  return typedWords.every(
    (typed, i) => stripTashkeel(typed) === stripTashkeel(correctWords[i]),
  );
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

Run: `node -e "require('./src/lib/kalamquest-engine.js')" 2>&1 || npx -y acorn --ecma2020 --module src/lib/kalamquest-engine.js`

Note: This may fail due to path aliases (`@/lib/...`). That's expected — the important thing is no parse errors. Alternatively just check the dev server starts in a later task.

- [ ] **Step 3: Commit**

```bash
git add src/lib/kalamquest-engine.js
git commit -m "feat(kalamquest): add game engine with word blanking and distractor generation"
```

---

### Task 2: ModeSelector Component

**Files:**
- Create: `src/components/kalamquest/ModeSelector.jsx`

- [ ] **Step 1: Create the ModeSelector component**

```jsx
// src/components/kalamquest/ModeSelector.jsx
"use client";

const MODES = [
  { key: "ayah", label: "Complete Ayah", description: "Fill in missing words within an ayah" },
  { key: "surah", label: "Complete Surah", description: "Identify the missing ayah in a surah" },
  { key: "page", label: "Complete Page", description: "Identify the missing ayah on a page" },
  { key: "mixed", label: "Mixed", description: "Random mix of all challenge types" },
];

export default function ModeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            value === m.key
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 hover:border-gray-400"
          }`}
        >
          <div className="text-sm font-medium">{m.label}</div>
          <div
            className={`mt-1 text-xs ${
              value === m.key ? "text-gray-300" : "text-gray-500"
            }`}
          >
            {m.description}
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kalamquest/ModeSelector.jsx
git commit -m "feat(kalamquest): add ModeSelector component"
```

---

### Task 3: WordBlankDisplay Component

**Files:**
- Create: `src/components/kalamquest/WordBlankDisplay.jsx`

- [ ] **Step 1: Create the WordBlankDisplay component**

This shows an ayah with some words replaced by blank input fields (for typing mode) or underscores (for choices mode).

```jsx
// src/components/kalamquest/WordBlankDisplay.jsx
"use client";

import { useState } from "react";

/**
 * Display an ayah with blanked words.
 * - In choices mode: blanks show as underscores
 * - In typing mode: blanks show as inline inputs
 *
 * Props:
 *   display: [{ word, blanked }] from blankWords()
 *   answerMode: "choices" | "type"
 *   onTypingSubmit: (typedWords: string[]) => void — called when user submits typed answers
 *   disabled: boolean — whether inputs are disabled (after answering)
 *   revealWords: string[] | null — if set, show these as the correct words (after answering)
 *   revealCorrect: boolean — true if answer was correct
 */
export default function WordBlankDisplay({
  display,
  answerMode,
  onTypingSubmit,
  disabled,
  revealWords,
  revealCorrect,
}) {
  const blankCount = display.filter((w) => w.blanked).length;
  const [inputs, setInputs] = useState(() => Array(blankCount).fill(""));

  function handleInputChange(blankIdx, value) {
    setInputs((prev) => {
      const next = [...prev];
      next[blankIdx] = value;
      return next;
    });
  }

  function handleSubmit() {
    if (disabled) return;
    const filled = inputs.filter((s) => s.trim());
    if (filled.length < blankCount) return;
    onTypingSubmit(inputs);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  let blankIdx = 0;
  let revealIdx = 0;

  return (
    <div className="rounded-2xl border border-gray-200 p-6 text-center">
      <p className="mb-4 text-sm font-medium text-gray-500">
        Fill in the missing {blankCount === 1 ? "word" : "words"}
      </p>
      <div dir="rtl" lang="ar" className="font-arabic text-2xl leading-[2.6] sm:text-3xl">
        {display.map((item, i) => {
          if (!item.blanked) {
            return (
              <span key={i} className="mx-0.5">
                {item.word}
              </span>
            );
          }

          // Blanked word
          const currentBlankIdx = blankIdx++;
          const revealed = revealWords ? revealWords[revealIdx++] : null;

          if (revealed !== null && revealed !== undefined) {
            // Show revealed word after answering
            return (
              <span
                key={i}
                className={`mx-0.5 inline-block rounded px-2 ${
                  revealCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {revealed}
              </span>
            );
          }

          if (answerMode === "choices") {
            return (
              <span
                key={i}
                className="mx-0.5 inline-block border-b-2 border-dashed border-gray-400 px-4 text-gray-400"
              >
                ـــ
              </span>
            );
          }

          // Typing mode — inline input
          return (
            <input
              key={i}
              dir="rtl"
              lang="ar"
              type="text"
              value={inputs[currentBlankIdx]}
              onChange={(e) => handleInputChange(currentBlankIdx, e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="font-arabic mx-1 inline-block w-28 border-b-2 border-dashed border-gray-400 bg-transparent px-2 text-center text-2xl focus:border-gray-900 focus:outline-none disabled:opacity-50 sm:w-36 sm:text-3xl"
              placeholder="..."
            />
          );
        })}
      </div>

      {answerMode === "type" && !disabled && !revealWords && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={inputs.some((s) => !s.trim())}
            className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kalamquest/WordBlankDisplay.jsx
git commit -m "feat(kalamquest): add WordBlankDisplay component for ayah word blanks"
```

---

### Task 4: AyahGapDisplay Component

**Files:**
- Create: `src/components/kalamquest/AyahGapDisplay.jsx`

- [ ] **Step 1: Create the AyahGapDisplay component**

Shows a surah or page with one ayah replaced by a gap indicator.

```jsx
// src/components/kalamquest/AyahGapDisplay.jsx
"use client";

/**
 * Display a list of ayahs with one replaced by a gap marker.
 *
 * Props:
 *   contextAyahs: array from getContextAyahs() — objects are either
 *     verse objects or { gap: true, verseKey } for the missing slot
 *   label: string — e.g. "Surah Al-Fatiha" or "Page 604"
 *   useMushafLayout: boolean — if true, render inline (page style); else list (surah style)
 */
export default function AyahGapDisplay({ contextAyahs, label, useMushafLayout }) {
  if (useMushafLayout) {
    return (
      <div
        className="rounded-xl border-4 border-double p-4"
        style={{ borderColor: "#d4c8a0", background: "#f5f0e0" }}
      >
        <div
          className="relative rounded-lg border p-4"
          style={{ borderColor: "#e8dfc8", background: "#faf8f0" }}
        >
          <div
            className="pointer-events-none absolute inset-1 rounded border"
            style={{ borderColor: "#e8dfc8" }}
          />
          <div
            dir="rtl"
            lang="ar"
            className="font-arabic px-2 text-lg leading-[2.4] sm:text-xl"
            style={{ color: "#1a1a1a", textAlign: "justify" }}
          >
            {contextAyahs.map((item) =>
              item.gap ? (
                <span
                  key={item.verseKey}
                  className="mx-1 inline-block rounded border-2 border-dashed px-6 py-1 text-sm"
                  style={{ borderColor: "#c4b88a", color: "#8a7a5a" }}
                >
                  ؟
                </span>
              ) : (
                <span key={item.verseKey}>{item.textUthmani} </span>
              ),
            )}
          </div>
        </div>
        {label && (
          <div className="mt-3 flex justify-center">
            <span
              className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: "#c4b88a", color: "#8a7a5a" }}
            >
              {label}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Surah list layout
  return (
    <div className="rounded-2xl border border-gray-200 p-6 text-center">
      {label && (
        <p className="mb-4 text-sm font-medium text-gray-500">{label}</p>
      )}
      <div dir="rtl" lang="ar" className="font-arabic space-y-2 text-xl leading-relaxed sm:text-2xl">
        {contextAyahs.map((item) =>
          item.gap ? (
            <div
              key={item.verseKey}
              className="mx-auto rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-base text-gray-400"
            >
              ؟ ـــــــــــــ ؟
            </div>
          ) : (
            <p key={item.verseKey} className="px-2">
              {item.textUthmani}
            </p>
          ),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kalamquest/AyahGapDisplay.jsx
git commit -m "feat(kalamquest): add AyahGapDisplay component for surah/page gap display"
```

---

### Task 5: WordChoiceGrid Component

**Files:**
- Create: `src/components/kalamquest/WordChoiceGrid.jsx`

- [ ] **Step 1: Create the WordChoiceGrid component**

Shows 4 word/phrase choices for ayah mode.

```jsx
// src/components/kalamquest/WordChoiceGrid.jsx
"use client";

/**
 * Multiple choice grid for word-level blanks.
 *
 * Props:
 *   choices: string[] — 4 word/phrase options
 *   correctAnswer: string — the correct word(s)
 *   selectedAnswer: string | null — user's selection
 *   onSelect: (answer: string) => void
 *   eliminatedAnswers: string[] — 50/50 eliminated options
 */
export default function WordChoiceGrid({
  choices,
  correctAnswer,
  selectedAnswer,
  onSelect,
  eliminatedAnswers = [],
}) {
  function getState(choice) {
    if (!selectedAnswer) return "default";
    if (choice === selectedAnswer && choice === correctAnswer) return "correct";
    if (choice === selectedAnswer && choice !== correctAnswer) return "incorrect";
    if (choice === correctAnswer) return "reveal";
    return "default";
  }

  const styles = {
    default: "border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer",
    correct: "border-green-500 bg-green-50",
    incorrect: "border-red-500 bg-red-50",
    reveal: "border-green-500 bg-green-50 opacity-60",
  };

  const visibleChoices = eliminatedAnswers.length > 0
    ? choices.filter((c) => !eliminatedAnswers.includes(c))
    : choices;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleChoices.map((choice, i) => {
        const state = getState(choice);
        return (
          <button
            key={i}
            onClick={() => onSelect(choice)}
            disabled={state !== "default"}
            className={`w-full rounded-xl border p-4 text-center transition-colors ${styles[state]}`}
          >
            <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
              {choice}
            </p>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kalamquest/WordChoiceGrid.jsx
git commit -m "feat(kalamquest): add WordChoiceGrid component for word-level choices"
```

---

### Task 6: KalamQuestHintBar Component

**Files:**
- Create: `src/components/kalamquest/KalamQuestHintBar.jsx`

- [ ] **Step 1: Create the KalamQuestHintBar component**

```jsx
// src/components/kalamquest/KalamQuestHintBar.jsx
"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

/**
 * Hint bar for KalamQuest.
 *
 * Props:
 *   chapterId: number
 *   surahRevealed: boolean
 *   onRevealSurah: () => void
 *   fiftyFiftyRemaining: number
 *   fiftyFiftyDisabled: boolean
 *   fiftyFiftyHidden: boolean — hide 50/50 in typing mode
 *   onFiftyFifty: () => void
 */
export default function KalamQuestHintBar({
  chapterId,
  surahRevealed,
  onRevealSurah,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  fiftyFiftyHidden,
  onFiftyFifty,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        {surahRevealed ? (
          <span className="text-sm font-medium text-gray-700">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onRevealSurah}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Reveal Surah
          </button>
        )}
      </div>

      {!fiftyFiftyHidden && (
        <button
          onClick={onFiftyFifty}
          disabled={fiftyFiftyDisabled}
          className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
            fiftyFiftyDisabled
              ? "cursor-not-allowed border border-gray-100 text-gray-300"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          50/50 ({fiftyFiftyRemaining})
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kalamquest/KalamQuestHintBar.jsx
git commit -m "feat(kalamquest): add KalamQuestHintBar component"
```

---

### Task 7: Settings Screen

**Files:**
- Create: `src/app/kalamquest/page.js`

- [ ] **Step 1: Create the settings page**

```jsx
// src/app/kalamquest/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";
import DifficultySelector from "@/components/ayahflow/DifficultySelector";
import AnswerModeSelector from "@/components/ayahflow/AnswerModeSelector";
import DisplayOptionsSelector from "@/components/ayahflow/DisplayOptionsSelector";
import ModeSelector from "@/components/kalamquest/ModeSelector";
import BackButton from "@/components/BackButton";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

export default function KalamQuestSetup() {
  const router = useRouter();
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [gameMode, setGameMode] = useState("ayah");
  const [difficulty, setDifficulty] = useState("easy");
  const [answerMode, setAnswerMode] = useState("choices");
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);

  function handleStart() {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeValues: scope.values.join(","),
      gameMode,
      difficulty,
      answerMode,
      translation: translationEnabled ? translationId : "off",
      transliteration: transliterationEnabled ? "on" : "off",
    });
    router.push(`/kalamquest/play?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />
      <h1 className="mt-4 text-3xl font-bold">KalamQuest</h1>
      <p className="mt-1 text-gray-500">
        Fill in the missing words or ayahs to test your memorization
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Scope
          </h2>
          <ScopeSelector value={scope} onChange={setScope} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Game Mode
          </h2>
          <ModeSelector value={gameMode} onChange={setGameMode} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Difficulty
          </h2>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Answer Mode
          </h2>
          <AnswerModeSelector value={answerMode} onChange={setAnswerMode} />
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Display Options
          </h2>
          <p className="mb-3 mt-1 text-xs text-gray-400">
            Choose what to show alongside the Arabic text
          </p>
          <DisplayOptionsSelector
            translationEnabled={translationEnabled}
            onTranslationEnabledChange={setTranslationEnabled}
            translationId={translationId}
            onTranslationIdChange={setTranslationId}
            transliterationEnabled={transliterationEnabled}
            onTransliterationEnabledChange={setTransliterationEnabled}
          />
        </section>

        <button
          onClick={handleStart}
          disabled={scope.values.length === 0}
          className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start Quest
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/kalamquest/page.js
git commit -m "feat(kalamquest): add settings screen"
```

---

### Task 8: Game Screen

**Files:**
- Create: `src/app/kalamquest/play/page.js`

This is the largest task — the main game loop.

- [ ] **Step 1: Create the play page**

```jsx
// src/app/kalamquest/play/page.js
"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope } from "@/lib/fetch-verses";
import { fetchVersesForPage } from "@/lib/fetch-chapters";
import { shuffle } from "@/lib/game-engine";
import { diffWords } from "@/lib/normalize-arabic";
import { SURAH_NAMES } from "@/lib/quran-data";
import {
  createKalamQuestQueue,
  blankWords,
  generateAyahDistractors,
  generateWordDistractors,
  getContextAyahs,
  checkWordAnswer,
} from "@/lib/kalamquest-engine";
import WordBlankDisplay from "@/components/kalamquest/WordBlankDisplay";
import AyahGapDisplay from "@/components/kalamquest/AyahGapDisplay";
import WordChoiceGrid from "@/components/kalamquest/WordChoiceGrid";
import KalamQuestHintBar from "@/components/kalamquest/KalamQuestHintBar";
import ChoiceGrid from "@/components/ayahflow/ChoiceGrid";
import TypingInput from "@/components/ayahflow/TypingInput";
import DiffView from "@/components/ayahflow/DiffView";
import AnswerModeToggle from "@/components/ayahflow/AnswerModeToggle";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

const CORRECT_DELAY_MS = 1200;
const WRONG_DELAY_MS = 2500;

function KalamQuestGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const gameMode = searchParams.get("gameMode") ?? "ayah";
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const initialAnswerMode = searchParams.get("answerMode") ?? "choices";
  const translationParam = searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID;
  const transliterationParam = searchParams.get("transliteration") === "on";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verses, setVerses] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [answerMode, setAnswerMode] = useState(initialAnswerMode);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [surahRevealed, setSurahRevealed] = useState(false);
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
  const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);
  const [currentMode, setCurrentMode] = useState(null);

  // Ayah mode state
  const [wordDisplay, setWordDisplay] = useState(null);
  const [blankedWords, setBlankedWords] = useState([]);
  const [blankedIndices, setBlankedIndices] = useState([]);
  const [wordChoices, setWordChoices] = useState([]);
  const [selectedWordAnswer, setSelectedWordAnswer] = useState(null);
  const [wordReveal, setWordReveal] = useState(null);
  const [wordRevealCorrect, setWordRevealCorrect] = useState(false);
  const [eliminatedWordAnswers, setEliminatedWordAnswers] = useState([]);

  // Surah/page mode state
  const [contextAyahs, setContextAyahs] = useState([]);
  const [gapVerse, setGapVerse] = useState(null);
  const [ayahChoices, setAyahChoices] = useState([]);
  const [selectedAyahKey, setSelectedAyahKey] = useState(null);
  const [eliminatedAyahKeys, setEliminatedAyahKeys] = useState([]);
  const [typingDiff, setTypingDiff] = useState(null);
  const [contextLabel, setContextLabel] = useState("");
  const [useMushafLayout, setUseMushafLayout] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState(null);

  const pageVerseCacheRef = useRef({});

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/kalamquest");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(scopeType, scopeValues, translationParam === "off" ? DEFAULT_TRANSLATION_ID : translationParam);
        setVerses(result.verses);

        const queue = createKalamQuestQueue(result.verses, gameMode);
        setPromptQueue(queue);
        setPromptIndex(0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getPageVersesCached = useCallback(async (pageNum) => {
    if (pageVerseCacheRef.current[pageNum]) {
      return pageVerseCacheRef.current[pageNum];
    }
    const pv = await fetchVersesForPage(pageNum);
    pageVerseCacheRef.current[pageNum] = pv;
    return pv;
  }, []);

  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    async function buildRound() {
      const prompt = promptQueue[promptIndex];
      const mode = prompt.type;
      setCurrentMode(mode);
      setSurahRevealed(false);
      setFiftyFiftyUsedThisRound(false);
      setSelectedWordAnswer(null);
      setWordReveal(null);
      setWordRevealCorrect(false);
      setEliminatedWordAnswers([]);
      setSelectedAyahKey(null);
      setEliminatedAyahKeys([]);
      setTypingDiff(null);

      if (mode === "ayah") {
        // Pick a verse (from the prompt or random from scope)
        const verse = prompt.verse || verses[Math.floor(Math.random() * verses.length)];
        setCurrentChapterId(verse.chapterId);

        const { display, blankedWords: bw, blankedIndices: bi } = blankWords(verse.textUthmani, difficulty);
        setWordDisplay(display);
        setBlankedWords(bw);
        setBlankedIndices(bi);

        // Generate word distractors for choices mode
        const distractors = generateWordDistractors(bw, bi, verses, verse.verseKey);
        const correctAnswer = bw.join(" ");
        const allChoices = shuffle([correctAnswer, ...distractors]);
        setWordChoices(allChoices);

        // Clear surah/page state
        setContextAyahs([]);
        setGapVerse(null);
        setAyahChoices([]);
      } else if (mode === "surah") {
        const surahId = prompt.surahId;
        setCurrentChapterId(surahId);
        const surahVerses = verses.filter((v) => v.chapterId === surahId);
        if (surahVerses.length === 0) return;

        const gapIdx = Math.floor(Math.random() * surahVerses.length);
        const gapV = surahVerses[gapIdx];
        setGapVerse(gapV);

        const context = getContextAyahs(surahVerses, gapIdx, difficulty);
        setContextAyahs(context);
        setContextLabel(`Surah ${SURAH_NAMES[surahId]}`);
        setUseMushafLayout(false);

        const distractors = generateAyahDistractors(gapV, difficulty, verses, surahVerses);
        const choices = shuffle([gapV, ...distractors]);
        setAyahChoices(choices);

        // Clear ayah mode state
        setWordDisplay(null);
        setBlankedWords([]);
        setBlankedIndices([]);
        setWordChoices([]);
      } else if (mode === "page") {
        const pageNum = prompt.pageNumber;
        let pageVerses;
        try {
          pageVerses = await getPageVersesCached(pageNum);
        } catch {
          // Fallback: use verses from scope that are on this page
          pageVerses = verses.filter((v) => v.pageNumber === pageNum);
        }
        if (pageVerses.length === 0) return;

        const gapIdx = Math.floor(Math.random() * pageVerses.length);
        const gapV = pageVerses[gapIdx];
        setGapVerse(gapV);
        setCurrentChapterId(gapV.chapterId);

        const context = getContextAyahs(pageVerses, gapIdx, difficulty);
        setContextAyahs(context);
        setContextLabel(`Page ${pageNum}`);
        setUseMushafLayout(true);

        const surahVerses = verses.filter((v) => v.chapterId === gapV.chapterId);
        const distractors = generateAyahDistractors(gapV, difficulty, verses, surahVerses);
        const choices = shuffle([gapV, ...distractors]);
        setAyahChoices(choices);

        // Clear ayah mode state
        setWordDisplay(null);
        setBlankedWords([]);
        setBlankedIndices([]);
        setWordChoices([]);
      }
    }

    buildRound();
  }, [promptQueue, promptIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createKalamQuestQueue(verses, gameMode);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
    }
  }

  // --- Ayah mode handlers ---
  function handleWordChoiceSelect(answer) {
    if (selectedWordAnswer !== null) return;
    setSelectedWordAnswer(answer);

    const correctAnswer = blankedWords.join(" ");
    const isCorrect = answer === correctAnswer;
    setWordReveal(blankedWords);
    setWordRevealCorrect(isCorrect);
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(advance, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  function handleWordTypingSubmit(typedWords) {
    const isCorrect = checkWordAnswer(typedWords, blankedWords);
    setWordReveal(isCorrect ? blankedWords : blankedWords);
    setWordRevealCorrect(isCorrect);
    setSelectedWordAnswer("__submitted__");
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(advance, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  // --- Surah/page mode handlers ---
  function handleAyahChoiceSelect(verseKey) {
    if (selectedAyahKey !== null) return;
    setSelectedAyahKey(verseKey);

    const isCorrect = verseKey === gapVerse.verseKey;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(advance, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  function handleAyahTypingSubmit(typedText) {
    if (selectedAyahKey !== null) return;

    const result = diffWords(typedText, gapVerse.textUthmani);

    if (result.isMatch) {
      setSelectedAyahKey(gapVerse.verseKey);
      setScore((prev) => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
      }));
      setTimeout(advance, CORRECT_DELAY_MS);
    } else {
      setSelectedAyahKey("__wrong__");
      setTypingDiff(result);
      setScore((prev) => ({
        correct: prev.correct,
        total: prev.total + 1,
      }));
      setTimeout(advance, WRONG_DELAY_MS);
    }
  }

  // --- 50/50 ---
  function handleFiftyFifty() {
    if (fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0) return;

    if (currentMode === "ayah") {
      if (selectedWordAnswer !== null) return;
      const correctAnswer = blankedWords.join(" ");
      const incorrect = wordChoices.filter(
        (c) => c !== correctAnswer && !eliminatedWordAnswers.includes(c),
      );
      const toEliminate = shuffle([...incorrect]).slice(0, 2);
      setEliminatedWordAnswers((prev) => [...prev, ...toEliminate]);
    } else {
      if (selectedAyahKey !== null) return;
      const incorrect = ayahChoices.filter(
        (c) => c.verseKey !== gapVerse.verseKey && !eliminatedAyahKeys.includes(c.verseKey),
      );
      const toEliminate = shuffle([...incorrect])
        .slice(0, 2)
        .map((c) => c.verseKey);
      setEliminatedAyahKeys((prev) => [...prev, ...toEliminate]);
    }

    setFiftyFiftyUsedThisRound(true);
    setFiftyFiftyRemaining((prev) => prev - 1);
  }

  // --- Render ---
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    const pct =
      score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Session Complete</h2>
          <p className="mt-4 text-4xl font-bold">
            {score.correct}/{score.total}
          </p>
          <p className="mt-1 text-gray-500">{pct}% accuracy</p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                setShowResults(false);
                setScore({ correct: 0, total: 0 });
                setFiftyFiftyRemaining(3);
                const newQueue = createKalamQuestQueue(verses, gameMode);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push("/kalamquest")}
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAyahMode = currentMode === "ayah";
  const hasQuestion = isAyahMode ? wordDisplay !== null : contextAyahs.length > 0;
  if (!hasQuestion) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton />
      <div className="mt-4 mb-6 flex items-center justify-between">
        <ScoreCounter correct={score.correct} total={score.total} />
        <div className="flex items-center gap-3">
          {currentMode && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {currentMode}
            </span>
          )}
          <button
            onClick={() => setShowResults(true)}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm hover:bg-gray-50"
          >
            End
          </button>
        </div>
      </div>

      {/* Question display */}
      <div className="mb-4">
        {isAyahMode ? (
          <WordBlankDisplay
            display={wordDisplay}
            answerMode={answerMode}
            onTypingSubmit={handleWordTypingSubmit}
            disabled={selectedWordAnswer !== null}
            revealWords={wordReveal}
            revealCorrect={wordRevealCorrect}
          />
        ) : (
          <AyahGapDisplay
            contextAyahs={contextAyahs}
            label={contextLabel}
            useMushafLayout={useMushafLayout}
          />
        )}
      </div>

      {/* Hint bar */}
      {currentChapterId && (
        <div className="mb-4">
          <KalamQuestHintBar
            chapterId={currentChapterId}
            surahRevealed={surahRevealed}
            onRevealSurah={() => setSurahRevealed(true)}
            fiftyFiftyRemaining={fiftyFiftyRemaining}
            fiftyFiftyDisabled={
              fiftyFiftyUsedThisRound ||
              fiftyFiftyRemaining <= 0 ||
              (isAyahMode ? selectedWordAnswer !== null : selectedAyahKey !== null)
            }
            fiftyFiftyHidden={answerMode === "type"}
            onFiftyFifty={handleFiftyFifty}
          />
        </div>
      )}

      {/* Answer mode toggle */}
      <div className="mb-4">
        <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
      </div>

      {/* Answer area */}
      <div>
        {isAyahMode ? (
          // Ayah mode: word choices or typing (typing is handled inside WordBlankDisplay)
          answerMode === "choices" ? (
            <WordChoiceGrid
              choices={wordChoices}
              correctAnswer={blankedWords.join(" ")}
              selectedAnswer={selectedWordAnswer}
              onSelect={handleWordChoiceSelect}
              eliminatedAnswers={eliminatedWordAnswers}
            />
          ) : null /* typing inputs are in WordBlankDisplay above */
        ) : (
          // Surah/page mode: ayah choices or typing
          answerMode === "choices" ? (
            <ChoiceGrid
              choices={ayahChoices}
              correctKey={gapVerse?.verseKey}
              selectedKey={selectedAyahKey}
              onSelect={handleAyahChoiceSelect}
              eliminatedKeys={eliminatedAyahKeys}
              showTranslation={translationParam !== "off"}
              showTransliteration={transliterationParam}
            />
          ) : typingDiff ? (
            <DiffView diff={typingDiff} />
          ) : selectedAyahKey && selectedAyahKey !== "__wrong__" ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed text-green-700">
                {gapVerse?.textUthmani}
              </p>
              <p className="mt-2 text-sm text-green-600">Correct!</p>
            </div>
          ) : (
            <TypingInput
              onSubmit={handleAyahTypingSubmit}
              disabled={selectedAyahKey !== null}
            />
          )
        )}
      </div>
    </div>
  );
}

export default function KalamQuestGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }
    >
      <KalamQuestGameInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/kalamquest/play/page.js
git commit -m "feat(kalamquest): add game screen with all three modes"
```

---

### Task 9: Register on Home Page

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add KalamQuest GameCard to the home page**

In `src/app/page.js`, after the SurahSense GameCard (line 19), add:

```jsx
        <GameCard
          title="KalamQuest"
          description="Fill in the missing words or ayahs to test your memorization."
          href="/kalamquest"
        />
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.js
git commit -m "feat(kalamquest): add game card to home page"
```

---

### Task 10: Smoke Test & Fix

**Files:**
- All KalamQuest files

- [ ] **Step 1: Start the dev server and verify no build errors**

Run: `npm run dev`

Check the terminal output for any compilation errors. Fix any import issues or typos.

- [ ] **Step 2: Navigate to http://localhost:3000 and verify the GameCard appears**

The home page should show three game cards: AyahFlow, SurahSense, and KalamQuest.

- [ ] **Step 3: Navigate to /kalamquest and verify the settings page renders**

All selectors (scope, mode, difficulty, answer mode, display options) should render and be interactive.

- [ ] **Step 4: Select a scope (e.g., Surah Al-Fatiha) and start a game in each mode**

Test each mode:
1. Complete Ayah (choices) — verify word blanks appear and choices work
2. Complete Ayah (typing) — verify inline inputs appear and submit works
3. Complete Surah (choices) — verify surah context with gap renders, ayah choices work
4. Complete Page (choices) — verify mushaf layout with gap renders
5. Mixed — verify modes alternate

- [ ] **Step 5: Fix any issues found during testing**

Common issues to check:
- Imports resolving correctly (path aliases)
- State resets between rounds (no stale data)
- 50/50 working for both word and ayah choices
- Score incrementing correctly
- Results screen showing and play again working

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(kalamquest): fix issues found during smoke testing"
```
