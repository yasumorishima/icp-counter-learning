/**
 * しょうぎの 検査用の 一局を つくる（e2e/fixtures/ に 書き出す）。
 *
 *   node scripts/make-shogi-fixtures.mjs
 *
 * つくる もの:
 *   repetition-draw.json  おなじ ばんめんが 4 かい（王手なし）＝ひきわけ
 *   repetition-check.json 連続王手の 千日手＝王手を かけつづけた ほうの まけ
 *   jishogi-not-yet.json  玉は じんちに 入ったが まだ おわりに できない
 *   jishogi-draw.json     てんすうで ひきわけに できる ところ
 *   jishogi-win.json      てんすうで かちに できる ところ
 *
 * 手は すべて 自前の きまりで つくり、書き出す 前に 外の しくみ（tsshogi）で
 * 「初手から ぜんぶ 指せる」「判決が ねらいどおり」ことを たしかめる。
 */
import { writeFileSync } from "node:fs";
import {
  Record, Position, Color, JishogiDeclarationRule, JishogiDeclarationResult,
  judgeJishogiDeclaration, countJishogiDeclarationPoint,
} from "tsshogi";
import {
  initialState, legalMoves, doMove, undoMove, positionKey, toUsi, toSfen, moveTo,
  typeOf, colorOf, inCheck, inZone, SENTE, GOTE, K, R as ROOK, B as BISHOP,
} from "../src/todo_app_frontend/src/shogi-rules.mjs";
import { refereed } from "../src/todo_app_frontend/src/shogi-referee.js";

const VALUE = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 8, 7: 9, 8: 0, 9: 1, 10: 2, 11: 2, 12: 3, 14: 8, 15: 9 };
const other = color => (color === SENTE ? GOTE : SENTE);

/** その手を 指しても 勝負が つかない（あいてに 手が のこる）か */
function keepsGoing(st, m) {
  doMove(st, m);
  const ok = legalMoves(st).length > 0;
  undoMove(st);
  return ok;
}

/** 王手を かけない・勝負を つけない 手だけ */
function calmMoves(st) {
  return legalMoves(st).filter(m => {
    doMove(st, m);
    const quiet = !inCheck(st, st.turn) && legalMoves(st).length > 0;
    undoMove(st);
    return quiet;
  });
}

function play(st, moves, m) {
  doMove(st, m);
  moves.push(m);
}

/** ごての 駒（玉いがい）を 何まい のこして いるか */
function goteLeft(st) {
  let n = 0;
  for (let sq = 0; sq < 81; sq++) {
    const p = st.board[sq];
    if (p && colorOf(p) === GOTE && typeOf(p) !== K) n++;
  }
  return n;
}

/** その色の 駒（玉いがい）の ます */
function pieceSquares(st, color) {
  const list = [];
  for (let sq = 0; sq < 81; sq++) {
    const p = st.board[sq];
    if (p && colorOf(p) === color && typeOf(p) !== K) list.push(sq);
  }
  return list;
}

const spread = (a, b) => Math.max(Math.abs(((a / 9) | 0) - ((b / 9) | 0)), Math.abs((a % 9) - (b % 9)));

/** あいての 駒に いちばん 近づける 手（駒どうしを 出会わせて 取り合いを 起こす） */
function approach(st, color) {
  const foes = pieceSquares(st, other(color));
  if (!foes.length) return null;
  let best = null;
  let bestNear = 99;
  for (const m of calmMoves(st)) {
    const to = moveTo(m);
    let near = 99;
    for (const f of foes) near = Math.min(near, spread(to, f));
    if (near < bestNear) {
      bestNear = near;
      best = m;
    }
  }
  return best;
}

/**
 * ごてが わざと 駒を 差し出し、せんてが 取る。
 * ごての 駒が 玉だけに なるまで つづける（勝負は つけない）。
 */
function captureAll(st, moves, limit) {
  while (goteLeft(st) > 0 && moves.length < limit) {
    if (st.turn === SENTE) {
      const caps = calmMoves(st)
        .filter(m => st.board[moveTo(m)] !== 0)
        .sort((a, b) => VALUE[typeOf(st.board[moveTo(b)])] - VALUE[typeOf(st.board[moveTo(a)])]);
      const pick = caps[0] || approach(st, SENTE) || calmMoves(st)[0];
      if (!pick) return false;
      play(st, moves, pick);
      continue;
    }
    // ごて: つぎに せんてが いちばん 大きい駒を 取れる 手を えらぶ。
    // どれも 取られない なら せんての 駒に 近づいて 取り合いを 起こす。
    let best = null;
    let bestGain = 0;
    for (const m of calmMoves(st)) {
      doMove(st, m);
      let gain = 0;
      for (const s of legalMoves(st)) {
        const target = st.board[moveTo(s)];
        if (target && colorOf(target) === GOTE) gain = Math.max(gain, VALUE[typeOf(target)]);
      }
      undoMove(st);
      if (gain > bestGain) {
        bestGain = gain;
        best = m;
      }
    }
    const pick = best || approach(st, GOTE) || calmMoves(st)[0];
    if (!pick) return false;
    play(st, moves, pick);
  }
  return goteLeft(st) === 0;
}

