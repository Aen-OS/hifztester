# SurahSense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a surah identification game with four clue modes (Page, Ayah, Ayaat, Summary) plus Mixed mode.

**Architecture:** New server actions in `fetch-chapters.js` provide chapter metadata and page verses. Client-side `surahsense-engine.js` handles prompt queuing and distractor generation. Six new UI components under `src/components/surahsense/`. Setup page at `/surahsense`, game page at `/surahsense/play`. Reuses ScopeSelector, DifficultySelector, AnswerModeSelector, AnswerModeToggle, ScoreCounter, and BackButton from the existing codebase.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, @quranjs/api SDK

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/fetch-chapters.js` | Create | Server actions: fetchChapterInfo, fetchAllChaptersInfo, fetchVersesForPage |
| `src/lib/surahsense-engine.js` | Create | Client-side: prompt queue, distractor generation, surah name matching |
| `src/components/surahsense/ModeSelector.jsx` | Create | Setup page — 5 mode buttons |
| `src/components/surahsense/MushafPage.jsx` | Create | Mushaf-style page display with decorative frame |
| `src/components/surahsense/AyahClue.jsx` | Create | Single/group ayah display (no verse keys) |
| `src/components/surahsense/SummaryClue.jsx` | Create | Chapter summary with progressive hint reveals |
| `src/components/surahsense/SurahChoiceGrid.jsx` | Create | 2x2 surah name choice buttons |
| `src/components/surahsense/SurahTypingInput.jsx` | Create | English surah name text input |
| `src/app/surahsense/page.js` | Create | Setup page |
| `src/app/surahsense/play/page.js` | Create | Game page |
| `src/app/page.js` | Modify | Add GameCard for SurahSense |
| `src/components/ayahflow/ScopeSelector.jsx` | Modify | Add "All Surahs" button |

---

### Task 1: Chapter Data Fetching

**Files:**
- Create: `src/lib/fetch-chapters.js`

- [ ] **Step 1: Create the server actions file**

```javascript
// src/lib/fetch-chapters.js
"use server";

import client from "./quran-client";

const TRANSLATION_ID = "131"; // Sahih International
const VERSE_FIELDS = { textUthmani: true };

function normalizeVerse(raw) {
  return {
    id: raw.id,
    verseKey: raw.verseKey,
    chapterId: Number(raw.chapterId ?? raw.verseKey.split(":")[0]),
    verseNumber: raw.verseNumber,
    textUthmani: raw.textUthmani,
    translation: raw.translations?.[0]?.text ?? "",
    juzNumber: raw.juzNumber,
    hizbNumber: raw.hizbNumber,
    pageNumber: raw.pageNumber,
  };
}

export async function fetchChapterInfo(chapterId) {
  const info = await client.chapters.findInfoById(String(chapterId));
  const chapter = await client.chapters.findById(String(chapterId));
  return {
    id: chapter.id,
    name: chapter.nameSimple,
    nameArabic: chapter.nameArabic,
    versesCount: chapter.versesCount,
    revelationPlace: chapter.revelationPlace,
    revelationOrder: chapter.revelationOrder,
    pages: chapter.pages,
    summary: info.shortText || info.text || "",
  };
}

export async function fetchAllChaptersInfo() {
  const chapters = await client.chapters.findAll();
  return chapters.map((ch) => ({
    id: ch.id,
    name: ch.nameSimple,
    nameArabic: ch.nameArabic,
    versesCount: ch.versesCount,
    revelationPlace: ch.revelationPlace,
    revelationOrder: ch.revelationOrder,
    pages: ch.pages,
  }));
}

export async function fetchVersesForPage(pageNumber) {
  const MAX_PER_PAGE = 50;
  const all = [];
  let page = 1;
  while (true) {
    const batch = await client.verses.findByPage(pageNumber, {
      fields: VERSE_FIELDS,
      translations: [TRANSLATION_ID],
      perPage: MAX_PER_PAGE,
      page,
    });
    all.push(...batch);
    if (batch.length < MAX_PER_PAGE) break;
    page++;
  }
  return all.map(normalizeVerse);
}
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node --input-type=module -e "import('./src/lib/fetch-chapters.js').then(() => console.log('OK'))"`
Expected: `OK` (or a runtime error about "use server" which is fine — syntax is valid)

- [ ] **Step 3: Commit**

```bash
git add src/lib/fetch-chapters.js
git commit -m "feat: add chapter data fetching for SurahSense"
```

---

### Task 2: SurahSense Game Engine

**Files:**
- Create: `src/lib/surahsense-engine.js`

- [ ] **Step 1: Create the engine file**

```javascript
// src/lib/surahsense-engine.js

