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

- Next.js (App Router) and TypeScript
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
  gemini.ts              Gemini access (plain + grounded) + helpers
  brain.ts               the online-learning recommender + Supabase persistence
  resources.ts          curated, REAL universal systems (211, Coordinated Entry, vital records, etc.)
  mock.ts               deterministic fallback path generator
  types.ts              shared types
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

## Run locally

```bash
npm install
cp .env.example .env.local   # add keys (all optional; the app runs without them)
npm run dev
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
