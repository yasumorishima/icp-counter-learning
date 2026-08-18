/**
 * ぼうけんの 画面。
 *
 * ルールと じっこうは code-world、ステージは code-lessons、絵は code-view に まかせる。
 * ここが 持つのは「押したら どうなるか」と「どう 見せるか」だけ。
 * 作った プログラムも 記録も、この 端末の 中だけに のこる。
 */
import {
  LEVELS, WORLDS, CARDS, COND_LABELS, levelById, worldOf, starsFor, par,
} from "./code-lessons.mjs";
import { run, cleared, makeLevel, snapshot, countAll, MAX_REPEAT, MAX_CARDS, CONDS } from "./code-world.mjs";
import { createGame, paintHero, HEROES } from "./code-view";
import * as records from "./records";
import { sounds, confetti } from "./effects";

const $ = id => document.getElementById(id);
const WORK_KEY = "code.work.v1";
const HERO_KEY = "code.hero.v1";
const SLOW = 340;
const FAST = 130;
const SLOTS = ["main", "a", "b"];

let show = () => {};
let game = null;
let level = null;
let program = { main: [], a: [], b: [] };
let focus = "main";
let hero = "penguin";
let playing = false;
let hintOn = false;
let fast = false;
let seq = 1;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function mk(t) {
  const card = { t, id: "c" + seq++ };
  if (t === "repeat") { card.n = 4; card.body = []; }
  if (t === "if") { card.cond = "hole"; card.then = []; card.other = []; }
  if (t === "call") card.w = "a";
  return card;
}

function withIds(list) {
  return (Array.isArray(list) ? list : []).map(c => {
    const card = { t: c.t, id: "c" + seq++ };
    if (c.t === "repeat") { card.n = c.n; card.body = withIds(c.body); }
    if (c.t === "if") { card.cond = c.cond; card.then = withIds(c.then); card.other = withIds(c.other); }
    if (c.t === "call") card.w = c.w;
    return card;
  });
}

function listAt(path) {
  const parts = path.split(".");
  let list = program[parts[0]] || program.main;
  for (let k = 1; k + 1 < parts.length; k += 2) {
    const card = list[Number(parts[k])];
    if (!card) return list;
    list = card[parts[k + 1]] || [];
  }
  return list;
}

function cardAt(path) {
  const parts = path.split(".");
  const at = Number(parts.pop());
  return listAt(parts.join("."))[at] || null;
}

function pathOf(target, list, base) {
  for (let i = 0; i < list.length; i++) {
    const here = base + "." + i;
    if (list[i] === target) return here;
    for (const slot of ["body", "then", "other"]) {
      if (!list[i][slot]) continue;
      const found = pathOf(target, list[i][slot], here + "." + slot);
      if (found) return found;
    }
  }
  return null;
}

function saveWork() {
  try {
    const all = JSON.parse(localStorage.getItem(WORK_KEY) || "{}");
    all[level.id] = program;
    localStorage.setItem(WORK_KEY, JSON.stringify(all));
  } catch (error) {
    // 保存できない 設定でも、その回は そのまま つづけられる
  }
}

function loadWork(id) {
  try {
    return JSON.parse(localStorage.getItem(WORK_KEY) || "{}")[id] || null;
  } catch (error) {
    return null;
  }
}

// --- ステージを えらぶ 画面 ------------------------------------------------------

function noName() {
  return records.profiles().length === 0;
}

/** どこまで 開いているか。1 つ クリアすると つぎが 開く */
function openUpTo(got) {
  if (noName()) return LEVELS.length;
  let openId = 1;
  for (const lv of LEVELS) {
    if (got[lv.id]) openId = Math.min(LEVELS.length, lv.id + 1);
    else break;
  }
  return openId;
}

function starRow(n) {
  return [1, 2, 3].map(i =>
    `<span class="code-star${i <= n ? " is-on" : ""}">${i <= n ? "★" : "☆"}</span>`).join("");
}

