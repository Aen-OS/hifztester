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
  queueItemKey,
  avoidRepeat,
} from "@/lib/game-engine";
import QuestionCard from "@/components/ayahflow/QuestionCard";
import ChoiceGrid from "@/components/ayahflow/ChoiceGrid";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import HintBar from "@/components/ayahflow/HintBar";
import { endOfVerseNoNumber } from "@/lib/verse-marker";
import AnswerModeToggle from "@/components/ayahflow/AnswerModeToggle";
import TypingInput from "@/components/ayahflow/TypingInput";
import DiffView from "@/components/ayahflow/DiffView";
import { diffWords } from "@/lib/normalize-arabic";
import DisplayOptionsToggle from "@/components/ayahflow/DisplayOptionsToggle";
import ReciterToggle from "@/components/shared/ReciterToggle";
import ReviewScreen from "@/components/ayahflow/ReviewScreen";
import GameTimer from "@/components/ayahflow/GameTimer";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

const NEXT_DELAY_MS = 1200;
const TYPING_WRONG_DELAY_MS = 3000;

function AyahFlowGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const testPrevious = searchParams.get("testPrevious") === "true";
  const initialMode = searchParams.get("mode") ?? "choices";
  const lengthMode = searchParams.get("lengthMode") ?? "unlimited";
  const lengthValue = Number(searchParams.get("lengthValue") ?? "0");

  const translationParam = searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID;
  const transliterationParam = searchParams.get("transliteration") === "on";
  const reciterParam = searchParams.get("reciter") ?? "off";
  const translationId = translationParam === "off" ? DEFAULT_TRANSLATION_ID : translationParam;

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
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [surahRevealed, setSurahRevealed] = useState(false);
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
  const [eliminatedKeys, setEliminatedKeys] = useState([]);
  const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);
  const [answerMode, setAnswerMode] = useState(initialMode);
  const [typingDiff, setTypingDiff] = useState(null);
  const [showTranslation, setShowTranslation] = useState(translationParam !== "off");
  const [showTransliteration, setShowTransliteration] = useState(transliterationParam);
  const [reciterId, setReciterId] = useState(reciterParam !== "off" ? reciterParam : null);
  const [timeUp, setTimeUp] = useState(false);

  const surahCacheRef = useRef({});
  const verseMapRef = useRef(new Map());
  const resultsRef = useRef([]);
  const questionStartRef = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());

  // Check QF auth status for review screen sync prompt
  useEffect(() => {
    fetch("/api/auth/quran/status")
      .then((r) => r.json())
      .then((d) => setIsConnected(d.connected))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/ayahflow");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(scopeType, scopeValues, translationId);
        const map = buildVerseMap(result.verses);
        setVerses(result.verses);
        setBoundaryKeys(result.boundaryKeys);
        setVerseMap(map);
        verseMapRef.current = map;

        const queue = createPromptQueue(result.verses, result.boundaryKeys);
        setPromptQueue(queue);
        setPromptIndex(0);
        sessionStartRef.current = Date.now();
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

    const fetched = await fetchSurahForDistractors(chapterId, translationId);
    surahCacheRef.current[chapterId] = fetched;

    const newMap = new Map(verseMapRef.current);
    for (const v of fetched) {
      if (!newMap.has(v.verseKey)) newMap.set(v.verseKey, v);
    }
    verseMapRef.current = newMap;
    setVerseMap(newMap);

    return fetched;
  }, []);

  const buildQuestionForPrompt = useCallback(async (prompt, dir, allVerses) => {
    const correctVerseKey =
      dir === "next"
        ? getNextVerseKey(prompt.verseKey)
        : getPrevVerseKey(prompt.verseKey);
    const correctVerse = verseMapRef.current.get(correctVerseKey);

    let surahVerses = allVerses.filter(
      (v) => v.chapterId === correctVerse.chapterId,
    );
    if (difficulty !== "easy") {
      surahVerses = await getSurahVerses(correctVerse.chapterId);
    }

    return buildQuestion(
      prompt,
      dir,
      difficulty,
      verseMapRef.current,
      allVerses,
      surahVerses,
    );
  }, [difficulty, getSurahVerses]);

  const lastBuildRef = useRef(null);

  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    const key = `${promptIndex}-${phase}`;
    if (lastBuildRef.current === key) return;
    lastBuildRef.current = key;

    async function build() {
      const prompt = promptQueue[promptIndex];
      const direction = phase === "previous" ? "previous" : "next";
      const q = await buildQuestionForPrompt(prompt, direction, verses);
      setQuestion(q);
      setSurahRevealed(false);
      setEliminatedKeys([]);
      setFiftyFiftyUsedThisRound(false);
      setSelectedKey(null);
      setTypingDiff(null);
      questionStartRef.current = Date.now();
    }

    build();
  }, [promptQueue, promptIndex, phase, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitSession() {
    if (resultsRef.current.length === 0) {
      router.push("/ayahflow");
      return;
    }

    setReviewLoading(true);
    const durationSeconds = Math.round(
      (Date.now() - sessionStartRef.current) / 1000
    );

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: "ayahflow",
          settings: {
            scopeType,
            scopeValues,
            difficulty,
            testPrevious,
            answerMode: initialMode,
            lengthMode,
            lengthValue,
          },
          duration_seconds: durationSeconds,
          results: resultsRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReviewData(data);
      } else {
        // Fallback: show basic results even if save fails
        setReviewData({
          score_correct: score.correct,
          score_total: score.total,
          duration_seconds: durationSeconds,
          groups: [],
          confidence_delta: null,
        });
      }
    } catch {
      setReviewData({
        score_correct: score.correct,
        score_total: score.total,
        duration_seconds: Math.round(
          (Date.now() - sessionStartRef.current) / 1000
        ),
        groups: [],
        confidence_delta: null,
      });
    } finally {
      setReviewLoading(false);
      setShowResults(true);
    }
  }

  function recordResult(verseKey, correct, userAnswer) {
    const responseMs = Date.now() - questionStartRef.current;
    resultsRef.current.push({
      verse_key: verseKey,
      correct,
      ...(correct ? {} : { user_answer: userAnswer || null }),
      response_ms: responseMs,
    });
  }

  function checkGameEnd() {
    const count = resultsRef.current.length;
    if (lengthMode === "questions" && count >= lengthValue) {
      return true;
    }
    if (timeUp) {
      return true;
    }
    return false;
  }

  function advance() {
    if (checkGameEnd()) {
      submitSession();
      return;
    }

    if (phase === "next" && testPrevious) {
      setPhase("previous");
    } else {
      setPhase("next");
      const nextIdx = promptIndex + 1;
      if (nextIdx >= promptQueue.length) {
        const lastKey = queueItemKey(promptQueue[promptQueue.length - 1]);
        const newQueue = createPromptQueue(verses, boundaryKeys);
        avoidRepeat(newQueue, lastKey);
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
    recordResult(
      question.correctAnswer.verseKey,
      isCorrect,
      isCorrect ? null : verseKey
    );
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => {
      advance();
    }, NEXT_DELAY_MS);
  }

  function handleTypedSubmit(typedText) {
    if (selectedKey) return;

    const result = diffWords(typedText, question.correctAnswer.textUthmani);

    if (result.isMatch) {
      setSelectedKey(question.correctAnswer.verseKey);
      recordResult(question.correctAnswer.verseKey, true, null);
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
      recordResult(question.correctAnswer.verseKey, false, typedText);
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

  function handleEnd() {
    submitSession();
  }

  const handleTimeUp = useCallback(() => {
    setTimeUp(true);
  }, []);

  function handlePlayAgain() {
    setShowResults(false);
    setReviewData(null);
    setScore({ correct: 0, total: 0 });
    setFiftyFiftyRemaining(3);
    setTimeUp(false);
    resultsRef.current = [];
    sessionStartRef.current = Date.now();
    const newQueue = createPromptQueue(verses, boundaryKeys);
    setPromptQueue(newQueue);
    setPromptIndex(0);
    setPhase("next");
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
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-400">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (reviewLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          <p className="mt-4 text-sm text-muted">Saving session...</p>
        </div>
      </div>
    );
  }

  if (showResults && reviewData) {
    return (
      <ReviewScreen
        data={reviewData}
        isConnected={isConnected}
        onPlayAgain={handlePlayAgain}
        onNewSettings={() => router.push("/ayahflow")}
      />
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex h-dvh max-w-[680px] flex-col px-5">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <BackButton />
        <button
          onClick={handleEnd}
          className="rounded-lg border border-emerald-700 px-4 py-1.5 text-sm text-emerald-700 transition-colors hover:bg-emerald-50">
          End
        </button>
      </div>

      {/* Question zone */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto py-4">
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <ScoreCounter correct={score.correct} total={score.total} />
            {lengthMode === "time" && (
              <GameTimer minutes={lengthValue} onTimeUp={handleTimeUp} />
            )}
          </div>
          <QuestionCard
            verse={question.prompt}
            direction={question.direction}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
            reciterId={reciterId}
          />
          <div>
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
        </div>
      </div>

      {/* Answer zone */}
      <div className="border-t border-border bg-surface py-3">
        <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
        <div className="mt-3">
          {answerMode === "choices" ? (
            <ChoiceGrid
              choices={question.choices}
              correctKey={question.correctAnswer.verseKey}
              selectedKey={selectedKey}
              onSelect={handleSelect}
              eliminatedKeys={eliminatedKeys}
              showTranslation={showTranslation}
              showTransliteration={showTransliteration}
            />
          ) : typingDiff ? (
            <DiffView diff={typingDiff} />
          ) : selectedKey ? (
            <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 text-center">
              <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed text-emerald-700">
                {question.correctAnswer.textUthmani}{endOfVerseNoNumber()}
              </p>
              <p className="mt-2 text-sm text-emerald-400">Correct!</p>
            </div>
          ) : (
            <TypingInput onSubmit={handleTypedSubmit} disabled={selectedKey !== null} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AyahFlowGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
        </div>
      }>
      <AyahFlowGameInner />
    </Suspense>
  );
}
