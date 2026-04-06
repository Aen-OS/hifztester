"use client";

import { useState, useRef, useCallback } from "react";
import BlockItem from "./BlockItem";
import { endOfVerse } from "@/lib/verse-marker";

export default function SortableBlockList({
  blocks,
  onReorder,
  results = null,
  disabled = false,
  showTranslation = false,
  showTransliteration = false,
}) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const dragOverIdx = useRef(null);

  const handleDragStart = useCallback(
    (e, idx) => {
      if (disabled) return;
      setDragIdx(idx);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", idx.toString());
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e, idx) => {
      if (disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      dragOverIdx.current = idx;
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e, idx) => {
      if (disabled || dragIdx === null) return;
      e.preventDefault();

      const from = dragIdx;
      const to = idx;
      if (from === to) {
        setDragIdx(null);
        return;
      }

      const newBlocks = [...blocks];
      const [moved] = newBlocks.splice(from, 1);
      newBlocks.splice(to, 0, moved);
      onReorder(newBlocks);
      setDragIdx(null);
    },
    [disabled, dragIdx, blocks, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  const handleTap = useCallback(
    (idx) => {
      if (disabled) return;

      if (selectedIdx === null) {
        setSelectedIdx(idx);
      } else if (selectedIdx === idx) {
        setSelectedIdx(null);
      } else {
        const newBlocks = [...blocks];
        [newBlocks[selectedIdx], newBlocks[idx]] = [
          newBlocks[idx],
          newBlocks[selectedIdx],
        ];
        onReorder(newBlocks);
        setSelectedIdx(null);
      }
    },
    [disabled, selectedIdx, blocks, onReorder],
  );

  function getState(idx) {
    if (results) {
      return results[idx].isCorrect ? "correct" : "incorrect";
    }
    if (dragIdx === idx) return "dragging";
    if (selectedIdx === idx) return "selected";
    return "default";
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, idx) => {
        const verseNum = block.verse?.verseNumber;
        const raw = block.text || block.verse?.textUthmani || "";
        const text = verseNum != null ? `${raw}${endOfVerse(verseNum)}` : raw;
        const translation = block.verse?.translation || null;
        const transliteration = block.verse?.transliteration || null;

        return (
          <BlockItem
            key={block.id}
            text={text}
            translation={translation}
            transliteration={transliteration}
            state={getState(idx)}
            showTranslation={showTranslation}
            showTransliteration={showTransliteration}
            onTap={() => handleTap(idx)}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            draggable={!disabled}
          />
        );
      })}
    </div>
  );
}
