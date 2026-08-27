/**
 * あそび（幼児向け）。3 さいくらいの 子が、文字を 読めなくても 遊べる ことだけを 目当てに する。
 *
 * 守って いる こと:
 *   ・さわるだけ で 進む（おえかき だけ なぞる）。当たり判定は 指の 大きさ（64px 以上）
 *   ・まちがいを 出さない。×も 減点も 時間切れも 無い。外した ときは 何も 起きない
 *   ・絵は すべて 自前で 描く（絵文字は 端末に よって 出ないので 使わない）
 *   ・記録は 残さない。キャニスターにも localStorage にも 書かない
 *   ・画面を 離れたら タイマーと 描画を かならず 止める（電池の ため）
 */

import { t, currentLang } from "./i18n";
import { sounds, confetti, note } from "./effects";
import { WORDS, illust } from "./asobi-art";

const GAMES = ["mogura", "fuusen", "kotoba", "sakana", "oekaki", "oto"];

const COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#fb7185"];

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
  // 数を かぞえない あそび（おえかき・おと）は 進み具合を 出さない
  if (!total) {
    host.append(bar, title, stage);
    return { stage, progress() {} };
  }
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

/**
 * さわる・おす の 受け口。
 *
 * pointerdown だけを 見て いると、指では 遊べるが
 * **読み上げ（TalkBack の 2 回たたき）と キーボードの エンター・スペースでは
 * 何も 起きない**（どちらも click しか 出さない）。
 * 指・マウスの click は detail が 1 以上、機械が 起こした click は detail が 0 なので、
 * 0 の ときだけ 通せば 二重に 数えない。
 */
