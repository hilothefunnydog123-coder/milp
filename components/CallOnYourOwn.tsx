"use client";

/**
 * CallOnYourOwn — what replaces "have YNorth call for me" in library mode.
 *
 * The outbound voice agent is switched off on a shared computer for three
 * reasons worth stating plainly: a patron's situation would be spoken aloud in
 * a room full of strangers, an AI dialing a local shelter from a library
 * terminal puts the library's name behind a call it never agreed to, and the
 * whole feature assumes a device the person keeps — which this is not.
 *
 * So instead of removing the moment, this turns it into the thing that is
 * actually useful here: the real numbers, large and legible, on a page built to
 * be printed and carried out of the building.
 */

import { motion } from "framer-motion";
import { Phone, Printer, MessageSquareQuote } from "lucide-react";
import type { LocalResource } from "@/lib/types";

/**
 * Numbers that are real everywhere in the U.S. Always shown, because grounded
 * search returns nothing when the network is filtered or the key is missing —
 * which is precisely the state a library terminal is most likely to be in. A
 * panel promising help must never hand someone an empty list.
 */
const UNIVERSAL = [
  { name: "211 — local help line", phone: "211", helpsWith: "Free and confidential, 24/7. Connects you to shelter, food, and rent help near you." },
  { name: "988 — crisis line", phone: "988", helpsWith: "Call or text any time if you are in crisis or just need someone to talk to." },
];

/** Pull a dialable number out of a free-text contact string. */
function extractPhone(s?: string): string {
  if (!s) return "";
  const m = s.match(/\+?\d[\d\s().-]{6,}\d/);
  return m ? m[0].trim() : "";
}

function NumberCard({ name, phone, helpsWith }: { name: string; phone: string; helpsWith?: string }) {
  return (
    <div className="rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3">
      <div className="font-semibold">{name}</div>
      {/* tel: still works for whoever opens the printed plan on a phone later */}
      <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="mt-0.5 block font-display text-2xl tracking-wide text-gold">
        {phone}
      </a>
      {helpsWith && <p className="mt-1 text-sm text-muted">{helpsWith}</p>}
    </div>
  );
}

export default function CallOnYourOwn({ resources = [] }: { resources?: LocalResource[] }) {
  const local = resources
    .map((r) => ({ name: r.name, phone: extractPhone(r.contact), helpsWith: r.helpsWith }))
    .filter((r) => r.phone)
    .slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glow-gold mt-6 overflow-hidden rounded-3xl p-7"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-gold">
        <Phone className="h-4 w-4" /> Numbers to take with you
      </div>
      <h2 className="mt-3 font-display text-3xl leading-tight">These are real people who can help.</h2>
      <p className="mt-3 text-muted">
        On a library computer YNorth doesn&apos;t place calls for you — so nothing about your
        situation is said out loud in a shared room, and nothing is left behind on this machine.
        Print your plan, take these numbers, and call when you&apos;re somewhere you feel okay.
      </p>

      {local.length > 0 && (
        <div className="mt-5 space-y-2.5">
          {local.map((r, i) => (
            <NumberCard key={i} {...r} />
          ))}
        </div>
      )}

      <p className="mt-5 text-xs uppercase tracking-wider text-muted">
        {local.length > 0 ? "And these work anywhere in the U.S." : "These work anywhere in the U.S."}
      </p>
      <div className="mt-2.5 space-y-2.5">
        {UNIVERSAL.map((r) => (
          <NumberCard key={r.phone} {...r} />
        ))}
      </div>

      <div className="mt-5 space-y-2 text-sm text-muted">
        <p className="flex items-start gap-2">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            Nervous about what to say? Every step below has a{" "}
            <span className="text-ink">&ldquo;What do I say?&rdquo;</span> button that writes the words for you.
          </span>
        </p>
        <p className="no-print flex items-start gap-2">
          <Printer className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            Use <span className="text-ink">Print</span> above to put all of this — your steps and these
            numbers — on paper before you go.
          </span>
        </p>
      </div>
    </motion.div>
  );
}
