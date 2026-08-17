/**
 * ステージの 検算。
 *
 * 見本の 手じゅんを ほんとうに 実行して「クリアできる／どこにも ぶつからない」ことを 見る。
 * ここが 通らない ステージは、こどもには ぜったい 解けない。
 *
 *   node tests/code-lessons.test.mjs
 */
import {
  LEVELS, WORLDS, CARDS, COND_LABELS, levelById, worldOf, starsFor, par, checkAnswer,
} from "../src/todo_app_frontend/src/code-lessons.mjs";
import { run, cleared, countAll, ACTIONS, CONDS } from "../src/todo_app_frontend/src/code-world.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

check("ステージは 20", LEVELS.length === 20, String(LEVELS.length));
check("ばんごうは 1 から じゅんばん", LEVELS.every((l, i) => l.id === i + 1));
check("ワールドは 4", WORLDS.length === 4);
check("どの ワールドも 5 ステージ",
  WORLDS.every(w => LEVELS.filter(l => l.world === w.id).length === 5),
  WORLDS.map(w => LEVELS.filter(l => l.world === w.id).length).join("/"));

function usesOnly(list, allowed) {
  for (const card of list || []) {
    if (!allowed.includes(card.t)) return false;
    if (card.t === "repeat" && !usesOnly(card.body, allowed)) return false;
    if (card.t === "if" && (!usesOnly(card.then, allowed) || !usesOnly(card.other, allowed))) return false;
  }
  return true;
}

for (const level of LEVELS) {
  const tag = level.id + " " + level.name;
  const got = checkAnswer(level);
  check(tag + ": 見本で クリアできる", got.ok, "at " + got.cards + " まい");
  check(tag + ": 見本は どこにも ぶつからない", got.bumps === 0, String(got.bumps));
  check(tag + ": 見本は 上限に かからない", got.stopped === "ok", got.stopped);
  check(tag + ": 見本の カードは そのステージで つかえる ものだけ",
    usesOnly(level.answer.main, level.cards) &&
    usesOnly(level.answer.a, level.cards) &&
    usesOnly(level.answer.b, level.cards));
  check(tag + ": からっぽでは クリアに ならない", !cleared(run({ main: [] }, level).st));
  check(tag + ": やる ことと ヒントが 書いてある",
    level.mission.length > 5 && level.hint.length > 5);
  check(tag + ": ★3 の めやすは 見本の まい数", par(level) === got.cards);
}

// --- ★の きめかた ---------------------------------------------------------------

{
  const lv = LEVELS[0];
  const p = par(lv);
  check("見本と おなじ まい数なら ★3", starsFor(lv, p) === 3);
  check("すこし 多いと ★2", starsFor(lv, p + 3) === 2);
  check("もっと 多いと ★1", starsFor(lv, p + 4) === 1);
  check("みじかく 書けたら ★3 のまま", starsFor(lv, p - 1) === 3);
}

// --- ならう じゅんばん -----------------------------------------------------------

{
  const firstWith = card => LEVELS.find(l => l.cards.includes(card));
  check("くりかえしは じゅんばんの あとで 出る", firstWith("repeat").id === 3, String(firstWith("repeat").id));
  check("もし は くりかえしの あとで 出る", firstWith("if").id > firstWith("repeat").id,
    String(firstWith("if").id));
  check("わざ は もっと あと", firstWith("call").id >= 9, String(firstWith("call").id));
  check("はじめの ステージは カード 1 しゅるいだけ", LEVELS[0].cards.length === 1);
  check("あとの ステージほど カードが 多い", LEVELS[19].cards.length > LEVELS[0].cards.length);

  check("ばんごうから ひける", levelById(7) === LEVELS[6] && levelById(99) === null);
  check("ワールドが ひける", worldOf(LEVELS[0]).id === 1 && worldOf(LEVELS[19]).id === 4);
}

// --- せかいの 見た目 -------------------------------------------------------------

{
  const skies = new Set(WORLDS.map(w => w.sky.join()));
  check("ワールドごとに 空の 色が ちがう", skies.size === 4);
  const grounds = new Set(WORLDS.map(w => w.top));
  check("ワールドごとに じめんの 色が ちがう", grounds.size === 4);
  check("ワールドには 名前と 音の 高さが ある",
    WORLDS.every(w => w.name.length > 0 && w.tone > 0));
}

// --- カードの せつめい -----------------------------------------------------------

{
  const known = Object.keys(CARDS);
  check("カードの せつめいは ぜんぶ ある",
    ACTIONS.concat(["repeat", "if", "call"]).every(k => known.includes(k)), known.join(","));
  check("もし の 中身の 名前も ぜんぶ ある", CONDS.every(c => COND_LABELS[c]));
  check("どのステージも しらない カードを つかわない",
    LEVELS.every(l => l.cards.every(c => known.includes(c))));
}

// --- ことばの きまり ------------------------------------------------------------
// カタカナ語を ひらがなに 崩さない（こどもを 見くびった 書きかたに なる）

{
  const banned = ["ぷろぐら", "かーど", "すてーじ", "きゃらくたー", "ひんと", "くりあ", "すたーと", "げーむ"];
  const text = LEVELS.map(l => [l.name, l.mission, l.hint, l.idea].join(" ")).join(" ") +
    Object.values(CARDS).map(c => c.label + " " + c.tip).join(" ") +
    Object.values(COND_LABELS).join(" ") + WORLDS.map(w => w.name).join(" ");
  const hit = banned.filter(w => text.includes(w));
  check("カタカナ語を ひらがなに 崩していない", hit.length === 0, hit.join(","));
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
