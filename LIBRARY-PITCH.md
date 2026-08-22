# Getting YNorth onto Santa Clara library computers

A playbook for pitching YNorth to public libraries as a nonprofit civic tool.
Read the "Three corrections" section first — it will change your plan.

---

## Three corrections to the mental model

### 1. "Santa Clara libraries" is at least three separate organizations

They do not share IT, budgets, boards, or decision-makers. Pitching one does
not pitch the others.

| System | Serves | Governance | Site |
|---|---|---|---|
| **Santa Clara County Library District (SCCLD)** | Campbell, Cupertino, Gilroy, Los Altos, **Milpitas**, Morgan Hill, Saratoga, Monte Sereno, Los Altos Hills, unincorporated county | Joint Powers Authority board (member cities + County) | sccld.org |
| **Santa Clara City Library** | City of Santa Clara only — Central Park, Mission, Northside | City department, Board of Library Trustees | sclibrary.org |
| **San José Public Library (SJPL)** | San José — ~25 branches incl. Dr. MLK Jr. Library | City department, Library & Early Education Commission | sjpl.org |

Sunnyvale, Mountain View, Palo Alto, and Los Gatos also run their own.

**Start with SCCLD — specifically the Milpitas Library.** YNorth was built at
Milpitas Hacks. Milpitas is an SCCLD branch. You are a local kid who built a
thing for your own community. That is a story a community librarian will
actually take upstairs for you. Nobody else pitching them has it.

### 2. Libraries do not install apps on public computers

Public PCs run a frozen, locked-down image (Deep Freeze or similar) that wipes
on every reboot. Installing software means an IT change request, a security
review, and a re-image across every branch. That request will die.

What libraries *do* add, routinely and quickly:

- A link on their **Community Resources** web page
- A **browser bookmark or homepage tile** on public PCs
- A **desktop shortcut** that opens a URL
- A **QR code flyer** at the reference desk and print-release station
- A line in the **staff resource binder** that librarians hand out

YNorth is a web app. So do not ask for an app. Ask for a **bookmark and a
listing**. That is a decision a branch manager can make; installing software
is a decision a district IT director has to make. Aim at the person who can
say yes.

### 3. Santa Clara County already has a homelessness tool — know it cold

**MyConnectSV** is the County's portal for people experiencing homelessness or
already receiving housing services. SJPL runs dedicated computer stations for
it at the Dr. MLK Jr. Library (3rd floor) and Tully Branch.

If you walk in and pitch YNorth as "an app that helps homeless people find
help," the answer is **"we already have MyConnectSV"** and the meeting ends.

Position around it instead:

> "MyConnectSV is for someone who is already in the county system. YNorth is
> for the person who isn't in it yet — who doesn't know Coordinated Entry
> exists, has never called 211, and doesn't know what document to bring.
> YNorth's job is to walk them to the first door. Getting someone to
> MyConnectSV is a *successful outcome* for us."

Never position against a county tool. Make county staff allies, not defenders.
Same for SJPL's **Social Work in the Library** and **Holistic Library
Initiative** — those are the programs you want to be a tool *inside of*, not
a replacement for.

---

## Do you need to be a nonprofit?

**To get a bookmark or a resource listing: no.** To get a district-wide
partnership, funding, or anything with a signed agreement: effectively yes.

The reason matters more than the paperwork. Libraries have policies against
**endorsing commercial products or services**. A `.com` with no clear owner
reads as a startup fishing for users on a captive vulnerable population. That
alone gets you declined without an explicit conversation. Nonprofit status —
or credible nonprofit *framing* — removes that objection before it is raised.

### Option A: Fiscal sponsorship (recommended — do this first)

A fiscal sponsor is an existing 501(c)(3) that takes YNorth under its
umbrella. You get to truthfully say "YNorth is a nonprofit project, fiscally
sponsored by [X], a 501(c)(3)." You can accept tax-deductible donations and
apply for grants immediately.

- **Hack Club Bank / HCB** — free, built for teen-led projects, sponsored by
  The Hack Foundation (501(c)(3)). If you are a student, start here.
- **Social Good Fund**, **Community Initiatives**, **Silicon Valley Community
  Foundation** — general-purpose sponsors, typically 5–10% of funds raised.

Timeline: days to a few weeks. Cost: usually nothing up front.

### Option B: Your own 501(c)(3)

Roughly: CA Articles of Incorporation (nonprofit public benefit, ~$30) → EIN
(free) → bylaws + a board of at least 3 → IRS **Form 1023-EZ** (~$275, only if
projected receipts are under $50k/yr) → CA FTB **Form 3500A** → register with
the CA Attorney General's Registry of Charities (Form CT-1, then RRF-1
annually).

