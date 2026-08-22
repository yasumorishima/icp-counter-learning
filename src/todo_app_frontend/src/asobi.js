/**
 * あそび（幼児向け）。3 さいくらいの 子が、文字を 読めなくても 遊べる ことだけを 目当てに する。
 *
 * 守って いる こと:
 *   ・さわるだけ で 進む（めいろ だけ なぞる）。当たり判定は 指の 大きさ（64px 以上）
 *   ・まちがいを 出さない。×も 減点も 時間切れも 無い。外した ときは 何も 起きない
 *   ・絵は すべて 自前で 描く（絵文字は 端末に よって 出ないので 使わない）
 *   ・記録は 残さない。キャニスターにも localStorage にも 書かない
 *   ・画面を 離れたら タイマーと 描画を かならず 止める（電池の ため）
 */

import { t } from "./i18n";
import { sounds, confetti } from "./effects";

const GAMES = ["mogura", "fuusen", "meiro", "kazoeru", "katachi", "ookii"];

const COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb7185"];
const SHAPES = ["circle", "square", "triangle", "star"];

let host = null;
let cleanups = [];

/** 後始末は かならず ここに 積む（画面を 離れる ときに まとめて 止める） */
function onLeave(fn) {
  cleanups.push(fn);
}

export function stopAsobi() {
  cleanups.forEach(fn => {
    try {
      fn();
    } catch (error) {
      /* 止める側で こけても 画面遷移は 続ける */
    }
  });
  cleanups = [];
}

// --- 小さな 道具 ------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randInt(lo, hi) {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function reduceMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** かたちを 1 つ 描く。色は 呼ぶ側が 決める（かたち あてでは 全部 同じ色に する） */
function shapeNode(kind, size, color) {
  const node = el("span", "as-shape as-shape-" + kind);
  node.style.width = size + "px";
  node.style.height = size + "px";
  node.style.background = color;
  return node;
}

function ballNode(size) {
  const node = el("span", "as-ball");
  node.style.width = size + "px";
  node.style.height = size + "px";
  return node;
}

// --- 画面の 骨 --------------------------------------------------------------

/** どの あそびにも ある 上の帯（もどる・題・進み具合）を 作る */
function makeFrame(titleKey, total) {
  host.replaceChildren();

  const bar = el("div", "as-bar");
  const back = el("a", "as-back");
  back.href = "#/asobi";
  back.textContent = t("as_toHub");
  back.setAttribute("aria-label", t("as_back"));
  bar.append(back);

  const title = el("h2", "as-title", t(titleKey));
  const track = el("div", "as-track");
  const fill = el("div", "as-fill");
  track.append(fill);
  const count = el("p", "as-count", t("as_count", 0, total));

  const stage = el("div", "as-stage");
  host.append(bar, title, track, count, stage);

  return {
    stage,
    progress(done) {
      fill.style.width = Math.round((done / total) * 100) + "%";
      count.textContent = t("as_count", done, total);
    },
  };
}

/** 終わりの 画面。かみふぶきと、もういちど / ほかの あそび */
function finish(gameId) {
  sounds.finish();
  host.replaceChildren();

  const panel = el("div", "as-done");
  const canvas = el("canvas", "as-confetti");
  const text = el("p", "as-done-text", t("as_done"));

  const again = el("button", "cta");
  again.type = "button";
  again.append(el("span", "cta-label", t("as_again")));
  again.addEventListener("click", () => start(gameId));

  const back = el("a", "btn-ghost as-done-back", t("as_back"));
  back.href = "#/asobi";

  panel.append(canvas, text, again, back);
  host.append(panel);
  confetti(canvas, 60);
}

// --- 1. もぐら --------------------------------------------------------------

