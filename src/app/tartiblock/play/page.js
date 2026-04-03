// src/app/tartiblock/play/page.js
"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope } from "@/lib/fetch-verses";
import { fetchVersesForPage } from "@/lib/fetch-chapters";
import { SURAH_NAMES } from "@/lib/quran-data";
import {
  createTartibLockQueue,
  splitAyahIntoBlocks,
  selectAyahBlocks,
  scrambleBlocks,
  scoreArrangement,
} from "@/lib/tartiblock-engine";
import SortableBlockList from "@/components/tartiblock/SortableBlockList";
import TartibLockHintBar from "@/components/tartiblock/TartibLockHintBar";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";

const FEEDBACK_DELAY_MS = 2500;
const REVEAL_DELAY_MS = 2000;

function TartibLockGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const gameMode = searchParams.get("gameMode") ?? "ayah";
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verses, setVerses] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState(null);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [currentPageNumber, setCurrentPageNumber] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showingCorrect, setShowingCorrect] = useState(false);
  const [correctOrder, setCorrectOrder] = useState([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [surahRevealed, setSurahRevealed] = useState(false);
  const [roundLabel, setRoundLabel] = useState("");

  const pageVerseCacheRef = useRef({});

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/tartiblock");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(
          scopeType,
          scopeValues,
        );
        setVerses(result.verses);

        const queue = createTartibLockQueue(result.verses, gameMode);
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

  const getPageVersesCached = useCallback(async (pageNum) => {
    if (pageVerseCacheRef.current[pageNum]) {
      return pageVerseCacheRef.current[pageNum];
    }
    const pv = await fetchVersesForPage(pageNum);
    pageVerseCacheRef.current[pageNum] = pv;
    return pv;
  }, []);

  useEffect(() => {
    if (promptQueue.length === 0 || loading) return;

    async function buildRound() {
      const prompt = promptQueue[promptIndex];
      const mode = prompt.type;
      setCurrentMode(mode);
      setSubmitted(false);
      setResults(null);
      setShowingCorrect(false);
      setSurahRevealed(false);

      if (mode === "ayah") {
        const verse = prompt.verse || verses[Math.floor(Math.random() * verses.length)];
        setCurrentChapterId(verse.chapterId);
        setCurrentPageNumber(verse.pageNumber);
        setRoundLabel("Arrange the words in order");

        const rawBlocks = splitAyahIntoBlocks(verse.textUthmani, difficulty);
        const correct = [...rawBlocks];
        setCorrectOrder(correct);
        setBlocks(scrambleBlocks(rawBlocks));
      } else if (mode === "surah") {
        const surahId = prompt.surahId;
        setCurrentChapterId(surahId);
        const surahVerses = verses.filter((v) => v.chapterId === surahId);
        if (surahVerses.length === 0) return;
        setCurrentPageNumber(surahVerses[0].pageNumber);
        setRoundLabel(`Arrange the ayahs of Surah ${SURAH_NAMES[surahId]}`);

        const rawBlocks = selectAyahBlocks(surahVerses, difficulty);
        const correct = [...rawBlocks];
        setCorrectOrder(correct);
        setBlocks(scrambleBlocks(rawBlocks));
      } else if (mode === "page") {
        const pageNum = prompt.pageNumber;
        setCurrentPageNumber(pageNum);
        let pageVerses;
        try {
          pageVerses = await getPageVersesCached(pageNum);
        } catch {
          pageVerses = verses.filter((v) => v.pageNumber === pageNum);
        }
        if (pageVerses.length === 0) return;
        setCurrentChapterId(pageVerses[0].chapterId);
        setRoundLabel(`Arrange the ayahs on Page ${pageNum}`);

        const rawBlocks = selectAyahBlocks(pageVerses, difficulty);
        const correct = [...rawBlocks];
        setCorrectOrder(correct);
        setBlocks(scrambleBlocks(rawBlocks));
      }
    }

    buildRound();
  }, [promptQueue, promptIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createTartibLockQueue(verses, gameMode);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
    }
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);

    const result = scoreArrangement(blocks);
    setResults(result.results);
    setScore((prev) => ({
      correct: prev.correct + result.correctCount,
      total: prev.total + result.totalCount,
    }));

    // After feedback delay, show correct order
    setTimeout(() => {
      setShowingCorrect(true);
      setBlocks(correctOrder);
      setResults(null);

      // After reveal delay, advance
      setTimeout(() => {
        advance();
      }, REVEAL_DELAY_MS);
    }, FEEDBACK_DELAY_MS);
  }

  // --- Render ---
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
          <p className="mt-4 text-sm text-muted">Loading...</p>
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
                const newQueue = createTartibLockQueue(verses, gameMode);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
              className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-400"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push("/tartiblock")}
              className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-emerald-50"
            >
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col px-4">
      {/* Top bar */}
      <div className="flex items-center justify-between py-3">
        <BackButton />
        <div className="flex items-center gap-3">
          {currentMode && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {currentMode}
            </span>
          )}
          <button
            onClick={() => setShowResults(true)}
            className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-emerald-50"
          >
            End
          </button>
        </div>
      </div>

      {/* Question zone — round label + hint bar + score, centered */}
      <div className="py-2">
        <ScoreCounter correct={score.correct} total={score.total} />
        <div className="mt-2 text-center text-sm font-medium text-muted">
          {showingCorrect ? "Correct order:" : roundLabel}
        </div>
        {currentChapterId && (
          <div className="mt-2">
            <TartibLockHintBar
              chapterId={currentChapterId}
              pageNumber={currentPageNumber}
              difficulty={difficulty}
              surahRevealed={surahRevealed}
              onRevealSurah={() => setSurahRevealed(true)}
            />
          </div>
        )}
      </div>

      {/* Block list zone — fills remaining space, scrolls */}
      <div className="flex-1 overflow-y-auto py-2">
        <SortableBlockList
          blocks={blocks}
          onReorder={setBlocks}
          results={results}
          disabled={submitted}
          showTranslation={false}
          showTransliteration={false}
        />
      </div>

      {/* Bottom action — check button + feedback */}
      <div className="border-t border-border bg-surface py-3">
        {!submitted && (
          <button
            onClick={handleSubmit}
            className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
          >
            Check Order
          </button>
        )}
        {results && (
          <div className="text-center">
            <p className="text-sm text-muted">
              {results.filter((r) => r.isCorrect).length}/{results.length} blocks correct
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TartibLockGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
        </div>
      }
    >
      <TartibLockGameInner />
    </Suspense>
  );
}
