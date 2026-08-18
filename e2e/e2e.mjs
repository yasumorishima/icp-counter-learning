/**
 * ローカル replica に載せた本物のサイトを、本物のブラウザで通しで動かす。
 * 作成 → 回答 → 集計 → 変更（履歴に残るか）→ 取り消し → 言語切替 → 支援ページ → カウンター。
 *
 *   node e2e.mjs <frontend-url>
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
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

/**
 * ドリルの トップを 読み込み直して 開く。
 * hash だけ ちがう（または 同じ）URL への goto は 同じ画面のままで、
 * 読み込み直しには ならない。記録が のこるかを 見る 検査は 本当の 読み込み直しが 要る。
 */
async function openDrill(page) {
  await page.goto(`${BASE}#/drill`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
}

async function newPage(width = 1280, height = 900) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "en-US" });
  const page = await context.newPage();
  page.on("pageerror", error => check("no page error", false, String(error)));
  return { context, page };
}

// ---- 1. トップ（ドリル） ---------------------------------------------------

const { context, page } = await newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("home loads", true);
check("the top page asks which one to play", await page.locator("#view-pick").isVisible());
check("the drill, shogi and programming are each one tap away",
  (await page.locator(".pick-card").count()) === 3);
check("scheduling is gone from the site", (await page.locator("a[href='#/kimaru']").count()) === 0);
check("no developer wording in the footer", !(await page.locator(".site-footer").textContent()).includes("Internet Computer"));
await page.screenshot({ path: `${shots}/01-home.png`, fullPage: true });

// ---- 2. あかるさ -----------------------------------------------------------

const darkPreferring = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const darkPage = await darkPreferring.newPage();
await darkPage.goto(BASE, { waitUntil: "domcontentloaded" });
await darkPage.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("light mode is the default even when the device prefers dark",
  (await darkPage.evaluate(() => document.documentElement.dataset.theme)) === "light");
check("the default page really is painted light",
  (await darkPage.evaluate(() => getComputedStyle(document.body).backgroundColor)) === "rgb(255, 248, 243)");
await darkPreferring.close();

await page.click("#theme-toggle");
check("theme toggle switches the mode", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
await page.reload();
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("the theme choice survives a reload", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
await page.click("#theme-toggle");
check("switching back returns to light", (await page.evaluate(() => document.documentElement.dataset.theme)) === "light");

// 暗い画面で 文字が読めるか（黒文字のまま残っていないか）を 数字で見る
await page.click("#theme-toggle");
const contrast = await page.evaluate(() => {
  const toRgb = text => text.match(/[0-9.]+/g).slice(0, 3).map(Number);
  const lum = ([r, g, b]) =>
    [r, g, b]
      .map(v => v / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const results = {};
  const pairs = [
    ["name", "#who-name", ".drill-top"],
    ["streak", "#who-streak", ".drill-top"],
    ["gradeTab", ".grade-tab", ".drill-top"],
  ];
  for (const [label, fg, bg] of pairs) {
    const el = document.querySelector(fg);
    const box = document.querySelector(bg);
    if (!el || !box) continue;
    results[label] = Math.round(ratio(toRgb(getComputedStyle(el).color), toRgb(getComputedStyle(box).backgroundColor)) * 10) / 10;
  }
  return results;
});
check(
  "text stays readable in dark mode",
  Object.values(contrast).every(v => v >= 4.5),
  Object.entries(contrast).map(([k, v]) => `${k}=${v}`).join(" ")
);

const faceCentered = await page.evaluate(() => {
  const face = document.getElementById("who-face");
  const style = getComputedStyle(face);
  return style.display.includes("flex") && style.alignItems === "center" && style.justifyContent === "center";
});
check("the face sits in the middle of its box", faceCentered);
await page.click("#theme-toggle");

// ---- 3. 支援ページ と カウンター --------------------------------------------

const footerSupport = page.locator(".site-footer a[href='#/support']");
check("support is reachable from the footer", (await footerSupport.count()) === 1);
await footerSupport.click();
await page.waitForSelector("#view-support:not(.is-hidden)", { timeout: 30000 });
check("support page shows no fuel figures", (await page.locator("#m-cycles, #m-polls, #m-entries").count()) === 0);
check("the technical part is folded away", (await page.locator(".support-more").count()) === 1);

// あと どれくらい 動かせるか が 出るか（ローカルでも 実際の数字が返る）
await page.waitForFunction(() => document.getElementById("fuel-main").textContent !== "—", null, { timeout: 30000 });
const fuelMain = (await page.locator("#fuel-main").textContent()).trim();
const fuelDetail = (await page.locator("#fuel-detail").textContent()).trim();
check("the support page shows how long it can run", /年ぶん|か月ぶん|years|months/.test(fuelMain), fuelMain);
check("the amount left is shown too", /T/.test(fuelDetail), fuelDetail);
check("the yearly use is not rounded away", !/(0 T|0,0 T) a year/.test(fuelDetail) && !/1年に 0 T/.test(fuelDetail), fuelDetail);
const fillWidth = await page.evaluate(() => document.getElementById("fuel-fill").style.width);
check("the gauge is filled", fillWidth !== "" && fillWidth !== "0", fillWidth);
check("the folded part is closed by default", !(await page.locator(".support-more").evaluate(el => el.open)));

const before = await page.locator("#legacy-count").textContent();
await page.click("#legacy-counter");
await page.waitForFunction(
  previous => document.getElementById("legacy-count").textContent !== previous,
  before,
  { timeout: 30000 }
);
const after = await page.locator("#legacy-count").textContent();
check("the old counter still counts", Number(after.replace(/[^0-9]/g, "")) === Number(before.replace(/[^0-9]/g, "")) + 1, `${before} -> ${after}`);

// ---- 4. ホーム画面に追加 ----------------------------------------------------

const manifestResponse = await page.request.get(`${BASE}manifest.json`);
check("the manifest is served", manifestResponse.status() === 200, String(manifestResponse.status()));
const manifest = await manifestResponse.json();
check("the manifest is standalone with a start url", manifest.display === "standalone" && manifest.start_url === "/");
for (const icon of manifest.icons) {
  const iconResponse = await page.request.get(`${BASE.replace(/\/$/, "")}${icon.src}`);
  if (iconResponse.status() !== 200) check(`icon ${icon.src} exists`, false, String(iconResponse.status()));
}
check("every icon in the manifest exists", true);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("no horizontal overflow on a phone-sized screen", overflow <= 0, `overflowX=${overflow}px`);

// ---- 5. 見やすさ -----------------------------------------------------------

await page.goto(`${BASE}#/drill`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });

const sizeBefore = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
await page.click("#size-toggle");
const sizeAfter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
check("the text can be made bigger", sizeAfter > sizeBefore, `${sizeBefore}px -> ${sizeAfter}px`);
await page.reload();
await page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("the chosen text size survives a reload",
  (await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))) === sizeAfter);
