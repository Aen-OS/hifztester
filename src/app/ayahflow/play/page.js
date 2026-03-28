"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchVersesForScope,
  fetchSurahForDistractors,
} from "@/lib/fetch-verses";
import {
  createPromptQueue,
  buildVerseMap,
  buildQuestion,
  getNextVerseKey,
  getPrevVerseKey,
} from "@/lib/game-engine";
import QuestionCard from "@/components/ayahflow/QuestionCard";
import ChoiceGrid from "@/components/ayahflow/ChoiceGrid";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import HintBar from "@/components/ayahflow/HintBar";

const NEXT_DELAY_MS = 1200;

function AyahFlowGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const testPrevious = searchParams.get("testPrevious") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verses, setVerses] = useState([]);
  const [boundaryKeys, setBoundaryKeys] = useState([]);
  const [verseMap, setVerseMap] = useState(new Map());
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [phase, setPhase] = useState("next");
  const [showResults, setShowResults] = useState(false);
  const [surahRevealed, setSurahRevealed] = useState(false);
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
  const [eliminatedKeys, setEliminatedKeys] = useState([]);
  const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);

  const surahCacheRef = useRef({});
  const verseMapRef = useRef(new Map());

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/ayahflow");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(scopeType, scopeValues);
        const map = buildVerseMap(result.verses);
        setVerses(result.verses);
        setBoundaryKeys(result.boundaryKeys);
        setVerseMap(map);
        verseMapRef.current = map;

        const queue = createPromptQueue(result.verses, result.boundaryKeys);
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

  const getSurahVerses = useCallback(async (chapterId) => {
    if (surahCacheRef.current[chapterId])
      return surahCacheRef.current[chapterId];

    const fetched = await fetchSurahForDistractors(chapterId);
    surahCacheRef.current[chapterId] = fetched;

    const newMap = new Map(verseMapRef.current);
    for (const v of fetched) {
      if (!newMap.has(v.verseKey)) newMap.set(v.verseKey, v);
    }
    verseMapRef.current = newMap;
    setVerseMap(newMap);

    return fetched;
  }, []);

  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    async function build() {
      const prompt = promptQueue[promptIndex];
      const direction = phase === "previous" ? "previous" : "next";

      const correctVerseKey =
        direction === "next"
          ? getNextVerseKey(prompt.verseKey)
          : getPrevVerseKey(prompt.verseKey);
      const correctVerse = verseMapRef.current.get(correctVerseKey);

      let surahVerses = verses.filter(
        (v) => v.chapterId === correctVerse.chapterId,
      );
      if (difficulty !== "easy") {
        surahVerses = await getSurahVerses(correctVerse.chapterId);
      }

      const q = buildQuestion(
        prompt,
        direction,
        difficulty,
        verseMapRef.current,
        verses,
        surahVerses,
      );
      setQuestion(q);
      setSurahRevealed(false);
      setEliminatedKeys([]);
      setFiftyFiftyUsedThisRound(false);
      setSelectedKey(null);
    }

    build();
  }, [promptQueue, promptIndex, phase, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(verseKey) {
    if (selectedKey) return;
    setSelectedKey(verseKey);

    const isCorrect = verseKey === question.correctAnswer.verseKey;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => {
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
    }, NEXT_DELAY_MS);
  }

  function handleEnd() {
    setShowResults(true);
  }

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Loading verses...</p>
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
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
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
                setFiftyFiftyRemaining(3);
                const newQueue = createPromptQueue(verses, boundaryKeys);
                setPromptQueue(newQueue);
                setPromptIndex(0);
                setPhase("next");
              }}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700">
              Play Again
            </button>
            <button
              onClick={() => router.push("/ayahflow")}
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50">
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton />
      <div className="mt-4 mb-6 flex items-center justify-between">
        <ScoreCounter correct={score.correct} total={score.total} />
        <button
          onClick={handleEnd}
          className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm hover:bg-gray-50">
          End
        </button>
      </div>

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
    </div>
  );
}

export default function AyahFlowGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }>
      <AyahFlowGameInner />
    </Suspense>
  );
}
