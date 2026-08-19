// そらの計算。外部ライブラリを使わない（電波が無くても動かすため）。
// 出典アルゴリズム: Jean Meeus, Astronomical Algorithms (2nd ed.)
//   第12章 恒星時 / 第21章 歳差 / 第22章 章動と黄道傾斜 / 第25章 太陽 / 第47章 月
// 惑星: JPL "Keplerian Elements for Approximate Positions of the Major Planets" (1800-2050)
// 検算は tests/sky-astro.test.mjs（Meeus の例題と突き合わせる）。

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

const sin = (d) => Math.sin(d * D2R);
const cos = (d) => Math.cos(d * D2R);
const tan = (d) => Math.tan(d * D2R);

/** 0〜360 に畳む */
export function norm360(x) {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}
/** -180〜180 に畳む */
export function norm180(x) {
  const r = norm360(x);
  return r > 180 ? r - 360 : r;
}

/** JavaScript の Date（UTC）→ ユリウス日 */
export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * ΔT（TT − UT）秒。Espenak & Meeus の多項式。
 * 2005〜2050 の式を採用（このサイトが対象にする年代）。
 */
export function deltaTSeconds(jd) {
  const year = 2000 + (jd - 2451545.0) / 365.25;
  const t = year - 2000;
  if (year >= 2005 && year < 2050) return 62.92 + 0.32217 * t + 0.005589 * t * t;
  if (year >= 1986 && year < 2005) {
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t
      + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  return -20 + 32 * ((year - 1820) / 100) ** 2;
}

/** 力学時のユリウス日 */
export function jdTT(jd) {
  return jd + deltaTSeconds(jd) / 86400;
}

/** J2000 からのユリウス世紀（力学時） */
export function centuries(jde) {
  return (jde - 2451545.0) / 36525;
}

/** グリニッジ平均恒星時（度）。Meeus 12.4（引数は UT の JD） */
export function gmstDeg(jd) {
  const T = (jd - 2451545.0) / 36525;
  const theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T - (T * T * T) / 38710000;
  return norm360(theta);
}

/** 章動と真の黄道傾斜（度）。Meeus 22 の主要項 */
export function nutation(T) {
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  const L = 280.4665 + 36000.7698 * T;
  const Lm = 218.3165 + 481267.8813 * T;
  const dpsi = (-17.20 * sin(omega) - 1.32 * sin(2 * L) - 0.23 * sin(2 * Lm)
    + 0.21 * sin(2 * omega)) / 3600;
  const deps = (9.20 * cos(omega) + 0.57 * cos(2 * L) + 0.10 * cos(2 * Lm)
    - 0.09 * cos(2 * omega)) / 3600;
  const U = T / 100;
  const eps0 = 23.43929111 - (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600
    - (1.55 * U * U) / 3600;
  return { dpsi, deps, eps0, eps: eps0 + deps };
}

/** 黄道座標（度）→ 赤道座標（度）。Meeus 13.3 */
export function eclipticToEquatorial(lambda, beta, eps) {
  const ra = Math.atan2(
    sin(lambda) * cos(eps) - tan(beta) * sin(eps),
    cos(lambda),
  ) * R2D;
  const dec = Math.asin(
    sin(beta) * cos(eps) + cos(beta) * sin(eps) * sin(lambda),
  ) * R2D;
  return { ra: norm360(ra), dec };
}

/**
 * J2000 の赤道座標を、その日の平均分点へ歳差で移す。Meeus 21.2 / 21.4（厳密回転）。
 * 星表は J2000 で持っているので、描くたびにこれを通す。
 */
export function precessFromJ2000(raDeg, decDeg, T) {
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600;
  const A = cos(decDeg) * sin(raDeg + zeta);
  const B = cos(theta) * cos(decDeg) * cos(raDeg + zeta) - sin(theta) * sin(decDeg);
  const C = sin(theta) * cos(decDeg) * cos(raDeg + zeta) + cos(theta) * sin(decDeg);
  return { ra: norm360(Math.atan2(A, B) * R2D + z), dec: Math.asin(C) * R2D };
}

/**
 * 赤道座標 → 地平座標。方位は北 0 度・東 90 度
 * （天文で使う南基準ではなく、画面の方位磁針と同じ向きにそろえる）。
 */
export function toHorizontal(raDeg, decDeg, lstDeg, latDeg) {
  const H = lstDeg - raDeg;
  const sinAlt = sin(latDeg) * sin(decDeg) + cos(latDeg) * cos(decDeg) * cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * R2D;
  const az = Math.atan2(
    -cos(decDeg) * sin(H),
    sin(decDeg) * cos(latDeg) - cos(decDeg) * sin(latDeg) * cos(H),
  ) * R2D;
  return { alt, az: norm360(az) };
}

/** 大気差（度）。Bennett の式。見かけの高度を上げる */
export function refraction(altDeg) {
  if (altDeg < -1) return 0;
  return 1.02 / tan(altDeg + 10.3 / (altDeg + 5.11)) / 60;
}

/** 地方恒星時（度） */
export function localSiderealDeg(jd, lonDeg) {
  return norm360(gmstDeg(jd) + lonDeg);
}

/** 太陽の位置（見かけの黄経・赤道座標）。Meeus 25（低精度＝0.01度） */
export function sunPosition(jde) {
  const T = centuries(jde);
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
    + (0.019993 - 0.000101 * T) * sin(2 * M)
    + 0.000289 * sin(3 * M);
  const trueLong = L0 + C;
  const v = M + C;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cos(v));
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * sin(omega);
  const { eps0 } = nutation(T);
  const eps = eps0 + 0.00256 * cos(omega);
  const eq = eclipticToEquatorial(lambda, 0, eps);
  return { ...eq, lambda: norm360(lambda), distAU: R, meanAnomaly: M };
}

// --- 月（Meeus 第47章・表47.A / 47.B 全項） -------------------------------
// 各行 [D, M, Mm, F, sumL係数, sumR係数]（Mm は月の平均近点角）
const MOON_LR = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968], [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733], [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0], [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824], [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403], [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751], [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950], [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0], [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0], [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616], [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117], [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0], [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423], [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571], [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0], [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0], [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0], [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165], [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0], [2, 0, -1, -2, 0, 8752],
];
// 各行 [D, M, Mm, F, sumB係数]
const MOON_B = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211], [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794], [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107], [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777], [4, 0, -2, 1, 671], [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596], [2, -1, 1, -1, 491], [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439], [2, 0, 2, 1, 422], [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366], [2, 1, 0, 1, -351], [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315], [2, -2, 0, -1, 302], [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229], [1, 1, 0, -1, 223], [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220], [2, 1, -1, -1, -220], [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181], [0, 1, 2, 1, -177], [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166], [1, 0, 1, -1, -164], [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119], [4, -1, 0, -1, 115], [2, -2, 0, 1, 107],
];

