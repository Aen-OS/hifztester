import Link from "next/link";

export default function BackButton({ href = "/" }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-[14px] text-muted transition-colors hover:text-emerald-700">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      Home
    </Link>
  );
}
