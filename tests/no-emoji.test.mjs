/**
 * 出荷する ファイルに「画面へ 出す 絵文字」が 混ざって いないかを 見る。
 *
 * 🔴 なぜ 要るか（2026-09-20）
 * 画面に 出して いた 絵文字 23 文字を 実ブラウザで 1 文字ずつ 描いて 調べたら、
 * **🐻 🐰 🐶 🦊 🐼 🐸 🐧 🏆 🎉 💪 🤝 の 11 文字が 豆腐**だった。
 * 絵文字の フォントを 持たない 端末では □ に なる。
 *
 * ⚠️ **実ブラウザの 検査（e2e）だけでは 足りない**＝HTML に 絵文字を 書き戻しても
 * JS が すぐ SVG で 上書きする ので DOM を 見る 検査には 映らない（変異で 実測）。
 * そこで **ソースを 直接 見る** この 検査を 別に 置く。
 *
 * メモの ための しるし（🔴 ⚠️ ✅ など）は コメントにしか 出ないので 通す。
 * 出すのは すべて 自前の SVG（`src/faces.js`）。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/todo_app_frontend/src", "src/todo_app_frontend/assets"];
const LOOK = [".js", ".mjs", ".html", ".css"];

/** メモの しるし。コメントの 中でしか 使わない ので 通す */
const MARKS = new Set([
  "🔴", "🟢", "🟡", "🔵", "🟠", "⛔", "🔑", "📌", "📏", "🎯", "🔬", "🔁", "🧪",
  "✅", "❌", "⚡", "🤖", "▶", "⚠", "🆕", "💡", "🚨", "🛠", "📊", "✍", "🚀", "⏳",
]);

/** 絵の 文字（フォントが 要る もの）。★ ♪ ✦ ✕ × □ は この 範囲に 入らない */
const PICT = /[\u{1F000}-\u{1FAFF}]/gu;

/** かおの 移行表は 絵文字を 持って いて よい（読みかえる ためで、出しはしない） */
const ALLOW_FILE = "faces.js";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (LOOK.some(e => name.endsWith(e))) out.push(p);
  }
  return out;
}

const bad = [];
let looked = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    looked += 1;
    const text = readFileSync(file, "utf8");
    text.split("\n").forEach((line, i) => {
      for (const m of line.matchAll(PICT)) {
        if (MARKS.has(m[0])) continue;
        if (file.endsWith(ALLOW_FILE)) continue;
        bad.push(`${file}:${i + 1}  ${m[0]}  ${line.trim().slice(0, 70)}`);
      }
    });
  }
}

console.log(`${looked} 本の ファイルを 見た`);
if (looked < 20) {
  console.error(`FAIL  見た ファイルが ${looked} 本しか ない＝掃けて いない`);
  process.exit(1);
}
if (bad.length) {
  console.error("FAIL  画面に 出す 絵文字が のこって いる:");
  bad.slice(0, 12).forEach(b => console.error("  " + b));
  console.error("  → 自前の SVG（src/faces.js）に して ください");
  process.exit(1);
}
console.log("PASS  画面に 出す 絵文字は 無い（メモの しるしと かおの 移行表だけ）");