Timeline: ~1–3 months if 1023-EZ goes clean. **Verify all current fees and
forms yourself** — they change, and this is not legal advice.

**Recommendation:** get fiscally sponsored, pitch libraries now, and only
incorporate separately if a pilot succeeds and you need to hold your own
grants. Do not let incorporation paperwork delay the pitch by three months.

---

## The ladder of asks

Ask for the smallest thing that gets you a real yes. Every rung earns the next.

| Tier | The ask | Who approves | Difficulty |
|---|---|---|---|
| **0** | Listed on the library's Community Resources page | A community/adult services librarian | Easy |
| **1** | QR flyer at the reference desk + print station | Branch manager | Easy |
| **2** | Browser bookmark / desktop tile on public PCs at **one** branch | Branch manager + local IT | Moderate |
| **3** | 20 minutes at a staff meeting so librarians hand it to patrons | Branch manager | Moderate |
| **4** | District-wide rollout, named partnership with County Office of Supportive Housing / Destination: Home | JPA board, County | Hard |

**Open at Tier 0 + 1 for one branch.** Say the words *"a 90-day pilot at
Milpitas."* Small, bounded, reversible, no budget, no procurement. That is a
yes a manager can give in a single email.

Tiers 2–4 are what you earn with pilot data. Do not lead with them.

---

## The gates you have to pass

Librarians will ask these. Have the answer written down before the meeting.

### Privacy — this is their first and hardest question

California **Government Code §6267** makes library patron records
confidential, and library staff take patron privacy more seriously than almost
any other public institution. Your on-device architecture is genuinely your
single strongest selling point here. Lead with it.

> **But there is a real bug you must fix first.** YNorth writes the patron's
> own words to persistent `localStorage` (`yn_situation`, `yn_path`,
> `yn_coords` in `app/start/page.tsx`). On a *shared public library computer*
> that means the next patron at that terminal can read the previous patron's
> housing crisis. A librarian will think of this in about four seconds and you
> will lose the room. It is also the exact thing that turns your best claim —
> "nothing touches our servers" — into a liability, because the risk moved
> onto their hardware.

Fix before you pitch (see Product prep below): session-only storage in library
mode, a prominent **"Erase my plan"** button, and an idle auto-clear.

### Accessibility — this is a hard legal gate, not a nice-to-have

Public agencies must meet **Section 508 / WCAG 2.1 AA**. Libraries are
increasingly asked for a **VPAT** (Voluntary Product Accessibility Template)
before adding a third-party tool.

You already have larger-text, high-contrast, and reduce-motion support — say
so. Then actually run an audit (axe DevTools + Lighthouse), test with a screen
reader (NVDA or VoiceOver), fix what breaks, and publish an accessibility
statement at `/accessibility`. Offering a VPAT unprompted will put you ahead
of most vendors they deal with.

### Accuracy and liability

"What happens if YNorth gives a patron a phone number that rings nowhere?"

Answer: grounded search with citations, a human-verified local resource list,
a visible "Report a problem with this resource" link on every resource, and a
plain disclaimer that YNorth is a navigation aid, not a service provider or a
crisis line — with 988 and the County Mental Health Call Center
(800-704-0900) surfaced for crises.

### Sustainability — the question that kills hackathon projects

"Will this still exist in twelve months? We are not putting a dead link in
front of a patron in crisis."

Answer with specifics, not enthusiasm: the fiscal sponsor, a named maintainer
and a named backup, the source is open so the library is never stranded, a
committed uptime and a status page, and a written commitment to maintain
through the pilot and give 60 days' notice before any shutdown. Put that last
one in writing — it is unusual and it builds enormous trust.

### The AI phone call

Be honest with yourself: an AI voice agent placing outbound calls to shelters
on behalf of a patron, from a public library terminal, is the feature most
likely to get you a no. It touches consent, recording law, and the library's
relationship with local providers.

**Turn it off by default in library mode.** Pitch the plan, the local
resources, the map, the print-out, and the plain-language explanations. Offer
the call feature as a Tier-4 conversation once you have trust and a provider
partner who has agreed to receive those calls. Volunteering this constraint
yourself reads as maturity and buys you enormous credibility.

### Non-commercial

Free to the patron, no account, no ads, no upsell, no data sale, no analytics
that identify a person. State all six explicitly in the one-pager.

---

## Product prep — do this before you email anyone

You get one shot with each branch. Ship these first.

1. **Library kiosk mode** (`?mode=library` or a subdomain): session-only
   storage, big persistent "Erase my plan and start over" button, auto-clear
   after ~5 minutes idle, outbound AI calling disabled.
