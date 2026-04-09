"use client";

import { useState, useEffect, useRef } from "react";

export default function GameTimer({ minutes, onTimeUp }) {
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const calledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0 && !calledRef.current) {
          calledRef.current = true;
          onTimeUp();
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [minutes, onTimeUp]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const isLow = remaining <= 60;

  return (
    <span
      className={`inline-block rounded-[20px] px-3 py-1 text-[13px] ${
        isLow
          ? "bg-red-500/10 text-red-500"
          : "bg-emerald-700/8 text-emerald-700"
      }`}
    >
      {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}
