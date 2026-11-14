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
const OVK = "dna_desk_ovr"; let OVS = load(OVK, {});
const OV = id => OVS[id] || {};
const devOn = () => document.body.classList.contains("x-dev");
let CUR = "";
window.DNA_OVR = { get: OV, all: () => OVS, set(id, patch) { const o = Object.assign({}, OVS[id] || {}, patch); Object.keys(o).forEach(k => { if (o[k] === "" || o[k] == null) delete o[k]; }); if (Object.keys(o).length) OVS[id] = o; else delete OVS[id]; store(OVK, OVS); repaint(); },
  reset(id) { delete OVS[id]; store(OVK, OVS); repaint(); }, resetAll() { OVS = {}; store(OVK, OVS); repaint(); } };
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

async function loadBars() { const s = D.sym, tf = D.tf;
  const r = await call("coinbase_products_candles", { product_id: s + "-USD", granularity: tf, limit: 300 }); if (s !== D.sym || tf !== D.tf) throw { stale: true };
  const cs = (r && (r.candles || r)) || [];
  D.bars = cs.map(c => ({ t: +c.start, o: +c.open, h: +c.high, l: +c.low, c: +c.close, v: +c.volume })).filter(b => isFinite(b.c)).sort((a, b) => a.t - b.t);
}
async function loadProds() {
  const r = await call("coinbase_products_list", { product_type: "SPOT", limit: 250 });
  (r && r.products || []).forEach(p => { const b = p.base_currency_id || String(p.product_id).split("-")[0]; if (WATCH.includes(b) && /-(USD|USDC)$/.test(p.product_id) && !(D.prods[b] && /USD$/.test(D.prods[b].id) && /USDC$/.test(p.product_id))) D.prods[b] = { id: p.product_id, p: +p.price, ch: +p.price_percentage_change_24h }; });
}
async function loadBook() { const s = D.sym; try { const r = await call("coinbase_products_book", { product_id: s + "-USD", limit: 12 }); if (s === D.sym) D.book = r && (r.pricebook || r); } catch (e) { D.book = null; } }
async function loadBal() {
  try { const r = await call("coinbase_balance", {}); const acc = (r && (r.accounts || r.balances)) || [];
    let usd = 0, usdc = 0, coin = 0; acc.forEach(a => { const cur = a.currency || a.asset; const v = num(a.available_balance || a.available || a.balance) || 0; if (cur === "USD") usd += v; if (cur === "USDC") usdc += v; if (cur === D.sym) coin += v; });
    D.bal = { usd: usd + usdc, usdc, coin, live: live() }; } catch (e) { D.bal = { usd: 0, coin: 0, live: false, err: e.message }; }
}
async function refresh(full) {
  if (D.busy) { D.again = true; return; } D.busy = true; D.again = false;
  try { await loadBars(); if (full || now() - D.lastLoad > 60000) { await loadProds(); await loadBal(); D.lastLoad = now(); } if (D.view === "book" || SIM.el || D.book === null) await loadBook(); D.err = ""; }
  catch (e) { if (!(e && e.stale)) D.err = (e && e.message) || "No market data"; else D.again = true; }
  D.busy = false; if (D.again) { D.again = false; setTimeout(() => refresh(full), 0); } computeAll(); try { PAPER.check(); } catch (e) {} repaint(); try { CHART.update(); SIM.update(); } catch (e) { console.warn("DNA update", e); }
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
  o = o || {}; const kid = CUR + ":" + (o.kid || o.label || "key"), ov = OV("k|" + kid);
  if (ov.label != null) o = Object.assign({}, o, { label: ov.label }); if (ov.sub != null) o = Object.assign({}, o, { sub: ov.sub || null }); if (ov.col) o = Object.assign({}, o, { col: ov.col });
  if (ov.size && ov.size !== 100) { const s = ov.size / 100, nw = w * s, nh = h * s; x += (w - nw) / 2; y += (h - nh) / 2; w = nw; h = nh; }
  if (ov.act) { const a = ov.act; o = Object.assign({}, o, { act: () => runAct(a) }); }
  if (ov.hide) { if (sf) { sf.btns = sf.btns || []; sf.btns.push({ x, y, w, h, kid, label: o.label, hidden: true, act: () => {} }); }
    if (devOn()) { g.save(); g.setLineDash([10, 8]); g.strokeStyle = "rgba(127,227,255,.6)"; g.lineWidth = 2; rr(g, x, y, w, h, 14); g.stroke(); g.restore(); fitT(g, "hidden · " + (o.label || ""), x + w / 2, y + h / 2 + 6, Math.min(h * .25, 20), w * .9, "rgba(156,196,230,.8)", "center", 700, FD); }
    return; }
  const col = o.col || C.cy, on = !!o.on, pr = !!(sf && sf.press && now() - sf.press.t < 260 && Math.abs(sf.press.x - x) < 1 && Math.abs(sf.press.y - y) < 1);
  const d = Math.max(4, Math.min(h * .14, 16)), r = Math.min(h * .26, 22), lift = pr ? d * .75 : 0, fy = y + lift, fh = h - d;
  g.save();
  const pool = g.createRadialGradient(x + w / 2, y + h - d * .2, 1, x + w / 2, y + h - d * .2, Math.max(w, h) * .62); pool.addColorStop(0, rgba(col, on || pr ? .55 : .32)); pool.addColorStop(1, rgba(col, 0));
  g.fillStyle = pool; g.fillRect(x - w * .15, y + h * .45, w * 1.3, h * .8);
  rr(g, x, y + d, w, fh, r); g.fillStyle = rgba(col, .38); g.fill(); g.strokeStyle = rgba(col, .7); g.lineWidth = 1.5; g.stroke();         /* key side (depth) */
  rr(g, x, fy, w, fh, r); const gr = g.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, rgba(col, on || pr ? .78 : .5)); gr.addColorStop(.55, rgba(col, on || pr ? .42 : .2)); gr.addColorStop(1, "rgba(6,22,56,.78)");
  g.fillStyle = gr; g.shadowColor = col; g.shadowBlur = on || pr ? 30 : 16; g.fill(); g.shadowBlur = 0;
  g.lineWidth = Math.max(2, h * .035); g.strokeStyle = pr ? "#ffffff" : rgba(col, .95); g.stroke();
  g.save(); rr(g, x + 3, fy + 3, w - 6, fh * .42, r * .8); g.clip(); const hl = g.createLinearGradient(0, fy, 0, fy + fh * .45); hl.addColorStop(0, "rgba(255,255,255,.42)"); hl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = hl; g.fillRect(x, fy, w, fh * .5); g.restore();
  if (on || pr) { const t = Date.now() / 1000, n = 4; for (let i = 0; i < n; i++) { const ph = (t * .35 + i * .37 + (x * .013 % 1)) % 1, px = x + w * (.12 + ((i * .618 + x * .007) % 1) * .76), py = fy - ph * h * .35;
    g.fillStyle = rgba(col === C.cy ? "#bff3ff" : col, (1 - ph) * .85); g.beginPath(); g.arc(px, py, Math.max(1.2, h * .025), 0, 7); g.fill(); } }
  const ink = on || pr ? C.wh : (o.ink || C.wh), lab = o.label || "", sub = o.sub, ic = o.icon;
  if (ic && o.iconTop && fh > 64) { icon(g, ic, x + w / 2, fy + fh * .3, Math.min(fh * .3, w * .3), ink); fitT(g, lab, x + w / 2, fy + fh * (sub ? .66 : .78), Math.min(fh * .24, 30), w * .86, ink, "center", 800, FD); if (sub) fitT(g, sub, x + w / 2, fy + fh * .88, Math.min(fh * .13, 18), w * .86, C.cy2, "center", 700, FM); }
  else { const fs = Math.min(fh * (sub ? .36 : .46), w * .15, 40); let tx = x + w / 2;
    if (ic) { const s = fs * 1.05, tw = (g.font = "800 " + Math.round(fs) + "px " + FD, g.measureText(lab).width); const sx = x + w / 2 - (tw + s * 1.3) / 2 + s / 2; icon(g, ic, sx, fy + fh * (sub ? .4 : .5), s, ink); tx = sx + s * .8 + tw / 2; }
    fitT(g, lab, tx, fy + fh * (sub ? .52 : .5) + fs * .36, fs, w * .82, ink, "center", 800, FD); if (sub) fitT(g, sub, x + w / 2, fy + fh * .84, fs * .5, w * .86, C.cy2, "center", 700, FM); }
  g.restore();
  if (sf && o.act) { sf.btns = sf.btns || []; sf.btns.push({ x, y, w, h, act: o.act, kid, label: o.label, col }); }
}
function chip(g, x, y, w, h, label, col, fill) { g.save(); rr(g, x, y, w, h, h / 2); g.fillStyle = fill ? col : rgba(col, .14); g.shadowColor = col; g.shadowBlur = fill ? 14 : 0; g.fill(); g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); g.restore(); fitT(g, label, x + w / 2, y + h * .68, h * .52, w * .9, fill ? C.ink : col, "center", 800, FD); }

