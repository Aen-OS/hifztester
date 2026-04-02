# TartibBlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a TartibBlock game where users reorder scrambled blocks (words within an ayah, or ayahs within a surah/page) into the correct sequence.

**Architecture:** Three game modes (ayah/surah/page + mixed) with a sortable block list supporting drag-and-drop (desktop) and tap-to-swap (mobile). Follows the same settings → play page pattern as other games.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, native HTML5 drag-and-drop API

---

## File Structure

```
src/lib/tartibblock-engine.js                    — Game logic (create)
src/components/tartibblock/ModeSelector.jsx       — 4-option mode picker (create)
src/components/tartibblock/BlockItem.jsx          — Single draggable/tappable block (create)
src/components/tartibblock/SortableBlockList.jsx  — Reorderable block list (create)
src/components/tartibblock/TartibBlockHintBar.jsx — Hint bar (create)
src/app/tartibblock/page.js                       — Settings screen (create)
src/app/tartibblock/play/page.js                  — Game screen (create)
src/app/page.js                                   — Home page (modify: add GameCard)
```

---

### Task 1: Game Engine — `tartibblock-engine.js`

**Files:**
- Create: `src/lib/tartibblock-engine.js`

- [ ] **Step 1: Create the engine file with all functions**

```js
// src/lib/tartibblock-engine.js
import { shuffle } from "@/lib/game-engine";

/**
 * Build a shuffled prompt queue for TartibBlock.
 * - ayah mode: each verse is a prompt (user reorders word blocks)
 * - surah mode: each unique surah becomes a prompt (user reorders ayah blocks)
 * - page mode: each unique page becomes a prompt (user reorders ayah blocks)
 * - mixed: each verse is a prompt, with a random mode assigned per round
 */
export function createTartibBlockQueue(verses, mode) {
  if (mode === "surah") {
    const surahIds = [...new Set(verses.map((v) => v.chapterId))];
    return shuffle([...surahIds]).map((id) => ({ type: "surah", surahId: id }));
  }
  if (mode === "page") {
    const pageNums = [...new Set(verses.map((v) => v.pageNumber))];
    return shuffle([...pageNums]).map((p) => ({ type: "page", pageNumber: p }));
  }
  const modes = ["ayah", "surah", "page"];
  return shuffle([...verses]).map((v) => ({
    type: mode === "mixed" ? modes[Math.floor(Math.random() * modes.length)] : "ayah",
    verse: v,
    surahId: v.chapterId,
    pageNumber: v.pageNumber,
  }));
}

/**
 * Split an ayah's text into word-group blocks based on difficulty.
 * Easy: 3-4 groups, Medium: 5-7 groups, Hard: one word per block.
 * Returns [{ id, text, correctIndex }]
 */
export function splitAyahIntoBlocks(ayahText, difficulty) {
  const words = ayahText.trim().split(/\s+/);
  if (words.length === 0) return [];

  let targetGroups;
  switch (difficulty) {
    case "easy":
      targetGroups = Math.min(words.length, 3 + Math.floor(Math.random() * 2)); // 3-4
      break;
    case "medium":
      targetGroups = Math.min(words.length, 5 + Math.floor(Math.random() * 3)); // 5-7
      break;
    case "hard":
      targetGroups = words.length; // every word
      break;
    default:
      targetGroups = Math.min(words.length, 4);
  }

  // Distribute words evenly across groups
  const baseSize = Math.floor(words.length / targetGroups);
  const remainder = words.length % targetGroups;
  const blocks = [];
  let idx = 0;

  for (let g = 0; g < targetGroups; g++) {
    const size = baseSize + (g < remainder ? 1 : 0);
    const text = words.slice(idx, idx + size).join(" ");
    blocks.push({ id: `block-${g}`, text, correctIndex: g });
    idx += size;
  }

  return blocks;
}

/**
 * Select a subset of ayahs as blocks for surah/page mode.
 * Easy: 3-4 ayahs, Medium: 5-7, Hard: all.
 * If the source has fewer ayahs than the target, uses all.
 * Returns [{ id, verse, correctIndex }]
 */
export function selectAyahBlocks(verses, difficulty) {
  let count;
  switch (difficulty) {
    case "easy":
      count = 3 + Math.floor(Math.random() * 2); // 3-4
      break;
    case "medium":
      count = 5 + Math.floor(Math.random() * 3); // 5-7
      break;
    case "hard":
      count = verses.length;
      break;
    default:
      count = 4;
  }

  // For easy/medium, pick a consecutive run to preserve meaningful ordering
  const selected =
    count >= verses.length
      ? verses
      : (() => {
          const maxStart = verses.length - count;
          const start = Math.floor(Math.random() * (maxStart + 1));
          return verses.slice(start, start + count);
        })();

  return selected.map((v, i) => ({
    id: `block-${i}`,
    verse: v,
    correctIndex: i,
  }));
}

/**
 * Scramble blocks ensuring the result differs from the correct order.
 * Returns a new array (does not mutate input).
 */
export function scrambleBlocks(blocks) {
  if (blocks.length <= 1) return [...blocks];

  let scrambled = shuffle([...blocks]);
  // Re-shuffle if the scrambled order is identical to the original
  let attempts = 0;
  while (
    attempts < 10 &&
    scrambled.every((b, i) => b.correctIndex === i)
  ) {
    scrambled = shuffle([...scrambled]);
    attempts++;
  }

  return scrambled;
}

/**
 * Score the user's arrangement against the correct order.
 * `userOrder` is the array of blocks in the user's current order.
 * Returns { correctCount, totalCount, percentage, results }
 * where results is [{ block, isCorrect }].
 */
export function scoreArrangement(userOrder) {
  const results = userOrder.map((block, i) => ({
    block,
    isCorrect: block.correctIndex === i,
  }));

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return { correctCount, totalCount, percentage, results };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/tartibblock-engine.js
git commit -m "feat(tartibblock): add game engine with block splitting, scrambling, and scoring"
```

