"use client";

const STORAGE_KEY = "logos_action_password";

// Once entered correctly, the password is cached in localStorage so it
// isn't asked for again — the server is still the source of truth.
export function getActionPassword(): string | null {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached !== null) return cached;

  const entered = prompt("Password:");
  if (entered === null) return null;

  localStorage.setItem(STORAGE_KEY, entered);
  return entered;
}

export function clearActionPassword() {
  localStorage.removeItem(STORAGE_KEY);
}

// Handles the { ok, data | error } shape returned by server actions.
// Returns the data on success, or null (after alerting) on failure.
export function unwrapActionResult<T>(
  result: { ok: true; data: T } | { ok: false; error: string },
): T | null {
  if (result.ok) return result.data;

  if (result.error === "Incorrect password") {
    clearActionPassword();
  }
  alert(result.error);
  return null;
}
