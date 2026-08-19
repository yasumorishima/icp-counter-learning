/**
 * そらの 画面。
 *
 * 位置の 計算は sky-astro、絵は sky-view に まかせる。
 * ここが 持つのは「指で どう 動かすか」と「何を 出すか」だけ。
 * 星表も 計算も この 端末の 中に あるので、電波が 無くても 動く。
 */
import { drawSky, describeStar } from "./sky-view";
import { julianDay, jdTT, moonPhase, norm360 } from "./sky-astro.mjs";

const $ = id => document.getElementById(id);
const KEY = "sky.state.v1";

/** 見る 場所。日本の 主な ところを 用意し、現在地も 選べる */
export const PLACES = [
  { id: "sapporo", name: "札幌", lat: 43.0642, lon: 141.3469 },
  { id: "sendai", name: "仙台", lat: 38.2682, lon: 140.8694 },
  { id: "tokyo", name: "東京", lat: 35.6895, lon: 139.6917 },
  { id: "yokohama", name: "横浜", lat: 35.4437, lon: 139.6380 },
  { id: "nagoya", name: "名古屋", lat: 35.1815, lon: 136.9066 },
  { id: "osaka", name: "大阪", lat: 34.6937, lon: 135.5023 },
  { id: "hiroshima", name: "広島", lat: 34.3853, lon: 132.4553 },
  { id: "fukuoka", name: "福岡", lat: 33.5904, lon: 130.4017 },
  { id: "naha", name: "那覇", lat: 26.2124, lon: 127.6809 },
  { id: "ishigaki", name: "石垣島", lat: 24.3448, lon: 124.1572 },
];

/** 送りの 速さ。1 秒あたり どれだけ 時計を 進めるか */
const SPEEDS = [
  { id: "stop", label: "とめる", perSec: 0 },
  { id: "min", label: "1分", perSec: 60 },
  { id: "hour", label: "1時間", perSec: 3600 },
  { id: "day", label: "1日", perSec: 86400 },
];

const DIR_NAMES = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東",
  "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];

let canvas = null;
let ctx = null;
let raf = 0;
let timer = 0;
let live = true;          // 「いま」に 追随して いるか
let baseWall = 0;         // 送りの 基準（実時間）
let baseSky = 0;          // 送りの 基準（空の 時刻）
let speed = 0;
let picks = [];
let selected = null;
let active = false;

const state = {
  place: "yokohama",
  lat: 35.4437,
  lon: 139.6380,
  az: 180,
  alt: 42,
  fov: 105,
  lines: true,
  names: true,
  milky: true,
  skyMs: Date.now(),
};

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      place: state.place, lat: state.lat, lon: state.lon,
      az: state.az, alt: state.alt, fov: state.fov,
      lines: state.lines, names: state.names, milky: state.milky,
    }));
  } catch (error) {
    /* 記憶できなくても その場では ふつうに 使える */
  }
}

function load() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch (error) {
    saved = null;
  }
  if (!saved) return;
  for (const k of ["place", "az", "alt", "fov"]) {
    if (typeof saved[k] === (k === "place" ? "string" : "number")) state[k] = saved[k];
  }
  for (const k of ["lines", "names", "milky"]) {
    if (typeof saved[k] === "boolean") state[k] = saved[k];
  }
  if (typeof saved.lat === "number" && typeof saved.lon === "number") {
    state.lat = saved.lat; state.lon = saved.lon;
  }
}

