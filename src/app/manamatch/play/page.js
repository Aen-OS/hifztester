"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope, fetchSurahForDistractors } from "@/lib/fetch-verses";
import { createManaMatchQueue, buildManaMatchQuestion } from "@/lib/manamatch-engine";
import { queueItemKey, avoidRepeat } from "@/lib/game-engine";
import ManaMatchQuestionCard from "@/components/manamatch/ManaMatchQuestionCard";
import TranslationChoiceGrid from "@/components/manamatch/TranslationChoiceGrid";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import ReciterToggle from "@/components/shared/ReciterToggle";
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
      const lastKey = queueItemKey(promptQueue[promptQueue.length - 1]);
      const newQueue = createManaMatchQueue(verses);
      avoidRepeat(newQueue, lastKey);
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
