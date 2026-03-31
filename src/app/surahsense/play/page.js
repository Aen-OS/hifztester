"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope } from "@/lib/fetch-verses";
import {
  fetchAllChaptersInfo,
  fetchChapterInfo,
  fetchVersesForPage,
} from "@/lib/fetch-chapters";
import {
  createSurahPromptQueue,
  generateSurahDistractors,
  pickRandomPage,
  pickRandomAyaat,
  getAyaatCount,
  pickRandomMode,
  matchSurahName,
  redactSurahName,
  shuffle,
} from "@/lib/surahsense-engine";
import { SURAH_NAMES } from "@/lib/quran-data";
import MushafPage from "@/components/surahsense/MushafPage";
import AyahClue from "@/components/surahsense/AyahClue";
import SummaryClue from "@/components/surahsense/SummaryClue";
import SurahChoiceGrid from "@/components/surahsense/SurahChoiceGrid";
import SurahTypingInput from "@/components/surahsense/SurahTypingInput";
import SurahSenseHintBar from "@/components/surahsense/SurahSenseHintBar";
import AnswerModeToggle from "@/components/ayahflow/AnswerModeToggle";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";

const CORRECT_DELAY_MS = 1200;
const WRONG_DELAY_MS = 2000;

function SurahSenseGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const gameMode = searchParams.get("gameMode") ?? "page";
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const initialAnswerMode = searchParams.get("answerMode") ?? "choices";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allChapters, setAllChapters] = useState([]);
  const [scopeSurahIds, setScopeSurahIds] = useState([]);
  const [verses, setVerses] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [clue, setClue] = useState(null);
  const [correctSurahId, setCorrectSurahId] = useState(null);
  const [choices, setChoices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [answerMode, setAnswerMode] = useState(initialAnswerMode);
  const [typingResult, setTypingResult] = useState(null);
  const [currentMode, setCurrentMode] = useState(null);
  const [revelationPlaceRevealed, setRevelationPlaceRevealed] = useState(false);
  const [verseCountRevealed, setVerseCountRevealed] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
  const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);
  const [eliminatedIds, setEliminatedIds] = useState([]);

  const chapterInfoCacheRef = useRef({});

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/surahsense");
      return;
    }

    async function load() {
      try {
        setLoading(true);

        const [chaptersData, versesData] = await Promise.all([
          fetchAllChaptersInfo(),
          fetchVersesForScope(scopeType, scopeValues),
        ]);

        setAllChapters(chaptersData);
        setVerses(versesData.verses);

        const surahIds = [
          ...new Set(versesData.verses.map((v) => v.chapterId)),
        ];
        setScopeSurahIds(surahIds);

        const queue = createSurahPromptQueue(surahIds);
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

  const getChapterInfoCached = useCallback(async (chapterId) => {
    if (chapterInfoCacheRef.current[chapterId]) {
      return chapterInfoCacheRef.current[chapterId];
    }
    const info = await fetchChapterInfo(chapterId);
    chapterInfoCacheRef.current[chapterId] = info;
    return info;
  }, []);

  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    async function buildClue() {
      const surahId = promptQueue[promptIndex];
      const mode = gameMode === "mixed" ? pickRandomMode() : gameMode;
      setCurrentMode(mode);
      setCorrectSurahId(surahId);
      setSelectedId(null);
      setTypingResult(null);
      setRevelationPlaceRevealed(false);
      setVerseCountRevealed(false);
      setSummaryExpanded(false);
      setFiftyFiftyUsedThisRound(false);
      setEliminatedIds([]);

      const correctChapter = allChapters.find((ch) => ch.id === surahId);
      if (!correctChapter) return;

      const distractorChapters = generateSurahDistractors(
        correctChapter,
        difficulty,
        allChapters,
        scopeSurahIds,
      );
      const choiceIds = shuffle([
        surahId,
        ...distractorChapters.map((ch) => ch.id),
      ]);
      setChoices(choiceIds);

      switch (mode) {
        case "page": {
          const pageNum = pickRandomPage(correctChapter);
          if (pageNum) {
            const pageVerses = await fetchVersesForPage(pageNum);
            setClue({ type: "page", verses: pageVerses, pageNumber: pageNum });
          }
          break;
        }
        case "ayah": {
          const surahVerses = verses.filter((v) => v.chapterId === surahId);
          if (surahVerses.length > 0) {
            const pick =
              surahVerses[Math.floor(Math.random() * surahVerses.length)];
            setClue({ type: "ayah", verses: [pick] });
          }
          break;
        }
        case "ayaat": {
          const surahVerses = verses.filter((v) => v.chapterId === surahId);
          const count = getAyaatCount(difficulty);
          const picked = pickRandomAyaat(surahVerses, count);
          setClue({ type: "ayaat", verses: picked });
          break;
        }
        case "summary": {
          const info = await getChapterInfoCached(surahId);
          setClue({
            type: "summary",
            summary: redactSurahName(info.summary, surahId),
            fullSummary: redactSurahName(info.fullSummary, surahId),
          });
          break;
        }
      }
    }

    buildClue();
  }, [promptQueue, promptIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createSurahPromptQueue(scopeSurahIds);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
    }
  }

  function handleSelect(surahId) {
    if (selectedId !== null) return;
    setSelectedId(surahId);

    const isCorrect = surahId === correctSurahId;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => {
      advance();
    }, CORRECT_DELAY_MS);
  }

  function handleTypedSubmit(typed) {
    if (selectedId !== null) return;

    const isCorrect = matchSurahName(typed, correctSurahId);
    setSelectedId(correctSurahId);
    setTypingResult(isCorrect ? "correct" : "wrong");
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(() => {
      advance();
    }, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  function handleFiftyFifty() {
    if (fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0 || selectedId !== null) return;
    const incorrect = choices.filter((id) => id !== correctSurahId && !eliminatedIds.includes(id));
    const shuffled = [...incorrect].sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, 2);
    setEliminatedIds((prev) => [...prev, ...toEliminate]);
    setFiftyFiftyRemaining((prev) => prev - 1);
    setFiftyFiftyUsedThisRound(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
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
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
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
                const newQueue = createSurahPromptQueue(scopeSurahIds);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push("/surahsense")}
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clue) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton />
      <div className="mt-4 mb-6 flex items-center justify-between">
        <ScoreCounter correct={score.correct} total={score.total} />
        <div className="flex items-center gap-3">
          {currentMode && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {currentMode}
            </span>
          )}
          <button
            onClick={() => setShowResults(true)}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm hover:bg-gray-50"
          >
            End
          </button>
        </div>
      </div>

      <div className="mb-4 text-center text-sm font-medium text-gray-500">
        Which surah is this?
      </div>

      {/* Clue area */}
      <div className="mb-6">
        {clue.type === "page" && (
          <MushafPage verses={clue.verses} pageNumber={clue.pageNumber} />
        )}
        {(clue.type === "ayah" || clue.type === "ayaat") && (
          <AyahClue verses={clue.verses} />
        )}
        {clue.type === "summary" && (
          <SummaryClue
            summary={clue.summary}
            fullSummary={clue.fullSummary}
            expanded={summaryExpanded}
          />
        )}
      </div>

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

      {/* Answer area */}
      {answerMode === "choices" ? (
        <SurahChoiceGrid
          choices={choices}
          correctId={correctSurahId}
          selectedId={selectedId}
          onSelect={handleSelect}
          eliminatedIds={eliminatedIds}
        />
      ) : typingResult ? (
        <div
          className={`rounded-xl border p-4 text-center ${
            typingResult === "correct"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p
            className={`text-lg font-medium ${
              typingResult === "correct" ? "text-green-700" : "text-red-700"
            }`}
          >
            {typingResult === "correct" ? "Correct!" : "Incorrect"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {correctSurahId}. {SURAH_NAMES[correctSurahId]}
          </p>
        </div>
      ) : (
        <SurahTypingInput
          onSubmit={handleTypedSubmit}
          disabled={selectedId !== null}
        />
      )}
    </div>
  );
}

export default function SurahSenseGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }
    >
      <SurahSenseGameInner />
    </Suspense>
  );
}
