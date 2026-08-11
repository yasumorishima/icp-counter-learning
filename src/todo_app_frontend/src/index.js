import { Actor, HttpAgent } from "@icp-sdk/core/agent";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import { idlFactory, canisterId as localCanisterId } from "../../declarations/todo_app_backend";
import { LANGS, RTL, makeT, detectLang, saveLang, errorMessage } from "./i18n";

// --- 接続 -------------------------------------------------------------------

const network = process.env.DFX_NETWORK || (process.env.NODE_ENV === "production" ? "ic" : "local");
const isLocal = network === "local";
const host = isLocal ? "http://127.0.0.1:4943" : "https://ic0.app";
const canisterId = isLocal ? localCanisterId : process.env.CANISTER_ID_TODO_APP_BACKEND;

/**
 * ブラウザごとの鍵。ログインの代わりに使う。
 * 秘密鍵はこの端末の localStorage から出ない。主催者かどうかはこの鍵で決まる。
 */
const IDENTITY_KEY = "kimaru.identity.v1";

function loadIdentity() {
  try {
    const stored = localStorage.getItem(IDENTITY_KEY);
    if (stored) return Ed25519KeyIdentity.fromJSON(stored);
  } catch (error) {
    console.warn("保存された鍵を読めませんでした。作り直します", error);
  }
  const created = Ed25519KeyIdentity.generate();
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(created.toJSON()));
  } catch (error) {
    console.warn("鍵を保存できませんでした。このタブだけで有効な鍵を使います", error);
  }
  return created;
}

const identity = loadIdentity();
const agent = HttpAgent.createSync({ host, identity });
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

let lang = detectLang();
let t = makeT(lang);

