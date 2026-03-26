"use client";

import { useState } from "react";
import ScopeSelector from "@/components/ayahflow/ScopeSelector";

export default function AyahFlowSetup() {
  const [scope, setScope] = useState({ type: "surah", values: [] });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">AyahFlow</h1>
      <p className="mt-1 text-gray-500">
        Guess the next ayah from multiple choices
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
            Scope
          </h2>
          <ScopeSelector value={scope} onChange={setScope} />
        </section>

        <button
          disabled={scope.values.length === 0}
          className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start
        </button>
      </div>
    </div>
  );
}
