/**
 * そら（星空）の 画面の 文言。
 *
 * 画面の 骨組み（見出し・ボタン・「この 空に ついて」）は index.html 側なので
 * i18n-core に ある。ここは sky.js / sky-view.js が 描くときに 作る 文字だけ。
 *
 * 星の 固有名と 星座の 名前は データ（sky-stars.mjs / sky-figures.mjs）に
 * 日本語で 入って いる。そのまま 出すので ここには 無い。
 *
 * 日本語は こども向けなので、ひらがな 中心の やさしい 言い方に そろえる。
 * 英語も 同じ ねらいで、みじかく やさしい 語を えらぶ。
 */

export const skyEn = {
  // --- 見る 場所 ---
  sk_place_sapporo: "Sapporo",
  sk_place_sendai: "Sendai",
  sk_place_tokyo: "Tokyo",
  sk_place_yokohama: "Yokohama",
  sk_place_nagoya: "Nagoya",
  sk_place_osaka: "Osaka",
  sk_place_hiroshima: "Hiroshima",
  sk_place_fukuoka: "Fukuoka",
  sk_place_naha: "Naha",
  sk_place_ishigaki: "Ishigaki Island",
  sk_place_here: "Where I am",

  // --- 時間を 送る 速さ ---
  sk_speedStop: "Stop",
  sk_speedMin: "1 min",
  sk_speedHour: "1 hour",
  sk_speedDay: "1 day",

  // --- 方角（画面に 出るので みじかく） ---
  sk_dirN: "N",
  sk_dirNNE: "NNE",
  sk_dirNE: "NE",
  sk_dirENE: "ENE",
  sk_dirE: "E",
  sk_dirESE: "ESE",
  sk_dirSE: "SE",
  sk_dirSSE: "SSE",
  sk_dirS: "S",
  sk_dirSSW: "SSW",
  sk_dirSW: "SW",
  sk_dirWSW: "WSW",
  sk_dirW: "W",
  sk_dirWNW: "WNW",
  sk_dirNW: "NW",
  sk_dirNNW: "NNW",

  // --- 日づけと 時こく ---
  sk_wdSun: "Sun",
  sk_wdMon: "Mon",
  sk_wdTue: "Tue",
  sk_wdWed: "Wed",
  sk_wdThu: "Thu",
  sk_wdFri: "Fri",
  sk_wdSat: "Sat",
  // {0}年 {1}月 {2}日 {3}曜 {4}時 {5}分 {6}月(2けた) {7}日(2けた)
  sk_whenFmt: "{3}, {0}-{6}-{7} {4}:{5}",
  sk_whereLine: "{0} · looking {1}",
  // --- 見えない 人への 読み上げ（#sky-read） ---
  sk_readLook: "Looking {0} ({3} degrees), {1} degrees up, {2} degrees wide",
  sk_readNear: "Nearest the middle: {0}",
  sk_readNone: "Nothing bright near the middle",
  // {1} は 分の ぶん。0 分の ときは 空なので、あいだの 空白は 分の 側に つける
  sk_shiftPlus: "+{0} h{1}",
  sk_shiftMinus: "-{0} h{1}",
  sk_shiftMinPart: " {0} min",
  sk_pickedWhen: "The time you picked",

  // --- 月・太陽・惑星 ---
  sk_moon: "Moon",
  sk_sun: "Sun",
  sk_planet_mercury: "Mercury",
  sk_planet_venus: "Venus",
  sk_planet_mars: "Mars",
  sk_planet_jupiter: "Jupiter",
  sk_planet_saturn: "Saturn",
  sk_planet_uranus: "Uranus",
  sk_planet_neptune: "Neptune",

  // --- 押したときに 出る ふきだし ---
  sk_tipAlt: "{0} degrees above the horizon · {1}",
  sk_tipPlanet: "magnitude {0} · {1} AU (light takes {2} min)",
  sk_tipMoon: "{0}% of it is lit · {1} km away",
  sk_tipSun: "{0} million km · light takes {1} min",

  // --- 星 1 つの 説明 ---
  sk_starOnly: "Star",
  sk_starInCon: "A star in {0}",
  sk_mag: "magnitude {0}",
  sk_surfaceTemp: "surface about {0} degrees",
  sk_sep: " · ",

  // --- 現在地 ---
  sk_geoNo: "This device cannot find where you are.",
  sk_geoSearch: "Looking for where you are…",
  sk_geoAt: "{0} degrees N · {1} degrees E",
  sk_geoFail: "Could not find where you are, so here is the sky over the town you picked.",
};

