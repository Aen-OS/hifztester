# AyahFlow Typing Answer Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to answer AyahFlow questions by typing the Arabic ayah text, with a word-level diff on wrong answers.

**Architecture:** New `normalize-arabic.js` utility handles diacritics stripping and word-level diff. Four new UI components (AnswerModeSelector, AnswerModeToggle, TypingInput, DiffView) plug into the existing setup and game pages. The game page conditionally renders ChoiceGrid or TypingInput based on answer mode state.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/normalize-arabic.js` | Create | `stripTashkeel(text)` and `diffWords(typed, correct)` |
| `src/components/ayahflow/AnswerModeSelector.jsx` | Create | Setup page two-button selector (Choices / Type It) |
| `src/components/ayahflow/AnswerModeToggle.jsx` | Create | Game page segmented control |
| `src/components/ayahflow/TypingInput.jsx` | Create | RTL textarea + Submit button |
| `src/components/ayahflow/DiffView.jsx` | Create | Stacked your-answer vs correct comparison |
| `src/app/ayahflow/page.js` | Modify | Add AnswerModeSelector, pass `mode` query param |
| `src/app/ayahflow/play/page.js` | Modify | answerMode state, conditional rendering, typed answer handling |
| `src/components/ayahflow/HintBar.jsx` | Modify | Accept `fiftyFiftyHidden` prop to hide 50/50 in typing mode |

---

### Task 1: Arabic Normalization Utility

**Files:**
- Create: `src/lib/normalize-arabic.js`

- [ ] **Step 1: Create `stripTashkeel` function**

```javascript
// src/lib/normalize-arabic.js

/**
 * Unicode ranges for Arabic tashkeel/diacritics:
 * \u0610-\u061A  — Quranic signs above/below
 * \u064B-\u065F  — Fathatan through Waslah
 * \u0670        — Superscript Alef
 * \u06D6-\u06DC  — Quranic annotation signs
 * \u06DF-\u06E4  — More Quranic signs
 * \u06E7-\u06E8  — Yeh/Noon above
 * \u06EA-\u06ED  — More diacritical marks
 */
const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g;

export function stripTashkeel(text) {
  return text.replace(TASHKEEL_RE, "").trim();
}
```

- [ ] **Step 2: Create `diffWords` function**

Add to the same file:

```javascript
/**
 * Compare typed text against correct text, word-by-word after normalization.
 * Returns { typed: [{ word, status }], correct: [{ word, status }], isMatch }
 * status: "match" | "wrong" | "extra" | "missing"
 */
export function diffWords(typedRaw, correctRaw) {
  const typedNorm = stripTashkeel(typedRaw).split(/\s+/).filter(Boolean);
  const correctNorm = stripTashkeel(correctRaw).split(/\s+/).filter(Boolean);
  const correctOriginal = correctRaw.trim().split(/\s+/).filter(Boolean);
  const typedOriginal = typedRaw.trim().split(/\s+/).filter(Boolean);

  const maxLen = Math.max(typedNorm.length, correctNorm.length);

  const typed = [];
  const correct = [];

  for (let i = 0; i < maxLen; i++) {
    const tWord = typedNorm[i];
    const cWord = correctNorm[i];

    if (tWord && cWord && tWord === cWord) {
      typed.push({ word: typedOriginal[i] || tWord, status: "match" });
      correct.push({ word: correctOriginal[i] || cWord, status: "match" });
    } else if (tWord && cWord) {
      typed.push({ word: typedOriginal[i] || tWord, status: "wrong" });
      correct.push({ word: correctOriginal[i] || cWord, status: "missing" });
    } else if (tWord && !cWord) {
      typed.push({ word: typedOriginal[i] || tWord, status: "extra" });
    } else if (!tWord && cWord) {
      correct.push({ word: correctOriginal[i] || cWord, status: "missing" });
    }
  }

  const isMatch = typedNorm.length === correctNorm.length &&
    typedNorm.every((w, i) => w === correctNorm[i]);

  return { typed, correct, isMatch };
}
```

- [ ] **Step 3: Verify the file has no syntax errors**

Run: `node -e "require('./src/lib/normalize-arabic.js')"`
Expected: No output (no errors). Note: this uses CJS require on an ES module — if it fails due to ESM, run:
`node --input-type=module -e "import('./src/lib/normalize-arabic.js').then(() => console.log('OK'))"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add src/lib/normalize-arabic.js
git commit -m "feat: add Arabic normalization and word-diff utility"
```

---

### Task 2: AnswerModeSelector (Setup Page Component)

**Files:**
- Create: `src/components/ayahflow/AnswerModeSelector.jsx`

- [ ] **Step 1: Create the component**

Styled like `DifficultySelector` — two buttons in a flex row.

```jsx
// src/components/ayahflow/AnswerModeSelector.jsx
"use client";

