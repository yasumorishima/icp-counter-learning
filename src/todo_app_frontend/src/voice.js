/**
 * 読み上げ（端末の 声）を つかう ところを 1 か所に まとめる。
 *
 * ことばの あそびと、さんすうの 文章題の 両方が つかう。
 * **読み上げるのは この サイトでは なく 端末**なので、声を 持たない 端末が ある。
 * そこで だまって 落ちない こと（`say`）と、声が あるかを 知る こと（`watchVoice`）を
 * 同じ かたちで 出す。
 */
import { currentLang } from "./i18n";

/** 声で 読む。声を 持たない 端末でも だまって 先へ 進む（音は 別に 鳴らす） */
export function say(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const line = new window.SpeechSynthesisUtterance(text);
    line.lang = currentLang() === "ja" ? "ja-JP" : "en-US";
    line.rate = 0.8;
    synth.speak(line);
  } catch (error) {
    /* 読み上げが 無くても あそびは 続く */
  }
}

export function stopSpeech() {
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (error) {
    /* 止められなくても 画面遷移は 続ける */
  }
}

// 声の 一覧を 待つ 長さ。Chrome は 開いた 直後は 空で、あとから voiceschanged で 届く
const VOICE_WAIT_MS = 1500;

/**
 * この 端末に その ことばの 声が あるか 見て、report(true / false) で 知らせる。
 * すぐ 見つからなくても VOICE_WAIT_MS までは 待つ。待った あとに 声が 届いたら
 * report(true) を もう 一度 呼ぶ（遅れて 届く 端末で 一行を 出しっぱなしに しない）。
 * かえり値の stop で 見るのを やめ、recheck で 見直す（声の 一覧が 変わっても
 * 知らせを 出さない 端末＝Safari 15 以前 などの ために、さわった ときに 呼ぶ）。
 */
export function watchVoice(lang, report) {
  const want = lang.slice(0, 2).toLowerCase();
  let synth = null;
  try {
    synth = window.speechSynthesis || null;
  } catch (error) {
    synth = null;
  }
  if (!synth || typeof synth.getVoices !== "function") {
    report(false);
    return { stop() {}, recheck() {} };
  }
  const has = () => {
    try {
      return synth.getVoices().some(voice =>
        String(voice.lang || "").toLowerCase().replace("_", "-").startsWith(want));
    } catch (error) {
      return false;
    }
  };
  let stopped = false;
  let decided = false;
  let timer = 0;
  const decide = ok => {
    decided = true;
    report(ok);
  };
  const onChange = () => {
    if (stopped || !has()) return;
    window.clearTimeout(timer);
    decide(true);
  };
  if (has()) {
    decide(true);
  } else {
    try {
      synth.addEventListener("voiceschanged", onChange);
    } catch (error) {
      /* 知らせを 受けられない 端末は 待つ だけ（さわった ときに recheck で 見直す） */
    }
    timer = window.setTimeout(() => {
      if (!stopped) decide(has());
    }, VOICE_WAIT_MS);
  }
  return {
    stop() {
      stopped = true;
      window.clearTimeout(timer);
      try {
        synth.removeEventListener("voiceschanged", onChange);
      } catch (error) {
        /* 外せなくても stopped で 止まる */
      }
    },
    recheck() {
      if (!stopped && decided) report(has());
    },
  };
}
