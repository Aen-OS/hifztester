"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchVersesForScope } from "@/lib/fetch-verses";
import { fetchVersesForPage } from "@/lib/fetch-chapters";
import { shuffle } from "@/lib/game-engine";
import { diffWords } from "@/lib/normalize-arabic";
import { SURAH_NAMES } from "@/lib/quran-data";
import {
  createKalamQuestQueue,
  blankWords,
  generateAyahDistractors,
  generateWordDistractors,
  getContextAyahs,
  checkWordAnswer,
} from "@/lib/kalamquest-engine";
import WordBlankDisplay from "@/components/kalamquest/WordBlankDisplay";
import AyahGapDisplay from "@/components/kalamquest/AyahGapDisplay";
import WordChoiceGrid from "@/components/kalamquest/WordChoiceGrid";
import KalamQuestHintBar from "@/components/kalamquest/KalamQuestHintBar";
import ChoiceGrid from "@/components/ayahflow/ChoiceGrid";
import TypingInput from "@/components/ayahflow/TypingInput";
import DiffView from "@/components/ayahflow/DiffView";
import AnswerModeToggle from "@/components/ayahflow/AnswerModeToggle";
import ScoreCounter from "@/components/ayahflow/ScoreCounter";
import BackButton from "@/components/BackButton";
import { DEFAULT_TRANSLATION_ID } from "@/lib/translations";

const CORRECT_DELAY_MS = 1200;
const WRONG_DELAY_MS = 2500;

function KalamQuestGameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scopeType = searchParams.get("scopeType");
  const scopeValues =
    searchParams.get("scopeValues")?.split(",").map(Number) ?? [];
  const gameMode = searchParams.get("gameMode") ?? "ayah";
  const difficulty = searchParams.get("difficulty") ?? "easy";
  const initialAnswerMode = searchParams.get("answerMode") ?? "choices";
  const translationParam = searchParams.get("translation") ?? DEFAULT_TRANSLATION_ID;
  const transliterationParam = searchParams.get("transliteration") === "on";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verses, setVerses] = useState([]);
  const [promptQueue, setPromptQueue] = useState([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [answerMode, setAnswerMode] = useState(initialAnswerMode);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResults, setShowResults] = useState(false);
  const [surahRevealed, setSurahRevealed] = useState(false);
  const [fiftyFiftyRemaining, setFiftyFiftyRemaining] = useState(3);
  const [fiftyFiftyUsedThisRound, setFiftyFiftyUsedThisRound] = useState(false);
  const [currentMode, setCurrentMode] = useState(null);

  // Ayah mode state
  const [wordDisplay, setWordDisplay] = useState(null);
  const [blankedWords, setBlankedWords] = useState([]);
  const [blankedIndices, setBlankedIndices] = useState([]);
  const [wordChoices, setWordChoices] = useState([]);
  const [selectedWordAnswer, setSelectedWordAnswer] = useState(null);
  const [wordReveal, setWordReveal] = useState(null);
  const [wordRevealCorrect, setWordRevealCorrect] = useState(false);
  const [eliminatedWordAnswers, setEliminatedWordAnswers] = useState([]);

  // Surah/page mode state
  const [contextAyahs, setContextAyahs] = useState([]);
  const [gapVerse, setGapVerse] = useState(null);
  const [ayahChoices, setAyahChoices] = useState([]);
  const [selectedAyahKey, setSelectedAyahKey] = useState(null);
  const [eliminatedAyahKeys, setEliminatedAyahKeys] = useState([]);
  const [typingDiff, setTypingDiff] = useState(null);
  const [contextLabel, setContextLabel] = useState("");
  const [useMushafLayout, setUseMushafLayout] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState(null);

  const pageVerseCacheRef = useRef({});

  useEffect(() => {
    if (!scopeType || scopeValues.length === 0) {
      router.replace("/kalamquest");
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const result = await fetchVersesForScope(scopeType, scopeValues, translationParam === "off" ? DEFAULT_TRANSLATION_ID : translationParam);
        setVerses(result.verses);

        const queue = createKalamQuestQueue(result.verses, gameMode);
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
      setSurahRevealed(false);
      setFiftyFiftyUsedThisRound(false);
      setSelectedWordAnswer(null);
      setWordReveal(null);
      setWordRevealCorrect(false);
      setEliminatedWordAnswers([]);
      setSelectedAyahKey(null);
      setEliminatedAyahKeys([]);
      setTypingDiff(null);

      if (mode === "ayah") {
        const verse = prompt.verse || verses[Math.floor(Math.random() * verses.length)];
        setCurrentChapterId(verse.chapterId);

        const { display, blankedWords: bw, blankedIndices: bi } = blankWords(verse.textUthmani, difficulty);
        setWordDisplay(display);
        setBlankedWords(bw);
        setBlankedIndices(bi);

        const distractors = generateWordDistractors(bw, bi, verses, verse.verseKey);
        const correctAnswer = bw.join(" ");
        const allChoices = shuffle([correctAnswer, ...distractors]);
        setWordChoices(allChoices);

        setContextAyahs([]);
        setGapVerse(null);
        setAyahChoices([]);
      } else if (mode === "surah") {
        const surahId = prompt.surahId;
        setCurrentChapterId(surahId);
        const surahVerses = verses.filter((v) => v.chapterId === surahId);
        if (surahVerses.length === 0) return;

        const gapIdx = Math.floor(Math.random() * surahVerses.length);
        const gapV = surahVerses[gapIdx];
        setGapVerse(gapV);

        const context = getContextAyahs(surahVerses, gapIdx, difficulty);
        setContextAyahs(context);
        setContextLabel(`Surah ${SURAH_NAMES[surahId]}`);
        setUseMushafLayout(false);

        const distractors = generateAyahDistractors(gapV, difficulty, verses, surahVerses);
        const choices = shuffle([gapV, ...distractors]);
        setAyahChoices(choices);

        setWordDisplay(null);
        setBlankedWords([]);
        setBlankedIndices([]);
        setWordChoices([]);
      } else if (mode === "page") {
        const pageNum = prompt.pageNumber;
        let pageVerses;
        try {
          pageVerses = await getPageVersesCached(pageNum);
        } catch {
          pageVerses = verses.filter((v) => v.pageNumber === pageNum);
        }
        if (pageVerses.length === 0) return;

        const gapIdx = Math.floor(Math.random() * pageVerses.length);
        const gapV = pageVerses[gapIdx];
        setGapVerse(gapV);
        setCurrentChapterId(gapV.chapterId);

        const context = getContextAyahs(pageVerses, gapIdx, difficulty);
        setContextAyahs(context);
        setContextLabel(`Page ${pageNum}`);
        setUseMushafLayout(true);

        const surahVerses = verses.filter((v) => v.chapterId === gapV.chapterId);
        const distractors = generateAyahDistractors(gapV, difficulty, verses, surahVerses);
        const choices = shuffle([gapV, ...distractors]);
        setAyahChoices(choices);

        setWordDisplay(null);
        setBlankedWords([]);
        setBlankedIndices([]);
        setWordChoices([]);
      }
    }

    buildRound();
  }, [promptQueue, promptIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const nextIdx = promptIndex + 1;
    if (nextIdx >= promptQueue.length) {
      const newQueue = createKalamQuestQueue(verses, gameMode);
      setPromptQueue(newQueue);
      setPromptIndex(0);
    } else {
      setPromptIndex(nextIdx);
    }
  }

  // --- Ayah mode handlers ---
  function handleWordChoiceSelect(answer) {
    if (selectedWordAnswer !== null) return;
    setSelectedWordAnswer(answer);

    const correctAnswer = blankedWords.join(" ");
    const isCorrect = answer === correctAnswer;
    setWordReveal(blankedWords);
    setWordRevealCorrect(isCorrect);
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(advance, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  function handleWordTypingSubmit(typedWords) {
    const isCorrect = checkWordAnswer(typedWords, blankedWords);
    setWordReveal(isCorrect ? blankedWords : blankedWords);
    setWordRevealCorrect(isCorrect);
    setSelectedWordAnswer("__submitted__");
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(advance, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  // --- Surah/page mode handlers ---
  function handleAyahChoiceSelect(verseKey) {
    if (selectedAyahKey !== null) return;
    setSelectedAyahKey(verseKey);

    const isCorrect = verseKey === gapVerse.verseKey;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setTimeout(advance, isCorrect ? CORRECT_DELAY_MS : WRONG_DELAY_MS);
  }

  function handleAyahTypingSubmit(typedText) {
    if (selectedAyahKey !== null) return;

    const result = diffWords(typedText, gapVerse.textUthmani);

    if (result.isMatch) {
      setSelectedAyahKey(gapVerse.verseKey);
      setScore((prev) => ({
        correct: prev.correct + 1,
        total: prev.total + 1,
      }));
      setTimeout(advance, CORRECT_DELAY_MS);
    } else {
      setSelectedAyahKey("__wrong__");
      setTypingDiff(result);
      setScore((prev) => ({
        correct: prev.correct,
        total: prev.total + 1,
      }));
      setTimeout(advance, WRONG_DELAY_MS);
    }
  }

  // --- 50/50 ---
  function handleFiftyFifty() {
    if (fiftyFiftyUsedThisRound || fiftyFiftyRemaining <= 0) return;

    if (currentMode === "ayah") {
      if (selectedWordAnswer !== null) return;
      const correctAnswer = blankedWords.join(" ");
      const incorrect = wordChoices.filter(
        (c) => c !== correctAnswer && !eliminatedWordAnswers.includes(c),
      );
      const toEliminate = shuffle([...incorrect]).slice(0, 2);
      setEliminatedWordAnswers((prev) => [...prev, ...toEliminate]);
    } else {
      if (selectedAyahKey !== null) return;
      const incorrect = ayahChoices.filter(
        (c) => c.verseKey !== gapVerse.verseKey && !eliminatedAyahKeys.includes(c.verseKey),
      );
      const toEliminate = shuffle([...incorrect])
        .slice(0, 2)
        .map((c) => c.verseKey);
      setEliminatedAyahKeys((prev) => [...prev, ...toEliminate]);
    }

    setFiftyFiftyUsedThisRound(true);
    setFiftyFiftyRemaining((prev) => prev - 1);
  }

  // --- Render ---
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
                const newQueue = createKalamQuestQueue(verses, gameMode);
                setPromptQueue(newQueue);
                setPromptIndex(0);
              }}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push("/kalamquest")}
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              New Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAyahMode = currentMode === "ayah";
  const hasQuestion = isAyahMode ? wordDisplay !== null : contextAyahs.length > 0;
  if (!hasQuestion) return null;

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

      {/* Question display */}
      <div className="mb-4">
        {isAyahMode ? (
          <WordBlankDisplay
            display={wordDisplay}
            answerMode={answerMode}
            onTypingSubmit={handleWordTypingSubmit}
            disabled={selectedWordAnswer !== null}
            revealWords={wordReveal}
            revealCorrect={wordRevealCorrect}
          />
        ) : (
          <AyahGapDisplay
            contextAyahs={contextAyahs}
            label={contextLabel}
            useMushafLayout={useMushafLayout}
          />
        )}
      </div>

      {/* Hint bar */}
      {currentChapterId && (
        <div className="mb-4">
          <KalamQuestHintBar
            chapterId={currentChapterId}
            surahRevealed={surahRevealed}
            onRevealSurah={() => setSurahRevealed(true)}
            fiftyFiftyRemaining={fiftyFiftyRemaining}
            fiftyFiftyDisabled={
              fiftyFiftyUsedThisRound ||
              fiftyFiftyRemaining <= 0 ||
              (isAyahMode ? selectedWordAnswer !== null : selectedAyahKey !== null)
            }
            fiftyFiftyHidden={answerMode === "type"}
            onFiftyFifty={handleFiftyFifty}
          />
        </div>
      )}

      {/* Answer mode toggle */}
      <div className="mb-4">
        <AnswerModeToggle value={answerMode} onChange={setAnswerMode} />
      </div>

      {/* Answer area */}
      <div>
        {isAyahMode ? (
          answerMode === "choices" ? (
            <WordChoiceGrid
              choices={wordChoices}
              correctAnswer={blankedWords.join(" ")}
              selectedAnswer={selectedWordAnswer}
              onSelect={handleWordChoiceSelect}
              eliminatedAnswers={eliminatedWordAnswers}
            />
          ) : null
        ) : (
          answerMode === "choices" ? (
            <ChoiceGrid
              choices={ayahChoices}
              correctKey={gapVerse?.verseKey}
              selectedKey={selectedAyahKey}
              onSelect={handleAyahChoiceSelect}
              eliminatedKeys={eliminatedAyahKeys}
              showTranslation={translationParam !== "off"}
              showTransliteration={transliterationParam}
            />
          ) : typingDiff ? (
            <DiffView diff={typingDiff} />
          ) : selectedAyahKey && selectedAyahKey !== "__wrong__" ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p dir="rtl" lang="ar" className="font-arabic text-xl leading-relaxed text-green-700">
                {gapVerse?.textUthmani}
              </p>
              <p className="mt-2 text-sm text-green-600">Correct!</p>
            </div>
          ) : (
            <TypingInput
              onSubmit={handleAyahTypingSubmit}
              disabled={selectedAyahKey !== null}
            />
          )
        )}
      </div>
    </div>
  );
}

export default function KalamQuestGame() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }
    >
      <KalamQuestGameInner />
    </Suspense>
  );
}
