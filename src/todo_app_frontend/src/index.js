import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { idlFactory, canisterId as localCanisterId } from "../../declarations/todo_app_backend";
import { LANGS, RTL, t, setLang, currentLang, detectLang, saveLang } from "./i18n";
import { initDrill, renderHome as renderDrillHome, renderKiroku, renderAward } from "./drill";
import { initShogi, renderShogi } from "./shogi";
import { initSky, renderSky, stopSky } from "./sky";

// --- 接続 -------------------------------------------------------------------

const network = process.env.DFX_NETWORK || (process.env.NODE_ENV === "production" ? "ic" : "local");
const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://ic0.app";
const canisterId = isLocal ? localCanisterId : process.env.CANISTER_ID_TODO_APP_BACKEND;

// フッターの小さなカウンターだけが問い合わせを使う。だれとして送るかは要らない
const agent = new HttpAgent({ host });
const backend = Actor.createActor(idlFactory, { agent, canisterId });

async function ensureAgentReady() {
  if (!isLocal) return;
  try {
    await agent.fetchRootKey();
  } catch (error) {
    console.error("ローカル replica の root key を取得できません", error);
  }
}

// --- 言語 -------------------------------------------------------------------

setLang(detectLang());

/** 見出しや 説明文を いまの ことばで 書き直す。動く 部分は route() が 描き直す */
function applyLang() {
  const lang = currentLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";

  document.querySelectorAll("[data-t]").forEach(el => {
    el.textContent = t(el.dataset.t);
  });
  document.querySelectorAll("[data-t-ph]").forEach(el => {
    el.placeholder = t(el.dataset.tPh);
  });
  document.querySelectorAll("[data-t-aria]").forEach(el => {
    el.setAttribute("aria-label", t(el.dataset.tAria));
  });

  // 検索や 共有に 出る ぶんも 合わせる
  setMeta('meta[name="description"]', t("c_metaDesc"));
  setMeta('meta[property="og:title"]', t("c_siteName"));
  setMeta('meta[property="og:description"]', t("c_ogDesc"));

  $("legacy-counter").title = t("counterNote");
}

function setMeta(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute("content", value);
}

function setupLangSelect() {
  const select = $("lang-select");
  select.innerHTML = LANGS.map(l => `<option value="${l.code}">${l.label}</option>`).join("");
  select.value = currentLang();
  select.addEventListener("change", () => {
    saveLang(setLang(select.value));
    applyLang();
    // いま 出ている 画面の 中身も 書き直す（動く 部分は data-t では 直らない）
    route();
  });
}

// --- 明るい / 暗い -----------------------------------------------------------

const THEME_KEY = "kimaru.theme";
const SIZE_KEY = "drill.size";
const SIZES = ["m", "l", "xl"];

/** 既定はライト。端末が暗い設定でも、選ばれるまでは明るいままにする */
const DEFAULT_THEME = "light";

function currentTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#1c1930" : "#fff8f3";
}

function setupTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch (error) {
    /* 保存できない環境では既定のライトのままにする */
  }
  applyTheme(stored === "dark" || stored === "light" ? stored : DEFAULT_THEME);

  $("theme-toggle").addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      /* 記憶できなくても切り替えは効く */
    }
  });
}

/**
 * もじの おおきさ。ふつう → 大きい → とても大きい の 3 段。
 * 端末の設定はそのままに、この場で選べるようにする（学校の共用端末でも使えるように）。
 */
function applySize(size) {
  document.documentElement.dataset.size = size;
}

function setupTextSize() {
  let stored = null;
  try {
    stored = localStorage.getItem(SIZE_KEY);
  } catch (error) {
    /* 保存できない環境でも その場の切り替えは効く */
  }
  applySize(SIZES.includes(stored) ? stored : SIZES[0]);

  $("size-toggle").addEventListener("click", () => {
    const now = document.documentElement.dataset.size || SIZES[0];
    const next = SIZES[(SIZES.indexOf(now) + 1) % SIZES.length];
    applySize(next);
    try {
      localStorage.setItem(SIZE_KEY, next);
    } catch (error) {
      /* 記憶できなくても 切り替えは効く */
    }
  });
}

// --- 小さな道具 -------------------------------------------------------------

const $ = id => document.getElementById(id);



function formatNumber(value) {
  return Number(value).toLocaleString(currentLang());
}




/** 同じ名前の回答は最新のものを現在の回答として扱う。過去の分は履歴に残る */

// --- 支援ページ -------------------------------------------------------------

/** このページを配信しているキャニスター。ローカルでも本番でも URL から分かる */
function frontendCanisterId() {
  const first = location.hostname.split(".")[0];
  return /-cai$/.test(first) ? first : "iqjbc-7aaaa-aaaaj-qnnsa-cai";
}

async function loadSupport() {
  $("backend-id").value = canisterId;
  $("frontend-id").value = frontendCanisterId();
  $("wallet-cmd").textContent = `dfx wallet --network ic send ${canisterId} 1000000000000`;
  await showFuel();
}

/** 兆（T）でまるめる。桁が大きすぎて そのままでは意味が取れないため */
function trillions(value) {
  return (Number(BigInt(value) / 1_000_000_000n) / 1000).toLocaleString(currentLang(), { maximumFractionDigits: 2 }) + " T";
}

/**
 * あと どれくらい 動かせるか。
 * データの置き場所とページの置き場所の うち、先に尽きるほうで見る。
 */
