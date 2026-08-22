/**
 * リンクを貼ったときに 出る 画像（OGP）を 1 枚 作る。
 * サイト本体の style.css を そのまま 読ませて 撮るので、色や 影は 画面と 同じになる。
 *
 *   node scripts/make-og.mjs
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const template = pathToFileURL(resolve(here, "og-template.html")).href;
const out = resolve(here, "../src/todo_app_frontend/assets/og.png");

// OGP の 決まりの 大きさ。1.91:1 なので LINE も X も 切らずに 出す
const SIZE = { width: 1200, height: 630 };

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
await tab.goto(template, { waitUntil: "load" });
// 背景の ゆらぎ（aurora）は 動き続けるので 止めてから 撮る
await tab.addStyleTag({
  content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
});
await tab.screenshot({ path: out, type: "png" });
await tab.close();
await browser.close();

console.log(`og.png  ${SIZE.width}x${SIZE.height}`);
