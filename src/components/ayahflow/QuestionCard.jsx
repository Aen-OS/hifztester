export default function QuestionCard({
  verse,
  direction,
  showTranslation = true,
  showTransliteration = false,
}) {
  return (
    <div className="rounded-lg border border-border p-6 text-center">
      <p className="text-sm font-medium text-muted">
        {direction === "next" ? "What comes next?" : "What came before?"}
      </p>
      <p
        dir="rtl"
        lang="ar"
        className="mt-4 font-arabic text-3xl leading-loose">
        {verse.textUthmani}
      </p>
      {showTransliteration && verse.transliteration && (
        <p className="mt-3 text-sm italic text-muted">
          {verse.transliteration}
        </p>
      )}
      {showTranslation && verse.translation && (
        <p className="mt-2 text-sm text-muted">{verse.translation}</p>
      )}
    </div>
  );
}
