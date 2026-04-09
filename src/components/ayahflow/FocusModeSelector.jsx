"use client";

import { useState, useEffect } from "react";

function confidenceColor(conf) {
  if (conf >= 0.75) return "text-emerald-700";
  if (conf >= 0.5) return "text-amber-500";
  return "text-red-500";
}

export default function FocusModeSelector({ value, onChange }) {
  // value = { granularity: "juz"|"surah", selected: number[], auto: boolean }
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/confidence?group_by=${value.granularity}`);
        const data = await res.json();
        setItems(data.items || []);
        setHasData((data.items || []).length > 0);
      } catch {
        setItems([]);
        setHasData(false);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [value.granularity]);

  if (loading) {
    return (
      <div className="py-6 text-center text-xs text-muted">
        Loading confidence data...
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-lg bg-surface-raised p-4 text-center">
        <p className="text-sm text-muted">Not enough data yet</p>
        <p className="mt-1 text-xs text-muted">
          Play a few sessions to unlock Focus Mode
        </p>
      </div>
    );
  }

  function handleAutoSelect() {
    // Auto-select weakest 2 items (or all if fewer)
    const weakest = items.slice(0, Math.min(2, items.length));
    const keys = weakest.map((it) => it.juz ?? it.surah);
    onChange({ ...value, selected: keys, auto: true });
  }

  function toggleItem(key) {
    const selected = value.selected.includes(key)
      ? value.selected.filter((k) => k !== key)
      : [...value.selected, key];
    onChange({ ...value, selected, auto: false });
  }

  return (
    <div>
      {/* Auto-select button */}
      <button
        onClick={handleAutoSelect}
        className="w-full rounded-lg border border-emerald-700/30 bg-emerald-700/5 p-3 text-center transition-colors hover:bg-emerald-700/10"
      >
        <span className="text-sm font-semibold text-emerald-700">
          Practice Weakest Areas
        </span>
        <br />
        <span className="text-[11px] text-emerald-700/70">
          Auto-selects your lowest confidence ayahs
        </span>
      </button>

      {/* Granularity toggle */}
      <div className="mt-4 flex overflow-hidden rounded-lg bg-surface-raised">
        <button
          onClick={() => onChange({ ...value, granularity: "juz", selected: [], auto: false })}
          className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
            value.granularity === "juz"
              ? "bg-border text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          By Juz
        </button>
        <button
          onClick={() => onChange({ ...value, granularity: "surah", selected: [], auto: false })}
          className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
            value.granularity === "surah"
              ? "bg-border text-ink"
              : "text-muted hover:text-ink"
          }`}
        >
          By Surah
        </button>
      </div>

      {/* Ranked list */}
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const key = item.juz ?? item.surah;
          const label = item.juz ? `Juz ${item.juz}` : item.surah_name;
          const isSelected = value.selected.includes(key);
          const confPct = Math.round(item.avg_confidence * 100);

          return (
            <button
              key={key}
              onClick={() => toggleItem(key)}
              className={`flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors ${
                isSelected
                  ? "border border-emerald-700/50 bg-surface-raised"
                  : "border border-border bg-surface-raised"
              }`}
            >
              <div>
                <span className="text-sm">{label}</span>
                <span className={`ml-2 text-xs ${confidenceColor(item.avg_confidence)}`}>
                  {confPct}% confidence
                </span>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded text-[11px] ${
                  isSelected
                    ? "bg-emerald-700 text-white"
                    : "border border-border"
                }`}
              >
                {isSelected && "\u2713"}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Ranked by lowest confidence. Only {value.granularity === "juz" ? "juz" : "surahs"} you've practiced appear.
      </p>
    </div>
  );
}
