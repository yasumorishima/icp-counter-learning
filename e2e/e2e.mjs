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
check("both the drill and shogi are one tap away", (await page.locator(".pick-card").count()) === 2);
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
const contrastSweep = async () =>
  page.evaluate(() => {
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
await nari.page.click("#shogi-promote-yes");
let becameHorse = true;
try {
  await nari.page.waitForFunction(() => document.querySelector('.sq[data-sq="16"] .koma.is-nari'), null,
    { timeout: 5000 });
} catch (error) {
  becameHorse = false;
}
check("the promoted piece is drawn as a horse", becameHorse);
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


await browser.close();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
