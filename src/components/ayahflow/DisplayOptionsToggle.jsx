// src/components/ayahflow/DisplayOptionsToggle.jsx
"use client";

export default function DisplayOptionsToggle({
  translationEnabled,
  onTranslationToggle,
  transliterationEnabled,
  onTransliterationToggle,
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        role="switch"
        aria-checked={translationEnabled}
        aria-label="Toggle translation"
        onClick={onTranslationToggle}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
          translationEnabled
            ? "border-emerald-200 bg-emerald-50 text-ink"
            : "border-border text-muted"
        }`}
      >
        <span>EN</span>
        <div
          className={`relative h-4 w-7 rounded-full transition-colors ${
            translationEnabled ? "bg-emerald-700" : "bg-emerald-200"
          }`}
        >
          <span
            className={`absolute top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              translationEnabled ? "left-3.5" : "left-0.5"
            }`}
          />
        </div>
      </button>
      <button
        role="switch"
        aria-checked={transliterationEnabled}
        aria-label="Toggle transliteration"
        onClick={onTransliterationToggle}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
          transliterationEnabled
            ? "border-emerald-200 bg-emerald-50 text-ink"
            : "border-border text-muted"
        }`}
      >
        <span>Aa</span>
        <div
          className={`relative h-4 w-7 rounded-full transition-colors ${
            transliterationEnabled ? "bg-emerald-700" : "bg-emerald-200"
          }`}
        >
          <span
            className={`absolute top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
              transliterationEnabled ? "left-3.5" : "left-0.5"
            }`}
          />
        </div>
      </button>
    </div>
  );
}
