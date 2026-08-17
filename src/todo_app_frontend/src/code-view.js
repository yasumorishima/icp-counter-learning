/**
 * ぼうけんの 画面を 描く。
 *
 * 外の ライブラリは つかわない。canvas に じぶんで 描く。
 * うしろの 山・雲は ゆっくり、手前ほど はやく 流れる（3 まいがさね）。
 * 歩き・とび・きらきら・画面ゆれ まで ここで やる。
 */

const TS = 46;              // ます 1 つの 大きさ
const GROUND_Y = 0.66;      // じめんの 高さ（画面の たてに たいする わりあい）

export const HEROES = [
  { id: "penguin", name: "ペンギン", body: "#2f3b60", belly: "#ffffff", beak: "#ffb64d", ear: "round" },
  { id: "cat", name: "ねこ", body: "#f59f4a", belly: "#ffe6c9", beak: "#ff8fae", ear: "pointy" },
  { id: "robot", name: "ロボット", body: "#8fa3c8", belly: "#dfe8f7", beak: "#5ce1e6", ear: "antenna" },
  { id: "dragon", name: "りゅう", body: "#5fc98a", belly: "#d9f7e2", beak: "#ffd166", ear: "horn" },
];

const rr = (ctx, x, y, w, h, r) => {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
};

const lerp = (a, b, p) => a + (b - a) * p;
const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

function person(ctx, hero, x, y, walk, dead, cheer) {
  const s = 1;
  const step = Math.sin(walk * Math.PI * 2) * 7;
  ctx.save();
  ctx.translate(x, y);

  // あし
  ctx.strokeStyle = hero.body;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -12); ctx.lineTo(-6 + step * 0.5, 0);
  ctx.moveTo(6, -12); ctx.lineTo(6 - step * 0.5, 0);
  ctx.stroke();

  // からだ
  ctx.fillStyle = hero.body;
  rr(ctx, -15 * s, -46 * s, 30 * s, 36 * s, 13);
  ctx.fill();
  // ふち。くらい ワールドでも 背景に 沈まないように する
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = hero.belly;
  rr(ctx, -9 * s, -38 * s, 18 * s, 26 * s, 9);
  ctx.fill();

  // みみ・つの
  ctx.fillStyle = hero.body;
  if (hero.ear === "pointy") {
    ctx.beginPath();
    ctx.moveTo(-14, -44); ctx.lineTo(-8, -58); ctx.lineTo(-2, -44);
    ctx.moveTo(14, -44); ctx.lineTo(8, -58); ctx.lineTo(2, -44);
    ctx.fill();
  } else if (hero.ear === "antenna") {
    ctx.fillRect(-2, -58, 4, 12);
    ctx.fillStyle = hero.beak;
    ctx.beginPath(); ctx.arc(0, -60, 5, 0, Math.PI * 2); ctx.fill();
  } else if (hero.ear === "horn") {
    ctx.fillStyle = hero.beak;
    ctx.beginPath();
    ctx.moveTo(-10, -46); ctx.lineTo(-6, -60); ctx.lineTo(-1, -46);
    ctx.moveTo(10, -46); ctx.lineTo(6, -60); ctx.lineTo(1, -46);
    ctx.fill();
  }

  // かお
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-6, -34, 5.4, 0, Math.PI * 2);
  ctx.arc(6, -34, 5.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#22203a";
  if (dead) {
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#22203a";
    ctx.beginPath();
    ctx.moveTo(-9, -37); ctx.lineTo(-3, -31);
    ctx.moveTo(-3, -37); ctx.lineTo(-9, -31);
    ctx.moveTo(3, -37); ctx.lineTo(9, -31);
    ctx.moveTo(9, -37); ctx.lineTo(3, -31);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-5, -34, 2.6, 0, Math.PI * 2);
    ctx.arc(7, -34, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = hero.beak;
  ctx.beginPath();
  ctx.moveTo(-4, -27); ctx.lineTo(4, -27); ctx.lineTo(0, -22);
  ctx.closePath();
  ctx.fill();

  if (cheer) {
    ctx.strokeStyle = hero.body;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-14, -38); ctx.lineTo(-24, -54);
    ctx.moveTo(14, -38); ctx.lineTo(24, -54);
    ctx.stroke();
  }
  ctx.restore();
}

