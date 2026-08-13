/**
 * ドリルの画面。問題は端末の中で作り、記録も端末の中だけに置く。
 */
import { GRADES, unitsOf, unitById, isCorrect, makeSet, makeDaily } from "./drill-data";
import * as records from "./records";

const $ = id => document.getElementById(id);
const FACES = ["🐻", "🐰", "🐱", "🐶", "🦊", "🐼", "🐸", "🐧"];
const QUESTIONS = 10;

let show = () => {};
let grade = 1;
let session = null;
let typed = "";
let panelMode = "";

export function initDrill(options) {
  show = options.show;

  $("face-row").innerHTML = FACES.map(
    (face, i) => '<button type="button" class="face' + (i === 0 ? " is-on" : "") + '" data-face="' + face + '">' + face + "</button>"
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

  $("challenge-box").addEventListener("click", event => {
    const act = event.target.closest("[data-challenge]");
    if (!act) return;
    if (act.dataset.challenge === "summer") {
      const year = new Date().getFullYear();
      records.startChallenge("なつやすみ チャレンジ", year + "-07-21", year + "-08-31");
    } else if (act.dataset.challenge === "month") {
      const now = new Date();
      const from = todayKey(now);
      const end = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);
      records.startChallenge("30日 チャレンジ", from, todayKey(end));
    } else if (act.dataset.challenge === "award") {
      location.hash = "#/shoujou";
      return;
    } else if (act.dataset.challenge === "stop") {
      if (act.dataset.armed !== "1") {
        act.dataset.armed = "1";
        act.textContent = "ほんとうに やめる？";
        return;
      }
      records.clearChallenge();
    }
    renderHome();
  });

  $("quiz-quit").addEventListener("click", () => {
    session = null;
    location.hash = "#/";
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
        drop.textContent = "ほんとうに けす？";
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

  const profile = records.currentProfile();
  if (profile) grade = profile.grade;
}

export function renderHome() {
  const profile = records.currentProfile();
  $("who-empty").classList.toggle("is-hidden", Boolean(profile));
  $("drill-main").classList.toggle("is-hidden", !profile);

  if (profile) {
    $("who-face").textContent = profile.face;
    $("who-name").textContent = profile.name;
    $("who-stars").textContent = profile.stars;
    const days = records.streak();
    $("who-streak").textContent = days > 1 ? days + "日 つづいているよ" : "きょうも やってみよう";
    grade = profile.grade || grade;
  }

  const weak = records.weakUnits(3).filter(w => w.last < 100);
  $("weak-row").innerHTML = weak.length
    ? '<p class="weak-title">にがてを もういちど</p>' +
      weak
        .map(w => {
          const unit = unitById(w.id);
          if (!unit) return "";
          return '<button type="button" class="weak-card" data-unit="' + w.id + '">' + unit.name + '<span class="weak-score">まえは ' + w.last + "点</span></button>";
        })
        .filter(Boolean)
        .join("")
    : "";
  $("weak-row").classList.toggle("is-hidden", weak.length === 0);

  renderWhoPanel();
  renderChallenge();
  renderDaily();
  renderLevel();

  $("grade-tabs").innerHTML = GRADES.map(
    g => '<button type="button" class="grade-tab' + (g === grade ? " is-on" : "") + '" data-grade="' + g + '">' + g + "年</button>"
  ).join("");

  $("unit-grid").innerHTML = unitsOf(grade)
    .map(unit => {
      const stat = records.unitStat(unit.id);
      const badge = stat
        ? '<span class="unit-score">まえは ' + stat.last + "点</span>"
        : '<span class="unit-score is-new">はじめて</span>';
      const arrow = unit.variants ? '<span class="unit-more">どの だん？</span>' : "";
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
      '<h2 class="panel-title">つかう人</h2>' +
      people
        .map(p => {
          const on = current && current.id === p.id ? " is-on" : "";
          return '<button type="button" class="who-pick' + on + '" data-pick="' + p.id + '">' + p.face + " " + escapeText(p.name) + "</button>";
        })
        .join("") +
      '<div class="who-actions">' +
      '<button type="button" class="btn-ghost" data-act="edit">なまえを かえる</button>' +
      '<button type="button" class="btn-ghost" data-act="add">あたらしい人</button>' +
      "</div>" +
      '<button type="button" class="btn-ghost" data-act="close">とじる</button>';
    return;
  }

  const current = records.currentProfile();
  const startName = panelMode === "edit" && current ? current.name : "";
  const startFace = panelMode === "edit" && current ? current.face : FACES[0];
  panel.innerHTML =
    '<h2 class="panel-title">' + (panelMode === "add" ? "あたらしい人" : "なまえを かえる") + "</h2>" +
    '<div class="face-row">' +
    FACES.map(f => '<button type="button" class="face' + (f === startFace ? " is-on" : "") + '" data-face="' + f + '">' + f + "</button>").join("") +
    "</div>" +
    '<input id="who-edit-name" type="text" maxlength="12" placeholder="なまえ" value="' + escapeText(startName) + '">' +
    '<div class="who-actions">' +
    '<button type="button" class="cta" data-act="save"><span class="cta-label">ほぞん</span></button>' +
    '<button type="button" class="btn-ghost" data-act="close">やめる</button>' +
    "</div>";

  panel.querySelectorAll(".face").forEach(button => {
    button.addEventListener("click", () => {
      panel.querySelectorAll(".face").forEach(f => f.classList.toggle("is-on", f === button));
    });
  });
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
      '<p class="challenge-title">つづける チャレンジ</p>' +
      '<p class="challenge-line">まいにち 1まい やって、さいごに しょうじょうを もらおう。</p>' +
      '<div class="challenge-actions">' +
      '<button type="button" class="btn-ghost" data-challenge="summer">なつやすみ（7/21〜8/31）</button>' +
      '<button type="button" class="btn-ghost" data-challenge="month">30日 チャレンジ</button>' +
      "</div>";
    return;
  }

  const percent = Math.min(100, Math.round((state.done / state.total) * 100));
  const line = state.complete
    ? '<p class="challenge-line challenge-done">ぜんぶ たっせい！ しょうじょうを もらおう</p>'
    : state.finished
      ? '<p class="challenge-line">おしまい。' + state.done + " / " + state.total + "日 やったよ</p>"
      : '<p class="challenge-line">' + state.done + " / " + state.total + "日 ／ のこり " + state.left + "日</p>";

  box.innerHTML =
    '<p class="challenge-title">' + escapeText(state.name) + "</p>" +
    line +
    '<div class="challenge-bar"><span class="challenge-fill" style="width:' + percent + '%"></span></div>' +
    '<div class="challenge-actions">' +
    (state.complete || state.finished
      ? '<button type="button" class="cta" data-challenge="award"><span class="cta-label">しょうじょうを みる</span></button>'
      : "") +
    '<button type="button" class="btn-ghost" data-challenge="stop">やめる</button>' +
    "</div>";
}

function renderDaily() {
  const done = records.doneToday();
  const card = $("daily-card");
  card.classList.toggle("is-done", done);
  const days = records.streak();
  $("daily-state").textContent = done
    ? days > 1
      ? "きょうは おわり！ " + days + "日 つづいているよ"
      : "きょうは おわり！"
    : days > 0
      ? "つづけると " + (days + 1) + "日 めだよ"
      : "10もん やってみよう";
  card.querySelector(".daily-go").textContent = done ? "もういちど" : "やる";
}

function renderLevel() {
  const state = records.level();
  $("level-rank").textContent = "レベル " + state.rank;
  $("level-fill").style.width = Math.round((state.into / state.need) * 100) + "%";
  $("level-need").textContent = "あと ★" + (state.need - state.into);
}

/** きょうの 1まい。その日ごとに 決まった 10 問 */
function startDaily() {
  const list = makeDaily(grade, todayKey(), QUESTIONS);
  if (!list.length) return;
  session = {
    unit: { id: "daily-" + grade, name: "きょうの 1まい（" + grade + "年）", kind: "num" },
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
  const q = session.list[session.at];
  // きょうの 1まい は 単元が混ざるので、入れ方は 問題ごとに決める
  const unit = { ...session.unit, kind: q.kind || session.unit.kind };
  $("quiz-unit").textContent = q.unitName || unit.name;
  $("quiz-text").textContent = q.text;
  $("quiz-hint").textContent = q.hint || "";
  $("quiz-feedback").textContent = "";
  $("quiz-feedback").className = "quiz-feedback";
  $("quiz-count").textContent = session.at + 1 + " / " + session.list.length;
  $("quiz-dots").innerHTML = session.list
    .map((_, i) => {
      const mark = session.done[i] === true ? " is-ok" : session.done[i] === false ? " is-ng" : "";
      return '<span class="dot' + mark + (i === session.at ? " is-now" : "") + '"></span>';
    })
    .join("");

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

/** 入れ方に合わせたキーだけ出す。小数なら「.」、分数なら「/」 */
function padFor(kind) {
  const extra = kind === "dec" ? "." : kind === "frac" ? "/" : "";
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", extra, "0", "del"];
  const body = keys
    .map(k => {
      if (!k) return '<span class="pad-blank"></span>';
      if (k === "del") return '<button type="button" class="pad pad-del" data-pad="del">けす</button>';
      return '<button type="button" class="pad" data-pad="' + k + '">' + k + "</button>";
    })
    .join("");
  return body + '<button type="button" class="pad pad-ok" data-pad="ok">こたえる</button>';
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
  feedback.textContent = ok ? "せいかい！" : "こたえは " + q.answer;
  feedback.className = "quiz-feedback " + (ok ? "is-ok" : "is-ng");
  renderDots();

  setTimeout(() => {
    session.locked = false;
    if (session.at + 1 >= session.list.length) return finish();
    session.at += 1;
    renderQuestion();
  }, ok ? 550 : 1500);
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
  const total = session.list.length;
  const right = session.right;

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

  const perfect = right === total;
  $("result-face").textContent = perfect ? "🎉" : right >= total * 0.8 ? "😊" : "💪";
  $("result-title").textContent = perfect ? "ぜんもん せいかい！" : right >= total * 0.8 ? "よく できました" : "もう いっかい やってみよう";
  $("result-score").textContent = total + "もんちゅう " + right + "もん せいかい";
  $("result-note").textContent = "★を " + right + "こ もらったよ";
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
            '<button type="button" class="person-use" data-use="' + p.id + '">' + p.face + " " + escapeText(p.name) + (now ? "（つかっている）" : "") + "</button>" +
            '<button type="button" class="person-drop btn-ghost" data-drop="' + p.id + '">けす</button>' +
            "</div>"
          );
        })
        .join("")
    : '<p class="lede">まだ だれも いません。</p>';

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
      return "<tr><th>" + unit.name + "</th><td>" + unit.grade + "年</td><td>" + stat.tried + "もん</td><td>" + rate + "%</td><td>" + stat.best + "点</td></tr>";
    })
    .filter(Boolean)
    .join("");

  $("kiroku-stats").innerHTML =
    '<p class="kiroku-line">★ ' + current.stars + " ／ " + records.streak() + "日 つづいている</p>" +
    (rows
      ? '<table class="kiroku-table"><thead><tr><th>たんげん</th><th>学年</th><th>やった数</th><th>できた</th><th>さいこう</th></tr></thead><tbody>' + rows + "</tbody></table>"
      : '<p class="lede">まだ きろくが ありません。</p>');
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
  $("kiroku-status").textContent = "かきだしました。";
  $("kiroku-status").className = "status is-ok";
}

