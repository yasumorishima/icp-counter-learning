/**
 * しょうぎの 画面。きまりは shogi-rules、あいての 考えは shogi-ai に まかせる。
 * ここは「押したら どうなるか」と「どう 見せるか」だけを 持つ。
 *
 * 対局の とちゅうは 端末の 中だけに のこす（ほかへは 送らない）。
 */
import * as R from "./shogi-rules.mjs";
import { chooseMove, LEVELS, MATE } from "./shogi-ai.mjs";
import {
  refereed, repetitionVerdict, declarationVerdict, declarationPoint, repetitionScore,
} from "./shogi-referee";
import { sounds, confetti } from "./effects";
import { t } from "./i18n";

/** 駒の 名前。文章の 中で 名ざしする ぶんだけ ことばに あわせる（盤の 字は 漢字の まま） */
const pieceName = type => t("sg_pc" + type);
/** 駒の うごきかたの 説明 */
const howText = type => t("sg_how" + type);
/** あいての つよさの 呼び名 */
const levelName = level => t("sg_lv" + level);
/** しょうぶが ついた ときの ひとこと。{ k, a } で 持っておき、出すときに ことばへ 直す */
const noteText = note =>
  typeof note === "string" ? note : note ? t(note.k, ...(note.a || [])) : "";

const $ = id => document.getElementById(id);
const SAVE_KEY = "shogi.game.v1";
const STATS_KEY = "shogi.stats.v1";
const SETUP_KEY = "shogi.setup.v1";

let show = () => {};
let game = null;
let legal = [];
let sel = null;
let pending = null;
let hint = null;
let hintText = "";
let flipped = false;
let thinking = false;
// 直前に 取った駒（持ち駒の どれが 増えたかを 目で 分かるように する）
let justTook = null;
let setup = { level: 2, side: R.SENTE };
// 対局を 作り直したら 数を 進める。まえの 対局の 考えごとが 戻ってきても 混ざらないように
let generation = 0;
let overShown = false;

/**
 * いま 指せる手。自前の きまりが 出した ものを、外の しくみ（審判）に 通してから つかう。
 * 画面に 出る 行き先も、受け付ける 手も、すべて これを 通る。
 */
function legalNow(st) {
  return refereed(st, R.legalMoves(st));
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* 保存できない 端末でも あそべる */
  }
}

function dropSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    /* 消せなくても つづけられる */
  }
}

// --- 対局を つくる・もどす ---------------------------------------------------

function startGame(level, me) {
  generation++;
  justTook = null;
  thinking = false;
  pending = null;
  overShown = false;
  $("shogi-promote").classList.add("is-hidden");
  $("shogi-over").classList.add("is-hidden");
  const st = R.initialState();
  game = { st, level, me, moves: [], kifu: [], keys: [R.positionKey(st)], over: null };
  legal = legalNow(st);
  sel = null;
  hint = null;
  hintText = "";
  save();
  render();
  if (st.turn !== me) aiTurn();
}

function save() {
  if (!game) return;
  writeJson(SAVE_KEY, { level: game.level, me: game.me, moves: game.moves, flipped, over: game.over });
}

function resume(saved) {
  // こわれた 保存で 画面ごと 止まらないように、形を 見てから 読む
  if (!saved || !LEVELS[saved.level] || (saved.me !== R.SENTE && saved.me !== R.GOTE) || !Array.isArray(saved.moves)) {
    dropSave();
    return false;
  }
  generation++;
  thinking = false;
  pending = null;
  overShown = false;
  const st = R.initialState();
  game = { st, level: saved.level, me: saved.me, moves: [], kifu: [], keys: [R.positionKey(st)], over: null };
  legal = legalNow(st);
  flipped = Boolean(saved.flipped);
  for (const m of saved.moves || []) {
    // しょうぶが ついた あとの 手は 読まない
    if (game.over) break;
    if (!legal.includes(m)) {
      game = null;
      dropSave();
      return false;
    }
    applyMove(m, true);
  }
  game.over = saved.over || game.over;
  return true;
}