import { SURAH_NAMES } from "@/lib/quran-data";

export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createSurahPromptQueue(surahIds) {
  return shuffle(surahIds);
}

/**
 * Generate 3 distractor surah IDs.
 * - Easy: random from scope
 * - Medium: same juz (using chapter.pages to approximate juz)
 * - Hard: same revelationPlace + similar versesCount (±20)
 */
export function generateSurahDistractors(correctSurah, difficulty, allChapters, scopeSurahIds) {
  const correctId = correctSurah.id;
  const usedIds = new Set([correctId]);
  const distractors = [];

  function addFromPool(pool) {
    const candidates = shuffle(pool.filter((ch) => !usedIds.has(ch.id)));
    for (const c of candidates) {
      if (distractors.length >= 3) break;
      distractors.push(c);
      usedIds.add(c.id);
    }
  }

  const scopeSet = new Set(scopeSurahIds);

  if (difficulty === "hard") {
    // Same revelation place + similar verse count
    const hardPool = allChapters.filter(
      (ch) =>
        scopeSet.has(ch.id) &&
        ch.revelationPlace === correctSurah.revelationPlace &&
        Math.abs(ch.versesCount - correctSurah.versesCount) <= 20,
    );
    addFromPool(hardPool);
  }

  if (difficulty === "hard" || difficulty === "medium") {
    // Same juz — approximate by overlapping pages
    if (distractors.length < 3) {
      const correctPages = new Set(correctSurah.pages || []);
      const mediumPool = allChapters.filter(
        (ch) =>
          scopeSet.has(ch.id) &&
          (ch.pages || []).some((p) => {
            // Within 20 pages means likely same juz
            for (const cp of correctPages) {
              if (Math.abs(p - cp) <= 20) return true;
            }
            return false;
          }),
      );
      addFromPool(mediumPool);
    }
  }

  // Easy fallback: any surah from scope
  if (distractors.length < 3) {
    const easyPool = allChapters.filter((ch) => scopeSet.has(ch.id));
    addFromPool(easyPool);
  }

  return distractors;
}

/**
 * Pick a random page that contains verses from the given surah.
 */
export function pickRandomPage(chapter) {
  const pages = chapter.pages || [];
  if (pages.length === 0) return null;
  return pages[Math.floor(Math.random() * pages.length)];
}

/**
 * Pick random consecutive verses from a list of surah verses.
 * count: number of verses to pick.
 */
export function pickRandomAyaat(surahVerses, count) {
  if (surahVerses.length <= count) return surahVerses;
  const maxStart = surahVerses.length - count;
  const start = Math.floor(Math.random() * (maxStart + 1));
  return surahVerses.slice(start, start + count);
}

/**
 * Get ayah group size based on difficulty.
 */
export function getAyaatCount(difficulty) {
  switch (difficulty) {
    case "easy": return 5;
    case "medium": return 3;
    case "hard": return 2;
    default: return 3;
  }
}

/**
 * Pick a random mode for Mixed mode.
 */
const ALL_MODES = ["page", "ayah", "ayaat", "summary"];
export function pickRandomMode() {
  return ALL_MODES[Math.floor(Math.random() * ALL_MODES.length)];
}

/**
 * Case-insensitive match for surah name typing mode.
 */
