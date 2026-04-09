"use client";

import { useState } from "react";

function accuracyColor(pct) {
  if (pct >= 90) return "text-emerald-700";
  if (pct >= 70) return "text-amber-500";
  return "text-red-500";
}

function barColor(pct) {
  if (pct >= 90) return "bg-emerald-700";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function AyahList({ results }) {
  const wrong = results.filter((r) => !r.correct);
  const correctCount = results.filter((r) => r.correct).length;
  const showAll = results.length <= 6;

  return (
    <div className="mt-2 space-y-0.5 text-xs">
      {(showAll ? results : wrong).map((r, i) => (
        <div
          key={i}
          className={`flex items-center justify-between rounded px-2 py-1 ${
            r.correct ? "" : "bg-red-500/10"
          }`}
        >
          <span className={r.correct ? "text-muted" : "text-red-500"}>
            {r.verse_key} {r.correct ? "\u2713" : "\u2717"}
          </span>
          {!r.correct && r.user_answer && (
            <span className="text-muted">You answered {r.user_answer}</span>
          )}
        </div>
      ))}
      {!showAll && correctCount > 0 && (
        <p className="px-2 text-muted">+ {correctCount} more correct</p>
      )}
    </div>
  );
}

function SurahRow({ surah_name, correct, total, results }) {
  const [expanded, setExpanded] = useState(false);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div
      className="cursor-pointer rounded-lg bg-surface-raised p-3"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm">{surah_name}</span>
        <span className={`text-xs font-semibold ${accuracyColor(pct)}`}>
          {correct}/{total} — {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${barColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {expanded ? (
        <AyahList results={results} />
      ) : (
        <p className="mt-2 text-[11px] text-muted">Tap to expand</p>
      )}
    </div>
  );
}

function JuzGroup({ juz, surahs }) {
  const [expanded, setExpanded] = useState(false);
  const totalCorrect = surahs.reduce((sum, s) => sum + s.correct, 0);
  const totalAll = surahs.reduce((sum, s) => sum + s.total, 0);
  const pct = totalAll > 0 ? Math.round((totalCorrect / totalAll) * 100) : 0;

  return (
    <div className="rounded-lg bg-surface-raised p-3">
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Juz {juz}</span>
          <span className={`text-xs font-semibold ${accuracyColor(pct)}`}>
            {totalCorrect}/{totalAll} — {pct}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full ${barColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {expanded ? (
        <div className="ml-2 mt-3 space-y-2">
          {surahs.map((s) => (
            <SurahRow key={s.surah} {...s} />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-muted">
          Tap to expand · {surahs.map((s) => s.surah_name).join(", ")}
        </p>
      )}
    </div>
  );
}

export default function ReviewScreen({
  data,
  isConnected,
  onPlayAgain,
  onNewSettings,
}) {
  const { score_correct, score_total, duration_seconds, groups, confidence_delta } = data;
  const pct = score_total > 0 ? Math.round((score_correct / score_total) * 100) : 0;
  const isMultiJuz = groups.length > 0 && groups[0].juz !== undefined;

  return (
    <div className="mx-auto max-w-[680px] px-5 py-8">
      {/* Score summary */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-ink">Session Complete</h2>
        <p className="mt-3 text-5xl font-bold text-emerald-700">
          {score_correct}/{score_total}
        </p>
        <p className="mt-1 text-sm text-muted">
          {pct}% accuracy · {formatDuration(duration_seconds)}
        </p>
      </div>

      {/* Performance breakdown */}
      <div className="mt-8">
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
          Performance by {isMultiJuz ? "Juz" : "Surah"}
        </h3>
        <div className="space-y-2">
          {isMultiJuz
            ? groups.map((g) => <JuzGroup key={g.juz} {...g} />)
            : groups.map((g) => <SurahRow key={g.surah} {...g} />)}
        </div>
      </div>

      {/* Confidence delta */}
      {confidence_delta && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            Confidence Updated
          </h3>
          <div className="rounded-lg bg-surface-raised p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Strengthened</span>
              <span className="text-emerald-700">
                {confidence_delta.strengthened} ayahs ↑
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">Needs work</span>
              <span className="text-red-500">
                {confidence_delta.weakened} ayahs ↓
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sync prompt for anonymous users */}
      {!isConnected && (
        <a
          href="/api/auth/quran"
          className="mt-6 block rounded-lg border border-emerald-700/30 bg-emerald-700/5 p-3 text-center text-xs text-emerald-700 transition-colors hover:bg-emerald-700/10"
        >
          Connect Quran.com to sync your progress across devices
        </a>
      )}

      {/* Action buttons */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-lg bg-emerald-700 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
        >
          Play Again
        </button>
        <button
          onClick={onNewSettings}
          className="flex-1 rounded-lg border border-border py-3 text-sm font-medium transition-colors hover:bg-surface-raised"
        >
          New Settings
        </button>
      </div>
    </div>
  );
}
