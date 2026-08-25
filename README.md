# YNorth — find your way home

YNorth is a compass out of homelessness. The way out is an invisible maze of
waitlists, forms, and offices that do not talk to each other, and most people
never reach the help that already exists. YNorth turns that maze into one clear,
plain-language, dignified path, and — unlike a directory or a chatbot — it does
the hard parts for the person: it researches real local help, makes the phone
call, books the bed, and keeps watch.

Built for the Housing Dignity track at Milpitas Hacks.

---

## What it does (the user journey)

1. Tell YNorth what is going on, in your own words, by voice or text, in your
   language. Quick-tap chips help when words are hard. You pick your exact city
   so an ambiguous name (San Jose, CA vs San Jose, Costa Rica) cannot slip through.
2. YNorth builds a tailored, plain-language path home: ordered Now / Soon / Later
   steps, the documents you will need, and the next exact action.
3. It shows real local help on a map, with availability pins, and lists real
   resources it found with citations.
4. With your consent, an AI voice agent calls a help line for you, explains your
   situation, and returns clear next steps.
5. The Guardian agent keeps watching for shelter openings, books a bed when one
   appears, and guides you there with low-cost transit directions.
6. A follow-up companion checks in on your next step. The whole plan is private
   (it lives on your device), shareable with a helper, printable, and works on
   any phone, library computer, or shelter kiosk.

---

## The AI, and exactly what each part does

- Gemini 2.5 Flash (`lib/gemini.ts`): reasoning and generation. It builds the
  step-by-step path, writes plain-language explanations, generates ready-to-read
  phone scripts, produces the plan in any of 10 languages, and summarises a
  finished call into next steps.
- Google Search grounding (same Gemini API, `callGeminiGrounded`): finds REAL,
  current local resources with citations, so the AI can never invent a fake
  shelter or phone number. This is the key safety property for a vulnerable user.
- OpenStreetMap (Photon for geocoding, Overpass for shelter/social-service
  points): powers the map of many real nearby places. Free, no API key.
- Vapi (`app/api/call`): the voice agent that places the real, two-way phone
  call and books beds.
- YNorth Brain (`lib/brain.ts`): a small online-learning recommender (a
  single-layer model) that improves with every use. A "this helped" tap nudges
  weights that map a situation to the kinds of help that actually worked, so the
  next person in a similar situation gets better-prioritised guidance. State is
  persisted in Supabase. (Honest framing: it is a lightweight online recommender,
  not a deep neural network.)
- Open-Meteo (`components/WeatherUrgency.tsx`): live weather; when it is cold or
  wet, the plan elevates an urgent "get inside tonight" alert.

Every AI-powered feature degrades gracefully to a deterministic fallback when a
key is missing or a call fails, so the app always works and never shows an error
during a demo.

---

## Tech stack

- Next.js (App Router) and TypeScript — end-to-end typed, see "Type safety" below
- Tailwind CSS and Framer Motion for the UI and motion
- Gemini 2.5 Flash (REST) for reasoning and grounded search
- Vapi for outbound phone calls
- Supabase (optional) to persist the learning model and impact tallies
- Leaflet and OpenStreetMap for the map; Open-Meteo for weather
- Deployed on Netlify

---

## Project map

```
app/
  page.tsx               Landing (renders components/Landing)
  start/page.tsx         Intake: situation, voice, chips, specific-city autocomplete, language
  path/page.tsx          The generated plan (renders components/CompassView)
  share/page.tsx         Read-only plan, shared via a link (data is in the link, not a server)
  preview/page.tsx       A phone-framed, auto-playing walkthrough of the live site
  manifest.ts            PWA manifest (add-to-home-screen)
  opengraph-image.tsx    Generated social share card
  icon.svg, apple-icon.svg  App icons
  api/
    compass/route.ts     generate path | explain a step | write a call script (Gemini + grounding)
    call/route.ts        start a Vapi call | summarise a call into instructions
    call/[id]/route.ts   poll a live call's status + transcript
    agent/route.ts       Guardian: nearby-city search + transit directions (grounded)
    learn/route.ts       feedback that trains the YNorth Brain
    impact/route.ts      real, persisted usage tallies
    geocode/route.ts     geocoding helper (also done client-side)
lib/
  ---- the type layer (see "Type safety", below) ----
  typed.ts              Result, exhaustiveness guards, and the Equal/Expect assertions
  schema.ts             the validator that the static types are inferred from
  brand.ts              nominal types (Latitude, CallId, IsoTimestamp, LanguageName, ...)
  api.ts                the wire contract: one declaration per endpoint, both sides
  client.ts             typed API client — the action you send picks the reply type
  fetch.ts              one validated fetch; every network call goes through it
  route.ts              route-handler plumbing: parse a body against its contract
  storage.ts            schema-checked localStorage, keyed by a registry
  external.ts           typed adapters for Photon, Nominatim, Overpass, Open-Meteo, Vapi, Gemini
  share.ts              encode/decode (and validate) a whole path in a URL fragment
  routes.ts             pages and query flags, shared by whoever writes and reads them
  taxonomy.ts           the shared vocabulary: Category and SituationTag
  icons.ts              the icon registry a resource's `icon` name is checked against
  speech.ts, locate.ts  browser voice APIs; "where is this person, exactly?"
  type-tests.ts         compile-time assertions — no runtime, `tsc` failing IS the test failing
  ---- the app ----
  gemini.ts              Gemini access (plain + grounded) + helpers
  brain.ts               the online-learning recommender + Supabase persistence
  resources.ts          curated, REAL universal systems (211, Coordinated Entry, vital records, etc.)
  mock.ts               deterministic fallback path generator
  types.ts              the domain model, declared as schemas and inferred into types
scripts/
  generate-pdf.mts      renders slides.html to the pitch PDF (typed, run straight from TS)
tests/
  lib.test.ts           runtime tests for the validation layer (node:test, no framework)
types/
  puppeteer.d.ts        ambient types for the deck renderer's tool-only dependency
components/
  Landing.tsx           hero, problem stats, how-it-works, dignity, impact, CTAs
  CompassView.tsx       the full plan view (composes everything below)
  CallForMe.tsx         consent-first "have YNorth call for me"
  Guardian.tsx          autonomous watch -> book a bed -> transit guidance
  Companion.tsx         gentle follow-up check-ins
  ShelterMap.tsx        the live shelter map; MapInner.tsx renders Leaflet
  WeatherUrgency.tsx    live weather-aware urgency
  LocationAutocomplete.tsx  specific, disambiguated city picker
  ImpactCounter.tsx     "lives in motion" real-usage counter
  AccessibilityToggle.tsx   larger text + high contrast
  illustrations.tsx     animated SVG scenes; Celebrate.tsx; AnimatedNumber.tsx; MotionProvider.tsx
```