export function matchSurahName(typed, correctId) {
  const correctName = SURAH_NAMES[correctId] || "";
  return typed.trim().toLowerCase() === correctName.toLowerCase();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/surahsense-engine.js
git commit -m "feat: add SurahSense game engine"
```

---

### Task 3: ModeSelector Component

**Files:**
- Create: `src/components/surahsense/ModeSelector.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/surahsense/ModeSelector.jsx
"use client";

const MODES = [
  { key: "page", label: "Page", description: "Identify the surah from a mushaf page" },
  { key: "ayah", label: "Single Ayah", description: "Identify from one ayah" },
  { key: "ayaat", label: "Group of Ayaat", description: "Identify from a few consecutive ayaat" },
  { key: "summary", label: "Summary", description: "Identify from the surah's description" },
  { key: "mixed", label: "Mixed", description: "Random mix of all clue types" },
];

export default function ModeSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            value === m.key
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 hover:border-gray-400"
          } ${m.key === "mixed" ? "col-span-2 sm:col-span-1" : ""}`}
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
git add src/components/surahsense/ModeSelector.jsx
git commit -m "feat: add SurahSense mode selector component"
```

---

### Task 4: MushafPage Component

**Files:**
- Create: `src/components/surahsense/MushafPage.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/surahsense/MushafPage.jsx
"use client";

export default function MushafPage({ verses, pageNumber }) {
  return (
    <div className="rounded-xl border-4 border-double p-4" style={{ borderColor: "#d4c8a0", background: "#f5f0e0" }}>
      <div
        className="relative rounded-lg border p-4"
        style={{ borderColor: "#e8dfc8", background: "#faf8f0" }}
      >
        <div
          className="pointer-events-none absolute inset-1 rounded border"
          style={{ borderColor: "#e8dfc8" }}
        />
        <div dir="rtl" lang="ar" className="font-arabic px-2 text-lg leading-[2.4] sm:text-xl" style={{ color: "#1a1a1a", textAlign: "justify" }}>
          {verses.map((v) => (
            <span key={v.verseKey}>
              {v.textUthmani}{" "}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs"
          style={{ borderColor: "#c4b88a", color: "#8a7a5a" }}
        >
          {pageNumber}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/surahsense/MushafPage.jsx
git commit -m "feat: add MushafPage clue component"
```

---

### Task 5: AyahClue Component

**Files:**
- Create: `src/components/surahsense/AyahClue.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/surahsense/AyahClue.jsx
"use client";

export default function AyahClue({ verses }) {
  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      {verses.map((v) => (
        <div key={v.verseKey}>
          <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
            {v.textUthmani}
          </p>
          <p className="mt-1 text-sm text-gray-500">{v.translation}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/surahsense/AyahClue.jsx
git commit -m "feat: add AyahClue component"
```

---

### Task 6: SummaryClue Component

**Files:**
- Create: `src/components/surahsense/SummaryClue.jsx`

- [ ] **Step 1: Create the component**

The API may return HTML in the summary field. Strip HTML tags to render as plain text safely.

```jsx
// src/components/surahsense/SummaryClue.jsx
"use client";

import { useState } from "react";

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

export default function SummaryClue({ summary, revelationPlace, versesCount }) {
  const [hintsRevealed, setHintsRevealed] = useState(0);

  function revealNext() {
    setHintsRevealed((prev) => Math.min(prev + 1, 2));
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm leading-relaxed text-gray-700">
        {stripHtml(summary)}
      </p>

      {hintsRevealed >= 1 && (
        <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium">Revelation:</span>{" "}
          {revelationPlace === "makkah" ? "Meccan" : "Medinan"}
        </div>
      )}

      {hintsRevealed >= 2 && (
        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          <span className="font-medium">Verses:</span> {versesCount}
        </div>
      )}

      {hintsRevealed < 2 && (
        <button
          onClick={revealNext}
          className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          Reveal hint ({2 - hintsRevealed} remaining)
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/surahsense/SummaryClue.jsx
git commit -m "feat: add SummaryClue component with progressive hints"
```

---

### Task 7: SurahChoiceGrid Component

**Files:**
- Create: `src/components/surahsense/SurahChoiceGrid.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/surahsense/SurahChoiceGrid.jsx
"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function SurahChoiceGrid({ choices, correctId, selectedId, onSelect }) {
  function getState(id) {
    if (selectedId === null) return "default";
    if (id === selectedId && id === correctId) return "correct";
    if (id === selectedId && id !== correctId) return "incorrect";
    if (id === correctId) return "reveal";
    return "default";
  }

  const styles = {
    default: "border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer",
    correct: "border-green-500 bg-green-50",
    incorrect: "border-red-500 bg-red-50",
    reveal: "border-green-500 bg-green-50 opacity-60",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((id) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          disabled={selectedId !== null}
          className={`w-full rounded-xl border p-4 text-left transition-colors ${styles[getState(id)]}`}
        >
          <div className="text-base font-medium">
            {id}. {SURAH_NAMES[id]}
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/surahsense/SurahChoiceGrid.jsx
git commit -m "feat: add SurahChoiceGrid component"
```