const posOf = st => Position.newBySFEN(toSfen(st));
const colorOfSide = color => (color === SENTE ? Color.BLACK : Color.WHITE);

function pointsOf(st, color) {
  const pos = posOf(st);
  return pos ? countJishogiDeclarationPoint(pos, colorOfSide(color)) : 0;
}

function verdictOf(st, color) {
  const pos = posOf(st);
  if (!pos) return null;
  const v = judgeJishogiDeclaration(JishogiDeclarationRule.GENERAL24, pos, colorOfSide(color));
  if (v === JishogiDeclarationResult.WIN) return "win";
  if (v === JishogiDeclarationResult.DRAW) return "draw";
  return null;
}

function insideCount(st, color) {
  let n = 0;
  for (let sq = 0; sq < 81; sq++) {
    const p = st.board[sq];
    if (!p || colorOf(p) !== color || typeOf(p) === K) continue;
    if (inZone(color, sq)) n++;
  }
  return n;
}

function forwardness(st, color) {
  let sum = 0;
  for (let sq = 0; sq < 81; sq++) {
    const p = st.board[sq];
    if (p && colorOf(p) === color) sum += color === SENTE ? (sq / 9) | 0 : 8 - ((sq / 9) | 0);
  }
  return sum;
}

const dist = (a, b) => Math.abs(((a / 9) | 0) - ((b / 9) | 0)) + Math.abs((a % 9) - (b % 9));

/**
 * せんてが 玉と 駒を あいての じんちへ はこぶ。
 * せんての ばんに なるたびに 判決を みて、ねらいの ところで 手のならびを 控える。
 */
