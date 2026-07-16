import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

export function Nav() {
  return (
    <header className="flex items-center justify-between border-b border-black/[.08] px-8 py-4 dark:border-white/[.145]">
      <Link href="/" className="text-lg font-semibold">
        Logos
      </Link>
      <div className="flex items-center gap-4">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] active:scale-95 dark:hover:bg-white/[.08]">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] active:scale-95 dark:hover:bg-[#ccc]">
              Sign up
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link href="/clauses" className="text-sm font-medium">
            Clauses
          </Link>
          <Link href="/arguments" className="text-sm font-medium">
            Arguments
          </Link>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
