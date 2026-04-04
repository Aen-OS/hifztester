# Ma'naMatch Game + Audio Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Ma'naMatch game (match Arabic ayahs to their English translations) and a shared audio playback system for Ma'naMatch and AyahFlow.

**Architecture:** New game follows the existing pattern: engine file + setup page + play page + game-specific components. Audio is a shared system: `fetch-audio.js` for API calls, `useAudioPlayer` hook for playback state, and three shared UI components (`AudioPlayButton`, `ReciterSelector`, `ReciterToggle`).

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Quran Foundation API v4 (audio recitations endpoint), HTML5 Audio API.

**Spec:** `docs/superpowers/specs/2026-04-04-manamatch-and-audio-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/lib/reciters.js` | Reciter list constant + default ID |
| `src/lib/fetch-audio.js` | Fetch audio URL from Quran API, in-memory cache |
| `src/hooks/useAudioPlayer.js` | Shared hook: Audio element management, play/stop/state |
| `src/components/shared/AudioPlayButton.jsx` | Play/stop button for a single verse |
| `src/components/shared/ReciterSelector.jsx` | Setup page: toggle + reciter picker |
| `src/components/shared/ReciterToggle.jsx` | Play page: compact reciter switcher |
| `src/lib/manamatch-engine.js` | Queue creation, question building, distractor generation |
| `src/components/manamatch/ManaMatchQuestionCard.jsx` | Arabic prompt card with audio button |
| `src/components/manamatch/TranslationChoiceGrid.jsx` | English translation choice cards |
| `src/app/manamatch/page.js` | Setup page |
| `src/app/manamatch/play/page.js` | Play page |

### Modified files

| File | Change |
|------|--------|
| `src/app/page.js` | Add 5th game card centered below grid |
| `src/app/ayahflow/page.js` | Add ReciterSelector section + reciter URL param |
| `src/app/ayahflow/play/page.js` | Read reciter param, render ReciterToggle, pass reciterId to QuestionCard |
| `src/components/ayahflow/QuestionCard.jsx` | Add optional reciterId prop, conditionally render AudioPlayButton |

---

### Task 1: Reciters data + audio fetching

**Files:**
- Create: `src/lib/reciters.js`
- Create: `src/lib/fetch-audio.js`

- [ ] **Step 1: Create reciters.js**

```javascript
// src/lib/reciters.js
export const RECITERS = [
  { id: "7", name: "Mishary Rashid Alafasy", short: "Alafasy" },
  { id: "2", name: "Abdul Basit (Murattal)", short: "Abdul Basit" },
  { id: "4", name: "Abu Bakr al-Shatri", short: "al-Shatri" },
];

export const DEFAULT_RECITER_ID = "7";
```

- [ ] **Step 2: Create fetch-audio.js**

```javascript
// src/lib/fetch-audio.js
const AUDIO_CDN = "https://audio.qurancdn.com/";
const cache = new Map();

export async function fetchAudioUrl(reciterId, verseKey) {
  const cacheKey = `${reciterId}:${verseKey}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await fetch(
    `https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${verseKey}`
  );
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);

  const data = await res.json();
  const relativePath = data.audio_files?.[0]?.url;
  if (!relativePath) throw new Error("No audio file found");

  const fullUrl = `${AUDIO_CDN}${relativePath}`;
  cache.set(cacheKey, fullUrl);
  return fullUrl;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/reciters.js src/lib/fetch-audio.js
git commit -m "feat: add reciters data and audio URL fetching"
```

---

### Task 2: useAudioPlayer hook

**Files:**
- Create: `src/hooks/useAudioPlayer.js`

- [ ] **Step 1: Create the hook**

```javascript
// src/hooks/useAudioPlayer.js
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchAudioUrl } from "@/lib/fetch-audio";

