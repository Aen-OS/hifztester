# AyahFlow Hints & 50/50 Lifeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hint bar with ayah number display, surah reveal toggle, and 50/50 lifeline to the AyahFlow game page.

**Architecture:** Extract `SURAH_NAMES` to a shared module, create a new `HintBar` component, add hint/lifeline state to the game page, and filter eliminated choices in `ChoiceGrid`. All changes are UI-only with no API calls needed.

**Tech Stack:** Next.js, React, Tailwind CSS

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/quran-data.js` | Create | Exports `SURAH_NAMES` array (shared data) |
| `src/components/ayahflow/ScopeSelector.jsx` | Modify | Import `SURAH_NAMES` from shared module, remove local copy |
| `src/components/ayahflow/HintBar.jsx` | Create | Hint bar UI: ayah number, surah toggle, 50/50 button |
| `src/components/ayahflow/ChoiceGrid.jsx` | Modify | Accept `eliminatedKeys`, filter out eliminated choices |
| `src/app/ayahflow/play/page.js` | Modify | Add hint/50/50 state, wire HintBar + ChoiceGrid props |

---

### Task 1: Extract SURAH_NAMES to shared module

**Files:**
- Create: `src/lib/quran-data.js`
- Modify: `src/components/ayahflow/ScopeSelector.jsx`

- [ ] **Step 1: Create `src/lib/quran-data.js`**

```js
export const SURAH_NAMES = [
  "", "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah",
  "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
  "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr",
  "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Taha",
  "Al-Anbya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan",
  "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum",
  "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir",
  "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
  "Fussilat", "Ash-Shuraa", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah",
  "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
  "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman",
  "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
  "As-Saf", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq",
  "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
  "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah",
  "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa",
  "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj",
  "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Ad-Duhaa", "Ash-Sharh", "At-Tin",
  "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat",
  "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil",
  "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
  "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
];
```

- [ ] **Step 2: Update ScopeSelector to import from shared module**

In `src/components/ayahflow/ScopeSelector.jsx`:
- Remove the `const SURAH_NAMES = [...]` block (lines 12-36)
- Add import at the top: `import { SURAH_NAMES } from "@/lib/quran-data";`

- [ ] **Step 3: Verify the app still works**

Run: `npm run dev`
Open the AyahFlow setup page and confirm surah names still display correctly in the scope selector.

- [ ] **Step 4: Commit**

```bash
git add src/lib/quran-data.js src/components/ayahflow/ScopeSelector.jsx
git commit -m "refactor: extract SURAH_NAMES to shared quran-data module"
```

---

### Task 2: Create HintBar component

**Files:**
- Create: `src/components/ayahflow/HintBar.jsx`

- [ ] **Step 1: Create `src/components/ayahflow/HintBar.jsx`**

```jsx
"use client";

import { SURAH_NAMES } from "@/lib/quran-data";