function onTap(node, run) {
  node.addEventListener("pointerdown", event => {
    event.preventDefault();
    run();
  });
  node.addEventListener("click", event => {
    if (event.detail !== 0) return;
    event.preventDefault();
    run();
  });
}

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
    // はじめは 出て いない＝「あな」。出入りの たびに 言いかたを 変える
    mole.setAttribute("aria-label", t("as_moguraHole"));
    moles.push(slot);
    onTap(mole, () => hit(slot));
  }

  function hit(slot) {
    // 出て いない ときに さわっても 何も 起きない（外しても とがめない）
    if (!slot.up || done) return;
    slot.up = false;
    slot.mole.classList.remove("is-up");
    slot.mole.setAttribute("aria-label", t("as_moguraHole"));
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
    slot.mole.setAttribute("aria-label", t("as_mogura"));
    // 見えなくても 出た ことが 分かる ように 小さく 鳴らす（音は 設定で 切れる）
    sounds.tick();
    window.clearTimeout(slot.timer);
    slot.timer = window.setTimeout(() => {
      slot.up = false;
      slot.mole.classList.remove("is-up");
      slot.mole.setAttribute("aria-label", t("as_moguraHole"));
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
    onTap(node, () => pop(item));
    // 見えなくても 出た ことが 分かる ように 小さく 鳴らす
    sounds.tick();
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

// --- 3. ことば --------------------------------------------------------------

/** 声で 読む。声を 持たない 端末でも だまって 先へ 進む（音は 別に 鳴らす） */
function say(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const line = new window.SpeechSynthesisUtterance(text);
    line.lang = currentLang() === "ja" ? "ja-JP" : "en-US";
    line.rate = 0.8;
    synth.speak(line);
  } catch (error) {
    /* 読み上げが 無くても あそびは 続く */
  }
}

function stopSpeech() {
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (error) {
    /* 止められなくても 画面遷移は 続ける */
  }
}

function wordText(word) {
  return currentLang() === "ja" ? word.ja : word.en;
}

function playKotoba() {
  const TARGET = 8;
  const frame = makeFrame("as_kotobaTitle", TARGET);
  const yard = el("div", "as-words");
  frame.stage.append(yard);

  let bag = shuffle(WORDS);
  let at = 0;
  let said = 0;
  let done = false;

  function nextWord() {
    if (at >= bag.length) {
      bag = shuffle(WORDS);
      at = 0;
    }
    return bag[at++];
  }

  function makeCard(word) {
    const card = el("button", "as-word");
    card.type = "button";
    card.setAttribute("aria-label", wordText(word));
    card.append(illust(word.id), el("b", "as-word-name", wordText(word)));
    onTap(card, () => tap(card, word));
    return card;
  }

  function tap(card, word) {
    // 同じ 絵を 続けて 押しても 二重に 数えない
    if (done || card.dataset.used === "1") return;
    card.dataset.used = "1";
    card.classList.add("is-said");
    sounds.right();
    say(wordText(word));
    said += 1;
    frame.progress(said);
    if (said >= TARGET) {
      done = true;
      window.setTimeout(() => finish("kotoba"), 900);
      return;
    }
    window.setTimeout(() => {
      if (done) return;
      card.replaceWith(makeCard(nextWord()));
    }, 900);
  }

  // 4 枚（2 かける 2）。3 枚だと 並びに 穴が あく
  for (let i = 0; i < 4; i++) yard.append(makeCard(nextWord()));

  onLeave(() => {
    done = true;
    stopSpeech();
  });
}

// --- 4. さかな --------------------------------------------------------------

function playSakana() {
  const TARGET = 8;
  const frame = makeFrame("as_sakanaTitle", TARGET);
  const tank = el("div", "as-tank");
  frame.stage.append(tank);

  // 水草。動かないので 描くだけ
  for (let i = 0; i < 5; i++) {
    const weed = el("span", "as-weed");
    weed.style.left = 8 + i * 20 + "%";
    weed.style.height = randInt(34, 64) + "px";
    tank.append(weed);
  }

  const live = [];
  let caught = 0;
  let done = false;
  let raf = 0;
  let last = 0;
  let sinceSpawn = 99;

  function spawn(inside) {
    const width = tank.clientWidth || 320;
    const height = tank.clientHeight || 300;
    const toRight = Math.random() < 0.5;
    const node = el("button", "as-fish");
    node.type = "button";
    node.setAttribute("aria-label", t("as_sakana"));
    node.append(illust("sakana"));
    // 同じ 絵の まま 色だけ 変えて 何匹も いるように 見せる
    node.style.filter = "hue-rotate(" + pick([0, 0, 40, 150, 205, 300]) + "deg)";
    tank.append(node);

    const item = {
      node,
      y: randInt(6, Math.max(6, height - 96)),
      x: inside ? randInt(10, Math.max(10, width - 100)) : toRight ? -96 : width + 16,
      // ゆっくり（幼児が 指で 追える 速さ）
      v: (reduceMotion() ? randInt(22, 34) : randInt(38, 66)) * (toRight ? 1 : -1),
      toRight,
    };
    onTap(node, () => scoop(item));
    live.push(item);
  }

  function scoop(item) {
    // 泳ぎ去った あとに さわっても 何も 起きない（外しても とがめない）
    if (done || item.gone) return;
    item.gone = true;
    item.node.classList.add("is-caught");
    window.setTimeout(() => item.node.remove(), 320);
    const at = live.indexOf(item);
    if (at >= 0) live.splice(at, 1);
    sounds.right();
    caught += 1;
    frame.progress(caught);
    if (caught >= TARGET) {
      done = true;
      window.setTimeout(() => finish("sakana"), 320);
    }
  }

  function frameStep(now) {
    if (done) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    sinceSpawn += dt;
    if (sinceSpawn > 0.9 && live.length < 5) {
      spawn();
      sinceSpawn = 0;
    }
    const width = tank.clientWidth || 320;
    for (let i = live.length - 1; i >= 0; i--) {
      const item = live[i];
      item.x += item.v * dt;
      item.node.style.transform =
        "translate(" + Math.round(item.x) + "px, " + item.y + "px) scaleX(" + (item.toRight ? -1 : 1) + ")";
      // 画面の 外へ 出たら だまって 消える。逃した ことは 責めない
      if (item.x < -140 || item.x > width + 140) {
        item.node.remove();
        live.splice(i, 1);
      }
    }
    raf = window.requestAnimationFrame(frameStep);
  }

  // はじめから 何匹か 泳がせる（空の 水そうを 見せない）
  for (let i = 0; i < 3; i++) spawn(true);

  raf = window.requestAnimationFrame(frameStep);
  onLeave(() => {
    done = true;
    window.cancelAnimationFrame(raf);
  });
}

// --- 5. おえかき ------------------------------------------------------------

function playOekaki() {
  const frame = makeFrame("as_oekakiTitle", 0);
  const pad = el("div", "as-pad");
  const canvas = el("canvas", "as-canvas");
  pad.append(canvas);

  const tools = el("div", "as-tools");
  frame.stage.append(pad, tools);

  const g = canvas.getContext("2d");
  let color = COLORS[2];
  let drawing = false;

  function fit() {
    const width = pad.clientWidth || 320;
    const height = pad.clientHeight || 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 18;
  }

  function spot(event) {
    const box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    drawing = true;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      /* 捕まえられない 端末でも 描ける */
    }
    const at = spot(event);
    g.strokeStyle = color;
    g.beginPath();
    g.moveTo(at.x, at.y);
    // 点を 1 つ 置く（ちょんと さわっただけでも 色が つく）
    g.lineTo(at.x + 0.1, at.y);
    g.stroke();
  });

  canvas.addEventListener("pointermove", event => {
    if (!drawing) return;
    event.preventDefault();
    const at = spot(event);
    g.lineTo(at.x, at.y);
    g.stroke();
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach(kind => {
    canvas.addEventListener(kind, () => {
      drawing = false;
    });
  });

  COLORS.forEach(one => {
    const swatch = el("button", "as-ink");
    swatch.type = "button";
    swatch.style.background = one;
    swatch.setAttribute("aria-label", one);
    if (one === color) swatch.classList.add("is-on");
    onTap(swatch, () => {
      color = one;
      tools.querySelectorAll(".as-ink").forEach(node => node.classList.remove("is-on"));
      swatch.classList.add("is-on");
      sounds.tick();
    });
    tools.append(swatch);
  });

  const clear = el("button", "as-clear", t("as_oekakiClear"));
  clear.type = "button";
  onTap(clear, () => {
    g.clearRect(0, 0, canvas.width, canvas.height);
    sounds.tick();
  });
  tools.append(clear);

  // 画面が 出てから でないと 大きさが 取れない
  window.requestAnimationFrame(fit);
  const onResize = () => fit();
  window.addEventListener("resize", onResize);
  onLeave(() => window.removeEventListener("resize", onResize));
}

// --- 6. おと ----------------------------------------------------------------

const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880];

function playOto() {
  const frame = makeFrame("as_otoTitle", 0);
  const rack = el("div", "as-keys");
  frame.stage.append(rack);

  SCALE.forEach((freq, i) => {
    const key = el("button", "as-key");
    key.type = "button";
    key.style.background = COLORS[i % COLORS.length];
    key.style.width = 100 - i * 7 + "%";
    key.setAttribute("aria-label", t("as_oto"));
    let timer = 0;
    onTap(key, () => {
      note(freq);
      key.classList.add("is-hit");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => key.classList.remove("is-hit"), 200);
    });
    onLeave(() => window.clearTimeout(timer));
    rack.append(key);
  });
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
  } else if (id === "kotoba") {
    art.append(illust("neko"));
  } else if (id === "sakana") {
    art.append(illust("sakana"));
  } else if (id === "oekaki") {
    art.append(illust("pen"));
  } else {
    art.append(illust("oto"));
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
  kotoba: playKotoba,
  sakana: playSakana,
  oekaki: playOekaki,
  oto: playOto,
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
