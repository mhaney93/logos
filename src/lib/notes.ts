export type NoteKind = "quote" | "example";

// Notes are paragraphs; a quote paragraph opens with a quotation mark and an
// example paragraph opens with "Example:" or "Examples…".
export function noteKinds(support: string | null): NoteKind[] {
  const paragraphs = (support ?? "").split(/\n\s*\n/).map((p) => p.trim());
  const kinds: NoteKind[] = [];
  if (paragraphs.some((p) => /^["“]/.test(p))) kinds.push("quote");
  if (paragraphs.some((p) => /^Examples?\b/.test(p))) kinds.push("example");
  return kinds;
}
