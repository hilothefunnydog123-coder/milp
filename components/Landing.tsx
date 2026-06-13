"use client";

import { useRef, useLayoutEffect, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Compass, ArrowRight, Phone } from "lucide-react";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

const SECTIONS = [
  {
    tag: "The problem",
    title: "The way out is a maze.",
    body: "Waitlists, forms, and offices that don't talk to each other. People don't fall through the cracks — they fall through the confusion.",
  },
  {
    tag: "The shift",
    title: "One clear path, in your own words.",
    body: "Tell YNorth where you are. It researches real, local help on the spot and lays out the exact next steps — no jargon, no judgment.",
  },
  {
    tag: "The intelligence",
    title: "It learns from every journey.",
    body: "A model that gets smarter each time someone is helped — surfacing what actually worked for people in situations like yours.",
  },
  {
    tag: "The dignity",
    title: "Your story stays yours.",
    body: "Nothing stored on a server, nothing sold. Your path lives on your device and in links you control. You stay in charge.",
  },
];

export default function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 70,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 78%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative">
      {/* fixed 3D background (degrades to dawn sky if WebGL/textures fail) */}
      <div className="fixed inset-0 -z-0">
        <Boundary fallback={<div className="absolute inset-0 sky" />}>
          <Scene3D />
        </Boundary>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(10,14,23,0.35), rgba(10,14,23,0.82))" }}
        />
      </div>

      {/* nav */}
      <nav className="fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Compass className="h-5 w-5 text-gold" /> Y<span className="warm-text">North</span>
          </div>
          <Link href="/start" className="btn-gold rounded-full px-5 py-2.5 text-sm">
            Find your path
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="relative z-10 flex h-screen flex-col items-center justify-center px-6 text-center">
        <div className="reveal">
          <p className="mb-5 text-sm uppercase tracking-[0.35em] text-gold/80">A compass home</p>
          <h1 className="text-6xl leading-[1.02] sm:text-8xl">
            Find your way <span className="warm-text">home</span>.
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg text-muted">
            The path out of homelessness, made clear, local, and dignified —
            one step at a time.
          </p>
          <Link href="/start" className="btn-gold mt-9 inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg">
            Find your path <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <div className="absolute bottom-10 text-xs uppercase tracking-[0.3em] text-muted">scroll</div>
      </section>

      {/* scrollytelling sections */}
      {SECTIONS.map((s, i) => (
        <section key={i} className="relative z-10 flex h-screen items-center px-6">
          <div className={`mx-auto w-full max-w-5xl ${i % 2 ? "text-right" : "text-left"}`}>
            <div
              className="reveal glass inline-block max-w-xl rounded-3xl p-8 sm:p-10"
              style={{ backdropFilter: "blur(16px)" }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-gold/80">{s.tag}</p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-6xl">{s.title}</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">{s.body}</p>
            </div>
          </div>
        </section>
      ))}

      {/* final CTA */}
      <section className="relative z-10 flex h-screen flex-col items-center justify-center px-6 text-center">
        <div className="reveal">
          <h2 className="text-4xl leading-tight sm:text-6xl">
            You don&apos;t have to figure it out <span className="warm-text">alone</span>.
          </h2>
          <Link href="/start" className="btn-gold mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg">
            Find your path <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Phone className="h-4 w-4 text-gold" /> In crisis? Call or text 988 · Local help: 211
          </p>
        </div>
      </section>
    </div>
  );
}
