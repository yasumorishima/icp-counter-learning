/**
 * ステージと カードの 中身。
 *
 * ★の 数（1〜3）は「クリアできたか」だけでなく「どれだけ みじかく 書けたか」で 決まる。
 * みじかく 書くには くりかえし と わざ が いる＝それが この あそびの ねらい。
 *
 * 見本の 手じゅん（answer）は かならず tests/code-lessons.test.mjs で 実行して
 * 「ほんとうに クリアできる」ことを 確かめている。
 */

import { run, cleared, countAll } from "./code-world.mjs";

const P = t => ({ t });
const R = (n, body) => ({ t: "repeat", n, body });
const IF = (cond, then, other) => ({ t: "if", cond, then, other: other || [] });
const CALL = w => ({ t: "call", w });

/** 4 つの ワールド。見た目も 音も まったく ちがう */
export const WORLDS = [
  {
    id: 1, name: "くさはら", tone: 523,
    sky: ["#8ed6ff", "#e8f7ff"], far: "#a7d9a0", near: "#79c46b",
    top: "#6fbf4f", side: "#a9743f", deep: "#7d5330", water: "#4aa3d8",
  },
  {
    id: 2, name: "どうくつ", tone: 392,
    sky: ["#2b2350", "#4a3f78"], far: "#3a3160", near: "#2e2750",
    top: "#7c6aa8", side: "#4b4070", deep: "#2f2850", water: "#6a4fd0",
  },
  {
    id: 3, name: "うみ", tone: 587,
    sky: ["#5fd4e8", "#eafcff"], far: "#7fe0d0", near: "#4fc9c0",
    top: "#f2dfa0", side: "#d8b877", deep: "#a98a52", water: "#2f9fd8",
  },
  {
    id: 4, name: "そら", tone: 698,
    sky: ["#b9a7ff", "#ffe7f4"], far: "#d6c8ff", near: "#c0aaff",
    top: "#ffe9a3", side: "#9f86e8", deep: "#7a63c8", water: "#6f5bd0",
  },
];

/** カード 1 まいの 見た目と せつめい */
export const CARDS = {
  go: { label: "すすむ", face: "→", tip: "1 ます まえに あるく" },
  jump: { label: "とぶ", face: "⤴", tip: "1 ます とびこえて、2 ます さきへ" },
  take: { label: "とる", face: "✋", tip: "足もとの ★や かぎを とる" },
  open: { label: "あける", face: "🔓", tip: "かぎを つかって 目の前の とびらを あける" },
  wait: { label: "まつ", face: "⏸", tip: "その場で じっと まつ" },
  repeat: { label: "くりかえし", face: "⟳", tip: "なかの カードを なんかいも する" },
  if: { label: "もし", face: "？", tip: "そのときの ようすで する ことを かえる" },
  call: { label: "わざを つかう", face: "★", tip: "じぶんで つくった 手じゅんを よびだす" },
};

/** 「もし」で えらべる 中身 */
export const COND_LABELS = {
  hole: "まえが あな",
  door: "まえが とびら",
  enemy: "まえに てき",
  star: "ここに ★か かぎ",
};

export const LEVELS = [
  {
    id: 1, world: 1, name: "はじめの いっぽ", idea: "じゅんばん",
    map: "GGGF", cards: ["go"],
    mission: "ゴールの はたまで あるこう",
    hint: "「すすむ」を 3 まい ならべて スタートを おす",
    answer: { main: [P("go"), P("go"), P("go")] },
  },
  {
    id: 2, world: 1, name: "★を とろう", idea: "じゅんばん",
    map: "GG*GF", cards: ["go", "take"],
    mission: "★を とってから ゴールへ",
    hint: "★の ますに 立ってから「とる」。とばすと クリアに ならないよ",
    answer: { main: [P("go"), P("go"), P("take"), P("go"), P("go")] },
  },
  {
    id: 3, world: 1, name: "くりかえし", idea: "くりかえし",
    map: "GGGGGGGGGF", cards: ["go", "repeat"],
    mission: "9 ます さきの ゴールへ。カードは すくなく",
    hint: "「くりかえし」の なかに「すすむ」を 1 まい 入れて、かずを 9 に する",
    answer: { main: [R(9, [P("go")])] },
  },
  {
    id: 4, world: 1, name: "★の みち", idea: "くりかえし",
    map: "G*G*G*G*F", cards: ["go", "take", "repeat"],
    mission: "★を 4こ ぜんぶ とって ゴールへ",
    hint: "「すすむ・とる・すすむ」の 3 まいを くりかえすと ちょうど いい",
    answer: { main: [R(4, [P("go"), P("take"), P("go")])] },
  },
  {
    id: 5, world: 1, name: "あなを とぼう", idea: "くりかえし",
    map: "GGHGGHGGHGF", cards: ["go", "jump", "repeat"],
    mission: "あなに おちないで ゴールへ",
    hint: "「すすむ・とぶ」を 3 かい くりかえして、さいごに もう 1 ます",
    answer: { main: [R(3, [P("go"), P("jump")]), P("go")] },
  },
  {
    id: 6, world: 2, name: "かぎと とびら", idea: "くみあわせ",
    map: "GkGDGG*F", cards: ["go", "take", "open", "repeat"],
    mission: "かぎを とって とびらを あけ、★も とって ゴールへ",
    hint: "かぎの ますで「とる」。とびらの 1 ます 手前で「あける」",
    answer: {
      main: [P("go"), P("take"), P("go"), P("open"), R(4, [P("go")]), P("take"), P("go")],
    },
  },
  {
    id: 7, world: 2, name: "くりかえしの なかの くりかえし", idea: "二じゅうの くりかえし",
    map: "GGGHGGGHGGGHGF", cards: ["go", "jump", "repeat"],
    mission: "3 ます あるいて 1 かい とぶ。それを くりかえそう",
    hint: "そとの くりかえしの なかに、もう 1 つ くりかえしを 入れる",
    answer: { main: [R(3, [R(2, [P("go")]), P("jump")]), P("go")] },
  },
];

