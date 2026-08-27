/**
 * ことばの 検算。英語と 日本語で **同じ キーが そろって いるか** を 見る。
 *
 * t() は 日本語に 無い キーを 英語で 埋めるので、日本語の 抜けは 画面上
 * 英語の まま 出て 気づきにくい。英語の 抜けは キーの 文字（sk_readLook 等）が
 * そのまま 出る。どちらも 読み上げに そのまま 流れるので、
 * **目が 見えない 人には 画面より 先に 届く**。ここで 落とす。
 *
 * 置き換えの {0} {1} … の 数が 食い違うのも 見る（片方だけ 引数が 抜ける と
 * 文が 途切れる）。
 */
import { coreEn, coreJa } from "../src/todo_app_frontend/src/i18n-core.js";
import { drillEn, drillJa } from "../src/todo_app_frontend/src/i18n-drill.js";
import { shogiEn, shogiJa } from "../src/todo_app_frontend/src/i18n-shogi.js";
import { skyEn, skyJa } from "../src/todo_app_frontend/src/i18n-sky.js";
import { asobiEn, asobiJa } from "../src/todo_app_frontend/src/i18n-asobi.js";

const PARTS = [
  ["core", coreEn, coreJa],
  ["drill", drillEn, drillJa],
  ["shogi", shogiEn, shogiJa],
  ["sky", skyEn, skyJa],
  ["asobi", asobiEn, asobiJa],
];

let bad = 0;
const fail = (msg) => { console.log("FAIL  " + msg); bad += 1; };

for (const [name, en, ja] of PARTS) {
  const enKeys = Object.keys(en);
  const jaKeys = Object.keys(ja);
  const missingJa = enKeys.filter(k => !(k in ja));
  const missingEn = jaKeys.filter(k => !(k in en));
  if (missingJa.length) fail(name + ": 日本語に 無い " + missingJa.join(", "));
  if (missingEn.length) fail(name + ": 英語に 無い " + missingEn.join(", "));

  // 置き換え（{0} {1} …）の 数は くらべない。ことばに よって 使う ものが
  // ちがって よい＝英語の sk_whenFmt は 2 けたの 月日（{6}{7}）を 使い、
  // 日本語は 使わない。どちらも 同じ 引数の 中から 選んで いるだけ。
  console.log("ok    " + name + "  " + enKeys.length + " keys");
}

if (bad) {
  console.log("\n" + bad + " 件 ちがいます");
  process.exit(1);
}
console.log("\nen と ja は そろって います");
