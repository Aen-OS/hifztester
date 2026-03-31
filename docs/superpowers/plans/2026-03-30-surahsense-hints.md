# SurahSense Hints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hint bar to SurahSense with revelation place, verse count, 50/50 elimination, and expandable summary.

**Architecture:** A new `SurahSenseHintBar` component renders hint buttons. Hint state lives in the play page and resets per question. `SurahChoiceGrid` filters out eliminated IDs. `SummaryClue` drops its built-in hints and accepts expanded text via props. `fetchChapterInfo` returns `shortText` and `text` separately.

**Tech Stack:** React (client components), Next.js App Router, Tailwind CSS

---

### Task 1: Return separate summary fields from `fetchChapterInfo`

**Files:**
- Modify: `src/lib/fetch-chapters.js:35`

- [ ] **Step 1: Update `fetchChapterInfo` return object**

In `src/lib/fetch-chapters.js`, replace line 35:

```js
    summary: info.shortText || info.text || "",
```

with:

```js
    summary: info.shortText || info.text || "",
    fullSummary: info.text || info.shortText || "",
```

- [ ] **Step 2: Verify the app still builds**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds (or at minimum no errors in fetch-chapters.js)

- [ ] **Step 3: Commit**

```bash
git add src/lib/fetch-chapters.js
git commit -m "feat: return fullSummary from fetchChapterInfo for expandable summary hint"
```

---

### Task 2: Create `SurahSenseHintBar` component

**Files:**
- Create: `src/components/surahsense/SurahSenseHintBar.jsx`

- [ ] **Step 1: Create the component**

Create `src/components/surahsense/SurahSenseHintBar.jsx`:

```jsx
"use client";

export default function SurahSenseHintBar({
  revelationPlace,
  revelationPlaceRevealed,
  onRevealRevelationPlace,
  versesCount,
  verseCountRevealed,
  onRevealVerseCount,
  showExpandSummary,
  summaryExpanded,
  onExpandSummary,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  fiftyFiftyHidden,
  onFiftyFifty,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {revelationPlaceRevealed ? (
          <span className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
            {revelationPlace === "makkah" ? "Meccan" : "Medinan"}
          </span>
        ) : (
          <button
            onClick={onRevealRevelationPlace}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Revelation
          </button>
        )}

        {verseCountRevealed ? (
          <span className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
            {versesCount} verses
          </span>
        ) : (
          <button
            onClick={onRevealVerseCount}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Verses
          </button>
        )}

        {showExpandSummary && !summaryExpanded && (
          <button
            onClick={onExpandSummary}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            More Detail
          </button>
        )}

        {showExpandSummary && summaryExpanded && (
          <span className="rounded-lg bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
            Full summary shown
          </span>
        )}
      </div>

      {!fiftyFiftyHidden && (
        <button
          onClick={onFiftyFifty}
          disabled={fiftyFiftyDisabled}
          className={`ml-auto rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
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

- [ ] **Step 2: Verify file was created**

Run: `ls src/components/surahsense/SurahSenseHintBar.jsx`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add src/components/surahsense/SurahSenseHintBar.jsx
git commit -m "feat: add SurahSenseHintBar component with revelation, verse count, expand summary, and 50/50 hints"
```

---

### Task 3: Simplify `SummaryClue` — remove built-in hints, accept expanded text

**Files:**
- Modify: `src/components/surahsense/SummaryClue.jsx`

- [ ] **Step 1: Rewrite SummaryClue**

Replace the entire contents of `src/components/surahsense/SummaryClue.jsx` with:

```jsx
"use client";

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

