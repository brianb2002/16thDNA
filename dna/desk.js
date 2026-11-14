/* ================= 16th DNA desk: live engine + 3D-key painter for the Holodex room =================
   Paints every Holodex surface (wall screens, desk strips, ticket, tablets, pads, ring tiles, strategy
   stations, price band) with the 16th DNA functions in the "floating 3D glass key" style, and wires each
   key to a real action. Prices come from UNI (your Claude Coinbase connector when it's on, otherwise the
   demo market). Orders: practice (paper) by default; live orders only through your connector, always
   previewed and confirmed first. */
(() => {
"use strict";
const C = { cy: "#7fe3ff", cy2: "#c4f4ff", wh: "#f2fbff", dim: "#9cc4e6", gr: "#2ee6a8", rd: "#ff5a76", am: "#ffc14d", gold: "#ffcf5a", bl: "#3b8cff", pu: "#b48cff", ink: "#04203a" };
const FD = "Orbitron, Rajdhani, sans-serif", FB = "Rajdhani, Inter, sans-serif", FM = "'Share Tech Mono', monospace";
const LSJ = "dna_journal_v1", LSS = "dna_desk_state_v1";
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const now = () => performance.now();
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; };
const fmt = (v, d) => v == null || !isFinite(v) ? "—" : (+v).toLocaleString("en-US", { minimumFractionDigits: d == null ? (v >= 100 ? 2 : v >= 1 ? 3 : 4) : d, maximumFractionDigits: d == null ? (v >= 100 ? 2 : v >= 1 ? 3 : 5) : d });
const pctS = v => v == null || !isFinite(v) ? "—" : (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
const toast = m => { try { if (window.VL_BAR_API && VL_BAR_API.toastFn) return VL_BAR_API.toastFn(m); } catch (e) {} PANEL.toast(m); };

/* ---------------- engine ---------------- */
const WATCH = ["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "LTC"];
const TFS = [["1m", "ONE_MINUTE"], ["5m", "FIVE_MINUTE"], ["15m", "FIFTEEN_MINUTE"], ["30m", "THIRTY_MINUTE"], ["1h", "ONE_HOUR"], ["1d", "ONE_DAY"]];
const st0 = load(LSS, {});
const D = window.DNA = {
  sym: WATCH.includes(st0.sym) ? st0.sym : "BTC", tf: TFS.some(t => t[0] === st0.tf) ? st0.tf : "15m",
  view: "chart", ind: Object.assign({ EMA: true, RSI: false, MACD: false, VOL: false }, st0.ind || {}),
  side: "BUY", size: +st0.size || 5, bars: [], prods: {}, book: null, bal: null, busy: false, err: "", lastLoad: 0,
  journal: load(LSJ, []), dailyStop: +st0.dailyStop || 0.5, preview: null, msg: ""
};
const saveSt = () => store(LSS, { sym: D.sym, tf: D.tf, ind: D.ind, size: D.size, dailyStop: D.dailyStop });
const U = () => (typeof UNI !== "undefined" ? UNI : null);
const live = () => { const u = U(); return !!(u && !u.practice()); };
const call = async (tool, input) => { const u = U(); if (!u) throw new Error("Engine not ready"); const r = await u.mcp.callTool(u.CBN, tool, input); return r && (r.payload || r.structuredContent || r); };
const num = v => v == null ? NaN : +(typeof v === "object" ? (v.value != null ? v.value : NaN) : v);

async function loadBars() {
  const r = await call("coinbase_products_candles", { product_id: D.sym + "-USD", granularity: D.tf, limit: 90 });
  const cs = (r && (r.candles || r)) || [];
  D.bars = cs.map(c => ({ t: +c.start, o: +c.open, h: +c.high, l: +c.low, c: +c.close, v: +c.volume })).filter(b => isFinite(b.c)).sort((a, b) => a.t - b.t);
}
async function loadProds() {
  const r = await call("coinbase_products_list", { product_type: "SPOT", limit: 250 });
  (r && r.products || []).forEach(p => { const b = p.base_currency_id || String(p.product_id).split("-")[0]; if (WATCH.includes(b) && /-(USD|USDC)$/.test(p.product_id) && !(D.prods[b] && /USD$/.test(D.prods[b].id) && /USDC$/.test(p.product_id))) D.prods[b] = { id: p.product_id, p: +p.price, ch: +p.price_percentage_change_24h }; });
}
async function loadBook() { try { const r = await call("coinbase_products_book", { product_id: D.sym + "-USD", limit: 8 }); D.book = r && (r.pricebook || r); } catch (e) { D.book = null; } }
async function loadBal() {
  try { const r = await call("coinbase_balance", {}); const acc = (r && (r.accounts || r.balances)) || [];
    let usd = 0, usdc = 0, coin = 0; acc.forEach(a => { const cur = a.currency || a.asset; const v = num(a.available_balance || a.available || a.balance) || 0; if (cur === "USD") usd += v; if (cur === "USDC") usdc += v; if (cur === D.sym) coin += v; });
    D.bal = { usd: usd + usdc, usdc, coin, live: live() }; } catch (e) { D.bal = { usd: 0, coin: 0, live: false, err: e.message }; }
}
async function refresh(full) {
  if (D.busy) return; D.busy = true;
  try { await loadBars(); if (full || now() - D.lastLoad > 60000) { await loadProds(); await loadBal(); D.lastLoad = now(); } if (D.view === "book") await loadBook(); D.err = ""; }
  catch (e) { D.err = (e && e.message) || "No market data"; }
  D.busy = false; computeAll(); repaint();
}
const repaint = () => { try { window.__HXREDRAW && window.__HXREDRAW(); } catch (e) {} };

/* indicators + coach + strategies */
const emaA = (a, n) => { const k = 2 / (n + 1); let e = a[0]; return a.map(v => (e = v * k + e * (1 - k))); };
const rsiA = (a, n) => { n = n || 14; const out = [50]; let g = 0, l = 0; for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1]; const up = Math.max(d, 0), dn = Math.max(-d, 0);
  if (i <= n) { g += up / n; l += dn / n; } else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; } out.push(l === 0 ? 100 : 100 - 100 / (1 + g / l)); } return out; };
const atrA = (b, n) => { n = n || 14; let a = b.length ? b[0].h - b[0].l : 0; return b.map((x, i) => { const tr = i ? Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c)) : x.h - x.l; return (a = (a * (n - 1) + tr) / n); }); };
let CO = { sig: "WAIT", why: "Loading prices…", checks: [], plan: null }, STRATS = [];
function computeAll() {
  const b = D.bars; if (b.length < 30) { CO = { sig: "WAIT", why: D.err ? "No prices yet" : "Loading prices…", checks: [], plan: null }; STRATS = []; return; }
  const c = b.map(x => x.c), e21 = emaA(c, 21), e55 = emaA(c, 55), r = rsiA(c), at = atrA(b), L = c.length - 1, last = c[L], atr = at[L];
  D.calc = { e21, e55, r, at };
  const hi20 = Math.max(...b.slice(L - 20, L).map(x => x.h)), lo20 = Math.min(...b.slice(L - 20, L).map(x => x.l));
  const mean20 = c.slice(L - 19).reduce((s, v) => s + v, 0) / 20, sd20 = Math.sqrt(c.slice(L - 19).reduce((s, v) => s + (v - mean20) ** 2, 0) / 20);
  const up = e21[L] > e55[L], cross = e21[L] > e55[L] && e21[L - 3] <= e55[L - 3];
  STRATS = [
    ["EMA BREAKOUT", cross ? "SIGNAL" : up ? "WAIT" : "NO SETUP", "21 EMA crossing above the 55 EMA."],
    ["DONCHIAN TREND", last > hi20 ? "SIGNAL" : last > (hi20 + lo20) / 2 ? "WAIT" : "NO SETUP", "Close above the 20-bar high."],
    ["RSI REVERSION", r[L] < 30 ? "SIGNAL" : r[L] < 40 ? "WAIT" : "NO SETUP", "RSI under 30 in a range."],
    ["BOLLINGER FADE", last < mean20 - 2 * sd20 ? "SIGNAL" : last < mean20 - sd20 ? "WAIT" : "NO SETUP", "Close under the lower 2σ band."],
    ["ATR MOMENTUM", (last - c[L - 3]) > 1.5 * atr && up ? "SIGNAL" : up ? "WAIT" : "NO SETUP", "3-bar move bigger than 1.5 ATR, with the trend."],
    ["RANGE BREAKOUT", (hi20 - lo20) < 4 * atr && last > hi20 ? "SIGNAL" : (hi20 - lo20) < 4 * atr ? "WAIT" : "NO SETUP", "Tight 20-bar range, then a close above it."]
  ];
  const fired = STRATS.filter(s => s[1] === "SIGNAL"), stop = last - 1.5 * atr, target = last + 3 * atr, feePct = 1.2, tgtPct = (target - last) / last * 100;
  const risk = D.size * (last - stop) / last;
  const checks = [[up, up ? "Trend is up (EMA 21 > 55)" : "Trend is down (EMA 21 < 55)"], [tgtPct > feePct, "Target " + tgtPct.toFixed(2) + "% covers ~" + feePct + "% round-trip fees"], [fired.length > 0, fired.length ? fired.length + " strateg" + (fired.length > 1 ? "ies" : "y") + " fired: " + fired.map(s => s[0].toLowerCase()).join(", ") : "No strategy fired this candle"], [risk <= D.dailyStop, "Risk $" + risk.toFixed(2) + " vs daily stop $" + D.dailyStop.toFixed(2)]];
  const ok = checks.every(x => x[0]), downTrend = !up && r[L] > 70;
  CO = { sig: ok ? "BUY" : downTrend ? "SELL" : "WAIT", why: ok ? "All four checks pass" : downTrend ? "Downtrend and overbought: take profit / stay out" : "No live signal yet", checks, plan: { entry: last, stop, target, risk }, rsi: r[L], atr };
}