function renderPick() {
  const got = records.codeStars();
  const openId = openUpTo(got);
  $("code-noname").classList.toggle("is-hidden", !noName());

  const total = Object.values(got).reduce((sum, n) => sum + n, 0);
  $("code-total").textContent = "★ " + total + " / " + LEVELS.length * 3;

  $("code-heroes").innerHTML = HEROES.map(h =>
    `<button type="button" class="code-hero${h.id === hero ? " is-on" : ""}" data-hero="${h.id}">
      <canvas class="code-heroface" data-face="${h.id}" aria-hidden="true"></canvas>
      <b>${esc(h.name)}</b>
    </button>`).join("");
  // すがたを その場で 描く（画像ファイルを もたない）
  $("code-heroes").querySelectorAll("canvas[data-face]").forEach(c => paintHero(c, c.dataset.face));

  $("code-worlds").innerHTML = WORLDS.map(w => {
    const stages = LEVELS.filter(l => l.world === w.id).map(l => {
      const locked = l.id > openId;
      return `<button type="button" class="code-stage${locked ? " is-locked" : ""}"
        data-level="${l.id}"${locked ? " disabled" : ""}>
        <span class="code-stage-no">${l.id}</span>
        <b class="code-stage-name">${esc(l.name)}</b>
        <span class="code-stage-idea">${esc(l.idea)}</span>
        <span class="code-stars">${locked ? "まだ" : starRow(got[l.id] || 0)}</span>
      </button>`;
    }).join("");
    return `<section class="code-world" data-world="${w.id}">
      <h3 class="code-world-name">${w.id}. ${esc(w.name)}</h3>
      <div class="code-stagelist">${stages}</div>
    </section>`;
  }).join("");
}

function openLevel(id) {
  level = levelById(id);
  if (!level) return;
  hintOn = false;
  playing = false;
  const saved = loadWork(id);
  program = saved
    ? { main: withIds(saved.main), a: withIds(saved.a), b: withIds(saved.b) }
    : { main: [], a: [], b: [] };
  focus = "main";
  $("code-pick").classList.add("is-hidden");
  $("code-play").classList.remove("is-hidden");
  clearConfetti();
  game.start();
  resetWorld();
  renderPlay();
}

function clearConfetti() {
  const c = $("code-confetti");
  if (c && c.getContext) c.getContext("2d").clearRect(0, 0, c.width, c.height);
}

function resetWorld() {
  const st = makeLevel(level);
  game.load(level, worldOf(level), hero, snapshot(st, "start"));
}

function backToPick() {
  playing = false;
  game.pause();
  game.stop();
  level = null;
  $("code-play").classList.add("is-hidden");
  $("code-pick").classList.remove("is-hidden");
  renderPick();
}

// --- プログラムを 見せる --------------------------------------------------------

let live = null;   // いま うごいている カード

function tools(path) {
  return `<span class="code-tools">
    <button type="button" class="code-mini" data-act="up" data-path="${path}" aria-label="うえへ">▲</button>
    <button type="button" class="code-mini" data-act="down" data-path="${path}" aria-label="したへ">▼</button>
    <button type="button" class="code-mini code-del" data-act="del" data-path="${path}" aria-label="けす">✕</button>
  </span>`;
}

function slot(path, list, label) {
  const open = focus === path;
  return `<div class="code-slot${open ? " is-open" : ""}">
    ${label ? `<span class="code-slot-label">${esc(label)}</span>` : ""}
    ${renderList(list, path)}
    <button type="button" class="code-here${open ? " is-open" : ""}" data-act="focus" data-path="${path}">
      ${open ? "ここに 入る" : "ここに 入れる"}
    </button>
  </div>`;
}

function renderCard(card, path) {
  const info = CARDS[card.t];
  const hot = live === card.id ? " is-running" : "";
  if (card.t === "repeat") {
    return `<div class="code-card code-box${hot}" data-path="${path}">
      <div class="code-card-head">
        <span class="code-face">${info.face}</span><b>${esc(info.label)}</b>
        <span class="code-count">
          <button type="button" class="code-mini" data-act="minus" data-path="${path}" aria-label="へらす">−</button>
          <b class="code-n">${card.n}</b>
          <button type="button" class="code-mini" data-act="plus" data-path="${path}" aria-label="ふやす">＋</button>
          <span class="code-unit">かい</span>
        </span>
        ${tools(path)}
      </div>
      ${slot(path + ".body", card.body, "")}
    </div>`;
  }
  if (card.t === "if") {
    const opts = CONDS.map(c =>
      `<option value="${c}"${c === card.cond ? " selected" : ""}>${esc(COND_LABELS[c])}</option>`).join("");
    return `<div class="code-card code-box${hot}" data-path="${path}">
      <div class="code-card-head">
        <span class="code-face">${info.face}</span><b>もし</b>
        <select class="code-cond" data-path="${path}" aria-label="なにを 見るか">${opts}</select>
        <b>だったら</b>
        ${tools(path)}
      </div>
      ${slot(path + ".then", card.then, "そうなら")}
      ${slot(path + ".other", card.other, "ちがうなら")}
    </div>`;
  }
  if (card.t === "call") {
    return `<div class="code-card${hot}" data-path="${path}">
      <span class="code-face">${info.face}</span><b>わざ</b>
      <select class="code-which" data-path="${path}" aria-label="どの わざ">
        <option value="a"${card.w === "a" ? " selected" : ""}>1</option>
        <option value="b"${card.w === "b" ? " selected" : ""}>2</option>
      </select>
      ${tools(path)}
    </div>`;
  }
  return `<div class="code-card${hot}" data-path="${path}">
    <span class="code-face">${info.face}</span><b>${esc(info.label)}</b>
    ${tools(path)}
  </div>`;
}

