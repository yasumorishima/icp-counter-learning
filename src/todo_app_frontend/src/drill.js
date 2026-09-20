/**
 * ドリルの画面。問題は端末の中で作り、記録も端末の中だけに置く。
 * 文言は i18n-drill.js にある。
 */
import { GRADES, CATS, unitsOf, unitById, isCorrect, makeSet, makeDaily } from "./drill-data";
import * as records from "./records";
import { sounds, confetti, soundOn, toggleSound } from "./effects";
import { t, currentLang } from "./i18n";
import { say, stopSpeech, watchVoice } from "./voice";
import { FACE_IDS, faceSvg, faceKey, markSvg, migrateFace } from "./faces";

const $ = id => document.getElementById(id);
const FACES = FACE_IDS;
const CAT_KEY = "drill.cat";

/**
 * 文章題を 声で 読む しかけ。
 *
 * 文章題で つまずく 理由は、計算よりも **文が 読めない** ことの ほうが 多い。
 * 読むのは この サイトでは なく 端末の きのうなので、**声を 持たない 端末が ある**。
 * その ときは ボタンを 出さない（押しても 何も 起きない ボタンを 見せない）。
 */
let voiceReady = false;
let voiceWatch = null;
const QUESTIONS = 10;

let show = () => {};
let grade = 1;
// 計算（けいさん）か 文章題（ぶんしょうだい）か。えらんだ ものは 端末に のこす
let cat = "calc";
let session = null;
let typed = "";
let panelMode = "";
let combo = 0;
let timer = null;

/**
 * チャレンジの 名まえは 端末に のこる。
 * あとから ことばを 変えても 追いつくように、のこすのは 辞書の かぎ。
 * 前に 日本語の 文字列で のこした ぶんは、t() が そのまま 返すので これまで通り 出る。
 */
function challengeName(name) {
  return t(String(name));
}

