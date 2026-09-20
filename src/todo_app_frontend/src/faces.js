/**
 * かおと しるし。すべて 自前の SVG。
 *
 * 🔴 **なぜ 絵文字を やめたか**（2026-09-20 実測）
 * 画面に 出して いた 絵文字 23 文字を この 端末で 1 文字ずつ 描いて
 * 「形の 無い 文字（U+FFFF）と 同じ 絵に なるか」で 調べたところ、
 * **🐻 🐰 🐶 🦊 🐼 🐸 🐧 🏆 🎉 💪 🤝 の 11 文字が 豆腐**だった。
 * 絵文字の フォントを 持たない 端末では、なまえの となりの かおが □ に なる。
 * （★ ♪ ✦ ✕ × □ は ふつうの 記号で どこでも 出る ので そのまま）
 *
 * そら・しょうぎ・あそび と 同じ 流儀＝**絵は 全部 自分で 描く**。
 * innerHTML に 入れるのは この ファイルの 中の 決め打ちの 文字列だけで、
 * 外から 来た 値は `faceSvg` / `markSvg` の 中で はじく。
 */

const W = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">';

/** かお 8 つ。なまえを つける ときに えらぶ */
export const FACE_IDS = ["bear", "rabbit", "cat", "dog", "fox", "panda", "frog", "penguin"];