async function showFuel() {
  const main = $("fuel-main");
  const detail = $("fuel-detail");
  const fill = $("fuel-fill");
  try {
    const fuel = await backend.fuel();
    const pairs = [[fuel.dataCycles, fuel.dataPerDay]];
    if (fuel.pageCycles.length && fuel.pagePerDay.length) pairs.push([fuel.pageCycles[0], fuel.pagePerDay[0]]);

    const days = pairs
      .filter(([, perDay]) => Number(perDay) > 0)
      .map(([cycles, perDay]) => Number(cycles) / Number(perDay));
    if (!days.length) throw new Error("no burn rate");

    const shortest = Math.min(...days);
    const years = shortest / 365;
    main.textContent = years >= 1 ? t("fuelYears", years.toFixed(1)) : t("fuelMonths", Math.round(shortest / 30));

    const totalCycles = pairs.reduce((sum, [cycles]) => sum + Number(cycles), 0);
    const totalPerDay = pairs.reduce((sum, [, perDay]) => sum + Number(perDay), 0);
    // 1 日ぶんは小さすぎて 0 に丸まるので、1 年ぶんで見せる
    detail.textContent = t(
      "fuelDetail",
      trillions(BigInt(Math.round(totalCycles))),
      trillions(BigInt(Math.round(totalPerDay * 365)))
    );

    // 10 年ぶんを満タンとして、どれくらい入っているかを見せる
    fill.style.width = Math.max(2, Math.min(100, (years / 10) * 100)) + "%";
  } catch (error) {
    console.warn("fuel is unavailable", error);
    main.textContent = t("fuelUnknown");
    detail.textContent = "";
    fill.style.width = "0";
  }
}

// --- 前身のカウンター（フッターの小さいやつ） -------------------------------

async function setupLegacyCounter() {
  const button = $("legacy-counter");
  const output = $("legacy-count");
  try {
    output.textContent = formatNumber(await backend.getCount());
  } catch (error) {
    button.classList.add("is-hidden");
    return;
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.classList.add("is-lit");
    try {
      output.textContent = formatNumber(await backend.increment());
    } catch (error) {
      console.error(error);
    } finally {
      button.disabled = false;
      setTimeout(() => button.classList.remove("is-lit"), 900);
    }
  });
}

// --- 画面切り替え -----------------------------------------------------------

const VIEWS = ["view-pick", "view-drill", "view-quiz", "view-result", "view-kiroku", "view-award",
  "view-shogi", "view-sky", "view-support"];

const KIDS_VIEWS = ["view-pick", "view-drill", "view-quiz", "view-result", "view-kiroku", "view-award",
  "view-shogi", "view-sky"];

function showView(id) {
  // そらは 出て いない あいだ 描き つづけない（電池の ため）
  if (id !== "view-sky") stopSky();
  VIEWS.forEach(view => $(view).classList.toggle("is-hidden", view !== id));
  document.body.classList.toggle("on-drill", KIDS_VIEWS.indexOf(id) >= 0);
  window.scrollTo(0, 0);
}

async function route() {
  const hash = location.hash;

  if (hash === "#/kiroku") {
    showView("view-kiroku");
    renderKiroku();
    return;
  }

  if (hash === "#/shoujou") {
    showView("view-award");
    renderAward();
    return;
  }

  if (hash === "#/support") {
    showView("view-support");
    await loadSupport();
    return;
  }

  if (hash === "#/shogi") {
    showView("view-shogi");
    renderShogi();
    return;
  }

  if (hash === "#/sky") {
    showView("view-sky");
    renderSky();
    return;
  }

  if (hash === "#/drill") {
    showView("view-drill");
    renderDrillHome();
    return;
  }

  // それ以外は「なにを する？」の 画面
  showView("view-pick");
}

/**
 * いまと 同じ hash への リンクは、ブラウザが なにも しない（hashchange が 出ない）。
 * 画面の 中で 場面だけ 変えている ところ（問題・けっか）から トップへ もどる リンクが
 * それに あたるので、ここで じぶんから 呼びなおす。
 */
function setupSameHashLinks() {
  document.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#/"]');
    if (!link) return;
    if (link.getAttribute("href") === location.hash) route();
  });
}

async function init() {
  setupTheme();
  setupTextSize();
  setupLangSelect();
  applyLang();
  initDrill({ show: showView });
  initShogi({ show: showView });
  initSky();
  setupSameHashLinks();
  window.addEventListener("hashchange", route);

  // ドリルは通信が要らない。つながらなくても画面は出す
  // （問い合わせが要るのは フッターの小さなカウンターだけ）
  try {
    await ensureAgentReady();
  } catch (error) {
    console.warn("offline: the canister is unreachable", error);
  }

  document.body.dataset.ready = "1";
  await route();

  try {
    await setupLegacyCounter();
  } catch (error) {
    console.warn("offline: the counter is unavailable", error);
  }

  registerOffline();
}

/**
 * 電波が無くても開けるようにする。
 * ドリルは端末の中だけで動くので、いちど読めば通信は要らない。
 */
function registerOffline() {
  if (!("serviceWorker" in navigator)) return;
  const build = process.env.BUILD_ID || "0";
  navigator.serviceWorker.register("/sw.js?v=" + build).catch(error => {
    // 登録できなくても、通信できる間はふつうに使える
    console.warn("offline support is unavailable", error);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
