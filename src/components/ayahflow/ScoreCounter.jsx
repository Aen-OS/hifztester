export default function ScoreCounter({ correct, total }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="text-sm text-gray-500">
      <span className="font-medium text-gray-900">{correct}/{total}</span>{" "}
      correct{total > 0 && ` (${pct}%)`}
    </div>
  );
}
