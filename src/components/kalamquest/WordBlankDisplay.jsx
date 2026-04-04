"use client";

import { useState } from "react";

/**
 * Display an ayah with blanked words.
 * - In choices mode: blanks show as underscores
 * - In typing mode: blanks show as inline inputs
 */
export default function WordBlankDisplay({
  display,
  answerMode,
  onTypingSubmit,
  disabled,
  revealWords,
  revealCorrect,
}) {
  const blankCount = display.filter((w) => w.blanked).length;
  const [inputs, setInputs] = useState(() => Array(blankCount).fill(""));

  function handleInputChange(blankIdx, value) {
    setInputs((prev) => {
      const next = [...prev];
      next[blankIdx] = value;
      return next;
    });
  }

  function handleSubmit() {
    if (disabled) return;
    const filled = inputs.filter((s) => s.trim());
    if (filled.length < blankCount) return;
    onTypingSubmit(inputs);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  let blankIdx = 0;
  let revealIdx = 0;

  return (
    <div className="rounded-[14px] border border-emerald-700/15 bg-surface px-6 py-7 text-center">
      <p className="mb-4 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
        Fill in the missing {blankCount === 1 ? "word" : "words"}
      </p>
      <div dir="rtl" lang="ar" className="font-arabic text-[26px] leading-[2.0]">
        {display.map((item, i) => {
          if (!item.blanked) {
            return (
              <span key={i} className="mx-0.5">
                {item.word}
              </span>
            );
          }

          const currentBlankIdx = blankIdx++;
          const revealed = revealWords ? revealWords[revealIdx++] : null;

          if (revealed !== null && revealed !== undefined) {
            return (
              <span
                key={i}
                className={`mx-0.5 inline-block rounded px-2 ${
                  revealCorrect
                    ? "bg-emerald-50 text-emerald-400"
                    : "bg-gold-50 text-gold-500"
                }`}
              >
                {revealed}
              </span>
            );
          }

          if (answerMode === "choices") {
            return (
              <span
                key={i}
                className="mx-0.5 inline-block min-w-[60px] border-b-[2.5px] border-emerald-700 px-4"
              >
                &nbsp;
              </span>
            );
          }

          return (
            <input
              key={i}
              dir="rtl"
              lang="ar"
              type="text"
              value={inputs[currentBlankIdx]}
              onChange={(e) => handleInputChange(currentBlankIdx, e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="font-arabic mx-1 inline-block w-28 border-b-[2.5px] border-emerald-700 bg-transparent px-2 text-center text-[26px] focus:border-emerald-400 focus:outline-none disabled:opacity-50 sm:w-36"
              placeholder="..."
            />
          );
        })}
      </div>

      {answerMode === "type" && !disabled && !revealWords && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={inputs.some((s) => !s.trim())}
            className="rounded-lg bg-emerald-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