export default function SummaryClue({ summary, fullSummary, expanded }) {
  const text = expanded && fullSummary ? fullSummary : summary;

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-sm leading-relaxed text-gray-700">
        {stripHtml(text)}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/surahsense/SummaryClue.jsx
git commit -m "refactor: simplify SummaryClue, remove built-in hints, accept expanded text via props"
```

---

### Task 4: Update `SurahChoiceGrid` to filter eliminated choices

**Files:**
- Modify: `src/components/surahsense/SurahChoiceGrid.jsx`

- [ ] **Step 1: Add `eliminatedIds` prop and filter**

Replace the entire contents of `src/components/surahsense/SurahChoiceGrid.jsx` with:

```jsx
"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function SurahChoiceGrid({ choices, correctId, selectedId, onSelect, eliminatedIds = [] }) {
  const eliminatedSet = new Set(eliminatedIds);
  const visibleChoices = choices.filter((id) => !eliminatedSet.has(id));

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
      {visibleChoices.map((id) => (
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
git commit -m "feat: add eliminatedIds prop to SurahChoiceGrid for 50/50 hint"
```

---

### Task 5: Wire hints into the SurahSense play page

**Files:**
- Modify: `src/app/surahsense/play/page.js`

This is the largest task. It adds hint state, the `handleFiftyFifty` handler, resets per question, and renders the `SurahSenseHintBar`.

- [ ] **Step 1: Add import for `SurahSenseHintBar`**

In `src/app/surahsense/play/page.js`, after the existing import for `SurahTypingInput` (line 27), add:

```js
import SurahSenseHintBar from "@/components/surahsense/SurahSenseHintBar";
```

- [ ] **Step 2: Add hint state variables**

After the `currentMode` state declaration (line 61: `const [currentMode, setCurrentMode] = useState(null);`), add:

```js
  const [revelationPlaceRevealed, setRevelationPlaceRevealed] = useState(false);
  const [verseCountRevealed, setVerseCountRevealed] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
  const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);
  const [eliminatedIds, setEliminatedIds] = useState([]);
```

- [ ] **Step 3: Reset per-question hint state in `buildClue`**

Inside the `buildClue` function, right after `setTypingResult(null);` (line 119), add:

```js
      setRevelationPlaceRevealed(false);
      setVerseCountRevealed(false);
      setSummaryExpanded(false);
      setFiftyFiftyUsedThisRound(false);
      setEliminatedIds([]);
```

- [ ] **Step 4: Update summary clue to store `fullSummary`**

In the `buildClue` function, replace the `case "summary"` block (lines 161-170):

```js
        case "summary": {
          const info = await getChapterInfoCached(surahId);
          setClue({
            type: "summary",
            summary: redactSurahName(info.summary, surahId),
            fullSummary: redactSurahName(info.fullSummary, surahId),
            revelationPlace: info.revelationPlace,
            versesCount: info.versesCount,
          });
          break;
        }
```

- [ ] **Step 5: Add `handleFiftyFifty` handler**

After the `handleTypedSubmit` function (after line 217), add:

```js
  function handleFiftyFifty() {
    if (fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedId !== null) return;
    const incorrect = choices.filter((id) => id !== correctSurahId && !eliminatedIds.includes(id));
    const shuffled = [...incorrect].sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, 2);
    setEliminatedIds((prev) => [...prev, ...toEliminate]);
    setFiftyFiftyRemaining((prev) => prev - 1);
    setFiftyFiftyUsedThisRound(true);
  }
```

- [ ] **Step 6: Render `SurahSenseHintBar` in the game UI**

In the JSX, find the correct chapter data for hint props and render the hint bar. Replace the `{/* Answer mode toggle */}` comment and the `<div className="mb-4">` block wrapping `AnswerModeToggle` (lines 325-328) with:

```jsx
      {/* Hint bar */}
      {(() => {
        const ch = allChapters.find((c) => c.id === correctSurahId);
        return ch ? (
          <div className="mb-4">
            <SurahSenseHintBar
              revelationPlace={ch.revelationPlace}
              revelationPlaceRevealed={revelationPlaceRevealed}
              onRevealRevelationPlace={() => setRevelationPlaceRevealed(true)}
              versesCount={ch.versesCount}
              verseCountRevealed={verseCountRevealed}
              onRevealVerseCount={() => setVerseCountRevealed(true)}
              showExpandSummary={clue?.type === "summary"}
              summaryExpanded={summaryExpanded}
              onExpandSummary={() => setSummaryExpanded(true)}
              fiftyFiftyRemaining={fiftyFiftyRemaining}
              fiftyFiftyDisabled={fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedId !== null}
              fiftyFiftyHidden={answerMode === "type"}
              onFiftyFifty={handleFiftyFifty}
            />
          </div>
        ) : null;
      })()}

      {/* Answer mode toggle */}
      <div className="mb-4">
        <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
      </div>
```

- [ ] **Step 7: Pass `eliminatedIds` to `SurahChoiceGrid`**

Find the `<SurahChoiceGrid` JSX (around line 332) and add the `eliminatedIds` prop:

```jsx
        <SurahChoiceGrid
          choices={choices}
          correctId={correctSurahId}
          selectedId={selectedId}
          onSelect={handleSelect}
          eliminatedIds={eliminatedIds}
        />
```

- [ ] **Step 8: Pass expanded props to `SummaryClue`**

Find the `<SummaryClue` JSX (around line 317) and replace it with:

```jsx
          <SummaryClue
            summary={clue.summary}
            fullSummary={clue.fullSummary}
            expanded={summaryExpanded}
          />
```

- [ ] **Step 9: Reset `fiftyFiftyRemaining` in "Play Again" handler**

In the `showResults` section, find the "Play Again" button's `onClick` handler (around line 260). Add `setFiftyFiftyRemaining(3);` after `setScore({ correct: 0, total: 0 });`:

```js
              onClick={() => {
                setShowResults(false);
                setScore({ correct: 0, total: 0 });
                setFiftyFiftyRemaining(3);
                const newQueue = createSurahPromptQueue(scopeSurahIds);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
```

- [ ] **Step 10: Verify the app builds and runs**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds with no errors

- [ ] **Step 11: Commit**

```bash
git add src/app/surahsense/play/page.js
git commit -m "feat: wire SurahSense hint bar with revelation place, verse count, expand summary, and 50/50 hints"
```
