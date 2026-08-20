/**
 * 星の 英語名の 検算: 同梱データの 日本語名に つけた 英語名が 本当に その星かを 見る。
 *
 *   node tests/sky-names.test.mjs
 *
 * 名前だけ 見比べても「読みが それっぽい」しか 言えないので、
 * 英語名ごとに 天文で 決まって いる バイエル符号（ギリシャ文字＋星座）を 書き出し、
 * 同梱データ（Yale Bright Star Catalogue）の 実際の 符号と 突き合わせる。
 * どちらかが ずれて いれば その名前は 別の星に ついている。
 */
import { STARS, BAYER_LETTERS, CONSTELLATION_ABBR } from "../src/todo_app_frontend/src/sky-stars.mjs";
import { CONSTELLATION_NAMES } from "../src/todo_app_frontend/src/sky-figures.mjs";
import { STAR_NAME_EN, starProperName } from "../src/todo_app_frontend/src/sky-names.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

// 英語名 → その星の バイエル符号（IAU-CSN と 星表の 定番の 対応）
const BAYER_OF = {
  "Sirius": "α CMa", "Canopus": "α Car", "Arcturus": "α Boo", "Rigil Kentaurus": "α Cen",
  "Vega": "α Lyr", "Capella": "α Aur", "Rigel": "β Ori", "Procyon": "α CMi",
  "Achernar": "α Eri", "Betelgeuse": "α Ori", "Hadar": "β Cen", "Altair": "α Aql",
  "Aldebaran": "α Tau", "Antares": "α Sco", "Spica": "α Vir", "Pollux": "β Gem",
  "Fomalhaut": "α PsA", "Mimosa": "β Cru", "Deneb": "α Cyg", "Acrux": "α Cru",
  "Regulus": "α Leo", "Adhara": "ε CMa", "Gacrux": "γ Cru", "Shaula": "λ Sco",
  "Bellatrix": "γ Ori", "Elnath": "β Tau", "Miaplacidus": "β Car", "Alnilam": "ε Ori",
  "Alnair": "α Gru", "Alioth": "ε UMa", "Regor": "γ Vel", "Dubhe": "α UMa",
  "Wezen": "δ CMa", "Kaus Australis": "ε Sgr", "Avior": "ε Car", "Alkaid": "η UMa",
  "Menkalinan": "β Aur", "Atria": "α TrA", "Alhena": "γ Gem", "Peacock": "α Pav",
  "Mirzam": "β CMa", "Castor": "α Gem", "Alphard": "α Hya", "Hamal": "α Ari",
  "Polaris (the North Star)": "α UMi", "Nunki": "σ Sgr", "Diphda": "β Cet",
  "Alnitak": "ζ Ori", "Alpheratz": "α And", "Mirach": "β And", "Saiph": "κ Ori",
  "Kochab": "β UMi", "Rasalhague": "α Oph", "Algol": "β Per", "Denebola": "β Leo",
  "Sadr": "γ Cyg", "Suhail": "λ Vel", "Schedar": "α Cas", "Mintaka": "δ Ori",
  "Alphecca": "α CrB", "Eltanin": "γ Dra", "Caph": "β Cas", "Mizar": "ζ UMa",
  "Men": "α Lup", "Dschubba": "δ Sco", "Merak": "β UMa", "Ankaa": "α Phe",
  "Enif": "ε Peg", "Scheat": "β Peg", "Phecda": "γ UMa", "Alderamin": "α Cep",
  "Markab": "α Peg", "Menkar": "α Cet", "Zosma": "δ Leo", "Algieba": "γ Leo",
  "Acrab": "β Sco", "Unukalhai": "α Ser", "Izar": "ε Boo", "Tarazed": "γ Aql",
  "Albireo": "β Cyg", "Megrez": "δ UMa", "Rasalgethi": "α Her", "Porrima": "γ Vir",
  "Thuban": "α Dra",
};

// --- 1. 同梱データの 名前つきの 星が 1 つ のこらず 英語名を 持つか -----------
{
  const ja = [...new Set(STARS.map((s) => s[4]).filter((x) => x && x !== 0))];
  const missing = ja.filter((n) => !STAR_NAME_EN[n]);
  check(`名前つきの 星 ${ja.length} 個 すべてに 英語名が ある`,
    missing.length === 0, missing.join(", "));
  const extra = Object.keys(STAR_NAME_EN).filter((n) => !ja.includes(n));
  check("使われない 英語名が 混ざって いない", extra.length === 0, extra.join(", "));
  const dup = Object.values(STAR_NAME_EN);
  check("英語名に 同じ ものが 無い", new Set(dup).size === dup.length);
  check(`検算表が 英語名を 全部 おさえて いる（${Object.keys(BAYER_OF).length} 個）`,
    Object.keys(BAYER_OF).length === Object.keys(STAR_NAME_EN).length);
}

// --- 2. 英語名 ↔ 実データの バイエル符号 -------------------------------------
// 同じ 固有名の 星が 星表に 何行か ある ことが ある（二重星の 各成分）。
// どれか 1 行が 合って いれば その名前は 正しい 星に ついて いる。
{
  const byJa = new Map();
  for (const s of STARS) {
    if (!s[4]) continue;
    if (!byJa.has(s[4])) byJa.set(s[4], []);
    byJa.get(s[4]).push(s);
  }
  for (const [ja, en] of Object.entries(STAR_NAME_EN)) {
    const rows = byJa.get(ja) || [];
    const want = BAYER_OF[en];
    const got = rows.map((s) => {
      const g = s[5] >= 0 ? BAYER_LETTERS[s[5]] : "-";
      const c = s[6] >= 0 ? CONSTELLATION_ABBR[s[6]] : "-";
      return g + " " + c;
    });
    check(`${en}（${ja}）は ${want}`, got.includes(want), `実データ: ${got.join(" / ")}`);
  }
}

// --- 3. 星座の 名前は ラテン語（IAU の 正式名）が そろって いる ---------------
{
  const noLa = CONSTELLATION_NAMES.filter((n) => !n.la);
  check(`星座 ${CONSTELLATION_NAMES.length} 個 すべてに ラテン語名が ある`,
    noLa.length === 0, noLa.map((n) => n.c).join(", "));
}

// --- 4. 切り替えの ふるまい ---------------------------------------------------
{
  check("日本語では 日本語名の まま", starProperName("シリウス", "ja") === "シリウス");
  check("英語では 英語名に なる", starProperName("シリウス", "en") === "Sirius");
  check("名前の 無い 星は null", starProperName(0, "en") === null);
  check("知らない 名前は そのまま 返す", starProperName("なぞの星", "en") === "なぞの星");
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