/* ---------------- 2D helpers (the 3D-key look) ---------------- */
function rr(g, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function T(g, s, x, y, size, col, al, w, font, glow) { g.font = (w || 700) + " " + Math.max(6, Math.round(size)) + "px " + (font || FB); g.fillStyle = col || C.wh; g.textAlign = al || "left"; g.textBaseline = "alphabetic"; g.shadowColor = rgba(col && col[0] === "#" ? col : C.cy, .85); g.shadowBlur = glow == null ? size * .35 : glow; g.fillText(s, x, y); g.shadowBlur = 0; }
function fitT(g, s, x, y, size, maxW, col, al, w, font) { g.font = (w || 700) + " " + Math.round(size) + "px " + (font || FB); let z = size; while (z > 8 && g.measureText(s).width > maxW) { z -= 1; g.font = (w || 700) + " " + Math.round(z) + "px " + (font || FB); } T(g, s, x, y, z, col, al, w, font); }
function head(g, W, H, title, tag, k, tagCol) { T(g, title, 22 * k, 46 * k, 28 * k, C.cy2, "left", 800, FD); if (tag) T(g, tag, W - 22 * k, 44 * k, 18 * k, tagCol || (/LIVE/.test(tag) ? C.gr : C.am), "right", 700, FD);
  const gr = g.createLinearGradient(22 * k, 0, W - 22 * k, 0); gr.addColorStop(0, "rgba(127,227,255,.7)"); gr.addColorStop(1, "rgba(127,227,255,0)"); g.fillStyle = gr; g.fillRect(22 * k, 60 * k, W - 44 * k, 2 * k); }
function icon(g, name, cx, cy, s, col) {
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.5, s * .11); g.lineCap = "round"; g.lineJoin = "round"; g.shadowColor = col; g.shadowBlur = s * .5;
  const L = (a) => { g.beginPath(); a.forEach((p, i) => i ? g.lineTo(cx + p[0] * s, cy + p[1] * s) : g.moveTo(cx + p[0] * s, cy + p[1] * s)); g.stroke(); };
  const R = (x, y, w, h) => { g.strokeRect(cx + x * s, cy + y * s, w * s, h * s); };
  const Cc = (x, y, r, f) => { g.beginPath(); g.arc(cx + x * s, cy + y * s, r * s, 0, 7); f ? g.fill() : g.stroke(); };
  switch (name) {
    case "down": L([[0, -.45], [0, .4]]); L([[-.32, .1], [0, .42], [.32, .1]]); L([[-.45, .5], [.45, .5]]); break;
    case "up": L([[0, .45], [0, -.4]]); L([[-.32, -.1], [0, -.42], [.32, -.1]]); L([[-.45, -.5], [.45, -.5]]); break;
    case "chart": [[-.36, .1, .4], [-.06, -.15, .65], [.24, -.4, .9]].forEach(b => R(b[0], b[1], .2, b[2] - .4 + .4)); L([[-.5, .5], [.5, .5]]); break;
    case "book": L([[0, -.35], [0, .45]]); L([[0, -.35], [-.45, -.45], [-.45, .35], [0, .45], [.45, .35], [.45, -.45], [0, -.35]]); break;
    case "cap": L([[-.55, -.1], [0, -.38], [.55, -.1], [0, .18], [-.55, -.1]]); L([[-.3, .05], [-.3, .32], [0, .45], [.3, .32], [.3, .05]]); break;
    case "journal": R(-.36, -.45, .72, .9); L([[-.18, -.2], [.2, -.2]]); L([[-.18, 0], [.2, 0]]); L([[-.18, .2], [.08, .2]]); break;
    case "progress": L([[-.5, .4], [-.15, 0], [.1, .18], [.5, -.35]]); L([[.22, -.35], [.5, -.35], [.5, -.08]]); break;
    case "user": Cc(0, -.2, .2); L([[-.42, .48], [-.3, .15], [.3, .15], [.42, .48]]); break;
    case "link": Cc(-.2, 0, .24); Cc(.2, 0, .24); break;
    case "bank": L([[-.5, -.15], [0, -.45], [.5, -.15], [-.5, -.15]]); [-.32, 0, .32].forEach(x => L([[x, -.05], [x, .32]])); L([[-.5, .45], [.5, .45]]); break;
    case "gear": Cc(0, 0, .2); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; L([[Math.cos(a) * .32, Math.sin(a) * .32], [Math.cos(a) * .48, Math.sin(a) * .48]]); } Cc(0, 0, .34); break;
    case "pencil": L([[-.4, .4], [-.3, .1], [.25, -.45], [.45, -.25], [-.1, .3], [-.4, .4]]); break;
    case "eye": L([[-.5, 0], [-.25, -.25], [.25, -.25], [.5, 0], [.25, .25], [-.25, .25], [-.5, 0]]); Cc(0, 0, .12, true); break;
    case "check": L([[-.4, 0], [-.12, .3], [.42, -.32]]); break;
    case "ask": Cc(0, -.05, .45); L([[-.15, -.2], [-.05, -.32], [.12, -.3], [.15, -.12], [0, 0], [0, .1]]); Cc(0, .27, .03, true); break;
    case "sym": L([[-.45, .3], [-.15, -.1], [.1, .1], [.45, -.35]]); Cc(.45, -.35, .07, true); break;
    case "dev": L([[-.2, -.3], [-.5, 0], [-.2, .3]]); L([[.2, -.3], [.5, 0], [.2, .3]]); L([[.08, -.4], [-.08, .4]]); break;
    case "globe": Cc(0, 0, .45); L([[-.45, 0], [.45, 0]]); g.beginPath(); g.ellipse(cx, cy, s * .2, s * .45, 0, 0, 7); g.stroke(); break;
    case "play": L([[-.25, -.38], [.38, 0], [-.25, .38], [-.25, -.38]]); break;
    case "clock": Cc(0, 0, .45); L([[0, -.28], [0, 0], [.2, .12]]); break;
    case "bolt": L([[.1, -.5], [-.3, .05], [0, .05], [-.1, .5], [.3, -.05], [0, -.05], [.1, -.5]]); break;
    case "list": [-.3, 0, .3].forEach(y => { Cc(-.38, y, .05, true); L([[-.2, y], [.45, y]]); }); break;
    default: Cc(0, 0, .3);
  }
  g.restore();
}
/* the chosen button style: a raised glass key floating over its own pool of light */
function key(g, sf, x, y, w, h, o) {
  o = o || {}; const col = o.col || C.cy, on = !!o.on, pr = !!(sf && sf.press && now() - sf.press.t < 260 && Math.abs(sf.press.x - x) < 1 && Math.abs(sf.press.y - y) < 1);
  const d = Math.max(4, Math.min(h * .14, 16)), r = Math.min(h * .26, 22), lift = pr ? d * .75 : 0, fy = y + lift, fh = h - d;
  g.save();
  const pool = g.createRadialGradient(x + w / 2, y + h - d * .2, 1, x + w / 2, y + h - d * .2, Math.max(w, h) * .62); pool.addColorStop(0, rgba(col, on || pr ? .55 : .32)); pool.addColorStop(1, rgba(col, 0));
  g.fillStyle = pool; g.fillRect(x - w * .15, y + h * .45, w * 1.3, h * .8);
  rr(g, x, y + d, w, fh, r); g.fillStyle = rgba(col, .38); g.fill(); g.strokeStyle = rgba(col, .7); g.lineWidth = 1.5; g.stroke();         /* key side (depth) */
  rr(g, x, fy, w, fh, r); const gr = g.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, rgba(col, on || pr ? .78 : .5)); gr.addColorStop(.55, rgba(col, on || pr ? .42 : .2)); gr.addColorStop(1, "rgba(6,22,56,.78)");
  g.fillStyle = gr; g.shadowColor = col; g.shadowBlur = on || pr ? 30 : 16; g.fill(); g.shadowBlur = 0;
  g.lineWidth = Math.max(2, h * .035); g.strokeStyle = pr ? "#ffffff" : rgba(col, .95); g.stroke();
  g.save(); rr(g, x + 3, fy + 3, w - 6, fh * .42, r * .8); g.clip(); const hl = g.createLinearGradient(0, fy, 0, fy + fh * .45); hl.addColorStop(0, "rgba(255,255,255,.42)"); hl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = hl; g.fillRect(x, fy, w, fh * .5); g.restore();
  if (on || o.spark !== false) { const t = Date.now() / 1000, n = on ? 5 : 2; for (let i = 0; i < n; i++) { const ph = (t * .35 + i * .37 + (x * .013 % 1)) % 1, px = x + w * (.12 + ((i * .618 + x * .007) % 1) * .76), py = fy - ph * h * .35;
    g.fillStyle = rgba(col === C.cy ? "#bff3ff" : col, (1 - ph) * .85); g.beginPath(); g.arc(px, py, Math.max(1.2, h * .025), 0, 7); g.fill(); } }
  const ink = on || pr ? C.wh : (o.ink || C.wh), lab = o.label || "", sub = o.sub, ic = o.icon;
  if (ic && o.iconTop && fh > 64) { icon(g, ic, x + w / 2, fy + fh * .3, Math.min(fh * .3, w * .3), ink); fitT(g, lab, x + w / 2, fy + fh * (sub ? .66 : .78), Math.min(fh * .24, 30), w * .86, ink, "center", 800, FD); if (sub) fitT(g, sub, x + w / 2, fy + fh * .88, Math.min(fh * .13, 18), w * .86, C.cy2, "center", 700, FM); }
  else { const fs = Math.min(fh * (sub ? .36 : .46), w * .15, 40); let tx = x + w / 2;
    if (ic) { const s = fs * 1.05, tw = (g.font = "800 " + Math.round(fs) + "px " + FD, g.measureText(lab).width); const sx = x + w / 2 - (tw + s * 1.3) / 2 + s / 2; icon(g, ic, sx, fy + fh * (sub ? .4 : .5), s, ink); tx = sx + s * .8 + tw / 2; }
    fitT(g, lab, tx, fy + fh * (sub ? .52 : .5) + fs * .36, fs, w * .82, ink, "center", 800, FD); if (sub) fitT(g, sub, x + w / 2, fy + fh * .84, fs * .5, w * .86, C.cy2, "center", 700, FM); }
  g.restore();
  if (sf && o.act) { sf.btns = sf.btns || []; sf.btns.push({ x, y, w, h, act: o.act }); }
}
function chip(g, x, y, w, h, label, col, fill) { g.save(); rr(g, x, y, w, h, h / 2); g.fillStyle = fill ? col : rgba(col, .14); g.shadowColor = col; g.shadowBlur = fill ? 14 : 0; g.fill(); g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); g.restore(); fitT(g, label, x + w / 2, y + h * .68, h * .52, w * .9, fill ? C.ink : col, "center", 800, FD); }

