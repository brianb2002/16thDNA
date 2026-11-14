/* ================= 16th DNA Pro Chart =================
   A full professional chart: candles / hollow / Heikin Ashi / bars / line / area, log scale, zoom and pan,
   crosshair with OHLC + indicator readout, 30 indicators with settings, drawing tools (trend line, ray, extended,
   horizontal, vertical, rectangle, Fibonacci, measure, note), and chart settings. Saved per viewer in localStorage.
   Usage: const pc = ProChart(hostEl, { theme, getBars, onTf, tfs, tf, sym, compact }); pc.setBars(bars); pc.destroy();
   bars: [{t (seconds), o, h, l, c, v}] oldest first. */
(() => {
"use strict";
const LS = "dna_prochart_v1";
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } };
const save = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} };
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------- indicator math ---------------- */
const nan = n => new Array(n).fill(NaN);
const sma = (a, n) => { const o = nan(a.length); let s = 0, c = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (isFinite(v)) { s += v; c++; } if (i >= n) { const u = a[i - n]; if (isFinite(u)) { s -= u; c--; } } if (i >= n - 1 && c === n) o[i] = s / n; } return o; };
const ema = (a, n) => { const o = nan(a.length), k = 2 / (n + 1); let e = NaN; for (let i = 0; i < a.length; i++) { const v = a[i]; if (!isFinite(v)) continue; e = isFinite(e) ? v * k + e * (1 - k) : v; if (i >= n - 1) o[i] = e; } return o; };
const rma = (a, n) => { const o = nan(a.length); let e = NaN, s = 0, c = 0; for (let i = 0; i < a.length; i++) { const v = a[i]; if (!isFinite(v)) continue; if (!isFinite(e)) { s += v; c++; if (c === n) { e = s / n; o[i] = e; } } else { e = (e * (n - 1) + v) / n; o[i] = e; } } return o; };
const wma = (a, n) => { const o = nan(a.length), d = n * (n + 1) / 2; for (let i = n - 1; i < a.length; i++) { let s = 0; for (let j = 0; j < n; j++) s += a[i - j] * (n - j); o[i] = s / d; } return o; };
const hma = (a, n) => { const w1 = wma(a, Math.max(1, Math.round(n / 2))), w2 = wma(a, n); return wma(w1.map((v, i) => 2 * v - w2[i]).map(v => isFinite(v) ? v : 0), Math.max(1, Math.round(Math.sqrt(n)))).map((v, i) => i < n + Math.sqrt(n) ? NaN : v); };
const stdev = (a, n) => { const m = sma(a, n), o = nan(a.length); for (let i = n - 1; i < a.length; i++) { let s = 0; for (let j = 0; j < n; j++) s += (a[i - j] - m[i]) ** 2; o[i] = Math.sqrt(s / n); } return o; };
const hh = (a, n) => a.map((_, i) => i < n - 1 ? NaN : Math.max(...a.slice(i - n + 1, i + 1)));
const ll = (a, n) => a.map((_, i) => i < n - 1 ? NaN : Math.min(...a.slice(i - n + 1, i + 1)));
const tr = B => B.map((b, i) => i ? Math.max(b.h - b.l, Math.abs(b.h - B[i - 1].c), Math.abs(b.l - B[i - 1].c)) : b.h - b.l);
const atr = (B, n) => rma(tr(B), n);
const C_ = B => B.map(b => b.c), H_ = B => B.map(b => b.h), L_ = B => B.map(b => b.l), V_ = B => B.map(b => b.v || 0), TP = B => B.map(b => (b.h + b.l + b.c) / 3);
const rsi = (a, n) => { const up = a.map((v, i) => i ? Math.max(v - a[i - 1], 0) : NaN), dn = a.map((v, i) => i ? Math.max(a[i - 1] - v, 0) : NaN), u = rma(up, n), d = rma(dn, n); return u.map((x, i) => d[i] === 0 ? 100 : 100 - 100 / (1 + x / d[i])); };
const stoch = (B, n, k, d) => { const h = hh(H_(B), n), l = ll(L_(B), n), raw = B.map((b, i) => (b.c - l[i]) / ((h[i] - l[i]) || 1) * 100), K = sma(raw, k); return [K, sma(K, d)]; };

