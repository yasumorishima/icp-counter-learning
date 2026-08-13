/**
 * 音と かみふぶき。外の部品は 使わない（読み込みが増えず、電波が無くても鳴る）。
 * 音は 端末の設定とは別に、この場で 切れるようにする。
 */

const SOUND_KEY = "drill.sound";
let context = null;
let enabled = true;

try {
  enabled = localStorage.getItem(SOUND_KEY) !== "off";
} catch (error) {
  /* 保存できない環境では 鳴る側にしておく */
}

export function soundOn() {
  return enabled;
}

export function toggleSound() {
  enabled = !enabled;
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch (error) {
    /* 記憶できなくても その場の切り替えは効く */
  }
  return enabled;
}

/** 最初の操作までは 音を作れない決まりなので、押されたときに用意する */
function ready() {
  if (!enabled) return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") context.resume();
  return context;
}

function tone(freqs, duration, type, volume) {
  const ctx = ready();
  if (!ctx) return;
  const now = ctx.currentTime;
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.075;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.16, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  });
}

export const sounds = {
  right: () => tone([784, 1047], 0.16, "sine", 0.16),
  wrong: () => tone([220, 165], 0.22, "triangle", 0.12),
  finish: () => tone([523, 659, 784, 1047], 0.28, "sine", 0.16),
  levelUp: () => tone([659, 784, 988, 1319], 0.3, "sine", 0.18),
  tick: () => tone([440], 0.05, "square", 0.05),
};

/** かみふぶき。1 回だけ 舞って 消える */
export function confetti(canvas, count) {
  if (!canvas) return;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const scale = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 320;
  const height = canvas.clientHeight || 240;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const g = canvas.getContext("2d");
  g.setTransform(scale, 0, 0, scale, 0, 0);

  const colors = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399"];
  const bits = Array.from({ length: count || 90 }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.6,
    w: 6 + Math.random() * 7,
    h: 8 + Math.random() * 10,
    vy: 1.6 + Math.random() * 2.4,
    vx: -1 + Math.random() * 2,
    spin: -0.2 + Math.random() * 0.4,
    angle: Math.random() * Math.PI,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  let frames = 0;
  const step = () => {
    frames += 1;
    g.clearRect(0, 0, width, height);
    bits.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.angle += b.spin;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.angle);
      g.fillStyle = b.color;
      g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      g.restore();
    });
    if (frames < 150) requestAnimationFrame(step);
    else g.clearRect(0, 0, width, height);
  };
  requestAnimationFrame(step);
}
