/**
 * あいての 考える ところ。きまりは shogi-rules に まかせて、ここは 手の えらびかただけ。
 *
 * 画面が とまらないように、いちばん うえの 手を 1 つ しらべるたびに 画面へ 制御を かえす。
 * 深く 読むのは その下だけなので、待ち時間は 見えても 固まりはしない。
 */
import {
  legalMoves, doMove, undoMove, inCheck, typeOf, colorOf, moveTo, moveFrom, moveDrop,
  movePromotes, inZone, SENTE, GOTE, P, L, N, S, G, B, R, K, TOKIN, NL, NN, NS, HORSE, DRAGON,
} from "./shogi-rules.mjs";

const MATE = 100000;

// 駒の ねうち。持ち駒は 打てるぶん すこし 高く 見る
const VALUE = [];
VALUE[P] = 90; VALUE[L] = 315; VALUE[N] = 340; VALUE[S] = 495; VALUE[G] = 540;
VALUE[B] = 855; VALUE[R] = 990; VALUE[K] = 15000;
VALUE[TOKIN] = 540; VALUE[NL] = 540; VALUE[NN] = 540; VALUE[NS] = 540;
VALUE[HORSE] = 945; VALUE[DRAGON] = 1095; VALUE[13] = 0;

const HAND_VALUE = [];
HAND_VALUE[P] = 105; HAND_VALUE[L] = 350; HAND_VALUE[N] = 375; HAND_VALUE[S] = 545;
HAND_VALUE[G] = 595; HAND_VALUE[B] = 940; HAND_VALUE[R] = 1085;

// 玉は すみの ほうが 安全。先手から 見た 点（後手は 上下を ひっくり返して 使う）
const KING_SAFETY = [
  -30, -30, -30, -30, -30, -30, -30, -30, -30,
  -28, -28, -28, -28, -28, -28, -28, -28, -28,
  -26, -26, -26, -26, -26, -26, -26, -26, -26,
  -20, -20, -20, -20, -20, -20, -20, -20, -20,
  -12, -12, -12, -12, -12, -12, -12, -12, -12,
   -4,  -4,  -4,  -4,  -4,  -4,  -4,  -4,  -4,
    6,   8,   8,   4,   0,   4,   8,   8,   6,
   14,  18,  18,  10,   2,  10,  18,  18,  14,
   16,  22,  22,  12,   4,  12,  22,  22,  16,
];

const flipSquare = sq => 80 - sq;

/**
 * 手番から 見た 点。大きいほど 手番が よい。
 */
export function evaluate(st) {
  let score = 0;
  for (let sq = 0; sq < 81; sq++) {
    const p = st.board[sq];
    if (!p) continue;
    const type = typeOf(p);
    const color = colorOf(p);
    const own = color === SENTE ? sq : flipSquare(sq);
    let v = VALUE[type];
    if (type === K) {
      v += KING_SAFETY[own];
    } else {
      // まえへ 出た駒と、相手の じんちに 入った駒を すこし 高く 見る
      const rank = (own / 9) | 0;
      v += (8 - rank) * 3;
      if (inZone(color, sq)) v += 12;
    }
    score += color === SENTE ? v : -v;
  }
  for (let t = P; t <= R; t++) {
    score += st.hands[SENTE][t] * HAND_VALUE[t];
    score -= st.hands[GOTE][t] * HAND_VALUE[t];
  }
  score += kingArea(st, SENTE) - kingArea(st, GOTE);
  return st.turn === SENTE ? score : -score;
}

/** 玉の まわりに 味方が いれば 加点、相手に にらまれていれば 減点 */
function kingArea(st, color) {
  const ks = st.king[color];
  if (ks < 0) return -MATE;
  const r = (ks / 9) | 0;
  const c = ks % 9;
  let score = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr > 8 || cc < 0 || cc > 8) continue;
      const p = st.board[rr * 9 + cc];
      if (p && colorOf(p) === color) score += 16;
    }
  }
  return score;
}

