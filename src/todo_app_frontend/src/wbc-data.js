/**
 * WBC 2026 スカウティングの 目次の データ（おとな向けの 1 ページ・2026-11-02）。
 *
 * 大会中に Caffeine で 作った 目次ページ（wbc-2026-scouting-dashboard-zvg.caffeine.xyz）を
 * この サイトへ 移した もの。日程の 表は その ページの 表を そのまま 写した
 * （日本語・英語とも ブラウザで 出した sha256 と 一致を 確かめてから 書いた）。
 *
 * ダッシュボードの 本体は GitHub Pages（stlite＝ブラウザの 中で Streamlit を 動かす）に ある。
 * slug は その ページ名（大会中の Streamlit の サブドメイン wbc-<slug> と 同じ）。
 * batters / pitchers が false の ところは ダッシュボードが 無い（ブラジル・チェコは MLB 実績の
 * ある 選手が いない、チャイニーズ・タイペイと ニカラグアは 投手の データが 少ない）。
 *
 * 大会は 終わって いるので、日程は 写した まま 変えない。
 */

export const WBC_PAGES = "https://yasumorishima.github.io/wbc-scouting/";

export const WBC_POOLS = [
  {
    "id": "A",
    "venueJa": "サンフアン",
    "venueEn": "San Juan",
    "teams": [
      {
        "code": "PUR",
        "slug": "pr",
        "ja": "プエルトリコ",
        "en": "Puerto Rico",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "CUB",
        "slug": "cuba",
        "ja": "キューバ",
        "en": "Cuba",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "CAN",
        "slug": "can",
        "ja": "カナダ",
        "en": "Canada",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "PAN",
        "slug": "pan",
        "ja": "パナマ",
        "en": "Panama",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "COL",
        "slug": "col",
        "ja": "コロンビア",
        "en": "Colombia",
        "batters": true,
        "pitchers": true
      }
    ]
  },
  {
    "id": "B",
    "venueJa": "ヒューストン",
    "venueEn": "Houston",
    "teams": [
      {
        "code": "USA",
        "slug": "usa",
        "ja": "アメリカ",
        "en": "USA",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "MEX",
        "slug": "mex",
        "ja": "メキシコ",
        "en": "Mexico",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "ITA",
        "slug": "ita",
        "ja": "イタリア",
        "en": "Italy",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "GBR",
        "slug": "gb",
        "ja": "イギリス",
        "en": "Great Britain",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "BRA",
        "slug": "bra",
        "ja": "ブラジル",
        "en": "Brazil",
        "batters": false,
        "pitchers": false
      }
    ]
  },
  {
    "id": "C",
    "venueJa": "東京ドーム",
    "venueEn": "Tokyo Dome",
    "teams": [
      {
        "code": "JPN",
        "slug": "japan",
        "ja": "日本",
        "en": "Japan",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "KOR",
        "slug": "kor",
        "ja": "韓国",
        "en": "Korea",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "TPE",
        "slug": "twn",
        "ja": "チャイニーズ・タイペイ",
        "en": "Chinese Taipei",
        "batters": true,
        "pitchers": false
      },
      {
        "code": "AUS",
        "slug": "aus",
        "ja": "オーストラリア",
        "en": "Australia",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "CZE",
        "slug": "cze",
        "ja": "チェコ",
        "en": "Czechia",
        "batters": false,
        "pitchers": false
      }
    ]
  },
  {
    "id": "D",
    "venueJa": "マイアミ",
    "venueEn": "Miami",
    "teams": [
      {
        "code": "DOM",
        "slug": "dr",
        "ja": "ドミニカ共和国",
        "en": "Dominican Republic",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "VEN",
        "slug": "venezuela",
        "ja": "ベネズエラ",
        "en": "Venezuela",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "NED",
        "slug": "ned",
        "ja": "オランダ",
        "en": "Netherlands",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "ISR",
        "slug": "isr",
        "ja": "イスラエル",
        "en": "Israel",
        "batters": true,
        "pitchers": true
      },
      {
        "code": "NCA",
        "slug": "nic",
        "ja": "ニカラグア",
        "en": "Nicaragua",
        "batters": true,
        "pitchers": false
      }
    ]
  }
];

/** 準々決勝 日本 対 ベネズエラ の ページ */
export const WBC_QF_SLUG = "qf-jpn-ven";