2. **Verify the print path on a real printer.** You already have a print
   stylesheet (`app/globals.css`, "print: a clean, ink-friendly one-pager") —
   good, most people don't. Now prove it: print the full plan to B&W on a
   library-grade printer and confirm it lands in **one or two pages** with the
   phone numbers legible. Branches charge per page, and paper is the whole
   point on a public terminal.
3. **Human-verified Santa Clara County resources** hard-coded in
   `lib/resources.ts`, not left to the model: 211 Santa Clara County,
   Coordinated Entry, HomeFirst (Boccardo Reception Center), Sacred Heart
   Community Service, Bill Wilson Center (youth), LifeMoves, Family Supportive
   Housing, County Office of Supportive Housing, MyConnectSV, County Mental
   Health Call Center 800-704-0900, 988. **Call every number yourself before
   it ships.** One dead number in a demo ends the pitch.
4. **A `/for-libraries` page.** When a librarian forwards your email to their
   manager, the manager clicks one link. That page needs the one-pager, the
   privacy architecture, the accessibility statement, the pilot offer, and
   your contact — no marketing.
5. **Degrade on a filtered network.** Library networks block things and Wi-Fi
   is congested. Your no-API-key fallback already exists — verify the full
   flow works with Gemini and Vapi unreachable, because that is the demo
   you'll get.
6. **A real domain, not a hackathon URL.** A `netlify.app` subdomain reads as
   temporary. Point a stable domain at it.
7. **Name your languages.** SCC libraries serve large Spanish, Vietnamese,
   Chinese, and Tagalog-speaking populations. Listing those four by name is
   worth more than "10 languages."
8. **Remove the pitch-deck widget and every "hackathon" reference.**
   `components/PitchWidget.tsx` floats your judging deck on every page. It is
   perfect for a demo stage and fatal in a library — it announces that the
   patron is looking at someone's competition entry. Gate it behind a flag
   that is off in library mode, and scrub "Milpitas Hacks" from user-facing
   copy (keep it in the README; it's a good origin story in person, and a bad
   one on the screen a patron in crisis is reading).

---

## The one-page leave-behind

Print this on one side. Bring ten copies. Leave one with every person you talk
to. Fill in the bracketed parts.

> ### YNorth — a free, private navigator out of homelessness
> **A 90-day pilot proposal for [Milpitas Library]**
>
> **The problem staff already see.** People come to the desk asking where to
> go. Help exists — 211, Coordinated Entry, vouchers, vital records, legal aid
> — but the *path* to it is a maze of waitlists, forms, and offices that don't
> talk to each other. Staff can hand out a phone number. They cannot hand out
> an ordered plan.
>
> **What YNorth does.** A patron describes their situation in their own words
> — by voice or text, in English, Spanish, Vietnamese, Chinese, Tagalog, or
> [N] other languages. YNorth returns a plain-language, ordered plan: what to
> do now, what's next, the document needed for each step, and a real, verified
> local resource with a working phone number. They can print it and walk out
> holding it.
>
> **Why a library can put this on a public computer.**
> - **Private by architecture.** A patron's story never touches our servers.
>   In library mode nothing persists past the session, and there's a one-tap
>   "erase my plan."
> - **It cannot invent help.** Resources are drawn from a human-verified list
>   and grounded search with citations — never generated.
> - **Free. No account, no ads, no data sale, no upsell.** [Nonprofit /
>   fiscally sponsored by X, a 501(c)(3).]
> - **Accessible.** Larger text, high contrast, reduce-motion, screen-reader
>   tested. WCAG 2.1 AA; VPAT available on request.
> - **Complementary to MyConnectSV.** We route people *into* the County
>   system. A patron reaching MyConnectSV is a successful outcome for us.
>
> **The ask.** A 90-day pilot at one branch:
> 1. A link on your Community Resources page
> 2. A QR flyer at the reference desk and print station
> 3. *(Optional)* A browser bookmark on public computers
> 4. *(Optional)* 20 minutes at a staff meeting
>
> No cost, no contract, no IT installation, no patron data. Reversible at any
> time by deleting a link.
>
> **What we report back at 90 days.** Sessions started, plans printed, QR
> scans, staff-reported handoffs, and a five-question patron feedback card —
> shared with you in a short written summary.
>
> **Maintained by.** [Your name], [role]. [Fiscal sponsor.] Open source at
> [repo]. We commit to maintaining YNorth through the pilot and to giving 60
> days' notice before any change in availability.
>
> [email] · [phone] · [ynorth.org/for-libraries]

---

## The cold email

Short. One ask. No attachments on the first email — attachments get filtered
and unopened. Send Tuesday–Thursday morning.

**To: the Community Librarian or Branch Manager at your target branch**
(SCCLD publishes its Community Library Managers; the City of Santa Clara and
SJPL list branch contacts.)

