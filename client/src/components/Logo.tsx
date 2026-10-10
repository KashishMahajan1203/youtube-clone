import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="YourTube home">
      <span className="bg-gradient-brand relative flex size-8 items-center justify-center rounded-[10px] shadow-lg shadow-brand/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-4deg]">
        <svg viewBox="0 0 24 24" className="ml-0.5 size-3.5 fill-white" aria-hidden>
          <path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight">
        Your<span className="text-gradient-brand">Tube</span>
      </span>
    </Link>
  );
}
