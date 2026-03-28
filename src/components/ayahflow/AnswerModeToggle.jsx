"use client";

export default function AnswerModeToggle({ value, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-200">
      <button
        onClick={() => onChange("choices")}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          value === "choices"
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        Choices
      </button>
      <button
        onClick={() => onChange("type")}
        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
          value === "type"
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        Type It
      </button>
    </div>
  );
}
