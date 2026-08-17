/**
 * ぼうけんの せかいと、プログラムの じっこう。
 *
 * 画面には いっさい触らない＝node からそのまま検算できる（`.mjs` なのは そのため）。
 * よこ 1 れつの みちを あるく。あなに おちる／てきに つかまる／かぎで とびらを あける、
 * が すべて「つぎの ます」で きまるので、7〜8 才でも 目で 追える。
 */

export const MAX_STEPS = 400;   // 動きの数の 上限（画面が 固まらないため）
export const MAX_REPEAT = 20;
export const MAX_DEPTH = 3;
export const MAX_CARDS = 60;

export const ACTIONS = ["go", "jump", "take", "open", "wait"];
export const CONDS = ["hole", "door", "enemy", "star"];

/**
 * みちの 書きかた:
 *   G = じめん / H = あな / * = ★ / k = かぎ / D = とびら / F = ゴール
 * てきは べつに { lo, hi } で 行ったり来たり する はんいを 書く。
 */
export function makeLevel(level) {
  const map = level.map;
  const tiles = [];
  const stars = new Set();
  const keys = new Set();
  const doors = new Set();
  let goal = map.length - 1;
  for (let i = 0; i < map.length; i++) {
    const c = map[i];
    tiles.push(c === "H" ? "hole" : "ground");
    if (c === "*") stars.add(i);
    if (c === "k") keys.add(i);
    if (c === "D") doors.add(i);
    if (c === "F") goal = i;
  }
  // every = なん手に 1 ます 動くか。2 に すると じぶんの ほうが 2 ばい はやい＝
  // 「はなれた すきに 通る」ことが できる（1 なら 同じ速さで、まっても ぜったい 通れない）
  const enemies = (level.enemies || []).map(e => ({
    lo: e.lo, hi: e.hi, at: e.at === undefined ? e.lo : e.at,
    dir: e.dir === undefined ? 1 : e.dir, every: e.every === undefined ? 2 : e.every,
  }));
  return {
    tiles, stars, keys, doors, enemies, goal, tick: 0,
    total: stars.size,
    me: { at: level.start || 0, keys: 0, got: 0 },
    dead: null,
  };
}

export function cloneState(st) {
  return {
    tiles: st.tiles,
    stars: new Set(st.stars),
    keys: new Set(st.keys),
    doors: new Set(st.doors),
    enemies: st.enemies.map(e => ({ ...e })),
    goal: st.goal, tick: st.tick,
    total: st.total,
    me: { ...st.me },
    dead: st.dead,
  };
}

/** 画面が あとから 見せなおせるように、そのときの ようすを まるごと のこす */
export function snapshot(st, op, why) {
  return {
    op, why: why || "",
    at: st.me.at, keys: st.me.keys, got: st.me.got,
    stars: [...st.stars], keyItems: [...st.keys], doors: [...st.doors],
    enemies: st.enemies.map(e => e.at),
    dead: st.dead,
  };
}

export const enemyAt = (st, i) => st.enemies.some(e => e.at === i);
export const lockedAt = (st, i) => st.doors.has(i);
export const holeAt = (st, i) => st.tiles[i] === "hole";
export const last = st => st.tiles.length - 1;

/** てきは はんいの なかを 行ったり来たり する。1 つ 動くたびに 1 ます 動く */
function moveEnemies(st) {
  st.tick += 1;
  for (const e of st.enemies) {
    if (e.hi <= e.lo) continue;
    if (st.tick % e.every !== 0) continue;
    e.at += e.dir;
    if (e.at >= e.hi) { e.at = e.hi; e.dir = -1; }
    if (e.at <= e.lo) { e.at = e.lo; e.dir = 1; }
  }
}

function caught(st) {
  if (!st.dead && enemyAt(st, st.me.at)) st.dead = "caught";
}

