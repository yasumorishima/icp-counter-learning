/**
 * あそびの 絵。すべて 自前で 描く（絵文字は 端末に よって 出ないので 使わない）。
 * 中身は 固定の 文字列だけ＝外から 来た 値を 入れない。
 */

/** 100x100 の 絵を 1 枚 作る */
function svg(body) {
  const wrap = document.createElement("span");
  wrap.className = "as-illust";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>";
  return wrap;
}

const D = {
  neko:
    '<path d="M24 46 L19 18 L43 33 Z" fill="#f0a868"/><path d="M76 46 L81 18 L57 33 Z" fill="#f0a868"/>' +
    '<circle cx="50" cy="58" r="30" fill="#f8c48d"/>' +
    '<path d="M6 56 L26 60 M6 70 L26 66" stroke="#c98a52" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M94 56 L74 60 M94 70 L74 66" stroke="#c98a52" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="39" cy="55" r="5" fill="#3b2a1d"/><circle cx="61" cy="55" r="5" fill="#3b2a1d"/>' +
    '<path d="M45 66 h10 l-5 5 Z" fill="#e4736e"/>' +
    '<path d="M42 75 q8 7 16 0" stroke="#3b2a1d" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
  inu:
    '<ellipse cx="20" cy="56" rx="11" ry="22" fill="#a9793f"/><ellipse cx="80" cy="56" rx="11" ry="22" fill="#a9793f"/>' +
    '<circle cx="50" cy="56" r="29" fill="#e3b47a"/>' +
    '<circle cx="39" cy="52" r="5" fill="#3b2a1d"/><circle cx="61" cy="52" r="5" fill="#3b2a1d"/>' +
    '<ellipse cx="50" cy="67" rx="8" ry="6" fill="#3b2a1d"/>' +
    '<path d="M50 73 v6 M50 79 q-7 6 -13 1 M50 79 q7 6 13 1" stroke="#3b2a1d" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  usagi:
    '<ellipse cx="36" cy="26" rx="9" ry="24" fill="#f6f2ef"/><ellipse cx="36" cy="28" rx="4" ry="16" fill="#f7bcc8"/>' +
    '<ellipse cx="64" cy="26" rx="9" ry="24" fill="#f6f2ef"/><ellipse cx="64" cy="28" rx="4" ry="16" fill="#f7bcc8"/>' +
    '<circle cx="50" cy="66" r="26" fill="#f6f2ef"/>' +
    '<circle cx="40" cy="62" r="4.6" fill="#3b2a1d"/><circle cx="60" cy="62" r="4.6" fill="#3b2a1d"/>' +
    '<path d="M45 72 h10 l-5 5 Z" fill="#f28fa4"/>' +
    '<path d="M50 77 q-6 6 -11 2 M50 77 q6 6 11 2" stroke="#c9a99c" stroke-width="3" fill="none" stroke-linecap="round"/>',
  kuma:
    '<circle cx="24" cy="30" r="13" fill="#9c6b45"/><circle cx="76" cy="30" r="13" fill="#9c6b45"/>' +
    '<circle cx="24" cy="30" r="6" fill="#c99a72"/><circle cx="76" cy="30" r="6" fill="#c99a72"/>' +
    '<circle cx="50" cy="58" r="30" fill="#b8825a"/>' +
    '<ellipse cx="50" cy="70" rx="17" ry="13" fill="#e8cba9"/>' +
    '<circle cx="38" cy="50" r="4.8" fill="#3b2a1d"/><circle cx="62" cy="50" r="4.8" fill="#3b2a1d"/>' +
    '<ellipse cx="50" cy="65" rx="7" ry="5" fill="#3b2a1d"/>' +
    '<path d="M50 70 v4 M50 74 q-6 5 -11 1 M50 74 q6 5 11 1" stroke="#3b2a1d" stroke-width="3" fill="none" stroke-linecap="round"/>',
  zou:
    '<ellipse cx="22" cy="46" rx="16" ry="20" fill="#9aa7b8"/><ellipse cx="78" cy="46" rx="16" ry="20" fill="#9aa7b8"/>' +
    '<circle cx="50" cy="48" r="26" fill="#b3c0d1"/>' +
    '<path d="M40 62 q10 8 10 18 q0 10 -9 12 q-6 1 -8 -4" stroke="#b3c0d1" stroke-width="13" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="44" r="4.6" fill="#3b2a1d"/><circle cx="62" cy="44" r="4.6" fill="#3b2a1d"/>',
  sakana:
    '<path d="M78 50 L96 34 L96 66 Z" fill="#f59e4b"/>' +
    '<ellipse cx="48" cy="50" rx="34" ry="23" fill="#fbb040"/>' +
    '<path d="M46 27 q10 6 12 14 q-12 -3 -12 -14 Z" fill="#f59e4b"/>' +
    '<circle cx="26" cy="45" r="5.4" fill="#ffffff"/><circle cx="25" cy="45" r="3" fill="#3b2a1d"/>' +
    '<path d="M52 62 q10 -4 20 -2" stroke="#e08a2c" stroke-width="3" fill="none" stroke-linecap="round"/>',
  tori:
    '<ellipse cx="52" cy="56" rx="27" ry="24" fill="#5ec4f0"/>' +
    '<circle cx="34" cy="38" r="18" fill="#8ed8f6"/>' +
    '<path d="M18 38 L4 44 L18 47 Z" fill="#f7a13b"/>' +
    '<circle cx="31" cy="35" r="4.2" fill="#3b2a1d"/>' +
    '<ellipse cx="60" cy="58" rx="15" ry="10" fill="#3fb0e2"/>' +
    '<path d="M76 70 L94 78 L74 80 Z" fill="#3fb0e2"/>' +
    '<path d="M44 78 v10 M60 78 v10" stroke="#f7a13b" stroke-width="4" stroke-linecap="round"/>',
  cho:
    '<ellipse cx="30" cy="36" rx="21" ry="17" fill="#f472b6" transform="rotate(-18 30 36)"/>' +
    '<ellipse cx="70" cy="36" rx="21" ry="17" fill="#f472b6" transform="rotate(18 70 36)"/>' +
    '<ellipse cx="33" cy="66" rx="16" ry="13" fill="#a78bfa" transform="rotate(16 33 66)"/>' +
    '<ellipse cx="67" cy="66" rx="16" ry="13" fill="#a78bfa" transform="rotate(-16 67 66)"/>' +
    '<ellipse cx="50" cy="52" rx="5" ry="26" fill="#4b3b6b"/>' +
    '<path d="M48 28 q-8 -12 -16 -14 M52 28 q8 -12 16 -14" stroke="#4b3b6b" stroke-width="3" fill="none" stroke-linecap="round"/>',
  hana:
    '<path d="M50 62 v30" stroke="#4aa564" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M50 78 q16 -4 20 -16 q-18 -2 -20 16 Z" fill="#4aa564"/>' +
    '<circle cx="50" cy="24" r="15" fill="#f472b6"/><circle cx="26" cy="42" r="15" fill="#f472b6"/>' +
    '<circle cx="74" cy="42" r="15" fill="#f472b6"/><circle cx="35" cy="68" r="15" fill="#f472b6"/>' +
    '<circle cx="65" cy="68" r="15" fill="#f472b6"/><circle cx="50" cy="46" r="14" fill="#fbbf24"/>',
  ringo:
    '<path d="M50 26 q-30 -6 -30 30 q0 34 24 38 q6 1 6 -4 q0 5 6 4 q24 -4 24 -38 q0 -36 -30 -30 Z" fill="#ef4444"/>' +
    '<path d="M50 26 v-14" stroke="#7a4a24" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M52 16 q16 -12 24 -2 q-12 12 -24 2 Z" fill="#4aa564"/>' +
    '<ellipse cx="36" cy="46" rx="7" ry="10" fill="#ffffff" opacity="0.45" transform="rotate(-20 36 46)"/>',
  kuruma:
    '<path d="M22 52 L32 30 q2 -5 8 -5 h20 q6 0 8 5 L78 52 Z" fill="#93c5fd"/>' +
    '<rect x="10" y="50" width="80" height="26" rx="10" fill="#ef4444"/>' +
    '<rect x="34" y="32" width="32" height="18" rx="4" fill="#e0f2fe"/>' +
    '<circle cx="30" cy="78" r="12" fill="#3b2a1d"/><circle cx="30" cy="78" r="5" fill="#cbd5e1"/>' +
    '<circle cx="70" cy="78" r="12" fill="#3b2a1d"/><circle cx="70" cy="78" r="5" fill="#cbd5e1"/>' +
    '<circle cx="86" cy="58" r="4" fill="#fde68a"/>',
  densha:
    '<rect x="16" y="18" width="68" height="58" rx="12" fill="#34d399"/>' +
    '<rect x="24" y="28" width="22" height="18" rx="4" fill="#e0f2fe"/>' +
    '<rect x="54" y="28" width="22" height="18" rx="4" fill="#e0f2fe"/>' +
    '<rect x="16" y="54" width="68" height="8" fill="#f8fafc"/>' +
    '<circle cx="34" cy="70" r="5" fill="#fde68a"/><circle cx="66" cy="70" r="5" fill="#fde68a"/>' +
    '<circle cx="32" cy="84" r="8" fill="#3b2a1d"/><circle cx="68" cy="84" r="8" fill="#3b2a1d"/>' +
    '<path d="M8 92 h84" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>',
  tsuki:
    '<path d="M62 8 a42 42 0 1 0 24 74 A34 34 0 1 1 62 8 Z" fill="#fbbf24"/>' +
    '<circle cx="20" cy="16" r="4" fill="#fde68a"/><circle cx="86" cy="30" r="3" fill="#fde68a"/>' +
    '<circle cx="14" cy="76" r="3" fill="#fde68a"/>',
  kasa:
    '<path d="M8 52 q6 -40 42 -40 q36 0 42 40 q-10 -8 -21 0 q-11 -8 -21 0 q-10 -8 -21 0 q-11 -8 -21 0 Z" fill="#f472b6"/>' +
    '<path d="M50 52 v30 q0 10 -12 10 q-8 0 -9 -7" stroke="#7a4a24" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="10" r="4" fill="#7a4a24"/>',
  pen:
    '<path d="M12 84 q10 -48 42 -62" stroke="#f472b6" stroke-width="10" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 88 q28 -22 58 -14" stroke="#38bdf8" stroke-width="10" fill="none" stroke-linecap="round"/>' +
    '<path d="M58 18 q20 12 24 34" stroke="#fbbf24" stroke-width="10" fill="none" stroke-linecap="round"/>',
  oto:
    '<rect x="10" y="18" width="80" height="13" rx="6" fill="#f472b6"/>' +
    '<rect x="14" y="37" width="72" height="13" rx="6" fill="#fbbf24"/>' +
    '<rect x="18" y="56" width="64" height="13" rx="6" fill="#34d399"/>' +
    '<rect x="22" y="75" width="56" height="13" rx="6" fill="#38bdf8"/>',
};

/** ことばの 一覧。読み上げにも 使うので、文字は そのまま 読める ものだけ */
export const WORDS = [
  { id: "neko", ja: "ねこ", en: "cat" },
  { id: "inu", ja: "いぬ", en: "dog" },
  { id: "usagi", ja: "うさぎ", en: "rabbit" },
  { id: "kuma", ja: "くま", en: "bear" },
  { id: "zou", ja: "ぞう", en: "elephant" },
  { id: "sakana", ja: "さかな", en: "fish" },
  { id: "tori", ja: "とり", en: "bird" },
  { id: "cho", ja: "ちょう", en: "butterfly" },
  { id: "hana", ja: "はな", en: "flower" },
  { id: "ringo", ja: "りんご", en: "apple" },
  { id: "kuruma", ja: "くるま", en: "car" },
  { id: "densha", ja: "でんしゃ", en: "train" },
  { id: "tsuki", ja: "つき", en: "moon" },
  { id: "kasa", ja: "かさ", en: "umbrella" },
];

export function illust(id) {
  return svg(D[id] || D.neko);
}
