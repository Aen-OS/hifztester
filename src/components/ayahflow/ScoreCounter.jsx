export default function ScoreCounter({ correct, total }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="text-sm text-muted">
      <span className="font-medium text-emerald-700">{correct}/{total}</span>{" "}
      correct{total > 0 && ` (${pct}%)`}
    </div>
  );
}