function applyMove(m, quiet) {
  const mover = game.st.turn;
  const previous = game.moves.length ? R.moveTo(game.moves[game.moves.length - 1]) : -1;
  const text = R.moveText(game.st, m, previous, legal);
  const taken = game.st.board[R.moveTo(m)];
  const captured = taken !== 0;
  justTook = captured ? { color: mover, type: R.demote(R.typeOf(taken)) } : null;
  R.doMove(game.st, m);
  game.moves.push(m);
  game.kifu.push(text);
  game.keys.push(R.positionKey(game.st));
  legal = legalNow(game.st);
  sel = null;
  hint = null;
  hintText = "";
  if (!quiet) {
    // 取ったのが じぶんか あいてかで 音を 変える
    if (captured) (mover === game.me ? sounds.right : sounds.wrong)();
    else sounds.tick();
  }
  checkEnd(quiet);
  save();
}

function checkEnd(quiet) {
  if (game.over) return;
  if (!legal.length) {
    const loser = game.st.turn;
    const won = loser !== game.me;
    finish(won ? "win" : "lose", { k: won ? "sg_mateWin" : "sg_mateLose" }, quiet);
    return;
  }
  if (sameCount() < 4) return;
  // 4 かいめの 判決（ひきわけか、王手を かけつづけた ほうの まけか）は 審判に 出させる
  const verdict = repetitionVerdict(game.moves);
  if (!verdict.known) {
    // 審判に 出せなかった ときだけ ここに 来る。きまりの 既定どおり 引き分けに するが、黙らない
    console.error("審判が 千日手の 判決を 出せませんでした。引き分けに します");
  }
  if (verdict.checker === null) {
    finish("draw", { k: "sg_repDraw" }, quiet);
    return;
  }
  const mine = verdict.checker === game.me;
  finish(mine ? "lose" : "win", { k: mine ? "sg_repLose" : "sg_repWin" }, quiet);
}

/** いまの ばんめんが これまでに 何かい 出たか（いまの ぶんも 数える） */
function sameCount() {
  const key = game.keys[game.keys.length - 1];
  let same = 0;
  for (const k of game.keys) if (k === key) same++;
  return same;
}

/**
 * 玉が あいての じんちに 入った ときの「おわりに する」申し込み。
 * できる かどうかの 判断は 審判（外の しくみ）に させる。
 * 申し込んで まけに なる こたえは 審判が null に して かえすので、押して 負ける ことは ない。
 */
function declareState() {
  if (!game || game.over || thinking || game.st.turn !== game.me) return null;
  const ks = game.st.king[game.me];
  if (ks < 0 || !R.inZone(game.me, ks)) return null;
  let inside = 0;
  for (let sq = 0; sq < 81; sq++) {
    const p = game.st.board[sq];
    if (!p || R.colorOf(p) !== game.me || R.typeOf(p) === R.K) continue;
    if (R.inZone(game.me, sq)) inside++;
  }
  return { verdict: declarationVerdict(game.st, game.me), point: declarationPoint(game.st, game.me), inside };
}

function finish(result, note, quiet) {
  game.over = { result, note };
  if (!quiet) {
    const stats = readJson(STATS_KEY) || { win: 0, lose: 0, draw: 0 };
    stats[result] = (stats[result] || 0) + 1;
    writeJson(STATS_KEY, stats);
    if (result === "win") sounds.levelUp();
    else if (result === "lose") sounds.wrong();
    else sounds.finish();
  }
  save();
}

// --- 見せかた ---------------------------------------------------------------

/** じぶんが 下に なるように ならべる */
function reversed() {
  return (game.me === R.GOTE) !== flipped;
}

function targetMap() {
  const map = new Map();
  if (!sel || !game || game.over || game.st.turn !== game.me) return map;
  for (const m of legal) {
    const drop = R.moveDrop(m);
    if (sel.drop) {
      if (drop !== sel.drop) continue;
    } else if (drop || R.moveFrom(m) !== sel.from) {
      continue;
    }
    const to = R.moveTo(m);
    if (!map.has(to)) map.set(to, []);
    map.get(to).push(m);
  }
  return map;
}

/**
 * 盤の 幅を 9 の倍数の 整数に そろえる。
 * 端数のままだと ます 1 つが 37.23px と 37.25px に 割れて 大きさが ちがって 見える。
 */