/** 月の位置。Meeus 47 */
export function moonPosition(jde) {
  const T = centuries(jde);
  const Lm = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T
    + (T * T * T) / 538841 - (T * T * T * T) / 65194000);
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T
    + (T * T * T) / 545868 - (T * T * T * T) / 113065000);
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T
    + (T * T * T) / 24490000);
  const Mm = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T
    + (T * T * T) / 69699 - (T * T * T * T) / 14712000);
  const F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T
    - (T * T * T) / 3526000 + (T * T * T * T) / 863310000);
  const A1 = norm360(119.75 + 131.849 * T);
  const A2 = norm360(53.09 + 479264.290 * T);
  const A3 = norm360(313.45 + 481266.484 * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  let sumL = 0, sumR = 0, sumB = 0;
  for (const [d, m, mm, f, cl, cr] of MOON_LR) {
    const arg = d * D + m * M + mm * Mm + f * F;
    const ecc = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sumL += cl * ecc * sin(arg);
    sumR += cr * ecc * cos(arg);
  }
  for (const [d, m, mm, f, cb] of MOON_B) {
    const arg = d * D + m * M + mm * Mm + f * F;
    const ecc = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sumB += cb * ecc * sin(arg);
  }
  sumL += 3958 * sin(A1) + 1962 * sin(Lm - F) + 318 * sin(A2);
  sumB += -2235 * sin(Lm) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F)
    + 127 * sin(Lm - Mm) - 115 * sin(Lm + Mm);

  const lambda = norm360(Lm + sumL / 1000000);
  const beta = sumB / 1000000;
  const distKm = 385000.56 + sumR / 1000;
  const { eps } = nutation(T);
  const eq = eclipticToEquatorial(lambda, beta, eps);
  return { ...eq, lambda, beta, distKm, sumL, sumB, sumR };
}

/** 月の輝面比。0=新月, 1=満月 */
export function moonPhase(jde) {
  const s = sunPosition(jde);
  const m = moonPosition(jde);
  const elong = Math.acos(
    Math.max(-1, Math.min(1, sin(s.dec) * sin(m.dec)
      + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra))),
  ) * R2D;
  const sunDistKm = s.distAU * 149597870.7;
  const phaseAngle = Math.atan2(
    sunDistKm * sin(elong),
    m.distKm - sunDistKm * cos(elong),
  ) * R2D;
  const illum = (1 + cos(phaseAngle)) / 2;
  const age = norm360(m.lambda - s.lambda);
  return { illum, phaseAngle, elongation: elong, age };
}

