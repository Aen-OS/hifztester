"use client";

import { useState } from "react";

export default function TypingInput({ onSubmit, disabled }) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim() || disabled) return;
    onSubmit(text);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <textarea
        dir="rtl"
        lang="ar"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="اكتب الآية هنا..."
        className="font-arabic w-full resize-none rounded-lg border border-border bg-emerald-50 p-3 text-xl leading-relaxed focus:border-emerald-400 focus:outline-none disabled:opacity-50"
        rows={3}
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
