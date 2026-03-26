import Link from "next/link";

export default function GameCard({ title, description, href }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-gray-200 p-6 transition-colors hover:border-gray-400 hover:bg-gray-50"
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