---

### Task 8: SurahTypingInput Component

**Files:**
- Create: `src/components/surahsense/SurahTypingInput.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/surahsense/SurahTypingInput.jsx
"use client";

import { useState } from "react";

export default function SurahTypingInput({ onSubmit, disabled }) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim() || disabled) return;
    onSubmit(text);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type the surah name..."
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-base focus:border-gray-400 focus:outline-none disabled:opacity-50"
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/surahsense/SurahTypingInput.jsx
git commit -m "feat: add SurahTypingInput component"
```

---

### Task 9: Add "All Surahs" to ScopeSelector

**Files:**
- Modify: `src/components/ayahflow/ScopeSelector.jsx`

- [ ] **Step 1: Add the "All Surahs" button**

In `src/components/ayahflow/ScopeSelector.jsx`, add a button above the scope type tabs. Replace the opening of the return JSX:

Current (line 57-72):
```jsx
  return (
    <div>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {SCOPE_TYPES.map((t) => (
```

Replace with:
```jsx
  return (
    <div>
      <button
        onClick={() => {
          const all = Array.from({ length: 114 }, (_, i) => i + 1);
          setActiveTab("surah");
          setSelections(all);
          setRangeMode(false);
          onChange({ type: "surah", values: all });
        }}
        className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          selections.length === 114 && activeTab === "surah"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        All 114 Surahs
      </button>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {SCOPE_TYPES.map((t) => (
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ayahflow/ScopeSelector.jsx
git commit -m "feat: add 'All Surahs' button to ScopeSelector"
```

---

### Task 10: SurahSense Setup Page

**Files:**
- Create: `src/app/surahsense/page.js`

- [ ] **Step 1: Create the setup page**

```jsx
// src/app/surahsense/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";
import DifficultySelector from "@/components/ayahflow/DifficultySelector";
import AnswerModeSelector from "@/components/ayahflow/AnswerModeSelector";
import ModeSelector from "@/components/surahsense/ModeSelector";
import BackButton from "@/components/BackButton";

export default function SurahSenseSetup() {
  const router = useRouter();
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [gameMode, setGameMode] = useState("page");
  const [difficulty, setDifficulty] = useState("easy");
  const [answerMode, setAnswerMode] = useState("choices");

  function handleStart() {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeValues: scope.values.join(","),
      gameMode,
      difficulty,
      answerMode,
    });
    router.push(`/surahsense/play?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <BackButton />
      <h1 className="mt-4 text-3xl font-bold">SurahSense</h1>
      <p className="mt-1 text-gray-500">
        Identify the surah from different clues
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
            Clue Mode
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
git add src/app/surahsense/page.js
git commit -m "feat: add SurahSense setup page"
```

---

### Task 11: SurahSense Game Page

**Files:**
- Create: `src/app/surahsense/play/page.js`

This is the largest task — the main game loop.

- [ ] **Step 1: Create the game page**

```jsx
// src/app/surahsense/play/page.js
"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope } from "@/lib/fetch-verses";
import {
  fetchAllChaptersInfo,
  fetchChapterInfo,
  fetchVersesForPage,
} from "@/lib/fetch-chapters";
import {
  createSurahPromptQueue,
  generateSurahDistractors,
  pickRandomPage,
  pickRandomAyaat,
  getAyaatCount,
  pickRandomMode,
  matchSurahName,
  shuffle,
} from "@/lib/surahsense-engine";
import { SURAH_NAMES } from "@/lib/quran-data";
import MushafPage from "@/components/surahsense/MushafPage";
import AyahClue from "@/components/surahsense/AyahClue";
import SummaryClue from "@/components/surahsense/SummaryClue";
import SurahChoiceGrid from "@/components/surahsense/SurahChoiceGrid";
import SurahTypingInput from "@/components/surahsense/SurahTypingInput";
import AnswerModeToggle from "@/components/ayahflow/AnswerModeToggle";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";

