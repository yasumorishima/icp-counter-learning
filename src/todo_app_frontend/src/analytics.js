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
    clearGaCookies();
  } else {
    if (GA_MEASUREMENT_ID) window["ga-disable-" + GA_MEASUREMENT_ID] = false;
    startAnalytics();
    trackPage();
  }
}

/** 止めたら、GA が この ホストに 置いた Cookie（_ga / _ga_*）も 消す */
export function clearGaCookies() {
  if (typeof document === "undefined" || typeof document.cookie !== "string") return;
  document.cookie.split(";").forEach(part => {
    const name = part.split("=")[0].trim();
    if (name === "_ga" || name.indexOf("_ga_") === 0) {
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    }
  });
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
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    // 子どもも 使う サイトなので、Google の 広告・シグナルとは つなげない
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // Cookie は この ホストだけに 置く（ic0.app は 共有 ドメインで、
    // 省略すると 他の canister と 同じ 親ドメインに 付きうる。icp0.io は PSL に 載っている）
    cookie_domain: "none",
  });
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
