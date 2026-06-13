# Judgemynt — The Credential for the AI Era

> Resumes are dead. Everyone's looks identical now — same ChatGPT polish, same buzzwords.
> Judgemynt drops you into a live task with a **deliberately flawed AI**, a ticking
> token + time budget, and measures the one skill that actually matters in the AI era:
> **can you detect what AI gets wrong, direct it to fix it, and do it efficiently?**
> Pass, and you mint a verifiable degree employers can trust.

Built at Milpitas Hacks.

## How it works

1. **Pick a field** you want to be hired in (Software, Marketing, Data… more coming).
2. **Take the 10-minute exam.** You chat with an AI to complete a real task. The AI is
   competent — but we secretly instruct it to hide a subtle flaw (a bug, a false claim,
   a broken inference). You drive it under a token + time budget.
3. **Get graded.** A strict examiner judges *only your transcript* across three axes:
   - **Detection** — did you catch the hidden flaw, or rubber-stamp it?
   - **Direction** — how precise and corrective was your steering?
   - **Efficiency** — how surgically did you spend tokens + time?
4. **Mint your degree** — a verifiable credential that lands on the **employer board**.

## Stack

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS + Framer Motion** for the cinematics
- **Gemini 2.5 Flash** (REST) for the in-exam examinee AI and the grader
- **Supabase** (optional) for persisting credentials
- **Netlify** for deploy

## Run locally

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY (optional — demo mode works without)
npm run dev
```

Open http://localhost:3000.

> **No key? No problem.** Without `GEMINI_API_KEY` the app runs in **DEMO MODE** with a
> deterministic mock examiner/grader — every flow still works for a reliable demo.

## Deploy (Netlify)

1. Connect this repo to Netlify (it auto-detects Next.js via `@netlify/plugin-nextjs`).
2. Add environment variables in Netlify → Site settings → Environment:
   - `GEMINI_API_KEY` (required for live AI)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (optional)
3. Deploy.

## Supabase (optional)

Create a `credentials` table:

```sql
create table credentials (
  id bigint generated always as identity primary key,
  credential_id text unique not null,
  field text,
  field_id text,
  name text,
  overall int,
  grade text,
  dimensions jsonb,
  verdict text,
  issued_at timestamptz default now()
);
```

## Architecture

```
app/
  page.tsx              cinematic landing (the thesis)
  exam/page.tsx         field picker
  exam/[field]/page.tsx exam sandbox (loads field -> ExamClient)
  employers/page.tsx    the credential leaderboard
  api/assess/route.ts   task | respond (flawed examinee) | evaluate (grader)
  api/credential/route.ts  mint + list credentials
lib/
  fields.ts             field tasks + the SECRET planted flaws
  gemini.ts             Gemini REST caller + helpers
  mock.ts               deterministic fallback (demo never dies)
  store.ts              credential store (+ optional Supabase)
components/
  ExamClient.tsx        the chat sandbox (timer + token budget)
  ResultReveal.tsx      cinematic score reveal + mint flow
  Certificate.tsx       the minted degree
```