function playMogura() {
  const TARGET = 10;
  const HOLES = 6;
  const frame = makeFrame("as_moguraTitle", TARGET);
  const board = el("div", "as-holes");
  frame.stage.append(board);

  const moles = [];
  let caught = 0;
  let done = false;

  for (let i = 0; i < HOLES; i++) {
    const hole = el("div", "as-hole");
    const mole = el("button", "as-mole");
    mole.type = "button";
    mole.setAttribute("aria-label", t("as_mogura"));
    mole.append(el("i", "as-eye as-eye-l"), el("i", "as-eye as-eye-r"), el("b", "as-nose"));
    hole.append(mole);
    board.append(hole);
    const slot = { mole, up: false, timer: 0 };
    moles.push(slot);
    mole.addEventListener("pointerdown", event => {
      event.preventDefault();
      hit(slot);
    });
  }

  function hit(slot) {
    // 出て いない ときに さわっても 何も 起きない（外しても とがめない）
    if (!slot.up || done) return;
    slot.up = false;
    slot.mole.classList.remove("is-up");
    slot.mole.classList.add("is-hit");
    window.clearTimeout(slot.timer);
    slot.timer = window.setTimeout(() => slot.mole.classList.remove("is-hit"), 260);
    sounds.right();
    caught += 1;
    frame.progress(caught);
    if (caught >= TARGET) {
      done = true;
      window.clearInterval(popper);
      window.setTimeout(() => finish("mogura"), 260);
    }
  }

  function popOne() {
    if (done) return;
    const idle = moles.filter(slot => !slot.up);
    if (!idle.length) return;
    const slot = pick(idle);
    slot.up = true;
    slot.mole.classList.add("is-up");
    window.clearTimeout(slot.timer);
    slot.timer = window.setTimeout(() => {
      slot.up = false;
      slot.mole.classList.remove("is-up");
    }, randInt(1400, 2200));
  }

  const popper = window.setInterval(popOne, 900);
  popOne();

  onLeave(() => {
    window.clearInterval(popper);
    moles.forEach(slot => window.clearTimeout(slot.timer));
  });
}

// --- 2. ふうせん ------------------------------------------------------------

function playFuusen() {
  const TARGET = 10;
  const frame = makeFrame("as_fuusenTitle", TARGET);
  const sky = el("div", "as-sky");
  frame.stage.append(sky);

  const live = [];
  let popped = 0;
  let done = false;
  let raf = 0;
  let last = 0;
  let sinceSpawn = 99;

  function spawn() {
    const width = sky.clientWidth || 320;
    const node = el("button", "as-balloon");
    node.type = "button";
    node.setAttribute("aria-label", t("as_fuusen"));
    const body = el("span", "as-balloon-body");
    body.style.background = "radial-gradient(circle at 34% 28%, #ffffff 0%, " + pick(COLORS) + " 74%)";
    node.append(body, el("span", "as-balloon-string"));
    sky.append(node);

    const item = {
      node,
      x: randInt(10, Math.max(10, width - 74)),
      y: sky.clientHeight || 300,
      // ゆっくり（幼児が 追いつける 速さ）。動きを 減らす 設定なら さらに ゆっくり
      v: reduceMotion() ? randInt(14, 20) : randInt(26, 42),
    };
    node.addEventListener("pointerdown", event => {
      event.preventDefault();
      pop(item);
    });
    live.push(item);
  }

  function pop(item) {
    if (done || item.gone) return;
    item.gone = true;
    item.node.classList.add("is-pop");
    window.setTimeout(() => item.node.remove(), 300);
    const at = live.indexOf(item);
    if (at >= 0) live.splice(at, 1);
    sounds.right();
    popped += 1;
    frame.progress(popped);
    if (popped >= TARGET) {
      done = true;
      window.setTimeout(() => finish("fuusen"), 300);
    }
  }

  function frameStep(now) {
    if (done) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    sinceSpawn += dt;
    if (sinceSpawn > 1.0 && live.length < 5) {
      spawn();
      sinceSpawn = 0;
    }
    for (let i = live.length - 1; i >= 0; i--) {
      const item = live[i];
      item.y -= item.v * dt;
      item.node.style.transform = "translate(" + item.x + "px, " + item.y + "px)";
      // 上に 抜けても 失敗では ない。だまって 消えて また 出て くる
      if (item.y < -120) {
        item.node.remove();
        live.splice(i, 1);
      }
    }
    raf = window.requestAnimationFrame(frameStep);
  }

  raf = window.requestAnimationFrame(frameStep);
  onLeave(() => {
    done = true;
    window.cancelAnimationFrame(raf);
  });
}

