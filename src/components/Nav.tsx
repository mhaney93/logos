import Link from "next/link";

export function Nav() {
  return (
    <header className="flex items-center justify-between border-b border-black/[.08] px-8 py-4 dark:border-white/[.145]">
      <Link href="/" className="text-lg font-semibold">
        Logos
      </Link>
    </header>
  );
}