---

### Task 2: BlockItem Component

**Files:**
- Create: `src/components/tartibblock/BlockItem.jsx`

- [ ] **Step 1: Create the BlockItem component**

```jsx
// src/components/tartibblock/BlockItem.jsx
"use client";

/**
 * A single block in the sortable list.
 *
 * Props:
 *   text: string — Arabic text to display
 *   translation: string | null — optional translation
 *   transliteration: string | null — optional transliteration
 *   state: "default" | "dragging" | "selected" | "correct" | "incorrect"
 *   showTranslation: boolean
 *   showTransliteration: boolean
 *   onTap: () => void — called when block is tapped (mobile swap)
 *   onDragStart: (e) => void
 *   onDragOver: (e) => void
 *   onDrop: (e) => void
 *   onDragEnd: (e) => void
 *   draggable: boolean
 */
export default function BlockItem({
  text,
  translation,
  transliteration,
  state = "default",
  showTranslation = false,
  showTransliteration = false,
  onTap,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggable = true,
}) {
  const styles = {
    default: "border-gray-200 bg-white hover:border-gray-400",
    dragging: "border-gray-400 bg-gray-50 opacity-50",
    selected: "border-blue-500 bg-blue-50 ring-2 ring-blue-200",
    correct: "border-green-500 bg-green-50",
    incorrect: "border-red-500 bg-red-50",
  };

  const icons = {
    correct: "✓",
    incorrect: "✗",
  };

  return (
    <div
      draggable={draggable && state !== "correct" && state !== "incorrect"}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onTap}
      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors cursor-grab active:cursor-grabbing ${styles[state]}`}
    >
      {/* Drag handle or result icon */}
      <span className="flex-shrink-0 text-gray-400 select-none">
        {state === "correct" ? (
          <span className="text-green-600 font-bold">{icons.correct}</span>
        ) : state === "incorrect" ? (
          <span className="text-red-600 font-bold">{icons.incorrect}</span>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        )}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
          {text}
        </p>
        {showTransliteration && transliteration && (
          <p className="mt-1 text-xs italic text-gray-500 truncate">
            {transliteration}
          </p>
        )}
        {showTranslation && translation && (
          <p className="mt-1 text-sm text-gray-500 truncate">
            {translation}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tartibblock/BlockItem.jsx
git commit -m "feat(tartibblock): add BlockItem component with drag handle and states"
```

---

### Task 3: SortableBlockList Component

**Files:**
- Create: `src/components/tartibblock/SortableBlockList.jsx`

- [ ] **Step 1: Create the SortableBlockList component**

```jsx
// src/components/tartibblock/SortableBlockList.jsx
"use client";

import { useState, useRef, useCallback } from "react";
import BlockItem from "./BlockItem";

/**
 * A reorderable list of blocks supporting:
 * - Desktop: HTML5 drag-and-drop
 * - Mobile: tap-to-select, tap-to-swap
 *
 * Props:
 *   blocks: [{ id, text, correctIndex, verse? }] — current order
 *   onReorder: (newBlocks) => void — called when order changes
 *   results: [{ block, isCorrect }] | null — after scoring, show green/red
 *   disabled: boolean — prevent interaction (after submit)
 *   showTranslation: boolean
 *   showTransliteration: boolean
 */
export default function SortableBlockList({
  blocks,
  onReorder,
  results = null,
  disabled = false,
  showTranslation = false,
  showTransliteration = false,
}) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const dragOverIdx = useRef(null);

  // --- Drag and Drop ---
  const handleDragStart = useCallback(
    (e, idx) => {
      if (disabled) return;
      setDragIdx(idx);
      e.dataTransfer.effectAllowed = "move";
      // Required for Firefox
      e.dataTransfer.setData("text/plain", idx.toString());
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e, idx) => {
      if (disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      dragOverIdx.current = idx;
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e, idx) => {
      if (disabled || dragIdx === null) return;
      e.preventDefault();

      const from = dragIdx;
      const to = idx;
      if (from === to) {
        setDragIdx(null);
        return;
      }

      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(from, 1);
      newBlocks.splice(to, 0, moved);
      onReorder(newBlocks);
      setDragIdx(null);
    },
    [disabled, dragIdx, blocks, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  // --- Tap to Swap ---
  const handleTap = useCallback(
    (idx) => {
      if (disabled) return;

      if (selectedIdx === null) {
        // First tap: select this block
        setSelectedIdx(idx);
      } else if (selectedIdx === idx) {
        // Tap same block: deselect
        setSelectedIdx(null);
      } else {
        // Second tap: swap positions
        const newBlocks = [...blocks];
        [newBlocks[selectedIdx], newBlocks[idx]] = [
          newBlocks[idx],
          newBlocks[selectedIdx],
        ];
        onReorder(newBlocks);
        setSelectedIdx(null);
      }
    },
    [disabled, selectedIdx, blocks, onReorder],
  );

  function getState(idx) {
    if (results) {
      return results[idx].isCorrect ? "correct" : "incorrect";
    }
    if (dragIdx === idx) return "dragging";
    if (selectedIdx === idx) return "selected";
    return "default";
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, idx) => {
        const text = block.text || block.verse?.textUthmani || "";
        const translation = block.verse?.translation || null;
        const transliteration = block.verse?.transliteration || null;

        return (
          <BlockItem
            key={block.id}
            text={text}
            translation={translation}
            transliteration={transliteration}
            state={getState(idx)}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
            onTap={() => handleTap(idx)}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            draggable={!disabled}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tartibblock/SortableBlockList.jsx
git commit -m "feat(tartibblock): add SortableBlockList with drag-and-drop and tap-to-swap"
```

---

### Task 4: ModeSelector and TartibBlockHintBar Components

**Files:**
- Create: `src/components/tartibblock/ModeSelector.jsx`
- Create: `src/components/tartibblock/TartibBlockHintBar.jsx`

- [ ] **Step 1: Create the ModeSelector component**

```jsx
// src/components/tartibblock/ModeSelector.jsx
"use client";

const MODES = [
  { key: "ayah", label: "Organise Ayah", description: "Reorder scrambled words within an ayah" },
  { key: "surah", label: "Organise Surah", description: "Reorder scrambled ayahs in a surah" },
  { key: "page", label: "Organise Page", description: "Reorder scrambled ayahs on a page" },
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

- [ ] **Step 2: Create the TartibBlockHintBar component**

```jsx
// src/components/tartibblock/TartibBlockHintBar.jsx
"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

/**
 * Hint bar for TartibBlock.
 * Shows page number by default in hard mode. Reveal surah button as hint.
 *
 * Props:
 *   chapterId: number
 *   pageNumber: number | null
 *   difficulty: string
 *   surahRevealed: boolean
 *   onRevealSurah: () => void
 */
export default function TartibBlockHintBar({
  chapterId,
  pageNumber,
  difficulty,
  surahRevealed,
  onRevealSurah,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        {difficulty === "hard" && pageNumber && (
          <>
            <span className="text-sm font-medium text-gray-700">
              Page {pageNumber}
            </span>
            <span className="text-gray-300">|</span>
          </>
        )}

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
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/tartibblock/ModeSelector.jsx src/components/tartibblock/TartibBlockHintBar.jsx
git commit -m "feat(tartibblock): add ModeSelector and TartibBlockHintBar components"
```

---

### Task 5: Settings Screen

**Files:**
- Create: `src/app/tartibblock/page.js`

- [ ] **Step 1: Create the settings page**

```jsx
// src/app/tartibblock/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";
import DifficultySelector from "@/components/ayahflow/DifficultySelector";
import DisplayOptionsSelector from "@/components/ayahflow/DisplayOptionsSelector";
import ModeSelector from "@/components/tartibblock/ModeSelector";
import BackButton from "@/components/BackButton";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

export default function TartibBlockSetup() {
  const router = useRouter();
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [gameMode, setGameMode] = useState("ayah");
  const [difficulty, setDifficulty] = useState("easy");
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);

  function handleStart() {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeValues: scope.values.join(","),
      gameMode,
      difficulty,
      translation: translationEnabled ? translationId : "off",
      transliteration: transliterationEnabled ? "on" : "off",
    });
    router.push(`/tartibblock/play?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />
      <h1 className="mt-4 text-3xl font-bold">TartibBlock</h1>
      <p className="mt-1 text-gray-500">
        Arrange scrambled words or ayahs into the correct order
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
          Start
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/tartibblock/page.js
git commit -m "feat(tartibblock): add settings screen"
```

---

### Task 6: Game Screen

**Files:**
- Create: `src/app/tartibblock/play/page.js`

- [ ] **Step 1: Create the play page**

```jsx
// src/app/tartibblock/play/page.js
"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope } from "@/lib/fetch-verses";
import { fetchVersesForPage } from "@/lib/fetch-chapters";
import { SURAH_NAMES } from "@/lib/quran-data";
import {
  createTartibBlockQueue,
  splitAyahIntoBlocks,
  selectAyahBlocks,
  scrambleBlocks,
  scoreArrangement,
} from "@/lib/tartibblock-engine";
import SortableBlockList from "@/components/tartibblock/SortableBlockList";
import TartibBlockHintBar from "@/components/tartibblock/TartibBlockHintBar";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

const FEEDBACK_DELAY_MS = 2500;
const REVEAL_DELAY_MS = 2000;

function TartibBlockGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const gameMode = searchParams.get("gameMode") ?? "ayah";
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const translationParam = searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID;
  const transliterationParam = searchParams.get("transliteration") === "on";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verses, setVerses] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState(null);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [currentPageNumber, setCurrentPageNumber] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showingCorrect, setShowingCorrect] = useState(false);
  const [correctOrder, setCorrectOrder] = useState([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [surahRevealed, setSurahRevealed] = useState(false);
  const [roundLabel, setRoundLabel] = useState("");

  const pageVerseCacheRef = useRef({});

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/tartibblock");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(
          scopeType,
          scopeValues,
          translationParam === "off" ? DEFAULT_TRANSLATION_ID : translationParam,
        );
        setVerses(result.verses);

        const queue = createTartibBlockQueue(result.verses, gameMode);
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
      setSubmitted(false);
      setResults(null);
      setShowingCorrect(false);
      setSurahRevealed(false);

      if (mode === "ayah") {
        const verse = prompt.verse || verses[Math.floor(Math.random() * verses.length)];
        setCurrentChapterId(verse.chapterId);
        setCurrentPageNumber(verse.pageNumber);
        setRoundLabel("Arrange the words in order");

        const rawBlocks = splitAyahIntoBlocks(verse.textUthmani, difficulty);
        const correct = [...rawBlocks];
        setCorrectOrder(correct);
        setBlocks(scrambleBlocks(rawBlocks));
      } else if (mode === "surah") {
        const surahId = prompt.surahId;
        setCurrentChapterId(surahId);
        const surahVerses = verses.filter((v) => v.chapterId === surahId);
        if (surahVerses.length === 0) return;
        setCurrentPageNumber(surahVerses[0].pageNumber);
        setRoundLabel(`Arrange the ayahs of Surah ${SURAH_NAMES[surahId]}`);

        const rawBlocks = selectAyahBlocks(surahVerses, difficulty);
        const correct = [...rawBlocks];
        setCorrectOrder(correct);
        setBlocks(scrambleBlocks(rawBlocks));
      } else if (mode === "page") {
        const pageNum = prompt.pageNumber;
        setCurrentPageNumber(pageNum);
        let pageVerses;
        try {
          pageVerses = await getPageVersesCached(pageNum);
        } catch {
          pageVerses = verses.filter((v) => v.pageNumber === pageNum);
        }
        if (pageVerses.length === 0) return;
        setCurrentChapterId(pageVerses[0].chapterId);
        setRoundLabel(`Arrange the ayahs on Page ${pageNum}`);

        const rawBlocks = selectAyahBlocks(pageVerses, difficulty);
        const correct = [...rawBlocks];
        setCorrectOrder(correct);
        setBlocks(scrambleBlocks(rawBlocks));
      }
    }

    buildRound();
  }, [promptQueue, promptIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createTartibBlockQueue(verses, gameMode);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
    }
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);

    const result = scoreArrangement(blocks);
    setResults(result.results);
    setScore((prev) => ({
      correct: prev.correct + result.correctCount,
      total: prev.total + result.totalCount,
    }));

    // After feedback delay, show correct order
    setTimeout(() => {
      setShowingCorrect(true);
      setBlocks(correctOrder);
      setResults(null);

      // After reveal delay, advance
      setTimeout(() => {
        advance();
      }, REVEAL_DELAY_MS);
    }, FEEDBACK_DELAY_MS);
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
                const newQueue = createTartibBlockQueue(verses, gameMode);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push("/tartibblock")}
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return null;

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

      {/* Round label */}
      <div className="mb-4 text-center text-sm font-medium text-gray-500">
        {showingCorrect ? "Correct order:" : roundLabel}
      </div>

      {/* Hint bar */}
      {currentChapterId && (
        <div className="mb-4">
          <TartibBlockHintBar
            chapterId={currentChapterId}
            pageNumber={currentPageNumber}
            difficulty={difficulty}
            surahRevealed={surahRevealed}
            onRevealSurah={() => setSurahRevealed(true)}
          />
        </div>
      )}

      {/* Sortable blocks */}
      <div className="mb-6">
        <SortableBlockList
          blocks={blocks}
          onReorder={setBlocks}
          results={results}
          disabled={submitted}
          showTranslation={translationParam !== "off"}
          showTransliteration={transliterationParam}
        />
      </div>

      {/* Check Order button */}
      {!submitted && (
        <button
          onClick={handleSubmit}
          className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Check Order
        </button>
      )}

      {/* Round score feedback */}
      {results && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {results.filter((r) => r.isCorrect).length}/{results.length} blocks correct
          </p>
        </div>
      )}
    </div>
  );
}