// --- 3. めいろ --------------------------------------------------------------

const MAZE_N = 5;
const MAZE_ROUNDS = 3;

/**
 * 行き止まりの ない 1 本道を 作る（幼児が 迷わない ため）。
 * 左上から 右下へ 自分と ぶつからない ように 歩き、着いた ところで その道を 採る。
 */
function makePath(n) {
  const seen = new Set();
  const path = [];
  const key = (x, y) => y * n + x;

  function walk(x, y) {
    path.push([x, y]);
    seen.add(key(x, y));
    if (x === n - 1 && y === n - 1) return true;
    for (const [dx, dy] of shuffle([[1, 0], [0, 1], [-1, 0], [0, -1]])) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(key(nx, ny))) continue;
      if (walk(nx, ny)) return true;
    }
    path.pop();
    seen.delete(key(x, y));
    return false;
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    seen.clear();
    path.length = 0;
    walk(0, 0);
    // 短すぎると つまらない・長すぎると 3 さいには つらい
    if (path.length >= 7 && path.length <= 15) return path.slice();
  }
  return path.slice();
}

function playMeiro() {
  const frame = makeFrame("as_meiroTitle", MAZE_ROUNDS);
  let cleared = 0;
  let board = null;
  let path = [];
  let cells = [];
  let at = 0;
  let holding = false;

  function build() {
    if (board) board.remove();
    path = makePath(MAZE_N);
    at = 0;
    board = el("div", "as-maze");
    board.style.gridTemplateColumns = "repeat(" + MAZE_N + ", 1fr)";
    cells = [];
    const onPath = new Map();
    path.forEach(([x, y], i) => onPath.set(y * MAZE_N + x, i));

    for (let y = 0; y < MAZE_N; y++) {
      for (let x = 0; x < MAZE_N; x++) {
        const index = onPath.has(y * MAZE_N + x) ? onPath.get(y * MAZE_N + x) : -1;
        const cell = el("div", "as-cell" + (index < 0 ? " is-wall" : " is-path"));
        if (index === 0) cell.classList.add("is-start");
        if (index === path.length - 1) cell.classList.add("is-goal");
        cell.dataset.step = String(index);
        board.append(cell);
        cells.push(cell);
      }
    }
    frame.stage.append(board);
    mark();
  }

  function mark() {
    cells.forEach(cell => {
      const step = Number(cell.dataset.step);
      cell.classList.toggle("is-drawn", step >= 0 && step <= at);
      cell.classList.toggle("is-here", step === at);
    });
  }

  function moveTo(step) {
    if (step === at + 1 || step === at - 1) {
      at = step;
      mark();
      if (step === path.length - 1) {
        sounds.right();
        cleared += 1;
        frame.progress(cleared);
        holding = false;
        if (cleared >= MAZE_ROUNDS) {
          window.setTimeout(() => finish("meiro"), 320);
        } else {
          window.setTimeout(build, 420);
        }
      }
    }
  }

  function stepAt(x, y) {
    const node = document.elementFromPoint(x, y);
    if (!node || !node.classList.contains("as-cell")) return null;
    const step = Number(node.dataset.step);
    return Number.isFinite(step) ? step : null;
  }

  function down(event) {
    const step = stepAt(event.clientX, event.clientY);
    if (step === null) return;
    event.preventDefault();
    // どこから 始めても よい。いま 通って いる ところに 触れたら 続きから
    if (step === 0) at = 0;
    holding = step >= 0 && step <= at + 1;
    if (step === at + 1) moveTo(step);
    else mark();
  }

  function move(event) {
    if (!holding) return;
    const step = stepAt(event.clientX, event.clientY);
    if (step === null || step < 0) return;   // 壁に 入っても 何も 起きない
    event.preventDefault();
    moveTo(step);
  }

  function up() {
    holding = false;
  }

  frame.stage.addEventListener("pointerdown", down);
  frame.stage.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  onLeave(() => {
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
  });

  build();
}

