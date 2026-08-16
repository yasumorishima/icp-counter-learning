/**
 * おわりかたの 検算: 千日手（ふつう／連続王手の ちがい）と 入玉の 申し込み。
 *
 *   node tests/shogi-endings.test.mjs
 *
 * 判決そのものは 外の OSS（tsshogi・MIT）に 出させて いるので、ここでは
 *  ・自前の 見つけかた（おなじ ばんめん 4 かい）が OSS の 数えかたと そろって いるか
 *  ・しきい値の きわ（30/31 てん・じんちの こま 9/10 まい・王手中・あいての ばん）で 判決が 変わるか
 *  ・あいてが 連続王手の 千日手を さける／勝てる ときは しかけを 閉じる か
 * を 見る。手のならびは e2e/fixtures/ の 一局（scripts/make-shogi-fixtures.mjs で つくる）。
 */
import { readFileSync } from "node:fs";
import { Record } from "tsshogi";
import {
  initialState, fromSfen, legalMoves, doMove, positionKey, cloneState, toUsi, SENTE, GOTE,
} from "../src/todo_app_frontend/src/shogi-rules.mjs";
import {
  refereed, repetitionVerdict, declarationVerdict, declarationPoint, repetitionScore,
} from "../src/todo_app_frontend/src/shogi-referee.js";
import { chooseMove, MATE } from "../src/todo_app_frontend/src/shogi-ai.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const fixture = name => JSON.parse(readFileSync(new URL("../e2e/fixtures/" + name, import.meta.url), "utf8"));

/** はじめから 指し直す。審判が 認めない手が あれば その ところで 止める */
function replay(moves) {
  const st = initialState();
  const keys = [positionKey(st)];
  let bad = null;
  for (const m of moves) {
    if (!refereed(st, legalMoves(st)).includes(m)) {
      bad = toUsi(m);
      break;
    }
    doMove(st, m);
    keys.push(positionKey(st));
  }
  return { st, keys, bad };
}

const times = (keys, key) => keys.filter(k => k === key).length;

// --- 1. 入玉の 申し込み: しきい値の きわ ---------------------------------------

// 4 きん + 玉 + 4 ぎん + 2 けい ＝ じんちに 10 まい。もちごまで てんすうを 変える
const CAMP = "GGGGKSSSS/NN7/9/9/9/9/9/9/4k4";
const NINE = "GGGGKSSS1/NN7/9/9/9/9/9/9/4k4";
const OUTSIDE = "GGGG1SSSS/NN7/9/4K4/9/9/9/9/4k4";
const CHECKED = "GGGGKSSSS/NN7/9/9/9/9/9/9/4r3k";

check("30 てんは ひきわけに できる", declarationVerdict(fromSfen(CAMP + " b 2R2B 1"), SENTE) === "draw",
  String(declarationVerdict(fromSfen(CAMP + " b 2R2B 1"), SENTE)));
check("てんすうの 数えかたが 合う", declarationPoint(fromSfen(CAMP + " b 2R2B 1"), SENTE) === 30,
  String(declarationPoint(fromSfen(CAMP + " b 2R2B 1"), SENTE)));
check("31 てんに なると かちに できる", declarationVerdict(fromSfen(CAMP + " b 2R2BP 1"), SENTE) === "win");
check("23 てんでは できない（24 てん みまん）", declarationVerdict(fromSfen(CAMP + " b RB3P 1"), SENTE) === null,
  "てん=" + declarationPoint(fromSfen(CAMP + " b RB3P 1"), SENTE));
check("じんちの こまが 9 まいでは できない", declarationVerdict(fromSfen(NINE + " b 2R2BP 1"), SENTE) === null);
check("玉が じんちに いないと できない", declarationVerdict(fromSfen(OUTSIDE + " b 2R2BP 1"), SENTE) === null);
check("王手が かかって いると できない", declarationVerdict(fromSfen(CHECKED + " b 2R2BP 1"), SENTE) === null);
check("あいての ばんでは できない", declarationVerdict(fromSfen(CAMP + " w 2R2BP 1"), SENTE) === null);
check("はじめの 局面では できない", declarationVerdict(initialState(), SENTE) === null);

// --- 2. 千日手: 自前の 見つけかたが OSS と そろっているか -----------------------

