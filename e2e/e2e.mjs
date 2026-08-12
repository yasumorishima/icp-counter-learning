/**
 * ローカル replica に載せた本物のサイトを、本物のブラウザで通しで動かす。
 * 作成 → 回答 → 集計 → 変更（履歴に残るか）→ 言語切替 → 支援ページ → カウンター。
 *
 *   node e2e.mjs <frontend-url>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const BASE = process.argv[2];
if (!BASE) {
  console.error("usage: node e2e.mjs <frontend-url>");
  process.exit(2);
}

// 画面の保存先。実行した場所からの相対で作る（環境に依存させない）
const shots = resolve(process.env.E2E_SHOTS || "e2e-shots");
mkdirSync(shots, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const browser = await chromium.launch();

async function newPage(width = 1280, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "en-US" });
  const page = await context.newPage();
  page.on("pageerror", error => check("no page error", false, String(error)));
  return { context, page };
}

// ---- 1. 作成 ---------------------------------------------------------------

const { context, page } = await newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("home loads and agent is ready", true);
check("default language follows the browser", (await page.locator("#lang-select").inputValue()) === "en");

await page.screenshot({ path: `${shots}/01-home.png`, fullPage: true });

await page.fill("#f-title", "Team practice in August");

// 日付を選んで押すだけで候補が入るか
await page.fill("#f-date", "2026-09-05");
await page.fill("#f-time", "10:30");
await page.click("#add-from-date");
const picked = await page.locator(".option-input").first().inputValue();
const expected = await page.evaluate(() =>
  new Intl.DateTimeFormat("en", {
    month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(2026, 8, 5, 10, 30))
);
check("picking a date fills an option row", picked === expected, picked);

const optionInputs = page.locator(".option-input");
await optionInputs.nth(0).fill("Sun 17 Aug, 9:00");
await optionInputs.nth(1).fill("Sat 23 Aug, 13:00");
await optionInputs.nth(2).fill("Sun 31 Aug, 9:00");
await page.click("#create-button");

await page.waitForFunction(() => location.hash.startsWith("#/p/"), null, { timeout: 30000 });
const pollUrl = page.url();
const pollId = pollUrl.split("/p/")[1];
check("poll is created on chain", Boolean(pollId), `id=${pollId}`);
await page.waitForFunction(() => document.getElementById("poll-title").textContent.length > 0, null, { timeout: 30000 });
check("poll title is shown", (await page.locator("#poll-title").textContent()) === "Team practice in August");

// ---- 2. 回答 ---------------------------------------------------------------

await page.fill("#a-name", "Alice");
await page.locator('.answer-row').nth(0).locator('.seg-yes').click();
await page.locator('.answer-row').nth(1).locator('.seg-no').click();
await page.locator('.answer-row').nth(2).locator('.seg-maybe').click();
await page.fill("#a-comment", "I can join from 15:00");
await page.click("#answer-button");
await page.waitForSelector("#answer-status.is-ok", { timeout: 30000 });
check("answer is accepted", true);

const firstRow = page.locator("#tally-body tr").first();
check("respondent appears in the table", (await firstRow.locator("th.col-name").textContent()).includes("Alice"));
check(
  "marks match what was chosen",
  (await firstRow.locator("td.mark").allTextContents()).join("") === "○×△",
  (await firstRow.locator("td.mark").allTextContents()).join("")
);
check("comment is kept", (await firstRow.locator("td.col-comment").textContent()) === "I can join from 15:00");

// ---- 3. 同じ名前で送り直すと履歴が残る ------------------------------------

await page.fill("#a-name", "Alice");
await page.locator('.answer-row').nth(1).locator('.seg-yes').click();
await page.click("#answer-button");
await page.waitForSelector("#answer-status.is-ok", { timeout: 30000 });

check("only the latest answer is counted", (await page.locator("#tally-body tr").count()) === 1);
check("the change is flagged in the row", (await page.locator("#tally-body .revision").count()) >= 1);

await page.click(".history summary");
const historyItems = await page.locator("#history-list li").count();
check("both answers are kept in the history", historyItems === 2, `entries=${historyItems}`);

// ---- 4. 別端末から同じ名前で書き換えると印が付く --------------------------

const second = await newPage();
await second.page.goto(pollUrl, { waitUntil: "domcontentloaded" });
await second.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await second.page.fill("#a-name", "Alice");
await second.page.locator('.answer-row').nth(0).locator('.seg-no').click();
await second.page.click("#answer-button");
await second.page.waitForSelector("#answer-status.is-ok", { timeout: 30000 });
check(
  "an edit from another device is marked",
  (await second.page.locator("#tally-body .revision-alert").count()) === 1
);
await second.page.screenshot({ path: `${shots}/02-poll.png`, fullPage: true });

// 主催者の操作は作成した端末にだけ出る
check("owner tools are hidden for other devices", await second.page.locator("#owner-tools").isHidden());
await page.reload();
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("owner tools are shown for the creator", await page.locator("#owner-tools").isVisible());

// ---- 4b. QR は共有 URL を指しているか --------------------------------------

// jsQR は実行場所に関係なく解決する（テストのときだけ使う）
const jsqrPath = createRequire(import.meta.url).resolve("jsqr");
await page.addScriptTag({ path: jsqrPath });
const decoded = await page.evaluate(() => {
  const canvas = document.getElementById("share-qr");
  const ctx = canvas.getContext("2d");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const found = window.jsQR(image.data, canvas.width, canvas.height);
  return found ? found.data : null;
});
check("the QR code encodes the share URL", decoded === pollUrl, String(decoded));

// ---- 5. 言語切替 -----------------------------------------------------------

await page.selectOption("#lang-select", "ja");
check("switching to Japanese changes the UI", (await page.locator("#answer-form .panel-title").textContent()) === "回答する");
await page.selectOption("#lang-select", "ar");
check("Arabic switches the page direction", (await page.getAttribute("html", "dir")) === "rtl");
await page.screenshot({ path: `${shots}/03-arabic.png`, fullPage: true });
await page.selectOption("#lang-select", "ja");
await page.screenshot({ path: `${shots}/04-japanese.png`, fullPage: true });

// ---- 5b. 明るい / 暗い -----------------------------------------------------

const themeBefore = await page.evaluate(() => document.documentElement.dataset.theme || "");
await page.click("#theme-toggle");
const themeAfter = await page.evaluate(() => document.documentElement.dataset.theme);
check("theme toggle switches the mode", themeAfter === "dark", (themeBefore || "(system)") + " -> " + themeAfter);
await page.waitForTimeout(700); // 背景色は 0.35 秒かけて変わるので、変わりきってから測る
const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check("dark mode paints a dark background", bodyBg === "rgb(28, 25, 48)", bodyBg);
await page.screenshot({ path: shots + "/07-dark.png", fullPage: true });
await page.reload();
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("the theme choice survives a reload", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
await page.click("#theme-toggle");
check("switching back returns to light", (await page.evaluate(() => document.documentElement.dataset.theme)) === "light");

// ---- 6. 締め切り -----------------------------------------------------------

await page.click("#toggle-close");
await page.waitForSelector(".pill-closed", { timeout: 30000 });
check("creator can close the poll", await page.locator("#answer-form").isHidden());

await second.page.reload();
await second.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("a closed poll hides the form for everyone", await second.page.locator("#answer-form").isHidden());

// ---- 7. 支援ページとカウンター ---------------------------------------------

await page.goto(`${BASE}#/support`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await page.waitForFunction(() => document.getElementById("m-cycles").textContent !== "—", null, { timeout: 30000 });
const cycles = await page.locator("#m-cycles").textContent();
check("support page shows the cycle balance", /T$/.test(cycles.trim()), cycles.trim());
check("support page counts stored polls", Number((await page.locator("#m-polls").textContent()).replace(/[^0-9]/g, "")) >= 1);
await page.screenshot({ path: `${shots}/05-support.png`, fullPage: true });

const before = await page.locator("#legacy-count").textContent();
await page.click("#legacy-counter");
await page.waitForFunction(
  previous => document.getElementById("legacy-count").textContent !== previous,
  before,
  { timeout: 30000 }
);
const after = await page.locator("#legacy-count").textContent();
check("the old counter still counts", Number(after.replace(/[^0-9]/g, "")) === Number(before.replace(/[^0-9]/g, "")) + 1, `${before} -> ${after}`);

// ---- 8. 存在しない ID ------------------------------------------------------

await page.goto(`${BASE}#/p/zzzzzzzz`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#view-missing:not(.is-hidden)", { timeout: 30000 });
check("unknown id shows the not-found view", true);

// ---- 9. 携帯の画面幅 -------------------------------------------------------

const mobile = await newPage(390, 900);
await mobile.page.goto(pollUrl, { waitUntil: "domcontentloaded" });
await mobile.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
const overflow = await mobile.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("no horizontal overflow on a phone-sized screen", overflow <= 0, `overflowX=${overflow}px`);
await mobile.page.screenshot({ path: `${shots}/06-mobile.png`, fullPage: true });

await browser.close();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
