import Link from "next/link";

export default function GameCard({ title, description, href }) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-border bg-surface p-3 transition-colors hover:bg-emerald-50">
      <h2 className="text-[17px] font-display text-emerald-700">{title}</h2>
      <p className="mt-1 text-xs text-muted font-body">{description}</p>
    </Link>
  );
}
