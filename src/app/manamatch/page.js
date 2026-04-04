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
