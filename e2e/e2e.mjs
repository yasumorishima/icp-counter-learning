/**
 * ローカル replica に載せた本物のサイトを、本物のブラウザで通しで動かす。
 * 作成 → 回答 → 集計 → 変更（履歴に残るか）→ 取り消し → 言語切替 → 支援ページ → カウンター。
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

// トップはドリル。日程調整はフッターの入口から
check("the top page is the drill", await page.locator("#view-drill").isVisible());
check("the drill hides the language switch", await page.locator(".lang").isHidden());
const kimaruLink = page.locator(".site-footer a[href='#/kimaru']");
check("kimaru is reachable from the footer", (await kimaruLink.count()) === 1);
await kimaruLink.click();
await page.waitForSelector("#f-title", { state: "visible", timeout: 30000 });

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

// ---- 4c. 自分が書いた回答は自分で取り消せる --------------------------------

// 2 台目から Bob として回答し、その端末から取り消す
await second.page.fill("#a-name", "Bob");
await second.page.locator(".answer-row").nth(0).locator(".seg-yes").click();
await second.page.click("#answer-button");
await second.page.waitForSelector("#answer-status.is-ok", { timeout: 30000 });
const rowsBefore = await second.page.locator("#tally-body tr").count();

const bobRow = second.page.locator("#tally-body tr", { hasText: "Bob" });
check("a withdraw button is offered on my own row", (await bobRow.locator(".withdraw").count()) === 1);
await bobRow.locator(".withdraw").click();
check("the first press only arms the button", (await bobRow.locator(".withdraw.is-armed").count()) === 1);
await bobRow.locator(".withdraw").click();
await second.page.waitForSelector("#answer-status.is-ok", { timeout: 30000 });
await second.page.waitForFunction(
  count => document.querySelectorAll("#tally-body tr").length === count - 1,
  rowsBefore,
  { timeout: 30000 }
);
check("my own answer disappears after withdrawing", (await second.page.locator("#tally-body tr", { hasText: "Bob" }).count()) === 0);

// 作成した端末から見ても消えている（画面だけの見かけではない）
await page.reload();
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("the withdrawal is visible to everyone", (await page.locator("#tally-body tr", { hasText: "Bob" }).count()) === 0);
check("other people's rows cannot be withdrawn", (await page.locator("#tally-body tr", { hasText: "Alice" }).locator(".withdraw").count()) === 0);

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

// ---- 5a. どの言語でも文字が空にならず、横にはみ出さないか -------------------

const langCodes = await page.evaluate(() =>
  [...document.querySelectorAll("#lang-select option")].map(option => option.value)
);
const langProblems = [];
for (const code of langCodes) {
  await page.selectOption("#lang-select", code);
  const report = await page.evaluate(() => {
    const de = document.documentElement;
    const empty = [...document.querySelectorAll("[data-t]")]
      .filter(el => el.offsetParent !== null && !el.textContent.trim())
      .map(el => el.dataset.t);
    return { overflow: de.scrollWidth - de.clientWidth, empty };
  });
  if (report.overflow > 0 || report.empty.length) {
    langProblems.push(code + ": overflow=" + report.overflow + " empty=[" + report.empty.join(",") + "]");
  }
}
check("every language fits and has no empty label", langProblems.length === 0, langProblems.join(" | ") || langCodes.length + " languages");

// ---- 5b. 明るい / 暗い -----------------------------------------------------

const darkPreferring = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const darkPage = await darkPreferring.newPage();
await darkPage.goto(BASE, { waitUntil: "domcontentloaded" });
await darkPage.waitForSelector("body[data-ready='1']", { timeout: 30000 });
const forcedLight = await darkPage.evaluate(() => document.documentElement.dataset.theme);
const forcedLightBg = await darkPage.evaluate(() => getComputedStyle(document.body).backgroundColor);
check("light mode is the default even when the device prefers dark", forcedLight === "light", String(forcedLight));
check("the default page really is painted light", forcedLightBg === "rgb(255, 248, 243)", forcedLightBg);
await darkPreferring.close();

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

// 支援はヘッダではなくフッターから辿れる（使いに来た人の視界に入れない）
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("support is not in the header", (await page.locator(".header-tools a[href='#/support']").count()) === 0);
const footerSupport = page.locator(".site-footer a[href='#/support']");
check("support is reachable from the footer", (await footerSupport.count()) === 1);
await footerSupport.click();
await page.waitForSelector("#view-support:not(.is-hidden)", { timeout: 30000 });
check("support page no longer shows any fuel figures", (await page.locator("#m-cycles, #m-polls, #m-entries").count()) === 0);
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

// ---- 7b. ホーム画面に追加できるか ------------------------------------------

const manifestResponse = await page.request.get(new URL("manifest.json", BASE).href);
check("the manifest is served", manifestResponse.status() === 200, String(manifestResponse.status()));
const manifest = await manifestResponse.json();
check("the manifest is standalone with a start url", manifest.display === "standalone" && manifest.start_url === "/");

const iconStatuses = [];
for (const icon of manifest.icons) {
  const iconResponse = await page.request.get(new URL(icon.src, BASE).href);
  iconStatuses.push(icon.src + "=" + iconResponse.status());
}
check(
  "every icon in the manifest exists",
  iconStatuses.every(entry => entry.endsWith("=200")),
  iconStatuses.join(" ")
);

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

// ---- 10. ドリル -------------------------------------------------------------

const drill = await newPage(420, 900);
await drill.page.goto(BASE, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });

check("a new device is asked for a name first", await drill.page.locator("#who-empty").isVisible());
await drill.page.fill("#who-input", "ゆうた");
await drill.page.click("#who-add");
await drill.page.waitForSelector("#drill-main:not(.is-hidden)", { timeout: 30000 });
check("the name is kept on the device", (await drill.page.locator("#who-name").textContent()) === "ゆうた");
check("six grades are offered", (await drill.page.locator(".grade-tab").count()) === 6);

const unitCount = await drill.page.locator(".unit-card").count();
check("grade 1 has units", unitCount >= 5, `units=${unitCount}`);

// 6 学年ぶんの単元がすべて開けるか（空の学年が無いこと）
const perGrade = [];
for (let g = 1; g <= 6; g += 1) {
  await drill.page.locator(`.grade-tab[data-grade="${g}"]`).click();
  perGrade.push(await drill.page.locator(".unit-card").count());
}
check("every grade has units", perGrade.every(n => n >= 5), perGrade.join("/"));

await drill.page.locator('.grade-tab[data-grade="1"]').click();
await drill.page.locator(".unit-card").first().click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
check("the drill starts", await drill.page.locator("#quiz-text").isVisible());

// 10 問を計算して答える（式を読んで自分で解く）
for (let i = 0; i < 10; i += 1) {
  const text = (await drill.page.locator("#quiz-text").textContent()).trim();
  const parts = text.split(" ");
  const a = Number(parts[0]);
  const b = Number(parts[2]);
  const value = String(parts[1] === "+" ? a + b : a - b);
  for (const digit of value.split("")) {
    await drill.page.locator(`.pad[data-pad="${digit}"]`).click();
  }
  await drill.page.locator('.pad[data-pad="ok"]').click();
  if (i < 9) await drill.page.waitForFunction(n => document.getElementById("quiz-count").textContent.startsWith(String(n)), i + 2, { timeout: 30000 });
}

await drill.page.waitForSelector("#view-result:not(.is-hidden)", { timeout: 30000 });
check("answering every question correctly scores 10", (await drill.page.locator("#result-score").textContent()).includes("10もん せいかい"));
await drill.page.screenshot({ path: `${shots}/06-drill.png`, fullPage: true });

// 記録は端末に残り、リロードしても消えない
await drill.page.goto(BASE, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("stars are kept after a reload", (await drill.page.locator("#who-stars").textContent()) === "10");
check("the unit shows the last score", (await drill.page.locator(".unit-card").first().textContent()).includes("100点"));

// 記録はサーバーではなく端末の中にある
const stored = await drill.page.evaluate(() => localStorage.getItem("drill.records.v1"));
check("the record lives in this device only", Boolean(stored) && stored.includes("ゆうた"));

await drill.page.goto(`${BASE}#/kiroku`, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("#view-kiroku:not(.is-hidden)", { timeout: 30000 });
check("the record page lists the person", (await drill.page.locator("#kiroku-people").textContent()).includes("ゆうた"));
check("the record page lists the unit", (await drill.page.locator(".kiroku-table").count()) === 1);

// 九九は段をえらべる
await drill.page.goto(BASE, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await drill.page.locator('.grade-tab[data-grade="2"]').click();
const kukuCard = drill.page.locator('.unit-card[data-unit="g2-kuku"]');
check("the kuku unit offers a chooser", (await kukuCard.locator(".unit-more").count()) === 1);
await kukuCard.click();
check("choosing opens the rows of kuku", (await drill.page.locator(".variant").count()) === 10);
await drill.page.locator('.variant[data-variant="5"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
const kukuText = (await drill.page.locator("#quiz-text").textContent()).trim();
check("the chosen row is the one asked", kukuText.startsWith("5 ×"), kukuText);

// とけいは 絵で出る
await drill.page.goto(BASE, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await drill.page.locator('.grade-tab[data-grade="1"]').click();
await drill.page.locator('.unit-card[data-unit="g1-clock"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
check("the clock question shows a clock face", await drill.page.locator("#quiz-clock").isVisible());
const painted = await drill.page.evaluate(() => {
  const canvas = document.getElementById("quiz-clock");
  const g = canvas.getContext("2d");
  const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 10) ink += 1;
  return ink;
});
check("the clock face is actually drawn", painted > 5000, `pixels=${painted}`);
check("the clock question is answered by choosing", (await drill.page.locator(".choice").count()) === 4);

// まちがえると「にがてを もういちど」が出る
await drill.page.goto(BASE, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await drill.page.locator('.grade-tab[data-grade="1"]').click();
await drill.page.locator('.unit-card[data-unit="g1-sub"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
for (let i = 0; i < 10; i += 1) {
  await drill.page.locator('.pad[data-pad="0"]').click();
  await drill.page.locator('.pad[data-pad="ok"]').click();
  if (i < 9) await drill.page.waitForFunction(n => document.getElementById("quiz-count").textContent.startsWith(String(n)), i + 2, { timeout: 30000 });
}
await drill.page.waitForSelector("#view-result:not(.is-hidden)", { timeout: 30000 });
await drill.page.goto(BASE, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("a weak unit is offered again", await drill.page.locator("#weak-row").isVisible());
check("the weak card points at the unit just failed", (await drill.page.locator('.weak-card[data-unit="g1-sub"]').count()) === 1);

const drillOverflow = await drill.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("the drill fits a phone-sized screen", drillOverflow <= 0, `overflowX=${drillOverflow}px`);
await drill.context.close();
await mobile.page.screenshot({ path: `${shots}/06-mobile.png`, fullPage: true });

await browser.close();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
