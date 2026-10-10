import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 text-center">
      <p className="text-gradient-brand text-7xl font-black tracking-tighter sm:text-8xl">404</p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">This page isn't available</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The link may be broken, or the page may have been removed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
      >
        Back to home
      </Link>
    </main>
  );
}
