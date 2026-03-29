# Translation & Transliteration Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add translation and transliteration display toggles to AyahFlow settings and game screens, with a translation source selector.

**Architecture:** A centralized translation registry (`src/lib/translations.js`) defines available translations. The fetch layer accepts a `translationId` param and always requests word-level data for transliteration. Display components conditionally render translation/transliteration based on props. Settings are passed as URL query params, with local state on the game screen for mid-game toggling.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, @quranjs/api SDK

**Spec:** `docs/superpowers/specs/2026-03-29-translation-transliteration-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/translations.js` | Create | Translation registry (IDs, names) |
| `src/lib/fetch-verses.js` | Modify | Accept translationId param, extract transliteration from words |
| `src/components/ayahflow/DisplayOptionsSelector.jsx` | Create | Settings screen — translation toggle+select, transliteration toggle |
| `src/components/ayahflow/DisplayOptionsToggle.jsx` | Create | Game screen — compact "EN" and "Aa" pill toggles |
| `src/components/ayahflow/QuestionCard.jsx` | Modify | Conditional translation/transliteration display |
| `src/components/ayahflow/ChoiceCard.jsx` | Modify | Conditional translation/transliteration display |
| `src/app/ayahflow/page.js` | Modify | Add DisplayOptionsSelector, pass query params |
| `src/app/ayahflow/play/page.js` | Modify | Read new params, manage display state, pass props, add DisplayOptionsToggle |

---

### Task 1: Translation Registry

**Files:**
- Create: `src/lib/translations.js`

- [ ] **Step 1: Create the translations registry**

```js
// src/lib/translations.js
export const TRANSLATIONS = [
  { id: "131", name: "Sahih International" },
  { id: "203", name: "Hilali & Khan" },
];

export const DEFAULT_TRANSLATION_ID = "131";
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/translations.js
git commit -m "feat: add translation registry"
```

---

### Task 2: Update Fetch Layer

**Files:**
- Modify: `src/lib/fetch-verses.js`

The fetch layer currently hardcodes `TRANSLATION_ID = "131"` and doesn't request word data. We need to:
1. Accept `translationId` as a parameter to `fetchVersesForScope` and `fetchSurahForDistractors`
2. Add `words: true` to fetch options so we get word-level transliteration
3. Extract transliteration from `raw.words` in `normalizeVerse`

- [ ] **Step 1: Update the module-level constants and normalizeVerse**

Replace the top of `src/lib/fetch-verses.js` (lines 1–21). Remove the hardcoded `TRANSLATION_ID` and `FETCH_OPTS`. Add a `buildFetchOpts` function and update `normalizeVerse`:

```js
"use server";

import client from "./quran-client";
import { DEFAULT_TRANSLATION_ID } from "./translations";

const VERSE_FIELDS = { textUthmani: true };
const MAX_PER_PAGE = 50; // API maximum

function buildFetchOpts(translationId) {
  return {
    fields: VERSE_FIELDS,
    translations: [translationId],
    words: true,
  };
}

function normalizeVerse(raw) {
  const transliteration = (raw.words ?? [])
    .filter((w) => w.charTypeName === "word")
    .map((w) => w.transliteration?.text ?? "")
    .join(" ");

  return {
    id: raw.id,
    verseKey: raw.verseKey,
    chapterId: Number(raw.chapterId ?? raw.verseKey.split(":")[0]),
    verseNumber: raw.verseNumber,
    textUthmani: raw.textUthmani,
    translation: raw.translations?.[0]?.text ?? "",
    transliteration,
    juzNumber: raw.juzNumber,
    hizbNumber: raw.hizbNumber,
    pageNumber: raw.pageNumber,
  };
}
```

- [ ] **Step 2: Update fetchAllPages to accept opts**

Replace the `fetchAllPages` function (lines 27–41):

```js
async function fetchAllPages(fetchFn, id, opts) {
  const all = [];
  let page = 1;
  while (true) {
    const batch = await fetchFn(id, {
      ...opts,
      perPage: MAX_PER_PAGE,
      page,
    });
    all.push(...batch);
    if (batch.length < MAX_PER_PAGE) break;
    page++;
  }
  return all;
}
```

- [ ] **Step 3: Update fetchByChapters, fetchByJuzs, fetchByPages, fetchByHizbs to accept opts**

Replace lines 43–69:

```js
async function fetchByChapters(chapterIds, opts) {
  const results = await Promise.all(
    chapterIds.map((id) => fetchAllPages(client.verses.findByChapter.bind(client.verses), id, opts)),
  );
  return results.flat();
}

async function fetchByJuzs(juzIds, opts) {
  const results = await Promise.all(
    juzIds.map((id) => fetchAllPages(client.verses.findByJuz.bind(client.verses), id, opts)),
  );
  return results.flat();
}

async function fetchByPages(pageNumbers, opts) {
  const results = await Promise.all(
    pageNumbers.map((num) => fetchAllPages(client.verses.findByPage.bind(client.verses), num, opts)),
  );
  return results.flat();
}

async function fetchByHizbs(hizbIds, opts) {
  const results = await Promise.all(
    hizbIds.map((id) => fetchAllPages(client.verses.findByHizb.bind(client.verses), id, opts)),
  );
  return results.flat();
}
```

- [ ] **Step 4: Update fetchVerseByKey to accept translationId**

Replace the `fetchVerseByKey` function (lines 71–77):

```js
async function fetchVerseByKey(verseKey, opts) {
  const raw = await client.verses.findByKey(verseKey, opts);
  return raw;
}
```

- [ ] **Step 5: Update fetchVersesForScope signature and internal calls**

Change the `fetchVersesForScope` export (line 222) to accept `translationId`:

```js
export async function fetchVersesForScope(scopeType, scopeValues, translationId = DEFAULT_TRANSLATION_ID) {
  const opts = buildFetchOpts(translationId);
  let rawVerses;

  switch (scopeType) {
    case "surah":
      rawVerses = await fetchByChapters(scopeValues, opts);
      break;
    case "juz":
      rawVerses = await fetchByJuzs(scopeValues, opts);
      break;
    case "page":
      rawVerses = await fetchByPages(scopeValues, opts);
      break;
    case "hizb":
      rawVerses = await fetchByHizbs(scopeValues, opts);
      break;
    default:
      throw new Error(`Unknown scope type: ${scopeType}`);
  }
```

Also update the boundary fetch calls in the same function to pass `opts`. Find the two `fetchVerseByKey(prevOfFirst)` / `fetchVerseByKey(nextOfLast)` calls and the gap-detection calls, and pass `opts` as second argument:

```js
      boundaryFetches.push(fetchVerseByKey(prevOfFirst, opts));
```
```js
      boundaryFetches.push(fetchVerseByKey(nextOfLast, opts));
```
```js
          boundaryFetches.push(fetchVerseByKey(nextOfBefore, opts));
```
```js
          boundaryFetches.push(fetchVerseByKey(prevOfAfter, opts));
```

- [ ] **Step 6: Update fetchSurahForDistractors**

Replace the `fetchSurahForDistractors` export (lines 307–310):

```js
export async function fetchSurahForDistractors(chapterId, translationId = DEFAULT_TRANSLATION_ID) {
  const opts = buildFetchOpts(translationId);
  const rawVerses = await client.verses.findByChapter(chapterId, opts);
  return rawVerses.map(normalizeVerse);
}
```

- [ ] **Step 7: Verify the app still works**

Run: `npm run dev`

Open the AyahFlow game in the browser. Verify verses still load and display correctly — the game should work exactly as before since `DEFAULT_TRANSLATION_ID` matches the old hardcoded value.

- [ ] **Step 8: Commit**

```bash
git add src/lib/fetch-verses.js
git commit -m "feat: parameterize translation ID and extract transliteration from word data"
```

---

### Task 3: DisplayOptionsSelector Component (Settings Screen)

**Files:**
- Create: `src/components/ayahflow/DisplayOptionsSelector.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ayahflow/DisplayOptionsSelector.jsx
"use client";

import { TRANSLATIONS } from "@/lib/translations";

export default function DisplayOptionsSelector({
  translationEnabled,
  onTranslationEnabledChange,
  translationId,
  onTranslationIdChange,
  transliterationEnabled,
  onTransliterationEnabledChange,
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {/* Translation control */}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={translationEnabled}
              onClick={() => onTranslationEnabledChange(!translationEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                translationEnabled ? "bg-gray-900" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                  translationEnabled ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm font-medium">Translation</span>
          </div>
          <select
            value={translationId}
            onChange={(e) => onTranslationIdChange(e.target.value)}
            disabled={!translationEnabled}
            className={`rounded-lg border border-gray-200 px-2 py-1 text-xs ${
              translationEnabled
                ? "bg-white text-gray-700"
                : "cursor-not-allowed bg-gray-100 text-gray-400 opacity-50"
            }`}
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Transliteration control */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
          <button
            role="switch"
            aria-checked={transliterationEnabled}
            onClick={() => onTransliterationEnabledChange(!transliterationEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              transliterationEnabled ? "bg-gray-900" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                transliterationEnabled ? "translate-x-5.5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-medium">Transliteration</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/DisplayOptionsSelector.jsx
git commit -m "feat: add DisplayOptionsSelector component for settings screen"
```

---

### Task 4: DisplayOptionsToggle Component (Game Screen)