LEVELS.push(
  {
    id: 8, world: 2, name: "てきを とびこえろ", idea: "まつ",
    map: "GGGGGGGGGF", enemies: [{ lo: 3, hi: 5, every: 2 }], cards: ["go", "jump", "wait"],
    mission: "てきに ぶつからないで ゴールへ",
    hint: "とびこえた さきに てきが いると つかまる。「まつ」で タイミングを 合わせよう",
    answer: { main: [P("go"), P("go"), P("go"), P("wait"), P("go"), P("jump"), P("go"), P("jump")] },
  },
  {
    id: 9, world: 2, name: "わざに 名前を つけよう", idea: "わざ",
    map: "GGHGGGHGGF", cards: ["go", "jump", "repeat", "call"],
    mission: "おなじ 手じゅんを「わざ」に して、2 かい つかおう",
    hint: "したの「わざ 1」に すすむ・とぶ・すすむ を 入れて、うえから 2 かい よぶ",
    answer: { a: [P("go"), P("jump"), P("go")], main: [CALL("a"), CALL("a"), P("go")] },
  },
  {
    id: 10, world: 2, name: "どうくつの おく", idea: "くみあわせ",
    map: "GkGDG*GHG*GHGF", cards: ["go", "jump", "take", "open", "repeat", "call"],
    mission: "かぎ・★・あな ぜんぶ こなして ゴールへ",
    hint: "とびらを あけた あとは「すすむ・とる・すすむ・とぶ」の くりかえし",
    answer: {
      main: [
        P("go"), P("take"), P("go"), P("open"), P("go"), P("go"),
        R(2, [P("go"), P("take"), P("go"), P("jump")]), P("go"),
      ],
    },
  },
  {
    id: 11, world: 3, name: "もし あなが あったら", idea: "もし〜だったら",
    map: "GHGGHGHGGHGF", cards: ["go", "jump", "repeat", "if"],
    mission: "あなの ばしょが バラバラ。見て きめる プログラムを つくろう",
    hint: "「もし まえが あな だったら とぶ、そうでなければ すすむ」を くりかえす",
    answer: { main: [R(7, [IF("hole", [P("jump")], [P("go")])])] },
  },
  {
    id: 12, world: 3, name: "ひろって すすむ", idea: "もし〜だったら",
    map: "G*GG*G*GG*GF", cards: ["go", "take", "repeat", "if"],
    mission: "★の ばしょも バラバラ。ぜんぶ ひろって ゴールへ",
    hint: "「もし ここに ★か かぎ が あったら とる、そうでなければ すすむ」",
    answer: { main: [R(15, [IF("star", [P("take")], [P("go")])])] },
  },
  {
    id: 13, world: 3, name: "とびらの みち", idea: "もし〜だったら",
    map: "GkGDGkGDGGF", cards: ["go", "take", "open", "repeat", "if"],
    mission: "かぎと とびらが くりかえし でてくる",
    hint: "すすむ・とる・すすむ・あける・すすむ・すすむ の 6 まいが 2 かい つづくよ",
    answer: {
      main: [
        R(2, [P("go"), P("take"), P("go"), P("open"), P("go"), P("go")]),
        P("go"), P("go"),
      ],
    },
  },
  {
    id: 14, world: 3, name: "うみの おわり", idea: "くみあわせ",
    map: "G*HG*GH*GGHGF", cards: ["go", "jump", "take", "repeat", "if"],
    mission: "★と あなが まざった みち",
    hint: "「もし ★が あったら とる」と「もし あなが あったら とぶ」を 1 つの くりかえしに 入れる",
    answer: {
      main: [R(9, [IF("star", [P("take")], []), IF("hole", [P("jump")], [P("go")])])],
    },
  },
);

