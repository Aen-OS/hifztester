export default function QuestionCard({ verse, direction }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-6 text-center">
      <p className="text-sm font-medium text-gray-500">
        {direction === "next" ? "What comes next?" : "What came before?"}
      </p>
      <p dir="rtl" lang="ar" className="mt-4 font-arabic text-3xl leading-loose">
        {verse.textUthmani}
      </p>
      <p className="mt-3 text-sm text-gray-500">{verse.translation}</p>
      <p className="mt-2 text-xs text-gray-400">{verse.verseKey}</p>
    </div>
  );
}