export default function TartibBlockGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }
    >
      <TartibBlockGameInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/tartibblock/play/page.js
git commit -m "feat(tartibblock): add game screen with drag-and-drop and tap-to-swap"
```

---

### Task 7: Register on Home Page

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add TartibBlock GameCard to the home page**

In `src/app/page.js`, after the KalamQuest GameCard (line 27), add:

```jsx
        <GameCard
          title="TartibBlock"
          description="Arrange scrambled words or ayahs into the correct order."
          href="/tartibblock"
        />
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.js
git commit -m "feat(tartibblock): add game card to home page"
```

---

### Task 8: Smoke Test & Fix

**Files:**
- All TartibBlock files

- [ ] **Step 1: Build the project and verify no compilation errors**

Run: `npm run build`

Check for any compilation errors. Fix any import issues or typos.

- [ ] **Step 2: Navigate to http://localhost:3000 and verify the GameCard appears**

The home page should show four game cards: AyahFlow, SurahSense, KalamQuest, and TartibBlock.

- [ ] **Step 3: Navigate to /tartibblock and verify the settings page renders**

All selectors (scope, mode, difficulty, display options) should render and be interactive. No answer mode selector should be present.

- [ ] **Step 4: Test each mode**

1. Organise Ayah (easy) — verify word groups appear as draggable blocks, drag reorders, submit shows green/red, then correct order
2. Organise Surah (easy) — verify ayah blocks appear, drag and tap-swap both work
3. Organise Page (easy) — verify page ayahs are shown
4. Mixed — verify modes alternate
5. Hard mode — verify page number hint is shown by default

- [ ] **Step 5: Test tap-to-swap on desktop**

Click one block (should highlight with blue border), click another (should swap positions), click same block (should deselect).

- [ ] **Step 6: Fix any issues found during testing**

```bash
git add -A
git commit -m "fix(tartibblock): fix issues found during smoke testing"
```
