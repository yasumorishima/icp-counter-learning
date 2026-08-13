/**
 * ドリルの問題を作るところ。学年 × 単元で、その場で作る。
 * 問題を保存しないので、キャニスターの保存量は増えない。
 *
 * 各単元の make() は 1 問返す:
 *   { text: 画面に大きく出す式や文, answer: 正解, choices?: えらぶ形の選択肢, hint?: 補助 }
 * kind は答えの入れ方: num=整数 / dec=小数 / frac=分数(a/b) / choice=えらぶ
 */

const ri = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = list => list[Math.floor(Math.random() * list.length)];
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const round2 = n => Math.round(n * 100) / 100;

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * 「3じ」「3じ15ふん」。ふん / ぷん の読み分けを 1 か所に閉じ込める。
 * 一のくらいが 0・1・3・4・6・8 なら「ぷん」、それ以外は「ふん」。
 */
function clockLabel(h, m) {
  if (m === 0) return h + "じ";
  const tail = m % 10;
  const pun = tail === 0 || tail === 1 || tail === 3 || tail === 4 || tail === 6 || tail === 8;
  return h + "じ" + m + (pun ? "ぷん" : "ふん");
}

function frac(n, d) {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return n / g + "/" + d / g;
}

export const GRADES = [1, 2, 3, 4, 5, 6];

export const UNITS = [
  // ---- 1年 ----------------------------------------------------------------
  { id: "g1-add", grade: 1, name: "たしざん", kind: "num",
    make: () => { const a = ri(1, 9), b = ri(1, 10 - a); return { text: a + " + " + b, answer: String(a + b) }; } },
  { id: "g1-add-carry", grade: 1, name: "くり上がりの たしざん", kind: "num",
    make: () => { const a = ri(5, 9), b = ri(11 - a, 9); return { text: a + " + " + b, answer: String(a + b) }; } },
  { id: "g1-sub", grade: 1, name: "ひきざん", kind: "num",
    make: () => { const a = ri(2, 10), b = ri(1, a - 1); return { text: a + " − " + b, answer: String(a - b) }; } },
  { id: "g1-sub-borrow", grade: 1, name: "くり下がりの ひきざん", kind: "num",
    make: () => { const a = ri(11, 18), b = ri(a - 9, 9); return { text: a + " − " + b, answer: String(a - b) }; } },
  { id: "g1-missing", grade: 1, name: "□に はいる かず", kind: "num",
    make: () => { const a = ri(1, 9), s = ri(a + 1, 18); return { text: a + " + □ = " + s, answer: String(s - a) }; } },
  { id: "g1-clock", grade: 1, name: "とけい（なんじ・なんじはん）", kind: "choice",
    make: () => {
      const h = ri(1, 12);
      const m = ri(0, 1) === 1 ? 30 : 0;
      const answer = clockLabel(h, m);
      const others = [
        clockLabel((h % 12) + 1, m),
        clockLabel(h, m === 0 ? 30 : 0),
        clockLabel(h === 1 ? 12 : h - 1, m === 0 ? 30 : 0),
      ].filter(w => w !== answer);
      return { text: "なんじ？", clock: { h, m }, answer, choices: shuffle([answer, others[0], others[1], others[2]]) };
    } },

  // ---- 2年 ----------------------------------------------------------------
  { id: "g2-add2", grade: 2, name: "2けたの たしざん", kind: "num",
    make: () => { const a = ri(10, 89), b = ri(10, 99 - a + 10); return { text: a + " + " + b, answer: String(a + b) }; } },
  { id: "g2-sub2", grade: 2, name: "2けたの ひきざん", kind: "num",
    make: () => { const a = ri(20, 99), b = ri(10, a - 1); return { text: a + " − " + b, answer: String(a - b) }; } },
  { id: "g2-kuku", grade: 2, name: "九九", kind: "num",
    variants: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ key: n, name: n === 0 ? "ぜんぶ" : n + "の だん" })),
    make: variant => {
      const a = variant ? Number(variant) : ri(1, 9);
      const b = ri(1, 9);
      return { text: a + " × " + b, answer: String(a * b) };
    } },
  { id: "g2-clock", grade: 2, name: "とけい（なんじなんぷん）", kind: "choice",
    make: () => {
      const h = ri(1, 12);
      const m = ri(1, 11) * 5;
      const answer = clockLabel(h, m);
      const others = [
        clockLabel(h, m === 55 ? 5 : m + 5),
        clockLabel((h % 12) + 1, m),
        clockLabel(h, m === 5 ? 55 : m - 5),
      ].filter(w => w !== answer);
      return { text: "なんじ なんぷん？", clock: { h, m }, answer, choices: shuffle([answer, others[0], others[1], others[2]]) };
    } },
  { id: "g2-clock-calc", grade: 2, name: "じかんの けいさん", kind: "num",
    make: () => { const m = ri(1, 11) * 5; return { text: m + "ぷん は、1じかん まで あと なんぷん？", answer: String(60 - m) }; } },
  { id: "g2-length", grade: 2, name: "ながさ（cm と mm）", kind: "num",
    make: () => { const c = ri(1, 20), m = ri(1, 9); return { text: c + "cm" + m + "mm は なんmm？", answer: String(c * 10 + m) }; } },
];