/* ---------------- surfaces ---------------- */
function drawChart(g, x, y, w, h) {
  const b = D.bars.slice(-64); if (b.length < 2) { T(g, D.err ? "No prices: " + D.err : "Loading prices…", x + w / 2, y + h / 2, h * .08, C.dim, "center", 600); return; }
  const volH = D.ind.VOL ? h * .16 : 0, subH = (D.ind.RSI || D.ind.MACD) ? h * .22 : 0, ch = h - volH - subH;
  const lo = Math.min(...b.map(v => v.l)), hi = Math.max(...b.map(v => v.h)), Y = v => y + ch - (v - lo) / (hi - lo || 1) * ch, bw = w / b.length;
  g.strokeStyle = "rgba(127,227,255,.12)"; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x, y + ch * i / 5); g.lineTo(x + w, y + ch * i / 5); g.stroke(); }
  b.forEach((v, i) => { const up = v.c >= v.o, cx = x + i * bw + bw / 2, col = up ? C.gr : C.rd; g.strokeStyle = col; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 6; g.lineWidth = Math.max(1.2, bw * .12);
    g.beginPath(); g.moveTo(cx, Y(v.h)); g.lineTo(cx, Y(v.l)); g.stroke(); g.fillRect(cx - bw * .32, Y(Math.max(v.o, v.c)), bw * .64, Math.max(1.5, Math.abs(Y(v.o) - Y(v.c)))); }); g.shadowBlur = 0;
  const all = D.bars.map(v => v.c), off = all.length - b.length;
  if (D.ind.EMA && D.calc) [[D.calc.e21, C.am], [D.calc.e55, C.pu]].forEach(([e, col]) => { g.strokeStyle = col; g.lineWidth = 2.5; g.shadowColor = col; g.shadowBlur = 8; g.beginPath(); b.forEach((_, i) => { const px = x + i * bw + bw / 2, py = Y(e[i + off]); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); g.shadowBlur = 0; });
  if (CO.plan && D.view === "chart") [[CO.plan.target, C.gr, "TARGET"], [CO.plan.stop, C.rd, "STOP"]].forEach(([v, col, n]) => { if (v < lo || v > hi) return; g.setLineDash([8, 6]); g.strokeStyle = rgba(col, .8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, Y(v)); g.lineTo(x + w, Y(v)); g.stroke(); g.setLineDash([]); T(g, n, x + 6, Y(v) - 5, Math.max(10, h * .045), col, "left", 700, FD); });
  const last = b[b.length - 1].c; g.setLineDash([10, 8]); g.strokeStyle = C.cy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y(last)); g.lineTo(x + w, Y(last)); g.stroke(); g.setLineDash([]);
  let yy = y + ch;
  if (volH) { const mv = Math.max(...b.map(v => v.v || 0)) || 1; b.forEach((v, i) => { g.fillStyle = rgba(v.c >= v.o ? C.gr : C.rd, .5); const hh = (v.v || 0) / mv * volH * .9; g.fillRect(x + i * bw + bw * .2, yy + volH - hh, bw * .6, hh); }); yy += volH; }
  if (subH && D.calc) { g.strokeStyle = "rgba(127,227,255,.2)"; g.strokeRect(x, yy + 4, w, subH - 6);
    if (D.ind.RSI) { const r = D.calc.r; g.strokeStyle = C.cy; g.lineWidth = 2; g.beginPath(); b.forEach((_, i) => { const px = x + i * bw + bw / 2, py = yy + 4 + (1 - r[i + off] / 100) * (subH - 8); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); T(g, "RSI " + r[r.length - 1].toFixed(0), x + 8, yy + 20, Math.max(10, subH * .2), C.cy, "left", 700, FM); }
    if (D.ind.MACD) { const m12 = emaA(all, 12), m26 = emaA(all, 26), mac = m12.map((v, i) => v - m26[i]), sg = emaA(mac, 9), hs = mac.map((v, i) => v - sg[i]).slice(off), mx = Math.max(...hs.map(Math.abs)) || 1, mid = yy + subH / 2;
      hs.forEach((v, i) => { g.fillStyle = rgba(v >= 0 ? C.gr : C.rd, .7); const hh = v / mx * (subH / 2 - 6); g.fillRect(x + i * bw + bw * .25, Math.min(mid, mid - hh), bw * .5, Math.abs(hh)); }); T(g, "MACD", x + w - 8, yy + 20, Math.max(10, subH * .2), C.pu, "right", 700, FM); } }
}
const TABS = [["chart", "CHART", "chart"], ["book", "BOOK", "book"], ["coach", "COACH", "cap"], ["journal", "JOURNAL", "journal"], ["progress", "PROGRESS", "progress"], ["account", "ACCOUNT", "user"]];
function wallChart(g, W, H, sf) {
  const k = H / 400, last = D.bars.length ? D.bars[D.bars.length - 1].c : null, first = D.bars.length ? D.bars[Math.max(0, D.bars.length - 64)].o : null, ch = last && first ? (last - first) / first * 100 : null;
  T(g, D.sym + "-USD", 26 * k, 48 * k, 32 * k, C.wh, "left", 900, FD); T(g, D.tf, 26 * k + g.measureText(D.sym + "-USD").width + 16 * k, 48 * k, 22 * k, C.cy, "left", 700, FD);
  T(g, fmt(last), W * .56, 48 * k, 32 * k, C.wh, "center", 800, FM); T(g, (ch >= 0 ? "▲ " : "▼ ") + pctS(ch).replace("+", ""), W * .74, 48 * k, 24 * k, ch >= 0 ? C.gr : C.rd, "center", 800, FM);
  chip(g, W - 176 * k, 22 * k, 150 * k, 34 * k, live() ? "● LIVE" : "● DEMO", live() ? C.gr : C.am);
  const bx = 26 * k, by = 70 * k, bw = W - 52 * k, bh = 252 * k;
  if (D.view === "chart") drawChart(g, bx, by, bw, bh); else VIEWS[D.view](g, bx, by, bw, bh, k, sf);
  const tw = bw / TABS.length; TABS.forEach(([id, lab, ic], i) => key(g, sf, bx + i * tw + 5 * k, 332 * k, tw - 10 * k, 60 * k, { label: lab, icon: ic, on: D.view === id, act: () => { D.view = id; if (id === "book") loadBook().then(repaint); repaint(); } }));
}
const VIEWS = {
  book: (g, x, y, w, h, k) => { const bk = D.book; if (!bk || !bk.bids) { T(g, "Loading the order book…", x + w / 2, y + h / 2, 20 * k, C.dim, "center"); return; }
    const rows = 7, rh = h / (rows * 2 + 1), asks = bk.asks.slice(0, rows).reverse(), bids = bk.bids.slice(0, rows), mx = Math.max(...bk.asks.slice(0, rows).concat(bids).map(r => +r.size)) || 1;
    asks.forEach((r, i) => { const yy = y + i * rh; g.fillStyle = rgba(C.rd, .25); g.fillRect(x + w - w * .5 * (+r.size / mx), yy + 2, w * .5 * (+r.size / mx), rh - 4); T(g, fmt(+r.price), x + 10, yy + rh * .72, rh * .6, C.rd, "left", 700, FM); T(g, (+r.size).toFixed(4), x + w - 10, yy + rh * .72, rh * .6, C.wh, "right", 600, FM); });
    const mid = y + rows * rh; T(g, fmt(D.bars.length ? D.bars[D.bars.length - 1].c : null), x + w / 2, mid + rh * .78, rh * .78, C.cy2, "center", 800, FM);
    bids.forEach((r, i) => { const yy = mid + rh + i * rh; g.fillStyle = rgba(C.gr, .25); g.fillRect(x + w - w * .5 * (+r.size / mx), yy + 2, w * .5 * (+r.size / mx), rh - 4); T(g, fmt(+r.price), x + 10, yy + rh * .72, rh * .6, C.gr, "left", 700, FM); T(g, (+r.size).toFixed(4), x + w - 10, yy + rh * .72, rh * .6, C.wh, "right", 600, FM); }); },
  coach: (g, x, y, w, h, k) => { chip(g, x, y + 6 * k, 170 * k, 46 * k, CO.sig, CO.sig === "BUY" ? C.gr : CO.sig === "SELL" ? C.rd : C.am, true); T(g, CO.why, x + 190 * k, y + 38 * k, 22 * k, C.wh, "left", 700);
    CO.checks.forEach((c, i) => { T(g, c[0] ? "✓" : "✕", x + 6 * k, y + (92 + i * 36) * k, 24 * k, c[0] ? C.gr : C.rd, "left", 900); T(g, c[1], x + 40 * k, y + (92 + i * 36) * k, 20 * k, C.dim, "left", 600); });
    if (CO.plan) T(g, "Plan: entry " + fmt(CO.plan.entry) + " · stop " + fmt(CO.plan.stop) + " · target " + fmt(CO.plan.target) + " · RSI " + CO.rsi.toFixed(0), x + 6 * k, y + h - 10 * k, 18 * k, C.cy2, "left", 700, FM); },
  journal: (g, x, y, w, h, k) => { const j = D.journal.slice(-6).reverse(); if (!j.length) { T(g, "No trades yet. Your practice and live trades land here.", x + w / 2, y + h / 2, 20 * k, C.dim, "center", 600); return; }
    j.forEach((t, i) => { const yy = y + (30 + i * 38) * k; T(g, new Date(t.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), x + 6 * k, yy, 18 * k, C.dim, "left", 600, FM); T(g, t.side + " " + t.sym, x + 110 * k, yy, 20 * k, t.side === "BUY" ? C.gr : C.rd, "left", 800, FD); T(g, "$" + (+t.usd).toFixed(2) + " @ " + fmt(t.px), x + w * .45, yy, 19 * k, C.wh, "left", 700, FM); T(g, t.live ? "LIVE" : "PRACTICE", x + w - 6 * k, yy, 16 * k, t.live ? C.gr : C.am, "right", 700, FD); }); },
  progress: (g, x, y, w, h, k) => { const B = badges(); T(g, B.filter(b => b[1]).length + " / " + B.length + " BADGES", x + 6 * k, y + 30 * k, 24 * k, C.gold, "left", 800, FD);
    B.forEach((b, i) => { const cx = x + (i % 4) * (w / 4), cy = y + 54 * k + Math.floor(i / 4) * 92 * k; chip(g, cx + 6 * k, cy, w / 4 - 12 * k, 40 * k, b[0], b[1] ? C.gold : C.dim, b[1]); T(g, b[2], cx + (w / 4) / 2, cy + 64 * k, 14 * k, C.dim, "center", 600); }); },
  account: (g, x, y, w, h, k) => { const b = D.bal || {}; T(g, (b.live ? "LIVE · " : "PRACTICE · ") + (b.live ? "Coinbase connector" : "demo market, paper money"), x + 6 * k, y + 30 * k, 20 * k, b.live ? C.gr : C.am, "left", 700, FD);
    [["Cash (USD + USDC)", "$" + fmt(b.usd || 0, 2)], [D.sym + " held", fmt(b.coin || 0, 8)], ["Practice P&L", "$" + paperPnl().toFixed(2)], ["Trades logged", String(D.journal.length)], ["Daily stop", "$" + D.dailyStop.toFixed(2)]].forEach((r, i) => { const yy = y + (78 + i * 36) * k; T(g, r[0], x + 6 * k, yy, 20 * k, C.dim, "left", 700, FD); T(g, r[1], x + w - 6 * k, yy, 22 * k, C.wh, "right", 700, FM); }); }
};
function badges() { const j = D.journal, P = j.filter(t => !t.live).length, L = j.filter(t => t.live).length; return [["FIRST TRADE", j.length > 0, "Place any trade"], ["PRACTICE 5", P >= 5, "5 practice trades"], ["PRACTICE 20", P >= 20, "20 practice trades"], ["GO LIVE", L > 0, "First live trade"], ["FOLLOW COACH", j.some(t => t.coach === t.side), "Trade with the coach"], ["STOP SETTER", D.dailyStop > 0, "Set a daily stop"], ["PLATFORM PRO", load("dna_sim_done", 0) >= 3, "Finish 3 platform sims"], ["GREEN DAY", paperPnl() > 0, "Practice P&L above $0"]]; }
function paperPnl() { const last = {}; Object.keys(D.prods).forEach(s => last[s] = D.prods[s].p); if (D.bars.length) last[D.sym] = D.bars[D.bars.length - 1].c; let pnl = 0; D.journal.filter(t => !t.live).forEach(t => { const p = last[t.sym]; if (!p) return; const q = t.usd / t.px; pnl += (t.side === "BUY" ? 1 : -1) * q * (p - t.px) - t.usd * .006; }); return pnl; }