/** 日程。[0] = 1次ラウンド、[1] = 決勝トーナメント。1 行目は 見出し */
export const WBC_SCHEDULE = {
  ja: [[["日付", "JST", "Pool A（サンフアン）", "Pool B（ヒューストン）", "Pool C（東京）", "Pool D（マイアミ）"], ["3/5(木)", "12:00", "", "", "台湾 vs オーストラリア", ""], ["", "19:00", "", "", "チェコ vs 韓国", ""], ["3/6(金)", "12:00", "", "", "オーストラリア vs チェコ", ""], ["", "19:00", "", "", "日本 vs 台湾", ""], ["3/7(土)", "1:00", "キューバ vs パナマ(3/6 12pm AST)", "", "", ""], ["", "2:00", "", "", "", "オランダ vs ベネズエラ(3/6 12pm ET)"], ["", "3:00", "", "メキシコ vs イギリス(3/6 12pm CT)", "", ""], ["", "8:00", "プエルトリコ vs コロンビア(3/6 7pm AST)", "", "", ""], ["", "9:00", "", "", "", "ニカラグア vs ドミニカ(3/6 7pm ET)"], ["", "10:00", "", "アメリカ vs ブラジル(3/6 7pm CT)", "", ""], ["", "12:00", "", "", "台湾 vs チェコ", ""], ["", "19:00", "", "", "韓国 vs 日本", ""], ["3/8(日)", "1:00", "コロンビア vs カナダ(3/7 12pm AST)", "", "", ""], ["", "2:00", "", "", "", "ニカラグア vs オランダ(3/7 12pm ET)"], ["", "3:00", "", "ブラジル vs イタリア(3/7 12pm CT)", "", ""], ["", "8:00", "パナマ vs プエルトリコ(3/7 7pm AST)", "", "", ""], ["", "9:00", "", "", "", "イスラエル vs ベネズエラ(3/7 7pm ET)"], ["", "10:00", "", "イギリス vs アメリカ(3/7 7pm CT)", "", ""], ["", "12:00", "", "", "台湾 vs 韓国", ""], ["", "19:00", "", "", "オーストラリア vs 日本", ""], ["3/9(月)", "1:00", "コロンビア vs キューバ(3/8 12pm AST)", "", "", "オランダ vs ドミニカ(3/8 12pm ET)"], ["", "2:00", "", "イギリス vs イタリア(3/8 12pm CT)", "", ""], ["", "8:00", "パナマ vs カナダ(3/8 7pm AST)", "", "", "ニカラグア vs イスラエル(3/8 7pm ET)"], ["", "9:00", "", "ブラジル vs メキシコ(3/8 7pm CT)", "", ""], ["", "19:00", "", "", "韓国 vs オーストラリア", ""], ["3/10(火)", "1:00", "コロンビア vs パナマ(3/9 12pm AST)", "", "", "ドミニカ vs イスラエル(3/9 12pm ET)"], ["", "2:00", "", "ブラジル vs イギリス(3/9 12pm CT)", "", ""], ["", "8:00", "キューバ vs プエルトリコ(3/9 7pm AST)", "", "", "ベネズエラ vs ニカラグア(3/9 7pm ET)"], ["", "9:00", "", "メキシコ vs アメリカ(3/9 7pm CT)", "", ""], ["", "19:00", "", "", "チェコ vs 日本", ""], ["3/11(水)", "8:00", "カナダ vs プエルトリコ(3/10 7pm AST)", "", "", "イスラエル vs オランダ(3/10 7pm ET)"], ["", "10:00", "", "イタリア vs アメリカ(3/10 8pm CT)", "", ""], ["3/12(木)", "4:00", "カナダ vs キューバ(3/11 3pm AST)", "", "", ""], ["", "8:00", "", "イタリア vs メキシコ(3/11 6pm CT)", "", ""], ["", "9:00", "", "", "", "ドミニカ vs ベネズエラ(3/11 8pm ET)"]], [["日付（JST）", "JST", "ラウンド", "会場", "現地時間"], ["3/14 (Sat)", "7:30", "準々決勝", "Houston", "3/13 5:30pm CT"], ["", "9:00", "準々決勝", "Miami", "3/13 8:00pm ET"], ["3/15 (Sun)", "4:00", "準々決勝", "Houston", "3/14 2:00pm CT"], ["", "10:00", "準々決勝", "Miami", "3/14 9:00pm ET"], ["3/16 (Mon)", "9:00", "準決勝", "Miami", "3/15 8:00pm ET"], ["3/17 (Tue)", "9:00", "準決勝", "Miami", "3/16 8:00pm ET"], ["3/18 (Wed)", "9:00", "決勝", "Miami", "3/17 8:00pm ET"]]],
  en: [[["Date", "JST", "Pool A (San Juan)", "Pool B (Houston)", "Pool C (Tokyo)", "Pool D (Miami)"], ["3/5(Thu)", "12:00", "", "", "Chinese Taipei vs Australia", ""], ["", "19:00", "", "", "Czechia vs Korea", ""], ["3/6(Fri)", "12:00", "", "", "Australia vs Czechia", ""], ["", "19:00", "", "", "Japan vs Chinese Taipei", ""], ["3/7(Sat)", "1:00", "Cuba vs Panama(3/6 12pm AST)", "", "", ""], ["", "2:00", "", "", "", "Netherlands vs Venezuela(3/6 12pm ET)"], ["", "3:00", "", "Mexico vs Great Britain(3/6 12pm CT)", "", ""], ["", "8:00", "Puerto Rico vs Colombia(3/6 7pm AST)", "", "", ""], ["", "9:00", "", "", "", "Nicaragua vs Dominican Republic(3/6 7pm ET)"], ["", "10:00", "", "USA vs Brazil(3/6 7pm CT)", "", ""], ["", "12:00", "", "", "Chinese Taipei vs Czechia", ""], ["", "19:00", "", "", "Korea vs Japan", ""], ["3/8(Sun)", "1:00", "Colombia vs Canada(3/7 12pm AST)", "", "", ""], ["", "2:00", "", "", "", "Nicaragua vs Netherlands(3/7 12pm ET)"], ["", "3:00", "", "Brazil vs Italy(3/7 12pm CT)", "", ""], ["", "8:00", "Panama vs Puerto Rico(3/7 7pm AST)", "", "", ""], ["", "9:00", "", "", "", "Israel vs Venezuela(3/7 7pm ET)"], ["", "10:00", "", "Great Britain vs USA(3/7 7pm CT)", "", ""], ["", "12:00", "", "", "Chinese Taipei vs Korea", ""], ["", "19:00", "", "", "Australia vs Japan", ""], ["3/9(Mon)", "1:00", "Colombia vs Cuba(3/8 12pm AST)", "", "", "Netherlands vs Dominican Republic(3/8 12pm ET)"], ["", "2:00", "", "Great Britain vs Italy(3/8 12pm CT)", "", ""], ["", "8:00", "Panama vs Canada(3/8 7pm AST)", "", "", "Nicaragua vs Israel(3/8 7pm ET)"], ["", "9:00", "", "Brazil vs Mexico(3/8 7pm CT)", "", ""], ["", "19:00", "", "", "Korea vs Australia", ""], ["3/10(Tue)", "1:00", "Colombia vs Panama(3/9 12pm AST)", "", "", "Dominican Republic vs Israel(3/9 12pm ET)"], ["", "2:00", "", "Brazil vs Great Britain(3/9 12pm CT)", "", ""], ["", "8:00", "Cuba vs Puerto Rico(3/9 7pm AST)", "", "", "Venezuela vs Nicaragua(3/9 7pm ET)"], ["", "9:00", "", "Mexico vs USA(3/9 7pm CT)", "", ""], ["", "19:00", "", "", "Czechia vs Japan", ""], ["3/11(Wed)", "8:00", "Canada vs Puerto Rico(3/10 7pm AST)", "", "", "Israel vs Netherlands(3/10 7pm ET)"], ["", "10:00", "", "Italy vs USA(3/10 8pm CT)", "", ""], ["3/12(Thu)", "4:00", "Canada vs Cuba(3/11 3pm AST)", "", "", ""], ["", "8:00", "", "Italy vs Mexico(3/11 6pm CT)", "", ""], ["", "9:00", "", "", "", "Dominican Republic vs Venezuela(3/11 8pm ET)"]], [["Date (JST)", "JST", "Round", "Venue", "Local Time"], ["3/14 (Sat)", "7:30", "Quarterfinal", "Houston", "3/13 5:30pm CT"], ["", "9:00", "Quarterfinal", "Miami", "3/13 8:00pm ET"], ["3/15 (Sun)", "4:00", "Quarterfinal", "Houston", "3/14 2:00pm CT"], ["", "10:00", "Quarterfinal", "Miami", "3/14 9:00pm ET"], ["3/16 (Mon)", "9:00", "Semifinal", "Miami", "3/15 8:00pm ET"], ["3/17 (Tue)", "9:00", "Semifinal", "Miami", "3/16 8:00pm ET"], ["3/18 (Wed)", "9:00", "Final", "Miami", "3/17 8:00pm ET"]]],
};