function applyLang() {
  t = makeT(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";

  document.querySelectorAll("[data-t]").forEach(el => {
    el.textContent = t(el.dataset.t);
  });
  document.querySelectorAll("[data-t-ph]").forEach(el => {
    el.placeholder = t(el.dataset.tPh);
  });

  $("legacy-counter").title = t("counterNote");
  if (currentPoll) renderPoll(currentPoll);
}

function setupLangSelect() {
  const select = $("lang-select");
  select.innerHTML = LANGS.map(l => `<option value="${l.code}">${l.label}</option>`).join("");
  select.value = lang;
  select.addEventListener("change", () => {
    lang = select.value;
    saveLang(lang);
    applyLang();
  });
}

// --- 明るい / 暗い -----------------------------------------------------------

const THEME_KEY = "kimaru.theme";

function systemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme() {
  return document.documentElement.dataset.theme || systemTheme();
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
    /* 保存できない環境では端末の設定にまかせる */
  }
  if (stored === "dark" || stored === "light") applyTheme(stored);

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

// --- 小さな道具 -------------------------------------------------------------

const $ = id => document.getElementById(id);
const CHOICE_KEYS = ["yes", "maybe", "no"];
const MARKS = { yes: "○", maybe: "△", no: "×" };

const choiceKey = variant => Object.keys(variant)[0];
const toVariant = key => ({ [key]: null });
const nsToDate = ns => new Date(Number(BigInt(ns) / 1000000n));

function formatDateTime(ns) {
  return nsToDate(ns).toLocaleString(lang, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatNumber(value) {
  return Number(value).toLocaleString(lang);
}

function setStatus(el, message, kind) {
  el.textContent = message || "";
  el.classList.remove("is-ok", "is-error");
  if (kind) el.classList.add(kind);
}

function setBusy(button, busy, busyKey, idleKey) {
  const label = button.querySelector(".cta-label");
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  if (label) label.textContent = t(busy ? busyKey : idleKey);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/** 同じ名前の回答は最新のものを現在の回答として扱う。過去の分は履歴に残る */
function latestByName(entries) {
  const map = new Map();
  entries.forEach((entry, index) => {
    const previous = map.get(entry.name);
    map.set(entry.name, {
      entry,
      index,
      revisions: previous ? previous.revisions + 1 : 1,
      // 最初に使われた端末と違う端末から書き換えられていたら印を付ける
      moved: previous ? previous.moved || previous.firstTag !== entry.tag : false,
      firstTag: previous ? previous.firstTag : entry.tag,
    });
  });
  return [...map.values()].sort((a, b) => a.index - b.index);
}

// --- 作成画面 ---------------------------------------------------------------

const OPTION_LIMIT = 20;

function optionRow() {
  const row = document.createElement("div");
  row.className = "option-row";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "option-input";
  input.maxLength = 60;
  input.placeholder = t("optionPh");
  input.dataset.tPh = "optionPh";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn-icon";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "remove");
  remove.addEventListener("click", () => {
    const container = $("f-options");
    if (container.children.length > 1) row.remove();
    else input.value = "";
    syncAddButton();
  });
  row.append(input, remove);
  return row;
}

function syncAddButton() {
  $("add-option").disabled = $("f-options").children.length >= OPTION_LIMIT;
}

function setupCreateForm() {
  const container = $("f-options");
  [0, 1, 2].forEach(() => container.appendChild(optionRow()));
  syncAddButton();

  $("add-option").addEventListener("click", () => {
    container.appendChild(optionRow());
    syncAddButton();
    container.lastElementChild.querySelector("input").focus();
  });

  $("create-form").addEventListener("submit", async event => {
    event.preventDefault();
    const status = $("create-status");
    const title = $("f-title").value.trim();
    const note = $("f-note").value.trim();
    const options = [...container.querySelectorAll(".option-input")]
      .map(input => input.value.trim())
      .filter(Boolean);

    if (!title) return setStatus(status, errorMessage("e_title_required", lang), "is-error");
    if (options.length === 0) return setStatus(status, errorMessage("e_option_required", lang), "is-error");

    const deadlineValue = $("f-deadline").value;
    const deadline = deadlineValue ? [BigInt(new Date(deadlineValue).getTime()) * 1000000n] : [];

    setBusy($("create-button"), true, "creating", "createBtn");
    setStatus(status, t("writing"));
    try {
      const result = await backend.createPoll({
        title,
        note,
        options,
        deadline,
        lockNames: $("f-lock").checked,
      });
      if ("err" in result) {
        setStatus(status, errorMessage(result.err, lang), "is-error");
        return;
      }
      setStatus(status, "");
      location.hash = `#/p/${result.ok}`;
    } catch (error) {
      console.error(error);
      setStatus(status, errorMessage("network", lang), "is-error");
    } finally {
      setBusy($("create-button"), false, "creating", "createBtn");
    }
  });
}

// --- 調整ページ -------------------------------------------------------------

let currentPoll = null;

function renderTally(poll) {
  const rows = latestByName(poll.entries);
  const totals = poll.options.map(() => ({ yes: 0, maybe: 0, no: 0 }));
  rows.forEach(({ entry }) => {
    entry.choices.forEach((choice, i) => {
      if (totals[i]) totals[i][choiceKey(choice)] += 1;
    });
  });

  const best = totals.reduce(
    (acc, total, i) => {
      const score = total.yes * 2 + total.maybe;
      return score > acc.score ? { score, index: i } : acc;
    },
    { score: -1, index: -1 }
  );
  const hasAnswers = rows.length > 0;

  $("tally-head").innerHTML = `<tr><th class="col-name">${escapeHtml(t("name"))}</th>${poll.options
    .map((option, i) => `<th${hasAnswers && i === best.index ? ' class="is-best"' : ""}>${escapeHtml(option)}</th>`)
    .join("")}<th class="col-comment">${escapeHtml(t("comment"))}</th></tr>`;

  $("tally-body").innerHTML = rows
    .map(({ entry, revisions, moved }) => {
      const cells = entry.choices
        .map(choice => {
          const key = choiceKey(choice);
          return `<td class="mark mark-${key}">${MARKS[key] || "?"}</td>`;
        })
        .join("");
      const badges =
        (revisions > 1 ? `<span class="revision">${escapeHtml(t("changed", revisions - 1))}</span>` : "") +
        (moved ? `<span class="revision revision-alert" title="${escapeHtml(t("otherDevice"))}">!</span>` : "");
      return `<tr><th class="col-name">${escapeHtml(entry.name)}${badges}</th>${cells}<td class="col-comment">${escapeHtml(entry.comment)}</td></tr>`;
    })
    .join("");

  $("tally-foot").innerHTML = hasAnswers
    ? `<tr><th class="col-name">${escapeHtml(t("total"))}</th>${totals
        .map(
          (total, i) =>
            `<td${i === best.index ? ' class="is-best"' : ""}><b>${total.yes}</b><small> △${total.maybe} ×${total.no}</small></td>`
        )
        .join("")}<td></td></tr>`
    : "";

  $("tally-empty").classList.toggle("is-hidden", hasAnswers);
  $("tally-table").classList.toggle("is-hidden", !hasAnswers);
}

function renderAnswerForm(poll) {
  $("a-options").innerHTML = poll.options
    .map(
      (option, i) => `
      <div class="answer-row">
        <span class="answer-label">${escapeHtml(option)}</span>
        <div class="segmented" role="radiogroup" aria-label="${escapeHtml(option)}">
          ${CHOICE_KEYS.map(
            (key, j) => `
            <label class="seg seg-${key}">
              <input type="radio" name="opt-${i}" value="${key}"${j === 0 ? " checked" : ""}>
              <span aria-hidden="true">${MARKS[key]}</span><span class="seg-text">${escapeHtml(t(key))}</span>
            </label>`
          ).join("")}
        </div>
      </div>`
    )
    .join("");

  $("answer-form").classList.toggle("is-hidden", poll.closed);
  $("my-tag").textContent = t("yourDevice", poll.myTag);
}

function renderMeta(poll) {
  const items = [t("createdAt", formatDateTime(poll.createdAt))];
  if (poll.deadline.length) items.push(t("deadlineAt", formatDateTime(poll.deadline[0])));
  items.push(t("respondents", formatNumber(latestByName(poll.entries).length)));

  $("poll-meta").innerHTML =
    `<span class="pill ${poll.closed ? "pill-closed" : "pill-open"}">${escapeHtml(t(poll.closed ? "closed" : "open"))}</span>` +
    items.map(text => `<span class="meta-item">${escapeHtml(text)}</span>`).join("");
}

function renderHistory(poll) {
  $("history-list").innerHTML = poll.entries.length
    ? poll.entries
        .map(
          entry => `<li><time>${escapeHtml(formatDateTime(entry.at))}</time>
            <b>${escapeHtml(entry.name)}</b>
            <span class="device-tag">${escapeHtml(entry.tag)}</span>
            <span class="history-marks">${entry.choices
              .map(choice => {
                const key = choiceKey(choice);
                return `<i class="mark-${key}">${MARKS[key] || "?"}</i>`;
              })
              .join("")}</span>
            ${entry.comment ? `<span class="history-comment">${escapeHtml(entry.comment)}</span>` : ""}</li>`
        )
        .join("")
    : `<li>${escapeHtml(t("historyEmpty"))}</li>`;
}

function renderOwnerTools(poll) {
  $("owner-tools").classList.toggle("is-hidden", !poll.isOwner);
  if (!poll.isOwner) return;
  $("toggle-close").textContent = t(poll.closed ? "reopenPoll" : "closePoll");
}

function renderPoll(poll) {
  currentPoll = poll;
  $("poll-title").textContent = poll.title;
  $("poll-note").textContent = poll.note;
  $("poll-note").classList.toggle("is-hidden", !poll.note);
  $("share-url").value = location.href;
  renderMeta(poll);
  renderTally(poll);
  renderAnswerForm(poll);
  renderHistory(poll);
  renderOwnerTools(poll);
}

async function loadPoll(id) {
  const found = await backend.getPoll(id);
  if (!found.length) {
    showView("view-missing");
    return null;
  }
  showView("view-poll");
  renderPoll(found[0]);
  return found[0];
}

async function copyToClipboard(input, button, doneKey) {
  try {
    await navigator.clipboard.writeText(input.value);
    button.textContent = t(doneKey);
    setTimeout(() => (button.textContent = t("copy")), 1600);
  } catch (error) {
    input.select();
  }
}

function setupPollPage() {
  $("answer-form").addEventListener("submit", async event => {
    event.preventDefault();
    const status = $("answer-status");
    const name = $("a-name").value.trim();
    const comment = $("a-comment").value.trim();
    if (!name) return setStatus(status, errorMessage("e_name_required", lang), "is-error");

    const choices = currentPoll.options.map((_, i) => {
      const picked = document.querySelector(`input[name="opt-${i}"]:checked`);
      return toVariant(picked ? picked.value : "no");
    });

    setBusy($("answer-button"), true, "sending", "submit");
    setStatus(status, t("writing"));
    try {
      const result = await backend.submitAnswer(currentPoll.id, name, comment, choices);
      if ("err" in result) {
        setStatus(status, errorMessage(result.err, lang), "is-error");
        return;
      }
      await loadPoll(currentPoll.id);
      setStatus(status, t("sent"), "is-ok");
      $("a-comment").value = "";
    } catch (error) {
      console.error(error);
      setStatus(status, errorMessage("network", lang), "is-error");
    } finally {
      setBusy($("answer-button"), false, "sending", "submit");
    }
  });

  $("copy-url").addEventListener("click", () => copyToClipboard($("share-url"), $("copy-url"), "copied"));
  $("copy-backend").addEventListener("click", () => copyToClipboard($("backend-id"), $("copy-backend"), "copied"));

  $("toggle-close").addEventListener("click", async () => {
    const status = $("owner-status");
    setStatus(status, t("writing"));
    try {
      const result = await backend.setClosed(currentPoll.id, !currentPoll.closed);
      if ("err" in result) return setStatus(status, errorMessage(result.err, lang), "is-error");
      await loadPoll(currentPoll.id);
      setStatus(status, "");
    } catch (error) {
      console.error(error);
      setStatus(status, errorMessage("network", lang), "is-error");
    }
  });

  $("delete-poll").addEventListener("click", async () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    const status = $("owner-status");
    setStatus(status, t("writing"));
    try {
      const result = await backend.deletePoll(currentPoll.id);
      if ("err" in result) return setStatus(status, errorMessage(result.err, lang), "is-error");
      location.hash = "#/";
    } catch (error) {
      console.error(error);
      setStatus(status, errorMessage("network", lang), "is-error");
    }
  });
}

// --- 支援ページ -------------------------------------------------------------

/** cycles は桁が大きいので T（兆）単位に丸めて見せる */
function formatCycles(value) {
  const trillions = Number(BigInt(value) / 1_000_000_000n) / 1000;
  return `${trillions.toLocaleString(lang, { maximumFractionDigits: 3 })} T`;
}

async function loadSupport() {
  $("backend-id").value = canisterId;
  $("wallet-cmd").textContent = `dfx wallet --network ic send ${canisterId} 1000000000000`;
  try {
    const health = await backend.health();
    $("m-cycles").textContent = formatCycles(health.cycles);
    $("m-polls").textContent = formatNumber(health.polls);
    $("m-entries").textContent = formatNumber(health.entries);
    $("legacy-count").textContent = formatNumber(health.legacyCount);
  } catch (error) {
    console.error(error);
    $("m-cycles").textContent = "—";
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

const VIEWS = ["view-home", "view-poll", "view-support", "view-missing"];

function showView(id) {
  VIEWS.forEach(view => $(view).classList.toggle("is-hidden", view !== id));
  window.scrollTo(0, 0);
}

async function route() {
  const hash = location.hash;
  if (hash === "#/support") {
    currentPoll = null;
    showView("view-support");
    await loadSupport();
    return;
  }

  const match = hash.match(/^#\/p\/([a-z0-9]+)$/);
  if (!match) {
    currentPoll = null;
    showView("view-home");
    return;
  }

  try {
    await loadPoll(match[1]);
  } catch (error) {
    console.error(error);
    showView("view-missing");
  }
}

async function init() {
  setupTheme();
  setupLangSelect();
  applyLang();
  setupCreateForm();
  setupPollPage();
  window.addEventListener("hashchange", route);
  await ensureAgentReady();
  document.body.dataset.ready = "1";
  await route();
  setupLegacyCounter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
