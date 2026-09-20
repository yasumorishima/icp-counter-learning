/**
 * きせつ。端末の 時計の 月だけで 決める（通信は しない・記録も しない）。
 *
 * 決めるのは 3 つ:
 *   1. 色       … <html data-season> を 見て style.css が トークンを 差し替える
 *   2. 舞うもの … 花びら / しゃぼん玉 / 落ち葉 / 雪 を この場で 組み立てる
 *   3. 絵       … トップの 上に 出す きせつの 景色（decorative・読み上げには 渡さない）
 *
 * 絵は すべて 自前の SVG。絵文字は 端末に よって 豆腐に なるので 使わない
 * （そら・しょうぎ・あそび と 同じ 流儀）。innerHTML に 入れるのは
 * この ファイルの 中の 決め打ちの 文字列だけで、外から 来た 値は 通さない。
 */

export const SEASONS = ["spring", "summer", "autumn", "winter"];

/** 3〜5 = はる / 6〜8 = なつ / 9〜11 = あき / 12〜2 = ふゆ */
export function seasonOf(date) {
  const month = (date instanceof Date ? date : new Date()).getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/**
 * 同じ きせつなら 何度 組み立てても 同じ 並びに なるように、乱数を 使わず
 * 番号から 決める（しょうぎの 検査用の 一局と 同じ 流儀）。
 */
function jitter(index, salt) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

// --- 舞うもの ---------------------------------------------------------------

const PETAL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.4c4.2 3.7 6.6 7.7 6.6 11.4 0 3.4-1.9 6.2-4.4 8.3L12 18.5l-2.2 2.6C7.3 19 5.4 16.2 5.4 12.8 5.4 9.1 7.8 5.1 12 1.4Z" fill="#ffc3dd"/><path d="M12 4.6c2.6 2.6 4 5.4 4 8 0 2-.9 3.7-2.2 5.1L12 15.9Z" fill="#ffe0ee"/></svg>`;
const PETAL2 = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.4c4.2 3.7 6.6 7.7 6.6 11.4 0 3.4-1.9 6.2-4.4 8.3L12 18.5l-2.2 2.6C7.3 19 5.4 16.2 5.4 12.8 5.4 9.1 7.8 5.1 12 1.4Z" fill="#ffe9f2" stroke="#ffc3dd" stroke-width="0.8"/></svg>`;
const BUBBLE = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.2" fill="#e8f7ff" fill-opacity="0.45" stroke="#7fd0f5" stroke-width="1.5"/><circle cx="8.4" cy="8.2" r="2.7" fill="#ffffff" fill-opacity="0.9"/></svg>`;
const BUBBLE2 = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.4" fill="#fff6d8" fill-opacity="0.5" stroke="#f5c65e" stroke-width="1.4"/><circle cx="9" cy="9" r="2.2" fill="#ffffff" fill-opacity="0.9"/></svg>`;
/* もみじ。5 つの さきに しぼって 軸を つける（さきが 多いと 小さい ときに 星に 見える） */
const MOMIJI = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22.4v-4.8l-4.4 2 1.3-3.9-5 .8 2.7-3.4L2.4 11l3.8-2-2.5-3.2 4.6 1-.6-4.4L12 5.2l4.3-2.8-.6 4.4 4.6-1L17.8 9l3.8 2-4.2 1.5 2.7 3.4-5-.8 1.3 3.9-4.4-2Z" fill="#ec6f33"/><path d="M12 22.6v-6" stroke="#b8541f" stroke-width="1.2" stroke-linecap="round"/></svg>`;
/* ただの 葉っぱ。ひと目で 葉と 分かる かたちを 1 つ まぜる */
const HAPPA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3C10.5 3.6 4 8.4 4 15.2c0 2.4.9 4.4 2 5.8C8.6 15.4 13.6 8.2 21 3Z" fill="#e8973a"/><path d="M21 3C15.4 6.9 10.6 12.9 6 21" stroke="#b8651f" stroke-width="1.1" fill="none" stroke-linecap="round"/></svg>`;
/* ゆき。白は 明るい 画面で 消えるので 青みを のこす */
const YUKI = `<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#a9c9ef" stroke-width="1.9" stroke-linecap="round" fill="none"><path d="M12 2.2v19.6M3.5 7.1l17 9.8M20.5 7.1l-17 9.8"/><path d="m12 6.6-2.6-2.6M12 6.6l2.6-2.6M12 17.4l-2.6 2.6M12 17.4l2.6 2.6M6.9 11.1 3.4 10.2M17.1 12.9l3.5.9M17.1 11.1l3.5-.9M6.9 12.9l-3.5.9"/></g></svg>`;
const YUKI2 = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5.4" fill="#ffffff" stroke="#b7d3f2" stroke-width="1.4"/></svg>`;

const FLOAT = {
  spring: { art: [PETAL, PETAL, PETAL2], count: 16, rise: false },
  summer: { art: [BUBBLE, BUBBLE, BUBBLE2], count: 13, rise: true },
  autumn: { art: [MOMIJI, HAPPA, MOMIJI], count: 15, rise: false },
  winter: { art: [YUKI, YUKI2, YUKI2], count: 18, rise: false },
};

/**
 * 画面ぜんたいに 舞わせる。位置・大きさ・速さは 番号から 決めるので
 * 開きなおしても 同じ 並びに なる（見た目の 検査が ぶれない）。
 */
function buildFloat(season) {
  const layer = document.getElementById("season-float");
  if (!layer) return 0;
  const plan = FLOAT[season];
  const gap = 100 / plan.count;
  const bits = [];

  for (let i = 0; i < plan.count; i += 1) {
    // 端に 寄らないよう 等間隔に 置いてから すこしだけ ずらす
    const left = (gap * (i + 0.5) + (jitter(i, 1) * gap * 0.8 - gap * 0.4)).toFixed(2);
    const span = (10 + jitter(i, 2) * 9).toFixed(1);        // 落ちきるまでの 秒
    const delay = (-jitter(i, 3) * 18).toFixed(1);          // 開いた 時点で すでに 散っている
    const size = (0.62 + jitter(i, 4) * 0.72).toFixed(2);   // 大きさの ばらつき
    const sway = (7 + jitter(i, 5) * 16).toFixed(0);        // 横ゆれの はば
    const art = plan.art[i % plan.art.length];
    bits.push(
      `<span class="sn-bit" style="left:${left}%;--t:${span}s;--d:${delay}s;--s:${size};--sw:${sway}px">` +
      `<span class="sn-art">${art}</span></span>`
    );
  }

  layer.innerHTML = bits.join("");
  layer.dataset.rise = plan.rise ? "1" : "0";
  return plan.count;
}

// --- きせつの 景色（トップの 上） -------------------------------------------

/** ちょうちょ。translate() で 置いた ところが からだの まんなか */
const CHOU = `<path d="M0-5c-6-9-17-12-21-4-3 6 3 11 10 9 5-1 9-3 11-5Z" fill="currentColor"/>
<path d="M0-5c6-9 17-12 21-4 3 6-3 11-10 9-5-1-9-3-11-5Z" fill="currentColor"/>
<path d="M0-1c-5 8-13 11-17 5-2-5 3-9 8-8 4 1 7 2 9 3Z" fill="currentColor" fill-opacity="0.78"/>
<path d="M0-1c5 8 13 11 17 5 2-5-3-9-8-8-4 1-7 2-9 3Z" fill="currentColor" fill-opacity="0.78"/>
<ellipse cx="0" cy="-1" rx="1.7" ry="7.4" fill="#6c5a8a"/>
<path d="M-1-8l-4-5M1-8l4-5" stroke="#6c5a8a" stroke-width="1.1" stroke-linecap="round" fill="none"/>`;

/** チューリップ 1 本。x を もらって その場に 立てる */
const tulip = (x, color) => `<g>
<path d="M${x} 147v-17" stroke="#6fae74" stroke-width="3" stroke-linecap="round"/>
<path d="M${x} 141c-6 0-10-3-11-8 6 0 10 3 11 8Z" fill="#6fae74"/>
<path d="M${x - 7} 128c0-6 3-10 7-10s7 4 7 10c0 4-3 7-7 7s-7-3-7-7Z" fill="${color}"/>
<path d="M${x} 118v17" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.6"/></g>`;

/** すすき 1 本 */
const susuki = (x, h) => `<g transform="rotate(-9 ${x} 147)">
<path d="M${x} 147v-${h}" stroke="#c6a970" stroke-width="2.4" stroke-linecap="round"/>
<g stroke="#e0c08a" stroke-width="1.6" stroke-linecap="round" fill="none">
<path d="M${x} ${147 - h}v-16"/>
<path d="M${x} ${147 - h - 3}l-6-7M${x} ${147 - h - 3}l6-7M${x} ${147 - h - 8}l-5-7M${x} ${147 - h - 8}l5-7M${x} ${147 - h - 13}l-4-6M${x} ${147 - h - 13}l4-6"/>
</g></g>`;

/** もみの木 1 本 */
const momi = (x, y, w, color) => `<g>
<rect x="${x - 3.5}" y="${y - 8}" width="7" height="12" fill="#8f6440"/>
<path d="M${x} ${y - w * 2.1}l${w * 0.62} ${w * 0.78}h-${w * 1.24}z" fill="${color}"/>
<path d="M${x} ${y - w * 1.55}l${w * 0.8} ${w * 0.85}h-${w * 1.6}z" fill="${color}"/>
<path d="M${x} ${y - w * 0.95}l${w} ${w * 0.95}h-${w * 2}z" fill="${color}"/></g>`;

const SCENE = {
  spring: `
    <path d="M0 172V150Q140 110 300 126T600 114V172Z" fill="#cbead0"/>
    <path d="M0 172V150Q180 134 340 144T600 138V172Z" fill="#a9d9b0"/>
    <g class="sn-day"><circle cx="72" cy="38" r="21" fill="#ffd869"/></g>
    <g class="sn-night"><path d="M84 20a20 20 0 1 0 8 36 24 24 0 0 1-8-36Z" fill="#ffeaa8"/></g>
    <path d="M294 146l5-46h12l5 46z" fill="#b57e55"/>
    <g class="sn-breathe">
      <circle cx="270" cy="88" r="30" fill="#ffc6dd"/>
      <circle cx="332" cy="84" r="34" fill="#ffd9e9"/>
      <circle cx="303" cy="58" r="28" fill="#ffbdd8"/>
      <circle cx="244" cy="104" r="20" fill="#ffd3e5"/>
      <circle cx="360" cy="104" r="19" fill="#ffd3e5"/>
    </g>
    ${tulip(96, "#ef6f96")}${tulip(126, "#f6a23d")}${tulip(486, "#e7628b")}${tulip(516, "#c084fc")}
    <g class="sn-fly sn-fly-a" color="#f79cca" transform="translate(452 62)">${CHOU}</g>
    <g class="sn-fly sn-fly-b" color="#a9c0f7" transform="translate(150 84)">${CHOU}</g>`,

  summer: `
    <g class="sn-day">
      <g class="sn-spin" style="transform-origin:508px 40px" stroke="#ffc93c" stroke-width="5" stroke-linecap="round">
        <path d="M508 2v9M508 69v9M470 40h9M537 40h9M481 13l6 6M529 61l6 6M535 13l-6 6M487 61l-6 6"/>
      </g>
      <circle cx="508" cy="40" r="23" fill="#ffd257"/>
    </g>
    <g class="sn-night"><path d="M516 20a20 20 0 1 0 8 36 24 24 0 0 1-8-36Z" fill="#ffeaa8"/></g>
    <g class="sn-breathe" fill="#ffffff" fill-opacity="0.94">
      <circle cx="152" cy="64" r="26"/><circle cx="192" cy="52" r="34"/>
      <circle cx="234" cy="66" r="24"/><rect x="152" y="66" width="82" height="26" rx="13"/>
    </g>
    <g class="sn-boat">
      <path d="M92 118V82l26 36z" fill="#ffffff"/><path d="M88 118V92l-20 26z" fill="#ffd9a0"/>
      <path d="M62 118h64l-10 11H72z" fill="#e4744f"/>
    </g>
    <path class="sn-wave" d="M0 172v-54q50-14 100 0t100 0 100 0 100 0 100 0 100 0v54Z" fill="#8ad7f3"/>
    <path class="sn-wave sn-wave-b" d="M0 172v-42q50-12 100 0t100 0 100 0 100 0 100 0 100 0v42Z" fill="#54bfe6"/>`,

  autumn: `
    <path d="M0 172V150Q140 106 290 124T600 110V172Z" fill="#ecdcb2"/>
    <path d="M0 172V150Q180 132 340 144T600 136V172Z" fill="#d8c191"/>
    <g class="sn-day"><circle cx="82" cy="42" r="20" fill="#ffc45c"/></g>
    <g class="sn-night"><path d="M94 24a19 19 0 1 0 8 34 23 23 0 0 1-8-34Z" fill="#ffe9a2"/></g>
    <path d="M296 146l5-48h12l5 48z" fill="#8f6440"/>
    <g class="sn-breathe">
      <circle cx="272" cy="86" r="30" fill="#f08a3e"/>
      <circle cx="334" cy="82" r="33" fill="#e9702f"/>
      <circle cx="305" cy="56" r="27" fill="#f6a93f"/>
      <circle cx="246" cy="102" r="19" fill="#f6a93f"/>
      <circle cx="362" cy="100" r="18" fill="#e9702f"/>
    </g>
    <path d="M130 147l4-34h9l4 34z" fill="#9c7048"/>
    <g class="sn-breathe">
      <circle cx="122" cy="106" r="19" fill="#f4c33f"/>
      <circle cx="152" cy="110" r="15" fill="#efb62c"/>
      <circle cx="138" cy="90" r="16" fill="#f7d05c"/>
    </g>
    ${susuki(452, 34)}${susuki(474, 42)}${susuki(496, 30)}${susuki(518, 38)}`,

  winter: `
    <path d="M0 172V150Q140 116 300 128T600 118V172Z" fill="#f2f7ff"/>
    <path d="M0 172V150Q180 136 340 146T600 140V172Z" fill="#dee9fb"/>
    <g class="sn-day"><circle cx="520" cy="40" r="19" fill="#ffe9a8"/></g>
    <g class="sn-night"><path d="M530 22a19 19 0 1 0 8 34 23 23 0 0 1-8-34Z" fill="#fff4c8"/></g>
    ${momi(168, 140, 26, "#589a76")}${momi(230, 144, 18, "#4b8a68")}
    <g class="sn-breathe">
      <circle cx="400" cy="128" r="19" fill="#ffffff" stroke="#d6e4f8" stroke-width="1.5"/>
      <circle cx="400" cy="101" r="13.5" fill="#ffffff" stroke="#d6e4f8" stroke-width="1.5"/>
      <path d="M381 116l-15-9M419 116l15-9" stroke="#8f6440" stroke-width="3" stroke-linecap="round"/>
      <path d="M383 90h34l-3-6h-28z" fill="#5b6b9a"/><rect x="390" y="74" width="20" height="12" rx="3" fill="#5b6b9a"/>
      <circle cx="395" cy="99" r="2.2" fill="#3d3a55"/><circle cx="405" cy="99" r="2.2" fill="#3d3a55"/>
      <path d="M399 104h4l-2 6z" fill="#f0913c"/>
      <circle cx="400" cy="124" r="2" fill="#5b6b9a"/><circle cx="400" cy="133" r="2" fill="#5b6b9a"/>
    </g>`,
};

function buildScene(season) {
  const box = document.getElementById("season-scene");
  if (!box) return;
  box.innerHTML =
    `<svg class="sn-scene" viewBox="0 0 600 172" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${SCENE[season]}</svg>`;
}

// --- まとめて あてる ---------------------------------------------------------

let applied = null;

/**
 * きせつを 画面に あてる。日づけを 渡さなければ 端末の 時計を 見る。
 * 同じ きせつの あいだは 組み立て直さない（画面を 行き来しても ちらつかない）。
 */
export function applySeason(date) {
  const season = seasonOf(date);
  document.documentElement.dataset.season = season;
  if (applied !== season) {
    buildFloat(season);
    buildScene(season);
    applied = season;
  }
  return season;
}

/**
 * 端末の 上ぶち（ブラウザの 色）も きせつの 空に あわせる。
 * 色は CSS が 決めた --bg を そのまま 読むので、ここに 色を 書かない
 * ＝ 明るい / 暗い と きせつの 組み合わせが ずれようが ない。
 */
export function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return null;
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  if (bg) meta.content = bg;
  return bg || null;
}

/** 日が またいだ ときに 気づけるように（開きっぱなしの 端末で 春に なる） */
export function watchSeason() {
  const check = () => {
    if (seasonOf(new Date()) !== applied) {
      applySeason();
      syncThemeColor();
    }
  };
  // 1 時間ごと。タイマーは 1 本だけで、画面を 変えても 止めない
  setInterval(check, 60 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
}