function sizeBoard() {
  const board = $("shogi-board");
  const files = $("shogi-files");
  const ranks = $("shogi-ranks");
  if (!board) return;
  // 窓の 幅では なく、入れ物の 実際の 幅から 決める（段の 目盛りと 枠の ぶんを 引く）
  const holder = board.closest(".board-wrap");
  const outer = holder && holder.clientWidth ? holder.clientWidth : window.innerWidth;
  const side = (ranks ? Math.ceil(ranks.getBoundingClientRect().width) : 12) + 4 + 8;
  const room = Math.min(outer - side, 430);
  const cell = Math.max(20, Math.floor(room / 9));
  board.style.width = cell * 9 + "px";
  board.style.height = cell * 9 + "px";
  if (files) files.style.width = cell * 9 + 8 + "px";
}

/**
 * 「駒の うごきとしては 行けるが、指すと 反則に なる」ます。
 * 玉なら あいてに ねらわれている ます、ほかの駒なら 動かすと 玉が 取られる ます。
 * ここを ✕ で 見せないと「なぜ 行けないのか」が 分からない。
 */
function blockedMap() {
  const map = new Set();
  if (!sel || sel.drop || !game || game.over || game.st.turn !== game.me) return map;
  const ok = new Set();
  for (const m of legal) if (!R.moveDrop(m) && R.moveFrom(m) === sel.from) ok.add(R.moveTo(m));
  for (const m of R.pseudoMoves(game.st, [])) {
    if (R.moveDrop(m) || R.moveFrom(m) !== sel.from) continue;
    const to = R.moveTo(m);
    if (!ok.has(to)) map.add(to);
  }
  return map;
}

function renderBoard() {
  sizeBoard();
  const targets = targetMap();
  const blocked = blockedMap();
  const rev = reversed();
  const lastTo = game.moves.length ? R.moveTo(game.moves[game.moves.length - 1]) : -1;
  // 王手を かけられている 側の 玉に しるしを つける（なぜ 動けないかが 分かるように）
  const checkedKing = R.inCheck(game.st, game.st.turn) ? game.st.king[game.st.turn] : -1;
  const cells = [];
  for (let i = 0; i < 81; i++) {
    const sq = rev ? 80 - i : i;
    const p = game.st.board[sq];
    const classes = ["sq"];
    if (sel && !sel.drop && sel.from === sq) classes.push("is-sel");
    if (targets.has(sq)) classes.push(p ? "is-take" : "is-go");
    else if (blocked.has(sq)) classes.push("is-no");
    if (sq === lastTo) classes.push("is-last");
    if (hint && (hint.from === sq || hint.to === sq)) classes.push("is-hint");
    if (checkedKing >= 0 && sq === checkedKing) classes.push("is-check");
    const name = p ? pieceName(R.typeOf(p)) : t("sg_empty");
    const side = p ? (R.colorOf(p) === game.me ? t("sg_mine") : t("sg_theirs")) : "";
    let inner = "";
    if (p) {
      const komaClass = "koma" + (R.colorOf(p) === R.GOTE ? " is-gote" : "") + (R.typeOf(p) >= 9 ? " is-nari" : "");
      inner = '<span class="' + komaClass + '">' + R.faceOf(p) + "</span>";
    }
    cells.push(
      '<button type="button" class="' + classes.join(" ") + '" data-sq="' + sq +
        '" aria-label="' + R.squareText(sq) + " " + side + name + '">' + inner + "</button>"
    );
  }
  // キーボードで さわっている ときに、指すたび フォーカスが 飛ばないように 元の ますへ 戻す
  const focused = document.activeElement;
  const keepSq = focused && focused.classList && focused.classList.contains("sq") ? focused.dataset.sq : null;
  $("shogi-board").innerHTML = cells.join("");
  if (keepSq !== null) {
    const back = $("shogi-board").querySelector('.sq[data-sq="' + keepSq + '"]');
    if (back) back.focus();
  }

  const files = rev ? R.FILE_CHAR.slice().reverse() : R.FILE_CHAR;
  $("shogi-files").innerHTML = files.map(f => "<span>" + f + "</span>").join("");
  const ranks = rev ? R.RANK_CHAR.slice().reverse() : R.RANK_CHAR;
  $("shogi-ranks").innerHTML = ranks.map(r => "<span>" + r + "</span>").join("");
}

