"use client";

const QUESTION_PRESETS = [10, 20, 30, 50];
const TIME_PRESETS = [5, 10, 15, 20]; // minutes

export default function GameLengthSelector({ value, onChange }) {
  // value = { mode: "questions"|"time"|"unlimited", count: number, minutes: number }
  const { mode, count, minutes } = value;

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex overflow-hidden rounded-lg bg-surface-raised">
        <button
          onClick={() => onChange({ ...value, mode: "questions" })}
          className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
            mode === "questions"
              ? "bg-emerald-700 text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          By Questions
        </button>
        <button
          onClick={() => onChange({ ...value, mode: "time" })}
          className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${
            mode === "time"
              ? "bg-emerald-700 text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          By Time
        </button>
      </div>

      {/* Presets */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {mode === "time"
          ? TIME_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => onChange({ ...value, mode: "time", minutes: m })}
                className={`rounded-lg border py-2.5 text-center text-sm transition-colors ${
                  mode === "time" && minutes === m
                    ? "border-emerald-700 font-semibold text-emerald-700"
                    : "border-border text-ink hover:border-emerald-700/50"
                }`}
              >
                {m}m
              </button>
            ))
          : QUESTION_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => onChange({ ...value, mode: "questions", count: n })}
                className={`rounded-lg border py-2.5 text-center text-sm transition-colors ${
                  mode === "questions" && count === n
                    ? "border-emerald-700 font-semibold text-emerald-700"
                    : "border-border text-ink hover:border-emerald-700/50"
                }`}
              >
                {n}
              </button>
            ))}
      </div>

      {/* Unlimited toggle */}
      <label className="mt-3 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={mode === "unlimited"}
          onChange={(e) =>
            onChange({
              ...value,
              mode: e.target.checked ? "unlimited" : "questions",
            })
          }
          className="h-4 w-4 rounded border-border accent-emerald-700"
        />
        <span className="text-xs text-muted">Unlimited (end manually)</span>
      </label>
    </div>
  );
}
