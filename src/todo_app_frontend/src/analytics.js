/**
 * アクセス解析（Google アナリティクス 4）。
 *
 * - 本番の ホスト名の ときだけ 動く。CI の E2E や ローカルでは 何も 読まない・何も 送らない
 * - オプトアウト方式（南高・ファニーズと 同じ）。支援ページの ボタンで 止められる。
 *   止めた ことは この 端末の localStorage にだけ のこる
 * - 画面は hash で 切りかわるので、page_view は じぶんで 送る。
 *   GA の 表では「#/sky」を「/sky」の ように ふつうの パスで 見せる
 * - 送るのは 見た 画面の 種類だけ。ドリルの 記録・なまえ・こたえは 送らない
 */

export const GA_MEASUREMENT_ID = "";

const PROD_HOSTS = [
  "iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io",
  "iqjbc-7aaaa-aaaaj-qnnsa-cai.ic0.app",
];

const OPTOUT_KEY = "analytics-optout";

export function isAnalyticsOptedOut() {
  try {
    return localStorage.getItem(OPTOUT_KEY) === "true";
  } catch (error) {
    return false;
  }
}

export function setAnalyticsOptOut(off) {
  try {
    if (off) localStorage.setItem(OPTOUT_KEY, "true");
    else localStorage.removeItem(OPTOUT_KEY);
  } catch (error) {
    // 保存できない 端末（プライベート など）でも、この ページの あいだは 従う
  }
  sessionOptOut = !!off;
  if (off) {
    // gtag の 公式の 止め方。読みこみ済みでも 以後は 送らない
    if (GA_MEASUREMENT_ID) window["ga-disable-" + GA_MEASUREMENT_ID] = true;
  } else {
    if (GA_MEASUREMENT_ID) window["ga-disable-" + GA_MEASUREMENT_ID] = false;
    startAnalytics();
    trackPage();
  }
}

let started = false;
let sessionOptOut = false;
let lastPath = null;

function enabled() {
  return !!GA_MEASUREMENT_ID
    && PROD_HOSTS.indexOf(location.hostname) >= 0
    && !sessionOptOut
    && !isAnalyticsOptedOut();
}

export function startAnalytics() {
  if (started || !enabled()) return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
  document.head.appendChild(script);
}

/** "#/asobi/mogura" → "/asobi/mogura"、トップは "/" */
export function pathForHash(hash) {
  const route = (hash || "").replace(/^#\/?/, "").split("?")[0];
  return "/" + route;
}

export function trackPage() {
  if (!started || !enabled()) return;
  const path = pathForHash(location.hash);
  if (path === lastPath) return;
  lastPath = path;
  window.gtag("event", "page_view", {
    page_location: location.origin + path,
    page_path: path,
    page_title: document.title,
  });
}