function renderHands() {
  const top = game.me === R.SENTE ? R.GOTE : R.SENTE;
  paintHand(top, "shogi-hand-gote", false);
  paintHand(game.me, "shogi-hand-sente", true);
}

function paintHand(color, id, mine) {
  const hand = game.st.hands[color];
  const parts = [];
  for (const type of R.HAND_ORDER) {
    if (!hand[type]) continue;
    const on = mine && sel && sel.drop === type ? " is-sel" : "";
    const fresh = justTook && justTook.color === color && justTook.type === type ? " is-new" : "";
    parts.push(
      '<button type="button" class="hand-piece' + on + fresh + '" data-hand="' + type + '"' +
        (mine ? "" : " disabled") +
        ' aria-label="' + t("sg_handCount", pieceName(type), hand[type]) + '">' +
        R.CHAR[type] + "<b>" + hand[type] + "</b></button>"
    );
  }
  const label = mine ? t("sg_myHand") : t("sg_theirHand");
  const body = parts.length ? parts.join("") : '<span class="hand-none">' + t("sg_handNone") + "</span>";
  $(id).innerHTML = '<span class="hand-owner">' + label + "</span>" + body;
}

function renderStatus() {
  const el = $("shogi-status");
  if (game.over) {
    el.textContent = noteText(game.over.note);
    el.className = "shogi-status is-over";
    return;
  }
  const mine = game.st.turn === game.me;
  const check = R.inCheck(game.st, game.st.turn);
  let text;
  if (thinking) text = t("sg_thinking");
  else if (check) text = mine ? t("sg_checkYou") : t("sg_checkThem");
  else text = mine ? t("sg_yourTurn") : t("sg_theirTurn");
  if (!thinking && sameCount() === 3) {
    text += t("sg_rep3");
  }
  el.textContent = text;
  el.className = "shogi-status" + (check ? " is-check" : "");
}

function renderHelp() {
  const el = $("shogi-help");
  if (hintText) {
    el.textContent = hintText;
    return;
  }
  if (!sel) {
    el.textContent = t("sg_pickPiece");
    return;
  }
  if (sel.drop) {
    el.textContent = t("sg_dropWhere", pieceName(sel.drop));
    return;
  }
  const type = R.typeOf(game.st.board[sel.from]);
  const canGo = legal.some(m => !R.moveDrop(m) && R.moveFrom(m) === sel.from);
  const stopped = blockedMap().size > 0;
  const why = type === R.K ? t("sg_whyKing") : t("sg_whyOther");
  if (!canGo) {
    if (stopped) {
      const head = type === R.K ? t("sg_kingSurrounded") : t("sg_cantMoveNow", pieceName(type));
      el.textContent = t("sg_join", head, why);
    } else if (R.inCheck(game.st, game.me)) {
      el.textContent = t("sg_checkOtherPiece");
    } else {
      el.textContent = t("sg_noSquares", pieceName(type));
    }
    return;
  }
  el.textContent = stopped
    ? t("sg_howLineWhy", pieceName(type), howText(type), why)
    : t("sg_howLine", pieceName(type), howText(type));
}

function renderDeclare() {
  const button = $("shogi-declare");
  const note = $("shogi-declare-note");
  const state = declareState();
  if (!state) {
    button.classList.add("is-hidden");
    note.classList.add("is-hidden");
    return;
  }
  note.classList.remove("is-hidden");
  const head = t("sg_declHead", state.point);
  if (state.verdict) {
    button.classList.remove("is-hidden");
    button.textContent = state.verdict === "win" ? t("sg_declWinBtn") : t("sg_declDrawBtn");
    note.textContent = t(
      "sg_join", head,
      state.verdict === "win" ? t("sg_declWinNote") : t("sg_declDrawNote"),
    );
    return;
  }
  button.classList.add("is-hidden");
  const short = [];
  if (R.inCheck(game.st, game.me)) short.push(t("sg_declNeedCheck"));
  if (state.inside < 10) short.push(t("sg_declNeedPieces", 10 - state.inside));
  if (state.point < 24) short.push(t("sg_declNeedPoints", 24 - state.point));
  note.textContent = short.length
    ? t("sg_join", head, t("sg_declCanEnd", short.join(t("sg_declSlash"))))
    : head;
}