const WALL = {
  tickers: (g, W, H, sf) => { const k = H / 400; head(g, W, H, "WATCHLIST", live() ? "LIVE" : "DEMO", k); const rh = 33 * k;
    WATCH.forEach((s, i) => { const p = D.prods[s] || {}, y = 76 * k + i * rh, sel = s === D.sym; if (sel) { g.fillStyle = "rgba(127,227,255,.14)"; rr(g, 14 * k, y, W - 28 * k, rh - 3 * k, 8 * k); g.fill(); }
      T(g, s, 24 * k, y + rh * .7, 21 * k, sel ? C.cy2 : C.wh, "left", 800, FD); T(g, fmt(p.p), W * .68, y + rh * .7, 19 * k, C.cy2, "right", 700, FM); T(g, pctS(p.ch), W - 22 * k, y + rh * .7, 18 * k, (p.ch || 0) < 0 ? C.rd : C.gr, "right", 700, FM);
      sf.btns.push({ x: 14 * k, y, w: W - 28 * k, h: rh - 2, act: () => setSym(s) }); }); },
  heat: (g, W, H, sf) => { const k = H / 400; head(g, W, H, "COACH", live() ? "LIVE" : "DEMO", k); const col = CO.sig === "BUY" ? C.gr : CO.sig === "SELL" ? C.rd : C.am;
    key(g, sf, W * .12, 78 * k, W * .76, 78 * k, { label: CO.sig, icon: CO.sig === "BUY" ? "up" : CO.sig === "SELL" ? "down" : "clock", col, on: true, act: () => { D.view = "coach"; repaint(); } });
    fitT(g, CO.why, W / 2, 186 * k, 21 * k, W - 40 * k, C.wh, "center", 700);
    CO.checks.forEach((c, i) => { const y = (226 + i * 40) * k; T(g, c[0] ? "✓" : "✕", 24 * k, y, 24 * k, c[0] ? C.gr : C.rd, "left", 900); fitT(g, c[1], 56 * k, y, 18 * k, W - 72 * k, C.dim, "left", 600); }); },
  chart: wallChart,
  movers: (g, W, H, sf) => { const k = H / 400, b = D.bal || {}; head(g, W, H, "ACCOUNT", b.live ? "LIVE" : "PRACTICE", k, b.live ? C.gr : C.am);
    T(g, "$" + fmt(b.usd || 0, 2), 24 * k, 136 * k, 56 * k, C.wh, "left", 900, FM); T(g, b.live ? "USD + USDC AVAILABLE" : "PRACTICE CASH", 26 * k, 168 * k, 17 * k, C.dim, "left", 700, FD);
    [[D.sym, fmt(b.coin || 0, 8)], ["TRADES", String(D.journal.length)], ["BADGES", badges().filter(x => x[1]).length + " / 8"], ["DAILY STOP", "$" + D.dailyStop.toFixed(2)]].forEach((r, i) => { const y = (214 + i * 36) * k; T(g, r[0], 26 * k, y, 18 * k, C.dim, "left", 700, FD); T(g, r[1], W - 24 * k, y, 21 * k, C.wh, "right", 700, FM); });
    key(g, sf, 22 * k, 344 * k, W - 44 * k, 46 * k, { label: "DETAILS", icon: "user", spark: false, act: () => { D.view = "account"; repaint(); } }); },
  sectors: (g, W, H, sf) => { const k = H / 400; head(g, W, H, "STRATEGIES", STRATS.length ? STRATS.filter(s => s[1] === "SIGNAL").length + " SIGNAL" : "LOADING", k);
    STRATS.forEach((s, i) => { const y = (76 + i * 52) * k, col = s[1] === "SIGNAL" ? C.gr : s[1] === "WAIT" ? C.am : C.dim; fitT(g, s[0], 24 * k, y + 28 * k, 18 * k, W * .5, C.wh, "left", 800, FD); chip(g, W - 150 * k, y + 8 * k, 128 * k, 30 * k, s[1], col, s[1] === "SIGNAL"); fitT(g, s[2], 24 * k, y + 46 * k, 13 * k, W * .6, C.dim, "left", 600);
      sf.btns.push({ x: 14 * k, y, w: W - 28 * k, h: 50 * k, act: () => PANEL.strategy(i) }); }); }
};
const ROW = {
  positions: () => ({ label: "ASK", sub: "the teacher", icon: "ask", col: C.cy, act: () => PANEL.ask() }),
  focus: () => ({ label: "SELL", sub: live() ? "live · " + D.sym : "practice · " + D.sym, icon: "down", col: C.rd, on: D.side === "SELL", act: () => armTicket("SELL") }),
  trades: () => { const l = D.bars.length ? D.bars[D.bars.length - 1].c : null; return { label: D.sym + "-USD", sub: fmt(l) + "  ·  tap for next", icon: "sym", col: C.bl, act: () => setSym(WATCH[(WATCH.indexOf(D.sym) + 1) % WATCH.length]) }; },
  mheat: () => ({ label: "BUY", sub: live() ? "live · " + D.sym : "practice · " + D.sym, icon: "up", col: C.gr, on: D.side === "BUY", act: () => armTicket("BUY") }),
  pnl: () => ({ label: "SETTINGS", sub: "AI · broker · desk", icon: "gear", col: C.cy, act: () => PANEL.settings() })
};
const PAD = {
  chart: (g, W, H, sf) => { const k = H / 480; head(g, W, H, "TIMEFRAME", D.tf, k, C.cy);
    TFS.forEach(([t], i) => key(g, sf, (22 + (i % 3) * 244) * k, (82 + Math.floor(i / 3) * 92) * k, 226 * k, 76 * k, { label: t, icon: "clock", on: t === D.tf, act: () => { D.tf = t; saveSt(); refresh(); } }));
    T(g, "INDICATORS", 22 * k, 290 * k, 20 * k, C.dim, "left", 700, FD);
    ["EMA", "RSI", "MACD", "VOL"].forEach((t, i) => key(g, sf, (22 + i * 182) * k, 308 * k, 166 * k, 72 * k, { label: t, col: C.am, on: D.ind[t], act: () => { D.ind[t] = !D.ind[t]; saveSt(); D.view = "chart"; repaint(); } }));
    T(g, "Tap a key: the big chart follows.", 22 * k, 430 * k, 18 * k, C.dim, "left", 600); },
  order: (g, W, H, sf) => { const k = H / 480, u = U(), ai = !!(u && u.aiReady && u.aiReady()), br = live(); head(g, W, H, "CONNECT", null, k);
    key(g, sf, 22 * k, 80 * k, W - 44 * k, 104 * k, { label: "CONNECT AI", sub: ai ? "● Claude built in · " + (u.lock ? "model locked" : "auto") : "○ not connected · tap to set up", icon: "link", col: C.bl, on: ai, act: () => PANEL.settings("ai") });
    key(g, sf, 22 * k, 200 * k, W - 44 * k, 104 * k, { label: "BROKER", sub: br ? "● Coinbase connector · live" : "○ practice · tap to connect Coinbase", icon: "bank", col: "#1fae7a", on: br, act: () => PANEL.settings("broker") });
    key(g, sf, 22 * k, 330 * k, (W - 60 * k) / 2, 70 * k, { label: "DEV MODE", icon: "dev", act: () => MODES.dev() });
    key(g, sf, 38 * k + (W - 60 * k) / 2, 330 * k, (W - 60 * k) / 2, 70 * k, { label: "EDIT DESK", icon: "pencil", act: () => MODES.editDesk() }); },
  ctrl: (g, W, H, sf) => { const k = H / 660; head(g, W, H, "DESK", null, k);
    [["COACH", "cap", () => { D.view = "coach"; repaint(); }], ["LESSONS", "book", () => PANEL.lessons()], ["RESEARCH", "globe", () => PANEL.research()], ["JOURNAL", "journal", () => PANEL.journal()], ["PROGRESS", "progress", () => PANEL.progress()], ["PLATFORMS", "play", () => MODES.sim()]]
      .forEach(([t, ic, fn], i) => key(g, sf, (22 + (i % 2) * 372) * k, (88 + Math.floor(i / 2) * 182) * k, 352 * k, 160 * k, { label: t, icon: ic, iconTop: true, col: i === 5 ? C.gold : C.bl, act: fn })); }
};
function ticket(g, W, H, sf) {
  const k = H / 400, p = CO.plan, last = D.bars.length ? D.bars[D.bars.length - 1].c : null; head(g, W, H, "ORDER TICKET", live() ? "LIVE ORDER" : "PRACTICE", k, live() ? C.gr : C.am);
  chip(g, 22 * k, 76 * k, 132 * k, 40 * k, D.side, D.side === "BUY" ? C.gr : C.rd, true); T(g, D.sym + "-USD · MARKET", 170 * k, 106 * k, 23 * k, C.wh, "left", 800, FD);
  [["PRICE", fmt(last), C.cy2], ["SIZE", "$" + D.size.toFixed(2), C.wh], ["STOP (COACH)", p ? fmt(p.stop) : "—", C.rd], ["TARGET (COACH)", p ? fmt(p.target) : "—", C.gr]].forEach((r, i) => { const x = (22 + (i % 2) * 300) * k, y = (150 + Math.floor(i / 2) * 60) * k; T(g, r[0], x, y, 15 * k, C.dim, "left", 700, FD); T(g, r[1], x, y + 28 * k, 25 * k, r[2], "left", 700, FM); });
  key(g, sf, 470 * k, 128 * k, 70 * k, 50 * k, { label: "−", spark: false, act: () => { D.size = Math.max(1, D.size - 1); saveSt(); D.preview = null; repaint(); } });
  key(g, sf, 550 * k, 128 * k, 70 * k, 50 * k, { label: "+", spark: false, act: () => { D.size = Math.min(1000, D.size + 1); saveSt(); D.preview = null; repaint(); } });
  if (D.msg) fitT(g, D.msg, 22 * k, 290 * k, 15 * k, W - 44 * k, C.am, "left", 700);
  key(g, sf, 22 * k, 304 * k, 286 * k, 80 * k, { label: "PREVIEW", icon: "eye", col: C.bl, act: () => previewOrder() });
  key(g, sf, 332 * k, 304 * k, 286 * k, 80 * k, { label: "PLACE", icon: "check", col: "#1fae7a", on: !!D.preview, act: () => placeOrder() });
}
function setSym(s) { D.sym = s; D.preview = null; D.msg = ""; saveSt(); toast("Showing " + s + "-USD"); refresh(true); }
function armTicket(side) { D.side = side; D.preview = null; D.msg = "Ticket armed: " + side + " $" + D.size.toFixed(2) + " " + D.sym + ". Preview, then place."; repaint(); toast(D.msg); }
async function previewOrder() {
  const last = D.bars.length ? D.bars[D.bars.length - 1].c : null; if (!last) return toast("No price yet.");
  if (!live()) { D.preview = { practice: true, px: last, fee: D.size * .006 }; D.msg = "Practice preview: ~" + (D.size / last).toFixed(8) + " " + D.sym + " at " + fmt(last) + ", fee ~$" + (D.size * .006).toFixed(3); repaint(); return; }
  try { D.msg = "Previewing with Coinbase…"; repaint(); const r = await call("coinbase_orders_preview", orderBody());
    const fee = num(r && (r.commission_total || r.total_fees || r.fee)), q = r && (r.base_size || r.order_total || r.quote_size); D.preview = { live: true, px: last, raw: r, body: orderBody() };
    D.msg = "Coinbase preview OK" + (isFinite(fee) ? " · fee $" + fee.toFixed(3) : "") + (q ? " · size " + q : "") + ". Tap PLACE to send."; }
  catch (e) { D.preview = null; D.msg = "Preview failed: " + (e.message || e); }
  repaint();
}
/* Coinbase connector order shape: product_id, side, type, and quote_size (BUY) or base_size (SELL). Uses your USDC pair when you hold USDC. */
const orderBody = () => { const quote = D.bal && D.bal.usdc > 0 ? "USDC" : "USD", b = { product_id: D.sym + "-" + quote, side: D.side, type: "market", product_type: "SPOT" };
  if (D.side === "BUY") b.quote_size = D.size.toFixed(2); else b.base_size = (Math.floor(D.size / D.bars[D.bars.length - 1].c * 1e8) / 1e8).toFixed(8); return b; };
