// src/components/ayahflow/DisplayOptionsSelector.jsx
"use client";

import { TRANSLATIONS } from "@/lib/translations";

export default function DisplayOptionsSelector({
  translationEnabled,
  onTranslationEnabledChange,
  translationId,
  onTranslationIdChange,
  transliterationEnabled,
  onTransliterationEnabledChange,
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {/* Translation control */}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={translationEnabled}
              onClick={() => onTranslationEnabledChange(!translationEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                translationEnabled ? "bg-gray-900" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                  translationEnabled ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm font-medium">Translation</span>
          </div>
          <select
            value={translationId}
            onChange={(e) => onTranslationIdChange(e.target.value)}
            disabled={!translationEnabled}
            className={`rounded-lg border border-gray-200 px-2 py-1 text-xs ${
              translationEnabled
                ? "bg-white text-gray-700"
                : "cursor-not-allowed bg-gray-100 text-gray-400 opacity-50"
            }`}
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Transliteration control */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3">
          <button
            role="switch"
            aria-checked={transliterationEnabled}
            onClick={() => onTransliterationEnabledChange(!transliterationEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              transliterationEnabled ? "bg-gray-900" : "bg-gray-200"
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
      </div>
    </div>
  );
}