export default function useAudioPlayer(reciterId) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVerseKey, setCurrentVerseKey] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentVerseKey(null);
    };
    const onError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentVerseKey(null);
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentVerseKey(null);
  }, []);

  const playVerse = useCallback(
    async (verseKey) => {
      if (!reciterId) return;
      const audio = audioRef.current;
      if (!audio) return;

      // If same verse is playing, stop it
      if (isPlaying && currentVerseKey === verseKey) {
        stop();
        return;
      }

      // Stop any current playback
      audio.pause();
      audio.currentTime = 0;
      setIsLoading(true);
      setCurrentVerseKey(verseKey);

      try {
        const url = await fetchAudioUrl(reciterId, verseKey);
        audio.src = url;
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setCurrentVerseKey(null);
      } finally {
        setIsLoading(false);
      }
    },
    [reciterId, isPlaying, currentVerseKey, stop],
  );

  return { playVerse, stop, isPlaying, isLoading, currentVerseKey };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAudioPlayer.js
git commit -m "feat: add useAudioPlayer hook for shared audio playback"
```

---

### Task 3: Shared audio UI components

**Files:**
- Create: `src/components/shared/AudioPlayButton.jsx`
- Create: `src/components/shared/ReciterSelector.jsx`
- Create: `src/components/shared/ReciterToggle.jsx`

- [ ] **Step 1: Create AudioPlayButton**

```jsx
// src/components/shared/AudioPlayButton.jsx
"use client";

import useAudioPlayer from "@/hooks/useAudioPlayer";