async function placeOrder() {
  if (!D.preview) return toast("Preview first, then place.");
  const last = D.bars[D.bars.length - 1].c, isLive = !!D.preview.live;
  const ok = await window.xviConfirm((isLive ? "LIVE ORDER with real money\n\n" : "Practice order (paper money)\n\n") + D.side + " $" + D.size.toFixed(2) + " of " + D.sym + " at market (~" + fmt(last) + ")" + (CO.sig !== "WAIT" && CO.sig !== D.side ? "\n\nHeads up: the coach says " + CO.sig + "." : CO.sig === "WAIT" ? "\n\nHeads up: the coach says WAIT." : ""), isLive ? "Place live order" : "Place practice order");
  if (!ok) return;
  let rec = { t: Date.now(), sym: D.sym, side: D.side, usd: D.size, px: last, live: isLive, coach: CO.sig };
  if (isLive) { try { const b = Object.assign({}, D.preview.body || orderBody()); b.client_order_id = "dna-" + Date.now().toString(36); const r = await call("coinbase_orders_create", b); rec.id = r && (r.order_id || (r.success_response && r.success_response.order_id)); if (r && r.success === false) throw new Error((r.error_response && r.error_response.message) || "Order rejected"); D.msg = "Live order sent" + (rec.id ? " · " + rec.id : "") + "."; }
    catch (e) { D.msg = "Order failed: " + (e.message || e); D.preview = null; repaint(); return; } }
  else D.msg = "Practice order filled at " + fmt(last) + ".";
  D.journal.push(rec); store(LSJ, D.journal.slice(-500)); D.preview = null; toast(D.msg); refresh(true);
}