function renderKifu() {
  const list = game.kifu.map((text, i) => "<li><span>" + (i + 1) + "</span>" + text + "</li>");
  $("shogi-kifu-list").innerHTML = list.join("");
}

function render() {
  if (!game) {
    renderSetup();
    return;
  }
  $("shogi-setup").classList.add("is-hidden");
  $("shogi-play").classList.remove("is-hidden");
  $("shogi-level-chip").textContent =
    t("sg_chip", levelName(game.level), game.me === R.SENTE ? t("sg_sente") : t("sg_gote"));
  renderBoard();
  renderHands();
  renderStatus();
  renderHelp();
  renderDeclare();
  renderKifu();
  $("shogi-undo").disabled = thinking || game.moves.length === 0;
  $("shogi-hint").disabled = thinking || Boolean(game.over) || game.st.turn !== game.me;
  $("shogi-resign").disabled = Boolean(game.over);
  if (game.over) showOver();
}

function showOver() {
  const box = $("shogi-over");
  const result = game.over.result;
  $("shogi-over-face").textContent = result === "win" ? "🎉" : result === "lose" ? "🙂" : "🤝";
  $("shogi-over-title").textContent =
    result === "win" ? t("sg_overWin") : result === "lose" ? t("sg_overLose") : t("sg_overDraw");
  const stats = readJson(STATS_KEY) || { win: 0, lose: 0, draw: 0 };
  $("shogi-over-note").textContent =
    t("sg_noteRecord", noteText(game.over.note), stats.win || 0, stats.lose || 0, stats.draw || 0);
  // いちど 閉じたら 出しなおさない（ことばを 変えた ときの 書き直しは 上で 済ませる）
  if (overShown) return;
  overShown = true;
  box.classList.remove("is-hidden");
  $("shogi-again").focus();
  if (result === "win") confetti($("shogi-confetti"), 80);
}

function renderSetup() {
  $("shogi-play").classList.add("is-hidden");
  $("shogi-setup").classList.remove("is-hidden");
  $("shogi-over").classList.add("is-hidden");
  $("shogi-promote").classList.add("is-hidden");

  $("shogi-level").innerHTML = [1, 2, 3]
    .map(n => '<button type="button" class="shogi-seg-btn' + (setup.level === n ? " is-on" : "") +
      '" data-level="' + n + '">' + levelName(n) + "</button>")
    .join("");
  $("shogi-side").innerHTML = [
    [R.SENTE, t("sg_senteFull")],
    [R.GOTE, t("sg_goteFull")],
  ]
    .map(pair => '<button type="button" class="shogi-seg-btn' + (setup.side === pair[0] ? " is-on" : "") +
      '" data-side="' + pair[0] + '">' + pair[1] + "</button>")
    .join("");

  const saved = readJson(SAVE_KEY);
  const canResume = Boolean(saved && saved.moves && saved.moves.length && !saved.over);
  $("shogi-resume-row").classList.toggle("is-hidden", !canResume);

  const stats = readJson(STATS_KEY);
  $("shogi-record").textContent = stats
    ? t("sg_record", stats.win || 0, stats.lose || 0, stats.draw || 0)
    : "";
}

// --- 押したときの うごき -----------------------------------------------------

function onSquare(sq) {
  if (!game || game.over || thinking || game.st.turn !== game.me) return;
  const targets = targetMap();
  if (targets.has(sq)) {
    choose(targets.get(sq));
    return;
  }
  const p = game.st.board[sq];
  if (p && R.colorOf(p) === game.me) sel = { from: sq };
  else sel = null;
  hintText = "";
  render();
}

function onHand(type) {
  if (!game || game.over || thinking || game.st.turn !== game.me) return;
  if (!game.st.hands[game.me][type]) return;
  sel = sel && sel.drop === type ? null : { drop: type };
  hintText = "";
  render();
}