export default function AudioPlayButton({ verseKey, reciterId }) {
  const { playVerse, isPlaying, isLoading, currentVerseKey } =
    useAudioPlayer(reciterId);

  const isActive = currentVerseKey === verseKey;

  return (
    <button
      onClick={() => playVerse(verseKey)}
      aria-label={isActive && isPlaying ? "Stop recitation" : "Play recitation"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-emerald-50"
    >
      {isActive && isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
      ) : isActive && isPlaying ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-emerald-700"
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-emerald-700/40"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Create ReciterSelector**

```jsx
// src/components/shared/ReciterSelector.jsx
"use client";

import { RECITERS, DEFAULT_RECITER_ID } from "@/lib/reciters";

export default function ReciterSelector({ value, onChange }) {
  const enabled = value !== null;

  function handleToggle() {
    if (enabled) {
      onChange(null);
    } else {
      onChange(DEFAULT_RECITER_ID);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <button
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            enabled ? "bg-emerald-700" : "bg-emerald-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5.5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm font-medium">Recitation</span>
      </div>

      {enabled && (
        <div className="mt-2 flex gap-1 rounded-[10px] bg-[#f0f0eb] p-1">
          {RECITERS.map((r) => (
            <button
              key={r.id}
              onClick={() => onChange(r.id)}
              className={`flex-1 rounded-[8px] px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                value === r.id
                  ? "bg-emerald-700 text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {r.short}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ReciterToggle**

```jsx
// src/components/shared/ReciterToggle.jsx
"use client";

import { RECITERS } from "@/lib/reciters";

export default function ReciterToggle({ value, onChange }) {
  return (
    <div className="flex rounded-[10px] bg-[#f0f0eb] p-1">
      {RECITERS.map((r) => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          className={`flex-1 rounded-[8px] px-2 py-1.5 text-xs font-medium transition-all duration-150 ${
            value === r.id
              ? "bg-surface text-emerald-700 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              : "text-muted hover:text-ink"
          }`}
        >
          {r.short}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/AudioPlayButton.jsx src/components/shared/ReciterSelector.jsx src/components/shared/ReciterToggle.jsx
git commit -m "feat: add shared audio UI components (AudioPlayButton, ReciterSelector, ReciterToggle)"
```

---

### Task 4: Integrate audio into AyahFlow

**Files:**
- Modify: `src/app/ayahflow/page.js`
- Modify: `src/app/ayahflow/play/page.js`
- Modify: `src/components/ayahflow/QuestionCard.jsx`

- [ ] **Step 1: Add ReciterSelector to AyahFlow setup page**

In `src/app/ayahflow/page.js`, add the import and state:

```javascript
import ReciterSelector from "@/components/shared/ReciterSelector";
```

Add state after the other `useState` calls:

```javascript
const [reciterId, setReciterId] = useState(null);
```

Add `reciter` to the URL params in `handleStart`:

```javascript
reciter: reciterId ?? "off",
```

Add a new section after the Display Options section (before the Start button):

```jsx
<section>
  <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
    Audio
  </h2>
  <ReciterSelector value={reciterId} onChange={setReciterId} />
</section>
```

- [ ] **Step 2: Add audio to AyahFlow play page**

In `src/app/ayahflow/play/page.js`, add the import:

```javascript
import ReciterToggle from "@/components/shared/ReciterToggle";
```

Read the reciter param (add after `transliterationParam`):

```javascript
const reciterParam = searchParams.get("reciter") ?? "off";
const [reciterId, setReciterId] = useState(reciterParam !== "off" ? reciterParam : null);
```

Pass `reciterId` to `QuestionCard` (add the prop):

```jsx
<QuestionCard
  verse={question.prompt}
  direction={question.direction}
  showTranslation={showTranslation}
  showTransliteration={showTransliteration}
  reciterId={reciterId}
/>
```

Add `ReciterToggle` in the controls row. Find the `<div className="flex justify-end">` that contains `DisplayOptionsToggle` and change it to:

```jsx
<div className="flex items-center justify-between">
  {reciterId ? (
    <ReciterToggle value={reciterId} onChange={setReciterId} />
  ) : (
    <div />
  )}
  <DisplayOptionsToggle
    translationEnabled={showTranslation}
    onTranslationToggle={() => setShowTranslation((prev) => !prev)}
    transliterationEnabled={showTransliteration}
    onTransliterationToggle={() => setShowTransliteration((prev) => !prev)}
  />
</div>
```

- [ ] **Step 3: Add reciterId prop to QuestionCard**

In `src/components/ayahflow/QuestionCard.jsx`, add the import and update the component:

```jsx
import AudioPlayButton from "@/components/shared/AudioPlayButton";

export default function QuestionCard({
  verse,
  direction,
  showTranslation = true,
  showTransliteration = false,
  reciterId = null,
}) {
  return (
    <div className="rounded-[14px] border border-emerald-700/15 bg-surface px-6 py-7 text-center">
      <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
        {direction === "next" ? "What comes next?" : "What came before?"}
      </p>
      <p
        dir="rtl"
        lang="ar"
        className="font-arabic text-[26px] leading-[2.0]">
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-3 text-sm italic text-muted">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-2 text-sm text-muted">{verse.translation}</p>
      )}
      {reciterId && (
        <div className="mt-3 flex justify-center">
          <AudioPlayButton verseKey={verse.verseKey} reciterId={reciterId} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Build and verify**

Run: `npx next build`
Expected: Compiles successfully with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/ayahflow/page.js src/app/ayahflow/play/page.js src/components/ayahflow/QuestionCard.jsx
git commit -m "feat: integrate audio playback into AyahFlow setup and play pages"
```

---

### Task 5: Ma'naMatch engine

**Files:**
- Create: `src/lib/manamatch-engine.js`

- [ ] **Step 1: Create the engine**

```javascript
// src/lib/manamatch-engine.js
import { shuffle, generateDistractors } from "./game-engine";

/**
 * Create a shuffled queue of verses for Ma'naMatch.
 * Excludes verses without translations.
 */
export function createManaMatchQueue(verses) {
  const eligible = verses.filter(
    (v) => v.translation && v.translation.trim().length > 0,
  );
  return shuffle([...eligible]);
}

/**
 * Build a Ma'naMatch question: Arabic prompt + 4 translation choices.
 *
 * Returns:
 * {
 *   prompt: verse,
 *   correctAnswer: { verseKey, translation },
 *   choices: [{ verseKey, translation }, ...] (4 items, shuffled)
 * }
 */
export function buildManaMatchQuestion(
  promptVerse,
  difficulty,
  scopeVerses,
  surahVerses,
) {
  const distractors = generateDistractors(
    promptVerse,
    difficulty,
    scopeVerses,
    surahVerses,
  );

  const correctChoice = {
    verseKey: promptVerse.verseKey,
    translation: promptVerse.translation,
  };

  const distractorChoices = distractors.map((v) => ({
    verseKey: v.verseKey,
    translation: v.translation,
  }));

  const choices = shuffle([correctChoice, ...distractorChoices]);

  return {
    prompt: promptVerse,
    correctAnswer: correctChoice,
    choices,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/manamatch-engine.js
git commit -m "feat: add Ma'naMatch game engine (queue + question builder)"
```

---

### Task 6: Ma'naMatch components

**Files:**
- Create: `src/components/manamatch/ManaMatchQuestionCard.jsx`
- Create: `src/components/manamatch/TranslationChoiceGrid.jsx`

- [ ] **Step 1: Create ManaMatchQuestionCard**

```jsx
// src/components/manamatch/ManaMatchQuestionCard.jsx
"use client";

import AudioPlayButton from "@/components/shared/AudioPlayButton";

export default function ManaMatchQuestionCard({
  verse,
  showTransliteration = false,
  reciterId = null,
}) {
  return (
    <div className="rounded-[14px] border border-emerald-700/15 bg-surface px-6 py-7 text-center">
      <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
        Match the translation
      </p>
      <p
        dir="rtl"
        lang="ar"
        className="font-arabic text-[26px] leading-[2.0]"
      >
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-3 text-sm italic text-muted">
          {verse.transliteration}
        </p>
      )}
      {reciterId && (
        <div className="mt-3 flex justify-center">
          <AudioPlayButton verseKey={verse.verseKey} reciterId={reciterId} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create TranslationChoiceGrid**

```jsx
// src/components/manamatch/TranslationChoiceGrid.jsx
"use client";

export default function TranslationChoiceGrid({
  choices,
  correctKey,
  selectedKey,
  onSelect,
}) {
  function getState(choice) {
    if (!selectedKey) return "default";
    if (choice.verseKey === selectedKey && choice.verseKey === correctKey)
      return "correct";
    if (choice.verseKey === selectedKey && choice.verseKey !== correctKey)
      return "incorrect";
    if (choice.verseKey === correctKey) return "reveal";
    return "default";
  }

  const styles = {
    default:
      "border-[#e0e0d8] bg-surface hover:border-emerald-700/50 hover:bg-emerald-700/4 cursor-pointer",
    correct: "border-[1.5px] border-[#4caf82] bg-[#f0faf4]",
    incorrect: "border-[1.5px] border-[#e8a87c] bg-[#fff8f0] animate-shake",
    reveal: "border-[1.5px] border-[#4caf82] bg-[#f0faf4] opacity-60",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {choices.map((choice) => (
        <button
          key={choice.verseKey}
          onClick={() => onSelect(choice.verseKey)}
          disabled={selectedKey !== null}
          className={`min-h-16 w-full rounded-[10px] border px-5 py-4 text-left transition-all duration-150 ${styles[getState(choice)]}`}
        >
          <p className="text-[15px] font-body leading-[1.6]">
            {choice.translation}
          </p>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/manamatch/ManaMatchQuestionCard.jsx src/components/manamatch/TranslationChoiceGrid.jsx
git commit -m "feat: add Ma'naMatch question card and translation choice grid components"
```

---

### Task 7: Ma'naMatch setup page

**Files:**
- Create: `src/app/manamatch/page.js`

- [ ] **Step 1: Create the setup page**

```jsx
// src/app/manamatch/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";
import DifficultySelector from "@/components/ayahflow/DifficultySelector";
import ReciterSelector from "@/components/shared/ReciterSelector";
import BackButton from "@/components/BackButton";
import { TRANSLATIONS, DEFAULT_TRANSLATION_ID } from "@/lib/translations";

export default function ManaMatchSetup() {
  const router = useRouter();
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [difficulty, setDifficulty] = useState("easy");
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [reciterId, setReciterId] = useState(null);

  function handleStart() {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeValues: scope.values.join(","),
      difficulty,
      transliteration: transliterationEnabled ? "on" : "off",
      translation: translationId,
      reciter: reciterId ?? "off",
    });
    router.push(`/manamatch/play?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[680px] px-5 py-12">
      <BackButton />
      <h1 className="mt-4 text-3xl font-bold text-emerald-700">Ma&apos;naMatch</h1>
      <p className="mt-1 text-muted">
        Match the translation to the Arabic verse
      </p>

      <div className="mt-7 space-y-7">
        <section>
          <h2 className="mb-2.5 text-sm font-medium uppercase tracking-wide text-muted">
            Scope
          </h2>
          <ScopeSelector value={scope} onChange={setScope} />
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-medium uppercase tracking-wide text-muted">
            Difficulty
          </h2>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-medium uppercase tracking-wide text-muted">
            Translation
          </h2>
          <select
            value={translationId}
            onChange={(e) => setTranslationId(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-medium uppercase tracking-wide text-muted">
            Display Options
          </h2>
          <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
            <button
              role="switch"
              aria-checked={transliterationEnabled}
              onClick={() => setTransliterationEnabled(!transliterationEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                transliterationEnabled ? "bg-emerald-700" : "bg-emerald-200"
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
        </section>

        <section>
          <h2 className="mb-2.5 text-sm font-medium uppercase tracking-wide text-muted">
            Audio
          </h2>
          <ReciterSelector value={reciterId} onChange={setReciterId} />
        </section>

        <button
          onClick={handleStart}
          disabled={scope.values.length === 0}
          className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
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
git add src/app/manamatch/page.js
git commit -m "feat: add Ma'naMatch setup page"
```

---

### Task 8: Ma'naMatch play page

**Files:**
- Create: `src/app/manamatch/play/page.js`

- [ ] **Step 1: Create the play page**

```jsx
// src/app/manamatch/play/page.js
"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope, fetchSurahForDistractors } from "@/lib/fetch-verses";
import { createManaMatchQueue, buildManaMatchQuestion } from "@/lib/manamatch-engine";
import ManaMatchQuestionCard from "@/components/manamatch/ManaMatchQuestionCard";
import TranslationChoiceGrid from "@/components/manamatch/TranslationChoiceGrid";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import ReciterToggle from "@/components/shared/ReciterToggle";
import DisplayOptionsToggle from "@/components/ayahflow/DisplayOptionsToggle";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

const CORRECT_DELAY_MS = 1200;
const WRONG_DELAY_MS = 2000;

function ManaMatchGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const transliterationParam = searchParams.get("transliteration") === "on";
  const translationId = searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID;
  const reciterParam = searchParams.get("reciter") ?? "off";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verses, setVerses] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(transliterationParam);
  const [reciterId, setReciterId] = useState(
    reciterParam !== "off" ? reciterParam : null,
  );

  const surahCacheRef = useRef({});

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/manamatch");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(
          scopeType,
          scopeValues,
          translationId,
        );
        setVerses(result.verses);

        const queue = createManaMatchQueue(result.verses);
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

  const getSurahVerses = useCallback(
    async (chapterId) => {
      if (surahCacheRef.current[chapterId])
        return surahCacheRef.current[chapterId];

      const fetched = await fetchSurahForDistractors(chapterId, translationId);
      surahCacheRef.current[chapterId] = fetched;
      return fetched;
    },
    [translationId],
  );

  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    async function build() {
      const prompt = promptQueue[promptIndex];

      let surahVerses = verses.filter(
        (v) => v.chapterId === prompt.chapterId,
      );
      if (difficulty !== "easy") {
        surahVerses = await getSurahVerses(prompt.chapterId);
      }

      const q = buildManaMatchQuestion(
        prompt,
        difficulty,
        verses,
        surahVerses,
      );
      setQuestion(q);
      setSelectedKey(null);
    }

    build();
  }, [promptQueue, promptIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createManaMatchQueue(verses);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
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

    setTimeout(advance, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          <p className="mt-4 text-sm text-muted">Loading verses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gold-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-400"
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
          <p className="mt-4 text-4xl font-bold text-emerald-700">
            {score.correct}/{score.total}
          </p>
          <p className="mt-1 text-muted">{pct}% accuracy</p>
          <div className="mt-8 flex gap-3">
            <button
              onClick={() => {
                setShowResults(false);
                setScore({ correct: 0, total: 0 });
                const newQueue = createManaMatchQueue(verses);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
              className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-400"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push("/manamatch")}
              className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-emerald-50"
            >
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex h-dvh max-w-[680px] flex-col px-5">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <BackButton />
        <button
          onClick={() => setShowResults(true)}
          className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          End
        </button>
      </div>

      {/* Question zone */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto py-4">
        <div className="w-full space-y-4">
          <ScoreCounter correct={score.correct} total={score.total} />
          <ManaMatchQuestionCard
            verse={question.prompt}
            showTransliteration={showTransliteration}
            reciterId={reciterId}
          />
          <div className="flex items-center justify-between">
            {reciterId ? (
              <ReciterToggle value={reciterId} onChange={setReciterId} />
            ) : (
              <div />
            )}
            <button
              role="switch"
              aria-checked={showTransliteration}
              aria-label="Toggle transliteration"
              onClick={() => setShowTransliteration((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                showTransliteration
                  ? "border-emerald-200 bg-emerald-50 text-ink"
                  : "border-border text-muted"
              }`}
            >
              <span>Aa</span>
              <div
                className={`relative h-4 w-7 rounded-full transition-colors ${
                  showTransliteration ? "bg-emerald-700" : "bg-emerald-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                    showTransliteration ? "left-3.5" : "left-0.5"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Answer zone */}
      <div className="border-t border-border bg-surface py-3">
        <TranslationChoiceGrid
          choices={question.choices}
          correctKey={question.correctAnswer.verseKey}
          selectedKey={selectedKey}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}

export default function ManaMatchGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
        </div>
      }
    >
      <ManaMatchGameInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Build and verify**

Run: `npx next build`
Expected: Compiles successfully with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/manamatch/play/page.js
git commit -m "feat: add Ma'naMatch play page"
```

---

### Task 9: Add Ma'naMatch to home screen

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add the 5th game card centered below the grid**

Replace the contents of `src/app/page.js` with:

```jsx
import GameCard from "@/components/GameCard";
import Image from "next/image";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-svh max-w-[680px] flex-col items-center justify-center px-4 py-16">
      <div className="text-center">
        {/* <h1 className="text-7xl tracking-tight font-rakkas text-emerald-700">إتقان</h1>
        <p className="mt-2 text-lg text-muted font-body">
          Quran memorization tools
        </p> */}
        <Image
          src="/itqaanlogo.png"
          alt="Itqaan Logo"
          width={200}
          height={200}
          className="mx-auto"
          loading="eager"
        />
        <p className="mt-2 text-lg text-muted font-body">
          Quran memorization tools
        </p>
      </div>
      <div className="mt-12 w-full">
        <div className="grid grid-cols-2 gap-3">
          <GameCard
            title="AyahFlow"
            description="Given an ayah, guess what comes next."
            href="/ayahflow"
          />
          <GameCard
            title="SurahSense"
            description="Identify the surah from a clue."
            href="/surahsense"
          />
          <GameCard
            title="KalamQuest"
            description="Fill in the missing words or ayahs."
            href="/kalamquest"
          />
          <GameCard
            title="TartibLock"
            description="Arrange scrambled blocks in order."
            href="/tartiblock"
          />
        </div>
        <div className="mt-3 flex justify-center">
          <div className="w-[calc(50%-6px)]">
            <GameCard
              title="Ma'naMatch"
              description="Match the translation to the Arabic verse."
              href="/manamatch"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

The 5th card width is `calc(50% - 6px)` to match the grid column width (50% minus half the 12px/3 gap).

- [ ] **Step 2: Build and verify**

Run: `npx next build`
Expected: Compiles successfully with no errors. All 15 routes generated (13 existing + 2 new manamatch routes).

- [ ] **Step 3: Commit**

```bash
git add src/app/page.js
git commit -m "feat: add Ma'naMatch game card to home screen (centered 5th card)"
```

---

### Task 10: Final build verification

- [ ] **Step 1: Full build**

Run: `npx next build`
Expected: Compiles successfully. Routes include `/manamatch` and `/manamatch/play`.

- [ ] **Step 2: Verify all routes**

Check the build output lists these routes:
```
○ /manamatch
○ /manamatch/play
```

- [ ] **Step 3: Final commit if any cleanup needed**

If there are any remaining unstaged changes, stage and commit them.