/* ---------------- surfaces ---------------- */
function drawChart(g, x, y, w, h) {
  const PADB = 4, b = D.bars.slice(-60); if (b.length < 2) { T(g, D.err ? "No prices: " + D.err : "Loading prices…", x + w / 2, y + h / 2, h * .08, C.dim, "center", 600); return; }
  const volH = D.ind.VOL ? h * .16 : 0, subH = (D.ind.RSI || D.ind.MACD) ? h * .22 : 0, ch = h - volH - subH;
  const lo = Math.min(...b.map(v => v.l)), hi = Math.max(...b.map(v => v.h)), Y = v => y + ch - (v - lo) / (hi - lo || 1) * ch, bw = w / (b.length + PADB);
  g.strokeStyle = "rgba(127,227,255,.12)"; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x, y + ch * i / 5); g.lineTo(x + w, y + ch * i / 5); g.stroke(); }
  b.forEach((v, i) => { const up = v.c >= v.o, cx = x + i * bw + bw / 2, col = up ? C.gr : C.rd; g.strokeStyle = col; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 6; g.lineWidth = Math.max(1.2, bw * .12);
    g.beginPath(); g.moveTo(cx, Y(v.h)); g.lineTo(cx, Y(v.l)); g.stroke(); g.fillRect(cx - bw * .32, Y(Math.max(v.o, v.c)), bw * .64, Math.max(1.5, Math.abs(Y(v.o) - Y(v.c)))); }); g.shadowBlur = 0;
  const all = D.bars.map(v => v.c), off = all.length - b.length;
  if (D.ind.EMA && D.calc) [[D.calc.e21, C.am], [D.calc.e55, C.pu]].forEach(([e, col]) => { g.strokeStyle = col; g.lineWidth = 2.5; g.shadowColor = col; g.shadowBlur = 8; g.beginPath(); b.forEach((_, i) => { const px = x + i * bw + bw / 2, py = Y(e[i + off]); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); g.shadowBlur = 0; });
  if (CO.plan && D.view === "chart") [[CO.plan.target, C.gr, "TARGET"], [CO.plan.stop, C.rd, "STOP"]].forEach(([v, col, n]) => { if (v < lo || v > hi) return; g.setLineDash([8, 6]); g.strokeStyle = rgba(col, .8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, Y(v)); g.lineTo(x + w, Y(v)); g.stroke(); g.setLineDash([]); T(g, n, x + 6, Y(v) - 5, Math.max(10, h * .045), col, "left", 700, FD); });
  const lb = b[b.length - 1], last = lb.c; g.setLineDash([10, 8]); g.strokeStyle = C.cy; g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y(last)); g.lineTo(x + w, Y(last)); g.stroke(); g.setLineDash([]);
  if (D.tfSec) { const left = Math.max(0, lb.t + D.tfSec() - Date.now() / 1000), mm = Math.floor(left / 60), ss = Math.floor(left % 60), lab = (mm >= 60 ? Math.floor(mm / 60) + "h " + (mm % 60) + "m" : mm + ":" + String(ss).padStart(2, "0"));
    const px = x + (b.length - 1) * bw + bw / 2; g.fillStyle = "rgba(127,227,255,.12)"; g.fillRect(px - bw / 2, y, bw, ch); T(g, "candle closes in " + lab + "  ·  tap chart for full screen", x + w - 4, y + h - 4, Math.max(10, h * .04), C.dim, "right", 700, FM); }
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
  if (D.view === "chart") { drawChart(g, bx, by, bw, bh); sf.btns.push({ x: bx, y: by, w: bw, h: bh, act: () => MODES.chart(), kid: CUR + ":plot", label: "Chart (opens full screen)", row: true }); } else VIEWS[D.view](g, bx, by, bw, bh, k, sf);
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
      sf.btns.push({ x: 14 * k, y, w: W - 28 * k, h: rh - 2, act: () => setSym(s), kid: CUR + ":" + s, label: s, row: true }); }); },
  heat: (g, W, H, sf) => { const k = H / 400; head(g, W, H, "COACH", live() ? "LIVE" : "DEMO", k); const col = CO.sig === "BUY" ? C.gr : CO.sig === "SELL" ? C.rd : C.am;
    key(g, sf, W * .12, 78 * k, W * .76, 78 * k, { kid: "signal", label: CO.sig, icon: CO.sig === "BUY" ? "up" : CO.sig === "SELL" ? "down" : "clock", col, on: true, act: () => { D.view = "coach"; repaint(); } });
    fitT(g, CO.why, W / 2, 186 * k, 21 * k, W - 40 * k, C.wh, "center", 700);
    CO.checks.forEach((c, i) => { const y = (226 + i * 40) * k; T(g, c[0] ? "✓" : "✕", 24 * k, y, 24 * k, c[0] ? C.gr : C.rd, "left", 900); fitT(g, c[1], 56 * k, y, 18 * k, W - 72 * k, C.dim, "left", 600); }); },
  chart: wallChart,
  movers: (g, W, H, sf) => { const k = H / 400, b = D.bal || {}; head(g, W, H, "ACCOUNT", b.live ? "LIVE" : "PRACTICE", k, b.live ? C.gr : C.am);
    T(g, "$" + fmt(b.usd || 0, 2), 24 * k, 136 * k, 56 * k, C.wh, "left", 900, FM); T(g, b.live ? "USD + USDC AVAILABLE" : "PRACTICE CASH", 26 * k, 168 * k, 17 * k, C.dim, "left", 700, FD);
    [[D.sym, fmt(b.coin || 0, 8)], ["TRADES", String(D.journal.length)], ["BADGES", badges().filter(x => x[1]).length + " / 8"], ["DAILY STOP", "$" + D.dailyStop.toFixed(2)]].forEach((r, i) => { const y = (214 + i * 36) * k; T(g, r[0], 26 * k, y, 18 * k, C.dim, "left", 700, FD); T(g, r[1], W - 24 * k, y, 21 * k, C.wh, "right", 700, FM); });
  },
  sectors: (g, W, H, sf) => { const k = H / 400; head(g, W, H, "STRATEGIES", STRATS.length ? STRATS.filter(s => s[1] === "SIGNAL").length + " SIGNAL" : "LOADING", k);
    STRATS.forEach((s, i) => { const y = (76 + i * 52) * k, col = s[1] === "SIGNAL" ? C.gr : s[1] === "WAIT" ? C.am : C.dim; fitT(g, s[0], 24 * k, y + 28 * k, 18 * k, W * .5, C.wh, "left", 800, FD); chip(g, W - 150 * k, y + 8 * k, 128 * k, 30 * k, s[1], col, s[1] === "SIGNAL");       sf.btns.push({ x: 14 * k, y, w: W - 28 * k, h: 50 * k, act: () => PANEL.strategy(i), kid: CUR + ":strat" + i, label: s[0], row: true }); }); }
};
const ROW = {
  positions: () => ({ label: "ASK", sub: "the teacher", icon: "ask", col: C.cy, act: () => PANEL.ask() }),
  focus: () => ({ label: "SELL", sub: live() ? "live · " + D.sym : "practice · " + D.sym, icon: "down", col: C.rd, on: D.side === "SELL", act: () => armTicket("SELL") }),
  trades: () => { const l = D.bars.length ? D.bars[D.bars.length - 1].c : null; return { kid: "main", label: D.sym + "-USD", sub: fmt(l) + "  ·  tap for next", icon: "sym", col: C.bl, act: () => setSym(WATCH[(WATCH.indexOf(D.sym) + 1) % WATCH.length]) }; },
  mheat: () => ({ label: "BUY", sub: live() ? "live · " + D.sym : "practice · " + D.sym, icon: "up", col: C.gr, on: D.side === "BUY", act: () => armTicket("BUY") }),
  pnl: () => ({ label: "SETTINGS", sub: "AI · broker · desk", icon: "gear", col: C.cy, act: () => PANEL.settings() })
};
const PAD = {
  chart: (g, W, H, sf) => { const k = H / 480; head(g, W, H, "TIMEFRAME", D.tf, k, C.cy);
    TFS.forEach(([t], i) => key(g, sf, (22 + (i % 3) * 244) * k, (82 + Math.floor(i / 3) * 92) * k, 226 * k, 76 * k, { label: t, icon: "clock", on: t === D.tf, act: () => { D.tf = t; saveSt(); refresh(); } }));
    T(g, "INDICATORS", 22 * k, 290 * k, 20 * k, C.dim, "left", 700, FD);
    ["EMA", "RSI", "MACD", "VOL"].forEach((t, i) => key(g, sf, (22 + i * 182) * k, 308 * k, 166 * k, 72 * k, { label: t, col: C.am, on: D.ind[t], act: () => { D.ind[t] = !D.ind[t]; saveSt(); D.view = "chart"; repaint(); } }));
  },
  order: (g, W, H, sf) => { const k = H / 480, u = U(), ai = !!(u && u.aiReady && u.aiReady()), br = live(); head(g, W, H, "CONNECT", null, k);
    key(g, sf, 22 * k, 84 * k, W - 44 * k, 160 * k, { kid: "ai", iconTop: true, label: "CONNECT AI", sub: ai ? "● Claude built in · " + (u.lock ? "model locked" : "auto") : "○ not connected · tap to set up", icon: "link", col: C.bl, on: ai, act: () => PANEL.settings("ai") });
    key(g, sf, 22 * k, 268 * k, W - 44 * k, 160 * k, { kid: "broker", iconTop: true, label: "BROKER", sub: br ? "● Coinbase connector · live" : "○ practice · tap to connect Coinbase", icon: "bank", col: "#1fae7a", on: br, act: () => PANEL.settings("broker") });
  },
  ctrl: (g, W, H, sf) => { const k = H / 660; head(g, W, H, "DESK", null, k);
    [["LESSONS", "book", () => PANEL.lessons()], ["RESEARCH", "globe", () => PANEL.research()], ["FULL CHART", "chart", () => MODES.chart()], ["PLATFORMS", "play", () => MODES.sim()]]
      .forEach(([t, ic, fn], i) => key(g, sf, (22 + (i % 2) * 372) * k, (96 + Math.floor(i / 2) * 272) * k, 352 * k, 248 * k, { label: t, icon: ic, iconTop: true, col: i === 3 ? C.gold : C.bl, act: fn })); }
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
function setSym(s) { D.sym = s; D.book = null; D.preview = null; D.msg = ""; saveSt(); toast("Showing " + s + "-USD"); refresh(true); }
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
  CUR = kind + ":" + (kind === "tile" || kind === "station" ? (kind === "station" ? (STN.has(id) || STN.set(id, STN.size), STN.get(id)) : id) : id); if (sf) sf.__dnaId = CUR;
  g.save();
  try {
    if (kind === "wall" && WALL[id]) WALL[id](g, W, H, sf);
    else if (kind === "row" && ROW[id]) { const o = Object.assign({ kid: "main" }, ROW[id]()); key(g, sf, W * .04, H * .08, W * .92, H * .84, o); }
    else if (kind === "pad" && PAD[id]) PAD[id](g, W, H, sf);
    else if (kind === "ticket") ticket(g, W, H, sf);
    else if (kind === "watch") { const k = H / 340, p = CO.plan; head(g, W, H, "COACH PLAN", D.sym, k, C.cy);
      if (!p) T(g, "Loading…", W / 2, 170 * k, 24 * k, C.dim, "center", 600);
      else [["ENTRY", fmt(p.entry), C.cy2], ["STOP", fmt(p.stop), C.rd], ["TARGET", fmt(p.target), C.gr], ["RISK ON $" + D.size.toFixed(0), "$" + p.risk.toFixed(2), C.am]].forEach((r, i) => { const x = (22 + (i % 2) * 240) * k, y = (110 + Math.floor(i / 2) * 104) * k; T(g, r[0], x, y, 18 * k, C.dim, "left", 700, FD); T(g, r[1], x, y + 40 * k, 34 * k, r[2], "left", 800, FM); }); }
    else if (kind === "signals") { const k = H / 340, j = D.journal.slice(-3).reverse(); head(g, W, H, "ORDERS", live() ? "LIVE" : "PRACTICE", k, live() ? C.gr : C.am);
      if (!j.length) T(g, "No orders yet", W / 2, 150 * k, 22 * k, C.dim, "center", 600);
      j.forEach((t, i) => { const y = (100 + i * 66) * k; T(g, (t.live ? "LIVE " : "PRACTICE ") + t.side, 22 * k, y, 18 * k, t.side === "BUY" ? C.gr : C.rd, "left", 800, FD); T(g, "$" + (+t.usd).toFixed(2) + " " + t.sym + " @ " + fmt(t.px), 22 * k, y + 24 * k, 18 * k, C.wh, "left", 600, FM); });
    }
    else if (kind === "tile") { const s = WATCH[id % WATCH.length], p = D.prods[s] || {}; if (sf && sf.m) sf.m.userData.dnaSym = s;
      icon(g, s === D.sym ? "bolt" : "sym", 44, 52, 34, s === D.sym ? C.gold : C.cy); T(g, s, 78, 66, 44, C.wh, "left", 900, FD); T(g, fmt(p.p), 24, 146, 38, C.cy2, "left", 700, FM); T(g, pctS(p.ch), 24, 202, 32, (p.ch || 0) < 0 ? C.rd : C.gr, "left", 800, FM); }
    else if (kind === "station") { STN.has(id) || STN.set(id, STN.size); const i = STN.get(id) % 6, s = STRATS[i] || ["STRATEGY " + (i + 1), "LOADING", ""]; if (sf && sf.mesh) sf.mesh.userData.dnaStrat = i;
      const col = s[1] === "SIGNAL" ? C.gr : s[1] === "WAIT" ? C.am : C.dim; fitT(g, s[0], W / 2, H * .36, Math.min(W * .085, H * .14), W * .9, C.wh, "center", 900, FD); chip(g, W * .22, H * .48, W * .56, H * .2, s[1], col, s[1] === "SIGNAL"); fitT(g, s[2], W / 2, H * .86, H * .07, W * .9, C.dim, "center", 600); }
    else if (kind === "ring") { let x = 20 - (Date.now() / 40 % 600); const items = WATCH.map(s => { const p = D.prods[s] || {}; return [s + " " + fmt(p.p) + " " + pctS(p.ch) + "   ·   ", (p.ch || 0) < 0 ? C.rd : C.cy2]; }); for (let r = 0; r < 4; r++) items.forEach(([s, col]) => { T(g, s, x, H * .72, H * .6, col, "left", 700, FM); x += g.measureText(s).width; }); }
  } catch (e) { console.warn("DNA paint", kind, id, e); }
  g.restore();
  if (sf && OV("s|" + CUR).hide && !devOn()) sf.btns = [];
};
const STN = new Map();
/* every job a key can be given in Dev mode (plus Dev mode's own actions and your panels) */
const ACTS = {
  "dna:buy": ["Trade · Arm BUY", () => armTicket("BUY")], "dna:sell": ["Trade · Arm SELL", () => armTicket("SELL")], "dna:preview": ["Trade · Preview order", () => previewOrder()], "dna:place": ["Trade · Place order (asks first)", () => placeOrder()],
  "dna:next": ["Chart · Next symbol", () => setSym(WATCH[(WATCH.indexOf(D.sym) + 1) % WATCH.length])], "dna:prev": ["Chart · Previous symbol", () => setSym(WATCH[(WATCH.indexOf(D.sym) - 1 + WATCH.length) % WATCH.length])],
  "dna:ask": ["Open · Ask the teacher", () => PANEL.ask()], "dna:settings": ["Open · Settings", () => PANEL.settings()], "dna:lessons": ["Open · Lessons", () => PANEL.lessons()], "dna:research": ["Open · Research", () => PANEL.research()],
  "dna:journal": ["Open · Journal", () => PANEL.journal()], "dna:progress": ["Open · Progress", () => PANEL.progress()],
  "dna:sim": ["Mode · Simulation", () => MODES.sim()], "dna:full": ["Mode · Full screen", () => MODES.full()], "dna:dash": ["Mode · Dashboard", () => MODES.dash()], "dna:dev": ["Mode · Dev mode", () => MODES.dev()], "dna:edit": ["Mode · Edit desk", () => MODES.editDesk()], "dna:front": ["Camera · Face the desk", () => MODES.front()]
};
TABS.forEach(([id, l]) => ACTS["dna:view-" + id] = ["Big screen · " + l, () => { D.view = id; if (id === "book") loadBook().then(repaint); repaint(); }]);
TFS.forEach(([tf]) => ACTS["dna:tf-" + tf] = ["Chart · " + tf, () => { D.tf = tf; saveSt(); refresh(); }]);
["EMA", "RSI", "MACD", "VOL"].forEach(n => ACTS["dna:ind-" + n] = ["Chart · " + n + " on / off", () => { D.ind[n] = !D.ind[n]; saveSt(); repaint(); }]);
WATCH.forEach(s => ACTS["dna:sym-" + s] = ["Chart · Show " + s, () => setSym(s)]);
function runAct(a) { if (ACTS[a]) return ACTS[a][1](); if (window.XDEV_RUN) return window.XDEV_RUN(a); toast("That job isn't available."); }
D.acts = () => Object.entries(ACTS).map(([k, v]) => [k, v[0]]);
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
      <section class="dna-sec"><h3>ROOM</h3><div class="dna-row wrap">${[["beasts", "Bull & bear"], ["clocks", "World clocks"], ["news", "News band"], ["coin", "Bitcoin"], ["racks", "Server walls"], ["stations", "Strategy holograms overhead"]].map(([k, l]) => `<label class="dna-chip"><input type="checkbox" data-dec="${k}" ${!window.DNA_DECOR || window.DNA_DECOR.get(k) ? "checked" : ""}> ${l}</label>`).join("")}</div></section>
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
  chart() { SIM.close(); this.set("chart"); CHART.open(); },
  dash() { SIM.close(); CHART.close(); if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} } this.set("dash"); },
  full() { SIM.close(); CHART.close(); const el = document.documentElement; try { if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().then(() => { if (MODES.cur !== "full" && document.fullscreenElement) document.exitFullscreen().catch(() => {}); }).catch(() => {}); } catch (e) {} this.set("full"); toast("Full screen: only the room. Tap ⤢ (top right) to come back."); },
  sim() { CHART.close(); this.set("sim"); SIM.open(); },
  dev() { const b = document.getElementById("xdevLaunch"); if (b) b.click(); else toast("Dev mode isn't in this page."); },
  editDesk() { const b = document.getElementById("edit"); if (b) { b.click(); toast("Edit desk: tap two screens to swap them. Hold a screen to move it, pinch to resize."); } else toast("The desk editor isn't in this page."); },
  front() { const b = document.getElementById("vw-seat"); if (b) b.click(); }
};
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && MODES.cur === "full") MODES.set("dash"); });

