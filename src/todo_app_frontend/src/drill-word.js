/**
 * 文章題（ぶんしょうだい）を その場で 作る ところ。
 *
 * 計算の 単元（drill-data.js）と 同じ かたちの 単元を 返す:
 *   { id, grade, cat: "word", name, kind, make() }
 * make() が 返す 1 問には word: true が 付く。画面は それを 見て
 * 文を 読む ための 大きさ（.quiz-text.is-word）に 切りかえる。
 *
 * 文は i18n-drill-word.js の ひな型から 組み立てる。数は ここで 決めるので、
 * 英語でも 日本語でも 答えは 同じ。
 *
 * ねらい（アメリカの 2年生の プリントに 合わせた ところ）:
 *   - きまりを みつける 問題は、次の 数を あてずっぽうで 足す まちがいが
 *     そのまま 選択肢に 出る（1 つ 前に 足す / きざみを 倍に する / 2 倍に する）。
 *   - 文の 中に 名まえと ものを 入れて、毎回 ちがう 話に 見えるように する。
 */
import { t } from "./i18n";

const ri = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = items => items[Math.floor(Math.random() * items.length)];
const round2 = n => Math.round(n * 100) / 100;
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/** 「,」で 区切った 一覧を 読む。ことばを 変えたら その場で 引き直される */
const listOf = key => t(key).split(",");
const someName = () => pick(listOf("dr_wNames"));

/** 2 人の 名まえ。同じ人を くらべる 話に しない */
function twoNames() {
  const names = listOf("dr_wNames");
  const first = ri(0, names.length - 1);
  let second = ri(0, names.length - 2);
  if (second >= first) second += 1;
  return [names[first], names[second]];
}

/** もの。日本語だけが 助数詞（こ・まい）を 使うので「なまえ/助数詞」で 持つ */
function someThing() {
  const parts = pick(listOf("dr_wItems")).split("/");
  return { noun: parts[0], counter: parts[1] || "" };
}

const someGoods = () => pick(listOf("dr_wGoods"));
/** ねだんの 大きい しなもの。980円の あめ の ような 話に しない */
const someBigGoods = () => pick(listOf("dr_wBigGoods"));

/** 「2、4、6、8、□」。区切りは ことばに 合わせる（en は ", " / ja は "、"） */
function lineUp(numbers) {
  return numbers.concat("□").join(t("dr_listSep"));
}

function frac(n, d) {
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return n / g + "/" + d / g;
}

/**
 * きまりの 問題の えらぶ 4 つ。
 * まちがいの 3 つは、プリントの「よくある まちがい」を そのまま 形に した:
 *   きざみを 1 つ 飛ばす（+4d） / 前の 数に 小さい 数を 足す / 前の 数を 2 倍に する。
 */
function patternChoices(start, step) {
  const correct = start + 3 * step;
  const third = start + 2 * step;
  const wrong = [start + 4 * step, third + 3, third * 2, correct + 2, correct + step + 1];
  const out = [String(correct)];
  for (const value of wrong) {
    if (out.length >= 4) break;
    if (value === correct || value <= 0) continue;
    if (!out.includes(String(value))) out.push(String(value));
  }
  return shuffle(out);
}

