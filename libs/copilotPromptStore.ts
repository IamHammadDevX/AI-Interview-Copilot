// lib/copilotPromptStore.ts
// Unified prompt store that works in **both** browser (localStorage) **and** server (in‑memory).
// ‑ On the client we persist to localStorage so the prompt survives page reloads.
// ‑ On the server (API routes, server actions, etc.) we fall back to an in‑memory variable that
//   lasts for the lifetime of the process (good enough for most dev / preview deployments).
//   If you need true persistence across server restarts, plug in a DB, Redis, or KV here.

const STORAGE_KEY = 'copilot_prompt';

export const defaultPrompt = `
You are an Interview assistant for a candidate interviewing for a Senior Software Engineer role.
Answer clearly and be ready for the interview question.
Provide concise, short answers, and use only simple text.
Structured approach (for behavioral questions use the STAR method: Situation, Task, Action, Result; for technical questions provide a clear summary, then dive into details).
`.trim();

// ────────────────────────────────────────────────────────────────────────────────
//                               Internal state
// ────────────────────────────────────────────────────────────────────────────────
// We maintain a module‑level variable for server/runtime usage. In the browser we
// sync this variable to localStorage so SSR/ISR code can still read it.
let currentPrompt: string = defaultPrompt;

// ────────────────────────────────────────────────────────────────────────────────
//                                      API
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Returns the current prompt.
 *
 * • **Client side**: reads from localStorage (if present) and caches it in the
 *   module variable so subsequent calls are fast.
 * • **Server side**: simply returns the module variable (no window object).
 */
export function getCurrentPrompt(): string {
  if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim().length > 0) {
        currentPrompt = stored.trim();
      }
  }
  return currentPrompt;
}

/**
 * Updates the prompt.
 *
 * • Always updates the module‑level variable so server/APIs see the change.
 * • On the client, also writes to localStorage.
 */
export function handleSaveNewPrompt(newPrompt: string): boolean {
  const trimmed = newPrompt.trim();
  currentPrompt = trimmed;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
      return true;
    } catch {
      // Swallow quota / privacy errors silently.
      return false;
    }
  }
}

/**
 * Removes any custom prompt so the default prompt is used next time.
 */
export function resetPrompt(): boolean {
  currentPrompt = defaultPrompt;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }
}