function renderList(list, base) {
  return list.map((card, i) => renderCard(card, base + "." + i)).join("");
}

function renderProgram() {
  for (const s of SLOTS) {
    const box = $("code-prog-" + s);
    if (!box) continue;
    const open = focus === s;
    box.innerHTML = (program[s].length
      ? renderList(program[s], s)
      : `<p class="code-empty">したの カードを おして ならべよう</p>`) +
      `<button type="button" class="code-here${open ? " is-open" : ""}" data-act="focus" data-path="${s}">
        ${open ? "ここに 入る" : "ここに 入れる"}
      </button>`;
  }
}

function renderPlay() {
  const w = worldOf(level);
  $("code-title").textContent = level.id + ". " + level.name;
  $("code-worldtag").textContent = w.name;
  $("code-mission").textContent = level.mission;
  $("code-idea").textContent = level.idea;
  $("code-hint-text").textContent = hintOn ? level.hint : "";
  $("code-hint-text").classList.toggle("is-hidden", !hintOn);
  $("code-par").textContent = "★3 は カード " + par(level) + " まいまで";
  $("code-count").textContent = countAll(program) + " まい";
  $("code-skills").classList.toggle("is-hidden", !level.cards.includes("call"));
  $("code-next").classList.add("is-hidden");
  renderProgram();
  $("code-palette").innerHTML = level.cards.map(t => {
    const info = CARDS[t];
    return `<button type="button" class="code-pal" data-card="${t}" title="${esc(info.tip)}">
      <span class="code-face">${info.face}</span><b>${esc(info.label)}</b>
    </button>`;
  }).join("");
}

function say(text, kind) {
  const el = $("code-status");
  el.textContent = text;
  el.className = "status" + (kind === "ok" ? " is-ok" : kind === "ng" ? " is-error" : "");
}

// --- じっこう ------------------------------------------------------------------

function start() {
  if (playing) {
    playing = false;
    game.pause();
    $("code-run").querySelector(".cta-label").textContent = "スタート";
    say("とめたよ");
    return;
  }
  if (!countAll(program)) { say("カードが 1 まいも ないよ", "ng"); return; }

  const result = run(program, level);
  clearConfetti();
  playing = true;
  live = null;
  $("code-run").querySelector(".cta-label").textContent = "とめる";
  $("code-next").classList.add("is-hidden");
  say("うごいて いるよ");

  game.load(level, worldOf(level), hero, result.frames[0]);
  game.play(result.frames, fast ? FAST : SLOW, {
    onFrame: (i, frame) => {
      live = frame.card || null;
      renderProgram();
      if (frame.op === "bump") sounds.wrong();
      else if (frame.op === "take") sounds.right();
      else sounds.tick();
    },
    onEnd: () => finish(result),
  });
}

function finish(result) {
  playing = false;
  live = null;
  renderProgram();
  $("code-run").querySelector(".cta-label").textContent = "スタート";

  if (result.st.dead === "fall") { sounds.wrong(); say("あなに おちて しまった。もう いちど", "ng"); return; }
  if (result.st.dead === "caught") { sounds.wrong(); say("てきに つかまった。タイミングを 変えよう", "ng"); return; }
  if (result.stopped === "limit") { say("うごきが 多すぎたよ。くりかえしの かずを へらそう", "ng"); return; }
  if (result.stopped === "deep") { say("わざの なかから わざを よびすぎ だよ", "ng"); return; }

  if (!cleared(result.st)) {
    const st = result.st;
    if (st.me.got < st.total) { say("★が まだ のこって いるよ（あと " + (st.total - st.me.got) + " こ）", "ng"); return; }
    say("ゴールまで とどかなかったよ", "ng");
    return;
  }

  const cards = countAll(program);
  const stars = starsFor(level, cards);
  const res = records.codeClear(level.id, stars);
  sounds.finish();
  confetti($("code-confetti"));
  game.cheer();
  const word = noName() ? "クリア！ よく できました"
    : res.first ? "クリア！ ★を 5こ もらったよ"
    : "クリア！ いままでで いちばんは ★" + res.best;
  say(word + "（この かいは ★" + stars + " ／ カード " + cards + " まい）", "ok");
  $("code-next").classList.remove("is-hidden");
}