/** カード 1 まいを 実行する。できなかったときは わけを 返す */
export function act(st, action) {
  if (st.dead) return "もう うごけないよ";
  const me = st.me;
  const next = me.at + 1;

  if (action === "go" || action === "jump") {
    const to = action === "go" ? next : me.at + 2;
    if (to > last(st)) return "みちの おわりだよ";
    if (lockedAt(st, next) || (action === "jump" && lockedAt(st, to))) return "とびらが しまっているよ";
    me.at = to;
    if (holeAt(st, to)) st.dead = "fall";
    else if (enemyAt(st, to)) st.dead = "caught";
    return "";
  }

  if (action === "take") {
    if (st.stars.has(me.at)) { st.stars.delete(me.at); me.got += 1; return ""; }
    if (st.keys.has(me.at)) { st.keys.delete(me.at); me.keys += 1; return ""; }
    return "ここには とる ものが ないよ";
  }

  if (action === "open") {
    if (!lockedAt(st, next)) return "目の前に とびらが ないよ";
    if (me.keys <= 0) return "かぎを もって いないよ";
    st.doors.delete(next);
    me.keys -= 1;
    return "";
  }

  return ""; // wait
}

/** 「もし〜だったら」の 中身 */
export function ask(st, cond) {
  const next = st.me.at + 1;
  if (cond === "hole") return next <= last(st) && holeAt(st, next);
  if (cond === "door") return lockedAt(st, next);
  if (cond === "enemy") return enemyAt(st, next);
  if (cond === "star") return st.stars.has(st.me.at) || st.keys.has(st.me.at);
  return false;
}

export function clampCount(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(MAX_REPEAT, Math.max(1, v));
}

/**
 * プログラムを 実行する。
 * program は { main: [...], a: [...], b: [...] }。a・b は「わざ」（名前を つけた 手じゅん）。
 */
export function run(program, level) {
  const st = makeLevel(level);
  const prog = normalize(program);
  const frames = [snapshot(st, "start")];
  let stopped = "ok";

  const exec = (list, depth) => {
    for (const card of list) {
      if (st.dead) return false;
      if (frames.length > MAX_STEPS) { stopped = "limit"; return false; }

      if (card.t === "repeat") {
        const n = clampCount(card.n);
        for (let i = 0; i < n; i++) if (!exec(card.body || [], depth)) return false;
        continue;
      }
      if (card.t === "if") {
        const yes = ask(st, card.cond);
        if (!exec((yes ? card.then : card.other) || [], depth)) return false;
        continue;
      }
      if (card.t === "call") {
        if (depth >= MAX_DEPTH) { stopped = "deep"; return false; }
        if (!exec(prog[card.w] || [], depth + 1)) return false;
        continue;
      }

      const why = act(st, card.t);
      if (!why && !st.dead) {
        moveEnemies(st);
        caught(st);
      }
      const frame = snapshot(st, why ? "bump" : card.t, why);
      frame.card = card.id;
      frames.push(frame);
      if (st.dead) return false;
    }
    return true;
  };

  exec(prog.main, 0);
  if (st.dead) stopped = st.dead;
  return { st, frames, stopped };
}

/** ゴールに ついて、★を ぜんぶ とれたら クリア */
export function cleared(st) {
  return !st.dead && st.me.at === st.goal && st.me.got >= st.total;
}

export function countCards(list) {
  let n = 0;
  for (const card of Array.isArray(list) ? list : []) {
    n += 1;
    if (card && card.t === "repeat") n += countCards(card.body);
    if (card && card.t === "if") n += countCards(card.then) + countCards(card.other);
  }
  return n;
}

export function countAll(program) {
  const p = program || {};
  return countCards(p.main) + countCards(p.a) + countCards(p.b);
}

/** 壊れた値・深すぎる入れ子・大きすぎる かずを ここで まるめる */
export function normalizeList(list, depth = 0) {
  const out = [];
  for (const card of Array.isArray(list) ? list : []) {
    if (!card || typeof card.t !== "string") continue;
    if (ACTIONS.includes(card.t)) {
      out.push({ t: card.t, id: card.id });
    } else if (card.t === "call" && (card.w === "a" || card.w === "b")) {
      out.push({ t: "call", w: card.w, id: card.id });
    } else if (card.t === "repeat" && depth < MAX_DEPTH) {
      out.push({ t: "repeat", id: card.id, n: clampCount(card.n), body: normalizeList(card.body, depth + 1) });
    } else if (card.t === "if" && depth < MAX_DEPTH) {
      out.push({
        t: "if", id: card.id,
        cond: CONDS.includes(card.cond) ? card.cond : "hole",
        then: normalizeList(card.then, depth + 1),
        other: normalizeList(card.other, depth + 1),
      });
    }
    if (countCards(out) >= MAX_CARDS) break;
  }
  return out;
}

export function normalize(program) {
  const p = program || {};
  return { main: normalizeList(p.main), a: normalizeList(p.a), b: normalizeList(p.b) };
}