for (const [name, file] of [["ふつうの 千日手", "repetition-draw.json"], ["連続王手の 千日手", "repetition-check.json"]]) {
  const data = fixture(file);
  const { st, keys, bad } = replay(data.moves);
  check(name + ": 審判が すべての 手を 認める", bad === null, bad || "");
  const mine = times(keys, keys[keys.length - 1]);
  check(name + ": 自前の 数えかたで 4 かいめ", mine === 4, String(mine));

  // OSS の 数えかたと 1 手ずつ くらべる
  const rec = new Record();
  let gap = null;
  let ply = 0;
  for (const m of data.moves) {
    const mv = rec.position.createMoveByUSI(toUsi(m));
    if (!mv || !rec.append(mv)) {
      gap = toUsi(m) + " を OSS が 指せない";
      break;
    }
    ply++;
    const ossCount = rec.getRepetitionCount(rec.position);
    const myCount = times(keys.slice(0, ply + 1), keys[ply]);
    if (ossCount !== myCount) {
      gap = `${ply} 手目 自前 ${myCount} / OSS ${ossCount}`;
      break;
    }
  }
  check(name + ": 1 手ずつ 数が そろう", gap === null, gap || `${ply} 手`);

  const verdict = repetitionVerdict(data.moves);
  check(name + ": 4 かいめだと 審判も 言う", verdict.known && verdict.fourfold);
  check(name + ": 王手を つづけた ほうの 判決", verdict.checker === data.checker,
    `checker=${verdict.checker} / fixture=${data.checker}`);
  check(name + ": 手が のこって いる（詰みでは ない）", legalMoves(st).length > 0);
}

// --- 3. 入玉の 一局 -----------------------------------------------------------

for (const [name, file] of [
  ["まだ できない", "jishogi-not-yet.json"],
  ["ひきわけに できる", "jishogi-draw.json"],
  ["かちに できる", "jishogi-win.json"],
]) {
  const data = fixture(file);
  const { st, bad } = replay(data.moves);
  check("入玉（" + name + "）: 審判が すべての 手を 認める", bad === null, bad || "");
  check("入玉（" + name + "）: せんての ばん", st.turn === SENTE);
  check("入玉（" + name + "）: 判決", declarationVerdict(st, SENTE) === data.verdict,
    String(declarationVerdict(st, SENTE)));
  check("入玉（" + name + "）: てんすう", declarationPoint(st, SENTE) === data.point,
    String(declarationPoint(st, SENTE)));
}

// --- 4. あいての えらびかた（連続王手の 千日手を 読ませずに 教える）--------------

{
  const data = fixture("repetition-check.json");
  const all = data.moves;
  const checker = data.checker; // 王手を つづけて いる 側（この 側が まけ）
  const waiting = checker === SENTE ? GOTE : SENTE;

  // (a) 王手を かけられて いる 側は、しかけを 閉じて かてる
  {
    const head = all.slice(0, -1);
    const { st, keys } = replay(head);
    const closing = all[all.length - 1];
    const probe = cloneState(st);
    doMove(probe, closing);
    const score = repetitionScore(keys, head, waiting, probe, closing, MATE);
    check("しかけを 閉じる手は かちの 点", score === MATE, String(score));

    const rootScore = (s, m) => repetitionScore(keys, head, waiting, s, m, MATE);
    const picked = await chooseMove(cloneState(st), 3, { budget: 400, rootScore });
    const after = cloneState(st);
    doMove(after, picked);
    const closed = times(keys.concat([positionKey(after)]), positionKey(after)) >= 4;
    const verdict = repetitionVerdict(head.concat([picked]));
    check("あいては その手を えらぶ", closed && verdict.checker === checker,
      toUsi(picked) + " closed=" + closed + " checker=" + verdict.checker);
  }

  // (b) 王手を つづけて いる 側は、つぎに 閉じられる 手を さける
  {
    const head = all.slice(0, -2);
    const { st, keys } = replay(head);
    const again = all[all.length - 2];
    const probe = cloneState(st);
    doMove(probe, again);
    const score = repetitionScore(keys, head, checker, probe, again, MATE);
    check("つぎに 閉じられる 手は まけの 点", score === -MATE, String(score));

    const rootScore = (s, m) => repetitionScore(keys, head, checker, s, m, MATE);
    const picked = await chooseMove(cloneState(st), 3, { budget: 400, rootScore });
    check("あいては 王手の くりかえしを やめる", picked !== again, toUsi(picked));

    // わざと 外す つよさ（よわい）でも、まけに なる手だけは えらばない
    let blundered = null;
    for (const seed of [0, 1, 2, 3, 4]) {
      let x = seed;
      const random = () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return (x / 2147483648) * 0.3; // かならず わざと 外す ほうへ
      };
      const move = await chooseMove(cloneState(st), 1, { random, rootScore });
      const test = cloneState(st);
      doMove(test, move);
      if (repetitionScore(keys, head, checker, test, move, MATE) === -MATE) blundered = toUsi(move);
    }
    check("よわい あいてでも まけに なる手は えらばない", blundered === null, blundered || "");
  }
}

// (c) 王手で ない 千日手は 引き分けの 点
{
  const data = fixture("repetition-draw.json");
  const head = data.moves.slice(0, -1);
  const { st, keys } = replay(head);
  const closing = data.moves[data.moves.length - 1];
  const probe = cloneState(st);
  doMove(probe, closing);
  check("ふつうの 千日手は 引き分けの 点",
    repetitionScore(keys, head, SENTE, probe, closing, MATE) === 0,
    String(repetitionScore(keys, head, SENTE, probe, closing, MATE)));
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