window.DNA_PAINT = function (kind, id, g, W, H, sf) {
  if (sf && kind !== "ring") sf.btns = [];
  g.save();
  try {
    if (kind === "wall" && WALL[id]) WALL[id](g, W, H, sf);
    else if (kind === "row" && ROW[id]) { const o = ROW[id](); key(g, sf, W * .04, H * .08, W * .92, H * .84, o); }
    else if (kind === "pad" && PAD[id]) PAD[id](g, W, H, sf);
    else if (kind === "ticket") ticket(g, W, H, sf);
    else if (kind === "watch") { const k = H / 340; head(g, W, H, "LEARN", null, k); [["COACH", "cap", () => { D.view = "coach"; repaint(); }], ["LESSONS", "book", () => PANEL.lessons()], ["RESEARCH", "globe", () => PANEL.research()], ["JOURNAL", "journal", () => PANEL.journal()]]
      .forEach(([t, ic, fn], i) => key(g, sf, (20 + (i % 2) * 240) * k, (80 + Math.floor(i / 2) * 124) * k, 224 * k, 104 * k, { label: t, icon: ic, iconTop: true, act: fn })); }
    else if (kind === "signals") { const k = H / 340, j = D.journal.slice(-3).reverse(); head(g, W, H, "ORDERS", live() ? "LIVE" : "PRACTICE", k, live() ? C.gr : C.am);
      if (!j.length) T(g, "No orders yet", W / 2, 150 * k, 22 * k, C.dim, "center", 600);
      j.forEach((t, i) => { const y = (100 + i * 52) * k; T(g, (t.live ? "LIVE " : "PRACTICE ") + t.side, 22 * k, y, 18 * k, t.side === "BUY" ? C.gr : C.rd, "left", 800, FD); T(g, "$" + (+t.usd).toFixed(2) + " " + t.sym + " @ " + fmt(t.px), 22 * k, y + 24 * k, 18 * k, C.wh, "left", 600, FM); });
      key(g, sf, 22 * k, 262 * k, W - 44 * k, 62 * k, { label: "ALL ORDERS", icon: "list", act: () => PANEL.journal() }); }
    else if (kind === "tile") { const s = WATCH[id % WATCH.length], p = D.prods[s] || {}; if (sf && sf.m) sf.m.userData.dnaSym = s;
      icon(g, s === D.sym ? "bolt" : "sym", 44, 52, 34, s === D.sym ? C.gold : C.cy); T(g, s, 78, 66, 44, C.wh, "left", 900, FD); T(g, fmt(p.p), 24, 146, 38, C.cy2, "left", 700, FM); T(g, pctS(p.ch), 24, 202, 32, (p.ch || 0) < 0 ? C.rd : C.gr, "left", 800, FM); }
    else if (kind === "station") { STN.has(id) || STN.set(id, STN.size); const i = STN.get(id) % 6, s = STRATS[i] || ["STRATEGY " + (i + 1), "LOADING", ""]; if (sf && sf.mesh) sf.mesh.userData.dnaStrat = i;
      const col = s[1] === "SIGNAL" ? C.gr : s[1] === "WAIT" ? C.am : C.dim; fitT(g, s[0], W / 2, H * .36, Math.min(W * .085, H * .14), W * .9, C.wh, "center", 900, FD); chip(g, W * .22, H * .48, W * .56, H * .2, s[1], col, s[1] === "SIGNAL"); fitT(g, s[2], W / 2, H * .86, H * .07, W * .9, C.dim, "center", 600); }
    else if (kind === "ring") { let x = 20 - (Date.now() / 40 % 600); const items = WATCH.map(s => { const p = D.prods[s] || {}; return [s + " " + fmt(p.p) + " " + pctS(p.ch) + "   ·   ", (p.ch || 0) < 0 ? C.rd : C.cy2]; }); for (let r = 0; r < 4; r++) items.forEach(([s, col]) => { T(g, s, x, H * .72, H * .6, col, "left", 700, FM); x += g.measureText(s).width; }); }
  } catch (e) { console.warn("DNA paint", kind, id, e); }
  g.restore();
};
const STN = new Map();
D.coach = () => CO; D.strats = () => STRATS; D.refresh = refresh;
/* taps on the ring tiles and strategy holograms (they aren't button surfaces in the shell) */
window.DNA_TAP = function (o) { const u = o && o.userData || {}; if (u.dnaSym) { setSym(u.dnaSym); return true; } if (u.dnaStrat != null) { PANEL.strategy(u.dnaStrat); return true; } return false; };

