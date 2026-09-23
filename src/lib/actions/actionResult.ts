// Next.js masks thrown-error messages from Server Actions in production (same
// treatment as Server Component render errors), replacing them with a generic
// digest-only message. Wrapping actions in this lets us return the real
// message to the client instead of throwing across the server/client boundary.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
}
