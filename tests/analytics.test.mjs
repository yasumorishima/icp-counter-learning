/**
 * アクセス解析（src/analytics.js）の 検算。
 *
 * 本番の ホスト名は CI の E2E では 再現できない（E2E は ローカルの レプリカ）。
 * そこで「どの ホストで 動くか」「hash を どの パスに するか」を ここで 直接 見る。
 */
import assert from "node:assert/strict";

let failed = 0;
const check = (name, fn) => {
  try { fn(); console.log("PASS  " + name); }
  catch (error) { failed += 1; console.log("FAIL  " + name + "  — " + error.message); }
};

// ブラウザの 最小限の 代役
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
};
const appended = [];
globalThis.document = {
  title: "t",
  head: { appendChild: el => appended.push(el) },
  createElement: () => ({}),
};
globalThis.window = globalThis;
globalThis.location = { hostname: "localhost", hash: "", origin: "http://localhost" };

const ga = await import("../src/todo_app_frontend/src/analytics.js");

check("the measurement id is empty or a GA4 id", () =>
  assert.match(ga.GA_MEASUREMENT_ID, /^(G-[A-Z0-9]{6,})?$/));

check("hash routes become plain paths", () => {
  assert.equal(ga.pathForHash(""), "/");
  assert.equal(ga.pathForHash("#/"), "/");
  assert.equal(ga.pathForHash("#/sky"), "/sky");
  assert.equal(ga.pathForHash("#/asobi/mogura"), "/asobi/mogura");
  assert.equal(ga.pathForHash("#/drill?x=1"), "/drill");
});

check("nothing loads on a non-production host", () => {
  ga.startAnalytics();
  assert.equal(appended.length, 0);
  assert.equal(typeof globalThis.gtag, "undefined");
});

check("opting out is stored and read back", () => {
  ga.setAnalyticsOptOut(true);
  assert.equal(ga.isAnalyticsOptedOut(), true);
  assert.equal(store.get("analytics-optout"), "true");
  ga.setAnalyticsOptOut(false);
  assert.equal(ga.isAnalyticsOptedOut(), false);
  assert.equal(store.has("analytics-optout"), false);
});

check("storage that throws does not break opting out", () => {
  const saved = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() { throw new Error("x"); } };
  try {
    assert.equal(ga.isAnalyticsOptedOut(), false);
    ga.setAnalyticsOptOut(true);
  } finally {
    globalThis.localStorage = saved;
    ga.setAnalyticsOptOut(false);
  }
});

// 本番の ホストでは、ID が 入って いれば gtag を 1 回だけ 読み、hash ごとに page_view を 送る
check("on production it loads once and sends one page_view per screen", () => {
  if (!ga.GA_MEASUREMENT_ID) return; // ID を 入れる 前は 何も 読まないのが 正しい
  location.hostname = "iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io";
  location.origin = "https://" + location.hostname;
  ga.startAnalytics();
  ga.startAnalytics();
  assert.equal(appended.length, 1);
  const cfg = window.dataLayer.find(a => a[0] === "config")[2];
  assert.equal(cfg.allow_google_signals, false);
  assert.equal(cfg.allow_ad_personalization_signals, false);
  assert.equal(cfg.cookie_domain, "none");
  assert.equal(cfg.send_page_view, false);
  assert.match(appended[0].src, new RegExp("id=" + ga.GA_MEASUREMENT_ID + "$"));
  const views = () => window.dataLayer.filter(a => a[0] === "event" && a[1] === "page_view");
  location.hash = "#/sky"; ga.trackPage(); ga.trackPage();
  location.hash = "#/drill"; ga.trackPage();
  assert.deepEqual(views().map(a => a[2].page_path), ["/sky", "/drill"]);
  assert.equal(views()[0][2].page_location, location.origin + "/sky");
  ga.setAnalyticsOptOut(true);
  location.hash = "#/shogi"; ga.trackPage();
  assert.equal(views().length, 2);
  assert.equal(window["ga-disable-" + ga.GA_MEASUREMENT_ID], true);
  ga.setAnalyticsOptOut(false);
});

check("stopping clears the _ga cookies and nothing else", () => {
  const jar = new Map([["_ga", "GA1.1.1"], ["_ga_ABC123", "GS1.1"], ["keep", "1"]]);
  const saved = globalThis.document;
  globalThis.document = {
    get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join("; "); },
    set cookie(line) { const name = line.split("=")[0]; if (/expires=Thu, 01 Jan 1970/.test(line)) jar.delete(name); },
  };
  try {
    ga.setAnalyticsOptOut(true);
    assert.deepEqual([...jar.keys()], ["keep"]);
  } finally {
    globalThis.document = saved;
    ga.setAnalyticsOptOut(false);
  }
});

console.log(failed ? `${failed} failed` : "analytics: all passed");
process.exit(failed ? 1 : 0);