const UNITS = [
  // ---- 1年 ------------------------------------------------------------------
  { id: "g1w-add", grade: 1, get name() { return t("dr_wu1Add"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const a = ri(2, 9);
      const b = ri(1, 9);
      return { text: t("dr_w1Add", someName(), noun, a, counter, b), answer: String(a + b) };
    } },
  { id: "g1w-sub", grade: 1, get name() { return t("dr_wu1Sub"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const a = ri(5, 18);
      const b = ri(1, a - 1);
      return { text: t("dr_w1Sub", someName(), noun, a, counter, b), answer: String(a - b) };
    } },
  { id: "g1w-diff", grade: 1, get name() { return t("dr_wu1Diff"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const [first, second] = twoNames();
      const big = ri(6, 18);
      const small = ri(1, big - 1);
      return { text: t("dr_w1Diff", first, big, second, small, counter, noun), answer: String(big - small) };
    } },
  { id: "g1w-missing", grade: 1, get name() { return t("dr_wu1Missing"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const start = ri(2, 9);
      const more = ri(1, 9);
      return { text: t("dr_w1Missing", someName(), noun, more, start + more, counter), answer: String(start) };
    } },
  { id: "g1w-pattern", grade: 1, get name() { return t("dr_wu1Pattern"); }, kind: "num",
    make: () => {
      // きざみと 出だしの 組み合わせを 広く とる。せまいと 10 問の うちに
      // 同じ ならびが もどって きて、きまりを 見つけずに 覚えて しまう
      const step = pick([2, 3, 4, 5, 10]);
      const start = ri(1, 12);
      const shown = [start, start + step, start + 2 * step, start + 3 * step];
      return { text: t("dr_w1Pattern", lineUp(shown)), answer: String(start + 4 * step) };
    } },

  // ---- 2年 ------------------------------------------------------------------
  { id: "g2w-pattern", grade: 2, get name() { return t("dr_wu2Pattern"); }, kind: "choice",
    make: () => {
      const step = ri(2, 12);
      const start = ri(2, 12);
      const story = pick(["dr_w2Pat1", "dr_w2Pat2", "dr_w2Pat3", "dr_w2Pat4"]);
      return {
        text: t(story, someName(), start, start + step, start + 2 * step),
        answer: String(start + 3 * step),
        choices: patternChoices(start, step),
      };
    } },
  { id: "g2w-add", grade: 2, get name() { return t("dr_wu2Add"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const a = ri(11, 60);
      const b = ri(11, 99 - a);
      return { text: t("dr_w2Add", someName(), a, noun, b, counter), answer: String(a + b) };
    } },
  { id: "g2w-sub", grade: 2, get name() { return t("dr_wu2Sub"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const total = ri(30, 99);
      const taken = ri(11, total - 10);
      return { text: t("dr_w2Sub", someName(), total, noun, taken, counter), answer: String(total - taken) };
    } },
  { id: "g2w-mul", grade: 2, get name() { return t("dr_wu2Mul"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const bags = ri(2, 9);
      const each = ri(2, 9);
      return { text: t("dr_w2Mul", "", bags, each, noun, counter), answer: String(bags * each) };
    } },
  { id: "g2w-money", grade: 2, get name() { return t("dr_wu2Money"); }, kind: "num",
    make: () => {
      const have = ri(5, 20) * 10;
      const price = ri(2, have / 10 - 1) * 10;
      return { text: t("dr_w2Money", someName(), have, someGoods(), price), answer: String(have - price) };
    } },
  { id: "g2w-len", grade: 2, get name() { return t("dr_wu2Len"); }, kind: "num",
    make: () => {
      const blue = ri(20, 95);
      const shorter = ri(5, blue - 5);
      return { text: t("dr_w2Len", blue, shorter), answer: String(blue - shorter) };
    } },
];

UNITS.push(
  // ---- 3年 ------------------------------------------------------------------
  { id: "g3w-div", grade: 3, get name() { return t("dr_wu3Div"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const people = ri(2, 9);
      const each = ri(2, 9);
      return { text: t("dr_w3Div", "", people * each, noun, people, counter), answer: String(each) };
    } },
  { id: "g3w-rem", grade: 3, get name() { return t("dr_wu3Rem"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const per = ri(3, 9);
      const boxes = ri(3, 9);
      const left = ri(1, per - 1);
      const total = per * boxes + left;
      // あまりを きく 形と、はこが いくつ いるかを きく 形。
      // どちらも 同じ わり算だが、答えは あまり と 切り上げで ちがう
      return ri(0, 1) === 1
        ? { text: t("dr_w3Rem", total, noun, per, counter), answer: String(left) }
        : { text: t("dr_w3Box", total, noun, per, counter), answer: String(boxes + 1) };
    } },
  { id: "g3w-mul", grade: 3, get name() { return t("dr_wu3Mul"); }, kind: "num",
    make: () => {
      const { noun, counter } = someThing();
      const boxes = ri(2, 9);
      const each = ri(12, 49);
      return { text: t("dr_w3Mul", boxes, each, noun, counter), answer: String(boxes * each) };
    } },
  { id: "g3w-change", grade: 3, get name() { return t("dr_wu3Change"); }, kind: "num",
    make: () => {
      const pay = pick([500, 1000]);
      const price = ri(3, 30) * 10;
      return { text: t("dr_w3Change", someName(), pay, someGoods(), price), answer: String(pay - price) };
    } },
  { id: "g3w-pattern", grade: 3, get name() { return t("dr_wu3Pattern"); }, kind: "num",
    make: () => {
      if (ri(1, 3) === 1) {
        // 2 ばいずつ ふえる ならび
        const start = ri(2, 6);
        const shown = [start, start * 2, start * 4, start * 8];
        return { text: t("dr_w3Pattern", lineUp(shown)), answer: String(start * 16) };
      }
      const step = ri(6, 25);
      const start = ri(3, 40);
      const shown = [start, start + step, start + 2 * step, start + 3 * step];
      return { text: t("dr_w3Pattern", lineUp(shown)), answer: String(start + 4 * step) };
    } },

  // ---- 4年 ------------------------------------------------------------------
  { id: "g4w-div", grade: 4, get name() { return t("dr_wu4Div"); }, kind: "num",
    make: () => {
      const classes = ri(3, 9);
      const each = ri(15, 60);
      return { text: t("dr_w4Div", classes * each, classes), answer: String(each) };
    } },
  { id: "g4w-times", grade: 4, get name() { return t("dr_wu4Times"); }, kind: "num",
    make: () => {
      const red = ri(4, 20);
      const times = ri(3, 9);
      return ri(0, 1) === 1
        ? { text: t("dr_w4TimesMul", red, times), answer: String(red * times) }
        : { text: t("dr_w4TimesDiv", red * times, red), answer: String(times) };
    } },
  { id: "g4w-dec", grade: 4, get name() { return t("dr_wu4Dec"); }, kind: "dec",
    make: () => {
      const a = round2(ri(5, 25) / 10);
      const b = round2(ri(5, 25) / 10);
      return { text: t("dr_w4Dec", someName(), a, b), answer: String(round2(a + b)) };
    } },
  { id: "g4w-area", grade: 4, get name() { return t("dr_wu4Area"); }, kind: "num",
    make: () => {
      const long = ri(4, 20);
      const wide = ri(3, 15);
      return { text: t("dr_w4Area", long, wide), answer: String(long * wide) };
    } },
  { id: "g4w-round", grade: 4, get name() { return t("dr_wu4Round"); }, kind: "num",
    make: () => {
      const people = ri(1000, 9999);
      return { text: t("dr_w4Round", people), answer: String(Math.round(people / 100) * 100), hint: t("dr_hRound") };
    } },
);

UNITS.push(
  // ---- 5年 ------------------------------------------------------------------
  { id: "g5w-percent", grade: 5, get name() { return t("dr_wu5Percent"); }, kind: "num",
    make: () => {
      // 答えが 小数に ならない 組み合わせだけを 出す（20 の ばいすうなら 25％ でも 割り切れる）
      const total = ri(3, 40) * 20;
      const percent = pick([10, 20, 25, 50, 75]);
      return { text: t("dr_w5Percent", total, percent), answer: String((total * percent) / 100) };
    } },
  { id: "g5w-average", grade: 5, get name() { return t("dr_wu5Average"); }, kind: "num",
    make: () => {
      const days = ri(3, 6);
      const each = ri(10, 40);
      return { text: t("dr_w5Average", someName(), days * each, days), answer: String(each) };
    } },
  { id: "g5w-rate", grade: 5, get name() { return t("dr_wu5Rate"); }, kind: "num",
    make: () => {
      const count = ri(2, 9);
      const one = ri(20, 90);
      return { text: t("dr_w5Rate", count, count * one), answer: String(one) };
    } },
  { id: "g5w-decmul", grade: 5, get name() { return t("dr_wu5DecMul"); }, kind: "dec",
    make: () => {
      const price = ri(20, 90);
      const metres = round2(ri(12, 45) / 10);
      return { text: t("dr_w5DecMul", price, metres), answer: String(round2(price * metres)) };
    } },
  { id: "g5w-volume", grade: 5, get name() { return t("dr_wu5Volume"); }, kind: "num",
    make: () => {
      const long = ri(5, 30);
      const wide = ri(5, 20);
      const deep = ri(5, 20);
      return { text: t("dr_w5Volume", long, wide, deep), answer: String(long * wide * deep) };
    } },

  // ---- 6年 ------------------------------------------------------------------
  { id: "g6w-speed", grade: 6, get name() { return t("dr_wu6Speed"); }, kind: "num",
    make: () => {
      const perHour = ri(6, 18) * 5;
      const hours = ri(2, 6);
      return ri(0, 1) === 1
        ? { text: t("dr_w6SpeedRate", perHour * hours, hours), answer: String(perHour) }
        : { text: t("dr_w6SpeedDist", perHour, hours), answer: String(perHour * hours) };
    } },
  { id: "g6w-ratio", grade: 6, get name() { return t("dr_wu6Ratio"); }, kind: "num",
    make: () => {
      // 同じ 数どうしの 比（3 : 3）は 話に ならないので ずらす
      const juicePart = ri(2, 7);
      let waterPart = ri(2, 6);
      if (waterPart >= juicePart) waterPart += 1;
      const unit = ri(10, 50);
      return { text: t("dr_w6Ratio", juicePart, waterPart, juicePart * unit), answer: String(waterPart * unit) };
    } },
  { id: "g6w-frac", grade: 6, get name() { return t("dr_wu6Frac"); }, kind: "frac",
    make: () => {
      // のこりが かならず 0 より 大きくなる 組み合わせを えらぶ。
      // 出て こなければ 3/4 と 1/4 に 落とす（答えの 無い 問題を 出さない）
      let d1 = 4;
      let d2 = 4;
      let n1 = 3;
      let n2 = 1;
      for (let guard = 0; guard < 40; guard += 1) {
        const a1 = ri(2, 8);
        const a2 = ri(2, 8);
        const b1 = ri(1, a1 - 1);
        const b2 = ri(1, a2 - 1);
        if (b1 * a2 > b2 * a1) {
          d1 = a1; d2 = a2; n1 = b1; n2 = b2;
          break;
        }
      }
      // 4/8 の ような 書き方は 教科書に 出ないので、文の 中でも 約分して 見せる
      return { text: t("dr_w6Frac", frac(n1, d1), frac(n2, d2)), answer: frac(n1 * d2 - n2 * d1, d1 * d2) };
    } },
  { id: "g6w-discount", grade: 6, get name() { return t("dr_wu6Discount"); }, kind: "num",
    make: () => {
      const price = ri(5, 50) * 20;
      const off = pick([10, 20, 25, 50]);
      return { text: t("dr_w6Discount", someBigGoods(), price, off), answer: String((price * (100 - off)) / 100) };
    } },
  { id: "g6w-cases", grade: 6, get name() { return t("dr_wu6Cases"); }, kind: "num",
    make: () => {
      const shirts = ri(2, 6);
      const hats = ri(2, 5);
      return { text: t("dr_w6Cases", someName(), shirts, hats), answer: String(shirts * hats) };
    } },
);

/**
 * 画面が 見分けられるように、どの 1 問にも word: true を 付けて 返す。
 * 単元の がわには cat: "word" を 付ける（トップの 切りかえが これで 分ける）。
 */
export const WORD_UNITS = UNITS.map(unit => ({
  ...unit,
  cat: "word",
  get name() { return unit.name; },
  make: variant => ({ ...unit.make(variant), word: true }),
}));
