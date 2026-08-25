// ============================================================================
// The app's routes and their query parameters, in one place.
//
// `typedRoutes` (next.config.ts) checks `href` on next/link and the
// next/navigation methods. It can't check the places we navigate by hand: the
// preview page drives a real iframe with `frame.src = "/start?demo=1"`, and
// the intake page reads that flag back out with `sp.get("demo") === "1"`. Two
// string literals in two files, agreeing by luck.
//
// Here the writer and the reader share one definition, so renaming a flag
// breaks both ends at once instead of quietly turning the demo off.
// ============================================================================

/** Every page a person can land on. */
export const PAGES = ["/", "/start", "/path", "/share", "/preview"] as const;

export type PagePath = (typeof PAGES)[number];

/** Query flags the intake page understands. */
export const QUERY = {
  /** load the sample story and run it automatically */
  demo: "demo",
  /** show the advocate-facing framing */
  audience: "for",
} as const;

export const ADVOCATE = "advocate";

export interface StartOptions {
  readonly demo?: boolean;
  readonly forAdvocate?: boolean;
}

export const routes = {
  home: (): PagePath => "/",
  path: (): PagePath => "/path",
  preview: (): PagePath => "/preview",

  start: (options: StartOptions = {}): string => {
    const search = new URLSearchParams();
    if (options.demo) search.set(QUERY.demo, "1");
    if (options.forAdvocate) search.set(QUERY.audience, ADVOCATE);
    const query = search.toString();
    return query ? `/start?${query}` : "/start";
  },

  /** The path itself rides in the fragment, so it never reaches a server. */
  share: (fragment: string): string => `/share#${fragment}`,
} as const;

/** Reads the intake flags back out of a location's query string. */
export function readStartOptions(search: string): Required<StartOptions> {
  const params = new URLSearchParams(search);
  return {
    demo: params.get(QUERY.demo) === "1",
    forAdvocate: params.get(QUERY.audience) === ADVOCATE,
  };
}
