/**
 * しょうぎの きまり。画面には ふれない（この中だけで 正しさを 確かめられるように）。
 *
 * ここが まちがっていると 全部が こわれるので、駒の うごき・打つ ときの きまり・
 * つんでいるか の 判定を すべて この 1 まいに 置く。
 * 正しさは perft（決められた 手数ぶんの 合法手を 数え上げて 公表値と 突き合わせる）で 見る。
 */

export const SENTE = 0;
export const GOTE = 1;

// 駒の しゅるい。成ると +8（金と玉は 成らない）
export const P = 1, L = 2, N = 3, S = 4, G = 5, B = 6, R = 7, K = 8;
export const TOKIN = 9, NL = 10, NN = 11, NS = 12, HORSE = 14, DRAGON = 15;

export const typeOf = p => p & 15;
export const colorOf = p => p >> 4;
export const piece = (color, type) => (color << 4) | type;
export const demote = t => (t >= 9 ? t - 8 : t);
export const promoted = t => t + 8;
export const canPromote = t => t === P || t === L || t === N || t === S || t === B || t === R;

export const NAME = {
  1: "歩", 2: "香", 3: "桂", 4: "銀", 5: "金", 6: "角", 7: "飛", 8: "玉",
  9: "と", 10: "成香", 11: "成桂", 12: "成銀", 14: "馬", 15: "龍",
};

// 盤に書く 1 文字（成香・成桂・成銀は 1 文字に つぶす）
export const CHAR = {
  1: "歩", 2: "香", 3: "桂", 4: "銀", 5: "金", 6: "角", 7: "飛", 8: "玉",
  9: "と", 10: "杏", 11: "圭", 12: "全", 14: "馬", 15: "龍",
};

// 駒の うごきを ことばで（はじめての 人むけ）
export const HOW = {
  1: "まえに 1 ます",
  2: "まえに まっすぐ どこまでも",
  3: "まえに 2・よこに 1（とびこす）",
  4: "まえと ななめ 4 ほうこう",
  5: "まえ・よこ・うしろ（ななめ うしろ いがい）",
  6: "ななめに どこまでも",
  7: "たてよこに どこまでも",
  8: "まわり 8 ます",
  9: "金と おなじ うごき",
  10: "金と おなじ うごき",
  11: "金と おなじ うごき",
  12: "金と おなじ うごき",
  14: "ななめ どこまでも ＋ たてよこ 1 ます",
  15: "たてよこ どこまでも ＋ ななめ 1 ます",
};

export const FILE_CHAR = ["９", "８", "７", "６", "５", "４", "３", "２", "１"];
export const RANK_CHAR = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

// 持ち駒を ならべる 順（強い ものから）
export const HAND_ORDER = [R, B, G, S, N, L, P];

// --- 駒の うごき（先手から 見た 向き。後手は 上下を 逆にする） -----------------

