// Renders slides.html to a 16:9 landscape PDF (one slide per page) for Devpost.
//
// Typed against types/puppeteer.d.ts and run straight from TypeScript
// (`npm run pdf` → Node's type stripping), so the build tooling is held to the
// same standard as the app it builds.
import puppeteer, { type Page } from "puppeteer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const W = 1280;
const H = 720;

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

/**
 * Reveal every slide as its own full-bleed page, give each its own dawn
 * background (fixed backgrounds don't repeat across printed pages), and
 * hide the on-screen chrome.
 */
const printStyles = `
  .progress,.time-badge,.chrome,.hint,.notes{display:none!important}
  .sky,.glow,.stars{display:none!important}
  html,body{height:auto!important;overflow:visible!important}
  .deck{height:auto!important}
  .slide{
    display:flex!important; position:relative!important; inset:auto!important;
    width:${W}px!important; height:${H}px!important;
    padding:70px 96px!important; animation:none!important;
    page-break-after:always; break-after:page; overflow:hidden;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
    background:
      radial-gradient(62% 52% at 50% 116%, rgba(255,158,109,.32), rgba(255,210,122,.09) 46%, transparent 72%),
      radial-gradient(120% 95% at 50% 120%, #2a1b3d 0%, #15172e 38%, #080a16 70%, #05060d 100%)!important;
  }
  .slide:last-child{page-break-after:auto}
`;

/** Sprinkle a few static stars onto each slide for the night-sky feel. */
function scatterStars(): void {
  document.querySelectorAll<HTMLElement>(".slide").forEach((slide) => {
    for (let k = 0; k < 26; k++) {
      const star = document.createElement("div");
      const big = Math.random() > 0.85;
      star.style.cssText = `position:absolute;border-radius:50%;
        width:${big ? 3 : 2}px;height:${big ? 3 : 2}px;
        left:${Math.random() * 100}%;top:${Math.random() * 62}%;
        background:${big ? "#ffd27a" : "#fff"};opacity:${0.2 + Math.random() * 0.55};
        z-index:0;pointer-events:none;`;
      slide.insertBefore(star, slide.firstChild);
    }
    // keep content above the stars
    for (const child of Array.from(slide.children)) {
      if (child instanceof HTMLElement && child.style.position !== "absolute") {
        child.style.position = "relative";
        child.style.zIndex = "1";
      }
    }
  });
}

async function renderDeck(page: Page): Promise<void> {
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.goto(`file://${path.resolve(root, "slides.html")}`, { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: printStyles });
  await page.evaluate(scatterStars);
  await page.emulateMediaType("screen");
  await page.pdf({
    path: path.resolve(root, "YNorth-Pitch-Deck.pdf"),
    width: `${W}px`,
    height: `${H}px`,
    printBackground: true,
  });
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
try {
  await renderDeck(await browser.newPage());
  console.log("Wrote YNorth-Pitch-Deck.pdf");
} finally {
  await browser.close();
}
