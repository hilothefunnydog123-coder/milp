/**
 * Library mode — the configuration YNorth runs in on a shared public computer.
 *
 * On a personal phone, keeping a plan in localStorage is the whole privacy
 * story: the data never leaves the device. On a library terminal that same
 * choice inverts into a leak, because "the device" belongs to whoever sits
 * down next. Library mode fixes that by moving every write to sessionStorage
 * (scoped to the tab, gone when it closes), giving the person a one-tap erase,
 * wiping automatically after a stretch of inactivity, and switching off the
 * features that only make sense on a device you own.
 *
 * Turning it on, in order of precedence:
 *   1. NEXT_PUBLIC_LIBRARY_MODE=1 — a whole deployment is library-only. Best
 *      for a branch that bookmarks its own subdomain; nothing to remember.
 *   2. ?mode=library — sticky for the rest of the tab session, so a bookmark
 *      or QR code carries it and later navigations keep it.
 *   3. ?mode=personal — explicitly leaves library mode (for testing).
 *
 * `app/layout.tsx` runs the same resolution in an inline script before first
 * paint so `data-library` is on <html> in time for CSS to hide the pieces
 * library mode removes — no flash, no hydration mismatch.
 */

/** Set on <html> when library mode is active; drives the CSS in globals.css. */
export const LIBRARY_ATTR = "data-library";

/** Tab-scoped flag that keeps `?mode=library` sticky across navigations. */
export const LIBRARY_FLAG = "yn_library";

/** Everything YNorth writes is prefixed with this, so a wipe can find it all. */
export const STORAGE_PREFIX = "yn_";

/** Whole-deployment library mode. Inlined at build time, so server and client agree. */
export const LIBRARY_BUILD = process.env.NEXT_PUBLIC_LIBRARY_MODE === "1";

/** How long the plan may sit untouched before we offer to wipe it. */
export const IDLE_MS = 10 * 60 * 1000;

/** How long the "still there?" warning counts down before wiping. */
export const WARN_MS = 60 * 1000;

/** Shortest demo window we will accept, in seconds. */
const MIN_DEMO_SECONDS = 10;

/**
 * The idle timings for this session.
 *
 * `?idle=<seconds>` shortens the whole cycle so the auto-wipe can actually be
 * demonstrated — a librarian deciding whether to trust this will want to watch
 * it happen, and nobody sits through ten minutes of silence in a fifteen-minute
 * meeting. It is clamped so it can only ever make the window SHORTER than the
 * default: a URL must never be able to extend how long a person's story
 * survives on a shared machine.
 *
 * The window splits two-thirds quiet, one-third visible countdown.
 */
export function idleTimings(): { idleMs: number; warnMs: number } {
  const fallback = { idleMs: IDLE_MS, warnMs: WARN_MS };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = new URLSearchParams(window.location.search).get("idle");
    if (!raw) return fallback;
    const seconds = Number(raw);
    if (!Number.isFinite(seconds)) return fallback;
    const total = Math.min(Math.max(seconds, MIN_DEMO_SECONDS), (IDLE_MS + WARN_MS) / 1000) * 1000;
    if (total >= IDLE_MS + WARN_MS) return fallback;
    return { idleMs: Math.round(total * (2 / 3)), warnMs: Math.round(total / 3) };
  } catch {
    return fallback;
  }
}

/**
 * The inline <script> body that mirrors resolveLibraryMode() before first
 * paint. Kept next to the logic it duplicates so the two can't drift.
 */
export const LIBRARY_BOOT_SCRIPT = `(function(){try{
var q=new URLSearchParams(location.search).get("mode");
if(q==="library")sessionStorage.setItem(${JSON.stringify(LIBRARY_FLAG)},"1");
else if(q==="personal")sessionStorage.removeItem(${JSON.stringify(LIBRARY_FLAG)});
if(sessionStorage.getItem(${JSON.stringify(LIBRARY_FLAG)})==="1")document.documentElement.setAttribute(${JSON.stringify(LIBRARY_ATTR)},"1");
}catch(e){}})()`;

/**
 * Read the URL, apply it to the sticky flag, and report the resulting mode.
 * Runs on every call rather than caching, so `?mode=` takes effect immediately
 * and a wipe of sessionStorage can't leave a stale `true` behind.
 */
function resolveLibraryMode(): boolean {
  if (LIBRARY_BUILD) return true;
  if (typeof window === "undefined") return false;
  try {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (mode === "library") sessionStorage.setItem(LIBRARY_FLAG, "1");
    else if (mode === "personal") sessionStorage.removeItem(LIBRARY_FLAG);
    return sessionStorage.getItem(LIBRARY_FLAG) === "1";
  } catch {
    // Storage blocked (private mode, locked-down kiosk browser). Fall back to
    // the attribute the boot script already set, if it managed to run.
    return document.documentElement.getAttribute(LIBRARY_ATTR) === "1";
  }
}

/**
 * Is this a shared-computer session? Safe to call from event handlers and
 * effects. Do NOT branch render output on it directly — that mismatches
 * hydration; use the `yn-library-only` / `yn-personal-only` CSS classes, or
 * `useLibraryMode()` where the flash doesn't matter.
 */
export function isLibraryMode(): boolean {
  return resolveLibraryMode();
}

/** Keeps <html data-library> in sync after a client-side navigation. */
export function syncLibraryAttr(): boolean {
  if (typeof document === "undefined") return false;
  const on = resolveLibraryMode();
  if (on) document.documentElement.setAttribute(LIBRARY_ATTR, "1");
  else document.documentElement.removeAttribute(LIBRARY_ATTR);
  return on;
}

/** sessionStorage on a shared computer, localStorage on a personal one. */
function backing(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return isLibraryMode() ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The single door to persisted state. Every YNorth read and write goes through
 * here so the shared-computer guarantee holds in one place instead of being
 * re-argued at each call site. Every method swallows failures — storage can be
 * disabled outright, and a plan the person can still read beats a crash.
 */
export const store = {
  get(key: string): string | null {
    try {
      return backing()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      backing()?.setItem(key, value);
    } catch {
      /* quota exceeded or storage disabled — the session just won't persist */
    }
  },
  remove(key: string): void {
    try {
      backing()?.removeItem(key);
    } catch {}
  },
};

/** Remove every yn_* key from one store, preserving the mode flag itself. */
function wipe(s: Storage): void {
  const doomed: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(STORAGE_PREFIX) && k !== LIBRARY_FLAG) doomed.push(k);
  }
  doomed.forEach((k) => s.removeItem(k));
}

/**
 * Erase everything YNorth knows about the person, from BOTH stores.
 *
 * Both, deliberately: a terminal may have been used in personal mode earlier,
 * and "erase" has to mean erase or it isn't worth saying to a librarian. The
 * only survivor is the library-mode flag, so clearing doesn't quietly drop the
 * session back into personal mode.
 */
export function clearPatronData(): void {
  if (typeof window === "undefined") return;
  try {
    wipe(window.sessionStorage);
  } catch {}
  try {
    wipe(window.localStorage);
  } catch {}
}

/** True once a plan exists — i.e. there is something worth protecting. */
export function hasPatronData(): boolean {
  return store.get("yn_path") !== null;
}
