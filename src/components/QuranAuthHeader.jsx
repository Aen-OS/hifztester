"use client";

import { useState, useEffect } from "react";
import FeedbackModal from "@/components/FeedbackModal";

export default function QuranAuthHeader() {
  const [connected, setConnected] = useState(false);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/quran/status");
        const data = await res.json();
        setConnected(data.connected);

        if (data.connected) {
          const streakRes = await fetch("/api/streak", {
            headers: {
              "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          });

          if (streakRes.ok) {
            const streakData = await streakRes.json();
            setStreak(streakData.days);
          } else if (streakRes.status === 401) {
            setError("expired");
          } else {
            setError("unavailable");
          }
        }
      } catch {
        setError("unavailable");
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  const feedbackButton = (
    <button
      onClick={() => setFeedbackOpen(true)}
      className="text-xs text-muted hover:text-ink transition-colors">
      Feedback
    </button>
  );

  if (loading) {
    return (
      <div className="w-full border-b border-border bg-surface px-4 py-2 font-body">
        <div className="mx-auto flex max-w-[680px] items-center justify-between">
          <span className="text-xs text-muted">Loading...</span>
          {feedbackButton}
        </div>
        <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="w-full border-b border-border bg-surface px-4 py-2 font-body">
        <div className="mx-auto flex max-w-[680px] items-center justify-between">
          <a
            href="/api/auth/quran"
            className="text-xs text-emerald-700 underline underline-offset-2 hover:text-emerald-400 transition-colors">
            Connect Quran.com to sync your progress across devices
          </a>
          {feedbackButton}
        </div>
        <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      </div>
    );
  }

  return (
    <div className="w-full border-b border-border bg-surface px-4 py-2 font-body">
      <div className="mx-auto flex max-w-[680px] items-center justify-between">
        <span className="text-xs text-ink">
          {error === "expired" ? (
            <a
              href="/api/auth/quran"
              className="text-emerald-700 underline underline-offset-2">
              Reconnect Quran.com
            </a>
          ) : error === "unavailable" ? (
            "Streak unavailable"
          ) : (
            <>
              <span className="font-display text-emerald-700">
                {streak ?? 0} day{streak !== 1 ? "s" : ""}
              </span>{" "}
              <span className="text-muted">— Quran.com Reading Streak</span>
            </>
          )}
        </span>
        <span className="flex items-center gap-3">
          {feedbackButton}
          <a
            href="/api/auth/quran/logout"
            className="text-xs text-muted hover:text-ink transition-colors">
            Disconnect
          </a>
        </span>
      </div>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
