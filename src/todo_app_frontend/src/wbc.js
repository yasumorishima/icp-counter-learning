/**
 * WBC 2026 スカウティングの 目次（#/wbc・おとな向けの 1 ページ・2026-11-02）。
 *
 * 大会中に Caffeine で 作った 目次ページを この サイトへ 移した もの（user 2026-11-01
 * 「Caffeine の 内容を 真似して、ICP の サイトで 似たような の 移植すれば いいのに」）。
 * ダッシュボードの 本体は GitHub Pages に あり、ここから 新しい タブで 開く。
 *
 * - こども向けの 画面では ないので 拡大は 止めない（index.js の ZOOM_FREE_VIEWS）
 * - 国旗の 絵文字は 使わない（端末に よって 豆腐に なる＝tests/no-emoji.test.mjs）。
 *   代わりに 国の 略号（JPN など）の 札を 出す
 * - 文言は i18n-wbc.js。国名と 日程は wbc-data.js（日程は 元の ページの 表の まま）
 */
import { t, currentLang } from "./i18n";
import { WBC_PAGES, WBC_POOLS, WBC_QF_SLUG, WBC_SCHEDULE } from "./wbc-data";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function dashLink(slug, label) {
  const link = el("a", "wbc-link", label);
  link.href = WBC_PAGES + slug + ".html";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function teamCard(team, lang) {
  const card = el("li", "wbc-team");
  const head = el("div", "wbc-team-head");
  head.append(el("span", "wbc-code", team.code), el("b", "wbc-name", lang === "ja" ? team.ja : team.en));
  card.append(head);

  const links = el("div", "wbc-links");
  if (!team.batters && !team.pitchers) {
    const none = el("p", "wbc-none");
    none.append(el("b", "", t("wb_noData")), el("span", "", t("wb_noMlb")));
    links.append(none);
  } else {
    links.append(team.batters ? dashLink(team.slug + "-batters", t("wb_batters")) : el("span", "wbc-none", t("wb_noBatters")));
    links.append(team.pitchers ? dashLink(team.slug + "-pitchers", t("wb_pitchers")) : el("span", "wbc-none", t("wb_noPitchers")));
  }
  card.append(links);
  return card;
}

/** 「キューバ vs パナマ(3/6 12pm AST)」の かっこ（現地時間）は 小さく 出す */
function cell(tag, text) {
  const node = el(tag);
  const local = text.match(/^(.*?)(\(.+\))$/);
  if (local) {
    node.append(local[1]);
    node.append(el("small", "wbc-local", local[2]));
  } else {
    node.textContent = text;
  }
  return node;
}

function scheduleTable(rows, labelKey) {
  // 横に 長い 表は この 箱の 中だけで 横に 動かす（ページ全体を はみ出させない）
  const box = el("div", "wbc-scroll");
  box.tabIndex = 0;
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", t(labelKey));
  const table = el("table", "wbc-table");
  const head = el("thead");
  const headRow = el("tr");
  rows[0].forEach(text => {
    const th = cell("th", text);
    th.scope = "col";
    headRow.append(th);
  });
  head.append(headRow);
  const body = el("tbody");
  rows.slice(1).forEach(row => {
    const tr = el("tr");
    if (row[0]) tr.className = "wbc-day";
    row.forEach((text, i) => tr.append(cell(i < 2 ? "th" : "td", text)));
    body.append(tr);
  });
  table.append(head, body);
  box.append(table);
  return box;
}

export function renderWbc() {
  const body = document.getElementById("wbc-body");
  if (!body) return;
  const lang = currentLang() === "ja" ? "ja" : "en";
  body.replaceChildren();

  // 日程（大会は 終わって いるので たたんで おく）
  const schedule = el("details", "wbc-sched");
  schedule.append(el("summary", "wbc-sched-sum", t("wb_schedule")));
  schedule.append(el("h3", "wbc-sub", t("wb_round1")));
  schedule.append(el("p", "wbc-small", t("wb_tz")));
  schedule.append(scheduleTable(WBC_SCHEDULE[lang][0], "wb_round1"));
  schedule.append(el("h3", "wbc-sub", t("wb_knockout")));
  schedule.append(scheduleTable(WBC_SCHEDULE[lang][1], "wb_knockout"));
  body.append(schedule);

  // プールごとの 国
  WBC_POOLS.forEach(pool => {
    const section = el("section", "wbc-pool");
    const title = el("h3", "wbc-pool-title");
    title.append(el("span", "", "Pool " + pool.id), el("small", "wbc-venue", lang === "ja" ? pool.venueJa : pool.venueEn));
    section.append(title);
    const list = el("ul", "wbc-grid");
    pool.teams.forEach(team => list.append(teamCard(team, lang)));
    section.append(list);
    body.append(section);
  });

  // 準々決勝 日本 対 ベネズエラ
  const qf = el("section", "wbc-pool");
  qf.append(el("h3", "wbc-pool-title", t("wb_qfTitle")));
  const qfList = el("ul", "wbc-grid");
  const qfCard = el("li", "wbc-team");
  const qfHead = el("div", "wbc-team-head");
  qfHead.append(el("span", "wbc-code", "QF"), el("b", "wbc-name", t("wb_qfName")));
  const qfLinks = el("div", "wbc-links");
  qfLinks.append(dashLink(WBC_QF_SLUG, t("wb_qfOpen")));
  qfCard.append(qfHead, qfLinks, el("p", "wbc-small", t("wb_qfSlow")));
  qfList.append(qfCard);
  qf.append(qfList);
  body.append(qf);

  // 備考
  const notes = el("section", "wbc-notes");
  notes.append(el("h3", "wbc-sub", t("wb_notes")));
  const list = el("ul", "wbc-note-list");
  ["wb_note1", "wb_note2", "wb_note3", "wb_note4"].forEach(key => list.append(el("li", "", t(key))));
  notes.append(list);
  const credit = el("p", "wbc-small", t("wb_credit") + " ");
  const source = el("a", "wbc-source", t("wb_source"));
  source.href = "https://github.com/yasumorishima/wbc-scouting";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  credit.append(source);
  notes.append(credit);
  body.append(notes);
}
