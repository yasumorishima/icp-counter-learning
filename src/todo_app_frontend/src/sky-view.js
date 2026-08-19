// そらを 描く。canvas に 自前で 描画する（外部ライブラリ なし）。
// 投影は ステレオ図法（プラネタリウムと おなじ）。中心の 向きと 画角を 変えて 見まわす。
//
// 速さの ために、星の 向きは 単位ベクトルで 持ち、
//   赤道座標 → 地平座標 → カメラ
// の 3 つの 回転を 1 つの 3x3 行列に まとめてから 星の 数だけ かける。
// （1 星ごとに 三角関数を 呼ぶと 8400 星で 200ms かかる。行列なら かけ算 12 回で 済む）
import {
  D2R, centuries, precessFromJ2000, toHorizontal, refraction,
  localSiderealDeg, sunPosition, moonPosition, moonPhase, planetPositions,
} from "./sky-astro.mjs";
import { STARS, BAYER_LETTERS, CONSTELLATION_ABBR } from "./sky-stars.mjs";
import { CONSTELLATION_LINES, CONSTELLATION_NAMES, MILKY_WAY } from "./sky-figures.mjs";

/** B-V 色指数 → 表面温度（K）。Ballesteros の 近似 */
export function bvToKelvin(bv) {
  const b = Math.max(-0.4, Math.min(2.0, bv));
  return 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
}

/** 黒体の 色（Tanner Helland の 近似） */
export function kelvinToRgb(k) {
  const t = Math.max(1000, Math.min(40000, k)) / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return [c(r), c(g), c(b)];
}

const colorCache = new Map();
/** 星の 色。肉眼では 色が うすいので 白に 寄せる */
export function starColor(bv) {
  const k = Math.round(bv * 20) / 20;
  let c = colorCache.get(k);
  if (!c) {
    const rgb = kelvinToRgb(bvToKelvin(k));
    c = rgb.map((v) => Math.round(v * 0.42 + 255 * 0.58));
    colorCache.set(k, c);
  }
  return c;
}

const rgba = (c, a) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
const unit = (raDeg, decDeg) => {
  const r = raDeg * D2R, d = decDeg * D2R, cd = Math.cos(d);
  return [cd * Math.cos(r), cd * Math.sin(r), Math.sin(d)];
};

/** 歳差を かけた 位置を 単位ベクトルで 持つ。T が 変わった ときだけ 作り直す */
let cache = { T: null };
function precessed(T) {
  if (cache.T !== null && Math.abs(cache.T - T) < 1e-4) return cache;
  const sv = new Float64Array(STARS.length * 3);
  for (let i = 0; i < STARS.length; i++) {
    const p = precessFromJ2000(STARS[i][0], STARS[i][1], T);
    const v = unit(p.ra, p.dec);
    sv[i * 3] = v[0]; sv[i * 3 + 1] = v[1]; sv[i * 3 + 2] = v[2];
  }
  const conv = (pts) => {
    const a = new Float64Array(pts.length * 3);
    for (let i = 0; i < pts.length; i++) {
      const p = precessFromJ2000(pts[i][0], pts[i][1], T);
      const v = unit(p.ra, p.dec);
      a[i * 3] = v[0]; a[i * 3 + 1] = v[1]; a[i * 3 + 2] = v[2];
    }
    return a;
  };
  const lines = CONSTELLATION_LINES.map((f) => ({ c: f.c, s: f.s.map(conv) }));
  const names = CONSTELLATION_NAMES.map((n) => {
    const p = precessFromJ2000(n.p[0], n.p[1], T);
    return { ja: n.ja, v: unit(p.ra, p.dec) };
  });
  const mw = MILKY_WAY.map((m) => ({ level: m.level, polys: m.polys.map(conv) }));
  cache = { T, sv, lines, names, mw };
  return cache;
}

/**
 * 赤道座標の 単位ベクトルを、そのまま カメラ座標へ 移す 3x3 行列。
 * 行は [右, 上, 前]。4 行目に 高度を 出すための [上向き] も 返す。
 */
