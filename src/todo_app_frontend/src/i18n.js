/**
 * 表示言語。いまは 英語と 日本語 の 2 つ。
 *
 * 辞書は 画面ごとに 別ファイルへ 分けてある（core / drill / shogi / sky）。
 * 新しい言語を 足すときは LANGS に 1 行、各辞書に 1 ブロック 足す。
 *
 * 使いかた:
 *   import { t } from "./i18n";
 *   el.textContent = t("c_pickTitle");
 *   el.textContent = t("dr_correctCount", 8, 10);   // {0} {1} を 順に 置き換える
 */

import { coreEn, coreJa } from "./i18n-core";
import { drillEn, drillJa } from "./i18n-drill";
import { shogiEn, shogiJa } from "./i18n-shogi";
import { skyEn, skyJa } from "./i18n-sky";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
];

/** 右から左に書く言語。いまは 無い（増やしたときのために 残す） */
export const RTL = [];

const DICT = {
  en: { ...coreEn, ...drillEn, ...shogiEn, ...skyEn },
  ja: { ...coreJa, ...drillJa, ...shogiJa, ...skyJa },
};

const STORAGE_KEY = "kimaru.lang";

export function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICT[saved]) return saved;
  } catch (error) {
    /* localStorage が使えない環境では 端末の設定に まかせる */
  }
  const candidates =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];
  for (const candidate of candidates) {
    const base = String(candidate).toLowerCase().split("-")[0];
    if (DICT[base]) return base;
  }
  return "en";
}

export function saveLang(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch (error) {
    /* 保存できなくても その場の切り替えは効く */
  }
}

let current = "en";
const listeners = [];

export function currentLang() {
  return current;
}

/** 言語を変える。登録した人へ 知らせるので、描き直しは 受け取った側でする */
export function setLang(code) {
  current = DICT[code] ? code : "en";
  for (const fn of listeners) {
    try {
      fn(current);
    } catch (error) {
      console.error("言語の切り替えで失敗しました", error);
    }
  }
  return current;
}

/** 言語が変わったら 呼んでほしい関数を 登録する */
export function onLangChange(fn) {
  listeners.push(fn);
}

/**
 * 文言を引く。日本語に無いキーは 英語へ落とし、それも無ければ キーをそのまま返す
 * （出し忘れが 画面で すぐ 分かるように、空文字にはしない）。
 */
export function t(key, ...args) {
  const dict = DICT[current] || DICT.en;
  const template = dict[key] !== undefined ? dict[key] : DICT.en[key];
  if (typeof template !== "string") return key;
  return template.replace(/\{(\d+)\}/g, (_, i) => (args[i] !== undefined ? args[i] : ""));
}

/** 検算用。どの言語にも 同じキーが あるかを 見る */
export function dictKeys(code) {
  return Object.keys(DICT[code] || {});
}
