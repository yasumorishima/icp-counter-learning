/**
 * 審判。指せる手と 勝負の つけかたの 最終判断を 外の しくみ（tsshogi・MIT・sunfish-shogi）に させる。
 *
 * この中の きまり（shogi-rules）は 数え上げ（perft）と 突き合わせで 確かめてあるが、
 * 「自分の 実装を 自分で 採点しない」ため、人が さわる 側は 外の しくみに 通してから 出す。
 * あいての 読みは 1 手で 何万局面も 調べるので、そちらは 速い 自前の きまりの まま。
 * （実測: 1 局面あたり 自前 0.04ms / tsshogi 1.2ms）
 */
import {
  Position, Square, PieceType, Record, Color,
  JishogiDeclarationRule, JishogiDeclarationResult,
  judgeJishogiDeclaration, countJishogiDeclarationPoint,
} from "tsshogi";
import {
  toSfen, toUsi, moveDrop, moveTo, moveFrom, movePromotes, legalMoves, doMove, undoMove,
  positionKey, SENTE, GOTE,
} from "./shogi-rules.mjs";

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

/**
 * おなじ ばんめんが 4 かい 出た ときの 判決。
 * moves は はじめから いままでの 手（自前の かたち）。
 *
 * ずっと 王手を かけていた 側が いれば その色（＝その側の まけ）、
 * いなければ null（＝ひきわけ）。外の しくみが 読めない ときは known:false。
 */
export function repetitionVerdict(moves) {
  let rec = null;
  try {
    rec = Record.newByUSI("position startpos moves " + moves.map(toUsi).join(" "));
  } catch (error) {
    rec = null;
  }
  if (!rec || rec instanceof Error) return { known: false, fourfold: false, checker: null };
  const who = rec.perpetualCheck;
  return {
    known: true,
    fourfold: rec.repetition,
    checker: who === Color.BLACK ? SENTE : who === Color.WHITE ? GOTE : null,
  };
}

const colorOfSide = color => (color === SENTE ? Color.BLACK : Color.WHITE);

function position(st) {
  try {
    return Position.newBySFEN(toSfen(st));
  } catch (error) {
    return null;
  }
}

/**
 * 玉が あいての じんちに 入った ときの「おわりに する」申し込みの 判決（24点法）。
 * "win"（31てん いじょう）/ "draw"（24〜30てん）/ null（まだ できない）。
 *
 * 申し込んで まけに なる こたえ（LOSE）は null に して 画面に 出さない＝
 * こどもが 申し込みで 負ける みちを 作らない。
 */
export function declarationVerdict(st, color) {
  const pos = position(st);
  if (!pos) return null;
  const verdict = judgeJishogiDeclaration(JishogiDeclarationRule.GENERAL24, pos, colorOfSide(color));
  if (verdict === JishogiDeclarationResult.WIN) return "win";
  if (verdict === JishogiDeclarationResult.DRAW) return "draw";
  return null;
}

/** 申し込みに つかう てんすう（あいての じんちの 駒と もちごま だけ 数える） */
export function declarationPoint(st, color) {
  const pos = position(st);
  if (!pos) return 0;
  return countJishogiDeclarationPoint(pos, colorOfSide(color));
}

/**
 * あいて（と ヒント）に わたす 点。その手で しょうぶが きまる ときだけ 数を かえす。
 * ・その手で おなじ ばんめんが 4 かいめに なる: ひきわけは 0、王手を つづけて いた ほうは まけ
 * ・つぎの 一手で あいてに 4 かいめに されて まけに なる: それも まけ扱い（王手の くりかえしを やめさせる）
 * どちらでも なければ null（ふつうに 読ませる）。判決は すべて 審判が 出す。
 *
 * keys/moves は ここまでの ばんめんの かぎと 手。st は m を 指した あとの 局面。
 */
export function repetitionScore(keys, moves, mover, st, m, mateScore) {
  const times = key => {
    let same = 1;
    for (const k of keys) if (k === key) same++;
    return same;
  };
  if (times(positionKey(st)) >= 4) {
    const verdict = repetitionVerdict(moves.concat([m]));
    if (!verdict.known || verdict.checker === null) return 0;
    return verdict.checker === mover ? -mateScore : mateScore;
  }
  for (const reply of legalMoves(st)) {
    doMove(st, reply);
    const fourth = times(positionKey(st)) >= 4;
    undoMove(st);
    if (!fourth) continue;
    const verdict = repetitionVerdict(moves.concat([m, reply]));
    if (verdict.known && verdict.checker === mover) return -mateScore;
  }
  return null;
}
