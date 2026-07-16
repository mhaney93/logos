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
