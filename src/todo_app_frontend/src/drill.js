/**
 * ドリルの画面。問題は端末の中で作り、記録も端末の中だけに置く。
 */
import { GRADES, unitsOf, unitById, isCorrect, makeSet } from "./drill-data";
import * as records from "./records";

const $ = id => document.getElementById(id);
const FACES = ["🐻", "🐰", "🐱", "🐶", "🦊", "🐼", "🐸", "🐧"];
const QUESTIONS = 10;

let show = () => {};
let grade = 1;
let session = null;
let typed = "";

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

  $("who-face").addEventListener("click", () => {
    location.hash = "#/kiroku";
  });

  $("grade-tabs").addEventListener("click", event => {
    const button = event.target.closest(".grade-tab");
    if (!button) return;
    grade = Number(button.dataset.grade);
    if (records.currentProfile()) records.setGrade(grade);
    renderHome();
  });

  $("unit-grid").addEventListener("click", event => {
    const card = event.target.closest(".unit-card");
    if (card) startQuiz(card.dataset.unit);
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
    if (session) startQuiz(session.unit.id);
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

  $("grade-tabs").innerHTML = GRADES.map(
    g => '<button type="button" class="grade-tab' + (g === grade ? " is-on" : "") + '" data-grade="' + g + '">' + g + "年</button>"
  ).join("");

  $("unit-grid").innerHTML = unitsOf(grade)
    .map(unit => {
      const stat = records.unitStat(unit.id);
      const badge = stat
        ? '<span class="unit-score">まえは ' + stat.last + "点</span>"
        : '<span class="unit-score is-new">はじめて</span>';
      return '<button type="button" class="unit-card" data-unit="' + unit.id + '"><span class="unit-name">' + unit.name + "</span>" + badge + "</button>";
    })
    .join("");
}

// --- 問題 -------------------------------------------------------------------

function startQuiz(unitId) {
  const unit = unitById(unitId);
  if (!unit) return;
  session = { unit, list: makeSet(unit, QUESTIONS), at: 0, right: 0, done: [] };
  typed = "";
  show("view-quiz");
  renderQuestion();
}

function renderQuestion() {
  const unit = session.unit;
  const q = session.list[session.at];
  $("quiz-unit").textContent = unit.name;
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
  const ok = isCorrect(session.unit, given, q.answer);
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
  records.record(session.unit.id, right, total);

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
    return;
  }

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