> **Subject: Milpitas student-built housing navigator — 15 minutes?**
>
> Hi [Name],
>
> I'm [name], a [student] in [Milpitas]. I built a free tool called YNorth
> that turns the maze of getting out of homelessness — 211, Coordinated Entry,
> vital records, waitlists — into one ordered, plain-language plan a person
> can print and walk out with. It's multilingual, works by voice, and stores
> nothing about the patron on any server.
>
> I know staff at your desk get asked where to go for housing help and don't
> always have a good handoff. I'd like to offer YNorth as one, for free.
>
> I'm not asking you to install anything. My ask is small: a link on your
> Community Resources page and a QR flyer at the desk, as a 90-day pilot at
> [Milpitas]. No cost, no contract, no patron data, reversible by deleting a
> link.
>
> It's built to complement MyConnectSV, not compete with it — our goal is to
> get people who aren't in the County system yet to the first door.
>
> Could I have 15 minutes, in person or on a call? I can bring a one-page
> summary and show you the tool in five minutes.
>
> Thank you for your time,
> [Name] · [phone] · [ynorth.org/for-libraries]

**If they don't reply in a week**, one follow-up, then move to the next branch.
Work several branches in parallel — this is a numbers game and one enthusiastic
librarian is worth more than a perfect email.

**Also email in parallel:**
- **Friends of the Library** / library foundations (SCCLD Foundation, Santa
  Clara City Library Foundation & Friends). They fund things staff want but
  can't buy, and they carry weight with staff.
- **SJPL's Social Work in the Library team.** They are the closest thing in
  the county to your actual user, and they will give you the most honest
  feedback you'll get from anyone.
- **County Office of Supportive Housing** and **Destination: Home**. A single
  sentence of endorsement from either makes every library conversation easier.

---

## The public-meeting move

Library boards meet publicly and take public comment: the **SCCLD JPA Board**,
the **Santa Clara City Board of Library Trustees**, and SJPL's **Library and
Early Education Commission**. Agendas are posted in advance.

You get two to three minutes. It goes into the public record, staff hear it
directly, and board members frequently ask staff to follow up. It is the
single highest-leverage two minutes available to you, and almost nobody uses
it.

> "Good evening. My name is [name], I'm a [student] in [Milpitas]. I built a
> free tool called YNorth that turns the maze of getting out of homelessness
> into one ordered, plain-language plan a person can print at a library
> computer and walk out holding. It stores nothing about the patron on any
> server, it's free, and it's designed to route people into MyConnectSV and
> the County's Coordinated Entry system rather than around them. I'm not
> asking for funding and I'm not asking you to install software. I'm asking
> for a 90-day pilot at one branch: a link on the Community Resources page and
> a QR code at the reference desk. I've left a one-page summary with the
> clerk. Thank you."

Leave copies with the clerk before the meeting so they enter the record.

---

## Running the pilot

If you get a yes, the pilot is the pitch for everything after it. Instrument
it on day one.

**Measure** (all anonymous, all aggregate): unique QR scans by branch, plans
generated, plans printed, language distribution, most-surfaced resources,
staff-reported handoffs (a tally sheet at the desk works fine), and a
five-question paper feedback card — *Did you get a next step you understood?
Did you know about this resource before? Would you use it again?*

**Commit to a number** before you start. "We expect 40 plans generated and 15
printed in 90 days at one branch" is a real hypothesis. Boards trust people
who predict and then report honestly — including when they miss.

**Report in writing** at 90 days: one page, what happened, what didn't work,
what you changed. Then ask for Tier 2 and a second branch.

---

## Order of operations

1. Fix the shared-computer privacy problem, print stylesheet, and verified
   local resource list.
2. Ship `/for-libraries`, the accessibility statement, and a real domain.
3. Apply for fiscal sponsorship (start it now — it runs in the background).
4. Verify every phone number in your Santa Clara County list by calling it.
5. Email 5–8 branch managers and community librarians, starting with Milpitas.
6. Email the Friends/Foundations, SJPL Social Work in the Library, and the
   County Office of Supportive Housing in parallel.
7. Take the first meeting. Bring paper. Demo in five minutes, offline-safe.
8. Ask for the 90-day, one-branch pilot. Nothing bigger.
9. Show up at a board meeting for public comment while you wait.
10. Run the pilot, measure honestly, report in writing, ask for the next rung.

---

## The two things to get right

**Ask small.** A 90-day link-and-flyer pilot at one branch is a yes a single
person can give you today. A district-wide app rollout is a no that takes six
months to arrive.

**Lead with privacy, not with AI.** Every institution in this county is being
pitched AI right now and staff are tired of it. What almost nobody is offering
them is a tool that architecturally cannot leak a patron. That is your opening
line, and it is the reason a librarian will trust you enough to hear the rest.