/* id: [name, kind ("over" draws on price, "pane" gets its own panel), defaults, compute(B, p) -> [{v:array, col, w, type?}] , levels?] */
const IND = {
  sma: ["SMA · Simple moving average", "over", { len: 20, col: "#ffc14d" }, (B, p) => [{ v: sma(C_(B), p.len), col: p.col }]],
  ema: ["EMA · Exponential moving average", "over", { len: 21, col: "#ff9f43" }, (B, p) => [{ v: ema(C_(B), p.len), col: p.col }]],
  wma: ["WMA · Weighted moving average", "over", { len: 20, col: "#feca57" }, (B, p) => [{ v: wma(C_(B), p.len), col: p.col }]],
  hma: ["HMA · Hull moving average", "over", { len: 21, col: "#48dbfb" }, (B, p) => [{ v: hma(C_(B), p.len), col: p.col }]],
  vwma: ["VWMA · Volume-weighted MA", "over", { len: 20, col: "#ff6b9d" }, (B, p) => { const pv = sma(B.map(b => b.c * (b.v || 0)), p.len), v = sma(V_(B), p.len); return [{ v: pv.map((x, i) => x / (v[i] || 1)), col: p.col }]; }],
  vwap: ["VWAP · Volume-weighted average price", "over", { col: "#a29bfe" }, (B, p) => { let pv = 0, vv = 0, day = -1; return [{ v: B.map(b => { const d = Math.floor(b.t / 86400); if (d !== day) { day = d; pv = 0; vv = 0; } const tp = (b.h + b.l + b.c) / 3; pv += tp * (b.v || 0); vv += (b.v || 0); return vv ? pv / vv : tp; }), col: p.col }]; }],
  bb: ["Bollinger Bands", "over", { len: 20, mult: 2, col: "#54a0ff" }, (B, p) => { const m = sma(C_(B), p.len), s = stdev(C_(B), p.len); return [{ v: m, col: p.col, w: 1 }, { v: m.map((x, i) => x + p.mult * s[i]), col: p.col, band: 1 }, { v: m.map((x, i) => x - p.mult * s[i]), col: p.col, band: 2 }]; }],
  kc: ["Keltner Channels", "over", { len: 20, mult: 2, col: "#1dd1a1" }, (B, p) => { const m = ema(C_(B), p.len), a = atr(B, p.len); return [{ v: m, col: p.col, w: 1 }, { v: m.map((x, i) => x + p.mult * a[i]), col: p.col, band: 1 }, { v: m.map((x, i) => x - p.mult * a[i]), col: p.col, band: 2 }]; }],
  dc: ["Donchian Channels", "over", { len: 20, col: "#5f27cd" }, (B, p) => { const u = hh(H_(B), p.len), l = ll(L_(B), p.len); return [{ v: u, col: p.col, band: 1 }, { v: l, col: p.col, band: 2 }, { v: u.map((x, i) => (x + l[i]) / 2), col: p.col, w: 1, dash: 1 }]; }],
  env: ["Envelopes", "over", { len: 20, pct: 2.5, col: "#c8d6e5" }, (B, p) => { const m = sma(C_(B), p.len); return [{ v: m, col: p.col, w: 1 }, { v: m.map(x => x * (1 + p.pct / 100)), col: p.col, band: 1 }, { v: m.map(x => x * (1 - p.pct / 100)), col: p.col, band: 2 }]; }],
  ichi: ["Ichimoku Cloud", "over", { conv: 9, base: 26, span: 52, col: "#ee5253" }, (B, p) => { const mid = n => hh(H_(B), n).map((x, i) => (x + ll(L_(B), n)[i]) / 2), t = mid(p.conv), k = mid(p.base), a = t.map((x, i) => (x + k[i]) / 2), b = mid(p.span), sh = (arr, s) => arr.map((_, i) => i - s >= 0 ? arr[i - s] : NaN);
    return [{ v: t, col: "#2e86de", w: 1 }, { v: k, col: "#ee5253", w: 1 }, { v: sh(a, p.base), col: "#10ac84", band: 1 }, { v: sh(b, p.base), col: "#ee5253", band: 2 }]; }],
  psar: ["Parabolic SAR", "over", { step: .02, max: .2, col: "#ff9ff3" }, (B, p) => { const o = nan(B.length); if (B.length < 3) return [{ v: o, col: p.col, type: "dots" }]; let up = true, af = p.step, ep = B[0].h, sar = B[0].l;
    for (let i = 1; i < B.length; i++) { sar = sar + af * (ep - sar); if (up) { sar = Math.min(sar, B[i - 1].l, i > 1 ? B[i - 2].l : B[i - 1].l); if (B[i].l < sar) { up = false; sar = ep; ep = B[i].l; af = p.step; } else if (B[i].h > ep) { ep = B[i].h; af = Math.min(p.max, af + p.step); } }
      else { sar = Math.max(sar, B[i - 1].h, i > 1 ? B[i - 2].h : B[i - 1].h); if (B[i].h > sar) { up = true; sar = ep; ep = B[i].h; af = p.step; } else if (B[i].l < ep) { ep = B[i].l; af = Math.min(p.max, af + p.step); } } o[i] = sar; } return [{ v: o, col: p.col, type: "dots" }]; }],
  st: ["SuperTrend", "over", { len: 10, mult: 3, col: "#2ee6a8" }, (B, p) => { const a = atr(B, p.len), o = nan(B.length), dir = nan(B.length); let fu = NaN, fl = NaN, d = 1;
    for (let i = 0; i < B.length; i++) { if (!isFinite(a[i])) continue; const m = (B[i].h + B[i].l) / 2, bu = m + p.mult * a[i], bl = m - p.mult * a[i]; fu = !isFinite(fu) || bu < fu || B[i - 1].c > fu ? bu : fu; fl = !isFinite(fl) || bl > fl || B[i - 1].c < fl ? bl : fl;
      d = B[i].c > fu ? 1 : B[i].c < fl ? -1 : d; o[i] = d > 0 ? fl : fu; dir[i] = d; } return [{ v: o, col: p.col, dirs: dir }]; }],
  vol: ["Volume", "pane", { len: 20, col: "#576574" }, (B, p) => [{ v: V_(B), type: "hist", colorBy: "candle" }, { v: sma(V_(B), p.len), col: "#c8d6e5", w: 1 }]],
  rsi: ["RSI · Relative strength index", "pane", { len: 14, col: "#7fe3ff" }, (B, p) => [{ v: rsi(C_(B), p.len), col: p.col }], [30, 70], [0, 100]],
  macd: ["MACD", "pane", { fast: 12, slow: 26, sig: 9, col: "#2e86de" }, (B, p) => { const f = ema(C_(B), p.fast), s = ema(C_(B), p.slow), m = f.map((x, i) => x - s[i]), g = ema(m.map(v => isFinite(v) ? v : NaN), p.sig);
    return [{ v: m.map((x, i) => x - g[i]), type: "hist", colorBy: "sign" }, { v: m, col: p.col }, { v: g, col: "#ff9f43" }]; }, [0]],
  stoch: ["Stochastic", "pane", { len: 14, k: 3, d: 3, col: "#7fe3ff" }, (B, p) => { const [K, D] = stoch(B, p.len, p.k, p.d); return [{ v: K, col: p.col }, { v: D, col: "#ff9f43" }]; }, [20, 80], [0, 100]],
  srsi: ["Stochastic RSI", "pane", { len: 14, k: 3, d: 3, col: "#48dbfb" }, (B, p) => { const r = rsi(C_(B), p.len), h = hh(r, p.len), l = ll(r, p.len), raw = r.map((x, i) => (x - l[i]) / ((h[i] - l[i]) || 1) * 100), K = sma(raw, p.k); return [{ v: K, col: p.col }, { v: sma(K, p.d), col: "#ff9f43" }]; }, [20, 80], [0, 100]],
  cci: ["CCI · Commodity channel index", "pane", { len: 20, col: "#feca57" }, (B, p) => { const t = TP(B), m = sma(t, p.len); return [{ v: t.map((x, i) => { if (!isFinite(m[i])) return NaN; let md = 0; for (let j = 0; j < p.len; j++) md += Math.abs(t[i - j] - m[i]); return (x - m[i]) / (.015 * (md / p.len) || 1); }), col: p.col }]; }, [-100, 100]],
  atr: ["ATR · Average true range", "pane", { len: 14, col: "#ff6b6b" }, (B, p) => [{ v: atr(B, p.len), col: p.col }]],
  adx: ["ADX / DMI", "pane", { len: 14, col: "#f368e0" }, (B, p) => { const up = B.map((b, i) => i ? b.h - B[i - 1].h : 0), dn = B.map((b, i) => i ? B[i - 1].l - b.l : 0), pdm = up.map((u, i) => u > dn[i] && u > 0 ? u : 0), mdm = dn.map((d, i) => d > up[i] && d > 0 ? d : 0), a = atr(B, p.len);
    const pdi = rma(pdm, p.len).map((x, i) => 100 * x / (a[i] || 1)), mdi = rma(mdm, p.len).map((x, i) => 100 * x / (a[i] || 1)), dx = pdi.map((x, i) => 100 * Math.abs(x - mdi[i]) / ((x + mdi[i]) || 1)); return [{ v: rma(dx.map(v => isFinite(v) ? v : NaN), p.len), col: p.col }, { v: pdi, col: "#2ee6a8", w: 1 }, { v: mdi, col: "#ff5a76", w: 1 }]; }, [25]],
  obv: ["OBV · On-balance volume", "pane", { col: "#54a0ff" }, (B, p) => { let o = 0; return [{ v: B.map((b, i) => (o += i ? (b.c > B[i - 1].c ? (b.v || 0) : b.c < B[i - 1].c ? -(b.v || 0) : 0) : 0)), col: p.col }]; }],
  mfi: ["MFI · Money flow index", "pane", { len: 14, col: "#1dd1a1" }, (B, p) => { const t = TP(B), mf = t.map((x, i) => x * (B[i].v || 0)); return [{ v: t.map((x, i) => { if (i < p.len) return NaN; let pos = 0, neg = 0; for (let j = i - p.len + 1; j <= i; j++) { if (t[j] > t[j - 1]) pos += mf[j]; else if (t[j] < t[j - 1]) neg += mf[j]; } return neg ? 100 - 100 / (1 + pos / neg) : 100; }), col: p.col }]; }, [20, 80], [0, 100]],
  willr: ["Williams %R", "pane", { len: 14, col: "#ff9ff3" }, (B, p) => { const h = hh(H_(B), p.len), l = ll(L_(B), p.len); return [{ v: B.map((b, i) => (h[i] - b.c) / ((h[i] - l[i]) || 1) * -100), col: p.col }]; }, [-80, -20], [-100, 0]],
  roc: ["ROC · Rate of change", "pane", { len: 12, col: "#c8d6e5" }, (B, p) => [{ v: C_(B).map((c, i) => i >= p.len ? (c - B[i - p.len].c) / B[i - p.len].c * 100 : NaN), col: p.col }], [0]],
  mom: ["Momentum", "pane", { len: 10, col: "#48dbfb" }, (B, p) => [{ v: C_(B).map((c, i) => i >= p.len ? c - B[i - p.len].c : NaN), col: p.col }], [0]],
  cmf: ["CMF · Chaikin money flow", "pane", { len: 20, col: "#10ac84" }, (B, p) => { const mfv = B.map(b => ((b.c - b.l) - (b.h - b.c)) / ((b.h - b.l) || 1) * (b.v || 0)), a = sma(mfv, p.len), v = sma(V_(B), p.len); return [{ v: a.map((x, i) => x / (v[i] || 1)), col: p.col }]; }, [0]],
  trix: ["TRIX", "pane", { len: 15, col: "#feca57" }, (B, p) => { const e = ema(ema(ema(C_(B), p.len), p.len), p.len); return [{ v: e.map((x, i) => i && isFinite(e[i - 1]) ? (x - e[i - 1]) / e[i - 1] * 10000 : NaN), col: p.col }]; }, [0]],
  ao: ["Awesome Oscillator", "pane", { col: "#2ee6a8" }, (B, p) => { const m = B.map(b => (b.h + b.l) / 2), a = sma(m, 5), b = sma(m, 34); return [{ v: a.map((x, i) => x - b[i]), type: "hist", colorBy: "rise" }]; }, [0]],
  std: ["Standard deviation", "pane", { len: 20, col: "#a29bfe" }, (B, p) => [{ v: stdev(C_(B), p.len), col: p.col }]],
  bbw: ["Bollinger %B", "pane", { len: 20, mult: 2, col: "#54a0ff" }, (B, p) => { const m = sma(C_(B), p.len), s = stdev(C_(B), p.len); return [{ v: B.map((b, i) => (b.c - (m[i] - p.mult * s[i])) / ((2 * p.mult * s[i]) || 1)), col: p.col }]; }, [0, 1]]
};
const PNAME = { len: "Length", mult: "Multiplier", pct: "Percent", fast: "Fast", slow: "Slow", sig: "Signal", k: "%K smoothing", d: "%D smoothing", conv: "Conversion", base: "Base", span: "Span B", step: "Step", max: "Max", col: "Color" };
const TOOLS = [["cross", "✛", "Crosshair"], ["trend", "╱", "Trend line"], ["ray", "→", "Ray"], ["ext", "⟷", "Extended line"], ["hline", "―", "Horizontal line"], ["vline", "│", "Vertical line"], ["rect", "▭", "Rectangle"], ["fib", "≡", "Fibonacci retracement"], ["measure", "⇕", "Measure"], ["note", "T", "Note"]];
const TYPES = [["candles", "Candles"], ["hollow", "Hollow candles"], ["heikin", "Heikin Ashi"], ["bars", "Bars (OHLC)"], ["line", "Line"], ["area", "Area"]];
const FIB = [0, .236, .382, .5, .618, .786, 1];
const THEMES = { holo: { bg: "#030b1f", grid: "rgba(127,208,255,.08)", txt: "#c9e6ff", dim: "#7f9ec2", up: "#2ee6a8", dn: "#ff5a76", acc: "#4aa8ff", cross: "rgba(200,230,255,.5)", panel: "#071733" } };