UNITS.push(
  // ---- 3年 ----------------------------------------------------------------
  { id: "g3-div", grade: 3, name: "わり算", kind: "num",
    make: () => { const b = ri(2, 9), q = ri(2, 9); return { text: b * q + " ÷ " + b, answer: String(q) }; } },
  { id: "g3-div-rem", grade: 3, name: "あまりの ある わり算", kind: "num",
    make: () => { const b = ri(3, 9), q = ri(2, 9), r = ri(1, b - 1); return { text: (b * q + r) + " ÷ " + b + " の あまり", answer: String(r) }; } },
  { id: "g3-mul", grade: 3, name: "かけ算の ひっ算", kind: "num",
    make: () => { const a = ri(12, 99), b = ri(2, 9); return { text: a + " × " + b, answer: String(a * b) }; } },
  { id: "g3-frac", grade: 3, name: "分数の たし算（同じ分母）", kind: "frac",
    make: () => { const d = ri(3, 9), a = ri(1, d - 2), b = ri(1, d - a - 1); return { text: a + "/" + d + " + " + b + "/" + d, answer: frac(a + b, d) }; } },
  { id: "g3-weight", grade: 3, name: "重さ（g と kg）", kind: "num",
    make: () => { const k = ri(1, 9), g = ri(1, 9) * 100; return { text: k + "kg" + g + "g は なんg？", answer: String(k * 1000 + g) }; } },
  { id: "g3-time", grade: 3, name: "時こくと 時間", kind: "num",
    make: () => { const h = ri(1, 3), m = ri(1, 11) * 5; return { text: h + "じかん" + m + "ふん は なんぷん？", answer: String(h * 60 + m) }; } },

  // ---- 4年 ----------------------------------------------------------------
  { id: "g4-div", grade: 4, name: "わり算の ひっ算", kind: "num",
    make: () => { const b = ri(3, 9), q = ri(20, 120); return { text: b * q + " ÷ " + b, answer: String(q) }; } },
  { id: "g4-round", grade: 4, name: "がい数（四捨五入）", kind: "num",
    make: () => { const n = ri(1000, 9999); return { text: n + " を 百のくらいまでの がい数に", answer: String(Math.round(n / 100) * 100), hint: "十のくらいを 四捨五入" }; } },
  { id: "g4-dec", grade: 4, name: "小数の たし算・ひき算", kind: "dec",
    make: () => {
      const a = round2(ri(10, 200) / 10);
      const b = round2(ri(10, 90) / 10);
      return ri(0, 1) === 1
        ? { text: a + " + " + b, answer: String(round2(a + b)) }
        : { text: round2(a + b) + " − " + b, answer: String(a) };
    } },
  { id: "g4-area", grade: 4, name: "長方形の 面積", kind: "num",
    make: () => { const w = ri(3, 20), h = ri(3, 20); return { text: "たて " + h + "cm、よこ " + w + "cm の 長方形の 面積（cm2）", answer: String(w * h) }; } },
  { id: "g4-angle", grade: 4, name: "角の 大きさ", kind: "num",
    make: () => { const a = ri(20, 160); return { text: a + "度 の となりの 角は？（一直線は 180度）", answer: String(180 - a) }; } },
  { id: "g4-improper", grade: 4, name: "帯分数を 仮分数に", kind: "frac",
    make: () => { const w = ri(1, 4), d = ri(3, 9), n = ri(1, d - 1); return { text: w + "と " + n + "/" + d + " を 仮分数に", answer: (w * d + n) + "/" + d }; } },
);

