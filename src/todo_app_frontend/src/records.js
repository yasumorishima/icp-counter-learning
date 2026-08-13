/**
 * 学習の記録。**この端末の中だけ**に置く。サーバーには何も送らない。
 *
 * きょうだいで 1 台を使えるように、なまえごとの記録を持てる。
 * 端末を替えるときのために、書き出し / 読み込みもできる。
 */

const KEY = "drill.records.v1";
const MAX_PROFILES = 6;
const MAX_NAME = 12;

/** 保存の形（壊れた値が入っていても落ちないよう、読むたびに整える） */
function empty() {
  return { current: "", profiles: [] };
}

function readRaw() {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return empty();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.profiles)) return empty();
    return {
      current: typeof data.current === "string" ? data.current : "",
      profiles: data.profiles.filter(p => p && typeof p.id === "string").map(normalize),
    };
  } catch (error) {
    return empty();
  }
}

function normalize(p) {
  return {
    id: p.id,
    name: typeof p.name === "string" ? p.name.slice(0, MAX_NAME) : "",
    face: typeof p.face === "string" ? p.face : "🐻",
    grade: Number.isInteger(p.grade) ? p.grade : 1,
    stars: Number.isFinite(p.stars) ? p.stars : 0,
    days: Array.isArray(p.days) ? p.days.filter(d => typeof d === "string").slice(-400) : [],
    units: p.units && typeof p.units === "object" ? p.units : {},
  };
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    // 保存できない設定（プライベートモード等）でも、その回の学習は続けられる
    return false;
  }
}

let state = readRaw();

export function reload() {
  state = readRaw();
}

export function profiles() {
  return state.profiles.map(p => ({ ...p }));
}

export function currentProfile() {
  return state.profiles.find(p => p.id === state.current) || null;
}

export function addProfile(name, face, grade) {
  if (state.profiles.length >= MAX_PROFILES) return null;
  const clean = String(name || "").trim().slice(0, MAX_NAME);
  if (!clean) return null;
  const id = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  const profile = normalize({ id, name: clean, face, grade, stars: 0, days: [], units: {} });
  state.profiles.push(profile);
  state.current = id;
  write(state);
  return { ...profile };
}

/** なまえと かお を あとから変える。記録はそのまま残る */
export function updateProfile(id, name, face) {
  const target = state.profiles.find(p => p.id === id);
  if (!target) return false;
  const clean = String(name || "").trim().slice(0, MAX_NAME);
  if (!clean) return false;
  target.name = clean;
  if (face) target.face = face;
  write(state);
  return true;
}

export function selectProfile(id) {
  if (!state.profiles.some(p => p.id === id)) return false;
  state.current = id;
  write(state);
  return true;
}

export function removeProfile(id) {
  state.profiles = state.profiles.filter(p => p.id !== id);
  if (state.current === id) state.current = state.profiles.length ? state.profiles[0].id : "";
  write(state);
}

export function setGrade(grade) {
  const p = currentProfile();
  if (!p) return;
  p.grade = grade;
  write(state);
}

/** その日の日付（端末の時計基準）。連続日数の数え方をここ 1 か所に閉じ込める */
function today(now) {
  const d = now || new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

/**
 * 1 回ぶんの結果をしまう。
 * 単元ごとに「やった数 / できた数 / 直近の出来」を持ち、出し直しの判断に使う。
 */
export function record(unitId, correct, total, now) {
  const p = currentProfile();
  if (!p) return null;
  const stat = p.units[unitId] || { tried: 0, right: 0, last: 0, best: 0 };
  stat.tried += total;
  stat.right += correct;
  stat.last = total ? Math.round((correct / total) * 100) : 0;
  stat.best = Math.max(stat.best || 0, stat.last);
  p.units[unitId] = stat;

  p.stars += correct;
  const day = today(now);
  if (p.days[p.days.length - 1] !== day) p.days.push(day);
  if (p.days.length > 400) p.days = p.days.slice(-400);

  write(state);
  return { ...stat };
}

export function unitStat(unitId) {
  const p = currentProfile();
  if (!p) return null;
  return p.units[unitId] ? { ...p.units[unitId] } : null;
}

/** 何日続いたか。カレンダーの日付でさかのぼって数える */
export function streak(now) {
  const p = currentProfile();
  if (!p || !p.days.length) return 0;
  const set = new Set(p.days);
  let count = 0;
  const cursor = now ? new Date(now.getTime()) : new Date();
  while (set.has(today(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** 苦手そうな単元。直近の出来が低い順に返す */
export function weakUnits(limit) {
  const p = currentProfile();
  if (!p) return [];
  return Object.keys(p.units)
    .map(id => ({ id, ...p.units[id] }))
    .filter(u => u.tried > 0)
    .sort((a, b) => a.last - b.last)
    .slice(0, limit || 3);
}

/** 端末を替えるとき用。中身は学習の記録だけで、個人を特定するものは入っていない */
export function exportAll() {
  return JSON.stringify(state, null, 1);
}

export function importAll(text) {
  try {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.profiles)) return false;
    state = {
      current: typeof data.current === "string" ? data.current : "",
      profiles: data.profiles.filter(p => p && typeof p.id === "string").map(normalize).slice(0, MAX_PROFILES),
    };
    if (!state.profiles.some(p => p.id === state.current)) {
      state.current = state.profiles.length ? state.profiles[0].id : "";
    }
    return write(state);
  } catch (error) {
    return false;
  }
}

export const LIMITS = { MAX_PROFILES, MAX_NAME };