export function initDrill(options) {
  show = options.show;

  $("face-row").innerHTML = FACES.map(
    (face, i) => '<button type="button" class="face' + (i === 0 ? " is-on" : "") + '" data-face="' + face + '" aria-label="' + escapeText(t(faceKey(face))) + '">' + faceSvg(face) + "</button>"
  ).join("");
  $("face-row").addEventListener("click", event => {
    const button = event.target.closest(".face");
    if (!button) return;
    document.querySelectorAll(".face").forEach(f => f.classList.toggle("is-on", f === button));
  });

  $("who-add").addEventListener("click", () => {
    const name = $("who-input").value.trim();
    if (!name) return;
    const chosen = document.querySelector(".face.is-on");
    records.addProfile(name, chosen ? chosen.dataset.face : FACES[0], grade);
    $("who-input").value = "";
    renderHome();
  });

  $("who-open").addEventListener("click", () => {
    panelMode = panelMode ? "" : "list";
    renderWhoPanel();
  });

  $("who-panel").addEventListener("click", event => {
    const pick = event.target.closest("[data-pick]");
    if (pick) {
      records.selectProfile(pick.dataset.pick);
      panelMode = "";
      renderHome();
      return;
    }
    const act = event.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "edit" || act.dataset.act === "add") {
      panelMode = act.dataset.act;
      renderWhoPanel();
      return;
    }
    if (act.dataset.act === "save") {
      const name = $("who-edit-name").value.trim();
      if (!name) return;
      const chosen = $("who-panel").querySelector(".face.is-on");
      const face = chosen ? chosen.dataset.face : FACES[0];
      const current = records.currentProfile();
      if (panelMode === "add") records.addProfile(name, face, grade);
      else if (current) records.updateProfile(current.id, name, face);
      panelMode = "";
      renderHome();
      return;
    }
    if (act.dataset.act === "close") {
      panelMode = "";
      renderWhoPanel();
    }
  });

  $("cat-tabs").addEventListener("click", event => {
    const button = event.target.closest(".cat-tab");
    if (!button) return;
    cat = button.dataset.cat;
    try {
      localStorage.setItem(CAT_KEY, cat);
    } catch (error) {
      /* のこせない 端末でも その場の 切りかえは 効く */
    }
    renderHome();
  });

  $("grade-tabs").addEventListener("click", event => {
    const button = event.target.closest(".grade-tab");
    if (!button) return;
    grade = Number(button.dataset.grade);
    if (records.currentProfile()) records.setGrade(grade);
    renderHome();
  });

  $("unit-grid").addEventListener("click", event => {
    const variantButton = event.target.closest(".variant");
    if (variantButton) {
      startQuiz(variantButton.dataset.unit, variantButton.dataset.variant);
      return;
    }
    const card = event.target.closest(".unit-card");
    if (!card) return;
    const unit = unitById(card.dataset.unit);
    if (unit && unit.variants) {
      // 九九のように「どの段？」があるものは、その場で選べるように開く
      const open = card.parentElement.querySelector(".variants");
      if (open) {
        open.remove();
        return;
      }
      document.querySelectorAll(".variants").forEach(v => v.remove());
      const box = document.createElement("div");
      box.className = "variants";
      box.innerHTML = unit.variants
        .map(v => '<button type="button" class="variant" data-unit="' + unit.id + '" data-variant="' + v.key + '">' + v.name + "</button>")
        .join("");
      card.parentElement.appendChild(box);
      return;
    }
    startQuiz(card.dataset.unit);
  });

  $("weak-row").addEventListener("click", event => {
    const button = event.target.closest(".weak-card");
    if (button) startQuiz(button.dataset.unit);
  });

  $("daily-card").addEventListener("click", startDaily);
  $("time-card").addEventListener("click", startTimeAttack);

  $("sound-toggle").addEventListener("click", () => {
    const on = toggleSound();
    $("sound-mark").textContent = on ? "♪" : "×";
    if (on) sounds.tick();
  });
  $("sound-mark").textContent = soundOn() ? "♪" : "×";

  $("challenge-box").addEventListener("click", event => {
    const act = event.target.closest("[data-challenge]");
    if (!act) return;
    if (act.dataset.challenge === "summer") {
      const summer = summerSpan();
      if (!summer.open) return;
      records.startChallenge("dr_challengeSummer", summer.from, summer.to);
    } else if (act.dataset.challenge === "month") {
      const now = new Date();
      const from = todayKey(now);
      const end = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);
      records.startChallenge("dr_challengeMonth", from, todayKey(end));
    } else if (act.dataset.challenge === "award") {
      location.hash = "#/shoujou";
      return;
    } else if (act.dataset.challenge === "stop") {
      if (act.dataset.armed !== "1") {
        act.dataset.armed = "1";
        act.textContent = t("dr_reallyStop");
        return;
      }
      records.clearChallenge();
    }
    renderHome();
  });

  $("quiz-quit").addEventListener("click", () => {
    stopTimer();
    stopSpeech();
    session = null;
    // すでに #/drill に いる ときは hash を 入れても なにも 起きない（同じ値だと hashchange が 出ない）
    if (location.hash === "#/drill") {
      show("view-drill");
      renderHome();
    } else {
      location.hash = "#/drill";
    }
  });

  $("quiz-read").addEventListener("click", () => {
    const q = session && session.list[session.at];
    if (q) say(q.text);
  });

  voiceWatch = watchVoice(currentLang() === "ja" ? "ja" : "en", ok => {
    voiceReady = ok;
    applyReadButton();
  });

  $("quiz-keypad").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button) press(button.dataset.pad);
  });

  $("quiz-choices").addEventListener("click", event => {
    const button = event.target.closest("button");
    if (button) answer(button.dataset.value);
  });

  $("result-again").addEventListener("click", () => {
    if (session) startQuiz(session.unit.id, session.variant);
  });

  $("kiroku-people").addEventListener("click", event => {
    const use = event.target.closest("[data-use]");
    if (use) {
      records.selectProfile(use.dataset.use);
      renderKiroku();
      return;
    }
    const drop = event.target.closest("[data-drop]");
    if (drop) {
      if (drop.dataset.armed !== "1") {
        drop.dataset.armed = "1";
        drop.textContent = t("dr_reallyDelete");
        return;
      }
      records.removeProfile(drop.dataset.drop);
      renderKiroku();
    }
  });

  $("award-print").addEventListener("click", () => window.print());

  $("kiroku-export").addEventListener("click", exportRecords);
  $("kiroku-import").addEventListener("click", () => $("kiroku-file").click());
  $("kiroku-file").addEventListener("change", importRecords);

  document.addEventListener("keydown", event => {
    if ($("view-quiz").classList.contains("is-hidden")) return;
    if (event.key >= "0" && event.key <= "9") press(event.key);
    else if (event.key === "." || event.key === "/") press(event.key);
    else if (event.key === "Backspace") press("del");
    else if (event.key === "Enter") press("ok");
  });

  try {
    const saved = localStorage.getItem(CAT_KEY);
    if (CATS.some(c => c.id === saved)) cat = saved;
  } catch (error) {
    /* 読めない 端末では 計算から はじめる */
  }

  const profile = records.currentProfile();
  if (profile) grade = profile.grade;
}

