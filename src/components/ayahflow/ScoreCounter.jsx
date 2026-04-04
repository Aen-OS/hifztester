export default function ScoreCounter({ correct, total }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div>
      <span className="inline-block rounded-[20px] bg-emerald-700/8 px-3 py-1 text-[13px] text-emerald-700">
        <span className="font-medium">{correct}/{total}</span>{" "}
        correct{total > 0 && ` (${pct}%)`}
      </span>
    </div>
  );
}