const WALK = [IF("star", [P("take")], []), IF("door", [P("open")], []), IF("hole", [P("jump")], [P("go")])];

LEVELS.push(
  {
    id: 15, world: 3, name: "なんでも あるける プログラム", idea: "もし〜だったら",
    map: "GkGDG*GHG*GGF", cards: ["go", "jump", "take", "open", "repeat", "if"],
    mission: "とる・あける・とぶ を ぜんぶ「もし」で きめよう",
    hint: "1 つの くりかえしの なかに「もし」を 3 つ ならべると、どんな みちでも あるける",
    answer: { main: [R(11, WALK)] },
  },
  {
    id: 16, world: 4, name: "そらの みち", idea: "わざ",
    map: "GGHGGGGHGGGGGHGF", cards: ["go", "jump", "repeat", "call"],
    mission: "おなじ 3 まいが 3 かい でてくる。わざに して みじかく",
    hint: "わざ 1 に「すすむ・とぶ・すすむ」。あいだの ますは わざの そとで すすむ",
    answer: {
      a: [P("go"), P("jump"), P("go")],
      main: [CALL("a"), P("go"), CALL("a"), P("go"), P("go"), CALL("a")],
    },
  },
  {
    id: 17, world: 4, name: "そらの もん", idea: "もし〜だったら",
    map: "GkGDGGHGkGDGGF", cards: ["go", "jump", "take", "open", "repeat", "if"],
    mission: "かぎ・とびら・あなが まざった ながい みち",
    hint: "15 ばんと おなじ「なんでも あるける プログラム」で いける",
    answer: { main: [R(12, WALK)] },
  },
  {
    id: 19, world: 4, name: "★を ぜんぶ", idea: "くみあわせ",
    map: "G*GHG*GGH*GG*GHGF", cards: ["go", "jump", "take", "repeat", "if", "call"],
    mission: "★を 4こ ぜんぶ とって ゴールへ",
    hint: "「もし ★が あったら とる」と「もし あなが あったら とぶ」の くりかえし",
    answer: {
      main: [R(13, [IF("star", [P("take")], []), IF("hole", [P("jump")], [P("go")])])],
    },
  },
  {
    id: 20, world: 4, name: "そらの てっぺん", idea: "わざ",
    map: "G*GHGG*GHGGG*GHGG*GHF", cards: ["go", "jump", "take", "repeat", "if", "call"],
    mission: "さいごの ステージ。おなじ 4 まいが 4 かい でてくる",
    hint: "「すすむ・とる・すすむ・とぶ」を わざに すると、20 まいが 12 まいに なる",
    answer: {
      a: [P("go"), P("take"), P("go"), P("jump")],
      main: [CALL("a"), P("go"), CALL("a"), P("go"), P("go"), CALL("a"), P("go"), CALL("a")],
    },
  },
);

LEVELS.push({
  id: 18, world: 4, name: "てきの すきま", idea: "まつ",
  map: "GGGGGGGGGGGF", enemies: [{ lo: 3, hi: 5, every: 2 }, { lo: 7, hi: 9, every: 2 }],
  cards: ["go", "jump", "wait", "repeat"],
  mission: "てきが 2 ひき。すきまを ぬけて ゴールへ",
  hint: "とびこえた さきに てきが いると つかまる。1 かい まつと ずれるよ",
  answer: {
    main: [P("go"), P("go"), P("go"), P("wait"), P("go"), P("jump"), P("go"), P("jump"), P("jump")],
  },
});

LEVELS.sort((a, b) => a.id - b.id);

/** ★の めやす＝見本の 手じゅんの まい数 */
export function par(level) {
  return countAll(level.answer);
}

/**
 * ★は 3 だんかい。クリアだけでも 1 つ もらえるが、
 * みじかく 書けるほど ふえる＝くりかえしと わざを つかう りゆうに なる。
 */
export function starsFor(level, cards) {
  const p = par(level);
  if (cards <= p) return 3;
  if (cards <= p + 3) return 2;
  return 1;
}

export function levelById(id) {
  return LEVELS.find(l => l.id === id) || null;
}

export function worldOf(level) {
  return WORLDS.find(w => w.id === level.world) || WORLDS[0];
}

/** その ステージの 見本が ほんとうに クリアできるか（検算から よぶ） */
export function checkAnswer(level) {
  const r = run(level.answer, level);
  return {
    ok: cleared(r.st),
    bumps: r.frames.filter(f => f.op === "bump").length,
    cards: countAll(level.answer),
    frames: r.frames.length,
    stopped: r.stopped,
  };
}