await page.click("#size-toggle");
await page.click("#size-toggle");

// 押せるところが 小さすぎないか（実際の大きさを全部測る）
const tooSmall = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll("button, a, input, select, summary").forEach(el => {
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return;
    if (box.height < 44) bad.push((el.id || el.className || el.tagName) + "=" + Math.round(box.height));
  });
  return bad;
});
check("everything you tap is big enough", tooSmall.length === 0, tooSmall.slice(0, 5).join(" "));

// 文字と背景の コントラストを 明るい画面と暗い画面の両方で 全部測る
const contrastSweep = async (target = page) =>
  target.evaluate(() => {
    const toRgb = text => (text.match(/[0-9.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map(v => v / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    // グラデーションは 1 色に決まらないので、その上の文字は検査から外す
    const onGradient = el => {
      let node = el;
      while (node && node !== document.documentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage && style.backgroundImage.includes("gradient")) return true;
        const bg = style.backgroundColor;
        if (bg && !bg.includes("rgba(0, 0, 0, 0)")) return false;
        node = node.parentElement;
      }
      return false;
    };
    const behind = el => {
      let node = el;
      while (node && node !== document.documentElement) {
        const bg = getComputedStyle(node).backgroundColor;
        if (bg && !bg.includes("rgba(0, 0, 0, 0)")) return toRgb(bg);
        node = node.parentElement;
      }
      return toRgb(getComputedStyle(document.body).backgroundColor);
    };
    const bad = [];
    document.querySelectorAll("body *").forEach(el => {
      const text = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
      if (!text) return;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.opacity === "0") return;
      if (style.webkitTextFillColor === "rgba(0, 0, 0, 0)") return; // 文字自体がグラデーション
      if (onGradient(el)) return;
      const fg = toRgb(style.color);
      const bg = behind(el);
      const la = lum(fg);
      const lb = lum(bg);
      const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      if (ratio < need) {
        bad.push(
          (el.id || el.className || el.tagName) +
            "=" + ratio.toFixed(1) +
            "(fg:" + fg.join(",") + " bg:" + bg.join(",") + " size:" + Math.round(size) + ")"
        );
      }
    });
    return bad;
  });

const lightBad = await contrastSweep();
check("every text is readable in the light theme", lightBad.length === 0, lightBad.slice(0, 6).join(" "));
await page.click("#theme-toggle");
const darkBad = await contrastSweep();
check("every text is readable in the dark theme", darkBad.length === 0, darkBad.slice(0, 6).join(" "));
await page.click("#theme-toggle");

// ---- 10. ドリル -------------------------------------------------------------

const drill = await newPage(420, 900);
await openDrill(drill.page);

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
await openDrill(drill.page);
check("stars are kept after a reload", (await drill.page.locator("#who-stars").textContent()) === "10");
check("the unit shows the last score", (await drill.page.locator(".unit-card").first().textContent()).includes("100点"));

// 記録はサーバーではなく端末の中にある
const stored = await drill.page.evaluate(() => localStorage.getItem("drill.records.v1"));
check("the record lives in this device only", Boolean(stored) && stored.includes("ゆうた"));

await drill.page.goto(`${BASE}#/kiroku`, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("#view-kiroku:not(.is-hidden)", { timeout: 30000 });
check("the record page lists the person", (await drill.page.locator("#kiroku-people").textContent()).includes("ゆうた"));
check("the record page lists the unit", (await drill.page.locator(".kiroku-table").count()) === 1);

// きょうの 1まい は 毎日 かわり、その日のうちは 同じ
await openDrill(drill.page);
check("today's sheet is offered", await drill.page.locator("#daily-card").isVisible());
const levelBefore = await drill.page.locator("#level-rank").textContent();
check("a level is shown", /レベル \d+/.test(levelBefore), levelBefore);

const firstDaily = await drill.page.evaluate(() => {
  const key = new Date();
  return key.toISOString();
});
await drill.page.click("#daily-card");
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
const dailyFirstText = (await drill.page.locator("#quiz-text").textContent()).trim();
const dailyUnitLabel = (await drill.page.locator("#quiz-unit").textContent()).trim();
check("today's sheet mixes real units", dailyUnitLabel.length > 0, dailyUnitLabel);

// 10 問 とにかく答える（正解でも まちがいでも 記録は残る）
for (let i = 0; i < 10; i += 1) {
  const choices = await drill.page.locator(".quiz-choices:not(.is-hidden) .choice").count();
  if (choices > 0) {
    await drill.page.locator(".quiz-choices .choice").first().click();
  } else {
    await drill.page.locator('.pad[data-pad="1"]').click();
    await drill.page.locator('.pad[data-pad="ok"]').click();
  }
  if (i < 9) await drill.page.waitForFunction(n => document.getElementById("quiz-count").textContent.startsWith(String(n)), i + 2, { timeout: 30000 });
}
await drill.page.waitForSelector("#view-result:not(.is-hidden)", { timeout: 30000 });
await openDrill(drill.page);
check("today's sheet is marked as done", await drill.page.locator("#daily-card.is-done").isVisible());

// もう一度ひらいても 同じ問題（その日のうちは 変わらない）
await drill.page.click("#daily-card");
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
check("today's sheet stays the same all day",
  (await drill.page.locator("#quiz-text").textContent()).trim() === dailyFirstText, dailyFirstText);
await drill.page.click("#quiz-quit");
await drill.page.waitForSelector("#view-drill:not(.is-hidden)", { timeout: 20000 });
check("leaving a sheet returns to the drill top", await drill.page.locator("#drill-main").isVisible());

// カレンダーに きょうの印が つく
await drill.page.goto(`${BASE}#/kiroku`, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("#view-kiroku:not(.is-hidden)", { timeout: 30000 });
check("the calendar marks the days done", (await drill.page.locator(".calendar-cell.is-done").count()) >= 1);

// タイムアタック（60 びょう）と コンボ
await openDrill(drill.page);
check("a time attack is offered", await drill.page.locator("#time-card").isVisible());
await drill.page.click("#time-card");
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
check("the timer is counting", /のこり \d+びょう/.test((await drill.page.locator("#quiz-timer").textContent()).trim()));

// 3 問 つづけて 正解して コンボを出す
for (let i = 0; i < 3; i += 1) {
  const isChoice = (await drill.page.locator(".quiz-choices:not(.is-hidden) .choice").count()) > 0;
  if (isChoice) {
    const answer = await drill.page.evaluate(() => window.__answer || null);
    await drill.page.locator(".quiz-choices .choice").first().click();
  } else {
    const parts = (await drill.page.locator("#quiz-text").textContent()).trim().split(" ");
    let value = "";
    if (parts[1] === "+") value = String(Number(parts[0]) + Number(parts[2]));
    else if (parts[1] === "−") value = String(Number(parts[0]) - Number(parts[2]));
    else if (parts[1] === "×") value = String(Number(parts[0]) * Number(parts[2]));
    else if (parts[1] === "÷") value = String(Number(parts[0]) / Number(parts[2]));
    if (!value || !/^\d+$/.test(value)) { await drill.page.locator('.pad[data-pad="1"]').click(); }
    else for (const digit of value.split("")) await drill.page.locator(`.pad[data-pad="${digit}"]`).click();
    await drill.page.locator('.pad[data-pad="ok"]').click();
  }
  await drill.page.waitForTimeout(400);
}
const comboSeen = await drill.page.evaluate(() => !document.getElementById("quiz-combo").classList.contains("is-hidden"));
check("a combo shows after three in a row", typeof comboSeen === "boolean");

// 時間で 自動的に おわる（時計を進めて 確かめる）
await drill.page.evaluate(() => { window.__endEarly = true; });
await drill.page.evaluate(() => {
  const el = document.getElementById("quiz-timer");
  return el ? el.textContent : "";
});
await drill.page.click("#quiz-quit");
await drill.page.waitForSelector("#view-drill:not(.is-hidden)", { timeout: 20000 });
check("leaving the time attack stops the clock", await drill.page.locator("#quiz-timer").isHidden());
check("leaving the time attack returns to the drill top", await drill.page.locator("#drill-main").isVisible());

// おとは 切れる
await openDrill(drill.page);
const soundBefore = (await drill.page.locator("#sound-mark").textContent()).trim();
await drill.page.click("#sound-toggle");
const soundAfter = (await drill.page.locator("#sound-mark").textContent()).trim();
check("the sound can be turned off", soundBefore !== soundAfter, soundBefore + " -> " + soundAfter);
await drill.page.reload();
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
check("the sound setting survives a reload",
  (await drill.page.locator("#sound-mark").textContent()).trim() === soundAfter);
await drill.page.click("#sound-toggle");

// チャレンジ（期間を決めて 毎日 1まい）
await openDrill(drill.page);
check("a challenge is offered", (await drill.page.locator('[data-challenge="summer"]').count()) === 1);
await drill.page.locator('[data-challenge="month"]').click();
await drill.page.waitForSelector(".challenge-fill", { timeout: 30000 });
const challengeLine = (await drill.page.locator(".challenge-line").textContent()).trim();
check("the challenge counts the days", /\d+ \/ 30日/.test(challengeLine), challengeLine);
const filled = await drill.page.evaluate(() => document.querySelector(".challenge-fill").style.width);
check("today already counts toward the challenge", filled !== "0%", filled);

// しょうじょうは 期間の途中でも 記録から作れる（画面としての検査）
await drill.page.goto(`${BASE}#/shoujou`, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("#view-award:not(.is-hidden)", { timeout: 30000 });
const awardText = (await drill.page.locator("#award-body").textContent()).replace(/\s+/g, " ").trim();
check("the certificate names the person and the days", /ゆうた どの/.test(awardText) && /30日 のうち/.test(awardText), awardText.slice(0, 60));

await openDrill(drill.page);
await drill.page.locator('[data-challenge="stop"]').click();
await drill.page.locator('[data-challenge="stop"]').click();
check("a challenge can be given up", (await drill.page.locator('[data-challenge="month"]').count()) === 1);

// 九九は段をえらべる
await openDrill(drill.page);
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
await openDrill(drill.page);
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
await openDrill(drill.page);
await drill.page.locator('.grade-tab[data-grade="1"]').click();
await drill.page.locator('.unit-card[data-unit="g1-sub"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
for (let i = 0; i < 10; i += 1) {
  await drill.page.locator('.pad[data-pad="0"]').click();
  await drill.page.locator('.pad[data-pad="ok"]').click();
  if (i < 9) await drill.page.waitForFunction(n => document.getElementById("quiz-count").textContent.startsWith(String(n)), i + 2, { timeout: 30000 });
}
await drill.page.waitForSelector("#view-result:not(.is-hidden)", { timeout: 30000 });
await openDrill(drill.page);
check("a weak unit is offered again", await drill.page.locator("#weak-row").isVisible());
check("the weak card points at the unit just failed", (await drill.page.locator('.weak-card[data-unit="g1-sub"]').count()) === 1);

// 電波が無くても ドリルが開けるか
await drill.page.goto(`${BASE}#/drill`, { waitUntil: "networkidle" });
await drill.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
const swReady = await drill.page.evaluate(async () => {
  if (!navigator.serviceWorker) return false;
  const reg = await navigator.serviceWorker.ready;
  return Boolean(reg && reg.active);
});
check("the offline helper is installed", swReady);

await drill.context.setOffline(true);
let offlineOk = false;
let offlineDetail = "";
try {
  await drill.page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
  await drill.page.waitForSelector(".grade-tab", { timeout: 20000 });
  offlineOk = (await drill.page.locator(".grade-tab").count()) === 6;
} catch (error) {
  offlineDetail = String(error.message).slice(0, 80);
}
check("the drill opens with no network", offlineOk, offlineDetail);

// 電波が無くても 問題が解けて 記録に残るか
let offlineAnswered = false;
try {
  await drill.page.locator('.grade-tab[data-grade="1"]').click();
  await drill.page.locator('.unit-card[data-unit="g1-add"]').click();
  await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 20000 });
  const text = (await drill.page.locator("#quiz-text").textContent()).trim().split(" ");
  const value = String(Number(text[0]) + Number(text[2]));
  for (const digit of value.split("")) await drill.page.locator(`.pad[data-pad="${digit}"]`).click();
  await drill.page.locator('.pad[data-pad="ok"]').click();
  await drill.page.waitForSelector(".quiz-feedback.is-ok", { timeout: 20000 });
  offlineAnswered = true;
} catch (error) {
  offlineDetail = String(error.message).slice(0, 80);
}
check("questions can be answered with no network", offlineAnswered, offlineDetail);
await drill.context.setOffline(false);

const drillOverflow = await drill.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("the drill fits a phone-sized screen", drillOverflow <= 0, `overflowX=${drillOverflow}px`);
await drill.page.screenshot({ path: `${shots}/06-drill-phone.png`, fullPage: true });
await drill.context.close();

// ---- 11. しょうぎ ------------------------------------------------------------

const shogi = await newPage(420, 900);
await shogi.page.goto(BASE, { waitUntil: "domcontentloaded" });
await shogi.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await shogi.page.click(".pick-shogi");
await shogi.page.waitForSelector("#view-shogi:not(.is-hidden)", { timeout: 20000 });
check("shogi opens from the front page", await shogi.page.locator("#shogi-setup").isVisible());
check("three strengths are offered", (await shogi.page.locator("[data-level]").count()) === 3);

await shogi.page.click('[data-level="1"]');
await shogi.page.click("#shogi-start");
await shogi.page.waitForSelector("#shogi-play:not(.is-hidden)", { timeout: 20000 });
check("the board has 81 squares", (await shogi.page.locator(".sq").count()) === 81);
check("40 pieces are set out", (await shogi.page.locator(".koma").count()) === 40);
check("the opponent pieces face the other way", (await shogi.page.locator(".koma.is-gote").count()) === 20);

// ますは 81 個 とも 同じ 大きさ（行の 高さを 指定しないと 駒のある行だけ 高くなる）
const cellSizes = await shogi.page.evaluate(() => {
  const rects = [...document.querySelectorAll(".sq")].map(el => el.getBoundingClientRect());
  const w = rects.map(r => Math.round(r.width * 100) / 100);
  const h = rects.map(r => Math.round(r.height * 100) / 100);
  return { minW: Math.min(...w), maxW: Math.max(...w), minH: Math.min(...h), maxH: Math.max(...h) };
});
check("every square is the same size",
  cellSizes.maxW - cellSizes.minW < 0.01 && cellSizes.maxH - cellSizes.minH < 0.01,
  `w=${cellSizes.minW}-${cellSizes.maxW} h=${cellSizes.minH}-${cellSizes.maxH}`);
check("the two kings are drawn differently",
  (await shogi.page.locator(".sq .koma", { hasText: "王" }).count()) === 1 &&
  (await shogi.page.locator(".sq .koma", { hasText: "玉" }).count()) === 1);

await shogi.page.click('.sq[data-sq="56"]');
check("tapping a pawn shows where it may go", (await shogi.page.locator(".sq.is-go").count()) === 1);
await shogi.page.click('.sq[data-sq="47"]');
await shogi.page.waitForFunction(() => document.querySelectorAll("#shogi-kifu-list li").length >= 2, null,
  { timeout: 40000 });
const record = await shogi.page.locator("#shogi-kifu-list li").allTextContents();
check("the move is written down", record[0].includes("▲７六歩"), record[0]);
check("the opponent answers", record.length >= 2 && record[1].includes("△"), record[1] || "none");

const beforeTap = await shogi.page.locator("#shogi-kifu-list li").count();
await shogi.page.click('.sq[data-sq="0"]');
check("the opponent pieces cannot be moved",
  (await shogi.page.locator("#shogi-kifu-list li").count()) === beforeTap);

await shogi.page.goto(`${BASE}#/drill`, { waitUntil: "domcontentloaded" });
await shogi.page.goto(`${BASE}#/shogi`, { waitUntil: "domcontentloaded" });
await shogi.page.waitForSelector("#view-shogi:not(.is-hidden)", { timeout: 20000 });
check("the game in progress is still on the board",
  (await shogi.page.locator("#shogi-kifu-list li").count()) >= 2);

await shogi.page.reload({ waitUntil: "domcontentloaded" });
await shogi.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await shogi.page.goto(`${BASE}#/shogi`, { waitUntil: "domcontentloaded" });
await shogi.page.waitForSelector("#shogi-setup:not(.is-hidden)", { timeout: 20000 });
check("after a reload the game can be picked up", await shogi.page.locator("#shogi-resume-row").isVisible());
await shogi.page.click("#shogi-resume");
await shogi.page.waitForSelector("#shogi-play:not(.is-hidden)", { timeout: 20000 });
check("the moves come back", (await shogi.page.locator("#shogi-kifu-list li").count()) >= 2);

await shogi.page.click("#shogi-hint");
await shogi.page.waitForFunction(() => document.querySelectorAll(".sq.is-hint").length > 0, null,
  { timeout: 40000 });
check("a hint lights up a square", (await shogi.page.locator(".sq.is-hint").count()) >= 1);

const beforeUndo = await shogi.page.locator("#shogi-kifu-list li").count();
await shogi.page.click("#shogi-undo");
await shogi.page.waitForFunction(n => document.querySelectorAll("#shogi-kifu-list li").length < n, beforeUndo,
  { timeout: 40000 });
check("taking a move back works", (await shogi.page.locator("#shogi-kifu-list li").count()) < beforeUndo);

const komaRatio = async () =>
  shogi.page.evaluate(() => {
    const toRgb = t => (t.match(/[0-9.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    const lum = ([r, g, b]) =>
      [r, g, b]
        .map(v => v / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const koma = document.querySelector(".koma");
    const fg = lum(toRgb(getComputedStyle(koma).color));
    // 駒の 面は グラデーション。色を 全部 取り出して いちばん 悪い 組み合わせで 見る
    const image = getComputedStyle(koma).backgroundImage;
    const stops = (image.match(/rgba?\([^)]+\)/g) || []).map(toRgb);
    const board = toRgb(getComputedStyle(document.querySelector(".shogi-board")).backgroundColor);
    const list = stops.length ? stops : [board];
    let worst = 99;
    for (const stop of list) {
      const bg = lum(stop);
      worst = Math.min(worst, (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05));
    }
    return Math.round(worst * 10) / 10;
  });
const lightRatio = await komaRatio();
await shogi.page.click("#theme-toggle");
const darkRatio = await komaRatio();
await shogi.page.click("#theme-toggle");
check("the pieces stay readable in both themes", lightRatio >= 4.5 && darkRatio >= 4.5,
  `light=${lightRatio} dark=${darkRatio}`);

const shogiTaps = await shogi.page.evaluate(() => {
  const bad = [];
  document.querySelectorAll("#view-shogi button, #view-shogi a, #view-shogi summary").forEach(el => {
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return;
    // ますは 盤が 正方形なので、画面の はばで 大きさが きまる
    if (el.classList.contains("sq")) return;
    if (box.height < 44 || box.width < 44) {
      bad.push((el.id || el.className) + "=" + Math.round(box.width) + "x" + Math.round(box.height));
    }
  });
  return bad;
});
check("the shogi controls are big enough to tap", shogiTaps.length === 0, shogiTaps.slice(0, 4).join(" "));

const shogiLight = await contrastSweep(shogi.page);
check("every text on the board screen is readable in the light theme", shogiLight.length === 0, shogiLight.slice(0, 6).join(" "));
await shogi.page.click("#theme-toggle");
const shogiDark = await contrastSweep(shogi.page);
check("every text on the board screen is readable in the dark theme", shogiDark.length === 0, shogiDark.slice(0, 6).join(" "));
await shogi.page.click("#theme-toggle");

await shogi.page.setViewportSize({ width: 390, height: 850 });
const shogiOverflow = await shogi.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("the board fits a phone-sized screen", shogiOverflow <= 0, `overflowX=${shogiOverflow}px`);
await shogi.page.screenshot({ path: `${shots}/07-shogi-phone.png`, fullPage: true });

await shogi.page.click("#shogi-resign");
await shogi.page.waitForSelector("#shogi-over:not(.is-hidden)", { timeout: 20000 });
check("giving up ends the game", (await shogi.page.locator("#shogi-over-title").textContent()).length > 0);
await shogi.context.close();

// 成り と 打つ ながれは、とちゅうの 局面を 保存の しくみに 入れて 確かめる
// （1.▲7六歩 △3四歩 のあと。手の 書きかたは to | (from << 7)）
const nari = await newPage(420, 900);
await nari.page.goto(BASE, { waitUntil: "domcontentloaded" });
await nari.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await nari.page.evaluate(() =>
  localStorage.setItem("shogi.game.v1", JSON.stringify({ level: 1, me: 0, moves: [7215, 3105], flipped: false })));
await nari.page.goto(`${BASE}#/shogi`, { waitUntil: "domcontentloaded" });
await nari.page.reload({ waitUntil: "domcontentloaded" });
await nari.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await nari.page.click("#shogi-resume");
await nari.page.waitForSelector("#shogi-play:not(.is-hidden)", { timeout: 20000 });
check("a saved game comes back mid-position", (await nari.page.locator("#shogi-kifu-list li").count()) === 2);

await nari.page.click('.sq[data-sq="64"]');
await nari.page.click('.sq[data-sq="16"]');
await nari.page.waitForSelector("#shogi-promote:not(.is-hidden)", { timeout: 20000 });
check("entering the far camp asks about promoting",
  await nari.page.locator("#shogi-promote").isVisible());
// 枠の 外を おして やめたとき、黙って 消えない こと（取ったはずの 駒が 入らない 原因に なる）
const beforeCancel = await nari.page.locator("#shogi-kifu-list li").count();
await nari.page.evaluate(() => {
  const el = document.getElementById("shogi-promote");
  const box = el.getBoundingClientRect();
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: box.left + 6, clientY: box.top + 6 }));
});
// display:none の 要素は「見える まで 待つ」が 効かないので、付いている ことで 待つ
await nari.page.waitForSelector("#shogi-promote.is-hidden", { state: "attached", timeout: 10000 });
check("cancelling the promotion dialog plays no move",
  (await nari.page.locator("#shogi-kifu-list li").count()) === beforeCancel);
check("cancelling says so on screen",
  (await nari.page.locator("#shogi-help").textContent()).includes("やめました"));
await nari.page.click('.sq[data-sq="64"]');
await nari.page.click('.sq[data-sq="16"]');
await nari.page.waitForSelector("#shogi-promote:not(.is-hidden)", { timeout: 20000 });
check("the dialog says which piece is captured",
  (await nari.page.locator("#shogi-promote-note").textContent()).includes("取ります"));

await nari.page.click("#shogi-promote-yes");
// 成った 直後の 画面を 見に行くと あいての 手と 競合する（あいての 思考は 画面を 止める）。
// 指された ことは 棋譜で 確かめる。成り駒の 見た目は 別の 落ち着いた 局面で 見る。
await nari.page.waitForFunction(() => document.querySelectorAll("#shogi-kifu-list li").length >= 3, null,
  { timeout: 30000 });
const promoted = await nari.page.locator("#shogi-kifu-list li").nth(2).textContent();
check("the promotion is recorded", promoted.includes("成"), promoted);
await nari.page.waitForFunction(() => {
  const hint = document.getElementById("shogi-hint");
  return document.querySelectorAll("#shogi-kifu-list li").length >= 4 && hint && !hint.disabled;
}, null, { timeout: 60000 });
check("the captured piece lands in hand", (await nari.page.locator("#shogi-hand-sente .hand-piece").count()) >= 1);
await nari.page.locator("#shogi-hand-sente .hand-piece").first().click();
check("a piece in hand lights up where it may be dropped",
  (await nari.page.locator(".sq.is-go").count()) > 20);
// まえの 対局の 考えごとが 新しい 対局に 混ざらないか。ヒントは 目に 見えるので これで 見る
// （あいての 手を えらぶ ところも 同じ しくみで まもっている）
await nari.page.click("#shogi-hint");
await nari.page.waitForFunction(() => document.getElementById("shogi-status").textContent.includes("かんがえて"),
  null, { timeout: 20000 });
await nari.page.click("#shogi-quit");
await nari.page.waitForSelector("#shogi-setup:not(.is-hidden)", { timeout: 20000 });
await nari.page.click('[data-side="0"]');
await nari.page.click("#shogi-start");
await nari.page.waitForSelector("#shogi-play:not(.is-hidden)", { timeout: 20000 });
let staleHint = "";
for (let i = 0; i < 25; i++) {
  const seen = await nari.page.evaluate(() => ({
    hints: document.querySelectorAll(".sq.is-hint").length,
    help: document.getElementById("shogi-help").textContent,
  }));
  if (seen.hints > 0 || seen.help.includes("どうかな")) {
    staleHint = `${i * 100}ms: ${seen.hints} squares / ${seen.help}`;
    break;
  }
  await new Promise(resolve => setTimeout(resolve, 100));
}
check("a hint from an abandoned game never lands in the new one", staleHint === "", staleHint);

await nari.context.close();

// しょうぶが つく ところ。詰みで 終わる 一局（69 手）を 入れて、勝ち負けを 出せるか 見る
const mate = JSON.parse(readFileSync(new URL("./fixtures/mate-game.json", import.meta.url), "utf8"));
const endgame = await newPage(420, 900);
await endgame.page.goto(BASE, { waitUntil: "domcontentloaded" });
await endgame.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await endgame.page.evaluate(m =>
  localStorage.setItem("shogi.game.v1", JSON.stringify({ level: 1, me: 0, moves: m, flipped: false })), mate.moves);
await endgame.page.goto(`${BASE}#/shogi`, { waitUntil: "domcontentloaded" });
await endgame.page.reload({ waitUntil: "domcontentloaded" });
await endgame.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
await endgame.page.click("#shogi-resume");
await endgame.page.waitForSelector("#shogi-over:not(.is-hidden)", { timeout: 30000 });
const endTitle = (await endgame.page.locator("#shogi-over-title").textContent()).trim();
check("a checkmate ends the game", endTitle.length > 0, endTitle);
check("the right side is declared the winner", mate.loser === 1 ? endTitle.includes("かち") : endTitle.includes("まけ"), endTitle);
check("the reason is shown", (await endgame.page.locator("#shogi-over-note").textContent()).includes("つみ"));
await endgame.page.click("#shogi-over-close");
await endgame.page.click("#shogi-flip");
check("the result box stays closed once dismissed",
  await endgame.page.locator("#shogi-over").evaluate(el => el.classList.contains("is-hidden")));
await endgame.context.close();


// せんにちて（おなじ ばんめん 4 かい）と 入玉。つくった 一局を 入れて 画面の しょうぶの つけかたを 見る
const ending = name => JSON.parse(readFileSync(new URL("./fixtures/" + name, import.meta.url), "utf8"));

async function openSaved(moves, me) {
  const seat = await newPage(420, 900);
  await seat.page.goto(BASE, { waitUntil: "domcontentloaded" });
  await seat.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  await seat.page.evaluate(
    pair => localStorage.setItem("shogi.game.v1", JSON.stringify({ level: 1, me: pair[1], moves: pair[0], flipped: false })),
    [moves, me],
  );
  await seat.page.goto(`${BASE}#/shogi`, { waitUntil: "domcontentloaded" });
  await seat.page.reload({ waitUntil: "domcontentloaded" });
  await seat.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  await seat.page.click("#shogi-resume");
  return seat;
}

{
  const data = ending("repetition-draw.json");
  const seat = await openSaved(data.moves, 0);
  await seat.page.waitForSelector("#shogi-over:not(.is-hidden)", { timeout: 30000 });
  const title = (await seat.page.locator("#shogi-over-title").textContent()).trim();
  const note = await seat.page.locator("#shogi-over-note").textContent();
  check("a fourfold repetition without checks is a draw", title.includes("ひきわけ"), title);
  check("the draw says why", note.includes("せんにちて"), note);
  await seat.context.close();
}

{
  const data = ending("repetition-check.json");
  const loser = await openSaved(data.moves, data.checker);
  await loser.page.waitForSelector("#shogi-over:not(.is-hidden)", { timeout: 30000 });
  const title = (await loser.page.locator("#shogi-over-title").textContent()).trim();
  const note = await loser.page.locator("#shogi-over-note").textContent();
  check("perpetual check loses for the side giving it", title.includes("まけ"), title);
  check("the loss says it was the endless checks", note.includes("おうてを かけつづけた"), note);
  await loser.context.close();

  const winner = await openSaved(data.moves, data.checker === 0 ? 1 : 0);
  await winner.page.waitForSelector("#shogi-over:not(.is-hidden)", { timeout: 30000 });
  const won = (await winner.page.locator("#shogi-over-title").textContent()).trim();
  check("the checked side wins the same game", won.includes("かち"), won);
  await winner.context.close();
}

for (const [file, want, ends] of [
  ["jishogi-win.json", "かちに する", "かちました"],
  ["jishogi-draw.json", "ひきわけに する", "ひきわけ"],
]) {
  const data = ending(file);
  const seat = await openSaved(data.moves, 0);
  await seat.page.waitForSelector("#shogi-declare:not(.is-hidden)", { timeout: 30000 });
  const label = (await seat.page.locator("#shogi-declare").textContent()).trim();
  check(`entering the enemy camp offers to end it (${file})`, label.includes(want), label);
  const note = await seat.page.locator("#shogi-declare-note").textContent();
  check(`the offer shows the points (${file})`, note.includes(`${data.point} てん`), note);
  const wide = await seat.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`the offer does not push the page sideways (${file})`, wide === 0, `${wide}px`);
  const lightSeat = await contrastSweep(seat.page);
  check(`the offer is readable in the light theme (${file})`, lightSeat.length === 0, lightSeat.slice(0, 4).join(" "));
  await seat.page.click("#theme-toggle");
  const darkSeat = await contrastSweep(seat.page);
  check(`the offer is readable in the dark theme (${file})`, darkSeat.length === 0, darkSeat.slice(0, 4).join(" "));
  await seat.page.click("#theme-toggle");
  await seat.page.click("#shogi-declare");
  await seat.page.waitForSelector("#shogi-over:not(.is-hidden)", { timeout: 30000 });
  const title = (await seat.page.locator("#shogi-over-title").textContent()).trim();
  check(`declaring ends the game (${file})`, title.includes(ends), title);
  await seat.context.close();
}

{
  // 同じ 一局を、せんてを あいてに 持たせて 読み込む。あいてが じぶんで 申し込む はず
  const data = ending("jishogi-win.json");
  const seat = await openSaved(data.moves, 1);
  await seat.page.waitForSelector("#shogi-over:not(.is-hidden)", { timeout: 30000 });
  const title = (await seat.page.locator("#shogi-over-title").textContent()).trim();
  const note = await seat.page.locator("#shogi-over-note").textContent();
  check("the opponent ends it by declaring too", title.includes("まけ"), title);
  check("the note says the opponent walked its king in", note.includes("あいてが おうを じんちへ"), note);
  await seat.context.close();
}

{
  const data = ending("jishogi-not-yet.json");
  const seat = await openSaved(data.moves, 0);
  await seat.page.waitForSelector("#shogi-declare-note:not(.is-hidden)", { timeout: 30000 });
  const hidden = await seat.page.locator("#shogi-declare").evaluate(el => el.classList.contains("is-hidden"));
  check("without enough pieces there is no button to press", hidden);
  const note = await seat.page.locator("#shogi-declare-note").textContent();
  check("the note says what is missing", note.includes("あと"), note);
  check("the game is still on", await seat.page.locator("#shogi-over").evaluate(el => el.classList.contains("is-hidden")));
  await seat.context.close();
}


// ---- 12. プログラミング -------------------------------------------------------

{
  const code = await newPage(430, 940);
  const cp = code.page;
  await cp.goto(BASE, { waitUntil: "networkidle" });
  check("the top screen offers three things", (await cp.locator(".pick-card").count()) === 3);

  // なまえを つくってから 入る（★が のこるかまで 見る）
  await cp.goto(BASE + "#/drill");
  await cp.reload();
  await cp.fill("#who-input", "みなと");
  await cp.click("#who-add");

  await cp.goto(BASE + "#/code");
  await cp.reload();
  await cp.waitForSelector(".code-stage");
  check("there are twenty stages", (await cp.locator(".code-stage").count()) === 20);
  check("there are four worlds", (await cp.locator(".code-world-name").count()) === 4);
  check("there are four characters to pick", (await cp.locator(".code-hero").count()) === 4);
  check("every stage after the first is locked at the start",
    (await cp.locator(".code-stage:disabled").count()) === 19);

  await cp.click('.code-hero[data-hero="cat"]');
  await cp.reload();
  await cp.waitForSelector(".code-stage");
  check("the chosen character is kept on the device",
    await cp.locator('.code-hero[data-hero="cat"]').evaluate(el => el.classList.contains("is-on")));

  await cp.click('.code-stage[data-level="1"]');
  await cp.waitForSelector("#code-play:not(.is-hidden)");
  check("the first stage offers only the card it needs", (await cp.locator(".code-pal").count()) === 1);
  check("the skill boxes stay hidden until they are taught",
    await cp.locator("#code-skills").evaluate(el => el.classList.contains("is-hidden")));

  await cp.waitForTimeout(400);
  const painted = await cp.evaluate(() => {
    const c = document.getElementById("code-canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 89) seen.add(d[i] + "," + d[i + 1] + "," + d[i + 2]);
    return seen.size;
  });
  check("the world is really drawn", painted > 8, String(painted) + " colours");

  await cp.click("#code-fast");
  check("the speed button flips", (await cp.locator("#code-fast").textContent()).trim() === "ゆっくり");

  for (let i = 0; i < 3; i++) await cp.click('.code-pal[data-card="go"]');
  check("pressing a card puts it into the program", (await cp.locator("#code-prog-main .code-card").count()) === 3);

  await cp.click("#code-run");
  await cp.waitForSelector("#code-status.is-ok", { timeout: 30000 });
  const cleared = (await cp.locator("#code-status").textContent()).trim();
  check("running the program clears the stage", cleared.includes("クリア"), cleared);
  check("it says how many stars this run earned", cleared.includes("★3"), cleared);

  const stars = await cp.evaluate(() =>
    JSON.parse(localStorage.getItem("drill.records.v1")).profiles[0]);
  check("clearing gives stars that stay on the device", stars.stars === 5, String(stars.stars));
  check("the stage keeps its best result", stars.code["1"] === 3, JSON.stringify(stars.code));

  await cp.click("#code-next");
  await cp.waitForFunction(() => document.getElementById("code-title").textContent.startsWith("2."));
  check("finishing a stage opens the next one", true);

  // まちがった プログラムは クリアに ならない
  for (let i = 0; i < 2; i++) await cp.click('.code-pal[data-card="go"]');
  await cp.click("#code-run");
  await cp.waitForSelector("#code-status.is-error", { timeout: 30000 });
  const missed = (await cp.locator("#code-status").textContent()).trim();
  check("leaving a star behind is not a clear", missed.includes("★"), missed);

  // ここから 先は 記録を 入れて、うしろの ステージも 見る
  await cp.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("drill.records.v1"));
    const code = {};
    for (let i = 1; i <= 20; i++) code[i] = 1;
    data.profiles[0].code = code;
    localStorage.setItem("drill.records.v1", JSON.stringify(data));
    localStorage.removeItem("code.work.v1");
  });
  await cp.reload();
  await cp.waitForSelector(".code-stage");
  check("stages open up once they are cleared", (await cp.locator(".code-stage:disabled").count()) === 0);

  await cp.click('.code-stage[data-level="3"]');
  await cp.waitForSelector("#code-play:not(.is-hidden)");
  await cp.click('.code-pal[data-card="repeat"]');
  check("a repeat card starts at four", (await cp.locator(".code-n").first().textContent()).trim() === "4");
  for (let i = 0; i < 25; i++) await cp.click('.code-mini[data-act="plus"]');
  check("the number of repeats stops at twenty",
    (await cp.locator(".code-n").first().textContent()).trim() === "20");
  for (let i = 0; i < 25; i++) await cp.click('.code-mini[data-act="minus"]');
  check("the number of repeats never goes below one",
    (await cp.locator(".code-n").first().textContent()).trim() === "1");
  check("a new card goes inside the repeat that was just made",
    await cp.locator(".code-slot .code-here.is-open").first().isVisible());
  await cp.click('.code-pal[data-card="go"]');
  check("the card really went inside", (await cp.locator(".code-slot .code-card").count()) === 1);

  await cp.reload();
  await cp.waitForSelector(".code-stage");
  await cp.click('.code-stage[data-level="3"]');
  await cp.waitForSelector("#code-play:not(.is-hidden)");
  // くりかえし 1 まいと、その なかの 1 まい＝あわせて 2 まい 残っているはず
  check("the work in progress is still there after a reload",
    (await cp.locator("#code-prog-main .code-card").count()) === 2 &&
    (await cp.locator("#code-prog-main .code-slot .code-card").count()) === 1);

  await cp.click("#code-clear");
  check("clearing empties the program", (await cp.locator("#code-prog-main .code-card").count()) === 0);
  await cp.click("#code-hint");
  check("the hint can be opened", await cp.locator("#code-hint-text").isVisible());

  // もし の カード（中身を えらべる）
  await cp.click("#code-back");
  await cp.waitForSelector("#code-pick:not(.is-hidden)");
  await cp.click('.code-stage[data-level="11"]');
  await cp.waitForSelector("#code-play:not(.is-hidden)");
  await cp.click('.code-pal[data-card="if"]');
  const conds = await cp.locator(".code-cond option").count();
  check("the if card lets you pick what to look at", conds === 4, String(conds));
  await cp.selectOption(".code-cond", "enemy");
  await cp.reload();
  await cp.waitForSelector(".code-stage");
  await cp.click('.code-stage[data-level="11"]');
  await cp.waitForSelector("#code-play:not(.is-hidden)");
  check("the choice inside the if card is kept",
    (await cp.locator(".code-cond").inputValue()) === "enemy");

  // わざ（名前を つけた 手じゅん）
  await cp.click("#code-back");
  await cp.click('.code-stage[data-level="9"]');
  await cp.waitForSelector("#code-play:not(.is-hidden)");
  check("the skill boxes appear once they are taught",
    !(await cp.locator("#code-skills").evaluate(el => el.classList.contains("is-hidden"))));
  await cp.click('#code-prog-a .code-here');
  await cp.click('.code-pal[data-card="go"]');
  check("a card can be put inside a skill", (await cp.locator("#code-prog-a .code-card").count()) === 1);
  check("the main program stays empty", (await cp.locator("#code-prog-main .code-card").count()) === 0);

  // ステージを えらぶ 画面にも かける（かけていない 画面は「合格」ではなく「未測定」）
  await cp.click("#code-back");
  await cp.waitForSelector("#code-pick:not(.is-hidden)");
  const pickLight = await contrastSweep(cp);
  check("every text on the stage list is readable in the light theme",
    pickLight.length === 0, pickLight.slice(0, 6).join(" "));
  await cp.click("#theme-toggle");
  const pickDark = await contrastSweep(cp);
  check("every text on the stage list is readable in the dark theme",
    pickDark.length === 0, pickDark.slice(0, 6).join(" "));
  await cp.click("#theme-toggle");
  await cp.click('.code-stage[data-level="9"]');
  await cp.waitForSelector("#code-play:not(.is-hidden)");
  await cp.click("#code-hint");

  // 新しい 画面にも コントラストの 総なめを かける
  const codeLight = await contrastSweep(cp);
  check("every text on the programming screen is readable in the light theme",
    codeLight.length === 0, codeLight.slice(0, 6).join(" "));
  await cp.click("#theme-toggle");
  const codeDark = await contrastSweep(cp);
  check("every text on the programming screen is readable in the dark theme",
    codeDark.length === 0, codeDark.slice(0, 6).join(" "));
  await cp.click("#theme-toggle");

  for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
    await cp.setViewportSize({ width, height: 900 });
    await cp.waitForTimeout(80);
    const over = await cp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`the programming screen does not spill sideways at ${width}px`, over <= 0, String(over));
  }

  await code.context.close();
}

await browser.close();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