function goNext() {
  const next = levelById(level.id + 1);
  if (next) openLevel(next.id);
  else backToPick();
}

// --- 押されたときの うごき --------------------------------------------------------

function addCard(t) {
  if (countAll(program) >= MAX_CARDS) {
    say("カードが いっぱいだよ。すこし けしてから 入れよう", "ng");
    return;
  }
  const card = mk(t);
  listAt(focus).push(card);
  const root = focus.split(".")[0];
  const path = pathOf(card, program[root], root);
  if (path && t === "repeat") focus = path + ".body";
  if (path && t === "if") focus = path + ".then";
  saveWork();
  renderPlay();
}

function onProgramClick(event) {
  const btn = event.target.closest("button[data-act]");
  if (!btn || playing) return;
  const act = btn.dataset.act;
  const path = btn.dataset.path;

  if (act === "focus") {
    focus = path;
  } else if (act === "plus" || act === "minus") {
    const card = cardAt(path);
    if (card) card.n = Math.min(MAX_REPEAT, Math.max(1, card.n + (act === "plus" ? 1 : -1)));
  } else {
    const parts = path.split(".");
    const at = Number(parts.pop());
    const list = listAt(parts.join("."));
    if (act === "del") {
      list.splice(at, 1);
      focus = parts[0];
    } else if (act === "up" && at > 0) {
      list.splice(at - 1, 0, list.splice(at, 1)[0]);
    } else if (act === "down" && at < list.length - 1) {
      list.splice(at + 1, 0, list.splice(at, 1)[0]);
    }
  }
  saveWork();
  renderPlay();
}

function onProgramChange(event) {
  const sel = event.target.closest("select[data-path]");
  if (!sel || playing) return;
  const card = cardAt(sel.dataset.path);
  if (!card) return;
  if (sel.classList.contains("code-cond")) card.cond = sel.value;
  if (sel.classList.contains("code-which")) card.w = sel.value;
  saveWork();
  renderPlay();
}

// --- はじめの したく ------------------------------------------------------------

export function initCode(options) {
  show = options.show;
  game = createGame($("code-canvas"));
  try {
    hero = localStorage.getItem(HERO_KEY) || "penguin";
  } catch (error) {
    hero = "penguin";
  }

  $("code-worlds").addEventListener("click", event => {
    const btn = event.target.closest("button[data-level]");
    if (btn) openLevel(Number(btn.dataset.level));
  });

  $("code-heroes").addEventListener("click", event => {
    const btn = event.target.closest("button[data-hero]");
    if (!btn) return;
    hero = btn.dataset.hero;
    try {
      localStorage.setItem(HERO_KEY, hero);
    } catch (error) {
      // 保存できなくても その回は つかえる
    }
    renderPick();
  });

  for (const s of SLOTS) {
    const box = $("code-prog-" + s);
    if (!box) continue;
    box.addEventListener("click", onProgramClick);
    box.addEventListener("change", onProgramChange);
  }

  $("code-palette").addEventListener("click", event => {
    const btn = event.target.closest("button[data-card]");
    if (btn && !playing) addCard(btn.dataset.card);
  });

  $("code-run").addEventListener("click", start);
  $("code-next").addEventListener("click", goNext);
  $("code-back").addEventListener("click", backToPick);

  $("code-clear").addEventListener("click", () => {
    if (playing) return;
    program = { main: [], a: [], b: [] };
    focus = "main";
    saveWork();
    resetWorld();
    say("ぜんぶ けしたよ");
    renderPlay();
  });

  $("code-hint").addEventListener("click", () => {
    hintOn = !hintOn;
    renderPlay();
  });

  $("code-fast").addEventListener("click", () => {
    fast = !fast;
    $("code-fast").textContent = fast ? "ゆっくり" : "はやく";
    $("code-fast").setAttribute("aria-pressed", String(fast));
  });

  window.addEventListener("resize", () => game && game.resize());
}

export function renderCode() {
  if (level) {
    game.start();
    renderPlay();
    return;
  }
  $("code-play").classList.add("is-hidden");
  $("code-pick").classList.remove("is-hidden");
  renderPick();
}