UNITS.push(
  // ---- 5年 ----------------------------------------------------------------
  { id: "g5-frac", grade: 5, name: "分数の たし算（分母がちがう）", kind: "frac",
    make: () => { const d1 = ri(2, 6), d2 = ri(2, 8), n1 = ri(1, d1 - 1), n2 = ri(1, d2 - 1); return { text: n1 + "/" + d1 + " + " + n2 + "/" + d2, answer: frac(n1 * d2 + n2 * d1, d1 * d2) }; } },
  { id: "g5-dec-mul", grade: 5, name: "小数の かけ算", kind: "dec",
    make: () => { const a = round2(ri(11, 99) / 10), b = round2(ri(2, 9) / 10 + ri(0, 4)); return { text: a + " × " + b, answer: String(round2(a * b)) }; } },
  { id: "g5-percent", grade: 5, name: "割合（％）", kind: "num",
    make: () => {
      // 答えが小数にならない組み合わせだけを出す（20 の倍数なら 25% でも割り切れる）
      const base = ri(2, 40) * 20;
      const p = pick([10, 20, 25, 50, 75]);
      return { text: base + "円の " + p + "％ は なん円？", answer: String((base * p) / 100) };
    } },
  { id: "g5-average", grade: 5, name: "平均", kind: "num",
    make: () => {
      const n = ri(3, 5);
      const values = Array.from({ length: n }, () => ri(2, 20));
      const rest = values.reduce((s, v) => s + v, 0) % n;
      if (rest !== 0) values[0] += n - rest;
      const total = values.reduce((s, v) => s + v, 0);
      return { text: values.join("、") + " の 平均", answer: String(total / n) };
    } },
  { id: "g5-volume", grade: 5, name: "体積（直方体）", kind: "num",
    make: () => { const a = ri(2, 12), b = ri(2, 12), c = ri(2, 12); return { text: a + "cm × " + b + "cm × " + c + "cm の 体積（cm3）", answer: String(a * b * c) }; } },
  { id: "g5-rate", grade: 5, name: "単位量あたり", kind: "num",
    make: () => { const per = ri(30, 90), n = ri(2, 9); return { text: "1こ " + per + "円の おかしを " + n + "こ 買うと？", answer: String(per * n) }; } },

  // ---- 6年 ----------------------------------------------------------------
  { id: "g6-frac-mul", grade: 6, name: "分数の かけ算", kind: "frac",
    make: () => { const a = ri(1, 8), b = ri(2, 9), c = ri(1, 8), d = ri(2, 9); return { text: a + "/" + b + " × " + c + "/" + d, answer: frac(a * c, b * d) }; } },
  { id: "g6-frac-div", grade: 6, name: "分数の わり算", kind: "frac",
    make: () => { const a = ri(1, 8), b = ri(2, 9), c = ri(1, 8), d = ri(2, 9); return { text: a + "/" + b + " ÷ " + c + "/" + d, answer: frac(a * d, b * c) }; } },
  { id: "g6-ratio", grade: 6, name: "比を かんたんに", kind: "num",
    make: () => { const g = ri(2, 9), a = ri(2, 9), b = ri(2, 9); const A = a * g, B = b * g, s = gcd(A, B); return { text: A + " : " + B + " を かんたんに すると " + A / s + " : □", answer: String(B / s) }; } },
  { id: "g6-speed", grade: 6, name: "速さ", kind: "num",
    make: () => { const v = ri(3, 12) * 5, t = ri(2, 6); return { text: "時速 " + v + "km で " + t + "時間 すすむと なんkm？", answer: String(v * t) }; } },
  { id: "g6-circle", grade: 6, name: "円の 面積（3.14）", kind: "dec",
    make: () => { const r = ri(2, 10); return { text: "半径 " + r + "cm の 円の 面積（cm2）", answer: String(round2(r * r * 3.14)), hint: "半径 × 半径 × 3.14" }; } },
  { id: "g6-cases", grade: 6, name: "場合の数", kind: "num",
    make: () => {
      const fact = [1, 1, 2, 6, 24, 120];
      const style = ri(1, 3);
      if (style === 1) {
        const n = ri(3, 5);
        return { text: n + "人が 1れつに ならぶ ならびかたは なんとおり？", answer: String(fact[n]) };
      }
      if (style === 2) {
        const n = ri(4, 8);
        return { text: n + "人から 2人を えらぶ えらび方は なんとおり？", answer: String((n * (n - 1)) / 2) };
      }
      const n = ri(2, 5);
      return { text: "コインを " + n + "回 なげたとき、表と裏の 出方は なんとおり？", answer: String(Math.pow(2, n)) };
    } },
);

export function unitsOf(grade) {
  return UNITS.filter(u => u.grade === grade);
}

export function unitById(id) {
  return UNITS.find(u => u.id === id) || null;
}

function parseFrac(text) {
  const parts = String(text).split("/");
  if (parts.length !== 2) return null;
  const n = Number(parts[0]);
  const d = Number(parts[1]);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return { n, d };
}

/** 答え合わせ。分数は約分ちがいも正解にする（2/4 と 1/2 は同じ） */
export function isCorrect(unit, input, answer) {
  const given = String(input === undefined || input === null ? "" : input).trim();
  if (!given) return false;
  if (unit.kind === "choice") return given === answer;
  if (unit.kind === "frac") {
    const a = parseFrac(given);
    const b = parseFrac(answer);
    if (!a || !b) return false;
    return a.n * b.d === b.n * a.d;
  }
  if (unit.kind === "dec") return Math.abs(Number(given) - Number(answer)) < 0.005;
  return Number(given) === Number(answer);
}

/**
 * 同じ問題が重ならないための鍵。
 * 時計は文言が同じ（「なんじ？」）なので、針の位置まで見ないと重複判定にならない。
 */
export function keyOf(q) {
  return q.text + "|" + (q.clock ? q.clock.h + ":" + q.clock.m : "") + "|" + q.answer;
}

/** 1 回ぶんの問題をまとめて作る。同じ問題が続かないようにする */
export function makeSet(unit, count, variant) {
  const out = [];
  const seen = new Set();
  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard += 1;
    const q = unit.make(variant);
    const key = keyOf(q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  while (out.length < count) out.push(unit.make(variant));
  return out;
}
