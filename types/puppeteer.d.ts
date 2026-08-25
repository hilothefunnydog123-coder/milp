// ============================================================================
// An ambient declaration for the deck renderer's one tool-only dependency.
//
// Puppeteer isn't installed as a dependency of the app — it's only needed by
// `npm run pdf`, which a presenter runs by hand. That used to be reason enough
// to leave the renderer as untyped `.js` with a bare `require("puppeteer")`.
//
// It isn't: a module can be typed from the outside. This declares exactly the
// slice of the API the script touches, so `scripts/generate-pdf.mts` type-checks
// with the rest of the codebase whether or not puppeteer is on disk — and a
// wrong option name is caught here rather than halfway through a render.
// ============================================================================

declare module "puppeteer" {
  export interface Viewport {
    width: number;
    height: number;
    deviceScaleFactor?: number;
  }

  export interface GoToOptions {
    waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  }

  export interface StyleTagOptions {
    content?: string;
    path?: string;
    url?: string;
  }

  export interface PdfOptions {
    path?: string;
    width?: string | number;
    height?: string | number;
    printBackground?: boolean;
    pageRanges?: string;
    landscape?: boolean;
  }

  export interface Page {
    setViewport(viewport: Viewport): Promise<void>;
    goto(url: string, options?: GoToOptions): Promise<unknown>;
    addStyleTag(options: StyleTagOptions): Promise<unknown>;
    evaluate<T>(fn: () => T): Promise<T>;
    emulateMediaType(type: "screen" | "print" | null): Promise<void>;
    pdf(options?: PdfOptions): Promise<Uint8Array>;
  }

  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  export interface LaunchOptions {
    headless?: boolean | "shell";
    args?: string[];
  }

  export function launch(options?: LaunchOptions): Promise<Browser>;

  const puppeteer: { launch: typeof launch };
  export default puppeteer;
}
