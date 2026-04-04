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
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

export default function AyahFlowSetup() {
  const router = useRouter();
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [difficulty, setDifficulty] = useState("easy");
  const [testPrevious, setTestPrevious] = useState(false);
  const [answerMode, setAnswerMode] = useState("choices");
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [translationId, setTranslationId] = useState(DEFAULT_TRANSLATION_ID);
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);
  const [reciterId, setReciterId] = useState(null);

  function handleStart() {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeValues: scope.values.join(","),
      difficulty,
      mode: answerMode,
      testPrevious: testPrevious.toString(),
      translation: translationEnabled ? translationId : "off",
      transliteration: transliterationEnabled ? "on" : "off",
      reciter: reciterId ?? "off",
    });
    router.push(`/ayahflow/play?${params.toString()}`);
  }

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
          <ScopeSelector value={scope} onChange={setScope} />
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
          disabled={scope.values.length === 0}
          className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start
        </button>
      </div>
    </div>
  );
}
