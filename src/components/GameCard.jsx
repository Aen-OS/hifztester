import Link from "next/link";

export default function GameCard({ title, description, href }) {
  return (
    <Link
      href={href}
      className="group relative block rounded-md border border-emerald-700/15 bg-surface p-6 transition-all duration-150 hover:border-emerald-700/40 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
      <h2 className="text-[17px] font-display text-emerald-700">{title}</h2>
      <p className="mt-1 text-xs text-muted font-body">{description}</p>
      <span className="absolute bottom-4 right-4 text-emerald-700/0 transition-all duration-150 group-hover:text-emerald-700/60 text-sm">
        &rarr;
      </span>
    </Link>
  );
}