/** 画面の 大きさに 合わせる。細かい 端末でも ぼやけない ように 実画素で 持つ */
function resize() {
  if (!canvas) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const pad2 = n => String(n).padStart(2, "0");

/** datetime-local が 読める 形（端末の 時計の まま） */
function localInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    + `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function whenText(d) {
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${w}) ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function dirText(az) {
  return DIR_NAMES[Math.round(norm360(az) / 22.5) % 16];
}

/** いまの 空の 時刻 */
function skyDate() {
  return new Date(state.skyMs);
}

function draw() {
  if (!canvas || !active) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const d = skyDate();
  const jd = julianDay(d);
  const r = drawSky(ctx, w, h, {
    jd, jde: jdTT(jd), lat: state.lat, lon: state.lon,
    az: state.az, alt: state.alt, fov: state.fov,
    showLines: state.lines, showNames: state.names, showMilkyWay: state.milky,
  });
  picks = r.picks;
  // いまの 向きと 画角を 画面にも 残す（見て 分かる ように、検査でも 読める ように）
  canvas.dataset.az = state.az.toFixed(1);
  canvas.dataset.alt = state.alt.toFixed(1);
  canvas.dataset.fov = state.fov.toFixed(1);
  canvas.dataset.picks = String(picks.length);
  $("sky-when").textContent = whenText(d);
  $("sky-where").textContent = `${placeName()}　${dirText(state.az)}の 空`;
  if (selected) drawSelection();
}

/** 選んだ ものに 輪を つける（押した ことが 分かる ように） */
function pickKey(q) {
  if (q.kind === "star") return "s" + q.i;
  if (q.kind === "planet") return "p" + q.body.id;
  return q.kind;
}

function drawSelection() {
  const p = picks.find(q => pickKey(q) === selected);
  if (!p) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,214,120,0.95)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(11, p.r + 6), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function placeName() {
  const found = PLACES.find(p => p.id === state.place);
  return found ? found.name : "いまいる ところ";
}

/** 次の 1 枚を 予約する。止まって いる ときは 描き直しを 1 回だけ */
function invalidate() {
  // 「いま」の あいだは 0.4 秒待ちの タイマーが 入って いる。
  // 指で 動かした ときは その 待ちを 捨てて すぐ 描き直す。
  if (timer) { clearTimeout(timer); timer = 0; raf = 0; }
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    step();
  });
}

function step() {
  if (!active) return;
  if (live) {
    state.skyMs = Date.now();
  } else if (speed > 0) {
    state.skyMs = baseSky + (Date.now() - baseWall) * speed;
  }
  draw();
  if (speed > 0) {
    // 時間送りの あいだは なめらかに
    raf = requestAnimationFrame(() => { raf = 0; step(); });
  } else if (live) {
    // 「いま」の 空は 1 秒で 15 秒角しか 動かない。0.4 秒に 1 枚で じゅうぶん
    raf = 1;
    timer = setTimeout(() => { raf = 0; timer = 0; step(); }, 400);
  }
}

function setSpeed(perSec) {
  speed = perSec;
  live = false;
  baseWall = Date.now();
  baseSky = state.skyMs;
  document.querySelectorAll("#sky-speed .seg-btn").forEach(b => {
    b.setAttribute("aria-pressed", String(Number(b.dataset.sec) === perSec));
  });
  $("sky-now").classList.toggle("is-on", false);
  invalidate();
}

function goNow() {
  live = true;
  speed = 0;
  state.skyMs = Date.now();
  document.querySelectorAll("#sky-speed .seg-btn").forEach(b => {
    b.setAttribute("aria-pressed", String(Number(b.dataset.sec) === 0));
  });
  $("sky-now").classList.add("is-on");
  $("sky-shift").value = "0";
  $("sky-shift-label").textContent = "いま";
  $("sky-date").value = localInputValue(skyDate());
  invalidate();
}

/** つまみで 前後 12 時間を 行き来する */
function setShift(minutes) {
  live = false;
  speed = 0;
  document.querySelectorAll("#sky-speed .seg-btn").forEach(b => {
    b.setAttribute("aria-pressed", String(Number(b.dataset.sec) === 0));
  });
  $("sky-now").classList.remove("is-on");
  state.skyMs = Date.now() + minutes * 60000;
  const h = Math.trunc(minutes / 60), m = Math.abs(minutes % 60);
  $("sky-shift-label").textContent = minutes === 0 ? "いま"
    : (minutes > 0 ? "＋" : "−") + `${Math.abs(h)}時間${m ? pad2(m) + "分" : ""}`;
  $("sky-date").value = localInputValue(skyDate());
  invalidate();
}

// --- 指の 操作 ---------------------------------------------------------------

const pointers = new Map();
let dragged = 0;
let pinchStart = 0;
let fovStart = 0;

function pointerAngleScale() {
  // 画角と 画面の 大きさから「1 画素 うごかすと 何度 向きが 変わるか」
  const side = Math.min(canvas.clientWidth, canvas.clientHeight);
  return state.fov / side;
}

function onDown(e) {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
    fovStart = state.fov;
  }
  dragged = 0;
}

function onMove(e) {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const next = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, next);

  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchStart > 4) {
      setFov(fovStart * (pinchStart / Math.max(4, d)));
      dragged += 10;
    }
    return;
  }
  const dx = next.x - prev.x, dy = next.y - prev.y;
  dragged += Math.abs(dx) + Math.abs(dy);
  const k = pointerAngleScale();
  // 空を つかんで 引っぱる 向き（指と 同じ 方へ 空が 動く）
  state.az = norm360(state.az - dx * k);
  state.alt = Math.max(-25, Math.min(89, state.alt + dy * k));
  invalidate();
}

function onUp(e) {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = 0;
  if (!p || dragged > 8) { save(); return; }
  pick(e);
  save();
}

function setFov(v) {
  state.fov = Math.max(6, Math.min(150, v));
  invalidate();
}

/** 押した ところの いちばん 近い ものを 選ぶ */
function pick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  let best = null, bestD = 26;
  for (const q of picks) {
    const d = Math.hypot(q.x - x, q.y - y);
    if (d - q.r < bestD) { bestD = d - q.r; best = q; }
  }
  if (!best) {
    selected = null;
    $("sky-tip").classList.add("is-hidden");
    invalidate();
    return;
  }
  selected = pickKey(best);
  showTip(best);
  invalidate();
}

function showTip(q) {
  const tip = $("sky-tip");
  let title = "", sub = "";
  if (q.kind === "star") {
    const d = describeStar(q.i);
    title = d.title;
    sub = d.sub;
  } else if (q.kind === "planet") {
    title = q.body.ja;
    sub = `${q.body.mag.toFixed(1)} 等 ・ ${q.body.dist.toFixed(2)} 天文単位（光で ${(q.body.dist * 8.317).toFixed(0)} 分）`;
  } else if (q.kind === "moon") {
    const ph = moonPhase(jdTT(julianDay(skyDate())));
    title = "月";
    sub = `かがやいて いる ぶん ${(ph.illum * 100).toFixed(0)}% ・ ${Math.round(q.body.distKm).toLocaleString("ja-JP")} km`;
  } else {
    title = "太陽";
    sub = `${(q.body.distAU * 149597870.7 / 1e6).toFixed(1)} 百万 km ・ 光で ${(q.body.distAU * 8.317).toFixed(1)} 分`;
  }
  tip.innerHTML = "";
  const b = document.createElement("b");
  b.textContent = title;
  const s = document.createElement("span");
  s.textContent = `高さ ${q.alt.toFixed(0)} 度 ・ ${sub}`;
  tip.append(b, s);
  tip.classList.remove("is-hidden");
}

// --- そうさ盤 ---------------------------------------------------------------

function buildControls() {
  const speeds = $("sky-speed");
  speeds.innerHTML = "";
  for (const s of SPEEDS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg-btn";
    b.dataset.sec = String(s.perSec);
    b.textContent = s.label;
    b.setAttribute("aria-pressed", String(s.perSec === 0));
    b.addEventListener("click", () => setSpeed(s.perSec));
    speeds.append(b);
  }

  const sel = $("sky-place");
  sel.innerHTML = "";
  for (const p of PLACES) {
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = p.name;
    sel.append(o);
  }
  const here = document.createElement("option");
  here.value = "here";
  here.textContent = "いまいる ところ";
  sel.append(here);
  sel.value = state.place;
  sel.addEventListener("change", () => {
    if (sel.value === "here") { useGeolocation(); return; }
    const p = PLACES.find(q => q.id === sel.value);
    if (!p) return;
    state.place = p.id; state.lat = p.lat; state.lon = p.lon;
    save();
    invalidate();
  });

  const toggles = [["sky-lines", "lines"], ["sky-names", "names"], ["sky-milky", "milky"]];
  for (const pair of toggles) {
    const b = $(pair[0]);
    b.setAttribute("aria-pressed", String(state[pair[1]]));
    b.addEventListener("click", () => {
      state[pair[1]] = !state[pair[1]];
      b.setAttribute("aria-pressed", String(state[pair[1]]));
      save();
      invalidate();
    });
  }

  $("sky-now").addEventListener("click", goNow);
  $("sky-date").addEventListener("change", () => {
    const v = $("sky-date").value;
    if (!v) return;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return;
    live = false;
    speed = 0;
    state.skyMs = d.getTime();
    document.querySelectorAll("#sky-speed .seg-btn").forEach(b => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.sec) === 0));
    });
    $("sky-now").classList.remove("is-on");
    $("sky-shift").value = "0";
    $("sky-shift-label").textContent = "えらんだ 日時";
    invalidate();
  });
  $("sky-shift").addEventListener("input", () => setShift(Number($("sky-shift").value)));
  $("sky-in").addEventListener("click", () => { setFov(state.fov / 1.4); save(); });
  $("sky-out").addEventListener("click", () => { setFov(state.fov * 1.4); save(); });
  $("sky-reset").addEventListener("click", () => {
    state.az = 180; state.alt = 42; state.fov = 105;
    save();
    invalidate();
  });
}

/** 現在地を 使う。ことわられても そのままの 場所で 動く */
function useGeolocation() {
  const sel = $("sky-place");
  if (!navigator.geolocation) {
    sel.value = state.place;
    $("sky-note").textContent = "この 端末では 現在地を 使えません。";
    return;
  }
  $("sky-note").textContent = "現在地を さがして います…";
  navigator.geolocation.getCurrentPosition(pos => {
    state.place = "here";
    state.lat = pos.coords.latitude;
    state.lon = pos.coords.longitude;
    $("sky-note").textContent = `北緯 ${state.lat.toFixed(2)} 度 ・ 東経 ${state.lon.toFixed(2)} 度`;
    save();
    invalidate();
  }, () => {
    sel.value = state.place;
    $("sky-note").textContent = "現在地を 使えなかったので、えらんだ 街の 空を 出します。";
  }, { timeout: 8000, maximumAge: 600000 });
}

/** 矢印でも 見まわせる（指が 使えない ときの ため） */
function onKeydown(e) {
  const step10 = state.fov / 12;
  const c = e.code;
  if (c === "ArrowLeft") state.az = norm360(state.az - step10);
  else if (c === "ArrowRight") state.az = norm360(state.az + step10);
  else if (c === "ArrowUp") state.alt = Math.min(89, state.alt + step10);
  else if (c === "ArrowDown") state.alt = Math.max(-25, state.alt - step10);
  else if (c === "Equal" || c === "NumpadAdd") setFov(state.fov / 1.3);
  else if (c === "Minus" || c === "NumpadSubtract") setFov(state.fov * 1.3);
  else return;
  e.preventDefault();
  save();
  invalidate();
}

export function initSky() {
  load();
  canvas = $("sky-canvas");
  ctx = canvas.getContext("2d");
  buildControls();

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", e => { pointers.delete(e.pointerId); });
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    setFov(state.fov * (e.deltaY > 0 ? 1.12 : 1 / 1.12));
    save();
  }, { passive: false });
  canvas.addEventListener("keydown", onKeydown);

  window.addEventListener("resize", () => {
    if (!active) return;
    resize();
    invalidate();
  });
}

export function renderSky() {
  active = true;
  selected = null;
  $("sky-tip").classList.add("is-hidden");
  $("sky-place").value = state.place;
  resize();
  goNow();
}

/** ほかの 画面へ 移る ときは 描くのを やめる（電池の ため） */
export function stopSky() {
  active = false;
  if (timer) { clearTimeout(timer); timer = 0; }
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
}
