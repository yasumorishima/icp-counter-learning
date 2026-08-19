/**
 * そらの 計算の 検算: Meeus "Astronomical Algorithms" の 例題と つきあわせる。
 *
 *   node tests/sky-astro.test.mjs
 *
 * 例題は 本に 答えが 載って いる ものだけを 使う（自分の 実装を 自分で 採点しない ため）。
 *  ・例12.a  恒星時
 *  ・例21.b  歳差（J2000 から その日へ）
 *  ・例25.a  太陽の 見かけの 位置
 *  ・例47.a  月の 位置
 * あわせて、地平座標・大気差の きわを 幾何の 性質で 確かめる。
 */
import {
  gmstDeg, precessFromJ2000, sunPosition, moonPosition, moonPhase,
  toHorizontal, refraction, centuries, planetPositions, julianDay, jdTT, norm360,
} from "../src/todo_app_frontend/src/sky-astro.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};
const near = (name, got, want, tol, unit = "") =>
  check(name, Math.abs(got - want) <= tol,
    `ずれ ${(got - want).toExponential(3)}${unit}（許容 ${tol}${unit}）`);

// --- 例12.a 1987年4月10日 0h UT の グリニッジ平均恒星時 ---------------------
near("恒星時 例12.a", gmstDeg(2446895.5), 197.693195, 1e-5, "度");

// --- 例21.b 歳差 θ Persei を 2028年11月13.19日 へ ---------------------------
// 本の とおり 固有運動を 先に 足した 位置を 入れる。
{
  const T = (2462088.69 - 2451545.0) / 36525;
  const p = precessFromJ2000(41.054063, 49.227750, T);
  near("歳差 例21.b 赤経", p.ra, 41.547214, 2e-5, "度");
  near("歳差 例21.b 赤緯", p.dec, 49.348483, 2e-5, "度");
}
{
  const p = precessFromJ2000(123.456, -45.678, 0);
  check("歳差 T=0 では 動かない",
    Math.abs(p.ra - 123.456) < 1e-9 && Math.abs(p.dec + 45.678) < 1e-9);
}

// --- 例25.a 1992年10月13.0 TD の 太陽 --------------------------------------
{
  const s = sunPosition(2448908.5);
  near("太陽 例25.a 見かけの黄経", s.lambda, 199.90895, 1e-4, "度");
  // 25.a は 低精度の 級数。本の 答えは 0.99766（例25.b の VSOP87 は 0.99760775）
  near("太陽 例25.a 地心距離", s.distAU, 0.99766, 1e-5, "AU");
  near("太陽 例25.a 赤経", s.ra, 198.38083, 2e-4, "度");
  near("太陽 例25.a 赤緯", s.dec, -7.78507, 2e-4, "度");
}

// --- 例47.a 1992年4月12.0 TD の 月 -----------------------------------------
{
  const m = moonPosition(2448724.5);
  near("月 例47.a 黄経", m.lambda, 133.162655, 1e-4, "度");
  near("月 例47.a 黄緯", m.beta, -3.229126, 1e-4, "度");
  near("月 例47.a 距離", m.distKm, 368409.7, 0.5, "km");
}

// --- 地平座標の 幾何 --------------------------------------------------------
{
  // 北極（緯度90度）では 高度＝赤緯
  const h = toHorizontal(80, 23.5, 137, 90);
  near("北極では 高度＝赤緯", h.alt, 23.5, 1e-9, "度");
}
{
  // 子午線上（時角0）で 赤緯 < 緯度 なら 真南（方位180度）
  const h = toHorizontal(100, 10, 100, 35.44);
  near("子午線・南の 方位", h.az, 180, 1e-9, "度");
  near("子午線・南の 高度", h.alt, 90 - 35.44 + 10, 1e-9, "度");
}
{
  // 子午線上で 赤緯 > 緯度 なら 真北（方位0度）
  const h = toHorizontal(100, 70, 100, 35.44);
  near("子午線・北の 方位", norm360(h.az), 0, 1e-9, "度");
}
{
  // 使って いるのは Meeus 16.4（Saemundsson）＝真の 高度から 見かけの 高度を 出す 向き。
  // 地平線の 34分角は 逆向きの Bennett 式の 値なので、ここでは 突き合わせない。
  const r0 = refraction(0), r90 = refraction(90);
  check("大気差 真高度0で 約29分角", Math.abs(r0 * 60 - 29) < 1, `${(r0 * 60).toFixed(2)}分角`);
  check("大気差 天頂で ほぼ0", Math.abs(r90 * 60) < 0.05, `${(r90 * 60).toFixed(4)}分角`);
  // 真の 高度 -34分角の 天体は 見かけ ほぼ 地平線上に 来る（日の出入りの 定義と そろう）
  const trueAlt = -34 / 60;
  const apparent = trueAlt + refraction(trueAlt);
  check("真高度 -34分角は 見かけ 地平線", Math.abs(apparent) < 0.02, `${(apparent * 60).toFixed(2)}分角`);
}

// --- 月の 満ち欠け -----------------------------------------------------------
{
  // 2000年1月21日の 皆既月食（＝満月）ごろは 輝面比が 1 に 近い
  const jd = 2451564.9; // 2000-01-21 09:36 TD ころ
  const ph = moonPhase(jd);
  check("食の ころは 満月", ph.illum > 0.99, `輝面比 ${ph.illum.toFixed(4)}`);
}

// --- 惑星の 力学的な つじつま -------------------------------------------------
{
  const jde = 2451545.0;
  const ps = planetPositions(jde);
  const byId = Object.fromEntries(ps.map((p) => [p.id, p]));
  check("惑星は 7 つ", ps.length === 7, ps.map((p) => p.id).join(","));
  // 太陽からの 距離が 軌道長半径の まわりに 収まる（離心率ぶんの 幅）
  const bounds = {
    mercury: [0.307, 0.467], venus: [0.718, 0.729], mars: [1.381, 1.666],
    jupiter: [4.95, 5.46], saturn: [9.02, 10.06], uranus: [18.28, 20.10],
    neptune: [29.80, 30.33],
  };
  for (const [id, [lo, hi]] of Object.entries(bounds)) {
    const r = byId[id].rSun;
    check(`${byId[id].ja} の 太陽からの 距離`, r >= lo && r <= hi, `${r.toFixed(4)} AU`);
  }
  // 内惑星は 太陽からの 離角に 上限が ある
  const sun = sunPosition(jde);
  for (const id of ["mercury", "venus"]) {
    const p = byId[id];
    const el = Math.abs(((p.lambda - sun.lambda + 540) % 360) - 180);
    const lim = id === "mercury" ? 28.5 : 47.5;
    check(`${p.ja} の 離角は ${lim} 度いない`, el <= lim, `${el.toFixed(2)} 度`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