---

## Type safety

Everything that enters this app arrives as `any`: `await req.json()`,
`await res.json()`, `JSON.parse(localStorage.getItem(...))`, a third-party REST
payload, a language model's best guess at the JSON we asked for. Declaring an
interface over that is a promise, not a check — the interface says `string`
while the wire says `null`, and nobody finds out until someone in a housing
emergency is looking at an empty panel.

So the boundaries are declared once, as schemas, and the TypeScript types are
*derived* from them:

```ts
export const compassRequestSchema = variant("action", {
  generate: { situation: clamped(1200), location: clamped(80), ... },
  explain:  { term: clamped(120), context: clamped(300) },
  script:   { title: clamped(120), stepAction: clamped(280), ... },
});
```

That single declaration gives the route its parameter types, the client its
argument types, and both ends their runtime validation — so the three can never
drift apart. Sending an action picks the reply type with it:

```ts
const reply = await post("/api/compass", { action: "script", ... });
//    reply.value is { script: string }
//    change "script" to "generate" and it becomes { path: CompassPath; live: boolean }
```

The same idea runs through the rest of the codebase:

- **Nominal types.** A latitude and a longitude are both `number`; a call id and
  a language name are both `string`. `lib/brand.ts` tags them so they can't be
  swapped, and the only way to get one is to pass a check — so holding the type
  means the value was validated.
- **Closed vocabularies.** `Category`, `SituationTag`, `Stage`, `ResourceKey`
  and the icon names are unions, not strings. Label tables are
  `Record<Union, string>`, so adding a member without teaching the UI to render
  it doesn't compile.
- **Exhaustive handlers.** Route handlers `switch` over a parsed discriminated
  union and end in `assertNever` — add an action to the contract and the route
  stops compiling until it's handled.
- **Degrade, don't crash.** Untrusted input (a shared link, a stale
  localStorage entry, a model reply that ignored the format) is parsed, not
  cast. A resource key we removed, a renamed signal or a corrupt timestamp is
  dropped or defaulted; the person still gets their path.
- **Both kinds of test.** `lib/type-tests.ts` proves the types line up and
  `tests/lib.test.ts` proves the validator actually validates. Both matter: the
  first version of the runtime suite found a schema that type-checked perfectly
  and threw on import, because a `declare const` symbol has no runtime value.

```bash
npm run typecheck   # next typegen + tsc --noEmit, incl. the compile-time assertions
npm test            # runtime tests for the validation layer
```

`tsconfig.json` runs above `strict`: `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, `noUnusedLocals`/`noUnusedParameters`. Next's
`typedRoutes` is on, so `href`s are checked against the routes that exist, and
route handlers take their params from `RouteContext<'/api/call/[id]'>`.

---

## Run locally

```bash
npm install
cp .env.example .env.local   # add keys (all optional; the app runs without them)
npm run dev
```

```bash
npm run typecheck   # strict typecheck, including the compile-time type tests
npm test            # runtime tests for the validation layer
npm run pdf         # re-render the pitch deck to YNorth-Pitch-Deck.pdf
```

Open http://localhost:3000.

## Environment variables

```
GEMINI_API_KEY              # path generation, grounded local research, scripts, translation
VAPI_API_KEY                # the outbound phone agent (use the private key)
VAPI_PHONE_NUMBER_ID        # the Vapi number to call from
VAPI_VOICE=alloy
VAPI_MODEL=gpt-4o
NEXT_PUBLIC_SUPABASE_URL    # optional: persist the learning model + impact tallies
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Without any keys, the app still runs end to end using deterministic fallbacks.

## Deploy (Netlify)

1. Connect the repo (Next.js is auto-detected via @netlify/plugin-nextjs).
2. Add the environment variables above, then trigger a fresh deploy so the
   functions pick them up.

## Accessibility and dignity

- Consent-first: nothing happens (calls, sharing) without explicit permission.
- Private by design: a person's plan lives on their device and in links they
  control; nothing about them is stored on a server.
- Plain language, voice input, 10 languages, read-aloud, larger-text and
  high-contrast modes, and respect for the reduce-motion setting.
- The AI may only cite real, verifiable resources — it cannot invent help.
