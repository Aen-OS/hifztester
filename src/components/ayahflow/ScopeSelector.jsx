"use client";

import { useState } from "react";
import { SURAH_NAMES } from "@/lib/quran-data";

const SCOPE_TYPES = [
  { key: "surah", label: "Surah", max: 114 },
  { key: "juz", label: "Juz", max: 30 },
  { key: "page", label: "Page", max: 604 },
  { key: "hizb", label: "Hizb", max: 60 },
];

function getLabel(scopeType, num) {
  if (scopeType === "surah") return `${num}. ${SURAH_NAMES[num]}`;
  return `${num}`;
}

export default function ScopeSelector({ value, onChange }) {
  const [activeTab, setActiveTab] = useState(value?.type ?? "surah");
  const [selections, setSelections] = useState(value?.values ?? []);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const currentType = SCOPE_TYPES.find((t) => t.key === activeTab);

  function handleTabChange(key) {
    setActiveTab(key);
    setSelections([]);
    setRangeMode(false);
    setRangeStart("");
    setRangeEnd("");
    onChange({ type: key, values: [] });
  }

  function toggleSelection(num) {
    const next = selections.includes(num)
      ? selections.filter((n) => n !== num)
      : [...selections, num];
    setSelections(next);
    onChange({ type: activeTab, values: next });
  }

  function applyRange() {
    const start = Number(rangeStart);
    const end = Number(rangeEnd);
    if (!start || !end || start > end || start < 1 || end > currentType.max) return;
    const values = [];
    for (let i = start; i <= end; i++) values.push(i);
    setSelections(values);
    onChange({ type: activeTab, values });
  }

  const supportsRange = activeTab === "page" || activeTab === "hizb";

  return (
    <div>
      <button
        onClick={() => {
          const all = Array.from({ length: 114 }, (_, i) => i + 1);
          setActiveTab("surah");
          setSelections(all);
          setRangeMode(false);
          onChange({ type: "surah", values: all });
        }}
        className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          selections.length === 114 && activeTab === "surah"
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        All 114 Surahs
      </button>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {SCOPE_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {supportsRange && (
        <div className="mt-3 flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rangeMode}
              onChange={(e) => {
                setRangeMode(e.target.checked);
                if (!e.target.checked) {
                  setSelections([]);
                  onChange({ type: activeTab, values: [] });
                }
              }}
              className="rounded"
            />
            Select range
          </label>
          {rangeMode && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={currentType.max}
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                placeholder="From"
                className="w-20 rounded border px-2 py-1 text-sm"
              />
              <span className="text-gray-400">—</span>
              <input
                type="number"
                min={1}
                max={currentType.max}
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                placeholder="To"
                className="w-20 rounded border px-2 py-1 text-sm"
              />
              <button
                onClick={applyRange}
                className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {!rangeMode && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border p-2">
          <div
            className={`grid gap-1 ${
              activeTab === "surah" ? "grid-cols-1" : "grid-cols-5 sm:grid-cols-8"
            }`}
          >
            {Array.from({ length: currentType.max }, (_, i) => i + 1).map(
              (num) => (
                <button
                  key={num}
                  onClick={() => toggleSelection(num)}
                  className={`rounded px-2 py-1 text-sm transition-colors ${
                    activeTab === "surah" ? "text-left" : "text-center"
                  } ${
                    selections.includes(num)
                      ? "bg-gray-900 text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {getLabel(activeTab, num)}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {selections.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          {selections.length} {activeTab}
          {selections.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
