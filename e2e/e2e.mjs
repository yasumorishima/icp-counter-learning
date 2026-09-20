/**
 * ローカル replica に載せた本物のサイトを、本物のブラウザで通しで動かす。
 * さんすう（採点・きろく・きょうの1まい・タイムアタック・チャレンジ・ぶんしょうだい・拡大の とめかた）→ しょうぎ（つみ・千日手・入玉）
 * → そら（見まわし・星の名前・出すものの切り替え・時間送り）→ 支援ページ → カウンター。
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

async function newPage(width = 1280, height = 900, extra = {}) {
  // ことばは 端末の 設定に まかせない。検査の たびに はっきり きめる
  //（既定は 日本語。英語の 検査は { lang: "en" } を わたす）
  const { lang = "ja", ...rest } = extra;
  const context = await browser.newContext({ viewport: { width, height }, locale: "en-US", ...rest });
  await context.addInitScript(code => {
    // 種を まくのは まだ 何も 入って いない ときだけ。
    // 毎回 書くと、画面で えらんだ ことばが 読み込み直しで 消える
    try {
      if (!localStorage.getItem("kimaru.lang")) localStorage.setItem("kimaru.lang", code);
    } catch (error) { /* 使えない 端末も ある */ }
  }, lang);
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
check("the drill, the shogi, the sky and the play are each one tap away",
  (await page.locator(".pick-card").count()) === 4);
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
// 🔴 ここに 色を 1 つ 書き写すと、きせつで --bg が 変わった 日に 意味なく 落ちる
//   （2026-09-20 に 実際 落ちた）。見たいのは「明るい ほうで 塗られて いる」ことなので、
//   **body の 塗りが --bg そのもので、明るい 側に あり、暗い ほうは 暗い 側に ある**
//   の 3 つで 見る（[[feedback_derive-invariants-not-memorized-counts]]）。
const paintedBg = await darkPage.evaluate(() => {
  const lum = text => {
    const [r, g, b] = (text.match(/[0-9.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    return [r, g, b]
      .map(v => v / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const root = document.documentElement;
  const read = () => getComputedStyle(document.body).backgroundColor;
  const token = getComputedStyle(root).getPropertyValue("--bg").trim();
  const light = read();
  root.dataset.theme = "dark";
  const dark = read();
  root.dataset.theme = "light";
  return { light, dark, token, lightLum: lum(light), darkLum: lum(dark), season: root.dataset.season };
});
check("the body is painted with the --bg token, not a colour of its own",
  paintedBg.light.replace(/\s/g, "") ===
    (paintedBg.token.length === 7
      ? "rgb(" + [1, 3, 5].map(i => parseInt(paintedBg.token.slice(i, i + 2), 16)).join(",") + ")"
      : paintedBg.token.replace(/\s/g, "")),
  `${paintedBg.light} vs ${paintedBg.token}`);
check("the default page really is painted light",
  paintedBg.lightLum > 0.5 && paintedBg.darkLum < 0.5,
  `${paintedBg.season}: light ${paintedBg.light} lum=${paintedBg.lightLum.toFixed(3)} / dark ${paintedBg.dark} lum=${paintedBg.darkLum.toFixed(3)}`);
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

// ---- リンクを 貼った ときの 画像（OGP）------------------------------------
// 貼り先（LINE / X など）は 一度 取り込むと しばらく やり直せないので、
// タグの 中身も 画像の 実物も ここで 守る。
const og = await page.evaluate(() => {
  const get = (sel) => { const el = document.querySelector(sel); return el ? el.content : ""; };
  return {
    image: get('meta[property="og:image"]'),
    width: get('meta[property="og:image:width"]'),
    height: get('meta[property="og:image:height"]'),
    url: get('meta[property="og:url"]'),
    card: get('meta[name="twitter:card"]'),
    twImage: get('meta[name="twitter:image"]'),
  };
});
check("og:image は 絶対 URL で 指して いる（相対だと 取りに 来られない）",
  /^https:\/\/[^ ]+\/og\.png$/.test(og.image), og.image);
check("og:url が 絶対 URL で 入って いる", /^https:\/\//.test(og.url), og.url);
check("1200x630 と 書いて ある", og.width === "1200" && og.height === "630", `${og.width}x${og.height}`);
check("X でも 大きい 画像で 同じ ものを 指す",
  og.card === "summary_large_image" && og.twImage === og.image, `${og.card} / ${og.twImage}`);

const ogFile = await page.request.get(`${BASE}og.png`);
const ogType = ogFile.headers()["content-type"] || "";
check("og.png が 配られて いる", ogFile.status() === 200 && ogType.includes("image/png"),
  `${ogFile.status()} ${ogType}`);
const ogBytes = (await ogFile.body()).length;
check("og.png が 空でない", ogBytes > 20000, `${ogBytes} bytes`);

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
      // 1 ピクセルの ものは 目には 見えない（読み上げ だけに 渡す .sr-only）。
      // 色の 読みやすさは 目で 見る 文字の 話なので、ここでは 見ない。
      if (box.width <= 1 || box.height <= 1) return;
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

/**
 * 英語の 画面に 日本語が のこって いないかを 総なめする。
 *
 * しょうぎの 盤・持ち駒・すじだん・棋譜は どの ことばでも 漢字の ままに する 決まりなので
 * その 中は 見ない（i18n-shogi.js の 先頭に 同じ ことを 書いて ある）。
 * 文章の 中に 出てくる 棋譜（▲７六歩 など）だけは 見のがす ため、
 * 記譜に つかう 漢字は ゆるす。ひらがな・カタカナは 1 文字でも あれば 出しわすれ。
 */
const japaneseLeftovers = async (target = page) =>
  target.evaluate(() => {
    const SKIP = "#shogi-board, .hand-row, #shogi-kifu-list, .board-files, .board-ranks";
    // 「と金」だけは ひらがなで 書く 駒なので ゆるす（それ以外の かなは 出しわすれ）
    const KEEP = "一二三四五六七八九同打成不歩香桂銀金角飛玉王馬龍杏圭全と";
    const kana = /[\u3040-\u309F\u30A0-\u30FF]/;
    const kanji = /[\u3400-\u9FFF]/;
    const bad = [];
    document.querySelectorAll("body *").forEach(el => {
      if (el.closest(SKIP)) return;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return;
      for (const node of el.childNodes) {
        if (node.nodeType !== 3) continue;
        const text = node.textContent.trim();
        if (!text) continue;
        const hit = [...text].filter(ch =>
          !KEEP.includes(ch) && (kana.test(ch) || kanji.test(ch)));
        if (hit.length) {
          bad.push((el.id || el.className || el.tagName) + ":" + text.slice(0, 24));
        }
      }
    });
    return [...new Set(bad)];
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

// 3 問 つづけて 答える。コンボは 3 問 続けて 正解したときだけ 出るので、
// 出たかどうかは こちらが 何問 正解したかと 突き合わせる。
const answered = [];
for (let i = 0; i < 3; i += 1) {
  const isChoice = (await drill.page.locator(".quiz-choices:not(.is-hidden) .choice").count()) > 0;
  if (isChoice) {
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
  // 採点の 印が 出るまで 待って、正解だったかを 画面から 読む
  await drill.page.waitForSelector("#quiz-feedback.is-ok, #quiz-feedback.is-ng", { timeout: 10000 });
  answered.push(await drill.page.locator("#quiz-feedback").evaluate(el => el.classList.contains("is-ok")));
  // 🔴 次の問題が 出るまで 待つ。アプリの 待ち時間は 正解 260ms・不正解 700ms で、
  // 固定の 400ms で 進むと 前の問題の 画面のまま 分岐してしまい、次が 選択問題だと
  // 消えている 数字パッドの「こたえる」を 押しに行って 30 秒 待たされる（2026-09-08 実測）。
  await drill.page.waitForFunction(
    () => document.getElementById("quiz-feedback").textContent === "",
    null,
    { timeout: 10000 },
  );
}
const comboSeen = await drill.page.evaluate(() => !document.getElementById("quiz-combo").classList.contains("is-hidden"));
check("a combo shows exactly when three in a row are right", comboSeen === answered.every(Boolean),
  "answered=" + answered.join(",") + " combo=" + comboSeen);

await drill.page.click("#quiz-quit");
await drill.page.waitForSelector("#view-drill:not(.is-hidden)", { timeout: 20000 });
check("leaving the time attack stops the clock", await drill.page.locator("#quiz-timer").isHidden());
check("leaving the time attack returns to the drill top", await drill.page.locator("#drill-main").isVisible());

// 時間で 自動的に おわる。60 秒 待たずに 締め切りだけ 短くして、誰も 操作しなくても
// 結果の 画面へ 移ることを 見る（それまで ここは window.__endEarly を 立てるだけで、
// 読む側が どこにも 無く 空回りしていた）。
await drill.page.evaluate(() => { window.__timeAttackMs = 1200; });
await drill.page.click("#time-card");
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
await drill.page.waitForSelector("#view-result:not(.is-hidden)", { timeout: 15000 });
check("the time attack ends by itself when the clock runs out",
  await drill.page.locator("#view-result").isVisible());
await drill.page.evaluate(() => { delete window.__timeAttackMs; });

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
check("a challenge is offered", (await drill.page.locator('[data-challenge="month"]').count()) === 1);
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

// ---- 10b. ぶんしょうだい（計算の となりの もう 1 つの カテゴリー）-----------

await openDrill(drill.page);
check("the drill offers two categories", (await drill.page.locator(".cat-tab").count()) === 2);
check("sums are the category shown first", await drill.page.locator('.cat-tab[data-cat="calc"].is-on').isVisible());

// 6 学年ぶん 文章題が あるか（どの 学年も 空に しない）
await drill.page.locator('.cat-tab[data-cat="word"]').click();
const perGradeWord = [];
for (let g = 1; g <= 6; g += 1) {
  await drill.page.locator(`.grade-tab[data-grade="${g}"]`).click();
  perGradeWord.push(await drill.page.locator(".unit-card").count());
}
check("every grade has word problems", perGradeWord.every(n => n >= 5), perGradeWord.join("/"));

// 計算の 単元は 文章題の 一覧に 出ない（入れちがいが 起きていないか）
await drill.page.locator('.grade-tab[data-grade="1"]').click();
check("the two categories do not mix", (await drill.page.locator('.unit-card[data-unit="g1-add"]').count()) === 0);

await openDrill(drill.page);
check("the chosen category survives a reload", await drill.page.locator('.cat-tab[data-cat="word"].is-on').isVisible());

// ドリルの トップも 明暗を 測る（カテゴリーの タブを ここに 足したため）
const topLight = await contrastSweep(drill.page);
check("every text on the drill top is readable in the light theme", topLight.length === 0, topLight.slice(0, 6).join(" "));
await drill.page.click("#theme-toggle");
const topDark = await contrastSweep(drill.page);
check("every text on the drill top is readable in the dark theme", topDark.length === 0, topDark.slice(0, 6).join(" "));
await drill.page.click("#theme-toggle");

// きまりを みつける 問題（アメリカの 2年生の プリントと 同じ かたち）。
// 答えは 画面の 文から こちらで 解き直す＝生成器の 答えを 写さない
await drill.page.locator('.grade-tab[data-grade="2"]').click();
await drill.page.locator('.unit-card[data-unit="g2w-pattern"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
const wordText = (await drill.page.locator("#quiz-text").textContent()).trim();
check("a word problem is a sentence, not a sum", wordText.length > 30 && wordText.includes("。"), wordText.slice(0, 44));
check("the sentence is laid out for reading", await drill.page.locator("#quiz-text.is-word").isVisible());
const wordStyle = await drill.page.evaluate(() => {
  const style = getComputedStyle(document.getElementById("quiz-text"));
  return { size: parseFloat(style.fontSize), align: style.textAlign };
});
check("the sentence is small enough to fit a phone", wordStyle.size <= 22, wordStyle.size + "px");
check("the sentence starts at the left edge, like a book", wordStyle.align === "left", wordStyle.align);
check("the pattern question is answered by choosing one of four", (await drill.page.locator(".choice").count()) === 4);

// 新しい 見た目を 足したら、その 画面で 明暗を 測る
//（測って いない 画面は「合格」では なく「未測定」）
const wordLight = await contrastSweep(drill.page);
check("every text on a word problem is readable in the light theme", wordLight.length === 0, wordLight.slice(0, 6).join(" "));
await drill.page.click("#theme-toggle");
const wordDark = await contrastSweep(drill.page);
check("every text on a word problem is readable in the dark theme", wordDark.length === 0, wordDark.slice(0, 6).join(" "));
await drill.page.click("#theme-toggle");

for (let i = 0; i < 10; i += 1) {
  const text = (await drill.page.locator("#quiz-text").textContent()).trim();
  const shown = (text.match(/\d+/g) || []).map(Number);
  const want = String(shown[2] + (shown[1] - shown[0]));
  const offered = await drill.page.locator(".choice").allTextContents();
  if (!offered.includes(want)) {
    check("the answer that the rule gives is among the choices", false, want + " not in " + offered.join("/") + "  — " + text);
    break;
  }
  await drill.page.locator(`.choice[data-value="${want}"]`).click();
  if (i < 9) await drill.page.waitForFunction(n => document.getElementById("quiz-count").textContent.startsWith(String(n)), i + 2, { timeout: 30000 });
}
await drill.page.waitForSelector("#view-result:not(.is-hidden)", { timeout: 30000 });
check("following the rule scores every pattern question",
  (await drill.page.locator("#result-score").textContent()).includes("10もん せいかい"));

// 数を 入れる 文章題（おかね）。ここも 文から 読んで 解く
await openDrill(drill.page);
await drill.page.locator('.grade-tab[data-grade="2"]').click();
await drill.page.locator('.unit-card[data-unit="g2w-money"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
check("a money problem is typed on the keypad", await drill.page.locator("#quiz-keypad").isVisible());
for (let i = 0; i < 10; i += 1) {
  const text = (await drill.page.locator("#quiz-text").textContent()).trim();
  const shown = (text.match(/\d+/g) || []).map(Number);
  const value = String(shown[0] - shown[1]);
  for (const digit of value.split("")) await drill.page.locator(`.pad[data-pad="${digit}"]`).click();
  await drill.page.locator('.pad[data-pad="ok"]').click();
  if (i < 9) await drill.page.waitForFunction(n => document.getElementById("quiz-count").textContent.startsWith(String(n)), i + 2, { timeout: 30000 });
}
await drill.page.waitForSelector("#view-result:not(.is-hidden)", { timeout: 30000 });
check("working out the change scores every money question",
  (await drill.page.locator("#result-score").textContent()).includes("10もん せいかい"));

// 文章題も 記録に のこる（計算と 同じ しくみに 乗って いるか）
await openDrill(drill.page);
check("a word unit keeps its score",
  (await drill.page.locator('.unit-card[data-unit="g2w-money"]').textContent()).includes("100点"));
await drill.page.goto(`${BASE}#/kiroku`, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("#view-kiroku:not(.is-hidden)", { timeout: 30000 });
check("the record page names the word unit",
  (await drill.page.locator(".kiroku-table").textContent()).includes("おかねの おはなし"));

// まちがえた ときに「どう とくか」が 出るか。
// 期待する しきは **画面の 文に 出て いる 数**から こちらで 組み立てる
//（生成器の 答えを 写さない）。正解した ときは 出ない ことも 見る。
await openDrill(drill.page);
await drill.page.locator('.cat-tab[data-cat="word"]').click();
await drill.page.locator('.grade-tab[data-grade="2"]').click();
await drill.page.locator('.unit-card[data-unit="g2w-money"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
check("nothing is explained before answering", await drill.page.locator("#quiz-why").isHidden());

const moneyShown = ((await drill.page.locator("#quiz-text").textContent()).match(/\d+/g) || []).map(Number);
await drill.page.locator('.pad[data-pad="1"]').click();
await drill.page.locator('.pad[data-pad="ok"]').click();
await drill.page.waitForSelector("#quiz-feedback.is-ng", { timeout: 20000 });
const whyText = (await drill.page.locator("#quiz-why").textContent()).trim();
check("a wrong answer is told how to work it out", await drill.page.locator("#quiz-why").isVisible(), whyText);
check("the working matches the numbers in the sentence",
  whyText.includes(moneyShown[0] + " − " + moneyShown[1]), whyText);

const whyLight = await contrastSweep(drill.page);
check("the working is readable in the light theme", whyLight.length === 0, whyLight.slice(0, 4).join(" "));
await drill.page.click("#theme-toggle");
const whyDark = await contrastSweep(drill.page);
check("the working is readable in the dark theme", whyDark.length === 0, whyDark.slice(0, 4).join(" "));
await drill.page.click("#theme-toggle");

// 次の 問題を 正しく 答えると、説明は 出ない
await drill.page.waitForFunction(
  () => document.getElementById("quiz-feedback").textContent === "", null, { timeout: 20000 });
const nextShown = ((await drill.page.locator("#quiz-text").textContent()).match(/\d+/g) || []).map(Number);
for (const digit of String(nextShown[0] - nextShown[1]).split("")) {
  await drill.page.locator(`.pad[data-pad="${digit}"]`).click();
}
await drill.page.locator('.pad[data-pad="ok"]').click();
await drill.page.waitForSelector("#quiz-feedback.is-ok", { timeout: 20000 });
check("a right answer is not lectured", await drill.page.locator("#quiz-why").isHidden());
await drill.page.click("#quiz-quit");
await drill.page.waitForSelector("#view-drill:not(.is-hidden)", { timeout: 20000 });

// きまりの 問題は しきでは なく「きまり」を 出す（数字を あてずっぽうで 足す まちがい 対策）
await drill.page.locator('.unit-card[data-unit="g2w-pattern"]').click();
await drill.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
const patternShown = ((await drill.page.locator("#quiz-text").textContent()).match(/\d+/g) || []).map(Number);
// 文に 出る 数は 月・火・水 の 3 つ
const patternStep = patternShown[1] - patternShown[0];
const patternRight = String(patternShown[2] + patternStep);
const wrongChoice = (await drill.page.locator(".choice").allTextContents()).find(value => value !== patternRight);
await drill.page.locator(`.choice[data-value="${wrongChoice}"]`).click();
await drill.page.waitForSelector("#quiz-feedback.is-ng", { timeout: 20000 });
const ruleText = (await drill.page.locator("#quiz-why").textContent()).trim();
check("the pattern question explains the rule, not just the answer",
  ruleText.includes(String(patternStep)) && ruleText.includes(String(patternShown[2])), ruleText);

// 説明を 読んで いる 3.2 秒の あいだに「やめる」を 押しても こわれない
// （まちがえた ときの 間が 長く なった ぶん、ふつうに 起きる）
await drill.page.click("#quiz-quit");
await drill.page.waitForSelector("#view-drill:not(.is-hidden)", { timeout: 20000 });
await drill.page.waitForTimeout(3500);
check("leaving while the working is on screen does not break anything",
  await drill.page.locator("#drill-main").isVisible());

// 計算に もどす（ここから 先の 検査は 計算の 単元を 押す）
await openDrill(drill.page);
await drill.page.locator('.cat-tab[data-cat="calc"]').click();
await drill.page.locator('.grade-tab[data-grade="1"]').click();
check("switching back brings the sums back", (await drill.page.locator('.unit-card[data-unit="g1-add"]').count()) === 1);

// ---- 10c. 指 2 本で 拡大しない（そら 以外）----------------------------------

// 拡大の 止め方は 3 つ かさねて ある。1 つでも 抜けると ある 端末だけ 拡大するので、
// meta・touch-action・gesture/touchmove の うちけし を それぞれ 別に 見る。
const zoomOf = async page => page.evaluate(() => {
  const fire = (name, touches) => {
    const event = touches
      ? new TouchEvent(name, { cancelable: true, bubbles: true, touches })
      : new Event(name, { cancelable: true, bubbles: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const finger = (id, at) => new Touch({ identifier: id, target: document.body, clientX: at, clientY: at });
  const canTouch = typeof Touch === "function" && typeof TouchEvent === "function";
  return {
    flag: document.documentElement.dataset.zoom,
    viewport: document.querySelector('meta[name="viewport"]').getAttribute("content"),
    touch: getComputedStyle(document.body).touchAction,
    gesture: fire("gesturestart"),
    pinch: canTouch ? fire("touchmove", [finger(1, 10), finger(2, 90)]) : "no touch events",
    oneFinger: canTouch ? fire("touchmove", [finger(3, 20)]) : "no touch events",
  };
});

await openDrill(drill.page);
const zoomDrill = await zoomOf(drill.page);
check("the drill screen is held at one size", zoomDrill.flag === "lock", JSON.stringify(zoomDrill));
check("the drill page says it cannot be scaled", zoomDrill.viewport.includes("user-scalable=no"), zoomDrill.viewport);
check("pinching and double tapping cannot zoom the drill", zoomDrill.touch === "pan-x pan-y", zoomDrill.touch);
check("the Safari pinch gesture is turned down on the drill", zoomDrill.gesture === true);
check("two fingers moving is turned down on the drill", zoomDrill.pinch === true, String(zoomDrill.pinch));
check("one finger is left alone, so the page still scrolls", zoomDrill.oneFinger === false, String(zoomDrill.oneFinger));

await drill.page.goto(`${BASE}#/asobi/mogura`, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("#view-asobi:not(.is-hidden)", { timeout: 30000 });
const zoomAsobi = await zoomOf(drill.page);
check("the play screens are held at one size too",
  zoomAsobi.flag === "lock" && zoomAsobi.gesture === true && zoomAsobi.touch === "pan-x pan-y", JSON.stringify(zoomAsobi));

await drill.page.goto(`${BASE}#/sky`, { waitUntil: "domcontentloaded" });
await drill.page.waitForSelector("#view-sky:not(.is-hidden)", { timeout: 30000 });
const zoomSky = await zoomOf(drill.page);
check("the sky can still be zoomed, because the stars are small",
  zoomSky.flag === "free" && !zoomSky.viewport.includes("user-scalable=no"), JSON.stringify(zoomSky));
check("the sky does not turn the pinch gesture down", zoomSky.gesture === false, String(zoomSky.gesture));
check("the sky leaves two fingers alone", zoomSky.pinch === false, String(zoomSky.pinch));


// ---- 10d. なつやすみの 誘い（期間・3 日前・住んで いる ところ）--------------

// 端末の 時計と 時間帯を 動かして 見る。日付の 計算を 検査側で 書き直すと 同じ
// 思いちがいを 2 回 書くことに なるので、**ボタンの 文字に 出て いる 月日**を 読み取り、
// その 前後の 日に 出る / 出ないを 確かめる。
//
// 時刻は UTC で 決める（`Z` つき）。走らせる 機械が JST でも UTC でも、
// 見て いる 端末の 時間帯で 同じ 日付に なる ように 正午あたりを えらぶ。
const NOON_UTC = { "Asia/Tokyo": "03", "America/New_York": "16" };

async function challengeOn(dateKey, lang, zone) {
  const timezoneId = zone || "Asia/Tokyo";
  const fake = await newPage(420, 900, { timezoneId, lang });
  await fake.context.clock.setFixedTime(new Date(`${dateKey}T${NOON_UTC[timezoneId]}:00:00Z`));
  await openDrill(fake.page);
  await fake.page.fill("#who-input", "なつ");
  await fake.page.click("#who-add");
  await fake.page.waitForSelector("#drill-main:not(.is-hidden)", { timeout: 30000 });
  const summer = fake.page.locator('[data-challenge="summer"]');
  const shown = (await summer.count()) === 1;
  const label = shown ? (await summer.textContent()).trim() : "";
  const month = (await fake.page.locator('[data-challenge="month"]').count()) === 1;
  await fake.context.close();
  return { shown, label, month };
}

const pad = value => String(value).padStart(2, "0");
const dayAround = (month, day, back) => {
  const when = new Date(`2026-${pad(month)}-${pad(day)}T12:00:00Z`);
  when.setUTCDate(when.getUTCDate() - back);
  return when.toISOString().slice(0, 10);
};

const inSummer = await challengeOn("2026-08-01", "ja", "Asia/Tokyo");
check("the summer challenge is offered while it can still be done", inSummer.shown, inSummer.label);
check("the 30-day challenge is offered whatever the date is", inSummer.month);
const span = (inSummer.label.match(/\d+/g) || []).map(Number);
check("the button says which days it covers", span.length === 4, inSummer.label);

if (span.length === 4) {
  const [fromMonth, fromDay, toMonth, toDay] = span;
  const threeBefore = await challengeOn(dayAround(fromMonth, fromDay, 3), "ja", "Asia/Tokyo");
  check("the invitation turns up three days before it starts", threeBefore.shown, dayAround(fromMonth, fromDay, 3));
  const fourBefore = await challengeOn(dayAround(fromMonth, fromDay, 4), "ja", "Asia/Tokyo");
  check("it does not turn up any earlier than that", !fourBefore.shown, dayAround(fromMonth, fromDay, 4));
  const lastDay = await challengeOn(dayAround(toMonth, toDay, 0), "ja", "Asia/Tokyo");
  check("it is still there on the last day of the holiday", lastDay.shown, dayAround(toMonth, toDay, 0));
  const dayAfter = await challengeOn(dayAround(toMonth, toDay, -1), "ja", "Asia/Tokyo");
  check("it is gone the day after the holiday ends", !dayAfter.shown, dayAround(toMonth, toDay, -1));
}

// 学校の 休みは 住んで いる ところで 決まる。**ことばでは 決めない**＝
// 日本語の 画面の まま アメリカに 居る 人には、アメリカの 休みが 出る
const juneUs = await challengeOn("2026-06-12", "ja", "America/New_York");
const juneJp = await challengeOn("2026-06-12", "ja", "Asia/Tokyo");
check("a Japanese screen in America gets the American holiday",
  juneUs.shown && !juneJp.shown, "America=" + (juneUs.label || "none") + " / Japan=" + (juneJp.label || "none"));
check("and the button shows the American days, in Japanese",
  juneUs.label.includes("6") && juneUs.label.includes("10") && juneUs.label.includes("なつやすみ"), juneUs.label);
const augustUs = await challengeOn("2026-08-28", "ja", "America/New_York");
check("the American holiday is over before the Japanese one ends", !augustUs.shown, "2026-08-28");

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
// ヒントの 強さ（2）は 5% の 確率で 読まずに すぐ 手を かえす（blunder）。その 回は「かんがえて」が
// 1 フレームも 描かれずに 消えるので、表示を 待ってから やめる 形だと 20 秒 待って 落ちていた。
// 押す・見る・やめるを 1 つの 同期処理で 行えば、手の 続きは await の 先で 動くので
// どちらの 経路でも かならず 考えごとの 途中で やめる ことに なる
const statusWhenQuit = await nari.page.evaluate(() => {
  document.getElementById("shogi-hint").click();
  const text = document.getElementById("shogi-status").textContent;
  document.getElementById("shogi-quit").click();
  return text;
});
check("the hint is still thinking when the game is abandoned", statusWhenQuit.includes("かんがえて"), statusWhenQuit);
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


// ---- 12. そら ---------------------------------------------------------------

{
  // そらは 端末の 時計で 日時を 読む。時間帯を きめないと、走らせる 場所（CI は UTC）で
  // 「21:00」が 横浜の 昼に なり、星の 出ない 空を 見て 落ちる。
  const sky = await newPage(430, 940, { timezoneId: "Asia/Tokyo" });
  const sp = sky.page;
  await sp.goto(BASE, { waitUntil: "networkidle" });
  check("the top screen offers four things", (await sp.locator(".pick-card").count()) === 4);
  check("one of them goes to the sky", (await sp.locator('a[href="#/sky"]').count()) === 1);

  // えらぶ画面にも コントラストの 総なめを かける
  // （新しい カードを 足したら そこにも かける。かけて いない 画面は「未測定」）
  const pickLight = await contrastSweep(sp);
  check("every text on the choosing screen is readable in the light theme",
    pickLight.length === 0, pickLight.slice(0, 6).join(" "));
  await sp.click("#theme-toggle");
  const pickDark = await contrastSweep(sp);
  check("every text on the choosing screen is readable in the dark theme",
    pickDark.length === 0, pickDark.slice(0, 6).join(" "));
  await sp.click("#theme-toggle");

  await sp.goto(BASE + "#/sky");
  await sp.reload();
  await sp.waitForSelector("#sky-canvas");
  await sp.waitForFunction(() => document.getElementById("sky-canvas").dataset.picks !== undefined);

  // 見る 場所と 日時を きめて、どの 回でも おなじ 空に する
  await sp.selectOption("#sky-place", "yokohama");
  await sp.fill("#sky-date", "2026-08-19T21:00");
  await sp.dispatchEvent("#sky-date", "change");
  await sp.click("#sky-reset");
  await sp.waitForTimeout(150);

  check("the sky faces south after resetting",
    (await sp.locator("#sky-canvas").getAttribute("data-az")) === "180.0");
  check("the clock shows the chosen moment",
    (await sp.locator("#sky-when").textContent()).includes("2026年8月19日"),
    await sp.locator("#sky-when").textContent());
  check("it says which way you are facing",
    (await sp.locator("#sky-where").textContent()).includes("南の 空"),
    await sp.locator("#sky-where").textContent());

  const painted = await sp.evaluate(() => {
    const c = document.getElementById("sky-canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add(d[i] + "," + d[i + 1] + "," + d[i + 2]);
    return seen.size;
  });
  check("the sky is really drawn", painted > 40, String(painted) + " colours");

  const picks = Number(await sp.locator("#sky-canvas").getAttribute("data-picks"));
  check("plenty of things can be pressed", picks > 100, String(picks));

  // 指で なぞると 向きが 変わる。
  // ボタンを 押すと ブラウザが そこまで 巻きあげるので、指の 位置を 出す 前に 上へ もどす。
  const canvasBox = async () => {
    await sp.evaluate(() => window.scrollTo(0, 0));
    await sp.waitForTimeout(60);
    return sp.locator("#sky-canvas").boundingBox();
  };
  // 描き直しは 次の 1 枚で 起きる。時間で 待たずに、その 1 枚を 待つ。
  const nextFrame = () => sp.evaluate(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(r))));
  const waitAttr = (name, before) => sp.waitForFunction(
    ([n, b]) => document.getElementById("sky-canvas").dataset[n] !== b, [name, before]);

  let box = await canvasBox();
  await sp.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await sp.mouse.down();
  await sp.mouse.move(box.x + box.width / 2 - 90, box.y + box.height / 2, { steps: 6 });
  await sp.mouse.up();
  await waitAttr("az", "180.0");
  const az2 = Number(await sp.locator("#sky-canvas").getAttribute("data-az"));
  check("dragging turns the view", Math.abs(az2 - 180) > 5, String(az2));

  await sp.click("#sky-reset");
  await waitAttr("az", String(az2.toFixed(1)));

  // ちかづく / はなれる
  const fov0str = await sp.locator("#sky-canvas").getAttribute("data-fov");
  const fov0 = Number(fov0str);
  await sp.click("#sky-in");
  await waitAttr("fov", fov0str);
  const fov1str = await sp.locator("#sky-canvas").getAttribute("data-fov");
  const fov1 = Number(fov1str);
  check("pressing plus moves closer", fov1 < fov0, `${fov0} -> ${fov1}`);
  await sp.click("#sky-out");
  await waitAttr("fov", fov1str);
  const fov2 = Number(await sp.locator("#sky-canvas").getAttribute("data-fov"));
  check("pressing minus moves back", Math.abs(fov2 - fov0) < 0.2, `${fov0} -> ${fov2}`);

  // いちばん 明るい ところを 押すと 名前が 出る
  check("nothing is named before anything is pressed",
    await sp.locator("#sky-tip").evaluate(el => el.classList.contains("is-hidden")));
  box = await canvasBox();
  const spot = await sp.evaluate(() => {
    const c = document.getElementById("sky-canvas");
    const ratio = c.width / c.clientWidth;
    const top = Math.round(70 * ratio), bottom = Math.round(c.clientHeight * 0.70 * ratio);
    const d = c.getContext("2d").getImageData(0, top, c.width, bottom - top).data;
    let best = -1, bx = 0, by = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = d[i] + d[i + 1] + d[i + 2];
      if (lum > best) {
        best = lum;
        const px = (i / 4) % c.width;
        bx = px; by = top + Math.floor((i / 4) / c.width);
      }
    }
    return { x: bx / ratio, y: by / ratio, lum: best };
  });
  await sp.mouse.click(box.x + spot.x, box.y + spot.y);
  await sp.waitForSelector("#sky-tip:not(.is-hidden)", { timeout: 5000 }).catch(() => {});
  check("pressing the brightest thing tells you what it is",
    !(await sp.locator("#sky-tip").evaluate(el => el.classList.contains("is-hidden"))));
  const tipText = (await sp.locator("#sky-tip").textContent()).trim();
  check("the name comes with how high it is", tipText.includes("高さ"), tipText);
  check("the name comes with a number", /[0-9]/.test(tipText), tipText);

  // 目が 見えない 人は 絵を 受け取れない。矢印で 見まわすたびに
  // 「どこを 見ているか」を ことばで 出しているかを 見る（#sky-read は role="status"）。
  const readText = () => sp.locator("#sky-read").textContent();
  check("the sky tells you in words where you are looking",
    (await readText()).includes("の 空"), await readText());
  check("the words say how high you are looking",
    (await readText()).includes("高さ"), await readText());
  check("the words are only for the screen reader",
    await sp.locator("#sky-read").evaluate(el => el.getBoundingClientRect().width <= 1));

  await sp.focus("#sky-canvas");
  const readBefore = await readText();
  const azBeforeKey = await sp.locator("#sky-canvas").getAttribute("data-az");
  await sp.keyboard.press("ArrowLeft");
  await waitAttr("az", azBeforeKey);
  await sp.waitForFunction(
    b => document.getElementById("sky-read").textContent !== b, readBefore);
  // 方角の ことばは 22.5 度ごとなので、矢印 1 回では 変わらない ことが 多い。
  // 度の 数が 動いて いる ことまで 見る（動いた ことが 耳で 分かる 条件）
  const degreesIn = txt => Number((txt.match(/（([0-9]+) 度）/) || [0, -1])[1]);
  const readAfter = await readText();
  check("the arrow key moves the direction the words say",
    degreesIn(readAfter) >= 0 && degreesIn(readAfter) !== degreesIn(readBefore),
    readBefore + " -> " + readAfter);

  // まんなかに 何が あるかは 見る 向きで 変わるので、
  // 「名前の ふきだし」と「ことば」が いつも 同じ ことを 言うかを 見る
  await sp.keyboard.press("Enter");
  await nextFrame();
  const named = !(await sp.locator("#sky-tip")
    .evaluate(el => el.classList.contains("is-hidden")));
  const words = await readText();
  check("pressing enter reads the middle, and the bubble and the words agree",
    named ? /まんなかに ちかいのは/.test(words) : /ありません/.test(words),
    (named ? "named: " : "empty: ") + words);

  const azAfterKeys = await sp.locator("#sky-canvas").getAttribute("data-az");
  await sp.click("#sky-reset");
  await waitAttr("az", azAfterKeys);

  // 出すものの 切り替えが 絵に きいて いる
  const sign = () => sp.evaluate(() => {
    const c = document.getElementById("sky-canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4 * 61) sum += d[i] + d[i + 1] + d[i + 2];
    return sum;
  });
  const withLines = await sign();
  await sp.click("#sky-lines");
  await nextFrame();
  check("turning the constellation lines off is remembered",
    (await sp.locator("#sky-lines").getAttribute("aria-pressed")) === "false");
  const withoutLines = await sign();
  check("turning the lines off really changes the picture", withLines !== withoutLines,
    `${withLines} -> ${withoutLines}`);
  await sp.click("#sky-lines");
  await nextFrame();

  await sp.click("#sky-milky");
  await nextFrame();
  const withoutMilky = await sign();
  check("turning the milky way off really changes the picture", withoutMilky !== withLines,
    String(withoutMilky));
  await sp.click("#sky-milky");
  await nextFrame();

  // 「いま」で 端末の 時計に もどる
  await sp.click("#sky-now");
  await sp.waitForTimeout(200);
  check("the now button comes back to the real clock",
    (await sp.locator("#sky-shift-label").textContent()).trim() === "いま");
  const nowYear = new Date().getFullYear();
  check("the clock shows this year",
    (await sp.locator("#sky-when").textContent()).startsWith(String(nowYear)),
    await sp.locator("#sky-when").textContent());

  // 出典の 表示は 配って いる 実ファイルで 守る（圧縮器の 気まぐれに 頼らない）
  const notice = await sp.evaluate(async () => {
    const r = await fetch("/THIRD-PARTY-NOTICES.txt");
    return { status: r.status, text: await r.text() };
  });
  check("出典の ファイルが 配られて いる", notice.status === 200, String(notice.status));
  check("星表の 出典が 入って いる",
    notice.text.includes("Yale Bright Star Catalogue") && notice.text.includes("Hoffleit"));
  check("星座と 天の川の 表示（BSD 3-Clause 全文）が 入って いる",
    notice.text.includes("Copyright (c) 2015, Olaf Frohn")
    && notice.text.includes("Redistributions in binary form must reproduce")
    && notice.text.includes("THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS"));
  check("画面からも たどれる",
    (await sp.locator('a[href="/THIRD-PARTY-NOTICES.txt"]').count()) === 1);

  // 見た ものは どこにも 送らない。のこるのは 向きと 出すものだけ
  const stored = await sp.evaluate(() => localStorage.getItem("sky.state.v1"));
  check("only the view is kept on the device", stored && !stored.includes("when"), String(stored));

  // 時間を 送る
  await sp.click('#sky-speed .seg-btn[data-sec="3600"]');
  const before = await sp.locator("#sky-when").textContent();
  await sp.waitForTimeout(1200);
  const after = await sp.locator("#sky-when").textContent();
  check("running time forward moves the clock", before !== after, `${before} -> ${after}`);
  await sp.click('#sky-speed .seg-btn[data-sec="0"]');

  // 新しい 画面にも コントラストの 総なめを かける
  const skyLight = await contrastSweep(sp);
  check("every text on the sky screen is readable in the light theme",
    skyLight.length === 0, skyLight.slice(0, 6).join(" "));
  await sp.click("#theme-toggle");
  const skyDark = await contrastSweep(sp);
  check("every text on the sky screen is readable in the dark theme",
    skyDark.length === 0, skyDark.slice(0, 6).join(" "));
  await sp.click("#theme-toggle");

  for (const width of [320, 360, 390, 430, 768, 1024, 1280]) {
    await sp.setViewportSize({ width, height: 900 });
    await sp.evaluate(() => window.scrollTo(0, 0));
    await sp.waitForTimeout(120);
    const over = await sp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`the sky screen does not spill sideways at ${width}px`, over <= 0, String(over));
  }

  await sky.context.close();
}

// ---- 13. あそび（幼児向け）--------------------------------------------------

{
  // 3 さいの 子が さわる ところ。読めなくても 進めることを 数で 確かめる
  const kid = await newPage(390, 860, { timezoneId: "Asia/Tokyo" });
  const kp = kid.page;
  const count = async () => (await kp.locator(".as-count").textContent()).trim();

  await kp.goto(BASE + "#/asobi", { waitUntil: "networkidle" });
  check("the play screen offers six games",
    (await kp.locator(".as-game").count()) === 6, String(await kp.locator(".as-game").count()));

  for (const id of ["mogura", "fuusen", "kotoba", "sakana", "oekaki", "oto"]) {
    await kp.goto(BASE + "#/asobi/" + id, { waitUntil: "domcontentloaded" });
    await kp.waitForSelector(".as-title", { timeout: 20000 });
    const title = (await kp.locator(".as-title").textContent()).trim();
    const back = await kp.locator('.as-back[href="#/asobi"]').count();
    if (!title || back !== 1) check(`${id} opens with a title and a way back`, false, `${title} / ${back}`);
  }
  check("every game opens with a title and a way back", true);

  // もぐら: 出て いる ものを さわった ときだけ 進む（外しても とがめない）
  await kp.goto(BASE + "#/asobi/mogura", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector(".as-mole.is-up", { timeout: 20000 });
  check("a mole comes up by itself", true);
  await kp.locator(".as-mole:not(.is-up)").first().dispatchEvent("pointerdown");
  await kp.waitForTimeout(150);
  check("tapping an empty hole costs nothing", (await count()).startsWith("0"), await count());
  await kp.locator(".as-mole.is-up").first().dispatchEvent("pointerdown");
  await kp.waitForTimeout(200);
  check("tapping a mole counts", (await count()).startsWith("1"), await count());

  // 目が 見えない 人は 読み上げ（TalkBack の 2 回たたき）か キーボードで 押す。
  // どちらも click しか 出さないので、pointerdown だけを 見て いると 何も 起きない。
  // el.click() は detail が 0＝機械が 起こした click＝その 道すじの 再現。
  check("an empty hole says it is a hole",
    (await kp.locator(".as-mole:not(.is-up)").first().getAttribute("aria-label")) === "あな",
    await kp.locator(".as-mole:not(.is-up)").first().getAttribute("aria-label"));
  check("a mole that came up says it is a mole",
    (await kp.locator(".as-mole.is-up").first().getAttribute("aria-label")) === "もぐら",
    await kp.locator(".as-mole.is-up").first().getAttribute("aria-label"));
  await kp.locator(".as-mole.is-up").first().evaluate(el => el.click());
  await kp.waitForTimeout(200);
  check("the screen reader way of pressing counts too", (await count()).startsWith("2"), await count());

  // 指の タップは pointerdown と click の 両方が 出る。二重に 数えて いないか
  await kp.waitForSelector(".as-mole.is-up", { timeout: 20000 });
  const box = await kp.locator(".as-mole.is-up").first().boundingBox();
  await kp.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await kp.waitForTimeout(250);
  check("one tap counts once, not twice", (await count()).startsWith("3"), await count());

  // ふうせん: ひとりでに 上がって いき、さわると 割れる
  await kp.goto(BASE + "#/asobi/fuusen", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector(".as-balloon", { timeout: 20000 });
  const top1 = await kp.locator(".as-balloon").first().evaluate(el => el.getBoundingClientRect().top);
  await kp.waitForTimeout(900);
  const top2 = await kp.locator(".as-balloon").first().evaluate(el => el.getBoundingClientRect().top);
  check("balloons drift upward", top2 < top1 - 4, `${Math.round(top1)} -> ${Math.round(top2)}`);
  await kp.locator(".as-balloon").first().dispatchEvent("pointerdown");
  await kp.waitForTimeout(200);
  check("popping one counts", (await count()).startsWith("1"), await count());

  // 画面を 出たら 止める（もぐらの タイマー・ふうせんの 描画を 置き去りに しない）
  await kp.click(".as-back");
  await kp.waitForTimeout(400);
  check("leaving a game clears it away",
    (await kp.locator(".as-sky").count()) === 0
    && (await kp.locator(".as-sky .as-balloon").count()) === 0
    && (await kp.locator(".as-game").count()) === 6);

  // ことば: 絵と 文字が そろって いて、さわると 数が 進み、絵が 入れ替わる
  await kp.goto(BASE + "#/asobi/kotoba", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector(".as-word", { timeout: 20000 });
  const cards = await kp.locator(".as-word").count();
  const drawn = await kp.locator(".as-word .as-illust svg").count();
  const named = (await kp.locator(".as-word-name").allTextContents()).filter(one => one.trim().length > 0);
  check("every word card has a picture and a word",
    cards === 4 && drawn === 4 && named.length === 4, `${cards} / ${drawn} / ${named.join(",")}`);
  check("the words are all different", new Set(named).size === named.length, named.join(","));
  const firstWord = named[0];
  await kp.locator(".as-word").first().dispatchEvent("pointerdown");
  await kp.waitForTimeout(250);
  check("tapping a word counts", (await count()).startsWith("1"), await count());
  await kp.waitForTimeout(1100);
  const after = await kp.locator(".as-word-name").first().textContent();
  check("the tapped picture is replaced by a new one", after.trim() !== firstWord, `${firstWord} -> ${after}`);
  // ことばも 読み上げ・キーボードの 押しかたで 進む
  await kp.locator(".as-word").first().evaluate(el => el.click());
  await kp.waitForTimeout(250);
  check("the words game answers the screen reader way of pressing too",
    (await count()).startsWith("2"), await count());

  // さかな: はじめから 泳いで いて、時間で 場所が 動き、さわると 減る
  await kp.goto(BASE + "#/asobi/sakana", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector(".as-fish", { timeout: 20000 });
  check("the tank is not empty when it opens", (await kp.locator(".as-fish").count()) >= 3,
    String(await kp.locator(".as-fish").count()));
  // 魚の 見かけの 速さは コマ数で 変わる（frameStep の dt は 1 コマ 0.05 秒で 頭打ちなので、
  // 混んだ 機械で コマが 間引かれると その ぶん 進まない）。決まった 時間で 測ると
  // 泳いで いても 落ちるので、"動くまで 待つ" 形にする。同じ 1 ぴきを 見る。
  const fish = await kp.locator(".as-fish").first().elementHandle();
  const fishX1 = await fish.evaluate(el => el.getBoundingClientRect().left);
  const swam = await kp.waitForFunction(
    ([el, x0]) => el.isConnected && Math.abs(el.getBoundingClientRect().left - x0) > 6,
    [fish, fishX1], { timeout: 15000 }).then(() => true).catch(() => false);
  const fishX2 = await fish.evaluate(el => el.getBoundingClientRect().left).catch(() => fishX1);
  check("the fish swim", swam, `${Math.round(fishX1)} -> ${Math.round(fishX2)}`);
  await kp.locator(".as-fish").first().dispatchEvent("pointerdown");
  await kp.waitForTimeout(250);
  check("scooping one counts", (await count()).startsWith("1"), await count());

  // おえかき: なぞった ところに 色が のこる（何も 描いて いない ときは 白い まま）
  await kp.goto(BASE + "#/asobi/oekaki", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector(".as-canvas", { timeout: 20000 });
  const inked = async () => kp.$eval(".as-canvas", el => {
    const g = el.getContext("2d");
    const data = g.getImageData(0, 0, el.width, el.height).data;
    let on = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) on += 1;
    return on;
  });
  check("the paper starts blank", (await inked()) === 0);
  const pad = await kp.locator(".as-canvas").boundingBox();
  await kp.mouse.move(pad.x + 40, pad.y + 60);
  await kp.mouse.down();
  for (let i = 1; i <= 12; i++) await kp.mouse.move(pad.x + 40 + i * 12, pad.y + 60 + i * 6);
  await kp.mouse.up();
  const painted = await inked();
  check("drawing leaves a line", painted > 500, String(painted));
  await kp.locator(".as-clear").dispatchEvent("pointerdown");
  await kp.waitForTimeout(200);
  check("clearing wipes it", (await inked()) === 0);
  const inks = await kp.locator(".as-ink").count();
  check("there are colours to choose from", inks === 6, String(inks));

  // 色の 番号（#38bdf8）が そのまま 読まれない ように 名前を 付けて ある
  const inkNames = await kp.$$eval(".as-ink", els => els.map(el => el.getAttribute("aria-label")));
  check("the colours are named, not written as codes",
    inkNames.every(n => n && !n.startsWith("#")), inkNames.join(" / "));

  // おと: たたく ところが そろって いて、押すと 見た目が 返る
  await kp.goto(BASE + "#/asobi/oto", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector(".as-key", { timeout: 20000 });
  check("there are six keys", (await kp.locator(".as-key").count()) === 6,
    String(await kp.locator(".as-key").count()));
  await kp.locator(".as-key").first().dispatchEvent("pointerdown");
  check("a key answers when tapped", (await kp.locator(".as-key.is-hit").count()) === 1);
  // おとも 読み上げ・キーボードの 押しかたで 光る（＝鳴る）
  await kp.waitForTimeout(260);
  await kp.locator(".as-key").nth(1).evaluate(el => el.click());
  check("a key answers the screen reader way of pressing too",
    (await kp.locator(".as-key.is-hit").count()) >= 1);
  // 6 枚とも 同じ 名前だと 読み上げでは どれが どれか 分からない
  const keyNames = await kp.$$eval(".as-key", els => els.map(el => el.getAttribute("aria-label")));
  check("each key has its own name", new Set(keyNames).size === 6, keyNames.join(" / "));
  const keyTall = await kp.$$eval(".as-key",
    els => els.map(el => el.getBoundingClientRect().height).filter(h => h < 44).length);
  check("the keys are big enough to hit", keyTall === 0, String(keyTall));

  // ---- 音そのもの。スピーカーの 代わりに OfflineAudioContext へ 出させ、サイトが 組んだ 音を 数える ----
  // 2026-09-02 まで 音を 見て いる 検査は 0 件だった。許容は 2026-09-14 に 実測して 決めた
  //（6 音 522.7〜879.7 Hz・0.2382〜0.2387 秒・ピーク 0.1775〜0.1793、ことばの 音 0.1493 秒・0.1564）
  const AUDIO_TAP = `
    window.__ctxs = [];
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    function Offline() {
      const c = new OAC(1, 44100 * 2, 44100);
      c.resume = () => Promise.resolve();
      window.__ctxs.push(c);
      return c;
    }
    window.AudioContext = Offline;
    window.webkitAudioContext = Offline;
  `;
  // 読み上げの 代わり。どの 声を 持つかを きめ、speak に 渡された 中身を 残す。
  // later: 声は 検査が window.__deliverVoices() を 呼ぶ まで 届かない（時計に たよらない）
  // quiet: 届いても voiceschanged を 出さない（Safari 15 以前と 同じ）
  const fakeSpeech = ({ voices, arriveAfter, later, quiet, none }) => {
    if (none) {
      Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
      return;
    }
    const heard = new Set();
    const waiting = Boolean(arriveAfter || later);
    let list = waiting ? [] : voices.map(lang => ({ lang, name: lang }));
    window.__spoken = [];
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => list,
        addEventListener: (type, fn) => { if (type === "voiceschanged") heard.add(fn); },
        removeEventListener: (type, fn) => { heard.delete(fn); },
        cancel: () => {},
        speak: line => { window.__spoken.push({ text: line.text, lang: line.lang, rate: line.rate }); },
      },
    });
    window.__deliverVoices = () => {
      list = voices.map(lang => ({ lang, name: lang }));
      if (!quiet) heard.forEach(fn => fn(new Event("voiceschanged")));
    };
    if (arriveAfter) setTimeout(window.__deliverVoices, arriveAfter);
  };
  const openWith = async (hash, { lang = "ja", audio = false, speech = null, soundOff = false, width = 390 } = {}) => {
    const one = await newPage(width, 860, { lang, timezoneId: "Asia/Tokyo" });
    if (soundOff) await one.context.addInitScript(() => localStorage.setItem("drill.sound", "off"));
    if (audio) await one.context.addInitScript(AUDIO_TAP);
    if (speech) await one.context.addInitScript(fakeSpeech, speech);
    await one.page.goto(BASE + hash, { waitUntil: "domcontentloaded" });
    await one.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
    return one;
  };
  const rendered = page => page.evaluate(async () => {
    const c = window.__ctxs[0];
    if (!c) return { made: false };
    const d = (await c.startRendering()).getChannelData(0);
    let peak = 0;
    let first = -1;
    let last = -1;
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      if (v > peak) peak = v;
      if (v > 0.005) {
        if (first < 0) first = i;
        last = i;
      }
    }
    let cross = 0;
    for (let i = Math.max(first, 0) + 1; i <= last; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) cross++;
    const seconds = (last - first) / c.sampleRate;
    return { made: true, peak, seconds, hz: seconds > 0.02 ? cross / 2 / seconds : 0 };
  });

  // おとの 6 枚。1 枚ごとに 開き直す（オフラインの 時計は 進まず、続けて 押すと 音が 重なる）
  const SCALE_HZ = [523.25, 587.33, 659.25, 698.46, 783.99, 880];
  const keySounds = [];
  for (let i = 0; i < SCALE_HZ.length; i++) {
    const one = await openWith("#/asobi/oto", { audio: true });
    await one.page.waitForSelector(".as-key", { timeout: 20000 });
    await one.page.locator(".as-key").nth(i).evaluate(el => el.click());
    keySounds.push(await rendered(one.page));
    await one.context.close();
  }
  const keyText = keySounds.map(s => s.made ? `${s.hz.toFixed(1)}Hz ${s.seconds.toFixed(3)}s ${s.peak.toFixed(3)}` : "silent").join(" / ");
  check("each key plays its own note of the scale",
    keySounds.every((s, i) => s.made && Math.abs(s.hz - SCALE_HZ[i]) / SCALE_HZ[i] < 0.01), keyText);
  // 音は 0.5 秒 かけて 消えて いくので、聞こえる 大きさ（0.005 超）で いる のは 約 0.24 秒
  check("each note stays audible for about a quarter of a second",
    keySounds.every(s => s.made && s.seconds > 0.22 && s.seconds < 0.26), keyText);
  check("each note is played at the same gentle volume",
    keySounds.every(s => s.made && s.peak > 0.16 && s.peak < 0.2), keyText);

  // ことば: さわると 音が 鳴り、読み上げには その 絵の ことばを その 国の 声で ゆっくり 頼む
  for (const [lang, voiceLang] of [["ja", "ja-JP"], ["en", "en-US"]]) {
    const one = await openWith("#/asobi/kotoba", { lang, audio: true, speech: { voices: ["ja-JP", "en-US"] } });
    await one.page.waitForSelector(".as-word", { timeout: 20000 });
    const word = (await one.page.locator(".as-word-name").first().textContent()).trim();
    await one.page.locator(".as-word").first().evaluate(el => el.click());
    const sound = await rendered(one.page);
    const spoken = await one.page.evaluate(() => window.__spoken);
    check(`a word makes its sound (${lang})`,
      sound.made && sound.seconds > 0.13 && sound.seconds < 0.17 && sound.peak > 0.14 && sound.peak < 0.17,
      sound.made ? `${sound.seconds.toFixed(3)}s ${sound.peak.toFixed(3)}` : "silent");
    check(`a word asks the voice to read that word slowly (${lang})`,
      spoken.length === 1 && spoken[0].text === word && spoken[0].lang === voiceLang && Math.abs(spoken[0].rate - 0.8) < 0.01,
      `${word} -> ${JSON.stringify(spoken)}`);
    await one.context.close();
  }

  // 音を 切ったら 音の 部品すら 作らない
  {
    const one = await openWith("#/asobi/oto", { audio: true, soundOff: true });
    await one.page.waitForSelector(".as-key", { timeout: 20000 });
    await one.page.locator(".as-key").first().evaluate(el => el.click());
    check("turning sound off keeps the keys silent", !(await rendered(one.page)).made);
    await one.context.close();
  }

  // 声を 持たない 端末では、ことばの 画面に「声が ない」と 一行 出す。声が あれば 出さない。
  // 声の 一覧は あとから 届く 端末が あるので 1.5 秒 待ってから きめ、遅れて 届いたら 消す。
  // 「出て いる」は クラスでは なく、文字が 入って いて 実際に 描かれて いるかで 見る
  const noteState = page => page.evaluate(() => {
    const n = document.querySelector(".as-voice-note");
    if (!n) return "missing";
    const box = n.getBoundingClientRect();
    const drawn = getComputedStyle(n).display !== "none" && box.height > 0;
    return n.textContent.trim().length > 0 && drawn ? "shown" : "hidden";
  });
  const noteIs = (page, want, timeout) => page.waitForFunction(w => {
    const n = document.querySelector(".as-voice-note");
    if (!n) return false;
    const shown = n.textContent.trim().length > 0 && getComputedStyle(n).display !== "none"
      && n.getBoundingClientRect().height > 0;
    return (w === "shown") === shown;
  }, want, { timeout }).then(() => true, () => false);
  const VOICE_CASES = [
    ["no voices on the device", { speech: { voices: [] } }, "shown"],
    ["no speech at all", { speech: { none: true } }, "shown"],
    ["only a voice for another language", { speech: { voices: ["en-US"] } }, "shown"],
    ["a Japanese voice", { speech: { voices: ["ja-JP"] } }, "hidden"],
    ["a Japanese voice written ja_JP", { speech: { voices: ["ja_JP"] } }, "hidden"],
    ["a Japanese voice that arrives before the wait ends", { speech: { voices: ["ja-JP"], arriveAfter: 500 } }, "hidden"],
    ["English screen with only a Japanese voice", { lang: "en", speech: { voices: ["ja-JP"] } }, "shown"],
    ["English screen with an English voice", { lang: "en", speech: { voices: ["en-GB"] } }, "hidden"],
  ];
  for (const [label, opts, want] of VOICE_CASES) {
    const one = await openWith("#/asobi/kotoba", opts);
    await one.page.waitForSelector(".as-word", { timeout: 20000 });
    await one.page.waitForTimeout(2200);
    const state = await noteState(one.page);
    const words = (await one.page.locator(".as-voice-note").textContent()).trim();
    const role = await one.page.locator(".as-voice-note").getAttribute("role");
    const wantText = want === "hidden" ? /^$/ : (opts.lang || "ja") === "en" ? /no English voice/ : /日本語の 声が ない/;
    check(`the no-voice line: ${label}`,
      state === want && role === "status" && wantText.test(words),
      `${state} / ${role} / ${words.slice(0, 24)}`);
    await one.context.close();
  }

  // 待った あとに 声が 届いたら 消える（届ける 時刻は 検査が きめる＝読み込みの 速さに よらない）
  {
    const one = await openWith("#/asobi/kotoba", { speech: { voices: ["ja-JP"], later: true } });
    await one.page.waitForSelector(".as-word", { timeout: 20000 });
    const shownFirst = await noteIs(one.page, "shown", 8000);
    await one.page.evaluate(() => window.__deliverVoices());
    const goneAfter = await noteIs(one.page, "hidden", 3000);
    check("the no-voice line goes away when a voice arrives late", shownFirst && goneAfter,
      `shown first ${shownFirst} / gone after ${goneAfter}`);
    await one.context.close();
  }
  // 声が 届いても 知らせが 来ない 端末（Safari 15 以前）でも、絵を さわれば 見直して 消える
  {
    const one = await openWith("#/asobi/kotoba", { speech: { voices: ["ja-JP"], later: true, quiet: true } });
    await one.page.waitForSelector(".as-word", { timeout: 20000 });
    const shownFirst = await noteIs(one.page, "shown", 8000);
    await one.page.evaluate(() => window.__deliverVoices());
    await one.page.waitForTimeout(400);
    const stillShown = (await noteState(one.page)) === "shown";
    await one.page.locator(".as-word").first().evaluate(el => el.click());
    const goneAfterTap = await noteIs(one.page, "hidden", 3000);
    check("without a voiceschanged event, tapping a word re-checks the voice",
      shownFirst && stillShown && goneAfterTap,
      `shown first ${shownFirst} / still shown before tap ${stillShown} / gone after tap ${goneAfterTap}`);
    await one.context.close();
  }
  // 出て いる 一行も 明暗 どちらでも 読める 色で、せまい 画面で はみ出さない
  {
    const one = await openWith("#/asobi/kotoba", { lang: "en", width: 320, speech: { voices: [] } });
    await one.page.waitForSelector(".as-word", { timeout: 20000 });
    const shown = await noteIs(one.page, "shown", 8000);
    const light = (await contrastSweep(one.page)).filter(item => item.startsWith("as-voice-note"));
    await one.page.click("#theme-toggle");
    await one.page.waitForTimeout(200);
    const dark = (await contrastSweep(one.page)).filter(item => item.startsWith("as-voice-note"));
    const over = await one.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check("the no-voice line is readable in both themes and fits a 320px screen",
      shown && light.length === 0 && dark.length === 0 && over <= 0,
      `shown ${shown} / light ${light.join(",") || "ok"} / dark ${dark.join(",") || "ok"} / over ${over}px`);
    await one.context.close();
  }

  // ---- 文章題を 声で 読んで もらう ----------------------------------------
  // 読むのは 端末の きのうなので、**声を 持たない 端末では ボタンを 出さない**。
  // 声の 代わりに 上の 偽物を 入れて、渡した 中身を そのまま 見る。
  const openWordQuiz = async (one, unit) => {
    await one.page.fill("#who-input", "よむ");
    await one.page.click("#who-add");
    await one.page.waitForSelector("#drill-main:not(.is-hidden)", { timeout: 30000 });
    await one.page.locator('.cat-tab[data-cat="word"]').click();
    await one.page.locator('.grade-tab[data-grade="2"]').click();
    await one.page.locator(`.unit-card[data-unit="${unit}"]`).click();
    await one.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
  };

  {
    const one = await openWith("#/drill", { speech: { voices: ["ja-JP"] } });
    await openWordQuiz(one, "g2w-money");
    check("a word problem can be read out loud", await one.page.locator("#quiz-read").isVisible());
    const sentence = (await one.page.locator("#quiz-text").textContent()).trim();
    await one.page.click("#quiz-read");
    const spoken = await one.page.evaluate(() => window.__spoken);
    check("it asks the device to read the sentence itself",
      spoken.length === 1 && spoken[0].text === sentence, JSON.stringify(spoken).slice(0, 90));
    // 速さは 端末が 単精度に 丸める（0.8 が 0.800000011920929 で もどる）
    check("it asks in the language of the screen, slowly",
      spoken[0] && spoken[0].lang === "ja-JP" && Math.abs(spoken[0].rate - 0.8) < 0.01,
      JSON.stringify(spoken[0] || {}));

    // 新しい ボタンなので、その 画面で 明暗の 色を 測る
    const readLight = await contrastSweep(one.page);
    check("the read button is readable in the light theme", readLight.length === 0, readLight.slice(0, 4).join(" "));
    await one.page.click("#theme-toggle");
    const readDark = await contrastSweep(one.page);
    check("the read button is readable in the dark theme", readDark.length === 0, readDark.slice(0, 4).join(" "));
    await one.page.click("#theme-toggle");

    // 計算の 問題は 読む ものが 式なので 出さない
    await one.page.click("#quiz-quit");
    await one.page.waitForSelector("#view-drill:not(.is-hidden)", { timeout: 20000 });
    await one.page.locator('.cat-tab[data-cat="calc"]').click();
    await one.page.locator('.grade-tab[data-grade="1"]').click();
    await one.page.locator('.unit-card[data-unit="g1-add"]').click();
    await one.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
    check("a sum does not offer to be read out loud", await one.page.locator("#quiz-read").isHidden());
    await one.context.close();
  }

  {
    // 声を 持たない 端末＝押しても 何も 起きない ボタンを 見せない
    const one = await openWith("#/drill", { speech: { none: true } });
    await openWordQuiz(one, "g2w-money");
    check("a device with no voice is not shown a dead button",
      await one.page.locator("#quiz-read").isHidden());
    await one.context.close();
  }

  {
    // 英語の 画面では 英語の 声に たのむ
    const one = await openWith("#/drill", { lang: "en", speech: { voices: ["en-US"] } });
    await one.page.fill("#who-input", "read");
    await one.page.click("#who-add");
    await one.page.waitForSelector("#drill-main:not(.is-hidden)", { timeout: 30000 });
    await one.page.locator('.cat-tab[data-cat="word"]').click();
    await one.page.locator('.grade-tab[data-grade="2"]').click();
    await one.page.locator('.unit-card[data-unit="g2w-money"]').click();
    await one.page.waitForSelector("#view-quiz:not(.is-hidden)", { timeout: 30000 });
    await one.page.click("#quiz-read");
    const spoken = await one.page.evaluate(() => window.__spoken);
    check("the English screen asks an English voice",
      spoken.length === 1 && spoken[0].lang === "en-US", JSON.stringify(spoken).slice(0, 90));
    await one.context.close();
  }

  // 小さい 画面でも はみ出さない・押す ところは 指の 大きさ
  await kp.setViewportSize({ width: 320, height: 760 });
  for (const hash of ["#/asobi", "#/asobi/mogura", "#/asobi/kotoba", "#/asobi/oekaki", "#/asobi/oto"]) {
    await kp.goto(BASE + hash, { waitUntil: "domcontentloaded" });
    await kp.waitForTimeout(300);
    const over = await kp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 0) check(`nothing spills sideways on ${hash}`, false, `${over}px`);
  }
  check("nothing spills sideways on a small screen", true);

  await kp.goto(BASE + "#/asobi", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector(".as-game", { timeout: 20000 });
  const tooSmall = await kp.$$eval(".as-game, .as-back",
    els => els.map(el => el.getBoundingClientRect()).filter(box => box.height < 44).length);
  check("everything you tap is big enough", tooSmall === 0, String(tooSmall));

  // 目が 見えない 人は 名前でしか 見わけられない。さわる ところ 全部に
  // 名前が 付いて いるかを 画面ごとに 総なめする（1 つでも 無ければ そこで 詰む）。
  const NAME_SCREENS = ["#/", "#/drill", "#/kiroku", "#/shogi", "#/sky", "#/asobi",
    "#/asobi/mogura", "#/asobi/fuusen", "#/asobi/kotoba", "#/asobi/sakana",
    "#/asobi/oekaki", "#/asobi/oto", "#/shien"];
  let namedTotal = 0;
  const unnamed = [];
  for (const hash of NAME_SCREENS) {
    await kp.goto(BASE + hash, { waitUntil: "domcontentloaded" });
    await kp.waitForSelector("body[data-ready='1']", { timeout: 30000 });
    await kp.waitForTimeout(400);
    const res = await kp.evaluate(() => {
      const out = { n: 0, bad: [] };
      const sel = 'button, a, input, select, textarea, [tabindex], [role="button"]';
      document.querySelectorAll(sel).forEach(el => {
        const box = el.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) return;
        if (el.closest(".is-hidden, [hidden]")) return;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;
        out.n += 1;
        const named = (el.getAttribute("aria-label") || "").trim()
          || (el.getAttribute("title") || "").trim()
          || (el.textContent || "").trim()
          || (el.labels && el.labels.length ? el.labels[0].textContent.trim() : "");
        if (!named) out.bad.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : ""));
      });
      return out;
    });
    namedTotal += res.n;
    if (res.bad.length) unnamed.push(hash + ": " + [...new Set(res.bad)].join(", "));
  }
  check("everything you can touch has a name a screen reader can read",
    unnamed.length === 0, unnamed.join(" / ") || `${namedTotal} 個`);

  // 使いかたが 画面に 書いて ある（読み上げの 人が 最初の 画面で 見つけられる）
  await kp.goto(BASE + "#/", { waitUntil: "domcontentloaded" });
  await kp.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  check("the top screen says how to use it without sight",
    (await kp.locator(".pick-help").count()) === 1);
  const helpText = await kp.locator(".pick-help").textContent();
  check("the help names the keys", /矢印|エンター/.test(helpText), helpText.slice(0, 60));
  // 読み上げを どこから 始めるのかが 書いて ある（サイトが 喋る わけでは ない）
  check("the help says where the reading aloud comes from",
    /TalkBack/.test(helpText) && /VoiceOver/.test(helpText), helpText.slice(0, 80));
  // 4つ ぜんぶに ふれて いる（さんすうだけ 抜けて いた）
  check("the help covers all four things",
    ["さんすう", "しょうぎ", "そら", "あそび"].every(w => helpText.includes(w)));

  await kid.context.close();
}

// ---- 14. ことば ------------------------------------------------------------

{
  const en = await newPage(430, 940, { lang: "en", timezoneId: "Asia/Tokyo" });
  const ep = en.page;

  // 画面ごとに 日本語の のこりを 総なめする（出しわすれは ここで 落ちる）
  for (const [name, hash] of [["choosing", "#/"], ["drill", "#/drill"], ["records", "#/kiroku"],
    ["shogi", "#/shogi"], ["sky", "#/sky"], ["play", "#/asobi"], ["moles", "#/asobi/mogura"],
    ["words", "#/asobi/kotoba"], ["drawing", "#/asobi/oekaki"], ["support", "#/support"]]) {
    await ep.goto(BASE + hash, { waitUntil: "domcontentloaded" });
    await ep.reload({ waitUntil: "domcontentloaded" });
    await ep.waitForSelector("body[data-ready='1']", { timeout: 30000 });
    await ep.waitForTimeout(200);
    const left = await japaneseLeftovers(ep);
    check(`nothing is left in Japanese on the ${name} screen in English`,
      left.length === 0, left.slice(0, 6).join(" | "));
  }

  // しょうぎは 対局を 始めて からが 本番（盤の まわりの 文言）
  await ep.goto(BASE + "#/shogi", { waitUntil: "domcontentloaded" });
  await ep.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  await ep.click("#shogi-start");
  await ep.waitForSelector("#shogi-play:not(.is-hidden)", { timeout: 15000 });
  await ep.waitForTimeout(300);
  const playing = await japaneseLeftovers(ep);
  check("nothing is left in Japanese once a game is on",
    playing.length === 0, playing.slice(0, 6).join(" | "));

  // ことばを 変えると その場で 書き直る
  await ep.goto(BASE + "#/sky", { waitUntil: "domcontentloaded" });
  await ep.waitForSelector("#sky-canvas");
  await ep.selectOption("#sky-place", "yokohama");
  await ep.fill("#sky-date", "2026-08-19T21:00");
  await ep.dispatchEvent("#sky-date", "change");
  await ep.click("#sky-reset");
  await ep.waitForTimeout(200);
  const whenEn = (await ep.locator("#sky-when").textContent()).trim();
  const whereEn = (await ep.locator("#sky-where").textContent()).trim();
  check("the clock reads in English", /2026-08-19/.test(whenEn) && !/[\u3040-\u30FF]/.test(whenEn), whenEn);
  check("the way you are facing reads in English",
    whereEn === "Yokohama · looking S", whereEn);

  // 星の 名前も 英語（同梱データは 日本語名しか 持って いないので、対応表が きいて いるか）
  await ep.evaluate(() => window.scrollTo(0, 0));
  await ep.waitForTimeout(60);
  const skyBox = await ep.locator("#sky-canvas").boundingBox();
  const spotEn = await ep.evaluate(() => {
    const c = document.getElementById("sky-canvas");
    const ratio = c.width / c.clientWidth;
    const top = Math.round(70 * ratio), bottom = Math.round(c.clientHeight * 0.70 * ratio);
    const d = c.getContext("2d").getImageData(0, top, c.width, bottom - top).data;
    let best = -1, bx = 0, by = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = d[i] + d[i + 1] + d[i + 2];
      if (lum > best) { best = lum; bx = (i / 4) % c.width; by = top + Math.floor((i / 4) / c.width); }
    }
    return { x: bx / ratio, y: by / ratio };
  });
  await ep.mouse.click(skyBox.x + spotEn.x, skyBox.y + spotEn.y);
  await ep.waitForSelector("#sky-tip:not(.is-hidden)", { timeout: 5000 }).catch(() => {});
  const tipEn = (await ep.locator("#sky-tip").textContent()).trim();
  // 最輝点は 星とは かぎらない（月や 惑星の ことも ある）ので、
  // 「英語で 名前と 数が 出る」ところまでを 見る
  check("what you press is named in English",
    /[A-Za-z]{3}/.test(tipEn) && /[0-9]/.test(tipEn)
    && !/[\u3040-\u30FF]/.test(tipEn), tipEn);

  // 日本語へ 切り替えると その場で 書き直り、読み込み直しても のこる
  await ep.selectOption("#lang-select", "ja");
  await ep.waitForFunction(() => document.documentElement.lang === "ja", null, { timeout: 5000 });
  await ep.waitForTimeout(200);
  const whereJa = (await ep.locator("#sky-where").textContent()).trim();
  check("switching to Japanese rewrites the screen at once", whereJa.includes("南"), whereJa);
  // ことばを 変えただけで、えらんだ 日時が「いま」へ 戻っては いけない
  const whenJa = (await ep.locator("#sky-when").textContent()).trim();
  check("the moment you picked survives a language change",
    whenJa.includes("2026年8月19日"), whenJa);
  check("the star name follows the language", await ep.evaluate(() => {
    const tip = document.getElementById("sky-tip");
    return tip.classList.contains("is-hidden") || /[\u3040-\u30FF]/.test(tip.textContent);
  }));

  await ep.reload({ waitUntil: "domcontentloaded" });
  await ep.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  check("the chosen language survives a reload",
    (await ep.evaluate(() => document.documentElement.lang)) === "ja");
  check("the language box shows the chosen one",
    (await ep.locator("#lang-select").inputValue()) === "ja");

  // ことばは 2 つ、どの 画面からでも 選べる
  check("both languages are offered", (await ep.locator("#lang-select option").count()) === 2);
  for (const hash of ["#/", "#/drill", "#/kiroku", "#/shogi", "#/sky", "#/asobi", "#/support"]) {
    await ep.goto(BASE + hash, { waitUntil: "domcontentloaded" });
    await ep.waitForSelector("body[data-ready='1']", { timeout: 30000 });
    if (!(await ep.locator("#lang-select").isVisible())) {
      check(`the language box is on ${hash}`, false);
    }
  }
  check("the language box is on every screen", true);

  await en.context.close();
}

// ---- トップが スマホの 1 画面に 入るか（2026-09-20） ----------------------
//
// 🔴 実測で 見つけた 穴＝**スマホでは「あそび」が どの 機種でも 1 画面目に
//    1 ピクセルも 出て いなかった**（360x640 / 390x844 / 412x915 とも
//    上から 1092〜1106px ＝ 2 回 スクロールしないと 届かない）。
//    このサイトで **文字が 読めない 子が 使えるのは「あそび」だけ**なので、
//    唯一の 入り口が 3 さいには できない 操作の 向こうに あった。

async function topOn(width, height) {
  const one = await newPage(width, height);
  await one.page.goto(BASE, { waitUntil: "domcontentloaded" });
  await one.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  const got = await one.page.evaluate(vh => {
    const cards = [...document.querySelectorAll(".pick-card")];
    const rows = new Map();
    cards.forEach(c => {
      const top = Math.round(c.getBoundingClientRect().top);
      const go = c.querySelector(".pick-go").getBoundingClientRect();
      (rows.get(top) || rows.set(top, []).get(top)).push(Math.round(go.top));
    });
    return {
      枚数: cards.length,
      列: new Set(cards.map(c => Math.round(c.getBoundingClientRect().left))).size,
      // 1 画面目に どれだけ 見えて いるか（いちばん 下の カードで 見る）
      見え: cards.map(c => {
        const r = c.getBoundingClientRect();
        return Math.round(Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height * 100);
      }),
      // となりの カードと ボタンの 高さが そろって いるか
      ずれ: Math.max(...[...rows.values()].map(v => Math.max(...v) - Math.min(...v))),
      ボタン最小: Math.min(...cards.map(c => Math.round(c.querySelector(".pick-go").getBoundingClientRect().height))),
      あふれ: document.documentElement.scrollWidth - window.innerWidth,
    };
  }, height);
  await one.context.close();
  return got;
}

const phone = await topOn(390, 844);
check("all four things to do fit on one phone screen",
  phone.枚数 === 4 && phone.見え.every(v => v === 100), phone.見え.join("/") + "%");
check("the four cards are laid out two by two",
  phone.列 === 2, `${phone.列} 列`);
check("the buttons line up with the one next to them",
  phone.ずれ === 0, `${phone.ずれ}px`);
check("even on a phone every button is big enough to tap",
  phone.ボタン最小 >= 44, `${phone.ボタン最小}px`);

// 広い 画面でも 同じ 並びで、ボタンは そろう
const wide = await topOn(1280, 900);
check("the same two-by-two layout is used on a big screen",
  wide.列 === 2 && wide.ずれ === 0, `${wide.列} 列 / ずれ ${wide.ずれ}px`);

// せまい 端末でも 横へ こぼれない（この サイトが 前から 見て いる 320px）
const tiny = await topOn(320, 568);
check("nothing spills sideways on the smallest phone",
  tiny.あふれ === 0 && phone.あふれ === 0 && wide.あふれ === 0,
  `320=${tiny.あふれ}px 390=${phone.あふれ}px 1280=${wide.あふれ}px`);

// ---- ドリルの トップは 単元が 先（2026-09-20） ---------------------------
//
// user「きょうの 1まい / タイムアタック / チャレンジ … これらは、以下より 下の 方が
// よくない？ メインは 以下なんだから」。
// 🔴 実測＝この 3 枚が 上に あると 390x844 で **単元の 一覧が 上から 889px**＝
//    1 画面目に 1 つも 出なかった（3 枚で 381px）。⇒ 単元の あとへ 移した。

{
  const drillTop = await newPage(390, 844);
  await drillTop.page.goto(`${BASE}#/drill`, { waitUntil: "domcontentloaded" });
  await drillTop.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  await drillTop.page.fill("#who-input", "ゆうた");
  await drillTop.page.click("#who-add");
  await drillTop.page.waitForSelector("#drill-main:not(.is-hidden)", { timeout: 30000 });
  // 名前を 足すと 画面が 動く ことが ある。1 画面目を 見たいので 上へ 戻す
  await drillTop.page.evaluate(() => window.scrollTo(0, 0));
  const where = await drillTop.page.evaluate(() => {
    const at = id => {
      const el = document.getElementById(id);
      return el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : -1;
    };
    const names = [...document.querySelectorAll(".unit-name")];
    return {
      単元: at("unit-grid"),
      きょう: at("daily-card"),
      タイム: at("time-card"),
      画面: window.innerHeight,
      はみ出し: names.filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent.trim()),
      横あふれ: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  check("the list of things to practise comes before the extras",
    where.単元 < where.きょう && where.単元 < where.タイム,
    `単元 ${where.単元} / きょう ${where.きょう} / タイム ${where.タイム}`);
  check("the list of things to practise starts on the first screen",
    where.単元 < where.画面, `${where.単元}px < ${where.画面}px`);
  check("no unit name spills out of its card",
    where.はみ出し.length === 0 && where.横あふれ === 0,
    where.はみ出し.slice(0, 2).join(" / ") + ` 横 ${where.横あふれ}px`);
  await drillTop.context.close();
}

// ---- きせつ（2026-09-20） --------------------------------------------------
//
// user 指示「背景をシーズンごとに変える／もっとテンション上がるように／
// アニメーション加えるとか、子供が喜ぶつくりに」。
//
// 🔴 きせつは 端末の 時計の 月だけで 決まるので、検査は `clock.setFixedTime` で
//    4 つの 日に 置いて 見る。見るのは **4 つが たがいに ちがう** ことと
//    **色と 絵が 入れ替わる** こと（なつやすみの 検査と 同じ 流儀）。

const SEASON_DAYS = [
  ["2026-04-10", "spring"],
  ["2026-07-20", "summer"],
  ["2026-10-15", "autumn"],
  ["2026-01-20", "winter"],
];

async function seasonOn(dateKey, theme) {
  const fake = await newPage(420, 900, { timezoneId: "Asia/Tokyo" });
  await fake.context.clock.setFixedTime(new Date(`${dateKey}T03:00:00Z`));
  if (theme === "dark") {
    await fake.context.addInitScript(() => {
      try { localStorage.setItem("kimaru.theme", "dark"); } catch (error) { /* 使えない 端末も ある */ }
    });
  }
  await fake.page.goto(BASE, { waitUntil: "domcontentloaded" });
  await fake.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  const got = await fake.page.evaluate(() => {
    const root = document.documentElement;
    const float = document.getElementById("season-float");
    const scene = document.getElementById("season-scene");
    const bits = [...float.querySelectorAll(".sn-bit")];
    const sun = scene.querySelector(".sn-day");
    const moon = scene.querySelector(".sn-night");
    return {
      season: root.dataset.season,
      bg: getComputedStyle(root).getPropertyValue("--bg").trim(),
      themeColor: document.querySelector('meta[name="theme-color"]').content.trim(),
      bits: bits.length,
      // 並びは 番号から 決まる（乱数を 使わない）ので、開きなおしても 同じに なる
      layout: bits.map(b => b.getAttribute("style")).join("|"),
      art: bits.length ? bits[0].innerHTML : "",
      rise: float.dataset.rise,
      scene: scene.innerHTML,
      sceneSvgs: scene.querySelectorAll("svg").length,
      sunShown: sun ? getComputedStyle(sun).display : "missing",
      moonShown: moon ? getComputedStyle(moon).display : "missing",
      floatAria: float.getAttribute("aria-hidden"),
      sceneAria: scene.getAttribute("aria-hidden"),
      // 点々の 色は 明暗で 決め直して いる（明るい ほうが 夜でも 勝つ 事故を 防ぐ）
      dots: getComputedStyle(root).getPropertyValue("--dots").trim(),
      // 舞うものは かならず 本文の 後ろ
      floatZ: getComputedStyle(float).zIndex,
      // 🔴 ページの 横あふれでは 見ない＝`position: fixed` の 層の あふれは
      //   スクロール量に ならないので、overflow を visible に しても 数字が 動かない
      //   （2026-09-20 に 変異で 実測＝落ちない assert だった）。
      // 🔴🔴 実際の ますぶんを `getBoundingClientRect()` で 測るのも だめ＝
      //   `.sn-art` は 横に ゆれて いる ので、**測る 瞬間で 値が 変わる**。
      //   手元では 左ふち −0.1 だったのに CI では −2 に なって 落ちた（2026-09-20）。
      //   → [[project_kimaru]]「アニメーションを 固定時間で 測る 検査は 書かない」
      //   ⇒ 見るのは **置き場所そのもの**（`left` の %）。ゆれは その まわりの 演出で、
      //     置き場所の 式が 壊れたら（画面の 外に 置いたら）これが 落ちる
      ...(() => {
        const at = [...float.querySelectorAll(".sn-bit")]
          .map(el => parseFloat(el.style.left))
          .filter(v => Number.isFinite(v));
        return {
          onScreen: at.length > 0 && at.every(v => v >= 0 && v <= 100),
          leftMost: at.length ? Math.min(...at).toFixed(1) : "-",
          rightMost: at.length ? Math.max(...at).toFixed(1) : "-",
        };
      })(),
      // 文字が 地に 沈んで いないか（きせつ x 明暗 の 8 通りで 見る）
      readable: (() => {
        const lum = text => {
          const [r, g, b] = (text.match(/[0-9.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
          return [r, g, b]
            .map(v => v / 255)
            .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        };
        const body = getComputedStyle(document.body);
        const a = lum(body.backgroundColor);
        const b = lum(body.color);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      })(),
    };
  });
  await fake.context.close();
  return got;
}

const seasons = [];
for (const [day, name] of SEASON_DAYS) seasons.push({ name, ...(await seasonOn(day, "light")) });

check("each season the clock lands in gets its own name",
  new Set(seasons.map(s => s.season)).size === 4, seasons.map(s => s.season).join(" "));
check("the month decides which season it is",
  seasons.every(s => s.season === s.name), seasons.map(s => `${s.name}->${s.season}`).join(" "));
check("the background colour changes with the season",
  new Set(seasons.map(s => s.bg)).size === 4, seasons.map(s => s.bg).join(" "));
check("the browser bar is told the same colour the page uses",
  seasons.every(s => s.themeColor === s.bg), seasons.map(s => `${s.themeColor}/${s.bg}`).join(" "));
check("something is floating about in every season",
  seasons.every(s => s.bits >= 10), seasons.map(s => s.bits).join(" "));
check("what floats about is drawn differently each season",
  new Set(seasons.map(s => s.art)).size === 4);
const summerOnly = seasons.find(s => s.season === "summer");
check("the bubbles of summer go up while everything else comes down",
  seasons.filter(s => s.rise === "1").length === 1 && summerOnly?.rise === "1",
  seasons.map(s => `${s.season}=${s.rise}`).join(" "));
check("the top of the page shows a different scene each season",
  new Set(seasons.map(s => s.scene)).size === 4 && seasons.every(s => s.sceneSvgs === 1));
check("the seasonal picture is not read out as if it were words",
  seasons.every(s => s.floatAria === "true" && s.sceneAria === "true"));
check("what floats about always stays behind the words",
  seasons.every(s => Number(s.floatZ) < 0), seasons.map(s => `${s.season}=${s.floatZ}`).join(" "));
check("every floating thing is placed somewhere on the screen",
  seasons.every(s => s.onScreen), seasons.map(s => `${s.season}=${s.leftMost}%..${s.rightMost}%`).join(" "));
check("by day the sun is out and the moon is away",
  seasons.every(s => s.sunShown === "block" && s.moonShown === "none"),
  seasons.map(s => `${s.season}:${s.sunShown}/${s.moonShown}`).join(" "));

// 🔴 夜は はる だけ 見て いた（2026-09-20 の 監査で 判明）。
//   きせつの 色は 明るい ほうと 夜で **同じ 強さ**なので、夜の ぶんを 1 行 落とすと
//   明るい ほうの 値が 夜に 勝つ（実際 --dots が そう なって いた）。4 つとも 開く。
const nights = [];
for (const [day] of SEASON_DAYS) nights.push(await seasonOn(day, "dark"));

check("at night the moon comes out instead of the sun",
  nights.every(n => n.sunShown === "none" && n.moonShown === "block"),
  nights.map(n => `${n.season}:${n.sunShown}/${n.moonShown}`).join(" "));
check("every season has its own dark colour, not the light one",
  nights.every((n, i) => n.bg !== seasons[i].bg) && new Set(nights.map(n => n.bg)).size === 4,
  nights.map((n, i) => `${n.season} ${seasons[i].bg}->${n.bg}`).join(" "));
check("the browser bar follows the season at night too",
  nights.every(n => n.themeColor === n.bg), nights.map(n => `${n.themeColor}/${n.bg}`).join(" "));
// 🔴 値を くらべても 落ちない（夜の 指定を 消すと 明るい ほうが 勝って **同じ 値**に なる）。
//   見たいのは「決めて 書いて ある」ことなので、CSSOM で 宣言そのものを 読む。
//   2026-09-20 に この 形に した＝変異（夜の --dots を 1 行 消す）で 赤に なることを 確かめた。
const darkRules = await (async () => {
  const one = await newPage(420, 900);
  await one.page.goto(BASE, { waitUntil: "domcontentloaded" });
  await one.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  const got = await one.page.evaluate(() => {
    const seen = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (error) { continue; }
      for (const rule of rules) {
        const sel = rule.selectorText || "";
        // 1 つの きせつだけを 指す 夜の 規則（--blob-opacity の 並べ書きは 除く）
        if (!/^:root\[data-theme="dark"\]\[data-season="\w+"\]$/.test(sel.trim())) continue;
        if (!rule.style.getPropertyValue("--bg").trim()) continue;
        seen.push({ sel: sel.trim(), dots: rule.style.getPropertyValue("--dots").trim() });
      }
    }
    return seen;
  });
  await one.context.close();
  return got;
})();
check("every dark season decides its own dots instead of inheriting the light ones",
  darkRules.length === 4 && darkRules.every(r => r.dots.length > 0),
  darkRules.map(r => `${r.sel.replace(/:root|\[data-theme="dark"\]/g, "")}=${r.dots || "(なし)"}`).join(" "));
check("the dots differ from season to season",
  new Set(seasons.map(s => s.dots)).size === 4, seasons.map(s => s.dots).join(" "));
check("the words stay readable in every season, light and dark",
  [...seasons, ...nights].every(s => s.readable >= 4.5),
  [...seasons, ...nights].map(s => s.readable.toFixed(1)).join(" "));

// 同じ きせつを 開きなおしても 並びが 変わらない＝見た目の 検査が ぶれない
const springAgain = await seasonOn("2026-04-10", "light");
check("opening the same season again lays it out the same way",
  springAgain.layout === seasons[0].layout && springAgain.layout.length > 0);

// カードに ふれた ときの 拡大。
// 🔴 1 回 ふれて 大きさを 測る 形では 歯が 無い＝`animation-play-state: paused` でも
//   位相に よっては 1.10 近くが 出る（2026-09-20 実測 1.0032〜1.0998・12 回）。
//   ゆらがない 形＝**ふれて いる あいだ 動きが 名前ごと 外れて いる**かで 見る。
{
  const hover = await newPage(1280, 900);
  await hover.page.goto(BASE, { waitUntil: "domcontentloaded" });
  await hover.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  const idle = await hover.page.locator(".pick-drill .pick-face")
    .evaluate(el => getComputedStyle(el).animationName);
  await hover.page.locator(".pick-drill").hover();
  await hover.page.waitForTimeout(400);
  const held = await hover.page.locator(".pick-drill .pick-face").evaluate(el => ({
    name: getComputedStyle(el).animationName,
    scale: Number((getComputedStyle(el).transform.match(/[-0-9.]+/g) || [0])[0]),
  }));
  check("the cards bob on their own", idle === "sn-bob", idle);
  check("touching a card gives the same nudge every time, not whatever the bobbing was doing",
    held.name === "none" && Math.abs(held.scale - 1.1) < 0.001, `${held.name} scale=${held.scale}`);
  await hover.context.close();
}

// 動きを 減らす 設定の 端末では 舞わせない（色だけ きせつの まま）
{
  const calm = await newPage(420, 900, { reducedMotion: "reduce", timezoneId: "Asia/Tokyo" });
  await calm.context.clock.setFixedTime(new Date("2026-01-20T03:00:00Z"));
  await calm.page.goto(BASE, { waitUntil: "domcontentloaded" });
  await calm.page.waitForSelector("body[data-ready='1']", { timeout: 30000 });
  const quiet = await calm.page.evaluate(() => ({
    float: getComputedStyle(document.getElementById("season-float")).display,
    breathe: getComputedStyle(document.querySelector(".sn-breathe")).animationName,
    face: getComputedStyle(document.querySelector(".pick-face")).animationName,
    season: document.documentElement.dataset.season,
    bg: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
  }));
  check("nothing flies about when the device asks for less movement",
    quiet.float === "none", quiet.float);
  // 景色の 中の 動きと カードの 上下は `.season-float` の 外に ある＝
  // display:none では 止まらない。別に 見る
  check("the picture and the cards hold still too",
    quiet.breathe === "none" && quiet.face === "none", `${quiet.breathe} / ${quiet.face}`);
  check("the season still colours the page when movement is off",
    quiet.season === "winter" && quiet.bg === seasons[3].bg, `${quiet.season} ${quiet.bg}`);
  await calm.context.close();
}

await browser.close();

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
