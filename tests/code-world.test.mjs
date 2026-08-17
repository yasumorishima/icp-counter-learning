/**
 * ぼうけんの きまりの 検算。
 *
 *   node tests/code-world.test.mjs
 */
import {
  run, act, ask, makeLevel, snapshot, cleared, normalize, normalizeList,
  countCards, countAll, clampCount, enemyAt, holeAt, lockedAt,
  MAX_STEPS, MAX_REPEAT, MAX_DEPTH, MAX_CARDS, ACTIONS, CONDS,
} from "../src/todo_app_frontend/src/code-world.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const P = t => ({ t });
const R = (n, body) => ({ t: "repeat", n, body });
const IF = (cond, then, other) => ({ t: "if", cond, then, other });
const CALL = w => ({ t: "call", w });
const go = (main, level) => run({ main }, level);
const bumps = r => r.frames.filter(f => f.op === "bump").length;

const PLAIN = { map: "GGGGGF" };

// --- 1. あるく・とぶ -------------------------------------------------------------

{
  const r = go([P("go"), P("go")], PLAIN);
  check("すすむと 1 ます 進む", r.st.me.at === 2 && bumps(r) === 0);
  check("はじめの ようすも のこる", r.frames.length === 3 && r.frames[0].op === "start");

  const j = go([P("jump")], PLAIN);
  check("とぶと 2 ます 進む", j.st.me.at === 2);

  const edge = go([R(12, [P("go")])], PLAIN);
  check("みちの おわりから 先へは 行けない", edge.st.me.at === 5, String(edge.st.me.at));
  check("行けなかった ぶんは ぶつかった あつかい", bumps(edge) === 7, String(bumps(edge)));
}

// --- 2. あな ------------------------------------------------------------------

{
  const fall = go([P("go"), P("go")], { map: "GGHGF" });
  check("あなに 入ると おちる", fall.st.dead === "fall" && fall.stopped === "fall");
  check("おちたら そこで 止まる", fall.frames.length === 3);

  const over = go([P("go"), P("jump")], { map: "GGHGF" });
  check("あなは とびこえられる", over.st.me.at === 3 && !over.st.dead);

  const far = go([P("jump")], { map: "GHHGF" });
  check("とんだ さきが あなだと おちる", far.st.dead === "fall");
}

// --- 3. ★と かぎと とびら --------------------------------------------------------

{
  const take = go([P("go"), P("take")], { map: "G*GF" });
  check("★を とれる", take.st.me.got === 1 && take.st.stars.size === 0);

  const nothing = go([P("take")], PLAIN);
  check("なにも ない ところでは とれない", bumps(nothing) === 1);

  const door = go([P("go"), P("go")], { map: "GGDGF" });
  check("しまった とびらは 通れない", door.st.me.at === 1 && bumps(door) === 1);

  const jumpDoor = go([P("go"), P("jump")], { map: "GGDGF" });
  check("とびらは とびこえられない", jumpDoor.st.me.at === 1 && bumps(jumpDoor) === 1);

  const open = go([P("go"), P("take"), P("go"), P("open"), P("go"), P("go")], { map: "GkGDGF" });
  check("かぎを とれば とびらを あけられる", open.st.me.at === 4 && bumps(open) === 0,
    "at=" + open.st.me.at + " bumps=" + bumps(open));

  const noKey = go([P("go"), P("go"), P("open")], { map: "GGGDGF" });
  check("かぎが ないと あけられない", bumps(noKey) === 1);
}

// --- 4. てき ------------------------------------------------------------------

{
  const level = { map: "GGGGGGGGF", enemies: [{ lo: 3, hi: 5, every: 2 }] };
  const st = makeLevel(level);
  check("てきは はじめ いちばん 左に いる", st.enemies[0].at === 3);
  check("てきの はやさは きめられる", st.enemies[0].every === 2);

  // その場から 動かない てきに 歩いて ぶつかる
  const still = go([P("go"), P("go")], { map: "GGGGF", enemies: [{ lo: 2, hi: 2 }] });
  check("てきに ぶつかると つかまる", still.st.dead === "caught", String(still.st.me.at));

  // うごく てきの ほうから のって きた ときも つかまる
  const walk = go([P("go"), P("go"), P("go"), P("go")], { map: "GGGGGGGGF", enemies: [{ lo: 3, hi: 5, every: 1 }] });
  check("てきが のって きても つかまる", walk.st.dead === "caught", String(walk.st.me.at));

  const slow = { map: "GGGGGGGGF", enemies: [{ lo: 6, hi: 7, every: 2 }] };
  const two = go([P("go"), P("go")], slow);
  check("2 手で 1 ます 動く", two.st.enemies[0].at === 7, String(two.st.enemies[0].at));

  const bounce = go([R(8, [P("wait")])], slow);
  check("はんいの なかを 行ったり来たり する",
    bounce.st.enemies[0].at >= 6 && bounce.st.enemies[0].at <= 7);
  check("まっても じぶんは 動かない", bounce.st.me.at === 0);
}