const FACE = {
  bear: `${W}<circle cx="13" cy="13" r="6.5" fill="#a9754f"/><circle cx="35" cy="13" r="6.5" fill="#a9754f"/>
<circle cx="13" cy="13" r="3.4" fill="#d9ab86"/><circle cx="35" cy="13" r="3.4" fill="#d9ab86"/>
<circle cx="24" cy="26" r="16" fill="#b9825a"/><ellipse cx="24" cy="31" rx="9" ry="7" fill="#e8c8a8"/>
<circle cx="18" cy="23" r="2.4" fill="#3d3a55"/><circle cx="30" cy="23" r="2.4" fill="#3d3a55"/>
<ellipse cx="24" cy="29" rx="3" ry="2.2" fill="#3d3a55"/>
<path d="M24 31v2.4M24 33.4c-1.6 1.8-4 1.4-4.8-.4M24 33.4c1.6 1.8 4 1.4 4.8-.4" stroke="#3d3a55" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,

  rabbit: `${W}<ellipse cx="17" cy="11" rx="4.4" ry="10" fill="#efe6f5"/><ellipse cx="31" cy="11" rx="4.4" ry="10" fill="#efe6f5"/>
<ellipse cx="17" cy="11.5" rx="2.1" ry="6.6" fill="#f7c2d8"/><ellipse cx="31" cy="11.5" rx="2.1" ry="6.6" fill="#f7c2d8"/>
<circle cx="24" cy="30" r="14.5" fill="#f6f1fa"/>
<circle cx="18.5" cy="28" r="2.3" fill="#3d3a55"/><circle cx="29.5" cy="28" r="2.3" fill="#3d3a55"/>
<path d="M24 32.6l-2.2-2h4.4z" fill="#ef7fa6"/>
<path d="M24 32.6v2M24 34.6c-1.5 1.7-3.7 1.3-4.4-.4M24 34.6c1.5 1.7 3.7 1.3 4.4-.4" stroke="#3d3a55" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<circle cx="13" cy="33" r="2.6" fill="#f9d3e2"/><circle cx="35" cy="33" r="2.6" fill="#f9d3e2"/></svg>`,

  cat: `${W}<path d="M11 20 9 6l12 6z" fill="#f5a45e"/><path d="M37 20 39 6l-12 6z" fill="#f5a45e"/>
<path d="M12 18.5 11 10l7.6 3.8z" fill="#f7c9a0"/><path d="M36 18.5 37 10l-7.6 3.8z" fill="#f7c9a0"/>
<circle cx="24" cy="27" r="15.5" fill="#f5a45e"/>
<ellipse cx="18" cy="25" rx="2.3" ry="2.9" fill="#3d3a55"/><ellipse cx="30" cy="25" rx="2.3" ry="2.9" fill="#3d3a55"/>
<path d="M24 31.4l-2 -1.8h4z" fill="#e1668c"/>
<path d="M24 31.4v1.8M24 33.2c-1.4 1.6-3.5 1.2-4.2-.4M24 33.2c1.4 1.6 3.5 1.2 4.2-.4" stroke="#3d3a55" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M7 27h6M7 31h6M41 27h-6M41 31h-6" stroke="#d98a45" stroke-width="1.4" stroke-linecap="round"/></svg>`,

  dog: `${W}<ellipse cx="9" cy="24" rx="5.5" ry="11" fill="#9a6a45"/><ellipse cx="39" cy="24" rx="5.5" ry="11" fill="#9a6a45"/>
<circle cx="24" cy="26" r="15.5" fill="#c99260"/>
<ellipse cx="24" cy="32" rx="8.5" ry="6.5" fill="#f0d7bb"/>
<circle cx="18" cy="23" r="2.4" fill="#3d3a55"/><circle cx="30" cy="23" r="2.4" fill="#3d3a55"/>
<ellipse cx="24" cy="29.5" rx="3.2" ry="2.4" fill="#3d3a55"/>
<path d="M24 32v2.2M24 34.2c-1.6 1.8-4 1.4-4.8-.4M24 34.2c1.6 1.8 4 1.4 4.8-.4" stroke="#3d3a55" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<path d="M13 15c2-3 5-3.5 7-2" stroke="#8a5c3a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,

  fox: `${W}<path d="M10 19 7 5l13 7z" fill="#ef8442"/><path d="M38 19 41 5l-13 7z" fill="#ef8442"/>
<path d="M11 17.5 9.5 9l7 3.6z" fill="#3d3a55"/><path d="M37 17.5 38.5 9l-7 3.6z" fill="#3d3a55"/>
<path d="M24 12c9 0 15.5 6.4 15.5 14C39.5 34 32.6 42 24 42S8.5 34 8.5 26C8.5 18.4 15 12 24 12Z" fill="#ef8442"/>
<path d="M24 22c5 0 9 4.4 9 9.4 0 5.6-4.2 10.6-9 10.6s-9-5-9-10.6c0-5 4-9.4 9-9.4Z" fill="#fbf1e6"/>
<circle cx="17.5" cy="24" r="2.3" fill="#3d3a55"/><circle cx="30.5" cy="24" r="2.3" fill="#3d3a55"/>
<path d="M24 32.5l-2.2-2.2h4.4z" fill="#3d3a55"/>
<path d="M24 32.5v2.2" stroke="#3d3a55" stroke-width="1.4" stroke-linecap="round"/></svg>`,

  panda: `${W}<circle cx="12" cy="12" r="6.5" fill="#3d3a55"/><circle cx="36" cy="12" r="6.5" fill="#3d3a55"/>
<circle cx="24" cy="27" r="16" fill="#fbfaff"/>
<ellipse cx="17" cy="25" rx="5" ry="6" fill="#3d3a55" transform="rotate(-16 17 25)"/>
<ellipse cx="31" cy="25" rx="5" ry="6" fill="#3d3a55" transform="rotate(16 31 25)"/>
<circle cx="17.6" cy="25" r="2" fill="#fbfaff"/><circle cx="30.4" cy="25" r="2" fill="#fbfaff"/>
<ellipse cx="24" cy="32" rx="3" ry="2.2" fill="#3d3a55"/>
<path d="M24 34.2v1.6M24 35.8c-1.5 1.6-3.6 1.2-4.3-.4M24 35.8c1.5 1.6 3.6 1.2 4.3-.4" stroke="#3d3a55" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`,

  frog: `${W}<circle cx="14" cy="14" r="8" fill="#6cc46a"/><circle cx="34" cy="14" r="8" fill="#6cc46a"/>
<circle cx="14" cy="14" r="5" fill="#fbfaff"/><circle cx="34" cy="14" r="5" fill="#fbfaff"/>
<circle cx="14" cy="14.5" r="2.6" fill="#3d3a55"/><circle cx="34" cy="14.5" r="2.6" fill="#3d3a55"/>
<path d="M24 18c10 0 17 5.6 17 12.6C41 37 33.4 42 24 42S7 37 7 30.6C7 23.6 14 18 24 18Z" fill="#6cc46a"/>
<path d="M13 30c3.6 5 7.4 7 11 7s7.4-2 11-7" stroke="#2f7d3c" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<circle cx="14" cy="34" r="2.4" fill="#a4dd9c"/><circle cx="34" cy="34" r="2.4" fill="#a4dd9c"/></svg>`,

  penguin: `${W}<ellipse cx="24" cy="26" rx="16" ry="17" fill="#3d3a55"/>
<ellipse cx="24" cy="29.5" rx="10.5" ry="12" fill="#fbfaff"/>
<circle cx="19" cy="22" r="2.4" fill="#3d3a55"/><circle cx="29" cy="22" r="2.4" fill="#3d3a55"/>
<path d="M24 25.5 29 29l-5 3.4L19 29z" fill="#f2a03c"/>
<path d="M8 28c-3 3-3.6 7-1.6 9.6" stroke="#3d3a55" stroke-width="3.4" fill="none" stroke-linecap="round"/>
<path d="M40 28c3 3 3.6 7 1.6 9.6" stroke="#3d3a55" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>`,
};

/** けっかや しょうぎの おわりに 出す しるし */
const MARK = {
  trophy: `${W}<path d="M14 8h20v9a10 10 0 0 1-20 0z" fill="#f5b731"/>
<path d="M14 11H9v3a7 7 0 0 0 6 6.9" stroke="#e09a1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M34 11h5v3a7 7 0 0 1-6 6.9" stroke="#e09a1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M21 26h6v6h-6z" fill="#e09a1c"/><rect x="14" y="32" width="20" height="5" rx="2.2" fill="#c98615"/>
<path d="M24 12.5l1.7 3.4 3.8.5-2.8 2.6.7 3.7-3.4-1.8-3.4 1.8.7-3.7-2.8-2.6 3.8-.5z" fill="#fff3cf"/></svg>`,

  timer: `${W}<rect x="20" y="5" width="8" height="4" rx="1.6" fill="#5b6b9a"/>
<circle cx="24" cy="27" r="16" fill="#e8eeff" stroke="#5b6b9a" stroke-width="3"/>
<path d="M24 17v10l6.5 4" stroke="#5b6b9a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M36 12l3.4-3.4" stroke="#5b6b9a" stroke-width="3" stroke-linecap="round"/></svg>`,

  party: `${W}<path d="M8 41 20 17l11 11z" fill="#f7a23c"/><path d="M8 41 14.5 28.2 21 34z" fill="#ef7f4e"/>
<circle cx="35" cy="9" r="2.6" fill="#ef6f96"/><circle cx="42" cy="17" r="2.2" fill="#38bdf8"/>
<circle cx="29" cy="6" r="1.8" fill="#f5c542"/><circle cx="40" cy="29" r="2.2" fill="#6cc46a"/>
<circle cx="33" cy="20" r="1.8" fill="#a78bfa"/>
<path d="M25 13c3-3 7-3 9 0" stroke="#ef6f96" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,

  smile: `${W}<circle cx="24" cy="24" r="18" fill="#f7c948"/>
<circle cx="17.5" cy="20" r="2.8" fill="#3d3a55"/><circle cx="30.5" cy="20" r="2.8" fill="#3d3a55"/>
<path d="M14 28c2.8 5 6.4 7 10 7s7.2-2 10-7" stroke="#3d3a55" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,

  /* まけた とき／8 わり 未満の とき。ちからこぶは 58px では 腕に 見えず
     （2026-09-20 に 描いて 確かめた）、ふたばに した＝「また のびる」 */
  sprout: `${W}<ellipse cx="24" cy="41" rx="13" ry="3.2" fill="#e0cfa8"/>
<path d="M24 41V21" stroke="#5f9e4f" stroke-width="3.6" stroke-linecap="round"/>
<path d="M23 29c-9 0-14.5-5.2-14.5-11.6C16.5 17.4 23 21.6 23 29Z" fill="#6cc46a"/>
<path d="M25 25c9 0 14.5-5.2 14.5-11.6C31.5 13.4 25 17.6 25 25Z" fill="#8ed47f"/>
<path d="M14 21.5c3 1.4 6 3.8 7.6 6.2M34 17.5c-3 1.4-6 3.8-7.6 6.2" stroke="#3f7f3a" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`,

  /* ひきわけ。にぎりあう 手は 48px では 板に 見えたので（2026-09-20 に 描いて
     確かめた）、向かいあう 駒 2 まいに した＝しょうぎの 画面らしく、意味も 迷わない */
  draw: `${W}<g fill="#f0dcae" stroke="#b58c4f" stroke-width="1.6" stroke-linejoin="round">
<path d="M13 12 20 15.4 22.6 34H3.4L6 15.4Z"/>
<path d="M35 36 28 32.6 25.4 14h19.2L42 32.6Z"/></g>
<path d="M9 22h8M9 27h8" stroke="#3d3a55" stroke-width="1.8" stroke-linecap="round"/>
<path d="M31 21h8M31 26h8" stroke="#3d3a55" stroke-width="1.8" stroke-linecap="round"/>
<circle cx="24" cy="7" r="2" fill="#f5c542"/></svg>`,
};

/** 絵文字で 保存して あった 古い なまえを 新しい 名まえに 読みかえる */
const OLD = {
  "🐻": "bear", "🐰": "rabbit", "🐱": "cat", "🐶": "dog",
  "🦊": "fox", "🐼": "panda", "🐸": "frog", "🐧": "penguin",
};

/**
 * 保存して あった かおを 今の 名まえに 直す。
 * 絵文字なら 読みかえ、今の 名まえなら その まま、
 * どちらでも ない（こわれた・知らない）なら 先頭の かおに する。
 */
export function migrateFace(stored) {
  if (typeof stored !== "string") return FACE_IDS[0];
  if (FACE_IDS.indexOf(stored) >= 0) return stored;
  return OLD[stored] || FACE_IDS[0];
}

/**
 * かおを 読み上げに わたす ための 辞書の かぎ。
 * 🔴 絵文字だった ころは 文字 そのものが ボタンの 名まえに なって いたので、
 * SVG に した とたん **押せるのに 名前の 無い ボタン**が 8 つ できた
 * （2026-09-20 に CI の 総なめが 検知）。ここで 名前を つけ直す。
 */
export function faceKey(id) {
  const one = migrateFace(id);
  return "dr_face" + one.charAt(0).toUpperCase() + one.slice(1);
}

/** かおの 絵。知らない 名まえは 先頭の かおに 落とす（外から 来た 値を 通さない） */
export function faceSvg(id) {
  return FACE[migrateFace(id)];
}

/** しるしの 絵。知らない 名まえは 何も 返さない */
export function markSvg(id) {
  return Object.prototype.hasOwnProperty.call(MARK, id) ? MARK[id] : "";
}
