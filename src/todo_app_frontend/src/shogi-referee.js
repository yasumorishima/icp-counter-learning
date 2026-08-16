/**
 * 審判。指せる手の 最終判断を 外の しくみ（tsshogi・MIT・sunfish-shogi）に させる。
 *
 * この中の きまり（shogi-rules）は 数え上げ（perft）と 突き合わせで 確かめてあるが、
 * 「自分の 実装を 自分で 採点しない」ため、人が さわる 側は 外の しくみに 通してから 出す。
 * あいての 読みは 1 手で 何万局面も 調べるので、そちらは 速い 自前の きまりの まま。
 * （実測: 1 局面あたり 自前 0.04ms / tsshogi 1.2ms）
 */
import { Position, Square, PieceType } from "tsshogi";
import { toSfen, toUsi, moveDrop, moveTo, moveFrom, movePromotes } from "./shogi-rules.mjs";

const DROP_PIECE = {
  1: PieceType.PAWN, 2: PieceType.LANCE, 3: PieceType.KNIGHT, 4: PieceType.SILVER,
  5: PieceType.GOLD, 6: PieceType.BISHOP, 7: PieceType.ROOK,
};

const square = sq => new Square(9 - (sq % 9), ((sq / 9) | 0) + 1);

let complained = 0;

/** その手を 外の しくみも 認めるか */
function accepted(pos, m) {
  const drop = moveDrop(m);
  const base = drop
    ? pos.createMove(DROP_PIECE[drop], square(moveTo(m)))
    : pos.createMove(square(moveFrom(m)), square(moveTo(m)));
  if (!base) return false;
  const use = movePromotes(m) ? base.withPromote() : base;
  if (!use) return false;
  if (!pos.isValidMove(use)) return false;
  if (drop === 1 && pos.isPawnDropMate(use)) return false;
  return true;
}

/**
 * 自前の きまりが 出した 手のうち、外の しくみも 認めた ものだけ かえす。
 * 外の しくみを 読み込めない ときは そのまま かえす（遊べなく なるより よい）。
 */
export function refereed(st, moves) {
  let pos = null;
  try {
    pos = Position.newBySFEN(toSfen(st));
  } catch (error) {
    pos = null;
  }
  if (!pos) return moves;

  const ok = [];
  const rejected = [];
  for (const m of moves) {
    if (accepted(pos, m)) ok.push(m);
    else rejected.push(toUsi(m));
  }
  if (rejected.length && complained < 3) {
    complained++;
    console.error("審判が 認めなかった手:", rejected.join(" "), toSfen(st));
  }
  return ok;
}
