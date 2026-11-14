/* 16th DNA layout mockup: paints sample 16th DNA screens into every surface of the Holodex room.
   Sample numbers only (marked as a mockup) — the real build reads live data from the 16th DNA engine. */
(() => {
const C = { cy: "#7fe3ff", cy2: "#bff3ff", wh: "#f2fbff", dim: "#9cc4e6", gr: "#2ee6a8", rd: "#ff5a76", am: "#ffc14d", ink: "#04203a", glow: "rgba(90,200,255,.9)" };
const FD = "Orbitron, Rajdhani, sans-serif", FB = "Rajdhani, Inter, sans-serif", FM = "'Share Tech Mono', monospace";
const T = (g, s, x, y, size, col, al, w, font) => { g.font = (w || 700) + " " + Math.round(size) + "px " + (font || FB); g.fillStyle = col || C.wh; g.textAlign = al || "left"; g.textBaseline = "alphabetic"; g.shadowColor = C.glow; g.shadowBlur = size * .35; g.fillText(s, x, y); g.shadowBlur = 0; };
const head = (g, W, H, title, tag, k) => { k = k || H / 400; T(g, title, 22 * k, 46 * k, 30 * k, C.cy2, "left", 800, FD); if (tag) { T(g, tag, W - 22 * k, 44 * k, 20 * k, tag.includes("LIVE") ? C.gr : C.am, "right", 700, FD); }
  g.fillStyle = "rgba(127,227,255,.45)"; g.fillRect(22 * k, 60 * k, W - 44 * k, 2 * k); };
const pill = (g, x, y, w, h, label, col, fill) => { g.save(); g.shadowColor = col; g.shadowBlur = h * .5; g.fillStyle = fill ? col : "rgba(10,40,90,.55)"; g.strokeStyle = col; g.lineWidth = Math.max(2, h * .06);
  const r = h / 2; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); g.shadowBlur = 0; g.stroke(); g.restore();
  T(g, label, x + w / 2, y + h * .68, h * .5, fill ? C.ink : col, "center", 800, FD); };
const btn = (g, x, y, w, h, label, col, sub) => { g.save(); g.shadowColor = col; g.shadowBlur = 26; const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(10,40,90,.85)");
  g.fillStyle = gr; g.globalAlpha = .9; g.fillRect(x, y, w, h); g.globalAlpha = 1; g.shadowBlur = 0; g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); g.restore();
  T(g, label, x + w / 2, y + h * (sub ? .52 : .64), Math.min(h * .42, w * .16), C.wh, "center", 900, FD); if (sub) T(g, sub, x + w / 2, y + h * .82, h * .2, C.cy2, "center", 700, FM); };
/* deterministic sample candles */
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const BARS = (() => { const out = []; let p = 66200; for (let i = 0; i < 64; i++) { const o = p, c = o * (1 + (rnd() - .46) * .006), h = Math.max(o, c) * (1 + rnd() * .0016), l = Math.min(o, c) * (1 - rnd() * .0016); out.push({ o, h, l, c }); p = c; } return out; })();
const ema = (n) => { const k = 2 / (n + 1); let e = BARS[0].c; return BARS.map(b => (e = b.c * k + e * (1 - k))); };
const WATCH = [["BTC", "67,171", "+1.2%"], ["ETH", "3,544", "+1.3%"], ["SOL", "200.7", "+3.3%"], ["XRP", "0.581", "-0.4%"], ["DOGE", "0.142", "+2.1%"], ["ADA", "0.462", "-0.8%"], ["AVAX", "34.20", "+0.6%"], ["LINK", "15.61", "+1.9%"], ["LTC", "84.50", "-0.2%"]];
const STRATS = [["EMA BREAKOUT", "SIGNAL", C.gr], ["DONCHIAN TREND", "WAIT", C.am], ["RSI REVERSION", "NO SETUP", C.dim], ["BOLLINGER FADE", "WAIT", C.am], ["ATR MOMENTUM", "SIGNAL", C.gr], ["RANGE BREAKOUT", "NO SETUP", C.dim]];

function chart(g, x, y, w, h) { const lo = Math.min(...BARS.map(b => b.l)), hi = Math.max(...BARS.map(b => b.h)), Y = v => y + h - (v - lo) / (hi - lo) * h, bw = w / BARS.length;
  g.strokeStyle = "rgba(127,227,255,.12)"; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x, y + h * i / 5); g.lineTo(x + w, y + h * i / 5); g.stroke(); }
  BARS.forEach((b, i) => { const up = b.c >= b.o, cx = x + i * bw + bw / 2, col = up ? C.gr : C.rd; g.strokeStyle = col; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 8; g.lineWidth = Math.max(1.5, bw * .12);
    g.beginPath(); g.moveTo(cx, Y(b.h)); g.lineTo(cx, Y(b.l)); g.stroke(); g.fillRect(cx - bw * .32, Y(Math.max(b.o, b.c)), bw * .64, Math.max(2, Math.abs(Y(b.o) - Y(b.c)))); });
  g.shadowBlur = 0; [[ema(21), C.am], [ema(55), "#b48cff"]].forEach(([e, col]) => { g.strokeStyle = col; g.lineWidth = 3; g.shadowColor = col; g.shadowBlur = 10; g.beginPath(); e.forEach((v, i) => { const px = x + i * bw + bw / 2; i ? g.lineTo(px, Y(v)) : g.moveTo(px, Y(v)); }); g.stroke(); }); g.shadowBlur = 0;
  const last = BARS[BARS.length - 1].c; g.setLineDash([10, 8]); g.strokeStyle = C.cy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y(last)); g.lineTo(x + w, Y(last)); g.stroke(); g.setLineDash([]); }

