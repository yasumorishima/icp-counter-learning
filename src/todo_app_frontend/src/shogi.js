/**
 * しょうぎの 画面。きまりは shogi-rules、あいての 考えは shogi-ai に まかせる。
 * ここは「押したら どうなるか」と「どう 見せるか」だけを 持つ。
 *
 * 対局の とちゅうは 端末の 中だけに のこす（ほかへは 送らない）。
 */
import * as R from "./shogi-rules.mjs";
import { chooseMove, LEVELS } from "./shogi-ai.mjs";
import { sounds, confetti } from "./effects";

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
  legal = R.legalMoves(st);
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
  legal = R.legalMoves(st);
  flipped = Boolean(saved.flipped);
  for (const m of saved.moves || []) {
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
  legal = R.legalMoves(game.st);
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
    finish(won ? "win" : "lose", won ? "つみ！ あなたの かちです" : "つみ。あなたの まけです", quiet);
    return;
  }
  const key = game.keys[game.keys.length - 1];
  let same = 0;
  for (const k of game.keys) if (k === key) same++;
  if (same >= 4) finish("draw", "おなじ ばんめんが 4 かい。ひきわけ（せんにちて）です", quiet);
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
  if (!board) return;
  const room = Math.min(window.innerWidth * 0.88, 430);
  const cell = Math.max(24, Math.floor(room / 9));
  board.style.width = cell * 9 + "px";
  board.style.height = cell * 9 + "px";
  if (files) files.style.width = cell * 9 + 8 + "px";
}

function renderBoard() {
  sizeBoard();
  const targets = targetMap();
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
    if (sq === lastTo) classes.push("is-last");
    if (hint && (hint.from === sq || hint.to === sq)) classes.push("is-hint");
    if (checkedKing >= 0 && sq === checkedKing) classes.push("is-check");
    const name = p ? R.NAME[R.typeOf(p)] : "あき";
    const side = p ? (R.colorOf(p) === game.me ? "じぶんの " : "あいての ") : "";
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
  for (const t of R.HAND_ORDER) {
    if (!hand[t]) continue;
    const on = mine && sel && sel.drop === t ? " is-sel" : "";
    const fresh = justTook && justTook.color === color && justTook.type === t ? " is-new" : "";
    parts.push(
      '<button type="button" class="hand-piece' + on + fresh + '" data-hand="' + t + '"' +
        (mine ? "" : " disabled") + ' aria-label="' + R.NAME[t] + " " + hand[t] + 'まい">' +
        R.CHAR[t] + "<b>" + hand[t] + "</b></button>"
    );
  }
  const label = mine ? "じぶんの もちごま" : "あいての もちごま";
  const body = parts.length ? parts.join("") : '<span class="hand-none">なし</span>';
  $(id).innerHTML = '<span class="hand-owner">' + label + "</span>" + body;
}

function renderStatus() {
  const el = $("shogi-status");
  if (game.over) {
    el.textContent = game.over.note;
    el.className = "shogi-status is-over";
    return;
  }
  const mine = game.st.turn === game.me;
  const check = R.inCheck(game.st, game.st.turn);
  let text;
  if (thinking) text = "あいてが かんがえています…";
  else if (check) text = mine ? "王手！ にげてください" : "王手を かけました";
  else text = mine ? "あなたの ばんです" : "あいての ばんです";
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
    el.textContent = "うごかしたい 駒を おしてね。";
    return;
  }
  if (sel.drop) {
    el.textContent = R.NAME[sel.drop] + "を 打つ ばしょを おしてね。みどりの ますに おけます。";
    return;
  }
  const type = R.typeOf(game.st.board[sel.from]);
  const canGo = legal.some(m => !R.moveDrop(m) && R.moveFrom(m) === sel.from);
  if (!canGo) {
    el.textContent = R.inCheck(game.st, game.me)
      ? "王手が かかっています。この駒では 玉を 助けられません。ほかの駒を えらんでね。"
      : R.NAME[type] + "は いま うごけません（行ける ますが ありません）。";
    return;
  }
  el.textContent = R.NAME[type] + "：" + R.HOW[type];
}

