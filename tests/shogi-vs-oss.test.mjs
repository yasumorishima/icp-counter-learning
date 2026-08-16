/**
 * この リポジトリの きまりと、外の OSS（tsshogi・MIT・sunfish-shogi）の
 * 合法手を 局面ごとに 全数 突き合わせる。自分の 実装を 自分で 採点しない ための 検査。
 *
 *   node tests/shogi-vs-oss.test.mjs
 *
 * tsshogi は 開発用の 依存で、配信する まとまり（bundle）には 入らない。
 */
import { Position, Square, PieceType } from "tsshogi";
import {
  initialState, legalMoves, doMove, undoMove, moveTo, moveFrom, moveDrop, movePromotes,
  typeOf, colorOf, fromSfen, SENTE, GOTE, P, L, N, S, G, B, R as ROOK, K,
} from "../src/todo_app_frontend/src/shogi-rules.mjs";
import { chooseMove } from "../src/todo_app_frontend/src/shogi-ai.mjs";

const LETTER = { 1: "P", 2: "L", 3: "N", 4: "S", 5: "G", 6: "B", 7: "R", 8: "K" };

function sfenOf(st) {
  const rows = [];
  for (let r = 0; r < 9; r++) {
    let row = "";
    let gap = 0;
    for (let c = 0; c < 9; c++) {
      const p = st.board[r * 9 + c];
      if (!p) { gap++; continue; }
      if (gap) { row += gap; gap = 0; }
      const t = typeOf(p);
      const base = t >= 9 ? t - 8 : t;
      const letter = LETTER[base];
      row += (t >= 9 ? "+" : "") + (colorOf(p) === SENTE ? letter : letter.toLowerCase());
    }
    if (gap) row += gap;
    rows.push(row);
  }
  let hands = "";
  for (const [color, upper] of [[SENTE, true], [GOTE, false]]) {
    for (const t of [ROOK, B, G, S, N, L, P]) {
      const n = st.hands[color][t];
      if (!n) continue;
      hands += (n > 1 ? n : "") + (upper ? LETTER[t] : LETTER[t].toLowerCase());
    }
  }
  return rows.join("/") + " " + (st.turn === SENTE ? "b" : "w") + " " + (hands || "-") + " 1";
}

const usiSq = sq => String(9 - (sq % 9)) + String.fromCharCode(97 + ((sq / 9) | 0));
function usiOf(m) {
  const drop = moveDrop(m);
  if (drop) return LETTER[drop] + "*" + usiSq(moveTo(m));
  return usiSq(moveFrom(m)) + usiSq(moveTo(m)) + (movePromotes(m) ? "+" : "");
}

function ossMoves(sfen) {
  const pos = Position.newBySFEN(sfen);
  if (!pos) return null;
  const out = new Set();
  for (let ff = 1; ff <= 9; ff++) for (let fr = 1; fr <= 9; fr++) {
    for (let tf = 1; tf <= 9; tf++) for (let tr = 1; tr <= 9; tr++) {
      const base = pos.createMove(new Square(ff, fr), new Square(tf, tr));
      if (!base) continue;
      if (pos.isValidMove(base)) out.add(base.usi);
      const pro = base.withPromote();
      if (pro && pos.isValidMove(pro)) out.add(pro.usi);
    }
  }
  const drops = [PieceType.PAWN, PieceType.LANCE, PieceType.KNIGHT, PieceType.SILVER, PieceType.GOLD, PieceType.BISHOP, PieceType.ROOK];
  for (const pt of drops) {
    for (let tf = 1; tf <= 9; tf++) for (let tr = 1; tr <= 9; tr++) {
      const mv = pos.createMove(pt, new Square(tf, tr));
      if (!mv) continue;
      if (!pos.isValidMove(mv)) continue;
      if (pos.isPawnDropMate(mv)) continue; // 打ち歩詰め は 反則
      out.add(mv.usi);
    }
  }
  return out;
}

const seeded = seed => { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; };

let positions = 0;
let mismatches = [];
const compare = (st, tag) => {
  const sfen = sfenOf(st);
  const oss = ossMoves(sfen);
  if (!oss) { mismatches.push(tag + " SFEN を OSS が 読めない: " + sfen); return; }
  const mine = new Set(legalMoves(st).map(usiOf));
  const onlyMine = [...mine].filter(x => !oss.has(x));
  const onlyOss = [...oss].filter(x => !mine.has(x));
  positions++;
  if (onlyMine.length || onlyOss.length) {
    mismatches.push(`${tag} ${sfen}\n    私だけ: ${onlyMine.join(",") || "なし"}\n    OSSだけ: ${onlyOss.join(",") || "なし"}`);
  }
};

// 1) 決められた 局面
for (const [tag, sfen] of [
  ["初期", "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1"],
  ["二歩", "4k4/9/9/9/9/9/4P4/9/4K4 b P 1"],
  ["打ち歩詰め", "3lkl3/9/4G4/9/9/9/9/9/K8 b LP 1"],
  ["成り強制", "8k/4P4/9/9/9/9/9/9/K8 b - 1"],
  ["王手", "4r3k/9/9/9/9/9/9/9/3GK4 b - 1"],
  ["持ち駒だらけ", "4k4/9/9/9/9/9/9/9/4K4 b RBGSNLP2r2b2g2s2n2l17p 1"],
]) compare(fromSfen(sfen), tag);

// 2) 自己対局で 出てくる 局面（毎手 くらべる）
for (const seed of [3, 21, 55]) {
  const st = initialState();
  const random = seeded(seed);
  for (let i = 0; i < 80; i++) {
    compare(st, `seed${seed}-${i}手目`);
    const legal = legalMoves(st);
    if (!legal.length) break;
    const m = await chooseMove(st, 1, { random, budget: 60 });
    if (!m) break;
    doMove(st, m);
  }
}

// 3) 1 手 指すごとに 局面ぜんたい（盤・持ち駒・手番）が OSS と 同じかを 見る。
//    取った駒が 正しく 持ち駒に 入るか、成った駒が 取られたら 元に もどるかは ここで 分かる。
let stepped = 0;
let stateBad = [];
for (const seed of [11, 42]) {
  const st = initialState();
  const random = seeded(seed);
  let pos = Position.newBySFEN(sfenOf(st));
  for (let i = 0; i < 100; i++) {
    const legal = legalMoves(st);
    if (!legal.length) break;
    const m = await chooseMove(st, 1, { random, budget: 60 });
    if (!m) break;
    const usi = usiOf(m);
    const mv = pos.createMoveByUSI(usi);
    if (!mv || !pos.doMove(mv)) {
      stateBad.push(`${seed}-${i}手目 OSS が ${usi} を 指せない`);
      break;
    }
    doMove(st, m);
    stepped++;
    const mineSfen = sfenOf(st);
    const ossSfen = pos.getSFEN(1).replace(/ \d+$/, " 1");
    if (mineSfen !== ossSfen) {
      stateBad.push(`${seed}-${i}手目 ${usi}
    私 : ${mineSfen}
    OSS: ${ossSfen}`);
      break;
    }
  }
}
console.log(`1 手ごとに くらべた 手数: ${stepped}　局面の ちがい: ${stateBad.length}`);
stateBad.slice(0, 4).forEach(b => console.log("  " + b));
mismatches.push(...stateBad);

console.log(`
くらべた 局面: ${positions}`);
console.log(`ちがい: ${mismatches.length}`);
mismatches.slice(0, 10).forEach(m => console.log("  " + m));
process.exit(mismatches.length ? 1 : 0);