function makeMatrix(lstDeg, latDeg, azC, altC) {
  const L = lstDeg * D2R, phi = latDeg * D2R;
  const cL = Math.cos(L), sL = Math.sin(L), cp = Math.cos(phi), sp = Math.sin(phi);
  // 赤道 → 地平（東, 北, 上）
  const E = [sL, -cL, 0];
  const N = [-sp * cL, -sp * sL, cp];
  const U = [cp * cL, cp * sL, sp];
  // 地平 → カメラ
  const ca = Math.cos(altC * D2R), sa = Math.sin(altC * D2R);
  const cz = Math.cos(azC * D2R), sz = Math.sin(azC * D2R);
  const f = [ca * sz, ca * cz, sa];
  const r = [cz, -sz, 0];
  const u = [
    r[1] * f[2] - r[2] * f[1],
    r[2] * f[0] - r[0] * f[2],
    r[0] * f[1] - r[1] * f[0],
  ];
  const row = (h) => [
    h[0] * E[0] + h[1] * N[0] + h[2] * U[0],
    h[0] * E[1] + h[1] * N[1] + h[2] * U[1],
    h[0] * E[2] + h[1] * N[2] + h[2] * U[2],
  ];
  return { R: row(r), Uu: row(u), F: row(f), Up: U };
}

/** 太陽の 高度から 空の 色を きめる（夜／薄明／昼） */
function skyColors(sunAlt) {
  const t = Math.max(0, Math.min(1, (sunAlt + 18) / 24));
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const top = mix([5, 7, 16], [58, 118, 196], t * t);
  const hor = t < 0.55
    ? mix([13, 19, 38], [150, 92, 60], t / 0.55)
    : mix([150, 92, 60], [162, 196, 226], (t - 0.55) / 0.45);
  const rgb = (c) => "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  return { top: rgb(top), hor: rgb(hor), night: 1 - t };
}

/** 名前を 置く 場所とり。重なる ものは 出さない */
function makePlacer(ctx, w, h) {
  const boxes = [];
  return function place(text, x, y, font, fill, align) {
    ctx.font = font;
    const tw = ctx.measureText(text).width;
    const th = 14;
    const x0 = align === "center" ? x - tw / 2 : x;
    const box = [x0 - 3, y - th, x0 + tw + 3, y + 4];
    if (box[0] < 0 || box[2] > w || box[1] < 22 || box[3] > h) return false;
    for (const b of boxes) {
      if (box[0] < b[2] && b[0] < box[2] && box[1] < b[3] && b[1] < box[3]) return false;
    }
    boxes.push(box);
    ctx.fillStyle = fill;
    ctx.textAlign = align === "center" ? "center" : "left";
    ctx.fillText(text, align === "center" ? x : x0, y);
    return true;
  };
}

/**
 * そらを 1 枚 描く。
 * opts: { jd, jde, lat, lon, az, alt, fov, showLines, showNames, showMilkyWay }
 */