window.ProChart = function (host, opt) {
  opt = opt || {}; const st0 = load(), T = Object.assign({}, THEMES.holo, opt.theme || {});
  const S = Object.assign({ type: "candles", log: false, grid: true, pline: true, vol: true, inds: [{ id: "ema", p: { len: 21, col: "#ff9f43" } }, { id: "ema", p: { len: 55, col: "#b48cff" } }, { id: "rsi", p: { len: 14, col: "#7fe3ff" } }], up: T.up, dn: T.dn, draw: {} }, st0);
  S.up = S.up || T.up; S.dn = S.dn || T.dn;
  const persist = () => save(S);
  host.classList.add("pc"); host.innerHTML = `<div class="pc-top">${opt.compact ? "" : `<b class="pc-sym"></b>`}<div class="pc-tfs"></div><span class="pc-sep"></span><button type="button" class="pc-b" data-pc="type" title="Chart type">▥ <span class="pc-tl"></span></button><button type="button" class="pc-b" data-pc="ind" title="Indicators">ƒx Indicators</button><button type="button" class="pc-b" data-pc="set" title="Chart settings">⚙</button><button type="button" class="pc-b" data-pc="fit" title="Fit all candles">⤧</button><button type="button" class="pc-b" data-pc="shot" title="Clear drawings">🗑</button>${opt.onClose ? `<span class="pc-sp"></span><button type="button" class="pc-b pc-x" data-pc="close" aria-label="Close chart">✕</button>` : ""}</div>
    <div class="pc-main">${opt.compact ? "" : `<div class="pc-tools" role="toolbar" aria-label="Drawing tools">${TOOLS.map(([k, ic, n]) => `<button type="button" data-tool="${k}" title="${n}" aria-label="${n}" aria-pressed="${k === "cross"}">${ic}</button>`).join("")}</div>`}<div class="pc-cv"><canvas></canvas><div class="pc-leg"></div></div></div><div class="pc-pop" hidden></div>`;
  const cv = host.querySelector("canvas"), g = cv.getContext("2d"), leg = host.querySelector(".pc-leg"), pop = host.querySelector(".pc-pop"), box = host.querySelector(".pc-cv");
  let B = [], RB = [], view = { n: opt.compact ? 70 : 120, off: 0 }, mouse = null, tool = "cross", drawing = null, selD = -1, W = 0, H = 0, dpr = 1, L = null, sym = opt.sym || "", tf = opt.tf || "";
  const drawsOf = () => (S.draw[sym] = S.draw[sym] || []);
  const ha = bs => { const o = []; bs.forEach((b, i) => { const c = (b.o + b.h + b.l + b.c) / 4, op = i ? (o[i - 1].o + o[i - 1].c) / 2 : (b.o + b.c) / 2; o.push({ t: b.t, o: op, c, h: Math.max(b.h, op, c), l: Math.min(b.l, op, c), v: b.v }); }); return o; };
  function tfs() { const el = host.querySelector(".pc-tfs"); el.innerHTML = (opt.tfs || []).map(t => `<button type="button" data-tf="${t}" aria-pressed="${t === tf}">${t}</button>`).join(""); }
  function resize() { const r = box.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(50, r.width); H = Math.max(50, r.height); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; draw(); }
  const ro = new ResizeObserver(() => resize()); ro.observe(box);
  /* layout: price pane + indicator panes */
  function layout() { const panes = S.inds.filter(x => IND[x.id] && IND[x.id][1] === "pane"); const axisW = opt.compact ? 58 : 72, tAx = 22, ph = panes.length ? Math.min(.22, .6 / panes.length) : 0, mainH = (H - tAx) * (1 - ph * panes.length);
    const out = { axisW, plotW: W - axisW, main: { y: 0, h: mainH }, panes: panes.map((x, i) => ({ ind: x, y: mainH + i * (H - tAx) * ph, h: (H - tAx) * ph })), tY: H - tAx }; return out; }
  function vis() { const n = Math.min(view.n, B.length), end = Math.max(n, B.length - view.off); return { s: Math.max(0, end - n), e: end, n }; }
  const xOf = (i, V) => (i - V.s + .5) * (L.plotW / V.n);
  const iOf = (x, V) => Math.floor(x / (L.plotW / V.n)) + V.s;
  function yScale(lo, hi, y, h, log) { const pad = (hi - lo) * .08 || 1, a = lo - pad, b = hi + pad; if (log && a > 0) { const la = Math.log(a), lb = Math.log(b); return { f: v => y + h - (Math.log(v) - la) / (lb - la) * h, inv: py => Math.exp(la + (y + h - py) / h * (lb - la)) }; } return { f: v => y + h - (v - a) / (b - a) * h, inv: py => a + (y + h - py) / h * (b - a) }; }
  const fmtP = v => !isFinite(v) ? "—" : Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : Math.abs(v) >= 1 ? v.toFixed(3) : v.toPrecision(4);
  const fmtT = t => { const d = new Date(t * 1000); return /d/.test(tf) ? (d.getMonth() + 1) + "/" + d.getDate() : String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  let CALC = new Map();
  function compute() { CALC = new Map(); S.inds.forEach((x, k) => { const I = IND[x.id]; if (!I) return; try { CALC.set(k, I[3](RB, Object.assign({}, I[2], x.p))); } catch (e) { CALC.set(k, []); } }); }
  function draw() {
    if (!W) return; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = T.bg; g.fillRect(0, 0, W, H); L = layout();
    if (B.length < 2) { g.fillStyle = T.dim; g.font = "600 14px Rajdhani, sans-serif"; g.textAlign = "center"; g.fillText("Loading candles…", W / 2, H / 2); return; }
    const V = vis(), D = S.type === "heikin" ? ha(B) : B, sl = D.slice(V.s, V.e); let lo = Math.min(...sl.map(b => b.l)), hi = Math.max(...sl.map(b => b.h));
    S.inds.forEach((x, k) => { if (IND[x.id] && IND[x.id][1] === "over") (CALC.get(k) || []).forEach(sr => { for (let i = V.s; i < V.e; i++) { const v = sr.v[i]; if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } } }); });
    const Y = yScale(lo, hi, L.main.y + 6, L.main.h - 12, S.log), bw = L.plotW / V.n; L.Y = Y; L.V = V;
    /* grid + axes */
    g.font = "500 11px 'Share Tech Mono', monospace"; g.textBaseline = "middle";
    const ticks = 6; for (let j = 0; j <= ticks; j++) { const py = L.main.y + 6 + (L.main.h - 12) * j / ticks, v = Y.inv(py); if (S.grid) { g.strokeStyle = T.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(0, py); g.lineTo(L.plotW, py); g.stroke(); } g.fillStyle = T.dim; g.textAlign = "left"; g.fillText(fmtP(v), L.plotW + 6, py); }
    const step = Math.max(1, Math.round(90 / bw)); for (let i = V.s - (V.s % step); i < V.e; i += step) { if (i < V.s) continue; const px = xOf(i, V); if (S.grid) { g.strokeStyle = T.grid; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, L.tY); g.stroke(); } g.fillStyle = T.dim; g.textAlign = "center"; g.fillText(fmtT(B[i].t), px, L.tY + 11); }
    g.save(); g.beginPath(); g.rect(0, L.main.y, L.plotW, L.main.h); g.clip();
    /* overlay bands fill */
    S.inds.forEach((x, k) => { if (!IND[x.id] || IND[x.id][1] !== "over") return; const sr = CALC.get(k) || [], b1 = sr.find(s => s.band === 1), b2 = sr.find(s => s.band === 2); if (!b1 || !b2) return; g.beginPath(); let st = false;
      for (let i = V.s; i < V.e; i++) { const v = b1.v[i]; if (!isFinite(v)) continue; st ? g.lineTo(xOf(i, V), Y.f(v)) : (g.moveTo(xOf(i, V), Y.f(v)), st = true); } for (let i = V.e - 1; i >= V.s; i--) { const v = b2.v[i]; if (isFinite(v)) g.lineTo(xOf(i, V), Y.f(v)); } g.closePath(); g.fillStyle = (b1.col || "#54a0ff") + "1c"; g.fill(); });
    /* price */
    if (S.type === "line" || S.type === "area") { g.beginPath(); sl.forEach((b, j) => { const px = xOf(V.s + j, V), py = Y.f(b.c); j ? g.lineTo(px, py) : g.moveTo(px, py); }); g.strokeStyle = T.acc; g.lineWidth = 2; g.stroke();
      if (S.type === "area") { g.lineTo(xOf(V.e - 1, V), L.main.h); g.lineTo(xOf(V.s, V), L.main.h); g.closePath(); const gr = g.createLinearGradient(0, 0, 0, L.main.h); gr.addColorStop(0, T.acc + "55"); gr.addColorStop(1, T.acc + "00"); g.fillStyle = gr; g.fill(); } }
    else sl.forEach((b, j) => { const px = xOf(V.s + j, V), up = b.c >= b.o, col = up ? S.up : S.dn, yo = Y.f(b.o), yc = Y.f(b.c); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1, Math.min(2, bw * .1));
      if (S.type === "bars") { g.beginPath(); g.moveTo(px, Y.f(b.h)); g.lineTo(px, Y.f(b.l)); g.moveTo(px - bw * .35, yo); g.lineTo(px, yo); g.moveTo(px, yc); g.lineTo(px + bw * .35, yc); g.stroke(); return; }
      g.beginPath(); g.moveTo(px, Y.f(b.h)); g.lineTo(px, Y.f(b.l)); g.stroke(); const bh = Math.max(1, Math.abs(yo - yc)), bx = px - bw * .36, bwid = Math.max(1, bw * .72);
      if (S.type === "hollow" && up) { g.fillStyle = T.bg; g.fillRect(bx, Math.min(yo, yc), bwid, bh); g.strokeRect(bx, Math.min(yo, yc), bwid, bh); } else g.fillRect(bx, Math.min(yo, yc), bwid, bh); });
    /* overlays */
    S.inds.forEach((x, k) => { if (!IND[x.id] || IND[x.id][1] !== "over") return; (CALC.get(k) || []).forEach(sr => line(sr, V, Y)); });
    /* volume underlay */
    if (S.vol && !S.inds.some(x => x.id === "vol")) { const mv = Math.max(...sl.map(b => b.v || 0)) || 1, vh = L.main.h * .16; sl.forEach((b, j) => { g.fillStyle = (b.c >= b.o ? S.up : S.dn) + "40"; const hh2 = (b.v || 0) / mv * vh; g.fillRect(xOf(V.s + j, V) - bw * .36, L.main.h - hh2, Math.max(1, bw * .72), hh2); }); }
    /* drawings */
    drawsOf().concat(drawing ? [drawing] : []).forEach((d, k) => drawShape(d, V, Y, k === selD));
    g.restore();
    /* last price line */
    const last = B[B.length - 1].c; if (S.pline) { const py = Y.f(last), up = last >= B[B.length - 1].o; g.setLineDash([4, 4]); g.strokeStyle = (up ? S.up : S.dn) + "aa"; g.beginPath(); g.moveTo(0, py); g.lineTo(L.plotW, py); g.stroke(); g.setLineDash([]); g.fillStyle = up ? S.up : S.dn; g.fillRect(L.plotW, py - 9, L.axisW, 18); g.fillStyle = "#04121f"; g.textAlign = "left"; g.font = "700 11px 'Share Tech Mono', monospace"; g.fillText(fmtP(last), L.plotW + 5, py); }
    /* panes */
    L.panes.forEach((pn, pi) => { const I = IND[pn.ind.id], k = S.inds.indexOf(pn.ind), sr = CALC.get(k) || []; g.strokeStyle = "rgba(127,208,255,.25)"; g.beginPath(); g.moveTo(0, pn.y); g.lineTo(W, pn.y); g.stroke();
      let plo = Infinity, phi = -Infinity; if (I[5]) { plo = I[5][0]; phi = I[5][1]; } else sr.forEach(s => { for (let i = V.s; i < V.e; i++) { const v = s.v[i]; if (isFinite(v)) { if (v < plo) plo = v; if (v > phi) phi = v; } } }); (I[4] || []).forEach(l => { plo = Math.min(plo, l); phi = Math.max(phi, l); });
      if (!isFinite(plo)) return; const PY = yScale(plo, phi, pn.y + 14, pn.h - 18, false); pn.Y = PY;
      (I[4] || []).forEach(l => { g.setLineDash([3, 4]); g.strokeStyle = "rgba(200,220,255,.25)"; g.beginPath(); g.moveTo(0, PY.f(l)); g.lineTo(L.plotW, PY.f(l)); g.stroke(); g.setLineDash([]); g.fillStyle = T.dim; g.textAlign = "left"; g.fillText(String(l), L.plotW + 6, PY.f(l)); });
      g.save(); g.beginPath(); g.rect(0, pn.y, L.plotW, pn.h); g.clip(); sr.forEach(s => s.type === "hist" ? hist(s, V, PY, pn) : line(s, V, PY)); g.restore();
      g.fillStyle = T.txt; g.textAlign = "left"; g.font = "600 11px Rajdhani, sans-serif"; const lv = sr.map(s => { const v = s.v[mouse && mouse.i != null ? Math.min(mouse.i, B.length - 1) : B.length - 1]; return fmtP(v); }).join("  "); g.fillText(I[0].split(" · ")[0] + " " + paramStr(pn.ind) + "   " + lv, 6, pn.y + 8); });
    /* crosshair */
    if (mouse && mouse.x < L.plotW && mouse.y < L.tY) { g.strokeStyle = T.cross; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(mouse.x, 0); g.lineTo(mouse.x, L.tY); g.moveTo(0, mouse.y); g.lineTo(L.plotW, mouse.y); g.stroke(); g.setLineDash([]);
      let val = null; if (mouse.y < L.main.h) val = Y.inv(mouse.y); else { const pn = L.panes.find(p => mouse.y >= p.y && mouse.y < p.y + p.h); if (pn && pn.Y) val = pn.Y.inv(mouse.y); }
      if (val != null) { g.fillStyle = "#2b4f80"; g.fillRect(L.plotW, mouse.y - 9, L.axisW, 18); g.fillStyle = "#fff"; g.textAlign = "left"; g.font = "600 11px 'Share Tech Mono', monospace"; g.fillText(fmtP(val), L.plotW + 5, mouse.y); }
      const i = Math.min(B.length - 1, Math.max(0, iOf(mouse.x, V))); mouse.i = i; g.fillStyle = "#2b4f80"; const tl = new Date(B[i].t * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); g.font = "600 11px 'Share Tech Mono', monospace"; const tw = g.measureText(tl).width + 12; g.fillRect(xOf(i, V) - tw / 2, L.tY, tw, 22); g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(tl, xOf(i, V), L.tY + 11); }
    legend(V);
  }
  const paramStr = x => { const I = IND[x.id], p = Object.assign({}, I[2], x.p); return Object.keys(p).filter(k => k !== "col").map(k => p[k]).join(","); };
  function line(sr, V, Y) { g.strokeStyle = sr.col || T.acc; g.lineWidth = sr.w || 1.6; if (sr.dash) g.setLineDash([5, 4]); const bw = L.plotW / V.n;
    if (sr.type === "dots") { g.fillStyle = sr.col; for (let i = V.s; i < V.e; i++) { const v = sr.v[i]; if (isFinite(v)) { g.beginPath(); g.arc(xOf(i, V), Y.f(v), Math.max(1.2, Math.min(2.5, bw * .15)), 0, 7); g.fill(); } } return; }
    let st = false, pd = null; g.beginPath(); for (let i = V.s; i < V.e; i++) { const v = sr.v[i]; if (!isFinite(v)) { st = false; continue; } const d = sr.dirs ? sr.dirs[i] : null;
      if (sr.dirs && pd != null && d !== pd) { g.stroke(); g.beginPath(); st = false; } if (sr.dirs) g.strokeStyle = d > 0 ? S.up : S.dn; pd = d; const px = xOf(i, V), py = Y.f(v); st ? g.lineTo(px, py) : (g.moveTo(px, py), st = true); } g.stroke(); g.setLineDash([]); }
  function hist(sr, V, Y, pn) { const bw = L.plotW / V.n, z = Y.f(Math.max(Y.inv(pn.y + pn.h - 4), Math.min(0, Y.inv(pn.y + 14)))) ; for (let i = V.s; i < V.e; i++) { const v = sr.v[i]; if (!isFinite(v)) continue; const b = B[i];
      const col = sr.colorBy === "candle" ? (b.c >= b.o ? S.up : S.dn) : sr.colorBy === "rise" ? (i && v >= sr.v[i - 1] ? S.up : S.dn) : (v >= 0 ? S.up : S.dn); g.fillStyle = col + (sr.colorBy === "candle" ? "88" : "cc"); const base = sr.colorBy === "candle" ? pn.y + pn.h - 2 : Y.f(0), py = Y.f(v); g.fillRect(xOf(i, V) - bw * .35, Math.min(base, py), Math.max(1, bw * .7), Math.abs(base - py)); } }
  function drawShape(d, V, Y, sel) { const P = q => [xOf(q.i, V), Y.f(q.p)], col = d.col || "#ffd166"; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = sel ? 2.5 : 1.5;
    if (d.t === "hline") { const y = Y.f(d.a.p); g.beginPath(); g.moveTo(0, y); g.lineTo(L.plotW, y); g.stroke(); g.font = "600 11px 'Share Tech Mono'"; g.textAlign = "right"; g.fillText(fmtP(d.a.p), L.plotW - 4, y - 6); return; }
    if (d.t === "vline") { const x = xOf(d.a.i, V); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L.main.h); g.stroke(); return; }
    if (d.t === "note") { const [x, y] = P(d.a); g.font = "700 13px Rajdhani, sans-serif"; g.textAlign = "left"; g.fillText(d.text || "Note", x + 4, y); g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); return; }
    if (!d.b) return; const [x1, y1] = P(d.a), [x2, y2] = P(d.b);
    if (d.t === "rect") { g.fillStyle = col + "22"; g.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); g.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); return; }
    if (d.t === "fib") { const lo = d.a.p, hi = d.b.p; FIB.forEach(f => { const v = hi - (hi - lo) * f, y = Y.f(v); g.strokeStyle = f === .5 || f === .618 ? "#ffc14d" : col; g.beginPath(); g.moveTo(Math.min(x1, x2), y); g.lineTo(L.plotW, y); g.stroke(); g.fillStyle = g.strokeStyle; g.font = "600 11px 'Share Tech Mono'"; g.textAlign = "left"; g.fillText((f * 100).toFixed(1) + "%  " + fmtP(v), Math.min(x1, x2) + 4, y - 5); }); return; }
    if (d.t === "measure") { const ch = (d.b.p - d.a.p) / d.a.p * 100, n = d.b.i - d.a.i, c2 = ch >= 0 ? S.up : S.dn; g.fillStyle = c2 + "22"; g.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); g.strokeStyle = c2; g.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      g.fillStyle = "#fff"; g.font = "700 12px 'Share Tech Mono'"; g.textAlign = "center"; g.fillText(fmtP(d.b.p - d.a.p) + "  (" + (ch >= 0 ? "+" : "") + ch.toFixed(2) + "%)  " + n + " bars", (x1 + x2) / 2, Math.min(y1, y2) - 8); return; }
    let ax = x1, ay = y1, bx = x2, by = y2; const ext = (k) => { const dx = x2 - x1, dy = y2 - y1; return [x1 + dx * k, y1 + dy * k]; }; if (d.t === "ray" || d.t === "ext") { const k = (L.plotW * 3) / (Math.abs(x2 - x1) || 1); [bx, by] = ext(k); if (d.t === "ext") [ax, ay] = ext(-k); }
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); [[x1, y1], [x2, y2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, sel ? 4 : 2.5, 0, 7); g.fill(); }); }
  function legend(V) { const i = mouse && mouse.i != null ? mouse.i : B.length - 1, b = B[i]; if (!b) return; const ch = i ? (b.c - B[i - 1].c) / B[i - 1].c * 100 : 0;
    const ov = S.inds.map((x, k) => [x, k]).filter(([x]) => IND[x.id] && IND[x.id][1] === "over").map(([x, k]) => { const sr = CALC.get(k) || []; return `<span class="pc-li" style="color:${esc(x.p.col || IND[x.id][2].col)}"><button type="button" data-ie="${k}" title="Settings">${esc(IND[x.id][0].split(" · ")[0])} ${esc(paramStr(x))}</button> ${sr.filter(s => !s.band || true).slice(0, 3).map(s => fmtP(s.v[i])).join(" ")}<button type="button" data-ix="${k}" title="Remove" aria-label="Remove">×</button></span>`; }).join("");
    const pn = S.inds.map((x, k) => [x, k]).filter(([x]) => IND[x.id] && IND[x.id][1] === "pane").map(([x, k]) => `<span class="pc-li"><button type="button" data-ie="${k}">${esc(IND[x.id][0].split(" · ")[0])} ⚙</button><button type="button" data-ix="${k}" aria-label="Remove">×</button></span>`).join("");
    leg.innerHTML = `<div class="pc-ohlc"><b>${esc(sym)}</b> <i>${esc(tf)}</i> O <em>${fmtP(b.o)}</em> H <em>${fmtP(b.h)}</em> L <em>${fmtP(b.l)}</em> C <em class="${b.c >= b.o ? "u" : "d"}">${fmtP(b.c)}</em> <em class="${ch >= 0 ? "u" : "d"}">${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%</em> V <em>${fmtP(b.v)}</em></div><div class="pc-ovl">${ov}${pn}</div>`; }
  /* ---- interaction ---- */
  const posOf = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const ptOf = p => { const V = L.V; return { i: Math.max(0, Math.min(B.length - 1 + 20, iOf(p.x, V))), p: L.Y.inv(p.y) }; };
  let drag = null, pinch = null; const pts = new Map();
  cv.addEventListener("pointerdown", e => { if (!L || !L.Y) return; cv.setPointerCapture(e.pointerId); const p = posOf(e); pts.set(e.pointerId, p);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.abs(a.x - b.x) || 1, n: view.n }; drag = null; return; }
    if (tool !== "cross" && p.y < L.main.h && p.x < L.plotW) { const q = ptOf(p); if (tool === "hline" || tool === "vline" || tool === "note") { const d = { t: tool, a: q, col: "#ffd166" }; if (tool === "note") { setTool("cross"); openPop(`<div class="pc-ph"><b>Note</b><button type="button" class="pc-b" data-pclose aria-label="Close">✕</button></div><form data-note><input class="pc-in" maxlength="60" value="Note" aria-label="Note text"><div class="pc-row"><button class="pc-b pc-pri">Add note</button></div></form>`);
        pop.querySelector("[data-note]").onsubmit = ev => { ev.preventDefault(); d.text = pop.querySelector("input").value || "Note"; drawsOf().push(d); persist(); pop.hidden = true; draw(); }; return; } drawsOf().push(d); persist(); setTool("cross"); draw(); return; }
      drawing = { t: tool, a: q, b: q, col: tool === "fib" ? "#7fe3ff" : "#ffd166" }; return; }
    selD = hitDraw(p); drag = { x: p.x, off: view.off, y: p.y }; draw(); });
  cv.addEventListener("pointermove", e => { if (!L) return; const p = posOf(e); if (pts.has(e.pointerId)) pts.set(e.pointerId, p);
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], d = Math.abs(a.x - b.x) || 1; view.n = Math.max(15, Math.min(B.length, Math.round(pinch.n * pinch.d / d))); draw(); return; }
    mouse = Object.assign(mouse || {}, p); if (drawing) { drawing.b = ptOf(p); draw(); return; }
    if (drag) { const bw = L.plotW / L.V.n; view.off = Math.max(0, Math.min(B.length - 15, Math.round(drag.off + (p.x - drag.x) / bw))); } draw(); });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (drawing) { if (drawing.a.i !== drawing.b.i || Math.abs(drawing.a.p - drawing.b.p) > 0) { drawsOf().push(drawing); persist(); } drawing = null; setTool("cross"); draw(); } drag = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("pointerleave", () => { mouse = null; draw(); });
  cv.addEventListener("wheel", e => { e.preventDefault(); const f = e.deltaY > 0 ? 1.12 : .89; view.n = Math.max(15, Math.min(Math.max(15, B.length), Math.round(view.n * f))); draw(); }, { passive: false });
  function hitDraw(p) { const V = L.V, Y = L.Y, ds = drawsOf(); for (let k = ds.length - 1; k >= 0; k--) { const d = ds[k], a = [xOf(d.a.i, V), Y.f(d.a.p)], b = d.b ? [xOf(d.b.i, V), Y.f(d.b.p)] : null;
      if (d.t === "hline" && Math.abs(p.y - a[1]) < 6) return k; if (d.t === "vline" && Math.abs(p.x - a[0]) < 6) return k; if (d.t === "note" && Math.hypot(p.x - a[0], p.y - a[1]) < 12) return k;
      if (b) { if (d.t === "rect" || d.t === "fib" || d.t === "measure") { if (p.x >= Math.min(a[0], b[0]) - 4 && p.x <= Math.max(a[0], b[0]) + 4 && p.y >= Math.min(a[1], b[1]) - 4 && p.y <= Math.max(a[1], b[1]) + 4) return k; }
        else { const dx = b[0] - a[0], dy = b[1] - a[1], t2 = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy || 1))); if (Math.hypot(p.x - (a[0] + t2 * dx), p.y - (a[1] + t2 * dy)) < 6) return k; } } } return -1; }
  const keyH = e => { if (!host.isConnected) return; if ((e.key === "Delete" || e.key === "Backspace") && selD >= 0 && !/input|select|textarea/i.test(e.target.tagName)) { drawsOf().splice(selD, 1); selD = -1; persist(); draw(); } if (e.key === "Escape") { if (!pop.hidden) pop.hidden = true; else setTool("cross"); } };
  document.addEventListener("keydown", keyH);
  function setTool(t) { tool = t; host.querySelectorAll("[data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === t))); cv.style.cursor = t === "cross" ? "crosshair" : "copy"; }
  setTool("cross");
  /* ---- popovers: indicators, settings, chart type ---- */
  function openPop(html) { pop.innerHTML = `<div class="pc-pc">${html}</div>`; pop.hidden = false; const f = pop.querySelector("input,button"); try { f && f.focus(); } catch (e) {} }
  function indList() { openPop(`<div class="pc-ph"><b>Indicators</b><input type="search" placeholder="Search ${Object.keys(IND).length} indicators" class="pc-in" data-isearch aria-label="Search indicators"><button type="button" class="pc-b" data-pclose aria-label="Close">✕</button></div>
      <div class="pc-il">${Object.entries(IND).map(([k, I]) => `<button type="button" data-iadd="${k}"><span>${esc(I[0])}</span><small>${I[1] === "over" ? "on price" : "own panel"}</small></button>`).join("")}</div>`);
    pop.querySelector("[data-isearch]").oninput = e => { const q = e.target.value.toLowerCase(); pop.querySelectorAll("[data-iadd]").forEach(b => b.hidden = !b.textContent.toLowerCase().includes(q)); }; }
  function indEdit(k) { const x = S.inds[k]; if (!x) return; const I = IND[x.id], p = Object.assign({}, I[2], x.p);
    openPop(`<div class="pc-ph"><b>${esc(I[0])}</b><button type="button" class="pc-b" data-pclose aria-label="Close">✕</button></div><div class="pc-form">${Object.keys(p).map(f => f === "col" ? `<label>${PNAME[f]}<input type="color" data-ip="col" value="${esc(p.col)}"></label>` : `<label>${PNAME[f] || f}<input type="number" step="${p[f] < 1 ? .01 : 1}" min="${p[f] < 1 ? .001 : 1}" data-ip="${f}" value="${p[f]}" class="pc-in"></label>`).join("")}</div>
      <div class="pc-row"><button type="button" class="pc-b" data-idef="${k}">Defaults</button><button type="button" class="pc-b" data-ix="${k}">Remove</button><button type="button" class="pc-b pc-pri" data-pclose>Done</button></div>`);
    pop.querySelectorAll("[data-ip]").forEach(i => i.oninput = () => { const f = i.dataset.ip; x.p = Object.assign({}, x.p, { [f]: f === "col" ? i.value : Math.max(+i.min || 0, +i.value || I[2][f]) }); persist(); compute(); draw(); }); }
  function settings() { openPop(`<div class="pc-ph"><b>Chart settings</b><button type="button" class="pc-b" data-pclose aria-label="Close">✕</button></div><div class="pc-form">
      <label>Chart type<select data-cs="type" class="pc-in">${TYPES.map(([k, n]) => `<option value="${k}" ${S.type === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <label class="pc-ck"><input type="checkbox" data-cs="log" ${S.log ? "checked" : ""}> Log scale</label><label class="pc-ck"><input type="checkbox" data-cs="grid" ${S.grid ? "checked" : ""}> Grid lines</label>
      <label class="pc-ck"><input type="checkbox" data-cs="pline" ${S.pline ? "checked" : ""}> Last price line</label><label class="pc-ck"><input type="checkbox" data-cs="vol" ${S.vol ? "checked" : ""}> Volume under candles</label>
      <label>Up color<input type="color" data-cs="up" value="${esc(S.up)}"></label><label>Down color<input type="color" data-cs="dn" value="${esc(S.dn)}"></label></div>
      <div class="pc-row"><button type="button" class="pc-b" data-creset>Reset chart</button><button type="button" class="pc-b pc-pri" data-pclose>Done</button></div>`);
    pop.querySelectorAll("[data-cs]").forEach(i => i.oninput = i.onchange = () => { const f = i.dataset.cs; S[f] = i.type === "checkbox" ? i.checked : i.value; persist(); syncTop(); draw(); }); }
  function typePick() { openPop(`<div class="pc-ph"><b>Chart type</b><button type="button" class="pc-b" data-pclose aria-label="Close">✕</button></div><div class="pc-il">${TYPES.map(([k, n]) => `<button type="button" data-ctype="${k}" aria-pressed="${S.type === k}"><span>${n}</span></button>`).join("")}</div>`); }
  function syncTop() { const tl = host.querySelector(".pc-tl"); if (tl) tl.textContent = (TYPES.find(t => t[0] === S.type) || [0, ""])[1]; const s = host.querySelector(".pc-sym"); if (s) s.textContent = sym; tfs(); }
  host.addEventListener("click", e => { const b = e.target.closest("button"); if (!b || !host.contains(b)) return; const D = b.dataset;
    if (D.tool) setTool(D.tool); else if (D.tf) { tf = D.tf; tfs(); opt.onTf && opt.onTf(D.tf); }
    else if (D.pc === "ind") indList(); else if (D.pc === "set") settings(); else if (D.pc === "type") typePick(); else if (D.pc === "fit") { view.n = B.length; view.off = 0; draw(); }
    else if (D.pc === "shot") { if (drawsOf().length) { S.draw[sym] = []; persist(); draw(); } } else if (D.pc === "close") opt.onClose && opt.onClose();
    else if (D.iadd) { const I = IND[D.iadd]; S.inds.push({ id: D.iadd, p: { col: I[2].col } }); persist(); compute(); draw(); pop.hidden = true; }
    else if (D.ie != null) indEdit(+D.ie); else if (D.ix != null) { S.inds.splice(+D.ix, 1); persist(); compute(); pop.hidden = true; draw(); }
    else if (D.idef != null) { S.inds[+D.idef].p = { col: IND[S.inds[+D.idef].id][2].col }; persist(); compute(); indEdit(+D.idef); draw(); }
    else if (D.ctype) { S.type = D.ctype; persist(); syncTop(); pop.hidden = true; draw(); }
    else if (D.creset != null) { const keep = S.draw; Object.keys(S).forEach(k => delete S[k]); Object.assign(S, { type: "candles", log: false, grid: true, pline: true, vol: true, inds: [], up: T.up, dn: T.dn, draw: keep }); persist(); compute(); syncTop(); pop.hidden = true; draw(); }
    else if (D.pclose != null) pop.hidden = true; });
  syncTop();
  return {
    setBars(bars, s, t) { if (s != null && s !== sym) { sym = s; selD = -1; } if (t) tf = t; B = (bars || []).filter(b => isFinite(b.c)); RB = S.type === "heikin" ? B : B; compute(); syncTop(); draw(); },
    redraw: draw, resize, get settings() { return S; },
    destroy() { ro.disconnect(); document.removeEventListener("keydown", keyH); host.innerHTML = ""; host.classList.remove("pc"); }
  };
};
window.ProChart.INDICATORS = Object.keys(IND).length;
})();