/** 成れる ときは きく。えらべない ときは そのまま 指す */
function choose(moves) {
  if (moves.length === 1) {
    humanMove(moves[0]);
    return;
  }
  const promote = moves.find(m => R.movePromotes(m));
  const plain = moves.find(m => !R.movePromotes(m));
  if (!promote || !plain) {
    humanMove(moves[0]);
    return;
  }
  pending = { promote, plain, gen: generation };
  const type = R.typeOf(game.st.board[R.moveFrom(promote)]);
  const target = game.st.board[R.moveTo(promote)];
  const takes = target ? t("sg_takes", pieceName(R.typeOf(target))) : "";
  const grows = t(
    "sg_promoteNote", pieceName(type), pieceName(R.promoted(type)), howText(R.promoted(type)),
  );
  $("shogi-promote-note").textContent = takes ? t("sg_join", takes, grows) : grows;
  $("shogi-promote").classList.remove("is-hidden");
  $("shogi-promote-yes").focus();
}

function humanMove(m) {
  // 画面を またいだ 古い手が のこっている ことが あるので、いまの 局面で 合法か 見る
  if (!game || game.over || !legal.includes(m)) return;
  applyMove(m);
  render();
  if (!game.over) aiTurn();
}

async function aiTurn() {
  if (!game || game.over || game.st.turn === game.me) return;
  // 考えている あいだに 対局が 作り直されたら、この 考えごとは すてる
  const gen = generation;
  thinking = true;
  render();
  // すぐ 指すと 見えないので すこし 待つ
  await new Promise(resolve => setTimeout(resolve, 260));
  if (gen !== generation) return;
  const other = game.me === R.SENTE ? R.GOTE : R.SENTE;
  if (declarationVerdict(game.st, other) === "win") {
    thinking = false;
    finish("lose", { k: "sg_aiDeclWin" });
    render();
    return;
  }
  let m = 0;
  try {
    m = await chooseMove(R.cloneState(game.st), game.level, { rootScore: repetitionScoreFor(other) });
  } catch (error) {
    console.error("あいてが 手を えらべませんでした", error);
  }
  if (gen !== generation) return;
  thinking = false;
  if (!game || game.over || game.st.turn === game.me) {
    render();
    return;
  }
  if (!m || !legal.includes(m)) m = legal[Math.floor(Math.random() * legal.length)];
  applyMove(m);
  render();
}

/** あいて（と ヒント）に「その手で しょうぶが きまるか」を 教える。判決は 審判が 出す */
function repetitionScoreFor(mover) {
  // 考えている あいだに 対局を やめる ことが あるので、その ときは 何も 教えない
  return (st, m) => (game ? repetitionScore(game.keys, game.moves, mover, st, m, MATE) : null);
}

/** まった。じぶんの ばんに もどるまで 手を もどす */
function undo() {
  if (!game || thinking || !game.moves.length) return;
  generation++;
  pending = null;
  overShown = false;
  $("shogi-promote").classList.add("is-hidden");
  const moves = game.moves.slice();
  let popped = 0;
  while (moves.length) {
    moves.pop();
    popped++;
    if ((moves.length % 2 === 0) === (game.me === R.SENTE)) break;
  }
  if (!popped) return;
  const level = game.level;
  const me = game.me;
  const st = R.initialState();
  game = { st, level, me, moves: [], kifu: [], keys: [R.positionKey(st)], over: null };
  legal = legalNow(st);
  for (const m of moves) {
    if (game.over) break;
    applyMove(m, true);
  }
  game.over = null;
  $("shogi-over").classList.add("is-hidden");
  save();
  render();
  if (game.st.turn !== game.me) aiTurn();
}

async function askHint() {
  if (!game || game.over || thinking || game.st.turn !== game.me) return;
  const gen = generation;
  thinking = true;
  render();
  let m = 0;
  try {
    m = await chooseMove(R.cloneState(game.st), 2, { budget: 500, rootScore: repetitionScoreFor(game.me) });
  } catch (error) {
    console.error("ヒントを 出せませんでした", error);
  }
  if (gen !== generation) return;
  thinking = false;
  if (!m) {
    render();
    return;
  }
  const to = R.moveTo(m);
  const drop = R.moveDrop(m);
  hint = { from: drop ? -1 : R.moveFrom(m), to };
  hintText = drop
    ? t("sg_hintDrop", pieceName(drop), R.squareText(to))
    : t("sg_hintMove", R.squareText(to));
  render();
}

// --- 入口 -------------------------------------------------------------------

