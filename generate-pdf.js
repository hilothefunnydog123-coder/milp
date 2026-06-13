// Renders slides.html to a 16:9 landscape PDF (one slide per page) for Devpost.
const puppeteer = require("puppeteer");
const path = require("path");

const W = 1280, H = 720;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

  const fileUrl = "file://" + path.resolve(__dirname, "slides.html");
  await page.goto(fileUrl, { waitUntil: "networkidle0" });

  // Reveal every slide as its own full-bleed page, give each its own dawn
  // background (fixed backgrounds don't repeat across printed pages), and
  // hide the on-screen chrome.
  await page.addStyleTag({
    content: `
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
    `,
  });

  // Sprinkle a few static stars onto each slide for the night-sky feel.
  await page.evaluate(() => {
    document.querySelectorAll(".slide").forEach((s) => {
      for (let k = 0; k < 26; k++) {
        const d = document.createElement("div");
        const big = Math.random() > 0.85;
        d.style.cssText = `position:absolute;border-radius:50%;
          width:${big ? 3 : 2}px;height:${big ? 3 : 2}px;
          left:${Math.random() * 100}%;top:${Math.random() * 62}%;
          background:${big ? "#ffd27a" : "#fff"};opacity:${0.2 + Math.random() * 0.55};
          z-index:0;pointer-events:none;`;
        s.insertBefore(d, s.firstChild);
      }
      // keep content above the stars
      [...s.children].forEach((c) => {
        if (c.style.position !== "absolute") c.style.position = "relative", (c.style.zIndex = "1");
      });
    });
  });

  await page.emulateMediaType("screen");

  await page.pdf({
    path: path.resolve(__dirname, "YNorth-Pitch-Deck.pdf"),
    width: `${W}px`,
    height: `${H}px`,
    printBackground: true,
    pageRanges: "",
  });

  await browser.close();
  console.log("Wrote YNorth-Pitch-Deck.pdf");
})();
