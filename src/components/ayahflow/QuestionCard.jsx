export default function QuestionCard({
  verse,
  direction,
  showTranslation = true,
  showTransliteration = false,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-6 text-center">
      <p className="text-sm font-medium text-gray-500">
        {direction === "next" ? "What comes next?" : "What came before?"}
      </p>
      <p
        dir="rtl"
        lang="ar"
        className="mt-4 font-arabic text-3xl leading-loose">
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-3 text-sm italic text-gray-500">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-2 text-sm text-gray-400">{verse.translation}</p>
      )}
    </div>
  );
}