// --- 5. もし〜だったら ------------------------------------------------------------

{
  const level = { map: "GHGkGDGF" };
  const st = makeLevel(level);
  check("まえが あな", ask(st, "hole"));
  check("まえは とびらでは ない", !ask(st, "door"));
  st.me.at = 4;
  check("まえが とびら", ask(st, "door"));
  st.me.at = 3;
  check("ここに かぎが ある", ask(st, "star"));
  check("てきは いない", !ask(st, "enemy"));

  const walker = go([R(4, [IF("hole", [P("jump")], [P("go")])])], { map: "GHGGHGF" });
  check("もし〜だったら で あなを よけられる", walker.st.me.at === 6 && bumps(walker) === 0,
    "at=" + walker.st.me.at);
}

// --- 6. わざ ------------------------------------------------------------------

{
  const r = run({ a: [P("go"), P("go")], main: [CALL("a"), CALL("a")] }, PLAIN);
  check("わざを よぶと なかみが 動く", r.st.me.at === 4 && bumps(r) === 0);

  const deep = run({ a: [CALL("a")], main: [CALL("a")] }, PLAIN);
  check("わざが じぶんを よび続けても 止まる", deep.stopped === "deep");

  const two = run({ a: [P("go")], b: [P("jump")], main: [CALL("a"), CALL("b")] }, PLAIN);
  check("わざは 2 つ もてる", two.st.me.at === 3);
}

// --- 7. 上限（画面が 固まらない） --------------------------------------------------

{
  check("0 かいは 1 かいに なる", clampCount(0) === 1);
  check("100 かいは 20 かいに なる", clampCount(100) === MAX_REPEAT);
  check("かずでない ものは 1 かいに なる", clampCount("あ") === 1);

  const heavy = go([R(20, [R(20, [R(20, [P("wait")])])])], PLAIN);
  check("動きの 数は 上限で 止まる", heavy.stopped === "limit" && heavy.frames.length <= MAX_STEPS + 1,
    heavy.frames.length + " frames");

  const many = normalizeList(new Array(200).fill(0).map(() => P("go")));
  check("カードの かずも 上限で 止まる", countCards(many) <= MAX_CARDS, String(countCards(many)));

  const junk = normalizeList([null, { t: "たべる" }, P("go"), "x", { t: "call", w: "z" }]);
  check("しらない カードは すてる", countCards(junk) === 1, JSON.stringify(junk));

  const nest = normalizeList([R(2, [R(2, [R(2, [R(2, [P("go")])])])])]);
  const depthOf = list => {
    let d = 0;
    for (const c of list) {
      if (c.t === "repeat") d = Math.max(d, 1 + depthOf(c.body));
      if (c.t === "if") d = Math.max(d, 1 + Math.max(depthOf(c.then), depthOf(c.other)));
    }
    return d;
  };
  check("入れ子は 3 だんまでで 止まる", depthOf(nest) === MAX_DEPTH, String(depthOf(nest)));
}

// --- 8. クリアの 見わけ -----------------------------------------------------------

{
  const level = { map: "G*GF" };
  const all = go([P("go"), P("take"), P("go"), P("go")], level);
  check("★を とって ゴールに つけば クリア", cleared(all.st));

  const skip = go([P("go"), P("go"), P("go")], level);
  check("★を のこすと クリアに ならない", !cleared(skip.st) && skip.st.me.at === 3);

  const short = go([P("go")], level);
  check("ゴールに つかなければ クリアに ならない", !cleared(short.st));

  const dead = go([P("go"), P("go")], { map: "GGHF" });
  check("おちたら クリアに ならない", !cleared(dead.st));
}

// --- 9. 画面に わたす できごと -------------------------------------------------------

{
  const r = run({ main: [{ t: "go", id: "x1" }, { t: "jump", id: "x2" }] }, PLAIN);
  check("できごとに どの カードかが のこる",
    r.frames[1].card === "x1" && r.frames[2].card === "x2");
  check("できごとに ★の かずも のこる", r.frames[2].got === 0 && "keys" in r.frames[2]);

  const withStar = run({ main: [{ t: "go" }, { t: "take" }] }, { map: "G*GF" });
  check("とった あとの できごとには ★が のこって いない",
    withStar.frames[2].stars.length === 0 && withStar.frames[1].stars.length === 1);

  check("カードの しゅるいは 5 つ", ACTIONS.length === 5, ACTIONS.join(","));
  check("もし の 中身は 4 つ", CONDS.length === 4, CONDS.join(","));
  check("わざも あわせて 数えられる",
    countAll({ main: [P("go")], a: [P("go"), P("go")], b: [] }) === 3);
  check("しらない かたちでも 落ちない", countAll(undefined) === 0 && normalize(null).main.length === 0);
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
