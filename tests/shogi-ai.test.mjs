/**
 * あいての 検算。反則手を 指さないか、詰みを 見つけられるか、待ち時間は みじかいか。
 *
 *   node tests/shogi-ai.test.mjs
 */
import {
  initialState, fromSfen, legalMoves, doMove, moveTo, moveDrop, moveText, L, GOTE, SENTE, inCheck,
} from "../src/todo_app_frontend/src/shogi-rules.mjs";
import { chooseMove, evaluate, LEVELS } from "../src/todo_app_frontend/src/shogi-ai.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

// おなじ 手順を くり返せるように、決まった 数を つかう
function seeded(seed) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

// --- 1. 詰みを 見つける -------------------------------------------------------

{
  // 5二へ 香を 打つと 詰み（5三の 金が 5二を まもっている）
  const st = fromSfen("3lkl3/9/4G4/9/9/9/9/9/K8 b L 1");
  const want = legalMoves(st).find(m => moveDrop(m) === L && moveTo(m) === 1 * 9 + 4);
  const got = await chooseMove(st, 3, { random: seeded(1) });
  check("1 手で 詰む ときは その手を えらぶ", got === want, moveText(st, got, -1));
}

{
  // 5二へ 金を 打つと 詰み（4三の 銀が 5二を まもっている）
  const st = fromSfen("3lkl3/9/5S3/9/9/9/9/9/K8 b G 1");
  const got = await chooseMove(st, 3, { random: seeded(2) });
  const text = moveText(st, got, -1);
  doMove(st, got);
  check("べつの 1 手詰めも 見つける", legalMoves(st).length === 0 && inCheck(st, GOTE), text);
}

// --- 1b. どの つよさでも 1 手詰めは ほぼ 見つける -----------------------------
// （よわい は わざと 35% 外すので そのぶんを 見こむ。いちど、いちばん うえの 手を
//   せまい 窓で 読んで いたために「読めていない手」を えらび、ふつう でも 1 手詰めを
//   30 回中 28 回 逃していた。その 再発を ここで 見る）

{
  const rates = {};
  for (const level of [1, 2]) {
    const random = seeded(101 + level);
    let found = 0;
    for (let i = 0; i < 20; i++) {
      const st = fromSfen("3lkl3/9/4G4/9/9/9/9/9/K8 b L 1");
      const want = legalMoves(st).find(m => moveDrop(m) === L && moveTo(m) === 1 * 9 + 4);
      if ((await chooseMove(st, level, { random })) === want) found++;
    }
    rates[level] = found;
  }
  check("よわい でも 1 手詰めを 半分いじょう 見つける", rates[1] >= 10, `${rates[1]}/20`);
  check("ふつう は 1 手詰めを ほぼ 見つける", rates[2] >= 16, `${rates[2]}/20`);
}

// --- 2. ただで 取れる 駒は 取る -----------------------------------------------

{
  // 5五の 後手の 飛車は だれも まもっていない。5九の 香で 取れる
  const st = fromSfen("4k4/9/9/9/4r4/9/9/9/4LK3 b - 1");
  const got = await chooseMove(st, 2, { random: seeded(3) });
  check("まもられていない 大駒は 取る", moveTo(got) === 4 * 9 + 4, moveText(st, got, -1));
}

// --- 3. 反則手を 指さない ------------------------------------------------------

{
  const st = initialState();
  const random = seeded(7);
  let illegal = 0;
  let slowest = 0;
  let plies = 0;
  for (let i = 0; i < 60; i++) {
    const legal = legalMoves(st);
    if (!legal.length) break;
    const level = st.turn === SENTE ? 2 : 1;
    const started = Date.now();
    const m = await chooseMove(st, level, { random });
    slowest = Math.max(slowest, Date.now() - started);
    if (!legal.includes(m)) illegal++;
    doMove(st, m);
    plies++;
  }
  check("60 手ぶん 指しても 反則手は 0", illegal === 0, `${plies} 手・反則 ${illegal}`);
  check("1 手 考えるのは 3 秒いない", slowest <= 3000, `いちばん 長くて ${slowest} ミリ秒`);
}

// --- 4. つよい ほうが 駒得する -------------------------------------------------

{
  const st = initialState();
  const random = seeded(11);
  for (let i = 0; i < 40; i++) {
    if (!legalMoves(st).length) break;
    const level = st.turn === SENTE ? 3 : 1;
    doMove(st, await chooseMove(st, level, { random, budget: level === 3 ? 300 : 100 }));
  }
  // evaluate は 手番から 見た 点なので、先手から 見た 点に そろえる
  const senteScore = st.turn === SENTE ? evaluate(st) : -evaluate(st);
  check("つよい あいては よわい あいてに 駒得する", senteScore > 0, `先手から 見て ${senteScore}`);
}

// --- 5. 点の つけかた ----------------------------------------------------------

{
  const even = initialState();
  check("はじめの 局面は ほぼ 五分", Math.abs(evaluate(even)) < 60, String(evaluate(even)));
  const up = fromSfen("4k4/9/9/9/9/9/9/9/4K4 b R 1");
  check("飛車を 持っている ほうが よい", evaluate(up) > 900, String(evaluate(up)));
  check("つよさは 3 だんかい", Object.keys(LEVELS).length === 3);
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