export function renderHome() {
  const profile = records.currentProfile();
  $("who-empty").classList.toggle("is-hidden", Boolean(profile));
  $("drill-main").classList.toggle("is-hidden", !profile);

  if (profile) {
    $("who-face").innerHTML = faceSvg(profile.face);
    $("who-name").textContent = profile.name;
    $("who-stars").textContent = profile.stars;
    const days = records.streak();
    $("who-streak").textContent = days > 1 ? t("dr_streakDays", days) : t("dr_streakToday");
    grade = profile.grade || grade;
  }

  const weak = records.weakUnits(3).filter(w => w.last < 100);
  $("weak-row").innerHTML = weak.length
    ? '<p class="weak-title">' + t("dr_weakTitle") + "</p>" +
      weak
        .map(w => {
          const unit = unitById(w.id);
          if (!unit) return "";
          return '<button type="button" class="weak-card" data-unit="' + w.id + '">' + unit.name + '<span class="weak-score">' + t("dr_lastScore", w.last) + "</span></button>";
        })
        .filter(Boolean)
        .join("")
    : "";
  $("weak-row").classList.toggle("is-hidden", weak.length === 0);

  renderWhoPanel();
  renderChallenge();
  renderDaily();
  renderTimeCard();
  renderLevel();

  $("grade-tabs").innerHTML = GRADES.map(
    g => '<button type="button" class="grade-tab' + (g === grade ? " is-on" : "") + '" data-grade="' + g + '">' + t("dr_gradeTab", g) + "</button>"
  ).join("");

  $("cat-tabs").innerHTML = CATS.map(
    c => '<button type="button" class="cat-tab' + (c.id === cat ? " is-on" : "") + '" data-cat="' + c.id + '" aria-pressed="' + (c.id === cat) + '">' + c.name + "</button>"
  ).join("");

  $("unit-grid").innerHTML = unitsOf(grade, cat)
    .map(unit => {
      const stat = records.unitStat(unit.id);
      const badge = stat
        ? '<span class="unit-score">' + t("dr_lastScore", stat.last) + "</span>"
        : '<span class="unit-score is-new">' + t("dr_firstTime") + "</span>";
      const arrow = unit.variants ? '<span class="unit-more">' + t("dr_whichRow") + "</span>" : "";
      return (
        '<div class="unit-slot"><button type="button" class="unit-card" data-unit="' + unit.id + '">' +
        '<span class="unit-name">' + unit.name + "</span>" + badge + arrow +
        "</button></div>"
      );
    })
    .join("");
}

/** つかう人 の 切替 / なまえ変え / 追加。トップからすぐ出せるようにする */
function renderWhoPanel() {
  const panel = $("who-panel");
  panel.classList.toggle("is-hidden", !panelMode);
  if (!panelMode) {
    panel.innerHTML = "";
    return;
  }

  if (panelMode === "list") {
    const people = records.profiles();
    const current = records.currentProfile();
    panel.innerHTML =
      '<h2 class="panel-title">' + t("dr_whoTitle") + "</h2>" +
      people
        .map(p => {
          const on = current && current.id === p.id ? " is-on" : "";
          return '<button type="button" class="who-pick' + on + '" data-pick="' + p.id + '">' + '<span class="who-pick-face">' + faceSvg(p.face) + '</span>' + escapeText(p.name) + "</button>";
        })
        .join("") +
      '<div class="who-actions">' +
      '<button type="button" class="btn-ghost" data-act="edit">' + t("dr_whoRename") + "</button>" +
      '<button type="button" class="btn-ghost" data-act="add">' + t("dr_whoNew") + "</button>" +
      "</div>" +
      '<button type="button" class="btn-ghost" data-act="close">' + t("dr_close") + "</button>";
    return;
  }

  const current = records.currentProfile();
  const startName = panelMode === "edit" && current ? current.name : "";
  const startFace = migrateFace(panelMode === "edit" && current ? current.face : FACES[0]);
  panel.innerHTML =
    '<h2 class="panel-title">' + (panelMode === "add" ? t("dr_whoNew") : t("dr_whoRename")) + "</h2>" +
    '<div class="face-row">' +
    FACES.map(f => '<button type="button" class="face' + (f === startFace ? " is-on" : "") + '" data-face="' + f + '" aria-label="' + escapeText(t(faceKey(f))) + '">' + faceSvg(f) + "</button>").join("") +
    "</div>" +
    '<input id="who-edit-name" type="text" maxlength="12" placeholder="' + escapeText(t("dr_namePh")) + '" value="' + escapeText(startName) + '">' +
    '<div class="who-actions">' +
    '<button type="button" class="cta" data-act="save"><span class="cta-label">' + t("dr_save") + "</span></button>" +
    '<button type="button" class="btn-ghost" data-act="close">' + t("dr_cancel") + "</button>" +
    "</div>";

  panel.querySelectorAll(".face").forEach(button => {
    button.addEventListener("click", () => {
      panel.querySelectorAll(".face").forEach(f => f.classList.toggle("is-on", f === button));
    });
  });
}

