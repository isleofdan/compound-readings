// Screenshot tooling (Session 4 brief §5 rule 9). Renders a fixed list of
// screens at two viewports — phone 380×915 and desktop 1280×800 — from the
// built site in dist/, using the environment's own Chromium through
// playwright-core (no browser download). Each shot is a viewport capture, not
// a full page: the fixed bars belong where a thumb finds them. At the phone
// viewport every shot is checked for horizontal overflow, and console errors
// on any page fail the run.
//
//   npm run build
//   npm run screenshots -- --set session-4 --out reports/screenshots/session-4
//
// Chromium is found from CHROMIUM_PATH, else under PLAYWRIGHT_BROWSERS_PATH
// (or ~/.cache/ms-playwright) as chromium-*/chrome-linux/chrome.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";
import { preview } from "vite";

const VIEWPORTS = {
  phone: { width: 380, height: 915 },
  desktop: { width: 1280, height: 800 },
};

// ---------------------------------------------------------------- shot lists

/** Click the nth button whose accessible name starts with the given text. */
const click = (text, nth = 0) => async (page) => {
  await page.getByRole("button", { name: new RegExp("^" + text) }).nth(nth).click();
};
const scrollBottom = () => async (page) => {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
};

/**
 * Drills draw a random item, so a shot that needs a particular outcome or a
 * particular compound walks the queue until it finds one. `answerDrill`
 * answers the classification drill with a fixed button until the reveal
 * says the wanted outcome; `findPredict` answers the prediction challenge
 * with a throwaway reading until the wanted compound is on the card, then
 * types the wanted reading.
 */
const answerDrill = (want) => async (page) => {
  for (let i = 0; i < 400; i++) {
    await page.getByRole("button", { name: "音音" }).first().click();
    const banner = await page.locator("[data-outcome]").getAttribute("data-outcome");
    if (banner === want) return;
    await page.getByRole("button", { name: "次へ", exact: true }).click();
  }
  throw new Error(`answerDrill: no ${want} outcome in 400 items`);
};
const findPredict = (compound, reading) => async (page) => {
  for (let i = 0; i < 400; i++) {
    const shown = (await page.locator("[data-compound]").getAttribute("data-compound")) ?? "";
    if (shown === compound) {
      await page.getByRole("textbox").fill(reading);
      await page.getByRole("button", { name: "答える", exact: true }).click();
      return;
    }
    await page.getByRole("textbox").fill("x");
    await page.getByRole("button", { name: "答える", exact: true }).click();
    await page.getByRole("button", { name: "次へ", exact: true }).click();
  }
  throw new Error(`findPredict: ${compound} not drawn in 400 items`);
};
const predictAnswer = (reading) => async (page) => {
  await page.getByRole("textbox").fill(reading);
  await page.getByRole("button", { name: "答える", exact: true }).click();
};

const SESSION_3 = [
  { name: "chains-list", hash: "#/chains" },
  { name: "chain-手", hash: "#/chains/手" },
  { name: "chain-手-one-revealed", hash: "#/chains/手", steps: [click("開く")] },
  { name: "chain-手-revealed", hash: "#/chains/手", steps: [click("全部開く"), scrollBottom()] },
  { name: "chain-場", hash: "#/chains/場" },
  { name: "chain-場-revealed", hash: "#/chains/場", steps: [click("全部開く"), scrollBottom()] },
  { name: "chain-夕-revealed", hash: "#/chains/夕", steps: [click("全部開く"), scrollBottom()] },
  { name: "chain-毎-revealed", hash: "#/chains/毎", steps: [click("全部開く"), scrollBottom()] },
  { name: "chain-目-not-offered", hash: "#/chains/目" },
  { name: "browse", hash: "#/browse" },
  { name: "browse-場", hash: "#/browse?q=場" },
  { name: "browse-施行-open", hash: "#/browse?q=施行&open=cr_0031" },
  { name: "browse-峠-open", hash: "#/browse?q=峠&open=cr_0156" },
  { name: "browse-朝寝坊-open", hash: "#/browse?q=朝寝坊&open=cr_0124" },
  { name: "browse-大人-open", hash: "#/browse?q=大人&open=cr_0029" },
];