// --- 4. かぞえる ------------------------------------------------------------

const QUIZ_ROUNDS = 5;

function playKazoeru() {
  const frame = makeFrame("as_kazoeruTitle", QUIZ_ROUNDS);
  let cleared = 0;

  function round() {
    frame.stage.replaceChildren();
    const total = randInt(1, 5);
    const yard = el("div", "as-yard");
    const ask = el("p", "as-ask");
    const choices = el("div", "as-choices");
    frame.stage.append(yard, ask, choices);

    let tapped = 0;
    for (let i = 0; i < total; i++) {
      const thing = el("button", "as-thing");
      thing.type = "button";
      thing.setAttribute("aria-label", String(i + 1));
      thing.append(ballNode(52));
      thing.addEventListener("pointerdown", event => {
        event.preventDefault();
        if (thing.classList.contains("is-tapped")) return;
        tapped += 1;
        thing.classList.add("is-tapped");
        thing.append(el("span", "as-tag", String(tapped)));
        sounds.tick();
        if (tapped === total) askNumber(total, ask, choices);
      });
      yard.append(thing);
    }
  }

  function askNumber(total, ask, choices) {
    ask.textContent = t("as_kazoeruAsk");
    const wrong = shuffle([1, 2, 3, 4, 5, 6].filter(n => n !== total)).slice(0, 2);
    shuffle([total].concat(wrong)).forEach(n => {
      const card = el("button", "as-card as-num");
      card.type = "button";
      card.textContent = String(n);
      card.addEventListener("pointerdown", event => {
        event.preventDefault();
        answer(card, n === total);
      });
      choices.append(card);
    });
  }

  function answer(card, right) {
    if (!right) {
      // まちがいは 出さない。すこし 揺れて もう一度
      card.classList.remove("is-shake");
      void card.offsetWidth;
      card.classList.add("is-shake");
      sounds.wrong();
      return;
    }
    card.classList.add("is-right");
    sounds.right();
    cleared += 1;
    frame.progress(cleared);
    window.setTimeout(() => (cleared >= QUIZ_ROUNDS ? finish("kazoeru") : round()), 480);
  }

  round();
}

// --- 5. おなじ かたち -------------------------------------------------------

function playKatachi() {
  const frame = makeFrame("as_katachiTitle", QUIZ_ROUNDS);
  let cleared = 0;

  function round() {
    frame.stage.replaceChildren();
    // 色は 3 つとも 同じに する。色で 当てられると かたちを 見なくなる
    const color = pick(COLORS);
    const kinds = shuffle(SHAPES).slice(0, 3);
    const answerKind = kinds[0];

    const model = el("div", "as-model");
    model.append(shapeNode(answerKind, 84, color));
    const choices = el("div", "as-choices");
    frame.stage.append(model, choices);

    shuffle(kinds).forEach(kind => {
      const card = el("button", "as-card");
      card.type = "button";
      card.setAttribute("aria-label", kind);
      card.append(shapeNode(kind, 62, color));
      card.addEventListener("pointerdown", event => {
        event.preventDefault();
        answer(card, kind === answerKind);
      });
      choices.append(card);
    });
  }

  function answer(card, right) {
    if (!right) {
      card.classList.remove("is-shake");
      void card.offsetWidth;
      card.classList.add("is-shake");
      sounds.wrong();
      return;
    }
    card.classList.add("is-right");
    sounds.right();
    cleared += 1;
    frame.progress(cleared);
    window.setTimeout(() => (cleared >= QUIZ_ROUNDS ? finish("katachi") : round()), 480);
  }

  round();
}

// --- 6. おおきい ほう -------------------------------------------------------