const MODES = [
  {
    key: "choices",
    label: "Choices",
    description: "Pick the correct ayah from four options",
  },
  {
    key: "type",
    label: "Type It",
    description: "Type the ayah text from memory",
  },
];

export default function AnswerModeSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {MODES.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
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

- [ ] **Step 2: Wire into setup page**

Modify `src/app/ayahflow/page.js`:

Add import at top (after existing imports):
```javascript
import AnswerModeSelector from "@/components/ayahflow/AnswerModeSelector";
```

Add state (after `const [testPrevious, setTestPrevious] = useState(false);`):
```javascript
const [answerMode, setAnswerMode] = useState("choices");
```

Add `mode` to query params in `handleStart` (add to the URLSearchParams object):
```javascript
mode: answerMode,
```

Add the section in the JSX (after the Difficulty section, before the DirectionToggle section):
```jsx
<section>
  <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
    Answer Mode
  </h2>
  <AnswerModeSelector value={answerMode} onChange={setAnswerMode} />
</section>
```

- [ ] **Step 3: Verify the setup page renders**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ayahflow/AnswerModeSelector.jsx src/app/ayahflow/page.js
git commit -m "feat: add answer mode selector to AyahFlow setup page"
```

---

### Task 3: AnswerModeToggle (Game Page Segmented Control)

**Files:**
- Create: `src/components/ayahflow/AnswerModeToggle.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ayahflow/AnswerModeToggle.jsx
"use client";

export default function AnswerModeToggle({ value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-200">
      <button
        onClick={() => onChange("choices")}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          value === "choices"
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        Choices
      </button>
      <button
        onClick={() => onChange("type")}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          value === "type"
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        Type It
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/AnswerModeToggle.jsx
git commit -m "feat: add answer mode toggle component"
```

---

### Task 4: TypingInput Component

**Files:**
- Create: `src/components/ayahflow/TypingInput.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ayahflow/TypingInput.jsx
"use client";

import { useState } from "react";

export default function TypingInput({ onSubmit, disabled }) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim() || disabled) return;
    onSubmit(text);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <textarea
        dir="rtl"
        lang="ar"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="اكتب الآية هنا..."
        className="font-arabic w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-xl leading-relaxed focus:border-gray-400 focus:outline-none disabled:opacity-50"
        rows={3}
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
git add src/components/ayahflow/TypingInput.jsx
git commit -m "feat: add typing input component for AyahFlow"
```

---

### Task 5: DiffView Component

**Files:**
- Create: `src/components/ayahflow/DiffView.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ayahflow/DiffView.jsx
"use client";

const STATUS_STYLES = {
  match: "text-green-600",
  wrong: "text-red-500 line-through",
  extra: "text-red-500 line-through",
  missing: "text-yellow-600 font-semibold",
};

function WordList({ words }) {
  return (
    <p dir="rtl" lang="ar" className="font-arabic text-xl leading-loose">
      {words.map((w, i) => (
        <span key={i} className={`${STATUS_STYLES[w.status]} mx-0.5`}>
          {w.word}
        </span>
      ))}
    </p>
  );
}

export default function DiffView({ diff }) {
  return (
    <div className="space-y-3">
      {/* User's answer */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-red-400">
          Your Answer
        </p>
        <WordList words={diff.typed} />
      </div>

      {/* Correct answer */}
      <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-green-500">
          Correct Answer
        </p>
        <WordList words={diff.correct} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span><span className="text-green-600">■</span> Matched</span>
        <span><span className="text-red-500">■</span> Wrong / Extra</span>
        <span><span className="text-yellow-600">■</span> Missing</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/DiffView.jsx
git commit -m "feat: add diff view component for typed answer comparison"
```

---

### Task 6: Update HintBar to Support Hiding 50/50

**Files:**
- Modify: `src/components/ayahflow/HintBar.jsx`

- [ ] **Step 1: Add `fiftyFiftyHidden` prop**

In `src/components/ayahflow/HintBar.jsx`, change the function signature from:

```javascript
export default function HintBar({
  ayahNumber,
  chapterId,
  surahRevealed,
  onToggleSurah,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  onFiftyFifty,
}) {
```

to:

```javascript
export default function HintBar({
  ayahNumber,
  chapterId,
  surahRevealed,
  onToggleSurah,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  fiftyFiftyHidden,
  onFiftyFifty,
}) {
```

Then wrap the 50/50 button in a conditional. Replace the `<button>` that renders 50/50:

```jsx
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Existing behavior unchanged (prop defaults to `undefined` which is falsy, so button still shows).

- [ ] **Step 3: Commit**

```bash
git add src/components/ayahflow/HintBar.jsx
git commit -m "feat: add fiftyFiftyHidden prop to HintBar"
```

---

### Task 7: Wire Everything into the Game Page

**Files:**
- Modify: `src/app/ayahflow/play/page.js`

This is the largest task — it integrates all the new components.

- [ ] **Step 1: Add imports**

At the top of `src/app/ayahflow/play/page.js`, add these imports after the existing ones (after `import HintBar from ...`):

```javascript
import AnswerModeToggle from "@/components/ayahflow/AnswerModeToggle";
import TypingInput from "@/components/ayahflow/TypingInput";
import DiffView from "@/components/ayahflow/DiffView";
import { diffWords } from "@/lib/normalize-arabic";
```

- [ ] **Step 2: Add constants and state**

After the existing `const NEXT_DELAY_MS = 1200;` line, add:

```javascript
const TYPING_WRONG_DELAY_MS = 3000;
```

Inside `AyahFlowGameInner`, after the line that reads `const testPrevious = ...`, add:

```javascript
const initialMode = searchParams.get("mode") ?? "choices";
```

After the existing state declarations (after `const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);`), add:

```javascript
const [answerMode, setAnswerMode] = useState(initialMode);
const [typingDiff, setTypingDiff] = useState(null);
```

- [ ] **Step 3: Add `handleTypedSubmit` function**

After the existing `handleSelect` function, add:

```javascript
function handleTypedSubmit(typedText) {
  if (selectedKey) return;

  const result = diffWords(typedText, question.correctAnswer.textUthmani);

  if (result.isMatch) {
    setSelectedKey(question.correctAnswer.verseKey);
    setScore((prev) => ({
      correct: prev.correct + 1,
      total: prev.total + 1,
    }));

    setTimeout(() => {
      advance();
    }, NEXT_DELAY_MS);
  } else {
    setSelectedKey("__wrong__");
    setTypingDiff(result);
    setScore((prev) => ({
      correct: prev.correct,
      total: prev.total + 1,
    }));

    setTimeout(() => {
      setTypingDiff(null);
      advance();
    }, TYPING_WRONG_DELAY_MS);
  }
}
```

- [ ] **Step 4: Extract `advance` helper from `handleSelect`**

To avoid duplicating the advance logic, extract the setTimeout body from `handleSelect` into a shared function. Replace the existing `handleSelect` function with:

```javascript
function advance() {
  if (phase === "next" && testPrevious) {
    setPhase("previous");
  } else {
    setPhase("next");
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createPromptQueue(verses, boundaryKeys);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
    }
  }
}

function handleSelect(verseKey) {
  if (selectedKey) return;
  setSelectedKey(verseKey);

  const isCorrect = verseKey === question.correctAnswer.verseKey;
  setScore((prev) => ({
    correct: prev.correct + (isCorrect ? 1 : 0),
    total: prev.total + 1,
  }));

  setTimeout(() => {
    advance();
  }, NEXT_DELAY_MS);
}
```

- [ ] **Step 5: Reset `typingDiff` when building a new question**

In the `build()` function inside the `useEffect` that builds questions (the one that calls `setQuestion(q)`), add `setTypingDiff(null)` after the existing `setSelectedKey(null)` line:

```javascript
setSelectedKey(null);
setTypingDiff(null);
```

- [ ] **Step 6: Update JSX — add toggle and conditional answer area**

In the return JSX, update the HintBar to pass the new prop. Replace:

```jsx
<div className="mt-4">
  <HintBar
    ayahNumber={question.prompt.verseNumber}
    chapterId={question.prompt.chapterId}
    surahRevealed={surahRevealed}
    onToggleSurah={() => setSurahRevealed(true)}
    fiftyFiftyRemaining={fiftyFiftyRemaining}
    fiftyFiftyDisabled={fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedKey !== null}
    onFiftyFifty={handleFiftyFifty}
  />
</div>

<div className="mt-4">
  <ChoiceGrid
    choices={question.choices}
    correctKey={question.correctAnswer.verseKey}
    selectedKey={selectedKey}
    onSelect={handleSelect}
    eliminatedKeys={eliminatedKeys}
  />
</div>
```

with:

```jsx
<div className="mt-4">
  <HintBar
    ayahNumber={question.prompt.verseNumber}
    chapterId={question.prompt.chapterId}
    surahRevealed={surahRevealed}
    onToggleSurah={() => setSurahRevealed(true)}
    fiftyFiftyRemaining={fiftyFiftyRemaining}
    fiftyFiftyDisabled={fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedKey !== null}
    fiftyFiftyHidden={answerMode === "type"}
    onFiftyFifty={handleFiftyFifty}
  />
</div>

<div className="mt-4">
  <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
</div>

<div className="mt-4">
  {answerMode === "choices" ? (
    <ChoiceGrid
      choices={question.choices}
      correctKey={question.correctAnswer.verseKey}
      selectedKey={selectedKey}
      onSelect={handleSelect}
      eliminatedKeys={eliminatedKeys}
    />
  ) : typingDiff ? (
    <DiffView diff={typingDiff} />
  ) : selectedKey ? (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
      <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed text-green-700">
        {question.correctAnswer.textUthmani}
      </p>
      <p className="mt-2 text-sm text-green-600">Correct!</p>
    </div>
  ) : (
    <TypingInput onSubmit={handleTypedSubmit} disabled={selectedKey !== null} />
  )}
</div>
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/ayahflow/play/page.js
git commit -m "feat: wire typing mode into AyahFlow game page"
```

---

### Task 8: Manual Testing & Polish

- [ ] **Step 1: Run dev server and test choice mode**

Run: `npm run dev`

1. Navigate to `/ayahflow`
2. Verify the new "Answer Mode" selector appears between Difficulty and Direction sections
3. Leave it on "Choices" (default)
4. Select a scope and start the game
5. Verify choice mode works exactly as before — ChoiceGrid renders, 50/50 works, scoring works

- [ ] **Step 2: Test typing mode from setup**

1. Go back to `/ayahflow`
2. Select "Type It" answer mode
3. Start the game
4. Verify the segmented control shows "Type It" as active
5. Verify 50/50 button is hidden in HintBar
6. Verify the typing textarea renders with Arabic placeholder
7. Type a wrong answer and submit — verify DiffView shows with color-coded word comparison
8. Wait for auto-advance (3s delay)
9. On the next question, copy the correct answer text and submit — verify green correct feedback and 1.2s advance

- [ ] **Step 3: Test mid-game toggle**

1. While in a game, click "Choices" in the segmented control
2. Verify ChoiceGrid appears, 50/50 button reappears
3. Click "Type It" to switch back
4. Verify textarea reappears, 50/50 hides again
5. Verify score is preserved across toggles

- [ ] **Step 4: Test Enter key submission**

1. In typing mode, type text and press Enter (without Shift)
2. Verify the answer is submitted
3. Verify Shift+Enter creates a newline instead of submitting

- [ ] **Step 5: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: polish typing mode after manual testing"
```
