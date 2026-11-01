/**
 * WBC 2026 スカウティングの 目次（#/wbc）の 文言。
 *
 * この 画面は おとな向け（野球の データ）なので、日本語は ふつうの 書き方に する
 * （こども向けの ひらがな 中心の 言い方には しない）。
 * 文言は 大会中に Caffeine で 作った 目次ページの ものを もとに、今の 状態
 * （GitHub Pages で 開く・キューバと オーストラリアの 投手も ある）に 合わせて 直した。
 */

export const wbcEn = {
  wb_title: "WBC 2026 Scouting Dashboard",
  wb_lede: "Scouting dashboards visualizing Statcast data for the World Baseball Classic teams",
  wb_sub:
    "Shows players with MLB experience (with an mlbam_id). Detailed player analysis built from Baseball Savant Statcast data.",
  wb_wait:
    "Dashboards open in a new tab. Python starts inside your browser, so the first load takes about 15–35 seconds (the quarterfinal page 1–2 minutes).",
  wb_schedule: "Schedule",
  wb_round1: "First Round",
  wb_tz: "※ Times are in JST. US venue games show local time in parentheses. San Juan: AST / Houston: CT / Miami: ET",
  wb_knockout: "Knockout Round",
  wb_batters: "Batters",
  wb_pitchers: "Pitchers",
  wb_noBatters: "No batter data",
  wb_noPitchers: "No pitcher data",
  wb_noData: "No data",
  wb_noMlb: "No MLB players",
  wb_qfTitle: "Quarterfinal",
  wb_qfName: "Japan vs Venezuela",
  wb_qfOpen: "Open",
  wb_qfSlow: "This page takes 1–2 minutes to load the first time.",
  wb_notes: "Notes",
  wb_note1: "Brazil / Czechia: no dashboards (all players are minor league only, with no MLB experience).",
  wb_note2: "Chinese Taipei / Nicaragua: no pitcher dashboards (too little MLB Statcast data for their pitchers).",
  wb_note3:
    "Roster information is based on Baseball America's announcement (February 2026). There may be omissions or errors in the player list.",
  wb_note4:
    "Data is from the MLB regular season (2024–2025) only and may differ from actual WBC performance. Please use it as one reference.",
  wb_credit: "Data: Baseball Savant Statcast (via pybaseball). Not affiliated with MLB or the WBC.",
  wb_source: "Dashboard source (GitHub)",
};

export const wbcJa = {
  wb_title: "WBC 2026 スカウティングダッシュボード",
  wb_lede: "World Baseball Classic 参加チームの Statcast データを可視化するスカウティングダッシュボード",
  wb_sub:
    "MLB で実績のある選手（mlbam_id あり）のデータを表示。Baseball Savant の Statcast データを活用した詳細な選手分析をご覧いただけます。",
  wb_wait:
    "ダッシュボードは新しいタブで開きます。ブラウザの中で Python を起動するため、最初の表示に 15〜35 秒ほどかかります（準々決勝は 1〜2 分）。",
  wb_schedule: "スケジュール",
  wb_round1: "1次ラウンド",
  wb_tz: "※ 時刻は日本時間（JST）。US会場の（）内は現地日時。San Juan: AST / Houston: CT / Miami: ET",
  wb_knockout: "決勝トーナメント",
  wb_batters: "打者データ",
  wb_pitchers: "投手データ",
  wb_noBatters: "打者データなし",
  wb_noPitchers: "投手データなし",
  wb_noData: "データなし",
  wb_noMlb: "MLB 実績選手なし",
  wb_qfTitle: "準々決勝",
  wb_qfName: "日本 vs ベネズエラ",
  wb_qfOpen: "開く",
  wb_qfSlow: "このページは最初の表示に 1〜2 分かかります。",
  wb_notes: "備考",
  wb_note1: "ブラジル・チェコ：MLB 実績選手なし（全員マイナーリーグ）のためダッシュボードなし。",
  wb_note2: "チャイニーズ・タイペイ・ニカラグア：投手の MLB Statcast データが少ないため投手ダッシュボードなし。",
  wb_note3:
    "ロスターの情報は Baseball America（2026年2月）の発表をもとにしています。選手の漏れや誤りがある可能性もあります。",
  wb_note4:
    "データは MLB レギュラーシーズン（2024〜2025）のみで、WBC での実際のパフォーマンスとは異なる場合があります。参考のひとつとして使っていただければ幸いです。",
  wb_credit: "データ：Baseball Savant の Statcast（pybaseball 経由）。MLB・WBC とは関係ありません。",
  wb_source: "ダッシュボードのソース（GitHub）",
};