/* ---------------- paper trading engine (shared by the desk ticket and every platform simulation) ---------------- */
const PAPER = window.DNA_PAPER = {
  open: load("dna_open_v1", []),
  last: s => s === D.sym && D.bars.length ? D.bars[D.bars.length - 1].c : (D.prods[s] || {}).p,
  save() { store("dna_open_v1", this.open.slice(-100)); },
  fill(o, px) { const rec = { t: Date.now(), sym: o.sym, side: o.side, usd: o.qty * px, qty: o.qty, px, live: false, coach: CO.sig, plat: o.plat, type: o.type };
    if (o.sl) rec.sl = o.sl; if (o.tp) rec.tp = o.tp; D.journal.push(rec); store(LSJ, D.journal.slice(-500)); return rec; },
  place(o) { const px = this.last(o.sym); if (!px) throw new Error("No price yet"); o.id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); o.t = Date.now();
    if (o.type === "market") { const r = this.fill(o, px); this.bracket(o, px); return r; } this.open.push(o); this.save(); return null; },
  bracket(o, px) { if (o.sl) this.open.push({ id: o.id + "s", sym: o.sym, side: o.side === "BUY" ? "SELL" : "BUY", type: "stop", stop: o.sl, qty: o.qty, plat: o.plat, oco: o.id + "t", t: Date.now() });
    if (o.tp) this.open.push({ id: o.id + "t", sym: o.sym, side: o.side === "BUY" ? "SELL" : "BUY", type: "limit", limit: o.tp, qty: o.qty, plat: o.plat, oco: o.id + "s", t: Date.now() }); this.save(); },
  cancel(id) { this.open = this.open.filter(o => o.id !== id); this.save(); },
  check() { let n = 0; this.open.slice().forEach(o => { const px = this.last(o.sym); if (!px) return; const hit = o.type === "limit" ? (o.side === "BUY" ? px <= o.limit : px >= o.limit) : o.type === "stop" ? (o.side === "BUY" ? px >= o.stop : px <= o.stop) : false;
      if (hit) { this.fill(o, o.type === "limit" ? o.limit : px); this.open = this.open.filter(x => x.id !== o.id && x.id !== o.oco); if (!o.oco) this.bracket(o, px); n++; } }); if (n) { this.save(); toast(n + " practice order" + (n > 1 ? "s" : "") + " filled."); } return n; },
  pos(s) { let q = 0, cost = 0; D.journal.filter(t => !t.live && t.sym === s).forEach(t => { const qty = t.qty || t.usd / t.px; if (t.side === "BUY") { cost += qty * t.px; q += qty; } else { if (q > 0) cost -= cost / q * Math.min(qty, q); q -= qty; } });
    const px = this.last(s), avg = q > 1e-12 ? cost / q : 0; return { q, avg, px, pnl: q > 1e-12 && px ? (px - avg) * q : 0 }; },
  cash() { let c = (U() && U().cfg && +U().cfg.practice) || 10000; D.journal.filter(t => !t.live).forEach(t => { c += (t.side === "BUY" ? -1 : 1) * (t.qty ? t.qty * t.px : t.usd) - (t.qty ? t.qty * t.px : t.usd) * .006; }); return c; }
};