function renderKifu() {
  const list = game.kifu.map((t, i) => "<li><span>" + (i + 1) + "</span>" + t + "</li>");
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
    "あいて：" + LEVELS[game.level].label + "　じぶん：" + (game.me === R.SENTE ? "せんて" : "ごて");
  renderBoard();
  renderHands();
  renderStatus();
  renderHelp();
  renderKifu();
  $("shogi-undo").disabled = thinking || game.moves.length === 0;
  $("shogi-hint").disabled = thinking || Boolean(game.over) || game.st.turn !== game.me;
  $("shogi-resign").disabled = Boolean(game.over);
  if (game.over) showOver();
}

function showOver() {
  const box = $("shogi-over");
  // いちど 閉じたら、画面を 描き直すたびに 出しなおさない
  if (overShown) return;
  overShown = true;
  const result = game.over.result;
  $("shogi-over-face").textContent = result === "win" ? "🎉" : result === "lose" ? "🙂" : "🤝";
  $("shogi-over-title").textContent = result === "win" ? "かちました！" : result === "lose" ? "まけました" : "ひきわけ";
  const stats = readJson(STATS_KEY) || { win: 0, lose: 0, draw: 0 };
  $("shogi-over-note").textContent =
    game.over.note + "　これまで " + (stats.win || 0) + " かち " + (stats.lose || 0) + " まけ " + (stats.draw || 0) + " わけ";
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
      '" data-level="' + n + '">' + LEVELS[n].label + "</button>")
    .join("");
  $("shogi-side").innerHTML = [
    [R.SENTE, "せんて（さきに 指す）"],
    [R.GOTE, "ごて（あとから 指す）"],
  ]
    .map(pair => '<button type="button" class="shogi-seg-btn' + (setup.side === pair[0] ? " is-on" : "") +
      '" data-side="' + pair[0] + '">' + pair[1] + "</button>")
    .join("");

  const saved = readJson(SAVE_KEY);
  const canResume = Boolean(saved && saved.moves && saved.moves.length && !saved.over);
  $("shogi-resume-row").classList.toggle("is-hidden", !canResume);

  const stats = readJson(STATS_KEY);
  $("shogi-record").textContent = stats
    ? "これまで " + (stats.win || 0) + " かち " + (stats.lose || 0) + " まけ " + (stats.draw || 0) + " わけ"
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
  $("shogi-promote-note").textContent =
    R.NAME[type] + "は 成ると 「" + R.NAME[R.promoted(type)] + "」に なります（" + R.HOW[R.promoted(type)] + "）。";
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
  let m = 0;
  try {
    m = await chooseMove(R.cloneState(game.st), game.level);
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
  legal = R.legalMoves(st);
  for (const m of moves) applyMove(m, true);
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
    m = await chooseMove(R.cloneState(game.st), 2, { budget: 500 });
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
    ? "もちごまの " + R.NAME[drop] + "を " + R.squareText(to) + "に 打つのは どうかな。"
    : R.squareText(to) + "へ うごかすのは どうかな。";
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
  $("shogi-resign").addEventListener("click", () => {
    if (!game || game.over) return;
    finish("lose", "まけを みとめました");
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

  // Esc で きく画面を 閉じる。成るか きいている ときは その手を やめる（まだ 指していない）
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!$("shogi-promote").classList.contains("is-hidden")) {
      pending = null;
      $("shogi-promote").classList.add("is-hidden");
      render();
      return;
    }
    if (!$("shogi-over").classList.contains("is-hidden")) $("shogi-over").classList.add("is-hidden");
  });
}

/** 画面に 出すとき。対局が のこっていれば その つづき、なければ 用意の 画面 */
export function renderShogi() {
  if (game) render();
  else renderSetup();
}