/* ---------------- DOM panels (Ask, Settings, Lessons, Research, Journal, Progress, Strategy) ---------------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PANEL = window.DNA_PANEL = {
  el: null,
  open(title, html, wide) { this.close(); const w = document.createElement("div"); w.className = "dna dna-modal"; w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", title);
    w.innerHTML = `<div class="dna-card${wide ? " wide" : ""}"><div class="dna-hd"><h2>${esc(title)}</h2><button type="button" class="dna-x" aria-label="Close">✕</button></div><div class="dna-bd">${html}</div></div>`;
    w.addEventListener("click", e => { if (e.target === w || e.target.closest(".dna-x")) this.close(); }); document.body.append(w); this.el = w; this._k = e => { if (e.key === "Escape") this.close(); }; document.addEventListener("keydown", this._k); const f = w.querySelector("input,textarea,button.dna-k"); try { (f || w.querySelector(".dna-x")).focus(); } catch (e) {} return w.querySelector(".dna-bd"); },
  close() { if (this.el) { this.el.remove(); this.el = null; document.removeEventListener("keydown", this._k); } },
  toast(m) { let t = document.getElementById("dnaToast"); if (!t) { t = document.createElement("div"); t.id = "dnaToast"; t.className = "dna"; t.setAttribute("role", "status"); document.body.append(t); } t.textContent = m; t.classList.add("on"); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove("on"), 3200); },
  ask() { const u = U(), ai = !!(u && u.aiReady && u.aiReady());
    const bd = this.open("ASK THE TEACHER", `<p class="dna-p">${ai ? "Ask anything about trading or what's on your desk. The teacher sees your symbol, timeframe, coach checks and strategies." : "No AI connected yet. Open this desk inside Claude (Claude is built in), or add your own AI key in Settings → AI."}</p>
      <div class="dna-chat" id="dnaChat"></div><form class="dna-row" id="dnaAskF"><input class="dna-in" id="dnaAskQ" placeholder="Why is the coach saying ${esc(CO.sig)}?" ${ai ? "" : "disabled"} aria-label="Your question"><button class="dna-k" ${ai ? "" : "disabled"}>ASK</button></form>
      <div class="dna-row wrap">${["What does EMA 21 > 55 mean?", "Explain my coach checks", "How do I size a trade?", "What's a stop loss?"].map(q => `<button type="button" class="dna-chip" data-q="${esc(q)}" ${ai ? "" : "disabled"}>${esc(q)}</button>`).join("")}</div>`);
    const chat = bd.querySelector("#dnaChat"), add = (who, txt) => { const d = document.createElement("div"); d.className = "dna-msg " + who; d.textContent = txt; chat.append(d); chat.scrollTop = chat.scrollHeight; return d; };
    const go = async q => { q = q.trim(); if (!q) return; add("me", q); const w = add("ai", "…");
      const ctx = `Desk: ${D.sym}-USD ${D.tf}. Price ${fmt(D.bars.length ? D.bars[D.bars.length - 1].c : null)}. Coach: ${CO.sig} (${CO.why}). Checks: ${CO.checks.map(c => (c[0] ? "pass: " : "fail: ") + c[1]).join("; ")}. Strategies: ${STRATS.map(s => s[0] + " " + s[1]).join(", ")}. Mode: ${live() ? "live" : "practice"}.`;
      try { const r = await u.sample([{ role: "user", content: "You are the 16th DNA trading teacher for a beginner. Plain words, short answers, no financial advice, explain the why.\n" + ctx + "\n\nQuestion: " + q }], { maxTokens: 600 }); w.textContent = (r && (r.text || r.content || r)) + ""; }
      catch (e) { w.textContent = "The teacher couldn't answer: " + (e.message || e); } };
    bd.querySelector("#dnaAskF").addEventListener("submit", e => { e.preventDefault(); const i = bd.querySelector("#dnaAskQ"); go(i.value); i.value = ""; });
    bd.querySelectorAll("[data-q]").forEach(b => b.onclick = () => go(b.dataset.q)); },
  settings(focus) { const u = U(), ai = !!(u && u.aiReady && u.aiReady()), host = !!(u && u.host), mcpOn = !!(u && u.cfg && u.cfg.hostMcp);
    const models = (u && u.CLAUDE_MODELS) || [], lock = u && u.lock;
    const bd = this.open("SETTINGS", `<section class="dna-sec" id="dnaSAi"><h3>AI</h3><p class="dna-p">${ai ? "● Claude is connected (built in)." : host ? "○ Claude is available here but not answering yet." : "○ Open this desk inside Claude to use Claude, built in."}</p>
      <label class="dna-lab">Model lock <select class="dna-in" id="dnaLock"><option value="">No lock (Claude picks)</option>${models.filter(m => m[0] !== "auto").map(m => `<option value="${m[0]}" ${lock && lock.model === m[0] ? "selected" : ""}>${esc(m[1])}</option>`).join("")}</select></label></section>
      <section class="dna-sec" id="dnaSBr"><h3>BROKER</h3><p class="dna-p">${mcpOn ? "● Using your Claude Coinbase connector: live prices, live balance, live orders (always previewed and confirmed)." : "○ Practice mode: demo prices and paper money. Switch on to use your Coinbase connector from claude.ai."}</p>
      <button type="button" class="dna-k" id="dnaBr">${mcpOn ? "SWITCH TO PRACTICE" : "USE MY COINBASE CONNECTOR"}</button></section>
      <section class="dna-sec"><h3>RISK</h3><label class="dna-lab">Daily stop ($) <input class="dna-in" id="dnaStop" type="number" min="0.1" step="0.1" value="${D.dailyStop}"></label><label class="dna-lab">Default size ($) <input class="dna-in" id="dnaSize" type="number" min="1" step="1" value="${D.size}"></label></section>
      <section class="dna-sec"><h3>ROOM</h3><div class="dna-row wrap">${[["beasts", "Bull & bear"], ["clocks", "World clocks"], ["news", "News band"], ["coin", "Bitcoin"]].map(([k, l]) => `<label class="dna-chip"><input type="checkbox" data-dec="${k}" ${!window.DNA_DECOR || window.DNA_DECOR.get(k) ? "checked" : ""}> ${l}</label>`).join("")}</div></section>
      <section class="dna-sec"><h3>DESK</h3><div class="dna-row wrap"><button type="button" class="dna-k" data-m="dash">DASHBOARD</button><button type="button" class="dna-k" data-m="full">FULL SCREEN</button><button type="button" class="dna-k" data-m="sim">SIMULATION</button><button type="button" class="dna-k" data-m="dev">DEV MODE</button><button type="button" class="dna-k" data-m="edit">EDIT DESK</button><button type="button" class="dna-k" data-m="front">FACE THE DESK</button></div></section>`);
    bd.querySelectorAll("[data-dec]").forEach(c => c.onchange = () => { if (window.DNA_DECOR) window.DNA_DECOR.set(c.dataset.dec, c.checked); });
    bd.querySelector("#dnaLock").onchange = e => { try { u.setLock(e.target.value ? { model: e.target.value } : null); toast(e.target.value ? "AI model locked" : "Model lock off"); } catch (er) { toast("Couldn't change the lock: " + er.message); } repaint(); };
    bd.querySelector("#dnaBr").onclick = () => { try { u.setHostMcp(!mcpOn); } catch (e) {} D.lastLoad = 0; this.close(); toast(!mcpOn ? "Coinbase connector on. Allow it when Claude asks." : "Practice mode: demo prices, paper money."); refresh(true); };
    bd.querySelector("#dnaStop").onchange = e => { D.dailyStop = Math.max(.1, +e.target.value || .5); saveSt(); computeAll(); repaint(); };
    bd.querySelector("#dnaSize").onchange = e => { D.size = Math.max(1, Math.round(+e.target.value || 5)); saveSt(); computeAll(); repaint(); };
    bd.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { this.close(); ({ dash: MODES.dash, full: MODES.full, sim: MODES.sim, dev: MODES.dev, edit: MODES.editDesk, front: MODES.front })[b.dataset.m](); });
    const f = bd.querySelector(focus === "broker" ? "#dnaSBr" : focus === "ai" ? "#dnaSAi" : null); if (f) { f.classList.add("hi"); f.scrollIntoView({ block: "nearest" }); } },
  lessons() { const L = LESSONS, done = load("dna_lessons", {});
    const bd = this.open("LESSONS", `<div class="dna-grid">${L.map((l, i) => `<button type="button" class="dna-tile" data-i="${i}"><b>${i + 1}. ${esc(l[0])}</b><span>${done[i] ? "✓ done" : esc(l[1])}</span></button>`).join("")}</div><div id="dnaLes"></div>`, true);
    bd.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { const l = L[+b.dataset.i]; bd.querySelector("#dnaLes").innerHTML = `<article class="dna-art"><h3>${esc(l[0])}</h3>${l[2].map(p => `<p>${esc(p)}</p>`).join("")}<button type="button" class="dna-k" id="dnaLd">MARK DONE</button></article>`;
      bd.querySelector("#dnaLd").onclick = () => { done[b.dataset.i] = 1; store("dna_lessons", done); b.querySelector("span").textContent = "✓ done"; toast("Lesson done"); }; bd.querySelector("#dnaLes").scrollIntoView({ block: "nearest" }); }); },
  research() { const b = D.bars, c = b.map(x => x.c), L = c.length - 1; if (L < 30) return this.open("RESEARCH", "<p class='dna-p'>Loading prices…</p>");
    const hi = Math.max(...b.map(x => x.h)), lo = Math.min(...b.map(x => x.l)), ret = (c[L] - c[0]) / c[0] * 100, vol = Math.sqrt(c.slice(1).reduce((s, v, i) => s + Math.log(v / c[i]) ** 2, 0) / L) * 100;
    this.open("RESEARCH · " + D.sym + "-USD", `<table class="dna-tb"><tr><th>Window</th><td>${b.length} × ${D.tf} candles</td></tr><tr><th>Return</th><td class="${ret >= 0 ? "g" : "r"}">${pctS(ret)}</td></tr><tr><th>High / low</th><td>${fmt(hi)} / ${fmt(lo)}</td></tr><tr><th>Volatility per candle</th><td>${vol.toFixed(3)}%</td></tr><tr><th>ATR (14)</th><td>${fmt(CO.atr)}</td></tr><tr><th>RSI (14)</th><td>${CO.rsi ? CO.rsi.toFixed(1) : "—"}</td></tr><tr><th>Trend</th><td>${D.calc && D.calc.e21[L] > D.calc.e55[L] ? "Up (EMA 21 above 55)" : "Down (EMA 21 below 55)"}</td></tr></table>
      <h3>Watchlist</h3><table class="dna-tb">${WATCH.map(s => { const p = D.prods[s] || {}; return `<tr><th>${s}</th><td>${fmt(p.p)}</td><td class="${(p.ch || 0) < 0 ? "r" : "g"}">${pctS(p.ch)}</td></tr>`; }).join("")}</table><p class="dna-p">${live() ? "Live prices from your Coinbase connector." : "Demo market prices (practice)."}</p>`); },
  journal() { const j = D.journal.slice().reverse();
    const bd = this.open("JOURNAL", j.length ? `<table class="dna-tb"><tr><th>When</th><th>Trade</th><th>Size</th><th>Price</th><th>Coach</th><th>Mode</th></tr>${j.map(t => `<tr><td>${new Date(t.t).toLocaleString()}</td><td class="${t.side === "BUY" ? "g" : "r"}">${t.side} ${t.sym}</td><td>$${(+t.usd).toFixed(2)}</td><td>${fmt(t.px)}</td><td>${esc(t.coach || "")}</td><td>${t.live ? "LIVE" : "practice"}</td></tr>`).join("")}</table><p class="dna-p">Practice P&L (marked to the latest price, after ~0.6% fees): <b>$${paperPnl().toFixed(2)}</b></p><button type="button" class="dna-k" id="dnaJc">CLEAR PRACTICE TRADES</button>` : "<p class='dna-p'>No trades yet. Arm the ticket with BUY or SELL on the desk, preview, then place.</p>", true);
    const c = bd.querySelector("#dnaJc"); if (c) c.onclick = async () => { if (!(await window.xviConfirm("Clear all practice trades from the journal? Live trades stay.", "Clear"))) return; D.journal = D.journal.filter(t => t.live); store(LSJ, D.journal); this.journal(); repaint(); }; },
  progress() { const B = badges(); this.open("PROGRESS", `<div class="dna-grid">${B.map(b => `<div class="dna-tile ${b[1] ? "won" : ""}"><b>${b[1] ? "★" : "☆"} ${esc(b[0])}</b><span>${esc(b[2])}</span></div>`).join("")}</div><p class="dna-p">${B.filter(b => b[1]).length} of ${B.length} badges. Lessons done: ${Object.keys(load("dna_lessons", {})).length} / ${LESSONS.length}.</p>`, true); },
  strategy(i) { const s = STRATS[i]; if (!s) return; this.open(s[0], `<p class="dna-p"><b class="${s[1] === "SIGNAL" ? "g" : ""}">${s[1]}</b> on ${D.sym}-USD ${D.tf}.</p><p class="dna-p">Rule: ${esc(s[2])}</p><p class="dna-p">The coach only says BUY when the trend, fees, a strategy signal and your daily stop all line up. One strategy firing alone isn't enough.</p>`); }
};
const LESSONS = [
  ["Candles", "Read a candle", ["Each candle is one block of time (your timeframe).", "Green: it closed higher than it opened. Red: it closed lower.", "The thin wicks show the highest and lowest prices in that block."]],
  ["Trend", "EMA 21 vs 55", ["An EMA is an average price that leans toward recent candles.", "When the fast one (21) is above the slow one (55), the trend is up. Below means down.", "The coach wants the trend on your side before it says BUY."]],
  ["Fees", "Make sure it's worth it", ["Coinbase charges a fee each way, often around 0.6% for small orders.", "If your target is less than the round-trip fees, even a win loses money.", "The coach checks the target covers fees."]],
  ["Stops", "Know your exit", ["A stop is the price where you admit the idea was wrong.", "The coach puts it 1.5 ATR below the entry: far enough to avoid noise, close enough to keep losses small.", "Set a daily stop in Settings: the most you'll lose in a day."]],
  ["Sizing", "How much to trade", ["Risk = size × distance to stop. Keep it under your daily stop.", "Start tiny (like $5) while you learn. Practice mode costs nothing.", "Bigger size doesn't make a bad setup better."]],
  ["RSI", "Overbought / oversold", ["RSI runs from 0 to 100 and measures how fast price moved.", "Above 70 is stretched up, under 30 stretched down.", "In a strong trend RSI can stay high, so use it with the trend, not against it."]],
  ["Platforms", "Practice on the real layouts", ["Open PLATFORMS (or SIMULATION mode) to practice on layouts like the big trading apps.", "Same demo prices, paper money: learn where the buttons are before real money.", "Finish 3 platform drills for the PLATFORM PRO badge."]]
];

/* ---------------- modes: Dashboard / Full screen / Simulation / Dev ---------------- */
const MODES = window.DNA_MODES = {
  cur: "dash",
  set(m) { this.cur = m; document.documentElement.dataset.dnaMode = m; document.querySelectorAll("#dnaModes [data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m))); },
  dash() { SIM.close(); if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} } this.set("dash"); },
  full() { SIM.close(); const el = document.documentElement; try { if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); } catch (e) {} this.set("full"); toast("Full screen: only the room. Tap ⤢ (top right) to come back."); },
  sim() { this.set("sim"); SIM.open(); },
  dev() { const b = document.getElementById("xdevLaunch"); if (b) b.click(); else toast("Dev mode isn't in this page."); },
  editDesk() { const b = document.getElementById("edit"); if (b) { b.click(); toast("Edit desk: tap two screens to swap them. Hold a screen to move it, pinch to resize."); } else toast("The desk editor isn't in this page."); },
  front() { const b = document.getElementById("vw-seat"); if (b) b.click(); }
};
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && MODES.cur === "full") MODES.set("dash"); });

