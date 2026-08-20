/*!
 * 星の 固有名（英語）。綴りは IAU Working Group on Star Names (WGSN) の
 * IAU Catalog of Star Names (IAU-CSN) に そろえて ある。
 * https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt
 *
 * 84 個の うち 82 個は IAU-CSN（2022-04-04 版で 照合）に 載って いる 名前。
 * のこり 2 個 ＝ Men（α Lup）と Regor（γ Vel）は IAU が 名前を 決めて いない 星なので、
 * 星図で 広く つかわれて きた 名前を そのまま つかう
 *（同梱データの 日本語名「メン」「レゴル」と 同じ 星を 指す ため）。
 */
// 同梱の 星データ（sky-stars.mjs）は 固有名を 日本語でしか 持っていないので、
// ここで 英語の 名前に 結びつける。日本語名 → 英語名。
//
// 正しさは tests/sky-names.test.mjs で 実データと 突き合わせる
//（その 名前の 星の バイエル符号と 星座が 天文の 常識と 合うかを 1 つずつ 見る）。
export const STAR_NAME_EN = {
  "シリウス": "Sirius",
  "カノープス": "Canopus",
  "アークトゥルス": "Arcturus",
  "リギル・ケンタウルス": "Rigil Kentaurus",
  "ベガ": "Vega",
  "カペラ": "Capella",
  "リゲル": "Rigel",
  "プロキオン": "Procyon",
  "アケルナル": "Achernar",
  "ベテルギウス": "Betelgeuse",
  "ハダル": "Hadar",
  "アルタイル": "Altair",
  "アルデバラン": "Aldebaran",
  "アンタレス": "Antares",
  "スピカ": "Spica",
  "ポルックス": "Pollux",
  "フォーマルハウト": "Fomalhaut",
  "ミモザ": "Mimosa",
  "デネブ": "Deneb",
  "アクルックス": "Acrux",
  "レグルス": "Regulus",
  "アダーラ": "Adhara",
  "ガクルックス": "Gacrux",
  "シャウラ": "Shaula",
  "ベラトリックス": "Bellatrix",
  "エルナト": "Elnath",
  "ミアプラキドゥス": "Miaplacidus",
  "アルニラム": "Alnilam",
  "アルナイル": "Alnair",
  "アリオト": "Alioth",
  "レゴル": "Regor",  // IAU 名なし（γ Vel）
  "ドゥーベ": "Dubhe",
  "ウェズン": "Wezen",
  "カウス・アウストラリス": "Kaus Australis",
  "アヴィオール": "Avior",
  "アルカイド": "Alkaid",
  "メンカリナン": "Menkalinan",
  "アトリア": "Atria",
  "アルヘナ": "Alhena",
  "ピーコック": "Peacock",
  "ミルザム": "Mirzam",
  "カストル": "Castor",
  "アルファルド": "Alphard",
  "ハマル": "Hamal",
  "ポラリス（北極星）": "Polaris (the North Star)",
  "ヌンキ": "Nunki",
  "ディフダ": "Diphda",
  "アルニタク": "Alnitak",
  "アルフェラッツ": "Alpheratz",
  "ミラク": "Mirach",
  "サイフ": "Saiph",
  "コカブ": "Kochab",
  "ラスアルハゲ": "Rasalhague",
  "アルゴル": "Algol",
  "デネボラ": "Denebola",
  "サドル": "Sadr",
  "スハイル": "Suhail",
  "シェダル": "Schedar",
  "ミンタカ": "Mintaka",
  "アルフェッカ": "Alphecca",
  "エルタニン": "Eltanin",
  "カフ": "Caph",
  "ミザール": "Mizar",
  "メン": "Men",  // IAU 名なし（α Lup）
  "ジュバ": "Dschubba",
  "メラク": "Merak",
  "アンカ": "Ankaa",
  "エニフ": "Enif",
  "シェアト": "Scheat",
  "フェクダ": "Phecda",
  "アルデラミン": "Alderamin",
  "マルカブ": "Markab",
  "メンカル": "Menkar",
  "ゾスマ": "Zosma",
  "アルギエバ": "Algieba",
  "アクラブ": "Acrab",
  "ウヌクアルハイ": "Unukalhai",
  "イザール": "Izar",
  "タラゼド": "Tarazed",
  "アルビレオ": "Albireo",
  "メグレズ": "Megrez",
  "ラスアルゲティ": "Rasalgethi",
  "ポリマ": "Porrima",
  "トゥバン": "Thuban",
};

/**
 * 星の 固有名を いまの ことばで 返す。
 * 英語名を 用意していない 星は 日本語の ままにする（名前が 消えるより ましなので）。
 */
export function starProperName(name, lang) {
  if (!name) return null;
  if (lang === "ja") return name;
  return STAR_NAME_EN[name] || name;
}