function playOokii() {
  const frame = makeFrame("as_ookiiTitle", QUIZ_ROUNDS);
  let cleared = 0;

  function round() {
    frame.stage.replaceChildren();
    const color = pick(COLORS);
    const small = randInt(52, 74);
    const big = Math.round(small * (1.6 + Math.random() * 0.5));   // 迷わない 差を つける
    const yard = el("div", "as-yard as-yard-wide");
    frame.stage.append(yard);

    shuffle([big, small]).forEach(size => {
      const card = el("button", "as-blob");
      card.type = "button";
      card.setAttribute("aria-label", size === big ? "big" : "small");
      const dot = el("span", "as-round");
      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.background = color;
      card.append(dot);
      card.addEventListener("pointerdown", event => {
        event.preventDefault();
        answer(card, size === big);
      });
      yard.append(card);
    });
  }

  function answer(card, right) {
    if (!right) {
      card.classList.remove("is-shake");
      void card.offsetWidth;
      card.classList.add("is-shake");
      sounds.wrong();
      return;
    }
    card.classList.add("is-right");
    sounds.right();
    cleared += 1;
    frame.progress(cleared);
    window.setTimeout(() => (cleared >= QUIZ_ROUNDS ? finish("ookii") : round()), 480);
  }

  round();
}

// --- えらぶ 画面 ------------------------------------------------------------

/** えらぶ 画面の 絵。中身が ひと目で わかる ものを 自前で 描く */
function hubArt(id) {
  const art = el("div", "as-art");
  if (id === "mogura") {
    const hole = el("div", "as-hole as-hole-mini");
    const mole = el("div", "as-mole is-up");
    mole.append(el("i", "as-eye as-eye-l"), el("i", "as-eye as-eye-r"), el("b", "as-nose"));
    hole.append(mole);
    art.append(hole);
  } else if (id === "fuusen") {
    const balloon = el("div", "as-balloon as-balloon-mini");
    const body = el("span", "as-balloon-body");
    body.style.background = "radial-gradient(circle at 34% 28%, #ffffff 0%, #f472b6 74%)";
    balloon.append(body, el("span", "as-balloon-string"));
    art.append(balloon);
  } else if (id === "meiro") {
    const mini = el("div", "as-maze as-maze-mini");
    mini.style.gridTemplateColumns = "repeat(3, 1fr)";
    ["is-start", "is-path", "is-wall", "is-wall", "is-path", "is-path", "is-wall", "is-wall", "is-goal"]
      .forEach(kind => mini.append(el("div", "as-cell " + kind)));
    art.append(mini);
  } else if (id === "kazoeru") {
    const row = el("div", "as-art-row");
    row.append(ballNode(24), ballNode(24), el("span", "as-art-num", "2"));
    art.append(row);
  } else if (id === "katachi") {
    const row = el("div", "as-art-row");
    row.append(shapeNode("circle", 30, "#38bdf8"), shapeNode("square", 30, "#f472b6"));
    art.append(row);
  } else {
    const row = el("div", "as-art-row");
    const smallDot = el("span", "as-round");
    smallDot.style.cssText = "width:24px;height:24px;background:#a78bfa";
    const bigDot = el("span", "as-round");
    bigDot.style.cssText = "width:44px;height:44px;background:#a78bfa";
    row.append(smallDot, bigDot);
    art.append(row);
  }
  return art;
}

function renderHub() {
  host.replaceChildren();
  const head = el("div", "as-hub-head");
  head.append(el("h2", "as-title", t("as_hubTitle")), el("p", "lede", t("as_hubLede")));

  const grid = el("div", "as-grid");
  GAMES.forEach(id => {
    const card = el("a", "as-game");
    card.href = "#/asobi/" + id;
    card.append(hubArt(id), el("b", "as-game-name", t("as_" + id)),
      el("span", "as-game-note", t("as_" + id + "Note")));
    grid.append(card);
  });

  host.append(head, grid);
}

// --- 出入り口 ---------------------------------------------------------------

const PLAYERS = {
  mogura: playMogura,
  fuusen: playFuusen,
  meiro: playMeiro,
  kazoeru: playKazoeru,
  katachi: playKatachi,
  ookii: playOokii,
};

function start(id) {
  stopAsobi();
  PLAYERS[id]();
}

export function renderAsobi(id) {
  stopAsobi();
  host = document.getElementById("asobi-body");
  if (!host) return;
  if (id && PLAYERS[id]) {
    start(id);
    return;
  }
  renderHub();
}

export { GAMES };