/** なつやすみの 誘いを 出しはじめる 日。始まる 3 日前から（user 指示 2026-09-20） */
const SUMMER_LEAD_DAYS = 3;

/**
 * 学校の なつやすみ。国（というより 通って いる 学校）で ちがう。
 * アメリカの 学区は ばらつくので、よく ある ところ（6 月なかば〜8 月おわり）に 置く。
 */
const SUMMER_WINDOWS = {
  jp: { from: "07-21", to: "08-31" },
  us: { from: "06-10", to: "08-25" },
};

/**
 * どちらの なつやすみを つかうか。
 *
 * 🔴 **ことばでは 決めない**＝日本語の 画面で つかって いても、学校が アメリカなら
 * アメリカの 休みが 正しい（user 指示 2026-09-20）。**住んで いる ところ**で 決まる ものなので、
 * 端末の 時間帯を 見る。分からない ときだけ ことばに たよる。
 */
function summerRegion() {
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch (error) {
    /* 古い 端末では 時間帯が 分からない＝ことばに たよる */
  }
  if (zone === "Asia/Tokyo" || zone === "Japan") return "jp";
  if (/^(America|US|Canada|Mexico)\//.test(zone) || zone === "EST5EDT" || zone === "CST6CDT") return "us";
  return currentLang() === "ja" ? "jp" : "us";
}

/**
 * なつやすみ チャレンジの 期間と、誘いを 出して いい ころ。
 *
 * 9 月に なって から 始めても、その 日に もう「おわりました」に なるだけで
 * 何も できない（user 指摘 2026-09-20「夏休み過ぎたら、夏休み いらないよね」）。
 * なので **終わる 日を 過ぎたら 誘いを 出さない**。前もって 出すのは 3 日前から
 *（user 指示「事前はいらない、3日前くらいで」）。
 *
 * 期間は ここだけで 組み立て、**ボタンの 文字も ここから 作る**
 *（別々に 書くと、文字は 7/21 なのに 中身は 6/10 が 起きる）。
 */
function summerSpan(now) {
  const base = now || new Date();
  const year = base.getFullYear();
  const window = SUMMER_WINDOWS[summerRegion()] || SUMMER_WINDOWS.jp;
  const from = year + "-" + window.from;
  const to = year + "-" + window.to;
  const start = new Date(from + "T00:00:00");
  const openFrom = todayKey(new Date(start.getTime() - SUMMER_LEAD_DAYS * 24 * 60 * 60 * 1000));
  const today = todayKey(base);
  const month = key => String(Number(key.slice(0, 2)));
  const day = key => String(Number(key.slice(3, 5)));
  return {
    from,
    to,
    open: today >= openFrom && today <= to,
    label: t("dr_summerRange", month(window.from), day(window.from), month(window.to), day(window.to)),
  };
}

/** きょうの 日付。端末の時計で決める */
function todayKey(now) {
  const d = now || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** 期間を決めた チャレンジ。始める前は 誘い、始めたら 進み具合を出す */
function renderChallenge() {
  const box = $("challenge-box");
  const state = records.challenge();
  box.classList.remove("is-hidden");

  if (!state) {
    box.innerHTML =
      '<p class="challenge-title">' + t("dr_challengeTitle") + "</p>" +
      '<p class="challenge-line">' + t("dr_challengeLede") + "</p>" +
      '<div class="challenge-actions">' +
      (summerSpan().open
        ? '<button type="button" class="btn-ghost" data-challenge="summer">' + t("dr_challengeSummerBtn", summerSpan().label) + "</button>"
        : "") +
      '<button type="button" class="btn-ghost" data-challenge="month">' + t("dr_challengeMonth") + "</button>" +
      "</div>";
    return;
  }

  const percent = Math.min(100, Math.round((state.done / state.total) * 100));
  const line = state.complete
    ? '<p class="challenge-line challenge-done">' + t("dr_challengeAllDone") + "</p>"
    : state.finished
      ? '<p class="challenge-line">' + t("dr_challengeEnded", state.done, state.total) + "</p>"
      : '<p class="challenge-line">' + t("dr_challengeLeft", state.done, state.total, state.left) + "</p>";

  box.innerHTML =
    '<p class="challenge-title">' + escapeText(challengeName(state.name)) + "</p>" +
    line +
    '<div class="challenge-bar"><span class="challenge-fill" style="width:' + percent + '%"></span></div>' +
    '<div class="challenge-actions">' +
    (state.complete || state.finished
      ? '<button type="button" class="cta" data-challenge="award"><span class="cta-label">' + t("dr_seeAward") + "</span></button>"
      : "") +
    '<button type="button" class="btn-ghost" data-challenge="stop">' + t("dr_stop") + "</button>" +
    "</div>";
}

/** 60 びょうで 何問 とけるか。まちがえても 進む（止まらない方が たのしい） */
function startTimeAttack() {
  const list = makeSet(unitsOf(grade)[0], 1); // 形をそろえるための ひな型
  session = {
    unit: { id: "time-" + grade, name: t("dr_timeUnit", grade), kind: "num" },
    variant: undefined,
    time: true,
    // 60 びょう。E2E が 60 秒 待たずに「時間で おわる」経路を 通せるよう、
    // 締め切りだけ 外から 短くできる（本番では window.__timeAttackMs は 無い）。
    endsAt: Date.now() + (Number(window.__timeAttackMs) || 60000),
    list: [],
    at: 0,
    right: 0,
    done: [],
  };
  combo = 0;
  typed = "";
  pushTimeQuestion();
  show("view-quiz");
  renderQuestion();
  startTimer();
  void list;
}

/** タイムアタックは 1 問ずつ その場で作る（終わりが 時間で決まるため） */
function pushTimeQuestion() {
  const units = unitsOf(grade).filter(u => u.kind === "num" || u.kind === "choice");
  const unit = units[Math.floor(Math.random() * units.length)];
  const q = unit.make();
  session.list.push({ ...q, kind: unit.kind, unitId: unit.id, unitName: unit.name });
}

function startTimer() {
  stopTimer();
  const label = $("quiz-timer");
  label.classList.remove("is-hidden");
  const tick = () => {
    const left = Math.max(0, Math.ceil((session.endsAt - Date.now()) / 1000));
    label.textContent = t("dr_timeLeft", left);
    label.classList.toggle("is-low", left <= 10);
    if (left <= 0) {
      stopTimer();
      finish();
    }
  };
  tick();
  timer = setInterval(tick, 250);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
  $("quiz-timer").classList.add("is-hidden");
}

function renderDaily() {
  const done = records.doneToday();
  const card = $("daily-card");
  card.classList.toggle("is-done", done);
  const days = records.streak();
  $("daily-state").textContent = done
    ? days > 1
      ? t("dr_dailyDoneStreak", days)
      : t("dr_dailyDone")
    : days > 0
      ? t("dr_dailyNext", days + 1)
      : t("dr_dailyStart");
  card.querySelector(".daily-go").textContent = done ? t("dr_dailyAgain") : t("dr_dailyGo");
}

function renderTimeCard() {
  const best = records.bestTime(grade);
  $("time-best").textContent = best ? t("dr_bestCount", best) : t("dr_timePrompt");
}

function renderLevel() {
  const state = records.level();
  $("level-rank").textContent = t("dr_levelRank", state.rank);
  $("level-fill").style.width = Math.round((state.into / state.need) * 100) + "%";
  $("level-need").textContent = t("dr_levelNeed", state.need - state.into);
}

/** きょうの 1まい。その日ごとに 決まった 10 問 */
function startDaily() {
  const list = makeDaily(grade, todayKey(), QUESTIONS);
  if (!list.length) return;
  session = {
    unit: { id: "daily-" + grade, name: t("dr_dailyUnit", grade), kind: "num" },
    variant: undefined,
    daily: true,
    list,
    at: 0,
    right: 0,
    done: [],
  };
  typed = "";
  show("view-quiz");
  renderQuestion();
}

// --- 問題 -------------------------------------------------------------------

function startQuiz(unitId, variant) {
  const unit = unitById(unitId);
  if (!unit) return;
  const chosen = variant === undefined || variant === "0" ? undefined : Number(variant);
  session = { unit, variant: chosen, list: makeSet(unit, QUESTIONS, chosen), at: 0, right: 0, done: [] };
  typed = "";
  show("view-quiz");
  renderQuestion();
}

function renderQuestion() {
  if (session.time && !session.list[session.at]) pushTimeQuestion();
  const q = session.list[session.at];
  // きょうの 1まい は 単元が混ざるので、入れ方は 問題ごとに決める
  const unit = { ...session.unit, kind: q.kind || session.unit.kind };
  $("quiz-unit").textContent = q.unitName || unit.name;
  $("quiz-text").textContent = q.text;
  // 文章題は 式 より ずっと 長い。読む ための 大きさと そろえ方に 切りかえる
  $("quiz-text").classList.toggle("is-word", Boolean(q.word));
  $("quiz-hint").textContent = q.hint || "";
  $("quiz-feedback").textContent = "";
  $("quiz-feedback").className = "quiz-feedback";
  $("quiz-why").textContent = "";
  $("quiz-why").classList.add("is-hidden");
  $("quiz-count").textContent = session.time
    ? t("dr_rightCount", session.right)
    : session.at + 1 + " / " + session.list.length;
  $("quiz-dots").innerHTML = session.list
    .map((_, i) => {
      const mark = session.done[i] === true ? " is-ok" : session.done[i] === false ? " is-ng" : "";
      return '<span class="dot' + mark + (i === session.at ? " is-now" : "") + '"></span>';
    })
    .join("");

  renderReadButton(q);
  drawClock(q.clock);

  const choosing = unit.kind === "choice";
  $("quiz-choices").classList.toggle("is-hidden", !choosing);
  $("quiz-keypad").classList.toggle("is-hidden", choosing);
  $("quiz-answer").classList.toggle("is-hidden", choosing);

  if (choosing) {
    $("quiz-choices").innerHTML = q.choices
      .map(c => '<button type="button" class="choice" data-value="' + c + '">' + c + "</button>")
      .join("");
  } else {
    typed = "";
    $("quiz-answer").textContent = "?";
    $("quiz-keypad").innerHTML = padFor(unit.kind);
  }
}

/**
 * 読んで もらう ボタンの 出し入れ。文章題の ときだけ、声を 持つ 端末にだけ 出す。
 * 声が あとから 届く 端末が ある（Safari 15 以前は 知らせも 出さない）ので、
 * 文章題を 出す たびに 見直す。
 */
function applyReadButton() {
  const q = session ? session.list[session.at] : null;
  $("quiz-read").classList.toggle("is-hidden", !(q && q.word && voiceReady));
}

function renderReadButton(q) {
  // 🔴 見直しは ここだけ。応え（report）の 中から 呼ぶと 輪に なる
  if (q && q.word && voiceWatch) voiceWatch.recheck();
  applyReadButton();
}

/** 入れ方に合わせたキーだけ出す。小数なら「.」、分数なら「/」 */
function padFor(kind) {
  const extra = kind === "dec" ? "." : kind === "frac" ? "/" : "";
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", extra, "0", "del"];
  const body = keys
    .map(k => {
      if (!k) return '<span class="pad-blank"></span>';
      if (k === "del") return '<button type="button" class="pad pad-del" data-pad="del">' + t("dr_padDel") + "</button>";
      return '<button type="button" class="pad" data-pad="' + k + '">' + k + "</button>";
    })
    .join("");
  return body + '<button type="button" class="pad pad-ok" data-pad="ok">' + t("dr_padOk") + "</button>";
}

function press(pad) {
  if (!session || !pad) return;
  if (pad === "ok") return answer(typed);
  if (pad === "del") typed = typed.slice(0, -1);
  else if (typed.length < 8) typed += pad;
  $("quiz-answer").textContent = typed || "?";
}

function answer(given) {
  if (!session || session.locked) return;
  const q = session.list[session.at];
  const ok = isCorrect({ kind: q.kind || session.unit.kind }, given, q.answer);
  session.done[session.at] = ok;
  if (ok) session.right += 1;
  session.locked = true;

  const feedback = $("quiz-feedback");
  feedback.textContent = ok ? t("dr_seikai") : t("dr_theAnswer", q.answer);
  feedback.className = "quiz-feedback " + (ok ? "is-ok" : "is-ng");

  // まちがえた ときは「どう とくか」も 出す。答えの 数字だけを 見せても
  // 次に 同じ ところで まちがえる（プリントの Math Tips と 同じ ねらい）。
  // 持って いるのは 文章題だけなので、計算や タイムアタックでは 出ない
  const why = $("quiz-why");
  const showWhy = !ok && Boolean(q.why);
  why.textContent = showWhy ? q.why : "";
  why.classList.toggle("is-hidden", !showWhy);

  // つづけて 正解すると コンボが たまる
  combo = ok ? combo + 1 : 0;
  const comboLabel = $("quiz-combo");
  comboLabel.classList.toggle("is-hidden", combo < 3);
  if (combo >= 3) comboLabel.textContent = t("dr_combo", combo);

  if (ok) sounds.right();
  else sounds.wrong();
  renderDots();

  // 読む ものが 増えた ぶん、まちがえた ときだけ 長く 止める
  const wait = session.time ? (ok ? 260 : 700) : ok ? 550 : showWhy ? 3200 : 1500;
  // やめる を 押すと session が 消え、もう一度 始めると 別の session に なる。
  // その あいだに この タイマーが 起きても、古い 回には なにも しない
  const current = session;
  setTimeout(() => {
    if (session !== current) return;
    session.locked = false;
    if (session.time) {
      if (Date.now() >= session.endsAt) return;
      session.at += 1;
      pushTimeQuestion();
      return renderQuestion();
    }
    if (session.at + 1 >= session.list.length) return finish();
    session.at += 1;
    renderQuestion();
  }, wait);
}

function renderDots() {
  $("quiz-dots").innerHTML = session.list
    .map((_, i) => {
      const mark = session.done[i] === true ? " is-ok" : session.done[i] === false ? " is-ng" : "";
      return '<span class="dot' + mark + (i === session.at ? " is-now" : "") + '"></span>';
    })
    .join("");
}

function finish() {
  stopTimer();
  stopSpeech();
  const total = session.list.length;
  const right = session.right;

  if (session.time) {
    const best = records.recordTime(grade, right);
    $("result-face").innerHTML = markSvg(right >= best && right > 0 ? "trophy" : "timer");
    $("result-title").textContent = right >= best && right > 0 ? t("dr_newBest") : t("dr_finished");
    $("result-score").textContent = t("dr_timeScore", right);
    $("result-note").textContent = t("dr_bestCount", best);
    sounds.finish();
    if (right >= best && right > 0) confetti($("result-confetti"));
    show("view-result");
    return;
  }

  if (session.daily) {
    // まざっているので、単元ごとに 分けて 記録する
    const perUnit = new Map();
    session.list.forEach((q, i) => {
      const id = q.unitId || session.unit.id;
      const stat = perUnit.get(id) || { right: 0, total: 0 };
      stat.total += 1;
      if (session.done[i]) stat.right += 1;
      perUnit.set(id, stat);
    });
    perUnit.forEach((stat, id) => records.record(id, stat.right, stat.total));
  } else {
    records.record(session.unit.id, right, total);
  }

  const beforeLevel = records.level().rank;
  const perfect = right === total;
  $("result-face").innerHTML = markSvg(perfect ? "party" : right >= total * 0.8 ? "smile" : "sprout");
  $("result-title").textContent = perfect ? t("dr_allCorrect") : right >= total * 0.8 ? t("dr_wellDone") : t("dr_tryAgain");
  $("result-score").textContent = t("dr_scoreOf", total, right);
  const afterLevel = records.level().rank;
  const levelUp = afterLevel > beforeLevel;
  $("result-note").textContent = levelUp
    ? t("dr_starLevelUp", right, afterLevel)
    : t("dr_starGain", right);

  if (levelUp) sounds.levelUp();
  else sounds.finish();
  if (perfect || levelUp) confetti($("result-confetti"));
  show("view-result");
}

// --- きろく -----------------------------------------------------------------

export function renderKiroku() {
  const people = records.profiles();
  const current = records.currentProfile();

  $("kiroku-people").innerHTML = people.length
    ? people
        .map(p => {
          const now = current && current.id === p.id;
          return (
            '<div class="person' + (now ? " is-on" : "") + '">' +
            '<button type="button" class="person-use" data-use="' + p.id + '">' + p.face + " " + escapeText(p.name) + (now ? t("dr_inUse") : "") + "</button>" +
            '<button type="button" class="person-drop btn-ghost" data-drop="' + p.id + '">' + t("dr_delete") + "</button>" +
            "</div>"
          );
        })
        .join("")
    : '<p class="lede">' + t("dr_noPeople") + "</p>";

  if (!current) {
    $("kiroku-stats").innerHTML = "";
    $("kiroku-calendar").innerHTML = "";
    return;
  }

  renderCalendar();

  const rows = Object.keys(current.units)
    .map(id => {
      const unit = unitById(id);
      const stat = current.units[id];
      if (!unit) return "";
      const rate = stat.tried ? Math.round((stat.right / stat.tried) * 100) : 0;
      return "<tr><th>" + unit.name + "</th><td>" + t("dr_gradeTab", unit.grade) + "</td><td>" + t("dr_qCount", stat.tried) + "</td><td>" + rate + "%</td><td>" + t("dr_points", stat.best) + "</td></tr>";
    })
    .filter(Boolean)
    .join("");

  $("kiroku-stats").innerHTML =
    '<p class="kiroku-line">' + t("dr_kirokuLine", current.stars, records.streak()) + "</p>" +
    (rows
      ? '<table class="kiroku-table"><thead><tr><th>' + t("dr_thUnit") + "</th><th>" + t("dr_thGrade") + "</th><th>" + t("dr_thTried") + "</th><th>" + t("dr_thRate") + "</th><th>" + t("dr_thBest") + "</th></tr></thead><tbody>" + rows + "</tbody></table>"
      : '<p class="lede">' + t("dr_noRecords") + "</p>");
}

function escapeText(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function exportRecords() {
  const blob = new Blob([records.exportAll()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "drill-kiroku.json";
  link.click();
  URL.revokeObjectURL(url);
  $("kiroku-status").textContent = t("dr_exported");
  $("kiroku-status").className = "status is-ok";
}

function importRecords(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const ok = records.importAll(String(reader.result));
    $("kiroku-status").textContent = ok ? t("dr_imported") : t("dr_importFailed");
    $("kiroku-status").className = "status " + (ok ? "is-ok" : "is-error");
    if (ok) renderKiroku();
  };
  reader.readAsText(file);
  event.target.value = "";
}

/** 時計の絵。文字ばんと はり を描くだけなので、外の部品は要らない */
function drawClock(clock) {
  const canvas = $("quiz-clock");
  canvas.classList.toggle("is-hidden", !clock);
  if (!clock) return;

  const size = 190;
  const scale = window.devicePixelRatio || 1;
  canvas.width = size * scale;
  canvas.height = size * scale;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";

  const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#38344f";
  const line = getComputedStyle(document.documentElement).getPropertyValue("--line-strong").trim() || "#e2d6ef";
  const face = getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#ffffff";

  const g = canvas.getContext("2d");
  g.setTransform(scale, 0, 0, scale, 0, 0);
  g.clearRect(0, 0, size, size);

  const c = size / 2;
  const r = c - 8;

  g.fillStyle = face;
  g.strokeStyle = line;
  g.lineWidth = 6;
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // 目もりと 数字
  g.strokeStyle = line;
  g.fillStyle = ink;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let i = 0; i < 60; i += 1) {
    const angle = (Math.PI / 30) * i - Math.PI / 2;
    const big = i % 5 === 0;
    g.lineWidth = big ? 3 : 1;
    g.beginPath();
    g.moveTo(c + Math.cos(angle) * (r - (big ? 14 : 8)), c + Math.sin(angle) * (r - (big ? 14 : 8)));
    g.lineTo(c + Math.cos(angle) * (r - 3), c + Math.sin(angle) * (r - 3));
    g.stroke();
  }
  g.font = "700 17px system-ui, sans-serif";
  for (let n = 1; n <= 12; n += 1) {
    const angle = (Math.PI / 6) * n - Math.PI / 2;
    g.fillText(String(n), c + Math.cos(angle) * (r - 30), c + Math.sin(angle) * (r - 30));
  }

  // みじかい はり（時）と ながい はり（分）
  const hourAngle = (Math.PI / 6) * (clock.h % 12) + (Math.PI / 360) * clock.m - Math.PI / 2;
  const minuteAngle = (Math.PI / 30) * clock.m - Math.PI / 2;

  g.strokeStyle = ink;
  g.lineCap = "round";
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(c, c);
  g.lineTo(c + Math.cos(hourAngle) * (r * 0.5), c + Math.sin(hourAngle) * (r * 0.5));
  g.stroke();

  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(c, c);
  g.lineTo(c + Math.cos(minuteAngle) * (r * 0.78), c + Math.sin(minuteAngle) * (r * 0.78));
  g.stroke();

  g.fillStyle = ink;
  g.beginPath();
  g.arc(c, c, 6, 0, Math.PI * 2);
  g.fill();
}

/** 今月の カレンダー。やった日に 色が つく */
function renderCalendar() {
  const { year, month, startWeekday, marks } = records.monthMarks();
  const week = t("dr_weekdays").split(" ");
  const blanks = Array.from({ length: startWeekday }, () => '<span class="calendar-cell is-blank"></span>').join("");
  const cells = marks
    .map(m => {
      const state = m.done ? " is-done" : m.future ? " is-future" : "";
      return '<span class="calendar-cell' + state + '">' + m.day + "</span>";
    })
    .join("");
  const doneCount = marks.filter(m => m.done).length;
  $("kiroku-calendar").innerHTML =
    '<p class="calendar-head">' + t("dr_calHead", year, month, doneCount) + "</p>" +
    '<div class="calendar-grid">' +
    week.map(w => '<span class="calendar-cell is-blank">' + w + "</span>").join("") +
    blanks +
    cells +
    "</div>";
}

/** しょうじょう。紙に出せるように 余計なものを 省いた作りにする */
export function renderAward() {
  const person = records.currentProfile();
  const state = records.challenge();
  const box = $("award-body");

  if (!person || !state) {
    box.innerHTML = '<p class="award-body">' + t("dr_noChallenge") + "</p>";
    return;
  }

  const today = new Date();
  const date = t("dr_awardDate", today.getFullYear(), today.getMonth() + 1, today.getDate());
  const title = state.complete ? t("dr_awardTitle") : t("dr_awardCard");
  const level = records.level();

  box.innerHTML =
    '<p class="award-title">' + title + "</p>" +
    '<p class="award-name">' + t("dr_awardTo", escapeText(person.name)) + "</p>" +
    '<p class="award-body">' +
    t("dr_awardBody", escapeText(challengeName(state.name)), state.total, state.done, level.stars, level.rank) +
    "</p>" +
    '<p class="award-body">' + date + "</p>";
}