export const skyJa = {
  // --- 見る 場所 ---
  sk_place_sapporo: "札幌",
  sk_place_sendai: "仙台",
  sk_place_tokyo: "東京",
  sk_place_yokohama: "横浜",
  sk_place_nagoya: "名古屋",
  sk_place_osaka: "大阪",
  sk_place_hiroshima: "広島",
  sk_place_fukuoka: "福岡",
  sk_place_naha: "那覇",
  sk_place_ishigaki: "石垣島",
  sk_place_here: "いまいる ところ",

  // --- 時間を 送る 速さ ---
  sk_speedStop: "とめる",
  sk_speedMin: "1分",
  sk_speedHour: "1時間",
  sk_speedDay: "1日",

  // --- 方角 ---
  sk_dirN: "北",
  sk_dirNNE: "北北東",
  sk_dirNE: "北東",
  sk_dirENE: "東北東",
  sk_dirE: "東",
  sk_dirESE: "東南東",
  sk_dirSE: "南東",
  sk_dirSSE: "南南東",
  sk_dirS: "南",
  sk_dirSSW: "南南西",
  sk_dirSW: "南西",
  sk_dirWSW: "西南西",
  sk_dirW: "西",
  sk_dirWNW: "西北西",
  sk_dirNW: "北西",
  sk_dirNNW: "北北西",

  // --- 日づけと 時こく ---
  sk_wdSun: "日",
  sk_wdMon: "月",
  sk_wdTue: "火",
  sk_wdWed: "水",
  sk_wdThu: "木",
  sk_wdFri: "金",
  sk_wdSat: "土",
  // {0}年 {1}月 {2}日 {3}曜 {4}時 {5}分 {6}月(2けた) {7}日(2けた)
  sk_whenFmt: "{0}年{1}月{2}日({3}) {4}:{5}",
  sk_whereLine: "{0}　{1}の 空",
  // --- 見えない 人への 読み上げ（#sky-read） ---
  sk_readLook: "{0}の 空（{3} 度）・高さ {1} 度・見える 広さ {2} 度",
  sk_readNear: "まんなかに ちかいのは {0}",
  sk_readNone: "まんなかの あたりには 明るい ものが ありません",
  sk_shiftPlus: "＋{0}時間{1}",
  sk_shiftMinus: "−{0}時間{1}",
  sk_shiftMinPart: "{0}分",
  sk_pickedWhen: "えらんだ 日時",

  // --- 月・太陽・惑星 ---
  sk_moon: "月",
  sk_sun: "太陽",
  sk_planet_mercury: "水星",
  sk_planet_venus: "金星",
  sk_planet_mars: "火星",
  sk_planet_jupiter: "木星",
  sk_planet_saturn: "土星",
  sk_planet_uranus: "天王星",
  sk_planet_neptune: "海王星",

  // --- 押したときに 出る ふきだし ---
  sk_tipAlt: "高さ {0} 度 ・ {1}",
  sk_tipPlanet: "{0} 等 ・ {1} 天文単位（光で {2} 分）",
  sk_tipMoon: "かがやいて いる ぶん {0}% ・ {1} km",
  sk_tipSun: "{0} 百万 km ・ 光で {1} 分",

  // --- 星 1 つの 説明 ---
  sk_starOnly: "星",
  sk_starInCon: "{0} の 星",
  sk_mag: "{0} 等",
  sk_surfaceTemp: "表面 およそ {0} 度",
  sk_sep: " ・ ",

  // --- 現在地 ---
  sk_geoNo: "この 端末では 現在地を 使えません。",
  sk_geoSearch: "現在地を さがして います…",
  sk_geoAt: "北緯 {0} 度 ・ 東経 {1} 度",
  sk_geoFail: "現在地を 使えなかったので、えらんだ 街の 空を 出します。",
};