function marchIn(st, moves, limit, snap, wantPoint) {
  while (moves.length < limit) {
    if (st.turn === SENTE) {
      snap(moves, st);
      if (snap.done) return true;
      let best = null;
      let bestScore = -Infinity;
      for (const m of calmMoves(st)) {
        doMove(st, m);
        const kingIn = inZone(SENTE, st.king[SENTE]) ? 1 : 0;
        // 玉を さきに じんちへ 入れる（まだ できない ところも 検査に つかうため）。
        // wantPoint を きめた ときは その てんすうに 近づける（ひきわけの 24〜30 てんを つくるため）
        const pts = pointsOf(st, SENTE);
        const ptTerm = wantPoint === null || wantPoint === undefined
          ? pts * 10
          : -Math.abs(pts - wantPoint) * 50;
        const score = kingIn * 100000 - (((st.king[SENTE] / 9) | 0) * 1000) +
          Math.min(insideCount(st, SENTE), 10) * 100 + ptTerm - forwardness(st, SENTE) * 0.2;
        undoMove(st);
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
      if (!best) return false;
      play(st, moves, best);
      continue;
    }
    // ごて: せんての 玉から はなれる ように 動く（じゃまを しない）
    let best = null;
    let bestFar = -1;
    for (const m of calmMoves(st)) {
      doMove(st, m);
      const far = dist(st.king[GOTE], st.king[SENTE]);
      undoMove(st);
      if (far > bestFar) {
        bestFar = far;
        best = m;
      }
    }
    if (!best) return false;
    play(st, moves, best);
  }
  return false;
}

/**
 * いまの 手番の 側が 王手を かけつづけて 元の ばんめんに もどる ならびを さがす。
 * みつかれば その ならび（1 まわりぶん）を かえす。
 */
function findPerpetual(st, maxPairs) {
  const startKey = positionKey(st);
  const mover = st.turn;
  const path = [];
  const dfs = depth => {
    if (depth > 0 && st.turn === mover && positionKey(st) === startKey) return true;
    if (depth >= maxPairs * 2) return false;
    for (const m of legalMoves(st)) {
      doMove(st, m);
      const gaveCheck = st.turn !== mover ? inCheck(st, st.turn) : true;
      const alive = legalMoves(st).length > 0;
      if (gaveCheck && alive) {
        path.push(m);
        if (dfs(depth + 1)) {
          undoMove(st);
          return true;
        }
        path.pop();
      }
      undoMove(st);
    }
    return false;
  };
  return dfs(0) ? path.slice() : null;
}

function byUsi(st, usi) {
  const m = legalMoves(st).find(x => toUsi(x) === usi);
  if (!m) throw new Error("その手は 指せない: " + usi);
  return m;
}

/** はじめから 指し直して、審判も 認める ことと 判決を たしかめる */
function validate(moves) {
  const st = initialState();
  const keys = [positionKey(st)];
  for (const m of moves) {
    if (!refereed(st, legalMoves(st)).includes(m)) {
      return { ok: false, why: "審判が 認めない手: " + toUsi(m) };
    }
    doMove(st, m);
    keys.push(positionKey(st));
  }
  const last = keys[keys.length - 1];
  const rec = Record.newByUSI("position startpos moves " + moves.map(toUsi).join(" "));
  if (rec instanceof Error) return { ok: false, why: "OSS が 読めない: " + String(rec) };
  const perpetual = rec.perpetualCheck;
  return {
    ok: true,
    st,
    same: keys.filter(k => k === last).length,
    fourfold: rec.repetition,
    checker: perpetual === Color.BLACK ? SENTE : perpetual === Color.WHITE ? GOTE : null,
    verdict: verdictOf(st, st.turn),
    point: pointsOf(st, st.turn),
    inside: insideCount(st, st.turn),
    turn: st.turn,
  };
}

const outDir = new URL("../e2e/fixtures/", import.meta.url);
const write = (name, data) => {
  writeFileSync(new URL(name, outDir), JSON.stringify(data, null, 2) + "\n");
  console.log("  書き出し: " + name + "（" + data.moves.length + " 手）");
};

// 1) ふつうの 千日手（金を 往復させて おなじ ばんめんを 4 かい 出す。銀は 真うしろに もどれない）
console.log("千日手（王手なし）:");
{
  const st = initialState();
  const moves = [];
  for (let i = 0; i < 3; i++) {
    for (const usi of ["6i6h", "4a4b", "6h6i", "4b4a"]) play(st, moves, byUsi(st, usi));
  }
  const v = validate(moves);
  if (!v.ok || v.same !== 4 || !v.fourfold || v.checker !== null) {
    throw new Error("千日手に ならない: " + JSON.stringify(v));
  }
  write("repetition-draw.json", { moves, same: v.same, checker: null });
}

// 2) 連続王手の 千日手
console.log("連続王手の 千日手:");
const prefix = [];
{
  const st = initialState();
  if (!captureAll(st, prefix, 460)) {
    throw new Error("ごての 駒を 取り切れない（のこり " + goteLeft(st) + " まい / " + prefix.length + " 手 / " + toSfen(st) + "）");
  }
  console.log("  ごての 駒を 取り切るまで " + prefix.length + " 手");
}
{
  const st = initialState();
  const moves = [];
  for (const m of prefix) play(st, moves, m);
  if (st.turn !== SENTE) {
    const wait = calmMoves(st)[0];
    if (!wait) throw new Error("ごてに 動く手が ない");
    play(st, moves, wait);
  }
  const cycle = findPerpetual(st, 3);
  if (!cycle) throw new Error("王手の くりかえしが みつからない");
  console.log("  くりかえしの 長さ: " + cycle.length + " 手");
  for (let i = 0; i < 3; i++) for (const m of cycle) play(st, moves, m);
  const v = validate(moves);
  if (!v.ok || v.same !== 4 || !v.fourfold || v.checker === null) {
    throw new Error("連続王手に ならない: " + JSON.stringify(v));
  }
  write("repetition-check.json", { moves, same: v.same, checker: v.checker });
}

// 3) 入玉（まだ できない / ひきわけ / かち）
console.log("入玉:");
{
  const shots = {};
  const runFrom = (wantPoint, keys) => {
    const st = initialState();
    const moves = [];
    for (const m of prefix) play(st, moves, m);
    const snap = (list, state) => {
      if (state.king[SENTE] < 0 || !inZone(SENTE, state.king[SENTE])) return;
      const v = verdictOf(state, SENTE);
      if (keys.includes("notYet") && !shots.notYet && v === null) shots.notYet = list.slice();
      if (keys.includes("draw") && !shots.draw && v === "draw") shots.draw = list.slice();
      if (keys.includes("win") && !shots.win && v === "win") shots.win = list.slice();
      snap.done = keys.every(k => shots[k]);
    };
    marchIn(st, moves, 520, snap, wantPoint);
    console.log("  てんすう " + (wantPoint === null ? "できるだけ 多く" : "27 あたり") +
      " で さがした: " + keys.filter(k => shots[k]).join(",") + " が とれた");
  };
  runFrom(27, ["notYet", "draw"]);
  runFrom(null, ["win"]);

  for (const [name, key, want] of [
    ["jishogi-not-yet.json", "notYet", null],
    ["jishogi-draw.json", "draw", "draw"],
    ["jishogi-win.json", "win", "win"],
  ]) {
    const list = shots[key];
    if (!list) throw new Error(key + " の ところに とどかない");
    const v = validate(list);
    if (!v.ok || v.turn !== SENTE || v.verdict !== want) {
      throw new Error(name + " の 判決が ちがう: " + JSON.stringify(v));
    }
    write(name, { moves: list, verdict: want, point: v.point, inside: v.inside });
  }
}

console.log("できました。");
