import type { NoteKind } from "@/lib/notes";

const BADGES: Record<NoteKind, { label: string; title: string }> = {
  quote: { label: "❝", title: "Has a quote in Notes" },
  example: { label: "e.g.", title: "Has an example in Notes" },
};

export function NoteBadges({ kinds, className = "" }: { kinds: NoteKind[]; className?: string }) {
  if (kinds.length === 0) return null;
  return (
    <span className={`flex gap-1 ${className}`}>
      {kinds.map((kind) => (
        <span
          key={kind}
          title={BADGES[kind].title}
          className="rounded-full border border-black/[.12] bg-background px-1.5 text-[10px] leading-4 font-semibold text-zinc-500 dark:border-white/[.2] dark:text-zinc-400"
        >
          {BADGES[kind].label}
        </span>
      ))}
    </span>
  );
}
