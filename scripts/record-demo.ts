/**
 * Records the demo video: a captioned, scripted walkthrough of the site (≈2 min, 1280×720 WebM).
 *
 *   npm run build && npm start            # or point BASE_URL at the deployed site
 *   BASE_URL=https://your-site npm run record-demo
 *
 * Output: demo/wrapscout-demo.webm (git-ignored). Upload it to YouTube / X and link it in the submission.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = path.resolve("demo");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function caption(page: Page, text: string, holdMs = 3500) {
  await page.evaluate((t) => {
    let el = document.getElementById("ws-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "ws-caption";
      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        bottom: "28px",
        transform: "translateX(-50%)",
        maxWidth: "1100px",
        padding: "14px 22px",
        borderRadius: "12px",
        background: "rgba(13,17,23,0.92)",
        color: "#fff",
        font: "500 24px/1.35 system-ui, sans-serif",
        textAlign: "center",
        zIndex: "9999",
        boxShadow: "0 8px 30px rgba(0,0,0,.35)",
      });
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
  await pause(holdMs);
}

async function scrollTo(page: Page, selector: string) {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy({ top: -80, behavior: "smooth" }));
  await pause(800);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await caption(page, "Nvidia, Tesla, gold… now exist as several tokens on different chains. Which one should you buy?", 5000);
  await caption(page, "WrapScout answers that with CoinMarketCap data: which one, why, and where.", 4000);

  await page.evaluate(() => document.getElementById("ws-caption")?.remove()); // client-side navigation keeps the DOM
  const search = page.getByRole("combobox");
  await search.click();
  await search.pressSequentially("Nvidia", { delay: 140 });
  await pause(1200);
  await search.press("Enter");
  await page.waitForURL(/\/a\//);
  await pause(800);

  await caption(page, "Every tokenized version of NVIDIA, joined from the RWA and cryptocurrency APIs.", 4000);
  await scrollTo(page, "[data-testid=best-pick]");
  await caption(page, "The best pick: the most liquid version, priced in line with the others, on the most markets.", 5000);
  await scrollTo(page, "[data-testid=where-to-buy]");
  await caption(page, "Where to buy it: exchanges, chain, contract — and who the issuer serves.", 4500);
  await scrollTo(page, "table");
  await caption(page, "The traps: versions with no market, or $43 of daily volume and a drifting price.", 5000);

  const chainButton = page.getByRole("button", { name: "Ethereum" });
  if (await chainButton.count()) {
    await chainButton.click();
    await caption(page, "Only have an Ethereum wallet? See the best version on your chain.", 4000);
  }

  await page.goto(`${BASE_URL}/a/xau`);
  await caption(page, "Gold: some tokens are priced per gram, others per ounce.", 4000);
  await scrollTo(page, "table");
  await caption(page, "WrapScout flags them as a different unit instead of calling it a 3,000% spread.", 5000);

  await page.goto(`${BASE_URL}/method`);
  await caption(page, "The score is deterministic and fully explained — liquidity, price fidelity, market reach.", 5000);
  await scrollTo(page, "code");
  await caption(page, "Built on 7 CoinMarketCap endpoints. Also available as a JSON API and an MCP server for AI assistants.", 5500);

  await page.goto(BASE_URL);
  await caption(page, "WrapScout — which token should I buy to own it? #BuildwithCMC", 4000);

  await context.close();
  await browser.close();

  const webm = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".webm") && f !== "wrapscout-demo.webm")
    .map((f) => path.join(OUT_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  const target = path.join(OUT_DIR, "wrapscout-demo.webm");
  fs.renameSync(webm, target);
  console.log(`Demo video written to ${target}`);

  // X and most players want MP4 (H.264). Convert when ffmpeg is installed.
  const mp4 = target.replace(/\.webm$/, ".mp4");
  const res = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", target, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  if (res.status === 0) console.log(`MP4 written to ${mp4}`);
  else console.log("ffmpeg not available — convert the WebM to MP4 before uploading to X.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