export default function HintBar({
  ayahNumber,
  chapterId,
  surahRevealed,
  onToggleSurah,
  fiftyFiftyRemaining,
  fiftyFiftyDisabled,
  onFiftyFifty,
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">
          Ayah {ayahNumber}
        </span>

        <span className="text-gray-300">|</span>

        {surahRevealed ? (
          <span className="text-sm font-medium text-gray-700">
            Surah {chapterId} &mdash; {SURAH_NAMES[chapterId]}
          </span>
        ) : (
          <button
            onClick={onToggleSurah}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            Reveal Surah
          </button>
        )}
      </div>

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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/HintBar.jsx
git commit -m "feat: add HintBar component with surah toggle and 50/50 button"
```

---

### Task 3: Update ChoiceGrid to support eliminated choices

**Files:**
- Modify: `src/components/ayahflow/ChoiceGrid.jsx`

- [ ] **Step 1: Add `eliminatedKeys` prop and filter choices**

In `src/components/ayahflow/ChoiceGrid.jsx`, update the component to accept `eliminatedKeys` (defaults to `[]`) and filter out eliminated choices before rendering:

```jsx
"use client";

import ChoiceCard from "./ChoiceCard";

export default function ChoiceGrid({ choices, correctKey, selectedKey, onSelect, eliminatedKeys = [] }) {
  function getState(choice) {
    if (!selectedKey) return "default";
    if (choice.verseKey === selectedKey && choice.verseKey === correctKey) return "correct";
    if (choice.verseKey === selectedKey && choice.verseKey !== correctKey) return "incorrect";
    if (choice.verseKey === correctKey) return "reveal";
    return "default";
  }

  const visibleChoices = eliminatedKeys.length > 0
    ? choices.filter((c) => !eliminatedKeys.includes(c.verseKey))
    : choices;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleChoices.map((choice) => (
        <ChoiceCard
          key={choice.verseKey}
          verse={choice}
          state={getState(choice)}
          onClick={() => onSelect(choice.verseKey)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/ChoiceGrid.jsx
git commit -m "feat: add eliminatedKeys filtering to ChoiceGrid"
```

---

### Task 4: Wire hint state and HintBar into the game page

**Files:**
- Modify: `src/app/ayahflow/play/page.js`

- [ ] **Step 1: Add HintBar import**

At the top of `src/app/ayahflow/play/page.js`, add after the existing component imports (after line 19):

```js
import HintBar from "@/components/ayahflow/HintBar";
```

- [ ] **Step 2: Add hint/50/50 state variables**

Inside `AyahFlowGameInner`, after the existing state declarations (after line 44, the `showResults` state), add:

```js
const [surahRevealed, setSurahRevealed] = useState(false);
const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
const [eliminatedKeys, setEliminatedKeys] = useState([]);
const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);
```

- [ ] **Step 3: Add per-question reset logic**

Inside `AyahFlowGameInner`, after the `setQuestion(q)` call (line 123) and before the `setSelectedKey(null)` call (line 124), add the hint resets:

```js
      setQuestion(q);
      setSurahRevealed(false);
      setEliminatedKeys([]);
      setFiftyFiftyUsedThisRound(false);
      setSelectedKey(null);
```

- [ ] **Step 4: Add 50/50 handler function**

Inside `AyahFlowGameInner`, after the `handleEnd` function (after line 159), add:

```js
function handleFiftyFifty() {
  if (fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedKey) return;

  const incorrectChoices = question.choices.filter(
    (c) => c.verseKey !== question.correctAnswer.verseKey,
  );
  const shuffled = incorrectChoices.sort(() => Math.random() - 0.5);
  const toEliminate = shuffled.slice(0, 2).map((c) => c.verseKey);

  setEliminatedKeys(toEliminate);
  setFiftyFiftyUsedThisRound(true);
  setFiftyFiftyRemaining((prev) => prev - 1);
}
```

- [ ] **Step 5: Also reset fiftyFiftyRemaining in "Play Again"**

In the `showResults` block, inside the "Play Again" button's `onClick` handler (around line 202), add `setFiftyFiftyRemaining(3)` to reset lifeline uses for a new session:

```js
onClick={() => {
  setShowResults(false);
  setScore({ correct: 0, total: 0 });
  setFiftyFiftyRemaining(3);
  const newQueue = createPromptQueue(verses, boundaryKeys);
  setPromptQueue(newQueue);
  setPromptIndex(0);
  setPhase("next");
}}
```

- [ ] **Step 6: Render HintBar between QuestionCard and ChoiceGrid**

Replace the current QuestionCard + ChoiceGrid JSX section (lines 236-245) with:

```jsx
      <QuestionCard verse={question.prompt} direction={question.direction} />

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

- [ ] **Step 7: Verify everything works**

Run: `npm run dev`
Test the following:
1. Ayah number is always visible in the hint bar
2. "Reveal Surah" button shows surah number and name when clicked
3. Surah hint resets to hidden on the next question
4. 50/50 button removes 2 choices, leaving correct answer + 1 wrong choice
5. 50/50 counter decrements and button disables after use on a question
6. 50/50 button is disabled after selecting an answer
7. After 3 total 50/50 uses, the button stays disabled permanently
8. "Play Again" resets the 50/50 counter to 3

- [ ] **Step 8: Commit**

```bash
git add src/app/ayahflow/play/page.js
git commit -m "feat: wire hint bar and 50/50 lifeline into AyahFlow game page"
```
