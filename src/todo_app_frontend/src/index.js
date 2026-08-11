import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory as counter_idl, canisterId as counter_canister_id } from "../../declarations/todo_app_backend";

// --- Actor 設定 ---
const network = process.env.DFX_NETWORK || (process.env.NODE_ENV === "production" ? "ic" : "local");
const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://ic0.app";
const canisterId = isLocal ? counter_canister_id : process.env.CANISTER_ID_TODO_APP_BACKEND;

const agent = new HttpAgent({ host });

if (isLocal) {
  agent.fetchRootKey().catch(err => {
    console.warn("Unable to fetch root key. Check local replica.");
    console.error(err);
  });
}

const counter = Actor.createActor(counter_idl, { agent, canisterId });

// --- 表示ヘルパー -----------------------------------------------------------

const prefersReducedMotion =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 現在表示している値（カウントアップ演出の始点に使う）
let displayedCount = 0;

// 実行中のカウントアップ演出の世代。新しい演出が始まったら古いループは自分で降りる
let animationId = 0;

/** 数字を from → to へ滑らかに増やす（古い演出は必ず打ち切る） */
function animateCount(el, from, to) {
  el.classList.remove("is-error");
  const myId = ++animationId;

  if (prefersReducedMotion || from === to) {
    el.textContent = to.toLocaleString();
    return;
  }

  const duration = Math.min(1100, 320 + Math.abs(to - from) * 6);
  const start = performance.now();

  const step = now => {
    if (myId !== animationId) return; // 新しい演出に追い越されたら書き込まない
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** 達成時の演出（波紋 + 浮き上がる +1 + 数字のポップ） */
function celebrate(countDisplay, countWrap) {
  if (prefersReducedMotion) return;

  countDisplay.classList.add("is-pop");
  setTimeout(() => countDisplay.classList.remove("is-pop"), 420);

  const pulse = document.createElement("div");
  pulse.className = "pulse";
  countWrap.appendChild(pulse);
  pulse.addEventListener("animationend", () => pulse.remove());

  const floater = document.createElement("span");
  floater.className = "floater";
  floater.textContent = "+1";
  countWrap.appendChild(floater);
  floater.addEventListener("animationend", () => floater.remove());
}

function setStatus(el, message, kind) {
  el.textContent = message;
  el.classList.remove("is-ok", "is-error");
  if (kind) el.classList.add(kind);
}

// --- 初期化 -----------------------------------------------------------------

function init() {
  const countDisplay = document.getElementById("count-display");
  const countWrap = countDisplay.parentElement;
  const countSr = document.getElementById("count-sr");
  const incrementButton = document.getElementById("increment-button");
  const statusLine = document.getElementById("status-line");
  const buttonLabel = incrementButton.querySelector(".cta-label");

  /** キャニスターから現在値を読み出して表示する */
  async function loadCount({ animateFrom } = {}) {
    countDisplay.setAttribute("aria-busy", "true");
    try {
      const currentCount = Number(await counter.getCount());
      const from = typeof animateFrom === "number" ? animateFrom : 0;
      animateCount(countDisplay, from, currentCount);
      // 読み上げは途中経過ではなく確定値だけを1回伝える
      countSr.textContent = `総達成数 ${currentCount.toLocaleString()}`;
      displayedCount = currentCount;
      return currentCount;
    } catch (error) {
      console.error("Failed to load count:", error);
      countDisplay.classList.add("is-error");
      countDisplay.textContent = "接続できません";
      setStatus(statusLine, "キャニスターに接続できませんでした。時間をおいて再読み込みしてください。", "is-error");
      throw error;
    } finally {
      countDisplay.setAttribute("aria-busy", "false");
    }
  }

  async function handleIncrementClick() {
    incrementButton.disabled = true;
    incrementButton.classList.add("is-busy");
    buttonLabel.textContent = "記録中…";
    setStatus(statusLine, "ブロックチェーンに書き込んでいます…");

    try {
      await counter.increment();
    } catch (error) {
      console.error("Failed to increment count:", error);
      setStatus(statusLine, "書き込みに失敗しました。もう一度お試しください。", "is-error");
      incrementButton.disabled = false;
      incrementButton.classList.remove("is-busy");
      buttonLabel.textContent = "達成した";
      return;
    }

    // ここまで来たら書き込みは成功している。以降の失敗で再クリックを促さない
    try {
      celebrate(countDisplay, countWrap);
      await loadCount({ animateFrom: displayedCount });
      setStatus(statusLine, "刻みました。もう誰にも消せません。", "is-ok");
    } catch (error) {
      console.error("Failed to reload count after increment:", error);
      setStatus(statusLine, "記録は成功しました。表示の更新にだけ失敗しています。", "is-ok");
    } finally {
      incrementButton.disabled = false;
      incrementButton.classList.remove("is-busy");
      buttonLabel.textContent = "達成した";
    }
  }

  incrementButton.addEventListener("click", handleIncrementClick);

  loadCount().catch(() => {
    /* 表示は loadCount 内で処理済み */
  });
}

// bundle は defer で注入されるが、読み込み順が変わっても動くようにしておく
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