const CORRECT_DELAY_MS = 1200;
const WRONG_DELAY_MS = 2000;

function SurahSenseGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const gameMode = searchParams.get("gameMode") ?? "page";
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const initialAnswerMode = searchParams.get("answerMode") ?? "choices";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allChapters, setAllChapters] = useState([]);
  const [scopeSurahIds, setScopeSurahIds] = useState([]);
  const [verses, setVerses] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [clue, setClue] = useState(null);
  const [correctSurahId, setCorrectSurahId] = useState(null);
  const [choices, setChoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [answerMode, setAnswerMode] = useState(initialAnswerMode);
  const [typingResult, setTypingResult] = useState(null); // null | "correct" | "wrong"
  const [currentMode, setCurrentMode] = useState(null);

  const chapterInfoCacheRef = useRef({});

  // Load initial data
  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/surahsense");
      return;
    }

    async function load() {
      try {
        setLoading(true);

        const [chaptersData, versesData] = await Promise.all([
          fetchAllChaptersInfo(),
          fetchVersesForScope(scopeType, scopeValues),
        ]);

        setAllChapters(chaptersData);
        setVerses(versesData.verses);

        // Determine which surah IDs are in scope
        const surahIds = [
          ...new Set(versesData.verses.map((v) => v.chapterId)),
        ];
        setScopeSurahIds(surahIds);

        const queue = createSurahPromptQueue(surahIds);
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

  const getChapterInfoCached = useCallback(async (chapterId) => {
    if (chapterInfoCacheRef.current[chapterId]) {
      return chapterInfoCacheRef.current[chapterId];
    }
    const info = await fetchChapterInfo(chapterId);
    chapterInfoCacheRef.current[chapterId] = info;
    return info;
  }, []);

  // Build question for current prompt
  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    async function buildClue() {
      const surahId = promptQueue[promptIndex];
      const mode = gameMode === "mixed" ? pickRandomMode() : gameMode;
      setCurrentMode(mode);
      setCorrectSurahId(surahId);
      setSelectedId(null);
      setTypingResult(null);

      const correctChapter = allChapters.find((ch) => ch.id === surahId);
      if (!correctChapter) return;

      // Generate distractors
      const distractorChapters = generateSurahDistractors(
        correctChapter,
        difficulty,
        allChapters,
        scopeSurahIds,
      );
      const choiceIds = shuffle([
        surahId,
        ...distractorChapters.map((ch) => ch.id),
      ]);
      setChoices(choiceIds);

      // Build clue based on mode
      switch (mode) {
        case "page": {
          const pageNum = pickRandomPage(correctChapter);
          if (pageNum) {
            const pageVerses = await fetchVersesForPage(pageNum);
            setClue({ type: "page", verses: pageVerses, pageNumber: pageNum });
          }
          break;
        }
        case "ayah": {
          const surahVerses = verses.filter((v) => v.chapterId === surahId);
          if (surahVerses.length > 0) {
            const pick =
              surahVerses[Math.floor(Math.random() * surahVerses.length)];
            setClue({ type: "ayah", verses: [pick] });
          }
          break;
        }
        case "ayaat": {
          const surahVerses = verses.filter((v) => v.chapterId === surahId);
          const count = getAyaatCount(difficulty);
          const picked = pickRandomAyaat(surahVerses, count);
          setClue({ type: "ayaat", verses: picked });
          break;
        }
        case "summary": {
          const info = await getChapterInfoCached(surahId);
          setClue({
            type: "summary",
            summary: info.summary,
            revelationPlace: info.revelationPlace,
            versesCount: info.versesCount,
          });
          break;
        }
      }
    }

    buildClue();
  }, [promptQueue, promptIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createSurahPromptQueue(scopeSurahIds);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
    }
  }

  function handleSelect(surahId) {
    if (selectedId !== null) return;
    setSelectedId(surahId);

    const isCorrect = surahId === correctSurahId;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => {
      advance();
    }, CORRECT_DELAY_MS);
  }

  function handleTypedSubmit(typed) {
    if (selectedId !== null) return;

    const isCorrect = matchSurahName(typed, correctSurahId);
    setSelectedId(correctSurahId);
    setTypingResult(isCorrect ? "correct" : "wrong");
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => {
      advance();
    }, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

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
                const newQueue = createSurahPromptQueue(scopeSurahIds);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push("/surahsense")}
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clue) return null;

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

      <div className="mb-4 text-center text-sm font-medium text-gray-500">
        Which surah is this?
      </div>

      {/* Clue area */}
      <div className="mb-6">
        {clue.type === "page" && (
          <MushafPage verses={clue.verses} pageNumber={clue.pageNumber} />
        )}
        {(clue.type === "ayah" || clue.type === "ayaat") && (
          <AyahClue verses={clue.verses} />
        )}
        {clue.type === "summary" && (
          <SummaryClue
            summary={clue.summary}
            revelationPlace={clue.revelationPlace}
            versesCount={clue.versesCount}
          />
        )}
      </div>

      {/* Answer mode toggle */}
      <div className="mb-4">
        <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
      </div>

      {/* Answer area */}
      {answerMode === "choices" ? (
        <SurahChoiceGrid
          choices={choices}
          correctId={correctSurahId}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      ) : typingResult ? (
        <div
          className={`rounded-xl border p-4 text-center ${
            typingResult === "correct"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p
            className={`text-lg font-medium ${
              typingResult === "correct" ? "text-green-700" : "text-red-700"
            }`}
          >
            {typingResult === "correct" ? "Correct!" : "Incorrect"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {correctSurahId}. {SURAH_NAMES[correctSurahId]}
          </p>
        </div>
      ) : (
        <SurahTypingInput
          onSubmit={handleTypedSubmit}
          disabled={selectedId !== null}
        />
      )}
    </div>
  );
}

export default function SurahSenseGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }
    >
      <SurahSenseGameInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/surahsense/play/page.js
git commit -m "feat: add SurahSense game page"
```

---

### Task 12: Add GameCard to Home Page

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add SurahSense GameCard**

In `src/app/page.js`, add a second `GameCard` after the AyahFlow one (inside the `<div className="mt-12 grid gap-4">`):

```jsx
<GameCard
  title="SurahSense"
  description="Identify the surah from a page, ayah, group of ayaat, or its summary."
  href="/surahsense"
/>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Both `/surahsense` and `/surahsense/play` appear in routes.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.js
git commit -m "feat: add SurahSense to home page"
```

---

### Task 13: Manual Testing

- [ ] **Step 1: Run dev server and test setup page**

Run: `npm run dev`

1. Navigate to home page — verify SurahSense card appears
2. Click into `/surahsense` — verify setup page shows Scope, Clue Mode, Difficulty, Answer Mode
3. Click "All 114 Surahs" — verify all surahs selected
4. Select different modes — verify UI updates

- [ ] **Step 2: Test Page mode**

1. Select Page mode, Easy difficulty, Choices
2. Start game — verify mushaf-style page renders with parchment frame and page number below
3. Verify 4 surah name choices appear
4. Click correct answer — verify green highlight, advances after delay
5. Click wrong answer — verify red/green highlight, advances

- [ ] **Step 3: Test Single Ayah mode**

1. Go back, select Single Ayah mode
2. Start — verify one ayah shown with Arabic + translation, no verse key visible
3. Answer correctly and incorrectly — verify scoring works

- [ ] **Step 4: Test Group of Ayaat mode**

1. Select Group of Ayaat, Easy difficulty — verify 5 ayahs shown
2. Switch to Hard — verify 2 ayahs shown

- [ ] **Step 5: Test Summary mode**

1. Select Summary mode — verify summary text shown
2. Click "Reveal hint" — verify revelation type appears
3. Click again — verify verse count appears, button disappears

- [ ] **Step 6: Test Mixed mode**

1. Select Mixed — verify different clue types appear across rounds

- [ ] **Step 7: Test Type It mode**

1. Switch to Type It answer mode mid-game
2. Type correct surah name — verify correct feedback
3. Type wrong name — verify incorrect feedback with correct answer shown

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish SurahSense after manual testing"
```