const SESSION_4 = [
  ...SESSION_3,
  { name: "drill", hash: "#/drill" },
  { name: "drill-filter-yutou", hash: "#/drill?cls=yutou" },
  { name: "drill-correct", hash: "#/drill", steps: [answerDrill("correct")] },
  { name: "drill-correct-bottom", hash: "#/drill", steps: [answerDrill("correct"), scrollBottom()] },
  { name: "drill-wrong", hash: "#/drill", steps: [answerDrill("wrong")] },
  { name: "drill-wrong-bottom", hash: "#/drill", steps: [answerDrill("wrong"), scrollBottom()] },
  { name: "predict", hash: "#/predict" },
  { name: "predict-filter-rendaku", hash: "#/predict?pc=rendaku" },
  { name: "predict-miss", hash: "#/predict", steps: [predictAnswer("x")] },
  { name: "predict-施行-せこう", hash: "#/predict", steps: [findPredict("施行", "せこう")] },
  { name: "predict-施行-せこう-bottom", hash: "#/predict", steps: [findPredict("施行", "せこう"), scrollBottom()] },
  { name: "predict-場所-じょうしょ", hash: "#/predict", steps: [findPredict("場所", "じょうしょ")] },
  { name: "predict-茶畑-ちゃはたけ", hash: "#/predict", steps: [findPredict("茶畑", "ちゃはたけ")] },
  { name: "predict-手数-てすう", hash: "#/predict", steps: [findPredict("手数", "てすう")] },
  { name: "predict-大人-だいじん", hash: "#/predict", steps: [findPredict("大人", "だいじん")] },
];

const SETS = { "session-3": SESSION_3, "session-4": SESSION_4 };

// ---------------------------------------------------------------- arguments

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const setName = arg("set", "session-4");
const outDir = arg("out", `reports/screenshots/${setName}`);
const only = arg("only", null);
const shots = SETS[setName];
if (!shots) {
  console.error(`Unknown set "${setName}". Known: ${Object.keys(SETS).join(", ")}`);
  process.exit(2);
}

// ---------------------------------------------------------------- chromium

function findChromium() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(homedir(), ".cache", "ms-playwright")].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const direct = path.join(root, "chromium");
    if (existsSync(direct)) return direct;
    for (const d of readdirSync(root).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
      const exe = path.join(root, d, "chrome-linux", "chrome");
      if (existsSync(exe)) return exe;
    }
  }
  console.error("No Chromium found. Set CHROMIUM_PATH to a Chromium executable, or PLAYWRIGHT_BROWSERS_PATH to a folder holding chromium-*/chrome-linux/chrome.");
  process.exit(2);
}

// ---------------------------------------------------------------- run

if (!existsSync("dist/index.html")) {
  console.error("dist/index.html is missing — run `npm run build` first.");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const server = await preview({ preview: { port: 0, strictPort: false, host: "127.0.0.1" }, logLevel: "silent" });
const base = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await chromium.launch({ executablePath: findChromium(), headless: true });

const problems = [];
let written = 0;
try {
  for (const shot of shots) {
    if (only && shot.name !== only) continue;
    for (const [device, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "ja-JP" });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(String(err)));
      await page.goto(`${base}/${shot.hash}`, { waitUntil: "networkidle" });
      await page.waitForSelector("main");
      for (const step of shot.steps ?? []) await step(page);
      await page.waitForTimeout(150);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
      if (scrollWidth > innerWidth) problems.push(`${shot.name} @${device}: horizontal overflow (${scrollWidth} > ${innerWidth})`);
      if (consoleErrors.length) problems.push(`${shot.name} @${device}: console errors: ${consoleErrors.join(" | ")}`);
      const file = path.join(outDir, `${shot.name}-${device}.png`);
      await page.screenshot({ path: file, fullPage: false });
      written++;
      console.log(`wrote ${file}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(`${written} screenshots in ${outDir}`);
if (problems.length) {
  console.error("Problems:\n  " + problems.join("\n  "));
  process.exit(1);
}
