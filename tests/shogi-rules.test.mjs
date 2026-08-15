/**
 * しょうぎの きまりの 検算。画面を つかわずに、駒の うごきだけを 数えて 確かめる。
 *
 *   node tests/shogi-rules.test.mjs        4 手ぶんまで（CI で 毎回 走らせる）
 *   node tests/shogi-rules.test.mjs 5      5 手ぶんまで（時間が かかる）
 *
 * 数え上げ（perft）の 正解は 公表されている 値。ここが 1 でも ずれたら
 * 駒の うごきか 王手の 判定が こわれている。
 */
import {
  initialState, fromSfen, legalMoves, perft, moveTo, moveDrop, moveFrom, movePromotes,
  encodeMove, doMove, undoMove, attacked, inCheck, moveText, P, L, SENTE, GOTE,
} from "../src/todo_app_frontend/src/shogi-rules.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

// --- 1. 数え上げ -------------------------------------------------------------

const EXPECTED = [1, 30, 900, 25470, 719731, 19861490];
const maxDepth = Number(process.argv[2] || 4);

for (let depth = 1; depth <= maxDepth; depth++) {
  const st = initialState();
  const started = Date.now();
  const got = perft(st, depth);
  const want = EXPECTED[depth];
  check(`はじめの局面 ${depth} 手ぶんの 合法手は ${want}`, got === want,
    `${got}（${((Date.now() - started) / 1000).toFixed(1)} 秒）`);
  check(`${depth} 手ぶん 数えたあと 局面が もとに もどっている`,
    st.hist.length === 0 && st.turn === SENTE);
}

// --- 2. 二歩 ---------------------------------------------------------------

{
  const st = fromSfen("4k4/9/9/9/9/9/4P4/9/4K4 b P 1");
  const drops = legalMoves(st).filter(m => moveDrop(m) === P);
  const sameFile = drops.filter(m => moveTo(m) % 9 === 4);
  check("自分の 歩が いる すじには 歩を 打てない", sameFile.length === 0, `${sameFile.length} 手`);
  check("ほかの すじには 歩を 打てる", drops.length > 0, `${drops.length} 手`);
  const lastRank = drops.filter(m => moveTo(m) < 9);
  check("いちばん おくの 段には 歩を 打てない", lastRank.length === 0);
}

// --- 3. 打ち歩詰め -----------------------------------------------------------

{
  // 後手玉 5一。両どなりは 後手の香で ふさがり、5三の 先手の金が 4二・5二・6二を 見ている。
  // 5二へ 歩を 打つと 詰みに なるので その手だけが 反則。香を 打つのは 反則ではない。
  const st = fromSfen("3lkl3/9/4G4/9/9/9/9/9/K8 b LP 1");
  const target = 1 * 9 + 4;
  const moves = legalMoves(st);
  const pawnDrop = moves.filter(m => moveDrop(m) === P && moveTo(m) === target);
  const lanceDrop = moves.filter(m => moveDrop(m) === L && moveTo(m) === target);
  check("歩を 打って 詰ませる手は 反則", pawnDrop.length === 0);
  check("香を 打って 詰ませる手は 反則では ない", lanceDrop.length === 1, `${lanceDrop.length} 手`);

  // 香を 打った あとは 本当に 詰んでいる（相手に 手が 無い）
  doMove(st, lanceDrop[0]);
  check("香を 打つと 後手に 手が 無い", legalMoves(st).length === 0);
  check("そのとき 後手玉には 王手が かかっている", inCheck(st, GOTE));
  undoMove(st);
  check("もどすと 手の数が 元に もどる", legalMoves(st).length === moves.length);
}

// --- 4. 行き所の ない 駒（成りが 強制される） --------------------------------

{
  const st = fromSfen("8k/4P4/9/9/9/9/9/9/K8 b - 1");
  const from = 1 * 9 + 4;
  const to = 4;
  const moves = legalMoves(st).filter(m => !moveDrop(m) && moveFrom(m) === from);
  check("いちばん おくへ 進む 歩は 成るしか ない",
    moves.length === 1 && moves[0] === encodeMove(from, to, 1), `${moves.length} 手`);
}

// --- 5. 王手を のこす手は 指せない -------------------------------------------

{
  // 5九の 先手玉に 5一の 飛車から 王手。逃げる 3 手と 5八に 合駒する 1 手だけ。
  const st = fromSfen("4r3k/9/9/9/9/9/9/9/3GK4 b - 1");
  check("先手玉に 王手が かかっている", inCheck(st, SENTE));
  const moves = legalMoves(st);
  check("王手を 外す手だけが のこる", moves.length === 4, `${moves.length} 手`);
  let allSafe = true;
  for (const m of moves) {
    doMove(st, m);
    if (attacked(st, st.king[SENTE], GOTE)) allSafe = false;
    undoMove(st);
  }
  check("のこった手は どれも 王手が 外れている", allSafe);
}

// --- 6. 棋譜の 書きかた -------------------------------------------------------

{
  const st = initialState();
  const moves = legalMoves(st);
  const push = moves.find(m => moveFrom(m) === 6 * 9 + 2 && moveTo(m) === 5 * 9 + 2);
  check("7六歩が ある", Boolean(push));
  check("棋譜は ▲７六歩", moveText(st, push, -1, moves) === "▲７六歩",
    moveText(st, push, -1, moves));
}

// --- 7. 取った駒は 元の 駒に もどって 持ち駒に なる ---------------------------

{
  const st = fromSfen("4k4/9/9/9/9/9/9/4+p4/4K4 b - 1");
  const from = 8 * 9 + 4;
  const to = 7 * 9 + 4;
  const capture = legalMoves(st).find(m => moveFrom(m) === from && moveTo(m) === to);
  check("と金を 玉で 取れる", Boolean(capture));
  doMove(st, capture);
  check("と金を 取ると 持ち駒は 歩に もどる", st.hands[SENTE][P] === 1, String(st.hands[SENTE][P]));
  undoMove(st);
  check("もどすと 持ち駒も 元に もどる", st.hands[SENTE][P] === 0);
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