function importRecords(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const ok = records.importAll(String(reader.result));
    $("kiroku-status").textContent = ok ? "よみこみました。" : "よみこめませんでした。";
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
  const week = ["日", "月", "火", "水", "木", "金", "土"];
  const blanks = Array.from({ length: startWeekday }, () => '<span class="calendar-cell is-blank"></span>').join("");
  const cells = marks
    .map(m => {
      const state = m.done ? " is-done" : m.future ? " is-future" : "";
      return '<span class="calendar-cell' + state + '">' + m.day + "</span>";
    })
    .join("");
  const doneCount = marks.filter(m => m.done).length;
  $("kiroku-calendar").innerHTML =
    '<p class="calendar-head">' + year + "年 " + month + "月 ／ " + doneCount + "日 やったよ</p>" +
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
    box.innerHTML = '<p class="award-body">まだ チャレンジを していません。</p>';
    return;
  }

  const today = new Date();
  const date = today.getFullYear() + "年 " + (today.getMonth() + 1) + "月 " + today.getDate() + "日";
  const title = state.complete ? "しょうじょう" : "がんばりカード";
  const level = records.level();

  box.innerHTML =
    '<p class="award-title">' + title + "</p>" +
    '<p class="award-name">' + escapeText(person.name) + " どの</p>" +
    '<p class="award-body">' +
    escapeText(state.name) + " で<br>" +
    state.total + "日 のうち <b>" + state.done + "日</b> やりました。<br>" +
    "★を " + level.stars + "こ あつめて レベル " + level.rank + " に なりました。<br>" +
    "その がんばりを ここに たたえます。" +
    "</p>" +
    '<p class="award-body">' + date + "</p>";
}