export function drawSky(ctx, w, h, opts) {
  const {
    jd, jde, lat, lon, az: azC, alt: altC, fov,
    showLines = true, showNames = true, showMilkyWay = true,
  } = opts;
  const T = centuries(jde);
  const lst = localSiderealDeg(jd, lon);
  const pre = precessed(T);
  const M = makeMatrix(lst, lat, azC, altC);
  const scale = (Math.min(w, h) / 2) / (2 * Math.tan((fov / 4) * D2R));
  const cx = w / 2, cy = h / 2;
  const zoom = Math.pow(110 / fov, 0.35);

  const sun = sunPosition(jde);
  const sunH = toHorizontal(sun.ra, sun.dec, lst, lat);
  const sky = skyColors(sunH.alt);
  const night = sky.night;

  // 単位ベクトル → 画面。見えない ときは false を 返す
  const out = { x: 0, y: 0, z: 0, up: 0 };
  function proj(vx, vy, vz) {
    const Z = M.F[0] * vx + M.F[1] * vy + M.F[2] * vz;
    if (Z < -0.35) return false;
    const X = M.R[0] * vx + M.R[1] * vy + M.R[2] * vz;
    const Y = M.Uu[0] * vx + M.Uu[1] * vy + M.Uu[2] * vz;
    const k = (2 / (1 + Z)) * scale;
    out.x = cx + X * k; out.y = cy - Y * k; out.z = Z;
    out.up = M.Up[0] * vx + M.Up[1] * vy + M.Up[2] * vz;
    return true;
  }
  // 天の川のような 塗りつぶし図形は、見えない点を 捨てると 図形が 壊れて
  // 空の 半分を 塗ってしまう。捨てずに 遠くへ 写して、画面の外に 追い出す。
  const RCLAMP = 2 * Math.tan(75 * D2R);
  function projFar(vx, vy, vz) {
    const Z = M.F[0] * vx + M.F[1] * vy + M.F[2] * vz;
    const X = M.R[0] * vx + M.R[1] * vy + M.R[2] * vz;
    const Y = M.Uu[0] * vx + M.Uu[1] * vy + M.Uu[2] * vz;
    let px, py;
    if (Z > -0.866) {
      const k = 2 / (1 + Z);
      px = X * k; py = Y * k;
    } else {
      const s2 = Math.hypot(X, Y) || 1e-9;
      px = (X / s2) * RCLAMP; py = (Y / s2) * RCLAMP;
    }
    out.x = cx + px * scale; out.y = cy - py * scale; out.z = Z;
    return true;
  }

  /** 度で 与える とき用（太陽・月・惑星は 数が 少ないので こちら） */
  function projEq(ra, dec, useRefraction) {
    const hz = toHorizontal(ra, dec, lst, lat);
    const alt = useRefraction === false ? hz.alt : hz.alt + refraction(hz.alt);
    const ca = Math.cos(alt * D2R);
    const cam = camFromHorizontal(ca * Math.sin(hz.az * D2R), ca * Math.cos(hz.az * D2R),
      Math.sin(alt * D2R));
    return cam ? { ...cam, alt, az: hz.az } : null;
  }
  // 地平座標（東,北,上）から 直接 カメラへ
  const ca0 = Math.cos(altC * D2R), sa0 = Math.sin(altC * D2R);
  const cz0 = Math.cos(azC * D2R), sz0 = Math.sin(azC * D2R);
  const fH = [ca0 * sz0, ca0 * cz0, sa0];
  const rH = [cz0, -sz0, 0];
  const uH = [
    rH[1] * fH[2] - rH[2] * fH[1],
    rH[2] * fH[0] - rH[0] * fH[2],
    rH[0] * fH[1] - rH[1] * fH[0],
  ];
  function camFromHorizontal(e, n, u) {
    const Z = fH[0] * e + fH[1] * n + fH[2] * u;
    if (Z < -0.35) return null;
    const X = rH[0] * e + rH[1] * n + rH[2] * u;
    const Y = uH[0] * e + uH[1] * n + uH[2] * u;
    const k = (2 / (1 + Z)) * scale;
    return { x: cx + X * k, y: cy - Y * k, z: Z };
  }
  function projAltAz(altDeg, azDeg) {
    const c = Math.cos(altDeg * D2R);
    return camFromHorizontal(c * Math.sin(azDeg * D2R), c * Math.cos(azDeg * D2R),
      Math.sin(altDeg * D2R));
  }

  // --- 空の 地 ---------------------------------------------------------------
  const hp = projAltAz(0, azC);
  const horizonY = hp ? hp.y : h;
  const g = ctx.createLinearGradient(0, Math.min(horizonY, h) - h, 0, Math.min(horizonY, h));
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.hor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // --- 天の川 ---------------------------------------------------------------
  if (showMilkyWay && night > 0.3) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (ctx.filter !== undefined) ctx.filter = "blur(9px)";
    // ぼかしは 塗るたびに 別の 層を 作るので 高くつく。
    // 階調ごとに 1 本の 経路へ まとめて、塗るのを 5 回だけに する。
    for (const m of pre.mw) {
      ctx.fillStyle = "rgba(146,166,214," + (0.034 * m.level * night).toFixed(4) + ")";
      ctx.beginPath();
      for (const ring of m.polys) {
        for (let i = 0; i < ring.length; i += 3) {
          projFar(ring[i], ring[i + 1], ring[i + 2]);
          if (i === 0) ctx.moveTo(out.x, out.y); else ctx.lineTo(out.x, out.y);
        }
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.restore();
  }

  // --- 星座線 ---------------------------------------------------------------
  if (showLines) {
    ctx.save();
    ctx.strokeStyle = "rgba(126,168,226," + (0.38 * night).toFixed(3) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const f of pre.lines) {
      for (const seg of f.s) {
        let px = 0, py = 0, has = false;
        for (let i = 0; i < seg.length; i += 3) {
          const ok = proj(seg[i], seg[i + 1], seg[i + 2]);
          if (ok && has) { ctx.moveTo(px, py); ctx.lineTo(out.x, out.y); }
          has = ok;
          if (ok) { px = out.x; py = out.y; }
        }
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- 星 -------------------------------------------------------------------
  // 8,400 個を 1 つずつ 塗ると、塗り色を 変える 回数が そのまま 時間に なる。
  // 色と こさを 段に まるめて 束ね、束ごとに 1 回だけ 塗る。
  const named = [];
  const picks = [];
  const sv = pre.sv;
  const buckets = new Map();
  const bright = [];
  for (let i = 0; i < STARS.length; i++) {
    const s = STARS[i];
    if (!proj(sv[i * 3], sv[i * 3 + 1], sv[i * 3 + 2])) continue;
    const x = out.x, y = out.y;
    if (x < -30 || x > w + 30 || y < -30 || y > h + 30) continue;
    const alt = Math.asin(Math.max(-1, Math.min(1, out.up))) / D2R;
    if (alt < -0.4) continue;
    const mag = s[2];
    const ext = Math.max(0, Math.min(1, (alt + 1) / 12));
    const rel = Math.max(0, (6.6 - Math.min(6.6, mag)) / 6.6);
    const rad = (0.32 + 3.15 * Math.pow(rel, 2.6)) * zoom;
    const alpha = Math.min(1, (0.18 + 0.95 * Math.pow(rel, 1.4)) * night * (0.40 + 0.60 * ext));
    if (alpha < 0.02) continue;
    const col = starColor(s[3]);
    if (mag < 2.0) bright.push({ x, y, rad, alpha, col, mag });
    const key = col[0] * 65536 + col[1] * 256 + col[2] + 16777216 * Math.round(alpha * 14);
    let b = buckets.get(key);
    if (!b) { b = { col, alpha: Math.round(alpha * 14) / 14, pts: [] }; buckets.set(key, b); }
    b.pts.push(x, y, rad);
    if (s[4]) named.push({ x, y, text: s[4], rad, mag });
    if (mag <= 5.2) picks.push({ x, y, r: Math.max(rad, 9), kind: "star", i, alt });
  }
  for (const b of buckets.values()) {
    ctx.fillStyle = rgba(b.col, b.alpha);
    ctx.beginPath();
    for (let i = 0; i < b.pts.length; i += 3) {
      const x = b.pts[i], y = b.pts[i + 1], r = b.pts[i + 2];
      if (r < 0.95) ctx.rect(x - r, y - r, r * 2, r * 2);
      else { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
    }
    ctx.fill();
  }
  // ひときわ 明るい星だけ、にじみと 十字の すじを つける
  for (const b of bright) {
    const hr = b.rad * 4.2;
    const halo = ctx.createRadialGradient(b.x, b.y, b.rad * 0.7, b.x, b.y, hr);
    halo.addColorStop(0, rgba(b.col, 0.34 * b.alpha));
    halo.addColorStop(1, rgba(b.col, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(b.x, b.y, hr, 0, Math.PI * 2);
    ctx.fill();
    if (b.mag < 1.2) {
      const L = b.rad * 6.5;
      ctx.strokeStyle = rgba(b.col, 0.22 * b.alpha);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(b.x - L, b.y); ctx.lineTo(b.x + L, b.y);
      ctx.moveTo(b.x, b.y - L); ctx.lineTo(b.x, b.y + L);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(b.col, b.alpha);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 惑星・月・太陽 --------------------------------------------------------
  const moon = moonPosition(jde);
  const ph = moonPhase(jde);
  const marks = [];
  const TINT = {
    mercury: [216, 210, 200], venus: [255, 243, 207], mars: [255, 157, 110],
    jupiter: [255, 228, 176], saturn: [242, 221, 171], uranus: [191, 233, 239],
    neptune: [169, 196, 255],
  };
  for (const pl of planetPositions(jde)) {
    const p = projEq(pl.ra, pl.dec);
    if (!p || p.alt < -0.4) continue;
    const rad = Math.max(1.7, 4.4 - pl.mag * 0.75) * zoom;
    const col = TINT[pl.id];
    const halo = ctx.createRadialGradient(p.x, p.y, rad * 0.6, p.x, p.y, rad * 5);
    halo.addColorStop(0, rgba(col, 0.40 * night));
    halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(p.x, p.y, rad * 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(col, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    marks.push({ x: p.x, y: p.y, text: pl.ja, rad });
    picks.push({ x: p.x, y: p.y, r: Math.max(rad, 14), kind: "planet", body: pl, alt: p.alt });
  }
  {
    const p = projEq(moon.ra, moon.dec);
    if (p && p.alt > -1) {
      const rad = Math.max(8, (Math.min(w, h) / fov) * 0.52);
      const halo = ctx.createRadialGradient(p.x, p.y, rad, p.x, p.y, rad * 3.6);
      halo.addColorStop(0, "rgba(226,236,255," + (0.17 * night + 0.03).toFixed(3) + ")");
      halo.addColorStop(1, "rgba(226,236,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad * 3.6, 0, Math.PI * 2); ctx.fill();
      const sp = projEq(sun.ra, sun.dec, false);
      const angle = sp ? Math.atan2(sp.y - p.y, sp.x - p.x) : -Math.PI / 2;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(64,68,82,0.9)";
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f7f4ea";
      ctx.beginPath();
      ctx.arc(0, 0, rad, -Math.PI / 2, Math.PI / 2);
      const k = 1 - 2 * ph.illum;
      ctx.ellipse(0, 0, Math.abs(rad * k), rad, 0, Math.PI / 2, -Math.PI / 2, k > 0);
      ctx.fill();
      ctx.restore();
      marks.push({ x: p.x, y: p.y, text: "月", rad });
      picks.push({ x: p.x, y: p.y, r: Math.max(rad, 16), kind: "moon",
        body: { ...moon, illum: ph.illum, age: ph.age }, alt: p.alt });
    }
  }
  {
    const p = projEq(sun.ra, sun.dec);
    if (p && p.alt > -2) {
      const rad = Math.max(8, (Math.min(w, h) / fov) * 0.53);
      const halo = ctx.createRadialGradient(p.x, p.y, rad, p.x, p.y, rad * 9);
      halo.addColorStop(0, "rgba(255,238,180,0.7)");
      halo.addColorStop(1, "rgba(255,238,180,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad * 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff7dc";
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      marks.push({ x: p.x, y: p.y, text: "太陽", rad });
      picks.push({ x: p.x, y: p.y, r: Math.max(rad, 16), kind: "sun", body: sun, alt: p.alt });
    }
  }

  // --- 地面と 方位 -----------------------------------------------------------
  // 見上げる 向きだと 地平線は 画面の 上にも 回り込む。前を 向いて いる 点だけを
  // 使い、まっすぐ 前の 地平線が 画面に 入って いる ときだけ 地面を 描く。
  const pts = [];
  for (let a = 0; a <= 360; a += 1.5) {
    const p = projAltAz(0, a);
    if (p && p.z > 0.08) pts.push(p);
  }
  const groundVisible = hp !== null && hp.y > -200 && hp.y < h + 400 && pts.length > 3;
  if (groundVisible) {
    pts.sort((a, b) => a.x - b.x);
    // 街あかり: まっすぐ 前の 地平線の 高さを 基準に する
    const base = Math.max(-200, Math.min(h, hp.y));
    const glow = ctx.createLinearGradient(0, base - 130, 0, base + 4);
    glow.addColorStop(0, "rgba(70,92,130,0)");
    glow.addColorStop(1, "rgba(88,106,142,0.28)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, base - 130, w, 134);
    ctx.beginPath();
    ctx.moveTo(pts[0].x - 80, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[pts.length - 1].x + 80, pts[pts.length - 1].y);
    ctx.lineTo(w + 80, h + 80);
    ctx.lineTo(-80, h + 80);
    ctx.closePath();
    const ground = ctx.createLinearGradient(0, base, 0, h);
    ground.addColorStop(0, "rgba(17,22,32,0.98)");
    ground.addColorStop(1, "rgba(5,7,11,1)");
    ctx.fillStyle = ground;
    ctx.fill();
    ctx.strokeStyle = "rgba(148,176,220,0.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // --- 名前（重なる ものは 出さない。強い ものから 置く） ------------------------
  const place = makePlacer(ctx, w, h);
  ctx.save();
  for (const m of marks) {
    place(m.text, m.x + m.rad + 6, m.y + 4, "600 13px system-ui, sans-serif",
      "rgba(255,247,222,0.95)");
  }
  named.sort((a, b) => a.mag - b.mag);
  for (const l of named) {
    if (l.mag > 2.4) break;
    place(l.text, l.x + l.rad + 5, l.y + 4, "12px system-ui, sans-serif",
      "rgba(224,234,252," + (0.80 * night).toFixed(2) + ")");
  }
  if (showNames) {
    const order = pre.names.map((n, i) => ({ n, i, size: CONSTELLATION_LINES[i]
      ? CONSTELLATION_LINES[i].s.reduce((a, s) => a + s.length, 0) : 0 }))
      .sort((a, b) => b.size - a.size);
    for (const o of order) {
      const v = o.n.v;
      if (!proj(v[0], v[1], v[2])) continue;
      const alt = Math.asin(Math.max(-1, Math.min(1, out.up))) / D2R;
      if (alt < 4) continue;
      place(o.n.ja, out.x, out.y, "12px system-ui, sans-serif",
        "rgba(146,176,222," + (0.55 * night).toFixed(2) + ")", "center");
    }
  }
  ctx.save();
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(196,212,238,0.9)";
  const DIRS = [[0, "北"], [45, "北東"], [90, "東"], [135, "南東"],
    [180, "南"], [225, "南西"], [270, "西"], [315, "北西"]];
  for (const d of DIRS) {
    const p = projAltAz(0, d[0]);
    if (!p || p.z < 0.1) continue;
    // 画面の きわに 来た ときは 切れない ように 内へ 寄せる
    const half = ctx.measureText(d[1]).width / 2;
    ctx.fillText(d[1], Math.max(half + 6, Math.min(w - half - 6, p.x)), p.y + 20);
  }
  ctx.restore();
  ctx.restore();

  return { sunAlt: sunH.alt, moonIllum: ph.illum, lst, night, picks };
}

/** 星座の 略号 → 日本語の 名前 */
const CON_JA = new Map(CONSTELLATION_NAMES.map((n) => [n.c, n.ja]));

/**
 * 星 1 つの 説明。固有名／バイエル符号＋星座／等級を 組み立てる。
 * 名前の 無い 星でも 「はくちょう座の 4.2 等の 星」と 言えるように する。
 */
export function describeStar(i) {
  const s = STARS[i];
  const con = s[6] >= 0 ? CONSTELLATION_ABBR[s[6]] : null;
  const conJa = con ? CON_JA.get(con) : null;
  const greek = s[5] >= 0 ? BAYER_LETTERS[s[5]] : null;
  const title = s[4] || (greek && conJa ? conJa + " " + greek : conJa ? conJa + " の 星" : "星");
  const parts = [];
  if (s[4] && greek && conJa) parts.push(conJa + " " + greek);
  else if (s[4] && conJa) parts.push(conJa);
  parts.push(s[2].toFixed(2) + " 等");
  const k = Math.round(bvToKelvin(s[3]));
  parts.push("表面 およそ " + k.toLocaleString("ja-JP") + " 度");
  return { title, sub: parts.join(" ・ ") };
}
