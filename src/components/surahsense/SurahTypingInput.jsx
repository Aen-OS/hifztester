"use client";

import { useState } from "react";

export default function SurahTypingInput({ onSubmit, disabled }) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim() || disabled) return;
    onSubmit(text);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type the surah name..."
        className="w-full rounded-lg border border-border bg-emerald-50 px-3 py-2.5 text-base placeholder:text-muted focus:border-emerald-400 focus:outline-none disabled:opacity-50"
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          className="rounded-lg bg-emerald-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
