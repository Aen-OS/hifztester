"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";
import DifficultySelector from "@/components/ayahflow/DifficultySelector";
import ModeSelector from "@/components/tartiblock/ModeSelector";
import BackButton from "@/components/BackButton";

export default function TartibLockSetup() {
  const router = useRouter();
  const [scope, setScope] = useState({ type: "surah", values: [] });
  const [gameMode, setGameMode] = useState("ayah");
  const [difficulty, setDifficulty] = useState("easy");

  function handleStart() {
    const params = new URLSearchParams({
      scopeType: scope.type,
      scopeValues: scope.values.join(","),
      gameMode,
      difficulty,
    });
    router.push(`/tartiblock/play?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[480px] px-4 py-12">
      <BackButton />
      <h1 className="mt-4 text-3xl font-bold text-emerald-700">TartibLock</h1>
      <p className="mt-1 text-muted">
        Arrange scrambled words or ayahs into the correct order
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
            Game Mode
          </h2>
          <ModeSelector value={gameMode} onChange={setGameMode} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Difficulty
          </h2>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
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