/* Simulation mode: practice on three common trading-app layouts with the same demo prices and paper money */
const SIM = window.DNA_SIM = {
  el: null, plat: "pro", side: "BUY", step: 0,
  PL: { pro: ["PRO EXCHANGE", "Advanced-trade layout: chart in the middle, order book and trades on the right, order form on the left. Like Coinbase Advanced."],
        simple: ["SIMPLE APP", "One big price, one big buy button. Like the beginner phone apps (Coinbase simple, Robinhood)."],
        broker: ["BROKER TERMINAL", "Watchlist left, chart, positions under it, order entry right. Like Webull or a desktop broker."] },
  STEPS: { pro: ["Pick the pair in the top left (BTC-USD).", "Read the order book: red asks above, green bids below.", "Choose MARKET, type a size in USD.", "Press BUY or SELL, then review the confirm box."], simple: ["Find the big price and the 24h change.", "Tap BUY, type a dollar amount.", "Review the fee line before you confirm.", "Check your order in the history list."], broker: ["Pick a symbol from the watchlist.", "Switch the chart timeframe.", "Fill the order ticket: side, type, quantity.", "Confirm, then find it under Positions."] },
  open() { this.close(); const w = document.createElement("div"); w.className = "dna dna-sim"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "Simulation mode"); this.el = w; document.body.append(w); this.render(); },
  close() { if (this.el) { this.el.remove(); this.el = null; } },
  render() { const w = this.el; if (!w) return; const P = this.PL[this.plat], last = D.bars.length ? D.bars[D.bars.length - 1].c : null, bk = D.book;
    const steps = this.STEPS[this.plat].map((s, i) => `<li class="${i < this.step ? "ok" : i === this.step ? "now" : ""}">${esc(s)}</li>`).join("");
    const form = `<div class="sim-form"><div class="sim-seg"><button type="button" class="${this.side === "BUY" ? "on b" : ""}" data-side="BUY">BUY</button><button type="button" class="${this.side === "SELL" ? "on s" : ""}" data-side="SELL">SELL</button></div><label>Order type<select class="dna-in"><option>Market</option></select></label><label>Amount (USD)<input class="dna-in" id="simAmt" type="number" min="1" value="${D.size}"></label><p class="sim-fee">≈ ${last ? (D.size / last).toFixed(8) : "—"} ${D.sym} · fee ≈ $${(D.size * .006).toFixed(3)}</p><button type="button" class="sim-go ${this.side === "BUY" ? "b" : "s"}" id="simGo">${this.side} ${D.sym}</button></div>`;
    const book = bk && bk.asks ? `<div class="sim-book">${bk.asks.slice(0, 6).reverse().map(r => `<div class="r"><span>${fmt(+r.price)}</span><span>${(+r.size).toFixed(4)}</span></div>`).join("")}<div class="m">${fmt(last)}</div>${bk.bids.slice(0, 6).map(r => `<div class="g"><span>${fmt(+r.price)}</span><span>${(+r.size).toFixed(4)}</span></div>`).join("")}</div>` : `<div class="sim-book"><p>Loading book…</p></div>`;
    const watch = `<div class="sim-watch">${WATCH.map(s => { const p = D.prods[s] || {}; return `<button type="button" data-sym="${s}" class="${s === D.sym ? "on" : ""}"><b>${s}</b><span>${fmt(p.p)}</span><i class="${(p.ch || 0) < 0 ? "r" : "g"}">${pctS(p.ch)}</i></button>`; }).join("")}</div>`;
    const hist = `<div class="sim-hist"><h4>History</h4>${D.journal.filter(t => !t.live).slice(-5).reverse().map(t => `<div><span class="${t.side === "BUY" ? "g" : "r"}">${t.side}</span> $${(+t.usd).toFixed(2)} ${t.sym} @ ${fmt(t.px)}</div>`).join("") || "<div>None yet</div>"}</div>`;
    const tfs = `<div class="sim-tf">${TFS.map(([t]) => `<button type="button" data-tf="${t}" class="${t === D.tf ? "on" : ""}">${t}</button>`).join("")}</div>`;
    const body = this.plat === "pro" ? `<div class="sim-pro"><div class="ca">${form}</div><div class="cb"><div class="sim-pair">${D.sym}-USD <b>${fmt(last)}</b></div>${tfs}<canvas id="simCv"></canvas></div><div class="cc">${book}</div></div>`
      : this.plat === "simple" ? `<div class="sim-simple"><div class="sim-big">${D.sym}<b>$${fmt(last)}</b><i class="${(D.prods[D.sym] || {}).ch < 0 ? "r" : "g"}">${pctS((D.prods[D.sym] || {}).ch)} today</i></div><canvas id="simCv"></canvas>${form}${hist}</div>`
      : `<div class="sim-broker"><div class="ca">${watch}</div><div class="cb">${tfs}<canvas id="simCv"></canvas>${hist}</div><div class="cc">${form}</div></div>`;
    w.innerHTML = `<div class="sim-top"><div class="sim-plats">${Object.keys(this.PL).map(k => `<button type="button" data-plat="${k}" aria-pressed="${k === this.plat}">${this.PL[k][0]}</button>`).join("")}</div><span class="sim-tag">PRACTICE · PAPER MONEY · ${live() ? "LIVE PRICES" : "DEMO PRICES"}</span><button type="button" class="dna-x" id="simX" aria-label="Back to the dashboard">✕ DASHBOARD</button></div>
      <div class="sim-main"><div class="sim-steps"><h3>${esc(P[0])}</h3><p>${esc(P[1])}</p><ol>${steps}</ol></div><div class="sim-app">${body}</div></div>`;
    const cv = w.querySelector("#simCv"); if (cv) { const r = cv.getBoundingClientRect(), dp = Math.min(2, devicePixelRatio || 1); cv.width = Math.max(200, r.width * dp); cv.height = Math.max(120, r.height * dp); const g = cv.getContext("2d"); const sv = D.view; D.view = "sim"; drawChart(g, 8 * dp, 8 * dp, cv.width - 16 * dp, cv.height - 16 * dp); D.view = sv; }
    w.querySelector("#simX").onclick = () => MODES.dash();
    w.querySelectorAll("[data-plat]").forEach(b => b.onclick = () => { this.plat = b.dataset.plat; this.step = 0; this.render(); });
    w.querySelectorAll("[data-side]").forEach(b => b.onclick = () => { this.side = b.dataset.side; this.adv(this.plat === "simple" ? 1 : 2); this.render(); });
    w.querySelectorAll("[data-sym]").forEach(b => b.onclick = () => { setSym(b.dataset.sym); this.adv(0); setTimeout(() => this.render(), 600); });
    w.querySelectorAll("[data-tf]").forEach(b => b.onclick = () => { D.tf = b.dataset.tf; saveSt(); this.adv(this.plat === "broker" ? 1 : 0); refresh().then(() => this.render()); });
    const amt = w.querySelector("#simAmt"); if (amt) amt.onchange = () => { D.size = Math.max(1, Math.round(+amt.value || 5)); saveSt(); this.adv(2); this.render(); };
    w.querySelector("#simGo").onclick = async () => { const px = D.bars.length ? D.bars[D.bars.length - 1].c : null; if (!px) return;
      if (!(await window.xviConfirm("Practice order (paper money)\n\n" + this.side + " $" + D.size.toFixed(2) + " of " + D.sym + " at market (~" + fmt(px) + ")\nFee ≈ $" + (D.size * .006).toFixed(3), "Confirm practice order"))) return;
      D.journal.push({ t: Date.now(), sym: D.sym, side: this.side, usd: D.size, px, live: false, coach: CO.sig, plat: this.plat }); store(LSJ, D.journal.slice(-500)); this.step = 4;
      const done = new Set(load("dna_sim_plats", [])); done.add(this.plat); store("dna_sim_plats", [...done]); store("dna_sim_done", done.size); toast("Practice order filled. Drill complete on " + this.PL[this.plat][0] + "."); this.render(); repaint(); };
    if (this.plat === "pro" && !D.book) loadBook().then(() => this.render()); },
  adv(i) { this.step = Math.max(this.step, i + 1); }
};

/* ---------------- boot ---------------- */
function bar() {
  const b = document.createElement("div"); b.id = "dnaModes"; b.className = "dna"; b.setAttribute("role", "group"); b.setAttribute("aria-label", "Desk mode");
  b.innerHTML = `<span class="dna-brand">16TH DNA</span>${[["dash", "DASHBOARD"], ["full", "FULL SCREEN"], ["sim", "SIMULATION"]].map(([m, l]) => `<button type="button" data-mode="${m}" aria-pressed="${m === "dash"}">${l}</button>`).join("")}<button type="button" data-act="dev">DEV</button>`;
  b.addEventListener("click", e => { const x = e.target.closest("button"); if (!x) return; if (x.dataset.mode) MODES[x.dataset.mode](); else MODES.dev(); });
  document.body.append(b);
  const ex = document.createElement("button"); ex.type = "button"; ex.id = "dnaExit"; ex.className = "dna"; ex.textContent = "⤢"; ex.setAttribute("aria-label", "Leave full screen"); ex.onclick = () => MODES.dash(); document.body.append(ex);
  MODES.set("dash");
}
function boot() { bar(); refresh(true); setInterval(() => refresh(), 12000); window.DNA_ON = true; }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else setTimeout(boot, 0);
})();