// --- 惑星（JPL 近似ケプラー要素 1800-2050） -------------------------------
// el = [a, e, I, L, 近日点黄経, 昇交点黄経] / dl = その 100 年あたりの変化
const PLANETS = [
  { id: "mercury", ja: "水星", v0: -0.36, phaseK: 0.038,
    el: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
    dl: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081] },
  { id: "venus", ja: "金星", v0: -4.29, phaseK: 0.0009,
    el: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
    dl: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418] },
  { id: "earth", ja: "地球", v0: 0, phaseK: 0,
    el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    dl: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0] },
  { id: "mars", ja: "火星", v0: -1.52, phaseK: 0.016,
    el: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    dl: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343] },
  { id: "jupiter", ja: "木星", v0: -9.25, phaseK: 0.005,
    el: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    dl: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106] },
  { id: "saturn", ja: "土星", v0: -8.88, phaseK: 0.044,
    el: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    dl: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794] },
  { id: "uranus", ja: "天王星", v0: -7.19, phaseK: 0.0,
    el: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
    dl: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589] },
  { id: "neptune", ja: "海王星", v0: -6.87, phaseK: 0.0,
    el: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    dl: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664] },
];

/** ケプラー方程式を解く（引数は度、戻りはラジアンの離心近点角） */
function solveKepler(Mdeg, e) {
  const Mr = norm180(Mdeg) * D2R;
  let E = Mr + e * Math.sin(Mr);
  for (let i = 0; i < 40; i++) {
    const dE = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-13) break;
  }
  return E;
}

/** 太陽中心・黄道直交座標（AU） */
function heliocentric(p, T) {
  const [a0, e0, I0, L0, w0, o0] = p.el;
  const [da, de, dI, dL, dw, dnode] = p.dl;
  const a = a0 + da * T, e = e0 + de * T;
  const I = I0 + dI * T, L = L0 + dL * T;
  const w = w0 + dw * T, node = o0 + dnode * T;
  const argPeri = w - node;
  const E = solveKepler(L - w, e);
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = cos(argPeri), sw = sin(argPeri);
  const cn = cos(node), sn = sin(node);
  const ci = cos(I), si = sin(I);
  const x = (cw * cn - sw * sn * ci) * xv + (-sw * cn - cw * sn * ci) * yv;
  const y = (cw * sn + sw * cn * ci) * xv + (-sw * sn + cw * cn * ci) * yv;
  const z = (sw * si) * xv + (cw * si) * yv;
  return { x, y, z };
}

/** 光が 1 AU を 進むのに かかる 日数 */
const LIGHT_DAYS_PER_AU = 0.005775518331;
/** J2000 の 平均黄道傾斜（度） */
const EPS_J2000 = 23.43929111;

/**
 * 惑星の 赤道座標（その日の 平均分点）と 明るさ。
 * JPL の 要素は J2000 の 黄道面が 基準なので、J2000 の 赤道座標に してから
 * 歳差で その日へ 移す（恒星と そろえる ため）。光行時間も 補正する。
 */
export function planetPositions(jde) {
  const T = centuries(jde);
  const earth = heliocentric(PLANETS.find((p) => p.id === "earth"), T);
  const rEarth = Math.hypot(earth.x, earth.y, earth.z);
  const out = [];
  for (const p of PLANETS) {
    if (p.id === "earth") continue;
    let h = heliocentric(p, T);
    let dist = Math.hypot(h.x - earth.x, h.y - earth.y, h.z - earth.z);
    for (let i = 0; i < 3; i++) {
      h = heliocentric(p, centuries(jde - dist * LIGHT_DAYS_PER_AU));
      dist = Math.hypot(h.x - earth.x, h.y - earth.y, h.z - earth.z);
    }
    const gx = h.x - earth.x, gy = h.y - earth.y, gz = h.z - earth.z;
    const lambda = norm360(Math.atan2(gy, gx) * R2D);
    const beta = Math.asin(gz / dist) * R2D;
    const eq2000 = eclipticToEquatorial(lambda, beta, EPS_J2000);
    const eq = precessFromJ2000(eq2000.ra, eq2000.dec, T);
    const rSun = Math.hypot(h.x, h.y, h.z);
    const cosPh = (rSun * rSun + dist * dist - rEarth * rEarth) / (2 * rSun * dist);
    const phase = Math.acos(Math.max(-1, Math.min(1, cosPh))) * R2D;
    const mag = p.v0 + 5 * Math.log10(rSun * dist) + p.phaseK * phase;
    out.push({
      id: p.id, ja: p.ja, ...eq,
      ra2000: eq2000.ra, dec2000: eq2000.dec,
      lambda, beta, dist, rSun, mag, phase,
    });
  }
  return out;
}
