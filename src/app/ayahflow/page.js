"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";
import DifficultySelector from "@/components/ayahflow/DifficultySelector";
import DirectionToggle from "@/components/ayahflow/DirectionToggle";
import AnswerModeSelector from "@/components/ayahflow/AnswerModeSelector";
import BackButton from "@/components/BackButton";
import DisplayOptionsSelector from "@/components/ayahflow/DisplayOptionsSelector";
import ReciterSelector from "@/components/shared/ReciterSelector";
import GameLengthSelector from "@/components/ayahflow/GameLengthSelector";
import ScopeModeToggle from "@/components/ayahflow/ScopeModeToggle";
import FocusModeSelector from "@/components/ayahflow/FocusModeSelector";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

export default function AyahFlowSetup() {
  const router = useRouter();
  const [scopeMode, setScopeMode] = useState("manual");
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [focusScope, setFocusScope] = useState({
    granularity: "juz",
    selected: [],
    auto: false,
  });
  const [difficulty, setDifficulty] = useState("easy");
  const [testPrevious, setTestPrevious] = useState(false);
  const [answerMode, setAnswerMode] = useState("choices");
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);
  const [reciterId, setReciterId] = useState(null);
  const [gameLength, setGameLength] = useState({
    mode: "questions",
    count: 20,
    minutes: 10,
  });

  function handleStart() {
    let scopeType, scopeValues;

    if (scopeMode === "focus" && focusScope.selected.length > 0) {
      scopeType = focusScope.granularity === "juz" ? "juz" : "surah";
      scopeValues = focusScope.selected.join(",");
    } else {
      scopeType = scope.type;
      scopeValues = scope.values.join(",");
    }

    const params = new URLSearchParams({
      scopeType,
      scopeValues,
      difficulty,
      mode: answerMode,
      testPrevious: testPrevious.toString(),
      translation: translationEnabled ? translationId : "off",
      transliteration: transliterationEnabled ? "on" : "off",
      reciter: reciterId ?? "off",
      lengthMode: gameLength.mode,
      lengthValue:
        gameLength.mode === "time"
          ? gameLength.minutes.toString()
          : gameLength.mode === "questions"
            ? gameLength.count.toString()
            : "0",
    });
    router.push(`/ayahflow/play?${params.toString()}`);
  }

  const canStart =
    scopeMode === "focus"
      ? focusScope.selected.length > 0
      : scope.values.length > 0;

  return (
    <div className="mx-auto max-w-[480px] px-4 py-12">
      <BackButton />
      <h1 className="mt-4 text-3xl font-bold text-emerald-700">AyahFlow</h1>
      <p className="mt-1 text-muted">
        Guess the next ayah from multiple choices
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Scope
          </h2>
          <ScopeModeToggle value={scopeMode} onChange={setScopeMode} />
          <div className="mt-4">
            {scopeMode === "manual" ? (
              <ScopeSelector value={scope} onChange={setScope} />
            ) : (
              <FocusModeSelector value={focusScope} onChange={setFocusScope} />
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Session Length
          </h2>
          <GameLengthSelector value={gameLength} onChange={setGameLength} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Difficulty
          </h2>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Answer Mode
          </h2>
          <AnswerModeSelector value={answerMode} onChange={setAnswerMode} />
        </section>

        <section>
          <DirectionToggle enabled={testPrevious} onChange={setTestPrevious} />
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Display Options
          </h2>
          <p className="mb-3 mt-1 text-xs text-muted">
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

        <section>
          <h2 className="mb-2.5 text-sm font-medium uppercase tracking-wide text-muted">
            Audio
          </h2>
          <ReciterSelector value={reciterId} onChange={setReciterId} />
        </section>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start
        </button>
      </div>
    </div>
  );
}