export function initShogi(options) {
  show = options.show;
  const stored = readJson(SETUP_KEY);
  if (stored && LEVELS[stored.level]) setup = { level: stored.level, side: stored.side === R.GOTE ? R.GOTE : R.SENTE };

  $("shogi-board").addEventListener("click", event => {
    const cell = event.target.closest(".sq");
    if (cell) onSquare(Number(cell.dataset.sq));
  });
  ["shogi-hand-gote", "shogi-hand-sente"].forEach(id => {
    $(id).addEventListener("click", event => {
      const button = event.target.closest(".hand-piece");
      if (button && !button.disabled) onHand(Number(button.dataset.hand));
    });
  });

  $("shogi-level").addEventListener("click", event => {
    const button = event.target.closest("[data-level]");
    if (!button) return;
    setup.level = Number(button.dataset.level);
    writeJson(SETUP_KEY, setup);
    renderSetup();
  });
  $("shogi-side").addEventListener("click", event => {
    const button = event.target.closest("[data-side]");
    if (!button) return;
    setup.side = Number(button.dataset.side);
    writeJson(SETUP_KEY, setup);
    renderSetup();
  });

  $("shogi-start").addEventListener("click", () => {
    flipped = false;
    startGame(setup.level, setup.side);
  });
  $("shogi-resume").addEventListener("click", () => {
    const saved = readJson(SAVE_KEY);
    if (saved && resume(saved)) {
      render();
      if (!game.over && game.st.turn !== game.me) aiTurn();
    } else {
      renderSetup();
    }
  });

  $("shogi-quit").addEventListener("click", () => {
    generation++;
    thinking = false;
    pending = null;
    overShown = false;
    game = null;
    sel = null;
    renderSetup();
  });
  $("shogi-flip").addEventListener("click", () => {
    flipped = !flipped;
    save();
    render();
  });
  window.addEventListener("resize", () => {
    if (game) sizeBoard();
  });
  $("shogi-undo").addEventListener("click", undo);
  $("shogi-hint").addEventListener("click", askHint);
  $("shogi-declare").addEventListener("click", () => {
    const state = declareState();
    if (!state || !state.verdict) return;
    if (state.verdict === "win") {
      finish("win", { k: "sg_declWinFinish", a: [state.point] });
    } else {
      finish("draw", { k: "sg_declDrawFinish", a: [state.point] });
    }
    render();
  });
  $("shogi-resign").addEventListener("click", () => {
    if (!game || game.over) return;
    finish("lose", { k: "sg_resigned" });
    render();
  });

  $("shogi-promote-yes").addEventListener("click", () => {
    if (!pending || pending.gen !== generation) return;
    const m = pending.promote;
    pending = null;
    $("shogi-promote").classList.add("is-hidden");
    humanMove(m);
  });
  $("shogi-promote-no").addEventListener("click", () => {
    if (!pending || pending.gen !== generation) return;
    const m = pending.plain;
    pending = null;
    $("shogi-promote").classList.add("is-hidden");
    humanMove(m);
  });

  $("shogi-again").addEventListener("click", () => {
    $("shogi-over").classList.add("is-hidden");
    dropSave();
    flipped = false;
    startGame(game ? game.level : setup.level, game ? game.me : setup.side);
  });
  $("shogi-over-close").addEventListener("click", () => {
    $("shogi-over").classList.add("is-hidden");
  });

  // 成るか きいている ときに やめたら、黙って 消えないよう その ことを 出す
  const cancelPromote = () => {
    if ($("shogi-promote").classList.contains("is-hidden")) return false;
    pending = null;
    $("shogi-promote").classList.add("is-hidden");
    render();
    $("shogi-help").textContent = t("sg_promoteCancel");
    return true;
  };

  // 枠の 外を おしたら やめる（押しても なにも 起きないと 迷うため）
  $("shogi-promote").addEventListener("click", event => {
    if (event.target === $("shogi-promote")) cancelPromote();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (cancelPromote()) return;
    if (!$("shogi-over").classList.contains("is-hidden")) $("shogi-over").classList.add("is-hidden");
  });
}

/** 画面に 出すとき。対局が のこっていれば その つづき、なければ 用意の 画面 */
export function renderShogi() {
  if (game) render();
  else renderSetup();
}