/** 取る手・成る手を さきに 見る（そのほうが 早く 読み切れる） */
function orderMoves(st, moves) {
  const scored = moves.map(m => {
    let s = 0;
    const target = st.board[moveTo(m)];
    if (target) s += 1000 + VALUE[typeOf(target)] - VALUE[typeOf(st.board[moveFrom(m)])] / 8;
    if (movePromotes(m)) s += 400;
    if (moveDrop(m)) s += 40;
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map(x => x.m);
}

function quiesce(st, alpha, beta, ctx, ply, qply) {
  if (ctx.stop) return 0;
  if ((++ctx.nodes & 2047) === 0 && Date.now() > ctx.deadline) {
    ctx.stop = true;
    return 0;
  }
  const checked = inCheck(st, st.turn);
  if (!checked) {
    const stand = evaluate(st);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
  }
  // 深く 読む ほど 静止探索が みじかく なって しまわないよう、ここでの 深さで 数える
  if (qply > 6) return evaluate(st);

  const all = legalMoves(st);
  if (!all.length) return -MATE + ply;
  const moves = checked ? orderMoves(st, all) : orderMoves(st, all.filter(m => st.board[moveTo(m)] !== 0));
  for (let i = 0; i < moves.length; i++) {
    doMove(st, moves[i]);
    const score = -quiesce(st, -beta, -alpha, ctx, ply + 1, qply + 1);
    undoMove(st);
    if (ctx.stop) return 0;
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(st, depth, alpha, beta, ctx, ply) {
  if (ctx.stop) return 0;
  if ((++ctx.nodes & 2047) === 0 && Date.now() > ctx.deadline) {
    ctx.stop = true;
    return 0;
  }
  const moves = legalMoves(st);
  if (!moves.length) return -MATE + ply;
  if (depth <= 0) return quiesce(st, alpha, beta, ctx, ply, 0);

  const ordered = orderMoves(st, moves);
  let best = -MATE * 2;
  for (let i = 0; i < ordered.length; i++) {
    doMove(st, ordered[i]);
    const score = -search(st, depth - 1, -beta, -alpha, ctx, ply + 1);
    undoMove(st);
    if (ctx.stop) return 0;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

// つよさ。よわい ほど 浅く 読み、ときどき わざと 良くない手を えらぶ
export const LEVELS = {
  1: { depth: 1, budget: 200, jitter: 90, blunder: 0.35, label: "よわい" },
  2: { depth: 3, budget: 700, jitter: 25, blunder: 0.05, label: "ふつう" },
  3: { depth: 6, budget: 1600, jitter: 0, blunder: 0, label: "つよい" },
};

const breathe = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * 手を 1 つ えらぶ。時間が きたら そこまでの いちばん よい手を かえす。
 * random には テストから 決まった 数を わたせる（同じ手を くり返させるため）。
 */
export async function chooseMove(st, level, options) {
  const cfg = LEVELS[level] || LEVELS[2];
  const opts = options || {};
  const random = opts.random || Math.random;
  let root = legalMoves(st);
  if (!root.length) return 0;
  if (root.length === 1) return root[0];

  if (cfg.blunder && random() < cfg.blunder) {
    return root[Math.floor(random() * root.length)];
  }

  const ctx = { nodes: 0, stop: false, deadline: Date.now() + (opts.budget || cfg.budget) };
  // ゆらぎを 足す つよさでは、どの手も 本当の 点を 出してから くらべる
  const wide = cfg.jitter > 0;
  let ordered = orderMoves(st, root);
  let best = ordered[0];
  let bestScore = -MATE * 2;

  for (let depth = 1; depth <= cfg.depth; depth++) {
    const scores = [];
    let alpha = -MATE * 2;
    let localBest = ordered[0];
    let localScore = -MATE * 2;
    let lastBreath = Date.now();

    for (let i = 0; i < ordered.length; i++) {
      const m = ordered[i];
      doMove(st, m);
      let score = -search(st, depth - 1, -MATE * 2, wide ? MATE * 2 : -alpha, ctx, 1);
      undoMove(st);
      if (ctx.stop) break;
      if (cfg.jitter) score += Math.floor((random() * 2 - 1) * cfg.jitter);
      scores.push({ m, score });
      if (score > localScore) {
        localScore = score;
        localBest = m;
      }
      if (score > alpha) alpha = score;
      if (Date.now() - lastBreath > 12) {
        await breathe();
        lastBreath = Date.now();
      }
    }

    if (scores.length) {
      best = localBest;
      bestScore = localScore;
      scores.sort((a, b) => b.score - a.score);
      ordered = scores.map(x => x.m).concat(ordered.filter(m => !scores.some(s => s.m === m)));
    }
    if (ctx.stop) break;
    if (bestScore > MATE - 100) break;
    await breathe();
  }

  return best;
}