**Files:**
- Create: `src/components/ayahflow/DisplayOptionsToggle.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/ayahflow/DisplayOptionsToggle.jsx
"use client";

export default function DisplayOptionsToggle({
  translationEnabled,
  onTranslationToggle,
  transliterationEnabled,
  onTransliterationToggle,
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onTranslationToggle}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
          translationEnabled
            ? "border-gray-300 bg-gray-100 text-gray-700"
            : "border-gray-200 text-gray-400"
        }`}
      >
        <span>EN</span>
        <div
          className={`relative h-4 w-7 rounded-full transition-colors ${
            translationEnabled ? "bg-gray-900" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              translationEnabled ? "left-3.5" : "left-0.5"
            }`}
          />
        </div>
      </button>
      <button
        onClick={onTransliterationToggle}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
          transliterationEnabled
            ? "border-gray-300 bg-gray-100 text-gray-700"
            : "border-gray-200 text-gray-400"
        }`}
      >
        <span>Aa</span>
        <div
          className={`relative h-4 w-7 rounded-full transition-colors ${
            transliterationEnabled ? "bg-gray-900" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              transliterationEnabled ? "left-3.5" : "left-0.5"
            }`}
          />
        </div>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ayahflow/DisplayOptionsToggle.jsx
git commit -m "feat: add DisplayOptionsToggle component for game screen"
```

---

### Task 5: Update QuestionCard and ChoiceCard

**Files:**
- Modify: `src/components/ayahflow/QuestionCard.jsx`
- Modify: `src/components/ayahflow/ChoiceCard.jsx`

- [ ] **Step 1: Update QuestionCard**

Replace the entire contents of `src/components/ayahflow/QuestionCard.jsx`:

```jsx
export default function QuestionCard({
  verse,
  direction,
  showTranslation = true,
  showTransliteration = false,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-6 text-center">
      <p className="text-sm font-medium text-gray-500">
        {direction === "next" ? "What comes next?" : "What came before?"}
      </p>
      <p
        dir="rtl"
        lang="ar"
        className="mt-4 font-arabic text-3xl leading-loose">
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-3 text-sm italic text-gray-500">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-2 text-sm text-gray-400">{verse.translation}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update ChoiceCard**

Replace the entire contents of `src/components/ayahflow/ChoiceCard.jsx`:

```jsx
"use client";

