// ============================================================================
// The browser's voice APIs, narrowed to what we actually use.
//
// Web Speech is only partly in lib.dom: `SpeechSynthesis` is typed, but
// `SpeechRecognition` is still vendor-prefixed and absent, which is why the
// intake page reached for it through a `window as unknown as { … }` cast — the
// kind that types a guess. The shape is declared once here instead, along with
// the availability checks, so calling code can ask "is this supported?" and get
// a real answer rather than an optional chain that quietly does nothing.
// ============================================================================

/** One alternative transcription of one phrase. */
export interface SpeechAlternative {
  readonly transcript: string;
}

export interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<ArrayLike<SpeechAlternative>>;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEventLike) => void;
  onend: () => void;
  start(): void;
  stop(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechCapableWindow {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

/** null when dictation isn't available — the caller must offer typing instead. */
export function speechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as SpeechCapableWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Flattens a recognition event into the text that was heard. */
export function transcriptOf(event: SpeechRecognitionEventLike): string {
  let heard = "";
  for (let i = 0; i < event.results.length; i++) {
    const alternative = event.results[i]?.[0];
    if (alternative) heard += `${alternative.transcript} `;
  }
  return heard.trim();
}

// ---------------------------------------------------------------------------
// Reading a path aloud
// ---------------------------------------------------------------------------

function synthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

export function canSpeak(): boolean {
  return synthesis() !== null;
}

/** Speaks text, replacing anything already queued. `onEnd` always fires or never runs. */
export function speak(text: string, options: { rate?: number; onEnd?: () => void } = {}): boolean {
  const voice = synthesis();
  if (!voice || !text) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 0.95;
  if (options.onEnd) utterance.onend = options.onEnd;
  voice.cancel();
  voice.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  synthesis()?.cancel();
}