const GOLD = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const SILVER = [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const NONE = [];

const STEPS = [];
STEPS[P] = [[-1, 0]];
STEPS[L] = NONE;
STEPS[N] = [[-2, -1], [-2, 1]];
STEPS[S] = SILVER;
STEPS[G] = GOLD;
STEPS[B] = NONE;
STEPS[R] = NONE;
STEPS[K] = KING;
STEPS[TOKIN] = GOLD;
STEPS[NL] = GOLD;
STEPS[NN] = GOLD;
STEPS[NS] = GOLD;
STEPS[13] = NONE;
STEPS[HORSE] = ORTH;
STEPS[DRAGON] = DIAG;

const SLIDES = [];
SLIDES[P] = NONE;
SLIDES[L] = [[-1, 0]];
SLIDES[N] = NONE;
SLIDES[S] = NONE;
SLIDES[G] = NONE;
SLIDES[B] = DIAG;
SLIDES[R] = ORTH;
SLIDES[K] = NONE;
SLIDES[TOKIN] = NONE;
SLIDES[NL] = NONE;
SLIDES[NN] = NONE;
SLIDES[NS] = NONE;
SLIDES[13] = NONE;
SLIDES[HORSE] = DIAG;
SLIDES[DRAGON] = ORTH;

// その駒が どう うごけるか（画面の「うごきかた」用）
export function moveShape(type, color) {
  const sg = color === SENTE ? 1 : -1;
  return {
    steps: STEPS[type].map(d => [sg * d[0], d[1]]),
    slides: SLIDES[type].map(d => [sg * d[0], d[1]]),
  };
}

// --- 手の あらわしかた -------------------------------------------------------
// to: 0-6 ビット / from: 7-13 ビット / 成る: 14 ビット / 打つ駒: 15-18 ビット

export const encodeMove = (from, to, promote) => to | (from << 7) | (promote ? 1 << 14 : 0);
export const encodeDrop = (type, to) => to | (type << 15);
export const moveTo = m => m & 127;
export const moveFrom = m => (m >> 7) & 127;
export const movePromotes = m => ((m >> 14) & 1) === 1;
export const moveDrop = m => (m >> 15) & 15;

// --- 局面 -------------------------------------------------------------------

export function emptyState() {
  return {
    board: new Int8Array(81),
    hands: [new Int8Array(8), new Int8Array(8)],
    turn: SENTE,
    king: [-1, -1],
    hist: [],
  };
}

const BACK_RANK = [L, N, S, G, K, G, S, N, L];

export function initialState() {
  const st = emptyState();
  for (let c = 0; c < 9; c++) {
    st.board[0 * 9 + c] = piece(GOTE, BACK_RANK[c]);
    st.board[2 * 9 + c] = piece(GOTE, P);
    st.board[6 * 9 + c] = piece(SENTE, P);
    st.board[8 * 9 + c] = piece(SENTE, BACK_RANK[c]);
  }
  st.board[1 * 9 + 1] = piece(GOTE, R);
  st.board[1 * 9 + 7] = piece(GOTE, B);
  st.board[7 * 9 + 1] = piece(SENTE, B);
  st.board[7 * 9 + 7] = piece(SENTE, R);
  st.king[GOTE] = 4;
  st.king[SENTE] = 8 * 9 + 4;
  return st;
}

export function cloneState(st) {
  return {
    board: Int8Array.from(st.board),
    hands: [Int8Array.from(st.hands[SENTE]), Int8Array.from(st.hands[GOTE])],
    turn: st.turn,
    king: [st.king[0], st.king[1]],
    hist: [],
  };
}

// 同じ局面かを 見るための 文字れつ（千日手の 判定に つかう）
export function positionKey(st) {
  let s = "";
  for (let i = 0; i < 81; i++) s += String.fromCharCode(48 + st.board[i]);
  s += "|" + st.turn + "|";
  for (let t = P; t <= R; t++) s += st.hands[SENTE][t] + "," + st.hands[GOTE][t] + ";";
  return s;
}

// --- 盤の しらべもの ---------------------------------------------------------

export const inZone = (color, sq) => (color === SENTE ? sq < 27 : sq >= 54);

function mustPromote(color, type, to) {
  const r = (to / 9) | 0;
  if (type === P || type === L) return color === SENTE ? r === 0 : r === 8;
  if (type === N) return color === SENTE ? r <= 1 : r >= 7;
  return false;
}

// (dr,dc) だけ はなれた ますへ、その駒が とどくか。dr,dc は 駒から 見た ずれ
function reaches(type, color, dr, dc, dist) {
  const fwd = color === SENTE ? -1 : 1;
  if (dist > 1) {
    if (type === R || type === DRAGON) return dr === 0 || dc === 0;
    if (type === B || type === HORSE) return dr !== 0 && dc !== 0;
    if (type === L) return dc === 0 && Math.sign(dr) === fwd;
    return false;
  }
  if ((type === R || type === DRAGON) && (dr === 0 || dc === 0)) return true;
  if ((type === B || type === HORSE) && dr !== 0 && dc !== 0) return true;
  if (type === L && dc === 0 && Math.sign(dr) === fwd) return true;
  const steps = STEPS[type];
  const sg = color === SENTE ? 1 : -1;
  for (let i = 0; i < steps.length; i++) {
    if (sg * steps[i][0] === dr && steps[i][1] === dc) return true;
  }
  return false;
}

// そのますが 相手（by）に にらまれているか。
// ますから 逆に たどる（8 ほうこう 1 回ずつ ＋ 桂）ので、盤ぜんぶは 見ない。
export function attacked(st, sq, by) {
  const board = st.board;
  const r = (sq / 9) | 0;
  const c = sq % 9;
  const fwd = by === SENTE ? -1 : 1;

  const nr = r - 2 * fwd;
  if (nr >= 0 && nr <= 8) {
    const want = piece(by, N);
    if (c > 0 && board[nr * 9 + c - 1] === want) return true;
    if (c < 8 && board[nr * 9 + c + 1] === want) return true;
  }

  for (let d = 0; d < 8; d++) {
    const dr = KING[d][0];
    const dc = KING[d][1];
    let rr = r + dr;
    let cc = c + dc;
    let dist = 1;
    while (rr >= 0 && rr <= 8 && cc >= 0 && cc <= 8) {
      const p = board[rr * 9 + cc];
      if (p) {
        if (colorOf(p) === by && reaches(typeOf(p), by, -dr, -dc, dist)) return true;
        break;
      }
      rr += dr;
      cc += dc;
      dist++;
    }
  }
  return false;
}

export function inCheck(st, color) {
  const ks = st.king[color];
  if (ks < 0) return false;
  return attacked(st, ks, 1 - color);
}

// --- 手を つくる -------------------------------------------------------------

function addBoardMove(st, list, from, to) {
  const p = st.board[from];
  const type = typeOf(p);
  const color = colorOf(p);
  const zone = inZone(color, from) || inZone(color, to);
  if (!mustPromote(color, type, to)) list.push(encodeMove(from, to, 0));
  if (canPromote(type) && zone) list.push(encodeMove(from, to, 1));
}

// 二歩に なるか（その すじに 自分の 成っていない 歩が いるか）
export function hasPawn(st, color, file) {
  const want = piece(color, P);
  for (let r = 0; r < 9; r++) if (st.board[r * 9 + file] === want) return true;
  return false;
}

function dropAllowed(st, color, type, sq) {
  const r = (sq / 9) | 0;
  if (type === P || type === L) {
    if (color === SENTE ? r === 0 : r === 8) return false;
  }
  if (type === N) {
    if (color === SENTE ? r <= 1 : r >= 7) return false;
  }
  if (type === P && hasPawn(st, color, sq % 9)) return false;
  return true;
}

export function pseudoMoves(st, list) {
  const board = st.board;
  const turn = st.turn;
  const sg = turn === SENTE ? 1 : -1;

  for (let sq = 0; sq < 81; sq++) {
    const p = board[sq];
    if (!p || colorOf(p) !== turn) continue;
    const type = typeOf(p);
    const r = (sq / 9) | 0;
    const c = sq % 9;

    const steps = STEPS[type];
    for (let i = 0; i < steps.length; i++) {
      const rr = r + sg * steps[i][0];
      const cc = c + steps[i][1];
      if (rr < 0 || rr > 8 || cc < 0 || cc > 8) continue;
      const to = rr * 9 + cc;
      const q = board[to];
      if (q && colorOf(q) === turn) continue;
      addBoardMove(st, list, sq, to);
    }

    const slides = SLIDES[type];
    for (let i = 0; i < slides.length; i++) {
      const dr = sg * slides[i][0];
      const dc = slides[i][1];
      let rr = r + dr;
      let cc = c + dc;
      while (rr >= 0 && rr <= 8 && cc >= 0 && cc <= 8) {
        const to = rr * 9 + cc;
        const q = board[to];
        if (q && colorOf(q) === turn) break;
        addBoardMove(st, list, sq, to);
        if (q) break;
        rr += dr;
        cc += dc;
      }
    }
  }

  const hand = st.hands[turn];
  for (let t = P; t <= R; t++) {
    if (!hand[t]) continue;
    for (let sq = 0; sq < 81; sq++) {
      if (board[sq]) continue;
      if (!dropAllowed(st, turn, t, sq)) continue;
      list.push(encodeDrop(t, sq));
    }
  }
  return list;
}

export function doMove(st, m) {
  const to = moveTo(m);
  const drop = moveDrop(m);
  const undo = { move: m, captured: 0, from: -1, wasKing: false };

  if (drop) {
    st.board[to] = piece(st.turn, drop);
    st.hands[st.turn][drop]--;
  } else {
    const from = moveFrom(m);
    const p = st.board[from];
    const cap = st.board[to];
    undo.from = from;
    if (cap) {
      undo.captured = cap;
      st.hands[st.turn][demote(typeOf(cap))]++;
    }
    st.board[from] = 0;
    st.board[to] = movePromotes(m) ? piece(st.turn, promoted(typeOf(p))) : p;
    if (typeOf(p) === K) {
      undo.wasKing = true;
      st.king[st.turn] = to;
    }
  }
  st.hist.push(undo);
  st.turn = 1 - st.turn;
}

export function undoMove(st) {
  const undo = st.hist.pop();
  if (!undo) return;
  const m = undo.move;
  const to = moveTo(m);
  const drop = moveDrop(m);
  st.turn = 1 - st.turn;

  if (drop) {
    st.board[to] = 0;
    st.hands[st.turn][drop]++;
  } else {
    const from = undo.from;
    const p = st.board[to];
    st.board[from] = movePromotes(m) ? piece(st.turn, demote(typeOf(p))) : p;
    st.board[to] = undo.captured;
    if (undo.captured) st.hands[st.turn][demote(typeOf(undo.captured))]--;
    if (undo.wasKing) st.king[st.turn] = from;
  }
}

// 打てる手も ふくめた 合法手。
// 王手を のこす手は 除き、歩を 打って つませる手（打ち歩詰め）も 除く。
export function legalMoves(st, allowPawnMate) {
  const pseudo = pseudoMoves(st, []);
  const out = [];
  const me = st.turn;
  for (let i = 0; i < pseudo.length; i++) {
    const m = pseudo[i];
    doMove(st, m);
    const ks = st.king[me];
    const bad = ks >= 0 && attacked(st, ks, st.turn);
    let pawnMate = false;
    if (!bad && !allowPawnMate && moveDrop(m) === P) {
      const other = st.turn;
      if (st.king[other] >= 0 && attacked(st, st.king[other], me)) {
        pawnMate = legalMoves(st, true).length === 0;
      }
    }
    undoMove(st);
    if (!bad && !pawnMate) out.push(m);
  }
  return out;
}

// 合法手を 数え上げる（きまりが 正しいかの 検算に つかう）
export function perft(st, depth) {
  if (depth === 0) return 1;
  const moves = legalMoves(st);
  if (depth === 1) return moves.length;
  let total = 0;
  for (let i = 0; i < moves.length; i++) {
    doMove(st, moves[i]);
    total += perft(st, depth - 1);
    undoMove(st);
  }
  return total;
}

// --- 棋譜の 書きかた ---------------------------------------------------------

export function squareText(sq) {
  return FILE_CHAR[sq % 9] + RANK_CHAR[(sq / 9) | 0];
}

// 「▲７六歩」の かたち。うごかす まえの 局面で よぶこと。
// legal を わたすと、同じ ますへ 行ける 同じ駒が ほかにも あるときだけ 元の ますを そえる。
export function moveText(st, m, prevTo, legal) {
  const to = moveTo(m);
  const drop = moveDrop(m);
  const color = st.turn;
  const mark = color === SENTE ? "▲" : "△";
  const place = to === prevTo ? "同" : squareText(to);
  const type = drop ? drop : typeOf(st.board[moveFrom(m)]);
  let text = mark + place + NAME[type];

  if (drop) return text + "打";

  const from = moveFrom(m);
  if (movePromotes(m)) text += "成";
  else if (canPromote(type) && (inZone(color, from) || inZone(color, to))) text += "不成";

  if (legal) {
    let others = 0;
    for (let i = 0; i < legal.length; i++) {
      const other = legal[i];
      if (moveTo(other) !== to || moveDrop(other)) continue;
      const of = moveFrom(other);
      if (of === from) continue;
      if (typeOf(st.board[of]) === type) others++;
    }
    if (others) text += "(" + (9 - (from % 9)) + (((from / 9) | 0) + 1) + ")";
  }
  return text;
}

// --- SFEN（検算で つかう 局面の 書きかた） -----------------------------------

const SFEN_LETTER = { p: P, l: L, n: N, s: S, g: G, b: B, r: R, k: K };

// SFEN から 局面を つくる。検算で つくった局面を 読ませるために ある
export function fromSfen(text) {
  const st = emptyState();
  const parts = text.trim().split(/\s+/);
  const rows = parts[0].split("/");
  if (rows.length !== 9) throw new Error("SFEN の 段が 9 つ ではない: " + rows.length);
  for (let r = 0; r < 9; r++) {
    let c = 0;
    let promote = false;
    for (const ch of rows[r]) {
      if (ch === "+") {
        promote = true;
        continue;
      }
      if (ch >= "1" && ch <= "9") {
        c += Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      const type = SFEN_LETTER[lower];
      if (!type) throw new Error("知らない 駒: " + ch);
      const color = ch === lower ? GOTE : SENTE;
      if (promote && !canPromote(type)) throw new Error("成れない 駒: " + ch);
      st.board[r * 9 + c] = piece(color, promote ? promoted(type) : type);
      if (type === K) st.king[color] = r * 9 + c;
      promote = false;
      c++;
    }
    if (c !== 9) throw new Error("SFEN の すじが 9 つ ではない: " + rows[r]);
  }
  st.turn = parts[1] === "w" ? GOTE : SENTE;
  const hands = parts[2] || "-";
  if (hands !== "-") {
    let count = 0;
    for (const ch of hands) {
      if (ch >= "0" && ch <= "9") {
        count = count * 10 + Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      const type = SFEN_LETTER[lower];
      if (!type) throw new Error("知らない 持ち駒: " + ch);
      const color = ch === lower ? GOTE : SENTE;
      st.hands[color][type] += count || 1;
      count = 0;
    }
  }
  return st;
}