export default function ChoiceCard({
  verse,
  state,
  onClick,
  showTranslation = true,
  showTransliteration = false,
}) {
  const styles = {
    default:
      "border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer",
    correct: "border-green-500 bg-green-50",
    incorrect: "border-red-500 bg-red-50",
    reveal: "border-green-500 bg-green-50 opacity-60",
  };

  return (
    <button
      onClick={onClick}
      disabled={state !== "default"}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${styles[state]}`}>
      <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed">
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-1.5 text-xs italic text-gray-500">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-1.5 text-sm text-gray-500">{verse.translation}</p>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ayahflow/QuestionCard.jsx src/components/ayahflow/ChoiceCard.jsx
git commit -m "feat: add conditional translation and transliteration display to verse cards"
```

---

### Task 6: Update Settings Screen

**Files:**
- Modify: `src/app/ayahflow/page.js`

- [ ] **Step 1: Add imports and state**

Add the import at the top of the file, after the existing imports:

```js
import DisplayOptionsSelector from "@/components/ayahflow/DisplayOptionsSelector";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";
```

Add state variables inside `AyahFlowSetup`, after the existing `useState` calls:

```js
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);
```

- [ ] **Step 2: Update handleStart to include new params**

Replace the `handleStart` function:

```js
  function handleStart() {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeValues: scope.values.join(","),
      difficulty,
      mode: answerMode,
      testPrevious: testPrevious.toString(),
      translation: translationEnabled ? translationId : "off",
      transliteration: transliterationEnabled ? "on" : "off",
    });
    router.push(`/ayahflow/play?${params.toString()}`);
  }
```

- [ ] **Step 3: Add DisplayOptionsSelector section to the JSX**

Add this new `<section>` block after the DirectionToggle section and before the Start button:

```jsx
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Display Options
          </h2>
          <DisplayOptionsSelector
            translationEnabled={translationEnabled}
            onTranslationEnabledChange={setTranslationEnabled}
            translationId={translationId}
            onTranslationIdChange={setTranslationId}
            transliterationEnabled={transliterationEnabled}
            onTransliterationEnabledChange={setTransliterationEnabled}
          />
        </section>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/ayahflow/page.js
git commit -m "feat: add display options section to AyahFlow settings screen"
```

---

### Task 7: Update Game Screen

**Files:**
- Modify: `src/app/ayahflow/play/page.js`

This is the largest change. We need to:
1. Read the new query params
2. Add local state for mid-game display toggling
3. Pass translation ID to fetch calls
4. Add the compact toggle to the top bar
5. Pass display props to QuestionCard and ChoiceGrid/ChoiceCard

- [ ] **Step 1: Add imports**

Add these imports at the top of the file, after the existing imports:

```js
import DisplayOptionsToggle from "@/components/ayahflow/DisplayOptionsToggle";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";
```

- [ ] **Step 2: Read new query params and add display state**

Inside `AyahFlowGameInner`, after the existing param reads (after `const initialMode = ...`), add:

```js
  const translationParam = searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID;
  const transliterationParam = searchParams.get("transliteration") === "on";
  const translationId = translationParam === "off" ? DEFAULT_TRANSLATION_ID : translationParam;
```

After the existing `useState` calls (after `const [typingDiff, setTypingDiff] = useState(null);`), add:

```js
  const [showTranslation, setShowTranslation] = useState(translationParam !== "off");
  const [showTransliteration, setShowTransliteration] = useState(transliterationParam);
```

- [ ] **Step 3: Pass translationId to fetchVersesForScope**

In the `useEffect` that calls `load()`, update the `fetchVersesForScope` call:

Find:
```js
        const result = await fetchVersesForScope(scopeType, scopeValues);
```

Replace with:
```js
        const result = await fetchVersesForScope(scopeType, scopeValues, translationId);
```

- [ ] **Step 4: Pass translationId to fetchSurahForDistractors**

In the `getSurahVerses` callback, update the fetch call:

Find:
```js
    const fetched = await fetchSurahForDistractors(chapterId);
```

Replace with:
```js
    const fetched = await fetchSurahForDistractors(chapterId, translationId);
```

- [ ] **Step 5: Add DisplayOptionsToggle to the top bar**

In the JSX, find the top bar area with ScoreCounter and End button:

```jsx
      <div className="mt-4 mb-6 flex items-center justify-between">
        <ScoreCounter correct={score.correct} total={score.total} />
        <button
          onClick={handleEnd}
          className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm hover:bg-gray-50">
          End
        </button>
      </div>
```

Replace with:

```jsx
      <div className="mt-4 mb-6 flex items-center justify-between">
        <ScoreCounter correct={score.correct} total={score.total} />
        <div className="flex items-center gap-2">
          <DisplayOptionsToggle
            translationEnabled={showTranslation}
            onTranslationToggle={() => setShowTranslation((prev) => !prev)}
            transliterationEnabled={showTransliteration}
            onTransliterationToggle={() => setShowTransliteration((prev) => !prev)}
          />
          <button
            onClick={handleEnd}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm hover:bg-gray-50">
            End
          </button>
        </div>
      </div>
```

- [ ] **Step 6: Pass display props to QuestionCard**

Find:
```jsx
      <QuestionCard verse={question.prompt} direction={question.direction} />
```

Replace with:
```jsx
      <QuestionCard
        verse={question.prompt}
        direction={question.direction}
        showTranslation={showTranslation}
        showTransliteration={showTransliteration}
      />
```

- [ ] **Step 7: Pass display props to ChoiceGrid**

The `ChoiceGrid` component renders `ChoiceCard` components. We need to pass the display props through. First, find the `ChoiceGrid` usage:

```jsx
          <ChoiceGrid
            choices={question.choices}
            correctKey={question.correctAnswer.verseKey}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            eliminatedKeys={eliminatedKeys}
          />
```

Replace with:

```jsx
          <ChoiceGrid
            choices={question.choices}
            correctKey={question.correctAnswer.verseKey}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            eliminatedKeys={eliminatedKeys}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
          />
```

- [ ] **Step 8: Update ChoiceGrid to pass display props to ChoiceCard**

Read `src/components/ayahflow/ChoiceGrid.jsx` and add `showTranslation` and `showTransliteration` to its props, passing them through to each `ChoiceCard`. Add these two props to the component's destructured params and pass them to each `<ChoiceCard>` element:

```jsx
showTranslation={showTranslation}
showTransliteration={showTransliteration}
```

- [ ] **Step 9: Verify everything works end-to-end**

Run: `npm run dev`

Test the full flow:
1. Go to `/ayahflow` settings — verify Display Options section appears
2. Toggle translation off — start game — verify no English text shown
3. Toggle translation on with Hilali & Khan — start game — verify translation text appears
4. Toggle transliteration on — start game — verify romanized text appears
5. During a game, toggle EN/Aa buttons — verify immediate show/hide

- [ ] **Step 10: Commit**

```bash
git add src/app/ayahflow/play/page.js src/components/ayahflow/ChoiceGrid.jsx
git commit -m "feat: wire up translation and transliteration toggles in AyahFlow game screen"
```