/** えらぶ画面に 出す 小さな すがた */
export function paintHero(canvas, heroId) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round((canvas.clientWidth || 54) * dpr));
  const h = Math.max(1, Math.round((canvas.clientHeight || 62) * dpr));
  canvas.width = w;
  canvas.height = h;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w / dpr, h / dpr);
  const hero = HEROES.find(x => x.id === heroId) || HEROES[0];
  ctx.save();
  ctx.translate(w / dpr / 2, h / dpr - 3);
  ctx.scale(0.82, 0.82);
  person(ctx, hero, 0, 0, 0, false, false);
  ctx.restore();
}

export function createGame(canvas) {
  const ctx = canvas.getContext("2d");
  let level = null;
  let world = null;
  let hero = HEROES[0];
  let frames = [];
  let idx = 0;
  let from = null;
  let to = null;
  let startAt = 0;
  let dur = 320;
  let playing = false;
  let alive = false;
  let camX = 0;
  let shake = 0;
  let clock = 0;
  let onFrame = null;
  let onEnd = null;
  const parts = [];

  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round((canvas.clientWidth || 320) * dpr));
    const h = Math.max(1, Math.round((canvas.clientHeight || 220) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return dpr;
  }

  function spark(cx, cy, color, n) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      parts.push({
        x: cx, y: cy,
        vx: Math.cos(a) * (1.2 + (i % 3) * 0.4),
        vy: Math.sin(a) * (1.2 + (i % 3) * 0.4) - 1.4,
        life: 1, color,
      });
    }
  }

  // --- うしろの けしき（3 まいがさね） -----------------------------------------

  function sky(w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, world.sky[0]);
    g.addColorStop(1, world.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (world.id === 4) {
      // そら: 小さな 星が またたく
      for (let i = 0; i < 40; i++) {
        const x = ((i * 137) % w) + Math.sin(clock / 3000 + i) * 6;
        const y = ((i * 71) % (h * 0.55));
        const a = 0.35 + 0.35 * Math.sin(clock / 400 + i);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    if (world.id === 1) {
      ctx.fillStyle = "rgba(255,240,150,0.9)";
      ctx.beginPath();
      ctx.arc(w * 0.82, h * 0.16, h * 0.075, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function clouds(w, h, off) {
    ctx.fillStyle = world.id === 2 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)";
    for (let i = 0; i < 6; i++) {
      const span = w + 320;
      const x = ((i * 260 - off * 0.25 + clock / 90) % span + span) % span - 160;
      const y = h * (0.12 + 0.06 * (i % 3));
      const s = 0.7 + 0.25 * (i % 3);
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
      ctx.arc(x + 26 * s, y + 5 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(x - 26 * s, y + 6 * s, 18 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hills(w, h, off) {
    const base = h * GROUND_Y;
    ctx.fillStyle = world.far;
    ctx.beginPath();
    ctx.moveTo(-100, base);
    for (let x = -100; x <= w + 100; x += 20) {
      const t = (x + off * 0.35) / 190;
      ctx.lineTo(x, base - 60 - Math.sin(t) * 34 - Math.sin(t * 2.3) * 16);
    }
    ctx.lineTo(w + 100, base);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = world.near;
    ctx.beginPath();
    ctx.moveTo(-100, base);
    for (let x = -100; x <= w + 100; x += 18) {
      const t = (x + off * 0.6) / 130;
      ctx.lineTo(x, base - 26 - Math.sin(t + 1.4) * 22);
    }
    ctx.lineTo(w + 100, base);
    ctx.closePath();
    ctx.fill();
  }

  /** ワールドごとの かざり。同じ 絵に 見えないように する */
  function decor(w, h, off) {
    const base = h * GROUND_Y;
    if (world.id === 2) {
      ctx.fillStyle = "rgba(180, 160, 255, 0.5)";
      for (let i = 0; i < 14; i++) {
        const x = ((i * 173 - off * 0.5) % (w + 200) + w + 200) % (w + 200) - 100;
        const len = 30 + (i % 4) * 22;
        ctx.beginPath();
        ctx.moveTo(x - 12, 0);
        ctx.lineTo(x + 12, 0);
        ctx.lineTo(x, len);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (world.id === 1) {
      ctx.strokeStyle = "rgba(60, 130, 50, 0.5)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 26; i++) {
        const x = ((i * 97 - off) % (w + 200) + w + 200) % (w + 200) - 100;
        ctx.beginPath();
        ctx.moveTo(x, base - 10);
        ctx.lineTo(x + Math.sin(clock / 700 + i) * 3, base - 22);
        ctx.stroke();
      }
    }
    if (world.id === 3) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = ((i * 151 - off * 0.4) % (w + 200) + w + 200) % (w + 200) - 100;
        const y = base - 40 - ((clock / 12 + i * 90) % (h * 0.5));
        ctx.beginPath();
        ctx.arc(x, y, 3 + (i % 3) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- みちと もの --------------------------------------------------------------

  function tiles(w, h, off) {
    const base = h * GROUND_Y;
    // みちの そとがわ（せかいの へり）を 暗く して、ぷつんと 切れて 見えないように する
    ctx.fillStyle = "rgba(20, 16, 40, 0.22)";
    if (-off > 0) ctx.fillRect(0, base, -off, h - base);
    const rightEdge = level.map.length * TS - off;
    if (rightEdge < w) ctx.fillRect(rightEdge, base, w - rightEdge, h - base);

    for (let i = 0; i < level.map.length; i++) {
      const x = i * TS - off;
      if (x < -TS * 2 || x > w + TS) continue;
      if (level.map[i] === "H") {
        ctx.fillStyle = world.water;
        ctx.fillRect(x, base + 16, TS, h - base);
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        for (let k = 0; k < 3; k++) {
          const y = base + 22 + k * 9;
          ctx.beginPath();
          ctx.moveTo(x, y + Math.sin(clock / 260 + i + k) * 3);
          for (let dx = 0; dx <= TS; dx += 8) {
            ctx.lineTo(x + dx, y + Math.sin(clock / 260 + i + k + dx / 12) * 3);
          }
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.stroke();
        }
        continue;
      }
      ctx.fillStyle = world.side;
      ctx.fillRect(x, base, TS, h - base);
      ctx.fillStyle = world.deep;
      ctx.fillRect(x, base + TS * 0.9, TS, h);
      ctx.fillStyle = world.top;
      ctx.fillRect(x, base - 10, TS, 16);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 4, base - 8, TS - 8, 4);
    }
  }

  function star(x, y, r, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.45 : r;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffd84d";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e0a800";
    ctx.stroke();
    ctx.restore();
  }

  function things(w, h, off, snap) {
    const base = h * GROUND_Y;
    const bob = Math.sin(clock / 320) * 4;

    for (const i of snap.stars) {
      star(i * TS - off + TS / 2, base - 34 + bob, 13, clock / 700);
    }
    for (const i of snap.keyItems) {
      const x = i * TS - off + TS / 2;
      const y = base - 30 + bob;
      ctx.fillStyle = "#ffcf3f";
      ctx.beginPath();
      ctx.arc(x - 5, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 1, y - 3, 15, 6);
      ctx.fillRect(x + 9, y + 3, 4, 6);
    }
    for (const i of snap.doors) {
      const x = i * TS - off;
      ctx.fillStyle = "#8a5a2b";
      rr(ctx, x + 4, base - TS - 8, TS - 8, TS + 8, 8);
      ctx.fill();
      ctx.fillStyle = "#6b4420";
      ctx.fillRect(x + 10, base - TS - 2, TS - 20, 4);
      ctx.fillStyle = "#ffd84d";
      ctx.beginPath();
      ctx.arc(x + TS - 15, base - TS / 2 - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ゴールの はた（ひらひら する）
    const gx = level.goal * TS - off + TS / 2;
    ctx.strokeStyle = "#cfd6e4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx, base - 4);
    ctx.lineTo(gx, base - 74);
    ctx.stroke();
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath();
    ctx.moveTo(gx, base - 74);
    for (let k = 0; k <= 6; k++) {
      ctx.lineTo(gx + k * 6, base - 72 + Math.sin(clock / 180 + k) * 3 + k * 0.6);
    }
    for (let k = 6; k >= 0; k--) {
      ctx.lineTo(gx + k * 6, base - 50 + Math.sin(clock / 180 + k) * 3 - k * 0.4);
    }
    ctx.closePath();
    ctx.fill();
  }

  function enemy(x, y) {
    const squash = 1 + Math.sin(clock / 240) * 0.12;
    const w = 34 / squash;
    const h = 30 * squash;
    ctx.fillStyle = "#b45cf0";
    rr(ctx, x - w / 2, y - h, w, h, 12);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x - 7, y - h * 0.62, 5, 0, Math.PI * 2);
    ctx.arc(x + 7, y - h * 0.62, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b2350";
    ctx.beginPath();
    ctx.arc(x - 6, y - h * 0.62, 2.4, 0, Math.PI * 2);
    ctx.arc(x + 8, y - h * 0.62, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // person は そとに 出してある（えらぶ画面でも 同じ 絵を つかう）

  // --- 1 まいの 絵 --------------------------------------------------------------

  function paint() {
    const dpr = size();
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!level || !world) {
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const p = to && dur ? Math.min(1, (clock - startAt) / dur) : 1;
    const a = from || to;
    const b = to || from;
    const at = a && b ? lerp(a.at, b.at, ease(p)) : 0;
    const jumping = b && b.op === "jump" && p < 1;
    const base = h * GROUND_Y;

    camX = lerp(camX, at * TS + TS / 2 - w / 2, 0.25);
    camX = Math.max(-TS, Math.min(camX, level.map.length * TS - w + TS));
    const off = camX;

    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    sky(w, h);
    clouds(w, h, off);
    hills(w, h, off);
    decor(w, h, off);
    tiles(w, h, off, b);
    things(w, h, off, b);

    const es = b ? b.enemies : [];
    const ea = a ? a.enemies : es;
    es.forEach((e, i) => {
      const ex = lerp(ea[i] === undefined ? e : ea[i], e, ease(p));
      enemy(ex * TS - off + TS / 2, base);
    });

    let y = base;
    if (jumping) y = base - Math.sin(Math.PI * p) * TS * 1.5;
    if (b && b.dead === "fall") y = base + ease(p) * 90;
    const cheer = Boolean(b && b.op === "goal");
    person(ctx, hero, at * TS - off + TS / 2, y, b && b.op === "go" ? p : 0, Boolean(b && b.dead), cheer);

    for (const q of parts) {
      ctx.globalAlpha = Math.max(0, q.life);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - off, q.y, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function tick(now) {
    if (!alive) return;
    clock = now;
    if (shake > 0) shake = Math.max(0, shake - 0.6);
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.x += q.vx; q.y += q.vy; q.vy += 0.16; q.life -= 0.035;
      if (q.life <= 0) parts.splice(i, 1);
    }
    if (playing && to && clock - startAt >= dur) {
      if (idx + 1 < frames.length) {
        step(idx + 1);
      } else {
        playing = false;
        if (onEnd) onEnd();
      }
    }
    paint();
    requestAnimationFrame(tick);
  }

  function step(next) {
    from = frames[idx];
    idx = next;
    to = frames[idx];
    startAt = clock;
    if (to.op === "take") spark((to.at + 0.5) * TS, canvas.clientHeight * GROUND_Y - 34, "#ffd84d", 10);
    if (to.op === "open") spark((to.at + 1.5) * TS, canvas.clientHeight * GROUND_Y - 30, "#ffcf3f", 8);
    if (to.op === "bump") shake = 7;
    if (to.dead) shake = 12;
    if (onFrame) onFrame(idx, to);
  }

  return {
    /** ステージを のせて、はじめの ようすを 見せる */
    load(nextLevel, nextWorld, heroId, first) {
      level = nextLevel;
      world = nextWorld;
      hero = HEROES.find(x => x.id === heroId) || HEROES[0];
      frames = [first];
      idx = 0;
      from = null;
      to = first;
      playing = false;
      parts.length = 0;
      camX = first.at * TS + TS / 2 - (canvas.clientWidth || 320) / 2;
      paint();
    },
    setHero(heroId) {
      hero = HEROES.find(x => x.id === heroId) || HEROES[0];
      paint();
    },
    /** じっこうを 見せる。1 まいずつ すすみ、おわったら onEnd */
    play(nextFrames, speed, hooks) {
      frames = nextFrames;
      idx = 0;
      from = null;
      to = frames[0];
      dur = speed;
      playing = true;
      onFrame = hooks.onFrame;
      onEnd = hooks.onEnd;
      startAt = clock;
      if (frames.length > 1) step(1);
    },
    pause() {
      playing = false;
    },
    cheer() {
      const at = to ? to.at : 0;
      spark((at + 0.5) * TS, (canvas.clientHeight || 220) * GROUND_Y - 50, "#ff5d8f", 16);
      spark((at + 0.5) * TS, (canvas.clientHeight || 220) * GROUND_Y - 40, "#5ce1e6", 12);
      if (to) to = { ...to, op: "goal" };
    },
    start() {
      if (alive) return;
      alive = true;
      requestAnimationFrame(tick);
    },
    stop() {
      alive = false;
      playing = false;
    },
    resize() {
      paint();
    },
  };
}