const WALL = {
  tickers: (g, W, H) => { const k = H / 400; head(g, W, H, "WATCHLIST", "LIVE", k); WATCH.forEach((r, i) => { const y = (100 + i * 32) * k; T(g, r[0], 24 * k, y, 22 * k, C.wh, "left", 800, FD); T(g, r[1], W * .66, y, 20 * k, C.cy2, "right", 700, FM); T(g, r[2], W - 22 * k, y, 20 * k, r[2][0] === "-" ? C.rd : C.gr, "right", 700, FM); }); },
  heat: (g, W, H) => { const k = H / 400; head(g, W, H, "COACH", null, k); pill(g, W * .14, 84 * k, W * .72, 70 * k, "WAIT", C.am, true); T(g, "No live signal yet", W / 2, 186 * k, 22 * k, C.wh, "center", 700);
    [["✓", "Trend is up (EMA 21 > 55)", C.gr], ["✓", "Fees covered by the target", C.gr], ["✕", "No strategy fired this candle", C.rd], ["✓", "Size fits your daily stop", C.gr]].forEach((c, i) => { const y = (232 + i * 38) * k; T(g, c[0], 26 * k, y, 24 * k, c[2], "left", 900); T(g, c[1], 60 * k, y, 19 * k, C.dim, "left", 600); }); },
  chart: (g, W, H) => { const k = H / 400; T(g, "BTC-USD", 26 * k, 48 * k, 34 * k, C.wh, "left", 900, FD); T(g, "15m", 220 * k, 48 * k, 24 * k, C.cy, "left", 700, FD); T(g, "67,171.00", W * .55, 48 * k, 34 * k, C.wh, "center", 800, FM); T(g, "▲ 1.21%", W * .73, 48 * k, 26 * k, C.gr, "center", 800, FM);
    pill(g, W - 170 * k, 22 * k, 146 * k, 34 * k, "● LIVE", C.gr); chart(g, 26 * k, 74 * k, W - 52 * k, 250 * k);
    const tabs = ["CHART", "BOOK", "COACH", "JOURNAL", "PROGRESS", "ACCOUNT"], tw = (W - 52 * k) / tabs.length; tabs.forEach((t, i) => pill(g, 26 * k + i * tw + 6 * k, 340 * k, tw - 12 * k, 40 * k, t, C.cy, i === 0)); },
  movers: (g, W, H) => { const k = H / 400; head(g, W, H, "ACCOUNT", "LIVE", k); T(g, "$7.74", 24 * k, 140 * k, 64 * k, C.wh, "left", 900, FM); T(g, "USDC AVAILABLE", 26 * k, 172 * k, 18 * k, C.dim, "left", 700, FD);
    [["BTC", "0.0000738"], ["TRADES", "1"], ["BADGES", "3 / 14"], ["DAILY STOP", "$0.50"]].forEach((r, i) => { const y = (226 + i * 40) * k; T(g, r[0], 26 * k, y, 19 * k, C.dim, "left", 700, FD); T(g, r[1], W - 24 * k, y, 22 * k, C.wh, "right", 700, FM); }); },
  sectors: (g, W, H) => { const k = H / 400; head(g, W, H, "STRATEGIES", "6 CHECKED", k); STRATS.forEach((s, i) => { const y = (88 + i * 50) * k; T(g, s[0], 24 * k, y + 28 * k, 19 * k, C.wh, "left", 800, FD); pill(g, W - 150 * k, y + 6 * k, 128 * k, 30 * k, s[1], s[2], s[1] === "SIGNAL");
    for (let j = 0; j < 3; j++) { g.fillStyle = s[1] === "SIGNAL" || j === 0 ? C.gr : "rgba(160,200,230,.3)"; g.beginPath(); g.arc(28 * k + j * 18 * k, y + 42 * k, 5 * k, 0, 7); g.fill(); } }); }
};
const ROW = { positions: ["ASK", "the teacher", C.cy], focus: ["SELL", "practice · live", C.rd], trades: ["BTC-USD", "67,171.00 ▲1.2%", "#4a8bff"], mheat: ["BUY", "practice · live", C.gr], pnl: ["SETTINGS", "AI · broker · desk", C.cy] };
const PAD = {
  chart: (g, W, H) => { const k = H / 480; head(g, W, H, "TIMEFRAME", null, k); ["1m", "5m", "15m", "30m", "1h", "1D"].forEach((t, i) => pill(g, (22 + (i % 3) * 244) * k, (90 + Math.floor(i / 3) * 90) * k, 226 * k, 70 * k, t, C.cy, t === "15m"));
    T(g, "INDICATORS", 22 * k, 300 * k, 22 * k, C.dim, "left", 700, FD); ["EMA", "RSI", "MACD", "VOL"].forEach((t, i) => pill(g, (22 + i * 182) * k, 320 * k, 166 * k, 62 * k, t, C.am, i === 0)); },
  order: (g, W, H) => { const k = H / 480; head(g, W, H, "CONNECT", null, k); btn(g, 22 * k, 92 * k, W - 44 * k, 110 * k, "CONNECT AI", "#3b8cff", "● Claude built in · model locked"); btn(g, 22 * k, 222 * k, W - 44 * k, 110 * k, "BROKER", "#1fae7a", "● Coinbase · live");
    pill(g, 22 * k, 356 * k, (W - 60 * k) / 2, 62 * k, "DEV MODE", C.cy); pill(g, 38 * k + (W - 60 * k) / 2, 356 * k, (W - 60 * k) / 2, 62 * k, "EDIT DESK", C.cy); },
  ctrl: (g, W, H) => { const k = H / 660; head(g, W, H, "DESK", null, k); ["COACH", "LESSONS", "RESEARCH", "JOURNAL", "PROGRESS", "PLATFORMS"].forEach((t, i) => btn(g, (22 + (i % 2) * 372) * k, (96 + Math.floor(i / 2) * 170) * k, 352 * k, 150 * k, t, "#2f7fe6")); }
};
window.DNA_PAINT = function (kind, id, g, W, H) {
  g.save();
  if (kind === "wall" && WALL[id]) WALL[id](g, W, H);
  else if (kind === "row" && ROW[id]) { const [a, b, col] = ROW[id]; btn(g, W * .04, H * .1, W * .92, H * .8, a, col, b); }
  else if (kind === "pad" && PAD[id]) PAD[id](g, W, H);
  else if (kind === "ticket") { const k = H / 400; head(g, W, H, "ORDER TICKET", "COACH PLAN", k); pill(g, 22 * k, 80 * k, 150 * k, 44 * k, "BUY", C.gr, true); T(g, "BTC-USD · LIMIT", 190 * k, 112 * k, 26 * k, C.wh, "left", 800, FD);
    [["ENTRY", "66,900.00", C.cy2], ["STOP", "66,420.00", C.rd], ["TARGET", "67,860.00", C.gr], ["SIZE", "$5.00", C.wh]].forEach((r, i) => { const x = (22 + (i % 2) * 300) * k, y = (170 + Math.floor(i / 2) * 64) * k; T(g, r[0], x, y, 17 * k, C.dim, "left", 700, FD); T(g, r[1], x, y + 30 * k, 28 * k, r[2], "left", 700, FM); });
    btn(g, 22 * k, 312 * k, 282 * k, 70 * k, "PREVIEW", "#3b8cff"); btn(g, 336 * k, 312 * k, 282 * k, 70 * k, "PLACE", "#1fae7a"); }
  else if (kind === "watch") { const k = H / 340; head(g, W, H, "LEARN", null, k); ["COACH", "LESSONS", "RESEARCH", "JOURNAL"].forEach((t, i) => pill(g, (20 + (i % 2) * 240) * k, (84 + Math.floor(i / 2) * 120) * k, 224 * k, 90 * k, t, C.cy, i === 0)); }
  else if (kind === "signals") { const k = H / 340; head(g, W, H, "ORDERS", "LIVE", k); T(g, "FILLED", 22 * k, 120 * k, 24 * k, C.gr, "left", 900, FD); T(g, "BUY $5.00 BTC", 22 * k, 158 * k, 26 * k, C.wh, "left", 800, FD); T(g, "@ 67,171.00 · fee $0.045", 22 * k, 196 * k, 20 * k, C.dim, "left", 600, FM); pill(g, 22 * k, 240 * k, W - 44 * k, 64 * k, "OPEN ORDERS · 0", C.cy); }
  else if (kind === "tile") { const r = WATCH[id % WATCH.length]; T(g, r[0], 24, 76, 52, C.wh, "left", 900, FD); T(g, r[1], 24, 150, 38, C.cy2, "left", 700, FM); T(g, r[2], 24, 206, 34, r[2][0] === "-" ? C.rd : C.gr, "left", 800, FM); }
  else if (kind === "station") { const i = Math.abs(String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 6, s = STRATS[i]; T(g, s[0], W / 2, H * .42, Math.min(W * .1, H * .16), C.wh, "center", 900, FD); pill(g, W * .25, H * .56, W * .5, H * .2, s[1], s[2], s[1] === "SIGNAL"); }
  else if (kind === "ring") { let x = 20; WATCH.concat(WATCH).forEach(r => { T(g, r[0] + " " + r[1] + " " + r[2] + "   ·   ", x, H * .72, H * .6, r[2][0] === "-" ? C.rd : C.cy2, "left", 700, FM); x += g.measureText(r[0] + " " + r[1] + " " + r[2] + "   ·   ").width; }); }
  g.restore();
};
})();
