/**
 * ホーム画面用のアイコンを作る。ブランドのチェックマークをそのまま描き出す。
 * 追加のライブラリを増やさないよう、ブラウザに描かせて撮る。
 *
 *   node scripts/make-icons.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("src/todo_app_frontend/assets/icons");
mkdirSync(out, { recursive: true });

/** padding は 0〜1。マスク（丸く切られる）想定のものは大きめに取る */
function page(size, padding) {
  const inset = Math.round(size * padding);
  const mark = size - inset * 2;
  return `<!DOCTYPE html><meta charset="utf-8">
<style>
  html, body { margin: 0; width: ${size}px; height: ${size}px; }
  body {
    display: grid; place-items: center;
    background: linear-gradient(135deg, #38bdf8 0%, #a78bfa 38%, #f472b6 70%, #fbbf24 100%);
  }
  svg { width: ${mark}px; height: ${mark}px; }
</style>
<svg viewBox="0 0 32 32" fill="none">
  <path d="M6 16.8 12.6 23 26 9.5" stroke="#ffffff" stroke-width="4.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const browser = await chromium.launch();

const targets = [
  { file: "icon-192.png", size: 192, padding: 0.2 },
  { file: "icon-512.png", size: 512, padding: 0.2 },
  { file: "icon-maskable-512.png", size: 512, padding: 0.29 }, // 丸く切られても収まるように
  { file: "icon-180.png", size: 180, padding: 0.2 },           // iOS のホーム画面用
];

for (const target of targets) {
  const tab = await browser.newPage({ viewport: { width: target.size, height: target.size } });
  await tab.setContent(page(target.size, target.padding));
  await tab.screenshot({ path: `${out}/${target.file}` });
  await tab.close();
  console.log(`${target.file}  ${target.size}x${target.size}`);
}

await browser.close();
