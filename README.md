# YNorth — find your way home

> The path out of homelessness is an invisible maze — waitlists, forms, and offices
> that don't talk to each other. **YNorth** turns it into a clear, plain-language,
> step-by-step path you *own*: what to do now, the documents you'll need, the next
> single step toward a stable home — pointing you, like a north star, toward housing.

Built for the **Housing Dignity** track at Milpitas Hacks.

## What it does

1. **Tell us where you are** — in your own words, by voice or text (multilingual, low-literacy friendly, with quick-tap prompts for when words are hard).
2. **See your path** — a personalized, ordered map of milestones (Now / Soon / The path home), each with a plain-language explanation, one concrete action, the documents needed, and a **real, universal** resource.
3. **Take one step** — mark progress, check off documents, tap "explain this simply" on anything, and share your path with a caseworker or someone you trust.

## Dignity by design

- **You own your story.** Your path lives on *your device* and in links *you* generate — YNorth stores nothing about you on a server and sells nothing.
- **No invented help.** The AI builds your *path* and explains things plainly, but it may only reference **real, universal U.S. systems** (211, Coordinated Entry, Vital Records, SSA, HUD vouchers, 988). It can never hallucinate a fake shelter or phone number.
- **Accessible first** — large readable type, voice input, plain language, calm design.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind + Framer Motion** (warm, cinematic, accessible)
- **Gemini 2.5 Flash** — generates the personalized path + plain-language explanations
- **Web Speech API** — voice intake, no extra service
- **Netlify** — deploy

## Run locally

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (optional — a fallback path works without it)
npm run dev
```

Open http://localhost:3000.

## Deploy (Netlify)

1. Connect the repo (auto-detects Next.js via `@netlify/plugin-nextjs`).
2. Add `GEMINI_API_KEY` in Site settings → Environment variables.
3. Deploy.

## Architecture

```
app/
  page.tsx           landing — the journey toward dawn
  start/page.tsx     warm intake (voice + text + quick chips)
  path/page.tsx      your living compass (loaded from your device)
  share/page.tsx     advocate/helper view (path encoded in the link, no server)
  api/compass/route.ts   generate path | explain a step  (Gemini + safe fallback)
lib/
  resources.ts       curated, REAL universal U.S. systems (the only resources the AI may cite)
  mock.ts            deterministic fallback path generator
components/
  CompassView.tsx    the path UI — steps, progress, documents, resources, share
```