/* ---------------- Pro Chart full screen (the main chart) ---------------- */
const CHART = window.DNA_CHART = {
  el: null, pc: null,
  open() { if (this.el) return; const w = document.createElement("div"); w.className = "dna dna-chartfs"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "Main chart"); document.body.append(w); this.el = w;
    this.pc = window.ProChart(w, { sym: D.sym + "-USD", tf: D.tf, tfs: TFS.map(t => t[0]), onTf: tf => { D.tf = tf; saveSt(); refresh(); }, onClose: () => MODES.dash() });
    this.pc.setBars(D.bars, D.sym + "-USD", D.tf); },
  update() { if (this.pc) this.pc.setBars(D.bars, D.sym + "-USD", D.tf); },
  close() { if (this.pc) this.pc.destroy(); if (this.el) this.el.remove(); this.el = this.pc = null; }
};

/* ---------------- Simulation mode: practice on the layout of the broker you really use ----------------
   Same demo (or live) prices, paper money only. Each layout mirrors its platform: where the chart, order book,
   ticket and positions sit, and the steps to place a trade there. The 16th DNA coach strip stays at the bottom. */
const SIM = window.DNA_SIM = {
  el: null, plat: load("dna_sim_plat", ""), side: "BUY", type: "market", step: 0, pc: null, tab: "orders",
  PL: {
    cb: { n: "Coinbase Advanced", d: "Advanced trade · clean, rounded", pal: ["#0052ff", "#3773f5", "#27ad75", "#f0616d", "#0a0b0d", "#ffffff"], bg: "#0a0b0d", bg2: "#141519", line: "#26282d", txt: "#ffffff", mut: "#8a919e", up: "#27ad75", dn: "#f0616d", acc: "#3773f5", font: "Inter, system-ui, sans-serif",
      steps: ["Order book: buyers (green) under the price, sellers (red) above it.", "In the ticket pick Buy, then Market or Limit.", "Type the amount in USD and set your stop before you enter.", "Press Review, read the fee, then confirm."] },
    tv: { n: "TradingView", d: "Supercharts · thin borders", pal: ["#2962ff", "#131722", "#26a69a", "#ef5350", "#2a2e39", "#d1d4dc"], bg: "#131722", bg2: "#1e222d", line: "#2a2e39", txt: "#d1d4dc", mut: "#787b86", up: "#26a69a", dn: "#ef5350", acc: "#2962ff", font: "-apple-system, 'Trebuchet MS', system-ui, sans-serif",
      steps: ["Use the left toolbar to draw support and resistance.", "Switch candle timeframes in the top bar.", "Add indicators with ƒx Indicators.", "Place your order in the trading panel at the bottom."] },
    wb: { n: "Webull Desktop", d: "Desktop · green/red, dense", pal: ["#1e9bff", "#02c076", "#f6465d", "#0b0e14", "#141a24", "#eef2f7"], bg: "#0b0e14", bg2: "#141a24", line: "#1f2633", txt: "#eef2f7", mut: "#7d8799", up: "#02c076", dn: "#f6465d", acc: "#1e9bff", font: "Arial, system-ui, sans-serif",
      steps: ["Pick a symbol in the watchlist.", "Read Level 2: who's buying vs selling.", "Limit means you set the price; pick Quantity and Day.", "Your open trades show under Positions."] },
    mt: { n: "MetaTrader 5", d: "MT5 terminal · square, Tahoma", pal: ["#00e676", "#ffffff", "#4caf50", "#000000", "#1d5fd0", "#d02a2a"], bg: "#000000", bg2: "#f0f0f0", line: "#a0a0a0", txt: "#000000", mut: "#555555", up: "#00b050", dn: "#d02a2a", acc: "#1d5fd0", font: "Tahoma, Verdana, sans-serif", light: true,
      steps: ["Pick your pair in Market Watch.", "Lot size = how big your trade is.", "Use one-click SELL / BUY on the chart.", "Open trades and profit show in the Terminal (Trade tab)."] },
    tos: { n: "thinkorswim", d: "Trade tab · gray & gold", pal: ["#f5b301", "#00b84a", "#e02020", "#0a0a0a", "#3a3a3a", "#e8e8e8"], bg: "#0a0a0a", bg2: "#1b1b1b", line: "#3a3a3a", txt: "#e8e8e8", mut: "#9a9a9a", up: "#00b84a", dn: "#e02020", acc: "#f5b301", font: "Arial, system-ui, sans-serif",
      steps: ["Check your account and positions on the left.", "Click Bid or Ask on the quote to start an order.", "Fill Order Entry: side, quantity, price, type, TIF.", "Press Confirm and Send, then review."] },
    nt: { n: "NinjaTrader", d: "Chart Trader + SuperDOM", pal: ["#f58220", "#32cd32", "#ff2a2a", "#000000", "#1f5fbf", "#f0f0f0"], bg: "#000000", bg2: "#14171c", line: "#2b2f36", txt: "#f0f0f0", mut: "#9aa3ad", up: "#32cd32", dn: "#ff2a2a", acc: "#f58220", font: "'Segoe UI', system-ui, sans-serif",
      steps: ["SuperDOM: click a price in the Buy or Sell column to place a limit.", "Chart Trader: Buy Mkt / Sell Mkt are instant, so be careful.", "The ATM strategy adds an auto stop and target.", "Close flattens your position."] }
  },
  open() { this.close(); const w = document.createElement("div"); w.className = "dna dna-sim"; w.setAttribute("role", "dialog"); w.setAttribute("aria-label", "Platform simulations"); this.el = w; document.body.append(w); if (!this.PL[this.plat]) this.plat = ""; this.render(); },
  close() { if (this.pc) { this.pc.destroy(); this.pc = null; } if (this.el) { this.el.remove(); this.el = null; } },
  pick(k) { if (!this.PL[k]) return; this.plat = k; store("dna_sim_plat", k); this.step = 0; this.type = k === "cb" || k === "mt" ? "market" : "limit"; this.render(); },
  adv(i) { if (i + 1 > this.step) { this.step = i + 1; this.renderCoach(); } },
  render() { const w = this.el; if (!w) return; if (this.pc) { this.pc.destroy(); this.pc = null; }
    if (!this.PL[this.plat]) { const IMG = window.DNA_SIMIMG || {};
      w.style.cssText = ""; w.innerHTML = `<div class="sim-pick"><div class="sim-ph"><h2>PLATFORM SIMULATIONS</h2><button type="button" class="dna-x" data-sx="close" aria-label="Back to the dashboard">✕ DASHBOARD</button></div>
        <p>Practice on a screen laid out like the broker you'll really use. Your 16th DNA coach stays with you; only the trading screen changes. Same ${live() ? "live" : "demo"} prices, paper money. These are practice layouts, not the real apps, and aren't affiliated with them.</p>
        <div class="sim-cards">${Object.entries(this.PL).map(([k, P]) => `<button type="button" class="sim-card" data-sp="${k}" style="--pa:${P.pal[0]}">${IMG[k] ? `<img alt="" src="${IMG[k]}">` : ""}<div class="sw">${P.pal.map(c => `<b style="background:${c}"></b>`).join("")}</div><div class="t"><b>${esc(P.n)} style</b><small>${esc(P.d)}</small></div></button>`).join("")}</div></div>`;
      w.querySelectorAll("[data-sp]").forEach(b => b.onclick = () => this.pick(b.dataset.sp)); w.querySelector('[data-sx="close"]').onclick = () => MODES.dash(); return; }
    const k = this.plat, P = this.PL[k];
    w.style.cssText = `--sb:${P.bg};--sb2:${P.bg2};--sl:${P.line};--st:${P.txt};--sm:${P.mut};--su:${P.up};--sd:${P.dn};--sa:${P.acc};--sf:${P.font}`;
    w.innerHTML = `<div class="sim-app2 plat-${k}">${this.L[k].call(this)}</div><div class="sim-coach" id="simCoach"></div>`;
    const host = w.querySelector(".sim-chart"); if (host && window.ProChart) { this.pc = window.ProChart(host, { compact: k !== "tv", sym: D.sym + "-USD", tf: D.tf, tfs: TFS.map(t => t[0]), theme: { bg: P.light ? "#ffffff" : P.bg, grid: P.light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.06)", txt: P.light ? "#000" : P.txt, dim: P.mut, up: P.up, dn: P.dn, acc: P.acc, cross: P.light ? "rgba(0,0,0,.4)" : "rgba(255,255,255,.4)" },
      onTf: tf => { D.tf = tf; saveSt(); this.adv(k === "tv" ? 1 : 0); refresh().then(() => this.update()); } }); this.pc.setBars(D.bars, D.sym + "-USD", D.tf); }
    this.wire(); this.renderCoach(); this.update(); if (!D.book) loadBook().then(() => this.update()); },
  renderCoach() { const c = this.el && this.el.querySelector("#simCoach"); if (!c || !this.PL[this.plat]) return; const P = this.PL[this.plat];
    c.innerHTML = `<b class="sc-b">16TH DNA COACH</b><span class="sc-l">learning <b>${esc(P.n)}</b> style · practice · paper money</span><span class="sc-sig ${CO.sig}">${CO.sig}</span><ol>${P.steps.map((s, i) => `<li class="${i < this.step ? "ok" : i === this.step ? "now" : ""}">${esc(s)}</li>`).join("")}</ol><span class="sc-sp"></span><button type="button" data-sx="switch">Switch platform</button><button type="button" data-sx="exit">Exit simulation</button>`;
    c.querySelector('[data-sx="switch"]').onclick = () => { this.plat = ""; store("dna_sim_plat", ""); this.render(); }; c.querySelector('[data-sx="exit"]').onclick = () => MODES.dash(); },
  /* live parts refreshed on every tick */
  update() { const w = this.el; if (!w || !this.PL[this.plat]) return; const last = PAPER.last(D.sym), bk = D.book, p0 = D.prods[D.sym] || {};
    if (this.pc) this.pc.setBars(D.bars, D.sym + "-USD", D.tf);
    w.querySelectorAll("[data-live=px]").forEach(e => e.textContent = fmt(last)); w.querySelectorAll("[data-live=ch]").forEach(e => { e.textContent = pctS(p0.ch); e.className = (p0.ch || 0) < 0 ? "d" : "u"; });
    w.querySelectorAll("[data-live=bid]").forEach(e => e.textContent = bk && bk.bids && bk.bids[0] ? fmt(+bk.bids[0].price) : fmt(last));
    w.querySelectorAll("[data-live=ask]").forEach(e => e.textContent = bk && bk.asks && bk.asks[0] ? fmt(+bk.asks[0].price) : fmt(last));
    const book = w.querySelector("[data-live=book]"); if (book && bk && bk.asks) { const n = this.plat === "nt" ? 0 : 9, mx = Math.max(...bk.asks.slice(0, 9).concat(bk.bids.slice(0, 9)).map(r => +r.size)) || 1, row = (r, s) => `<div class="bk ${s}" style="--w:${(+r.size / mx * 100).toFixed(0)}%"><span>${fmt(+r.price)}</span><span>${(+r.size).toFixed(4)}</span><span>${(+r.size * +r.price).toFixed(0)}</span></div>`;
      book.innerHTML = bk.asks.slice(0, n).reverse().map(r => row(r, "a")).join("") + `<div class="bk m"><span data-live2>${fmt(last)}</span><span>spread ${bk.asks[0] && bk.bids[0] ? fmt(+bk.asks[0].price - +bk.bids[0].price) : "—"}</span></div>` + bk.bids.slice(0, n).map(r => row(r, "b")).join(""); }
    const dom = w.querySelector("[data-live=dom]"); if (dom && last) { const tick = last > 1000 ? 5 : last > 10 ? .05 : .0005, c0 = Math.round(last / tick) * tick, rows = []; for (let j = 12; j >= -12; j--) { const pr = c0 + j * tick, o = PAPER.open.filter(o => o.sym === D.sym && Math.abs((o.limit || o.stop) - pr) < tick / 2);
        rows.push(`<div class="dm ${j === 0 ? "c" : ""}"><button type="button" data-dom="BUY" data-p="${pr}">${o.filter(x => x.side === "BUY").map(x => (x.qty).toFixed(4)).join(" ") || ""}</button><span>${fmt(pr)}</span><button type="button" data-dom="SELL" data-p="${pr}">${o.filter(x => x.side === "SELL").map(x => (x.qty).toFixed(4)).join(" ") || ""}</button></div>`); } dom.innerHTML = rows.join(""); dom.querySelectorAll("[data-dom]").forEach(b => b.onclick = () => this.domClick(b.dataset.dom, +b.dataset.p)); }
    const wl = w.querySelector("[data-live=watch]"); if (wl) { wl.innerHTML = WATCH.map(s => { const p = D.prods[s] || {}; return `<button type="button" data-ws="${s}" class="${s === D.sym ? "on" : ""}"><b>${s}${this.plat === "mt" ? "USD" : this.plat === "tv" ? "USD" : ""}</b><span>${fmt(p.p)}</span><i class="${(p.ch || 0) < 0 ? "d" : "u"}">${pctS(p.ch)}</i></button>`; }).join(""); wl.querySelectorAll("[data-ws]").forEach(b => b.onclick = () => { setSym(b.dataset.ws); this.adv(0); }); }
    const tb = w.querySelector("[data-live=table]"); if (tb) tb.innerHTML = this.table();
    const acct = w.querySelector("[data-live=acct]"); if (acct) { const ps = WATCH.map(s => PAPER.pos(s)).reduce((a, p) => a + (p.q > 0 && p.px ? p.q * p.px : 0), 0), pnl = WATCH.map(s => PAPER.pos(s)).reduce((a, p) => a + p.pnl, 0), cash = PAPER.cash();
      acct.innerHTML = this.plat === "mt" ? `Balance: <b>${fmt(cash + ps - pnl, 2)}</b> USD &nbsp; Equity: <b>${fmt(cash + ps, 2)}</b> &nbsp; Free margin: <b>${fmt(cash, 2)}</b>` : `<span>Cash <b>$${fmt(cash, 2)}</b></span><span>Positions <b>$${fmt(ps, 2)}</b></span><span>P&L <b class="${pnl < 0 ? "d" : "u"}">$${fmt(pnl, 2)}</b></span>`; }
    const av = w.querySelector("[data-live=avail]"); if (av) av.textContent = "$" + fmt(PAPER.cash(), 2);
    const est = w.querySelector("[data-live=est]"); if (est) { const q = this.qty(); est.textContent = q ? "≈ " + q.toFixed(6) + " " + D.sym + " · fee ≈ $" + (q * (this.price() || last) * .006).toFixed(3) : ""; }
    this.renderCoach(); },
  table() { const tab = this.tab, O = PAPER.open, J = D.journal.filter(t => !t.live).slice(-12).reverse(), Pp = WATCH.map(s => [s, PAPER.pos(s)]).filter(([, p]) => p.q > 1e-10);
    const tabs = [["orders", this.plat === "mt" ? "Trade" : "Open orders (" + O.length + ")"], ["pos", "Positions (" + Pp.length + ")"], ["fills", this.plat === "mt" ? "History" : "Fills"]];
    let rows = ""; if (tab === "orders") rows = O.length ? `<tr><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Price</th><th></th></tr>` + O.map(o => `<tr><td>${o.sym}</td><td class="${o.side === "BUY" ? "u" : "d"}">${o.side}</td><td>${o.type}</td><td>${o.qty.toFixed(6)}</td><td>${fmt(o.limit || o.stop)}</td><td><button type="button" data-cx="${o.id}">Cancel</button></td></tr>`).join("") : `<tr><td>No open orders</td></tr>`;
    else if (tab === "pos") rows = Pp.length ? `<tr><th>Symbol</th><th>Qty</th><th>Avg cost</th><th>Last</th><th>P&L</th><th></th></tr>` + Pp.map(([s, p]) => `<tr><td>${s}</td><td>${p.q.toFixed(6)}</td><td>${fmt(p.avg)}</td><td>${fmt(p.px)}</td><td class="${p.pnl < 0 ? "d" : "u"}">${p.pnl >= 0 ? "+" : ""}$${p.pnl.toFixed(2)}</td><td><button type="button" data-flat="${s}">Close</button></td></tr>`).join("") : `<tr><td>No positions</td></tr>`;
    else rows = J.length ? `<tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Type</th></tr>` + J.map(t => `<tr><td>${new Date(t.t).toLocaleTimeString()}</td><td>${t.sym}</td><td class="${t.side === "BUY" ? "u" : "d"}">${t.side}</td><td>${(t.qty || t.usd / t.px).toFixed(6)}</td><td>${fmt(t.px)}</td><td>${t.type || "market"}</td></tr>`).join("") : `<tr><td>No fills yet</td></tr>`;
    return `<div class="st-tabs">${tabs.map(([k2, l]) => `<button type="button" data-tt="${k2}" aria-pressed="${tab === k2}">${l}</button>`).join("")}</div><table class="st-tb">${rows}</table>`; },
  /* ticket fields */
  qty() { const w = this.el, a = w && w.querySelector("[data-f=amt]"), q = w && w.querySelector("[data-f=qty]"), last = PAPER.last(D.sym); if (q) return Math.max(0, +q.value || 0) * (this.plat === "mt" ? .01 : 1); if (a && last) return Math.max(0, +a.value || 0) / (this.price() || last); return 0; },
  price() { const w = this.el, f = w && w.querySelector("[data-f=price]"); return this.type !== "market" && f ? +f.value || null : null; },
  async submit(side, over) { side = side || this.side; const q = over && over.qty || this.qty(), last = PAPER.last(D.sym); if (!q || !last) return toast("Enter an amount first.");
    const type = over && over.type || this.type, px = over && over.price || this.price(), w = this.el, sl = w && +((w.querySelector("[data-f=sl]") || {}).value || 0), tp = w && +((w.querySelector("[data-f=tp]") || {}).value || 0);
    if (type !== "market" && !px) return toast("Enter a price for a " + type + " order.");
    const msg = "Practice order (paper money) · " + this.PL[this.plat].n + " style\n\n" + side + " " + q.toFixed(6) + " " + D.sym + " · " + type.toUpperCase() + (type !== "market" ? " @ " + fmt(px) : " (~" + fmt(last) + ")") + (sl ? "\nStop loss " + fmt(sl) : "") + (tp ? "\nTake profit " + fmt(tp) : "") + "\nFee ≈ $" + (q * (px || last) * .006).toFixed(3) + (CO.sig !== "WAIT" && CO.sig !== side ? "\n\nHeads up: the coach says " + CO.sig + "." : "");
    if (!(over && over.instant) && !(await window.xviConfirm(msg, "Confirm practice order"))) return;
    try { const o = { sym: D.sym, side, type, qty: q, plat: this.plat }; if (type === "limit") o.limit = px; if (type === "stop") o.stop = px; if (sl) o.sl = sl; if (tp) o.tp = tp; const r = PAPER.place(o);
      toast(r ? "Practice order filled at " + fmt(r.px) + "." : "Practice " + type + " order working at " + fmt(px) + "."); this.adv(3); const done = new Set(load("dna_sim_plats", [])); done.add(this.plat); store("dna_sim_plats", [...done]); store("dna_sim_done", done.size); this.tab = r ? "pos" : "orders"; this.update(); repaint(); }
    catch (e) { toast("Order failed: " + e.message); } },
  domClick(side, pr) { const last = PAPER.last(D.sym), type = side === "BUY" ? (pr <= last ? "limit" : "stop") : (pr >= last ? "limit" : "stop"), q = this.qty() || (D.size / last); this.adv(0); this.submit(side, { qty: q, type, price: pr }); },
  flatten(s) { const p = PAPER.pos(s); if (p.q <= 1e-10) return; if (s !== D.sym) setSym(s); this.submit("SELL", { qty: p.q, type: "market" }); },
  wire() { const w = this.el;
    w.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const Dd = b.dataset;
      if (Dd.side) { this.side = Dd.side; w.querySelectorAll("[data-side]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.side === this.side))); const go = w.querySelector("[data-go]"); if (go) { go.textContent = (this.plat === "cb" ? "Review " : "") + this.side + " " + D.sym; go.className = "sim-go2 " + (this.side === "BUY" ? "b" : "s"); } this.adv(this.plat === "cb" ? 1 : 2); }
      else if (Dd.otype) { this.type = Dd.otype; w.querySelectorAll("[data-otype]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.otype === this.type))); const pf = w.querySelector(".sim-pf"); if (pf) pf.hidden = this.type === "market"; this.adv(this.plat === "wb" ? 2 : 1); this.update(); }
      else if (Dd.go != null) this.submit();
      else if (Dd.oneclick) this.submit(Dd.oneclick, { instant: false, type: "market" });
      else if (Dd.mkt) this.submit(Dd.mkt, { type: "market" });
      else if (Dd.ba) { const bk = D.book, pr = Dd.ba.endsWith("ask") ? (bk && bk.asks[0] ? +bk.asks[0].price : PAPER.last(D.sym)) : (bk && bk.bids[0] ? +bk.bids[0].price : PAPER.last(D.sym)); this.submit(Dd.ba.startsWith("buy") ? "BUY" : "SELL", { type: "limit", price: pr }); }
      else if (Dd.quote) { this.side = Dd.quote; this.type = "limit"; const pf = w.querySelector("[data-f=price]"); if (pf) pf.value = (Dd.quote === "BUY" ? (w.querySelector("[data-live=ask]") || {}).textContent : (w.querySelector("[data-live=bid]") || {}).textContent || "").replace(/,/g, ""); w.querySelectorAll("[data-side]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.side === this.side))); this.adv(1); }
      else if (Dd.flatall != null) { WATCH.forEach(s => { if (PAPER.pos(s).q > 1e-10 && s === D.sym) this.flatten(s); }); }
      else if (Dd.rev != null) { const p = PAPER.pos(D.sym); if (p.q > 1e-10) this.submit("SELL", { qty: p.q * 2, type: "market" }); else toast("No position to reverse."); }
      else if (Dd.tt) { this.tab = Dd.tt; this.update(); } else if (Dd.cx) { PAPER.cancel(Dd.cx); this.update(); } else if (Dd.flat) this.flatten(Dd.flat);
      else if (Dd.full != null) { MODES.chart(); } });
    w.addEventListener("input", e => { if (e.target.dataset.f) { this.adv(this.plat === "mt" ? 1 : 2); this.update(); } }); },
  /* the six layouts */
  L: {
    cb() { return `<header class="cb-h"><b class="cb-pair">${D.sym}-USD ▾</b><div class="cb-st"><span><small>Last price</small><b data-live="px"></b></span><span><small>24h change</small><b data-live="ch"></b></span><span><small>Mode</small><b>Practice</b></span></div><span class="tag">Coinbase Advanced-style practice</span></header>
      <div class="cb-g"><section class="pnl"><h4>Order book</h4><div class="bk h"><span>Price (USD)</span><span>Amount</span><span>Total</span></div><div data-live="book" class="book"></div></section>
      <section class="pnl chartp"><div class="sim-chart"></div></section>
      <section class="pnl tk"><h4>Order ticket</h4><div class="seg"><button type="button" data-side="BUY" aria-pressed="${this.side === "BUY"}">Buy</button><button type="button" data-side="SELL" aria-pressed="${this.side === "SELL"}">Sell</button></div>
        <div class="seg2">${["market", "limit", "stop"].map(t => `<button type="button" data-otype="${t}" aria-pressed="${this.type === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
        <label class="sim-pf" ${this.type === "market" ? "hidden" : ""}>Price<input data-f="price" type="number" step="any" value="${fmt(PAPER.last(D.sym), 2).replace(/,/g, "")}"></label>
        <label>Amount (USD)<input data-f="amt" type="number" min="1" step="1" value="${D.size}"></label><label>Stop loss (optional)<input data-f="sl" type="number" step="any" placeholder="${CO.plan ? fmt(CO.plan.stop, 2).replace(/,/g, "") : ""}"></label>
        <p class="kv"><span>Available</span><b data-live="avail"></b></p><p class="kv"><span>Estimate</span><b data-live="est"></b></p><button type="button" class="sim-go2 ${this.side === "BUY" ? "b" : "s"}" data-go>Review ${this.side} ${D.sym}</button></section>
      <section class="pnl bot" data-live="table"></section></div>`; },
    tv() { return `<header class="tv-h"><b>${D.sym}USD</b><span data-live="px" class="big"></span><span data-live="ch"></span><span class="tag">TradingView-style practice</span></header>
      <div class="tv-g"><section class="chartp"><div class="sim-chart"></div></section><aside class="tv-r"><h4>Watchlist</h4><div class="wl-h"><span>Symbol</span><span>Last</span><span>Chg%</span></div><div data-live="watch" class="wl"></div><div class="tv-d"><b>${D.sym}USD</b><span data-live="px"></span><small>Crypto · demo feed</small></div></aside>
      <section class="tv-b"><div class="tv-tp"><b>Trading panel</b><span>Paper trading</span></div><div class="tv-row">${["market", "limit", "stop"].map(t => `<button type="button" data-otype="${t}" aria-pressed="${this.type === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
        <label class="sim-pf" ${this.type === "market" ? "hidden" : ""}>Price<input data-f="price" type="number" step="any" value="${fmt(PAPER.last(D.sym), 2).replace(/,/g, "")}"></label><label>Quantity<input data-f="qty" type="number" step="any" min="0" value="${(D.size / (PAPER.last(D.sym) || 1)).toFixed(6)}"></label><label>Take profit<input data-f="tp" type="number" step="any"></label><label>Stop loss<input data-f="sl" type="number" step="any"></label>
        <button type="button" class="sim-go2 b" data-mkt="BUY">Buy</button><button type="button" class="sim-go2 s" data-mkt="SELL">Sell</button></div><div data-live="table"></div></section></div>`; },
    wb() { return `<div class="wb-g"><nav class="wb-n">${["★", "▤", "◷", "⚑", "☰"].map(c => `<span>${c}</span>`).join("")}</nav><aside class="wb-l"><h4>Watchlists</h4><div data-live="watch" class="wl"></div></aside>
      <section class="wb-c"><header class="wb-h"><b>${D.sym}</b><span data-live="px" class="big"></span><span data-live="ch"></span><span class="tag">Webull-style practice</span></header><div class="sim-chart"></div><div data-live="table" class="wb-t"></div></section>
      <aside class="wb-r"><h4>Level 2</h4><div class="bk h"><span>Price</span><span>Size</span><span>Value</span></div><div data-live="book" class="book"></div>
        <h4>Order ticket</h4><div class="seg"><button type="button" data-side="BUY" aria-pressed="${this.side === "BUY"}">Buy</button><button type="button" data-side="SELL" aria-pressed="${this.side === "SELL"}">Sell</button></div>
        <label>Order type<span class="seg2">${["limit", "market", "stop"].map(t => `<button type="button" data-otype="${t}" aria-pressed="${this.type === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</span></label>
        <label class="sim-pf" ${this.type === "market" ? "hidden" : ""}>Price<input data-f="price" type="number" step="any" value="${fmt(PAPER.last(D.sym), 2).replace(/,/g, "")}"></label><label>Quantity<input data-f="qty" type="number" step="any" min="0" value="${(D.size / (PAPER.last(D.sym) || 1)).toFixed(6)}"></label><label>Time-in-force<select><option>Day</option><option>GTC</option></select></label>
        <p class="kv"><span>Est.</span><b data-live="est"></b></p><button type="button" class="sim-go2 ${this.side === "BUY" ? "b" : "s"}" data-go>${this.side} ${D.sym}</button></aside></div>`; },
    mt() { return `<div class="mt-menu">${["File", "View", "Insert", "Charts", "Tools", "Window", "Help"].map(m => `<span>${m}</span>`).join("")}<span class="tag">MetaTrader 5-style practice · Demo account</span></div><div class="mt-tb">${["M1", "M5", "M15", "M30", "H1", "D1"].map(t => `<span>${t}</span>`).join("")}</div>
      <div class="mt-g"><aside class="mt-l"><div class="mt-cap">Market Watch</div><div class="wl-h"><span>Symbol</span><span>Bid</span><span>Chg</span></div><div data-live="watch" class="wl"></div><div class="mt-cap">Navigator</div><ul class="mt-nav"><li>📁 Accounts · Demo</li><li>📁 Indicators</li><li>📁 Expert Advisors</li><li>📁 Scripts</li></ul></aside>
      <section class="mt-c"><div class="mt-cap">${D.sym}USD, ${D.tf.toUpperCase()}</div><div class="mt-oc"><button type="button" data-oneclick="SELL"><small>SELL</small><b data-live="bid"></b></button><label>Lot<input data-f="qty" type="number" step="0.01" min="0.01" value="0.10"></label><button type="button" data-oneclick="BUY"><small>BUY</small><b data-live="ask"></b></button></div><div class="sim-chart"></div></section></div>
      <section class="mt-term"><div class="mt-cap">Terminal</div><div data-live="table"></div><div class="mt-bal" data-live="acct"></div></section>`; },
    tos() { return `<div class="tos-tabs">${["Monitor", "Trade", "Analyze", "Scan", "MarketWatch", "Charts"].map((t, i) => `<span class="${i === 1 ? "on" : ""}">${t}</span>`).join("")}<span class="tag">thinkorswim-style practice · paperMoney</span></div>
      <div class="tos-g"><aside class="tos-l"><h4>Account info</h4><div data-live="acct" class="tos-ac"></div><h4>Watchlist</h4><div data-live="watch" class="wl"></div></aside>
      <section class="tos-c"><div class="tos-q"><b>${D.sym}</b><span>Last <b data-live="px"></b></span><span data-live="ch"></span><button type="button" data-quote="SELL">Bid <b data-live="bid"></b></button><button type="button" data-quote="BUY">Ask <b data-live="ask"></b></button></div><div class="sim-chart"></div>
        <div class="tos-oe"><b>Order Entry</b><span class="seg"><button type="button" data-side="BUY" aria-pressed="${this.side === "BUY"}">BUY</button><button type="button" data-side="SELL" aria-pressed="${this.side === "SELL"}">SELL</button></span><label>Qty<input data-f="qty" type="number" step="any" min="0" value="${(D.size / (PAPER.last(D.sym) || 1)).toFixed(6)}"></label><span>${D.sym}</span>
          <label class="sim-pf" ${this.type === "market" ? "hidden" : ""}>Price<input data-f="price" type="number" step="any" value="${fmt(PAPER.last(D.sym), 2).replace(/,/g, "")}"></label><span class="seg2">${["limit", "market", "stop"].map(t => `<button type="button" data-otype="${t}" aria-pressed="${this.type === t}">${t.toUpperCase()}</button>`).join("")}</span><select aria-label="Time in force"><option>DAY</option><option>GTC</option></select><button type="button" class="tos-send" data-go>Confirm and Send</button></div>
        <div data-live="table"></div></section></div>`; },
    nt() { return `<div class="nt-menu"><b>Control Center</b>${["New", "Tools", "Workspaces", "Connections", "Help"].map(m => `<span>${m}</span>`).join("")}<span class="tag">NinjaTrader-style practice · Sim101</span></div>
      <div class="nt-g"><section class="nt-c"><div class="nt-cap">Chart · ${D.sym}-USD (${D.tf})</div><div class="sim-chart"></div></section>
      <aside class="nt-ct"><div class="nt-cap">Chart Trader</div><div class="nt-bs"><button type="button" class="b" data-mkt="BUY">Buy Mkt</button><button type="button" class="s" data-mkt="SELL">Sell Mkt</button><button type="button" data-ba="buy-ask">Buy Ask</button><button type="button" data-ba="sell-ask">Sell Ask</button><button type="button" data-ba="buy-bid">Buy Bid</button><button type="button" data-ba="sell-bid">Sell Bid</button><button type="button" data-rev>Rev</button><button type="button" data-flatall>Close</button></div>
        <label>Qty<input data-f="qty" type="number" step="any" min="0" value="${(D.size / (PAPER.last(D.sym) || 1)).toFixed(6)}"></label><label>TIF<select><option>GTC</option><option>Day</option></select></label><label>Account<select><option>Sim101</option></select></label>
        <label>ATM strategy: stop loss<input data-f="sl" type="number" step="any" placeholder="${CO.plan ? fmt(CO.plan.stop, 2).replace(/,/g, "") : ""}"></label><label>ATM: profit target<input data-f="tp" type="number" step="any" placeholder="${CO.plan ? fmt(CO.plan.target, 2).replace(/,/g, "") : ""}"></label><p class="kv"><span>Position</span><b data-live="acct"></b></p></aside>
      <aside class="nt-dom"><div class="nt-cap">SuperDOM · ${D.sym}</div><div class="dm h"><span>Buy</span><span>Price</span><span>Sell</span></div><div data-live="dom" class="dom"></div></aside>
      <section class="nt-t" data-live="table"></section></div>`; }
  }
};
/* ---------------- boot ---------------- */
function bar() {
  const b = document.createElement("div"); b.id = "dnaModes"; b.className = "dna"; b.setAttribute("role", "group"); b.setAttribute("aria-label", "Desk mode");
  b.innerHTML = `<span class="dna-brand">16TH DNA</span>${[["dash", "DASHBOARD"], ["chart", "CHART"], ["full", "FULL SCREEN"], ["sim", "SIMULATION"]].map(([m, l]) => `<button type="button" data-mode="${m}" aria-pressed="${m === "dash"}">${l}</button>`).join("")}`;
  b.addEventListener("click", e => { const x = e.target.closest("button"); if (!x) return; if (x.dataset.mode) MODES[x.dataset.mode](); else MODES.dev(); });
  document.body.append(b);
  const ex = document.createElement("button"); ex.type = "button"; ex.id = "dnaExit"; ex.className = "dna"; ex.textContent = "⤢"; ex.setAttribute("aria-label", "Leave full screen"); ex.onclick = () => MODES.dash(); document.body.append(ex);
  MODES.set("dash");
}
/* live current candle: pull the newest candles every few seconds and merge them in, so the forming candle
   moves with the market and a new one opens exactly on the timeframe boundary */
const TFSEC = { "1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "1d": 86400 };
D.tfSec = () => TFSEC[D.tf] || 900;
let ticking = false;
async function liveTick() { if (ticking || D.busy || !D.bars.length) return; ticking = true; const s = D.sym, tf = D.tf;
  try { const r = await call("coinbase_products_candles", { product_id: s + "-USD", granularity: tf, limit: 3 }); if (s !== D.sym || tf !== D.tf) return;
    const cs = ((r && (r.candles || r)) || []).map(c => ({ t: +c.start, o: +c.open, h: +c.high, l: +c.low, c: +c.close, v: +c.volume })).filter(b => isFinite(b.c)).sort((a, b) => a.t - b.t);
    let changed = false; cs.forEach(b => { const L = D.bars[D.bars.length - 1]; if (b.t === L.t) { if (b.c !== L.c || b.h !== L.h || b.l !== L.l || b.v !== L.v) { D.bars[D.bars.length - 1] = b; changed = true; } } else if (b.t > L.t) { D.bars.push(b); if (D.bars.length > 400) D.bars.shift(); changed = true; } else { const i = D.bars.findIndex(x => x.t === b.t); if (i >= 0) { D.bars[i] = b; changed = true; } } });
    if (changed) { if (D.prods[s]) D.prods[s].p = D.bars[D.bars.length - 1].c; computeAll(); try { PAPER.check(); } catch (e) {} try { CHART.update(); } catch (e) {} } }
  catch (e) {} finally { ticking = false; } }
function boot() { bar(); refresh(true); setInterval(() => refresh(), 15000); setInterval(liveTick, 2500); setInterval(() => { try { if (SIM.el) SIM.update(); } catch (e) {} }, 3000); window.DNA_ON = true; }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else setTimeout(boot, 0);
})();
