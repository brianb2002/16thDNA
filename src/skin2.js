/* ================= XVI DNA skin v2: broker workspaces, live desk, motion ================= */
(() => {
const V = window.xvi, body = document.body, RM = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const q = (s, r) => (r || document).querySelector(s), qa = (s, r) => [...(r || document).querySelectorAll(s)];
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const lp = () => { try { return lastPrice(); } catch (e) { return null; } };
const dp = () => { try { return Math.max(2, Math.min(pd(), 8)); } catch (e) { return 2; } };
const f2 = (n, d) => (n == null || !isFinite(n)) ? "—" : (+n).toLocaleString("en-US", { minimumFractionDigits: d == null ? dp() : d, maximumFractionDigits: d == null ? dp() : d });
const symOf = () => { const I = S.inst; return !I ? "—" : I.kind === "spot" ? I.dataId : I.kind === "stock" ? I.sym : I.label; };

/* ---------- shared actions (all wired to the app's real handlers) ---------- */
const A = {
  mkt: () => $("mktBtn").click(),
  ptab: p => { const b = q(`#panelTabs [data-p="${p}"]`); if (b) b.click(); renderPT(); },
  ctab: c => { const b = q(`#chartTabs [data-c="${c}"]`); if (b) b.click(); },
  tf: tf => { const b = q(`#tfSeg [data-tf="${tf}"]`); if (b) b.click(); },
  ind: () => $("indBtn").click(), pat: () => $("patBtn").click(), set: () => $("setBtn").click(), explain: () => $("expBtn").click(), spot: () => $("spotBtn").click(),
  ticket: side => { if (layout() === "mt") { openTicket(side); return; } if (side) { const b = q(`#tkSide [data-s="${side}"]`); if (b) b.click(); } flash($("ticket")); },
  coach: () => V.xTab("coach"), lab: () => V.xTab("research"), journal: () => V.xTab("journal"), sims: () => V.openSims(), exit: () => V.stopSim(), desk: () => showView("home"),
  menu: () => $("menuBtn").click(), conn: () => { $("menuBtn").click(); setTimeout(() => { const b = q('#drawer [data-dr="conn"]'); if (b) b.click(); }, 30); },
  ask: () => openAsk(), markets: () => showView("trade"), tx: () => showView("tx"), tour: () => { V.xTab("coach"); setTimeout(() => $("startTour").click(), 60); }
};
function flash(el) { if (!el) return; el.classList.remove("xflash"); void el.offsetWidth; el.classList.add("xflash"); try { el.scrollIntoView({ block: "nearest", behavior: RM() ? "auto" : "smooth" }); } catch (e) {} }
/* ladder / book click -> real limit order in the app's ticket */
function orderAt(side, price) {
  const sb = q(`#tkSide [data-s="${side}"]`); if (sb) sb.click();
  const tb = q('#tkType [data-t="limit"]'); if (tb && S.type !== "limit") tb.click();
  const inp = $("inEntry"); inp.value = (+price).toFixed(dp()); inp.dispatchEvent(new Event("input", { bubbles: true }));
  if (layout() === "mt") openTicket(); flash($("ticket"));
  try { toast((side > 0 ? "Buy" : "Sell") + " limit set at " + f2(price) + ". Review it in the order ticket, then Preview."); } catch (e) {}
}

/* ---------- live book & trades for the workspace panels ---------- */
const BK = { book: null, trades: null, key: "", t: 0, err: false };
async function pullBook() {
  const I = S.inst; if (!body.classList.contains("x-ws") || !I || !S.mcp || I.src !== "cb" || document.hidden) return;
  const key = I.dataId; if (key !== BK.key) { BK.book = BK.trades = null; BK.key = key; }
  try { const p = await call(CB, "coinbase_products_book", { product_id: I.dataId, product_type: I.ptype, limit: 50 }, { cache: false }); if (BK.key === key) { BK.book = p && p.pricebook; BK.err = false; } } catch (e) { BK.err = true; }
  if (layout() === "cb" || layout() === "tv") { try { const p = await call(CB, "coinbase_products_ticker", { product_id: I.dataId, product_type: I.ptype, limit: 30 }, { cache: false }); if (BK.key === key) BK.trades = p && p.trades; } catch (e) {} }
  renderLive();
}
/* price levels: real book when we have it, otherwise levels around the last price (sizes marked as estimates) */
function levels(n) {
  const P = lp(); const b = BK.book; let inc = 0.01; try { inc = parseFloat(S.inst.priceInc) || 0.01; } catch (e) {}
  if (b && b.bids && b.asks && b.bids.length && b.asks.length) {
    const bids = b.bids.slice(0, n).map(x => ({ p: +x.price, s: +x.size })), asks = b.asks.slice(0, n).map(x => ({ p: +x.price, s: +x.size }));
    return { real: true, bids, asks, bid: bids[0].p, ask: asks[0].p };
  }
  if (!P) return null; const step = Math.max(inc, Math.pow(10, Math.floor(Math.log10(P)) - 4) * 5);
  const seed = k => { const x = Math.sin(k * 12.9898 + Math.floor(Date.now() / 4000)) * 43758.5453; return x - Math.floor(x); };
  const bid = S.bid || Math.floor(P / step) * step, ask = S.ask || bid + step;
  return { real: false, bid, ask, bids: Array.from({ length: n }, (_, i) => ({ p: bid - i * step, s: +(0.05 + seed(i + 1) * 2).toFixed(4) })), asks: Array.from({ length: n }, (_, i) => ({ p: ask + i * step, s: +(0.05 + seed(i + 99) * 2).toFixed(4) })) };
}

/* ---------- widgets ---------- */
const W = {};
function wl(cols) { const box = h("div", "xw-wl"); box.dataset.cols = cols || "std"; box.addEventListener("click", e => { const r = e.target.closest("[data-k]"); if (!r) return; const m = findInst(r.dataset.k); if (!m) return; selectInst(m); if (e.detail === 2 && layout() === "mt") openTicket(); }); box.addEventListener("dblclick", e => { if (layout() === "mt" && e.target.closest("[data-k]")) openTicket(); }); return box; }
function renderWL(box) {
  const L = (S.lists && S.lists.crypto || []).filter(m => m.group !== "fx").slice().sort((a, b) => b.usdVol - a.usdVol).slice(0, 18);
  const cur = S.inst && S.inst.key; let list = L; if (S.inst && !L.some(m => m.key === cur)) list = [Object.assign({}, S.inst, { price: lp(), chg: null }), ...L];
  const mt = box.dataset.cols === "mt", d = m => m.price < 1 ? 4 : 2;
  const head = mt ? `<div class="r h"><span>Symbol</span><span>Bid</span><span>Ask</span><span>Daily Change</span></div>` : `<div class="r h"><span>Symbol</span><span>Last</span><span>Chg%</span></div>`;
  if (!list.length) { box.innerHTML = head + `<div class="xw-empty">${S.mcp ? "Loading markets…" : "Live connection needed"}</div>`; return; }
  box.innerHTML = head + list.map(m => { const p = m.key === cur ? (lp() || m.price) : m.price, c = m.chg, cls = c == null ? "" : c >= 0 ? "up" : "dn";
    const sp = p * 0.0001; return `<div class="r ${m.key === cur ? "on" : ""}" data-k="${m.key}" title="${esc(m.name || m.label)}"><span><b>${esc(m.label)}</b></span>${mt ? `<span class="${cls}">${f2(p - sp / 2, d(m))}</span><span class="${cls}">${f2(p + sp / 2, d(m))}</span>` : `<span>${f2(p, d(m))}</span>`}<span class="${cls}">${c == null ? "—" : (c >= 0 ? "+" : "") + (c * 100).toFixed(2) + "%"}</span></div>`; }).join("");
}
function ladder(style) { const box = h("div", "xw-ladder"); box.dataset.style = style;
  box.addEventListener("click", e => { const c = e.target.closest("[data-o]"); if (!c) return; orderAt(+c.dataset.o, +c.dataset.p); }); return box; }
function renderLadder(box) {
  const st = box.dataset.style, n = st === "l2" ? 10 : 12, L = levels(n); if (!L) { box.innerHTML = `<div class="xw-empty">Waiting for a price…</div>`; return; }
  const d = dp(), sz = s => s >= 100 ? s.toFixed(0) : s.toFixed(s >= 1 ? 2 : 4), mx = Math.max(...L.bids.map(x => x.s), ...L.asks.map(x => x.s)) || 1;
  const note = `<div class="xw-note">${L.real ? "Live Coinbase book · click a level to set a limit order" : "Book unavailable: sizes are estimates · click a level to set a limit order"}</div>`;
  if (st === "l2") { /* Webull quote ladder: bid | ask side by side */
    box.innerHTML = `<div class="xw-title">Level 2 · ${esc(symOf())}</div><div class="l2"><div class="r h"><span>Bid</span><span>Size</span><span>Ask</span><span>Size</span></div>${L.bids.slice(0, n).map((b, i) => { const a = L.asks[i]; return `<div class="r"><span class="up" data-o="1" data-p="${b.p}" style="--w:${b.s / mx * 100}%">${f2(b.p, d)}</span><span>${sz(b.s)}</span><span class="dn" data-o="-1" data-p="${a.p}" style="--w:${a.s / mx * 100}%">${f2(a.p, d)}</span><span>${sz(a.s)}</span></div>`; }).join("")}</div>${note}`; return; }
  /* SuperDOM / Active Trader: Buy | Bid | Price | Ask | Sell */
  const rows = [...L.asks.slice(0, n).reverse().map(a => ({ p: a.p, ask: a.s })), ...L.bids.slice(0, n).map(b => ({ p: b.p, bid: b.s }))], last = lp();
  const hd = st === "tos" ? ["Buy Orders", "Bid Size", "Price", "Ask Size", "Sell Orders"] : ["Buy", "Bid", "Price", "Ask", "Sell"];
  box.innerHTML = `<div class="xw-title">${st === "tos" ? "Active Trader" : "SuperDOM"} · ${esc(symOf())}</div><div class="dom"><div class="r h">${hd.map(x => `<span>${x}</span>`).join("")}</div>${rows.map(r => { const isL = last && Math.abs(r.p - last) < Math.abs((L.ask - L.bid) || 1e-9); return `<div class="r ${isL ? "last" : ""}"><span class="cb" data-o="1" data-p="${r.p}" title="Buy limit at ${f2(r.p, d)}"></span><span class="bid">${r.bid != null ? sz(r.bid) : ""}</span><span class="px ${isL ? "lastpx" : ""}">${f2(r.p, d)}</span><span class="ask">${r.ask != null ? sz(r.ask) : ""}</span><span class="cs" data-o="-1" data-p="${r.p}" title="Sell limit at ${f2(r.p, d)}"></span></div>`; }).join("")}</div>
  <div class="dombtns"><button data-act="mb">Buy Mkt</button><button data-act="ms">Sell Mkt</button><button data-act="ticket">Order entry</button></div>${note}`;
}
function book() { const box = h("div", "xw-ob"); box.addEventListener("click", e => { const c = e.target.closest("[data-o]"); if (c) orderAt(+c.dataset.o, +c.dataset.p); const t = e.target.closest("[data-obt]"); if (t) { box.dataset.tab = t.dataset.obt; renderOB(box); } }); box.dataset.tab = "book"; return box; }
function renderOB(box) {
  const L = levels(14), d = dp(), sz = s => s.toFixed(s >= 1 ? 4 : 6); let html = `<div class="xw-tabs2"><button data-obt="book" class="${box.dataset.tab === "book" ? "on" : ""}">Order book</button><button data-obt="trades" class="${box.dataset.tab === "trades" ? "on" : ""}">Trade history</button></div>`;
  if (box.dataset.tab === "trades") { const t = BK.trades; html += `<div class="r h"><span>Price</span><span>Size</span><span>Time</span></div>` + (t && t.length ? t.map(x => `<div class="r"><span class="${x.side === "BUY" ? "up" : "dn"}">${f2(+x.price, d)}</span><span>${sz(+x.size)}</span><span class="mut">${new Date(x.time).toLocaleTimeString([], { hour12: false })}</span></div>`).join("") : `<div class="xw-empty">${S.mcp ? "Loading trades…" : "Live connection needed"}</div>`); box.innerHTML = html; return; }
  if (!L) { box.innerHTML = html + `<div class="xw-empty">Waiting for a price…</div>`; return; }
  const mx = Math.max(...L.bids.map(x => x.s), ...L.asks.map(x => x.s)) || 1, row = (x, cls, o) => `<div class="r ${cls}" data-o="${o}" data-p="${x.p}" style="--w:${Math.min(100, x.s / mx * 100)}%"><span>${f2(x.p, d)}</span><span>${sz(x.s)}</span><span class="mut">${usd(x.p * x.s, 0)}</span></div>`;
  html += `<div class="r h"><span>Price (USD)</span><span>Size</span><span>Value</span></div><div class="asks">${L.asks.slice(0, 14).reverse().map(x => row(x, "dn", -1)).join("")}</div><div class="spread"><b>${f2(lp(), d)}</b><span>Spread ${f2(L.ask - L.bid, d)}</span></div><div class="bids">${L.bids.slice(0, 14).map(x => row(x, "up", 1)).join("")}</div><div class="xw-note">${L.real ? "Live Coinbase book" : "Book unavailable: sizes are estimates"}</div>`;
  box.innerHTML = html;
}
function acct() { const b = h("div", "xw-acct"); b.addEventListener("click", e => { const t = e.target.closest("[data-act]"); if (t) act(t.dataset.act); }); return b; }
function renderAcct(b) { const bal = S.balance; b.innerHTML = `<div class="xw-title">Account Info</div><div class="kv2"><span>Net Liq & DayTrades</span><b>${usd(bal || 0)}</b><span>Option Buying Power</span><b>${usd(bal || 0)}</b><span>Stock Buying Power</span><b>${usd(bal || 0)}</b><span>Mode</span><b>${S.live ? "Live data" : "Offline"}${UNI.hasTrading && UNI.hasTrading() ? " · trading" : " · practice"}</b></div><button data-act="positions">Position Statement</button>`; }
function mtnav() { const b = h("div", "xw-nav"); b.addEventListener("click", e => { const i = e.target.closest("[data-ind]"); if (i) { const k = i.dataset.ind; S.ind[k] = !S.ind[k]; try { store.set("tc_ind", S.ind); } catch (er) {} drawChart(); renderMenus(); renderNav(b); return; } const t = e.target.closest("[data-act]"); if (t) act(t.dataset.act); }); return b; }
function renderNav(b) { b.innerHTML = `<div class="xw-title">Navigator</div><div class="tree"><div class="n">▾ <b>Accounts</b></div><div class="l" data-act="balance">◉ ${S.live ? "Practice" : "Offline"} · ${usd(S.balance || 0)}</div><div class="n">▾ <b>Indicators</b></div>${IND_DEF.map(d => `<div class="l ${S.ind[d[0]] ? "on" : ""}" data-ind="${d[0]}">${S.ind[d[0]] ? "☑" : "☐"} ${esc(indName ? indName(d[0]) : d[1])}</div>`).join("")}<div class="n">▾ <b>Expert Advisors</b></div><div class="l" data-act="lab">⚙ XVI DNA strategies (Research Lab)</div><div class="l" data-act="coach">⚙ XVI DNA Coach</div><div class="n">▾ <b>Scripts</b></div><div class="l" data-act="explain">▶ Explain chart</div><div class="l" data-act="spot">▶ Spot it</div></div>`; }
function oneclick() { const b = h("div", "xw-oneclick"); b.addEventListener("click", e => { const t = e.target.closest("[data-oc]"); if (t) A.ticket(+t.dataset.oc); }); return b; }
function renderOC(b) { const L = levels(1); const s = q(".s b", b); if (s) { s.textContent = L ? f2(L.bid) : "—"; q(".b b", b).textContent = L ? f2(L.ask) : "—"; return; }
  b.innerHTML = `<button class="s" data-oc="-1"><small>SELL</small><b>${L ? f2(L.bid) : "—"}</b></button><input aria-label="Order amount" title="Amount (same as the order ticket)" inputmode="decimal"><button class="b" data-oc="1"><small>BUY</small><b>${L ? f2(L.ask) : "—"}</b></button>`;
  q("input", b).addEventListener("change", e => { const a = $("inAmt"); a.value = e.target.value; a.dispatchEvent(new Event("input", { bubbles: true })); }); }
function symTabs() { const b = h("div", "xw-symtabs"); b.addEventListener("click", e => { const t = e.target.closest("[data-k]"); if (!t) return; const m = findInst(t.dataset.k); if (m) selectInst(m); }); return b; }
const RECENT = []; function renderSymTabs(b) { if (S.inst && !RECENT.some(r => r.key === S.inst.key)) { RECENT.unshift({ key: S.inst.key, l: symOf() }); RECENT.splice(6); }
  b.innerHTML = RECENT.map(r => `<button data-k="${r.key}" class="${S.inst && r.key === S.inst.key ? "on" : ""}">${esc(r.l)},${TFG && TFG[S.tf] ? TFG[S.tf][0] : ""}</button>`).join(""); }
/* custom bottom-panel tabs that drive the real #panelTabs */
const PT = {
  tv: [["Positions", "positions"], ["Orders", "open"], ["Order History", "history"], ["Account Summary", "balance"], ["Trading Journal", "fills"], ["Assets", "assets"]],
  wb: [["Positions", "positions"], ["Orders", "open"], ["Filled", "fills"], ["History", "history"], ["Assets", "assets"], ["Balance", "balance"]],
  nt: [["Orders", "open"], ["Executions", "fills"], ["Positions", "positions"], ["Accounts", "balance"], ["Log", "history"], ["Assets", "assets"], ["Strategies", "@lab"]],
  tos: [["Position Statement", "positions"], ["Working Orders", "open"], ["Filled Orders", "fills"], ["Order History", "history"], ["Account Statement", "balance"], ["Balances", "assets"]],
  mt: [["Trade", "positions"], ["Orders", "open"], ["Exposure", "assets"], ["History", "history"], ["Deals", "fills"], ["Balance", "balance"], ["Journal", "@journal"]],
  cb: [["Open orders", "open"], ["Fills", "fills"], ["Positions", "positions"], ["Order history", "history"], ["Balances", "assets"], ["Summary", "balance"]]
};
function ptabs() { const b = h("div", "xw-ptabs"); b.addEventListener("click", e => { const t = e.target.closest("[data-p]"); if (!t) return; const p = t.dataset.p; if (p === "@lab") A.lab(); else if (p === "@journal") A.journal(); else A.ptab(p); }); return b; }
function renderPT() { const b = W.ptabs; if (!b) return; const cur = S.ptab || (q("#panelTabs button.on") || {}).dataset?.p || "positions"; b.innerHTML = (PT[layout()] || []).map(([l, p]) => `<button data-p="${p}" class="${p === cur ? "on" : ""}">${l}</button>`).join(""); }

/* ---------- per-platform menubars (every item calls a real function) ---------- */
function act(a) { const m = { positions: () => A.ptab("positions"), orders: () => A.ptab("open"), fills: () => A.ptab("fills"), balance: () => A.ptab("balance"), assets: () => A.ptab("assets"), history: () => A.ptab("history"),
  price: () => A.ctab("price"), depth: () => A.ctab("depth"), bookt: () => A.ctab("book"), trades: () => A.ctab("trades"),
  ticket: () => A.ticket(), buy: () => A.ticket(1), sell: () => A.ticket(-1), mb: () => { const t = q('#tkType [data-t="market"]'); if (t) t.click(); A.ticket(1); }, ms: () => { const t = q('#tkType [data-t="market"]'); if (t) t.click(); A.ticket(-1); },
  dom: () => flash(W.ladder), wl: () => flash(W.wl), lab: A.lab, coach: A.coach, journal: A.journal, sims: A.sims, exit: A.exit, desk: A.desk, menu: A.menu, conn: A.conn, ask: A.ask, markets: A.markets, mkt: A.mkt, tx: A.tx,
  ind: A.ind, pat: A.pat, set: A.set, explain: A.explain, spot: A.spot, tour: A.tour,
  "v-mw": () => togglePane("mw"), "v-nv": () => togglePane("nv"), "v-bx": () => togglePane("bx"),
  "tos-mon": () => tosMode("mon"), "tos-trade": () => tosMode("trade"), "tos-an": () => { tosMode("charts"); A.ctab("depth"); A.explain(); }, "tos-charts": () => { tosMode("charts"); A.ctab("price"); }, "tos-mw": () => { tosMode("charts"); flash(W.wl); } };
  (m[a] || (() => {}))(); closeDD(); setTimeout(fitChart, 30); }
function togglePane(p) { const c = "xmt-no" + p; $("xWS").classList.toggle(c); setTimeout(fitChart, 40); renderMB(); }
function tosMode(m) { const ws = $("xWS"); ["mon", "trade", "charts"].forEach(x => ws.classList.toggle("tos-" + x, x === m)); renderMB(); setTimeout(fitChart, 40); }
const DD = {
  mt: { File: [["New Chart (symbol)", "mkt"], ["Open Markets list", "markets"], ["Transactions", "tx"], ["Exit simulation", "exit"]], View: [["Market Watch", "v-mw"], ["Navigator", "v-nv"], ["Toolbox", "v-bx"], ["Depth of Market", "depth"]], Insert: [["Indicators…", "ind"], ["Patterns…", "pat"]], Charts: [["Candlesticks / Line…", "set"], ["Explain chart", "explain"], ["Spot it", "spot"]], Tools: [["New Order  F9", "ticket"], ["Options…", "menu"], ["Connections…", "conn"]], Help: [["Ask the coach", "ask"], ["Guided tour", "tour"]] },
  nt: { New: [["Chart", "price"], ["SuperDOM", "dom"], ["Market Analyzer", "markets"], ["Strategy Analyzer", "lab"], ["Trade Performance", "journal"]], Tools: [["Indicators", "ind"], ["Chart properties", "set"], ["Options", "menu"]], Connections: [["Connection settings…", "conn"]], Workspaces: [["Switch platform…", "sims"], ["Back to XVI DNA desk", "exit"]], Help: [["Ask the coach", "ask"], ["Guided tour", "tour"]] }
};
function closeDD() { qa(".xw-dd").forEach(d => d.remove()); qa(".xw-mb .on-dd").forEach(b => b.classList.remove("on-dd")); }
function renderMB() { const b = W.mb, L = layout(); if (!b) return; const r = `<span class="sp"></span><button data-act="sims" class="xw-theme">Theme: ${V.PLAT[L].n} style</button><button data-act="coach" class="xw-coachbtn">★ XVI DNA Coach</button><button data-act="exit" class="xw-exit">⏻ Exit to desk</button>`;
  const btn = (l, a, c) => `<button data-act="${a}" class="${c || ""}">${l}</button>`;
  if (L === "tv") b.innerHTML = `<button data-act="mkt" class="sym">🔍 ${esc(symOf())}</button><i class="sep"></i><span class="slot-tf"></span><i class="sep"></i>${btn("ƒx Indicators", "ind")}${btn("◇ Patterns", "pat")}${btn("▶ Explain", "explain")}${btn("◎ Spot it", "spot")}${btn("⚙", "set")}${r}${btn("Trade", "ticket", "pri")}`;
  else if (L === "wb") b.innerHTML = `<b class="brand">Webull-style</b>${btn("Quotes", "mkt")}${btn("Markets", "markets")}${btn("Trade", "ticket", "pri")}${btn("Watchlist", "wl")}${btn("Level 2", "dom")}${btn("Transactions", "tx")}${r}`;
  else if (L === "nt") b.innerHTML = `<b class="brand">Control Center</b>${Object.keys(DD.nt).map(k => `<button data-dd="${k}">${k}</button>`).join("")}${r}`;
  else if (L === "tos") { const ws = $("xWS"), on = m => ws.classList.contains("tos-" + m) ? "on" : ""; b.innerHTML = `<b class="brand">thinkorswim-style</b><button data-act="tos-mon" class="${on("mon")}">Monitor</button><button data-act="tos-trade" class="${on("trade")}">Trade</button><button data-act="tos-an">Analyze</button><button data-act="markets">Scan</button><button data-act="tos-mw">MarketWatch</button><button data-act="tos-charts" class="${on("charts")}">Charts</button>${btn("Tools", "menu")}${r}`; }
  else if (L === "mt") b.innerHTML = Object.keys(DD.mt).map(k => `<button data-dd="${k}">${k}</button>`).join("") + r;
  else if (L === "cb") b.innerHTML = `<b class="brand">Advanced</b><button data-act="mkt" class="sym">${esc(symOf())} ▾</button><span class="slot-stats"></span>${btn("Markets", "markets")}${btn("Portfolio", "assets")}${btn("Orders", "orders")}${r}`;
  const st = q(".slot-stats", b); if (st) st.innerHTML = $("mstats").innerHTML;
  const tf = q(".slot-tf", b); if (tf && W.tfHome !== tf) { tf.append(park("tfSeg")); W.tfHome = tf; }
}
function mtToolbar() { const b = h("div", "xw-mttb"); b.innerHTML = `<button data-act="ticket" class="pri">⊕ New Order</button><i class="sep"></i>${[[60, "M1"], [300, "M5"], [900, "M15"], [1800, "M30"], [3600, "H1"], [86400, "D1"]].map(([t, l]) => `<button data-tf="${t}">${l}</button>`).join("")}<i class="sep"></i><button data-act="ind">ƒ Indicators</button><button data-act="set">⚙ Chart</button><button data-act="explain">Explain</button><button data-act="depth">Depth</button><button data-act="price">Price chart</button>`;
  b.addEventListener("click", e => { const t = e.target.closest("[data-tf]"); if (t) { A.tf(+t.dataset.tf); renderMT(b); return; } const a = e.target.closest("[data-act]"); if (a) act(a.dataset.act); }); return b; }
function renderMT(b) { qa("[data-tf]", b).forEach(x => x.classList.toggle("on", +x.dataset.tf === S.tf)); }

/* ---------- workspace mount / unmount (re-parents the app's own widgets) ---------- */
const NODES = { mrow: () => q("#v-market .mrow"), coachBar: () => $("coachBar"), chartTabs: () => $("chartTabs"), tfrow: () => q("#v-market .tfrow"), tfSeg: () => $("tfSeg"), ohlc: () => $("ohlc"), indMenu: () => $("indMenu"), setMenu: () => $("setMenu"), patMenu: () => $("patMenu"), chartBox: () => $("chartBox"), navBar: () => $("navBar"), explainBox: () => $("explainBox"), legend: () => q("#v-market .legend"), panelTabs: () => $("panelTabs"), panelBox: () => $("panelBox"), ticket: () => $("ticket") };
const HOME = {}; let mounted = null;
function park(k) { const n = (HOME[k] && HOME[k].n) || NODES[k](); if (!n) return null; if (!HOME[k]) { const mk = document.createComment("xvi:" + k); n.parentNode.insertBefore(mk, n); HOME[k] = { mk, n }; } return n; }
function unpark() { ["tfSeg", ...Object.keys(HOME).filter(k => k !== "tfSeg")].forEach(k => { const o = HOME[k]; if (o && o.mk.parentNode) o.mk.parentNode.insertBefore(o.n, o.mk); }); W.tfHome = null; }
const layout = () => mounted;
const PANE = (cls, title, ...kids) => { const p = h("section", "xw " + cls); if (title) p.append(h("div", "xw-title", title)); kids.forEach(k => k && p.append(k)); return p; };
function chartPane(title) { const p = h("section", "xw xw-chart"); if (title) p.append(h("div", "xw-wtitle", title)); const tb = h("div", "xw-ctb"); tb.append(park("chartTabs"), park("tfrow")); p.append(tb, park("ohlc")); const mn = h("div", "xw-menus"); mn.append(park("indMenu"), park("setMenu"), park("patMenu")); p.append(mn, park("chartBox"), park("navBar"), park("explainBox"), park("legend"), park("coachBar")); W.chart = p; return p; }
function bottomPane(title) { const p = h("section", "xw xw-bottom"); if (title) p.append(h("div", "xw-wtitle", title)); W.ptabs = ptabs(); p.append(W.ptabs, park("panelTabs"), park("panelBox")); return p; }
function ticketPane(title) { const p = h("section", "xw xw-order"); if (title) p.append(h("div", "xw-wtitle", title)); p.append(park("ticket")); return p; }
function mount(L) {
  if (mounted === L) return; if (mounted) unmount(true);
  let ws = $("xWS"); if (!ws) { ws = h("div"); ws.id = "xWS"; body.append(ws); ws.addEventListener("click", wsClick); }
  ws.className = "xws-" + L; ws.innerHTML = ""; Object.keys(W).forEach(k => delete W[k]); mounted = L;
  W.mb = h("nav", "xw-mb"); W.mb.style.gridArea = "mb"; ws.append(W.mb);
  const put = (el, area) => { el.style.gridArea = area; ws.append(el); return el; };
  if (L === "tv") {
    put(chartPane(), "ch"); put(bottomPane(), "bt");
    const sd = h("aside", "xw xw-side"); W.wl = wl(); const det = h("div", "xw-details"); W.det = det; sd.append(h("div", "xw-title", "Watchlist"), W.wl, det, ticketPane("Order panel")); put(sd, "sd");
  } else if (L === "wb") {
    W.wl = wl(); put(PANE("xw-wlp", "Watchlist", W.wl), "wl"); const hd = h("section", "xw xw-quote"); hd.append(park("mrow")); put(hd, "hd");
    put(chartPane(), "ch"); put(bottomPane(), "bt"); const od = h("aside", "xw xw-side"); W.ladder = ladder("l2"); od.append(W.ladder, ticketPane("Trade")); put(od, "od");
  } else if (L === "nt") {
    put(chartPane("Chart - " + symOf()), "ch"); put(ticketPane("Chart Trader"), "tr"); W.ladder = ladder("nt"); put(PANE("xw-dom", null, W.ladder), "dm"); put(bottomPane("Control Center"), "cc");
    const hd = h("div", "xw-ntsym"); hd.append(park("mrow")); W.chart.insertBefore(hd, W.chart.children[1]);
  } else if (L === "tos") {
    ws.classList.add("tos-charts"); const sb = h("section", "xw xw-sub"); sb.append(park("mrow")); put(sb, "sb");
    const gd = h("aside", "xw xw-side"); W.acct = acct(); W.wl = wl(); gd.append(W.acct, h("div", "xw-title", "Watchlist"), W.wl); put(gd, "gd");
    put(chartPane(), "ch"); put(bottomPane("Activity and Positions"), "bt"); const at = h("aside", "xw xw-side"); W.ladder = ladder("tos"); at.append(W.ladder, ticketPane("Order Entry")); put(at, "at");
  } else if (L === "mt") {
    W.tb = put(mtToolbar(), "tl"); W.wl = wl("mt"); put(PANE("xw-mw", "Market Watch: " + new Date().toLocaleTimeString([], { hour12: false }), W.wl), "mw"); W.nav = mtnav(); put(PANE("xw-nvp", null, W.nav), "nv");
    const ch = chartPane(); const hd = h("div", "xw-mtsym"); hd.append(park("mrow")); ch.insertBefore(hd, ch.firstChild); W.oc = oneclick(); ch.append(W.oc); W.st = symTabs(); ch.append(W.st); put(ch, "ch"); put(bottomPane("Terminal"), "bx");
  } else if (L === "cb") {
    W.ob = book(); put(PANE("xw-obp", null, W.ob), "ob"); put(chartPane(), "ch"); put(bottomPane(), "bt"); put(ticketPane(), "od");
    const hidden = h("div", "xw-hide"); hidden.append(park("mrow")); ws.append(hidden);
  }
  if (L === "mt") { W.tt = put(h("div", "xw-tt"), "tt"); }
  W.status = put(h("div", "xw-status"), "st");
  if (L !== "mt") { const t = $("ticket"); if (t) t.classList.add("xw-docked"); }
  body.classList.add("x-ws"); renderMB(); renderPT(); renderLive(); setTimeout(fitChart, 30); pullBook();
}
function unmount(keep) { if (!mounted) return; const t = $("ticket"); if (t) t.classList.remove("xw-docked"); unpark(); const ws = $("xWS"); if (ws) { ws.innerHTML = ""; ws.className = ""; } mounted = null; Object.keys(W).forEach(k => delete W[k]); if (!keep) { body.classList.remove("x-ws"); setTimeout(() => { try { drawChart(); } catch (e) {} }, 30); } }
function wsClick(e) {
  const dd = e.target.closest("[data-dd]"); if (dd) { const open = dd.classList.contains("on-dd"); closeDD(); if (open) return; const L = layout(), items = DD[L][dd.dataset.dd]; dd.classList.add("on-dd"); const m = h("div", "xw-dd", items.map(([l, a]) => { const chk = a.startsWith("v-") ? ($("xWS").classList.contains("xmt-no" + a.slice(2)) ? "☐ " : "☑ ") : ""; return `<button data-act="${a}">${chk}${l}</button>`; }).join("")); const r = dd.getBoundingClientRect(); m.style.left = r.left + "px"; m.style.top = r.bottom + "px"; body.append(m); m.addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) act(b.dataset.act); }); return; }
  const a = e.target.closest("[data-act]"); if (a && !a.closest(".xw-ladder,.xw-acct,.xw-nav,.xw-mttb")) { act(a.dataset.act); return; }
  if (a && a.closest(".xw-ladder")) act(a.dataset.act);
}
document.addEventListener("click", e => { if (!e.target.closest(".xw-dd,[data-dd]")) closeDD(); });
function renderLive() { if (!mounted) return; try {
  if (W.wl) renderWL(W.wl); if (W.ladder) renderLadder(W.ladder); if (W.ob) renderOB(W.ob); if (W.acct) renderAcct(W.acct); if (W.nav && !W.nav.dataset.r) { renderNav(W.nav); W.nav.dataset.r = 1; } if (W.oc) renderOC(W.oc); if (W.st) renderSymTabs(W.st); if (W.tb) renderMT(W.tb);
  if (W.det) W.det.innerHTML = `<div class="xw-title">${esc(symOf())}</div><div class="big">${f2(lp())}</div>${$("mstats").innerHTML}`;
  const st = q(".slot-stats", W.mb); if (st) st.innerHTML = $("mstats").innerHTML; const sym = q(".sym", W.mb); if (sym) sym.textContent = (layout() === "tv" ? "🔍 " : "") + symOf() + (layout() === "cb" ? " ▾" : "");
  if (W.status) { const tx = (($("cbTxt") || {}).textContent || "").trim(); W.status.innerHTML = `<b>XVI DNA Coach</b> — learning ${V.PLAT[mounted].n}<span class="msg">${esc(tx)}</span><button data-act="coach">Open coach</button>`; }
  if (W.tt) W.tt.textContent = `XVI DNA Coach - ${S.live ? "Practice" : "Offline"} Account - ${symOf()},${TFG && TFG[S.tf] ? TFG[S.tf][0] : ""}`;
  if (W.oc) { const li = q("input", W.oc); if (li && document.activeElement !== li) li.value = $("inAmt").value || ""; }
  const wt = W.chart && q(".xw-wtitle", W.chart); if (wt && layout() === "nt") wt.textContent = "Chart - " + symOf();
  } catch (e) { console.warn("xvi renderLive", e && e.stack); } }
function fitChart() { try { drawChart(); } catch (e) {} }
window.XVI_MAINH = () => { if (!mounted || !W.chart) return 0; const p = W.chart; let used = 0; [...p.children].forEach(c => { if (c.id !== "chartBox" && c.offsetParent !== null && getComputedStyle(c).position !== "absolute") used += c.offsetHeight; });
  const panes = IND_DEF.filter(d => d[3] === "pane" && S.ind[d[0]]).length * 64; return Math.max(160, p.clientHeight - used - panes - 14); };
window.addEventListener("resize", () => { if (mounted) setTimeout(fitChart, 30); });
setInterval(renderLive, 1000); setInterval(pullBook, 3000);

/* hook views: workspace shows for spot/deriv while a platform runs */
const _sv = showView;
showView = function (v) { _sv(v); const want = V.isPlat() && (v === "spot" || v === "deriv") ? S.set.theme : null;
  if (want) mount(want); else unmount(); enter(v); };
const _at = applyTheme;
applyTheme = function (k) { _at(k); if (mounted && V.PLAT[k] && k !== mounted) mount(k); else if (mounted && !V.PLAT[k]) unmount(); };
const _ct = closeTicket; closeTicket = function () { if (mounted && mounted !== "mt") return; _ct(); };
const _ot = openTicket; openTicket = function (side) { _ot(side); if (mounted && mounted !== "mt") { $("tkDim").classList.remove("show"); flash($("ticket")); } };
const _ra = renderAll; renderAll = function () { _ra(); if (mounted) renderLive(); };

/* ---------- motion: view transitions, count-ups, ripples ---------- */
function enter(v) { if (RM()) return; const id = { spot: "v-market", deriv: "v-market", trade: "v-trade", tx: "v-tx", coach: "v-coach", home: "xHome" }[v]; const el = mounted ? $("xWS") : $(id); if (!el) return;
  el.classList.remove("x-enter"); void el.offsetWidth; el.classList.add("x-enter"); if (v === "coach") { qa("#v-coach>section,#v-coach>.xhero").forEach((s, i) => { s.style.setProperty("--d", (i * 55) + "ms"); }); setTimeout(() => countUp($("v-coach")), 120); }
  if (v === "tx" || (v === "coach" && V.X.tab === "journal")) setTimeout(() => countUp($("v-tx")), 120); }
function countUp(root, sel) { if (!root || RM()) return; qa(sel || ".stat .v,.kv span:nth-child(even),.xcount", root).forEach(el => {
  if (el.dataset.cu === el.textContent || el.children.length) return; const t = el.textContent, m = t.match(/-?[\d,]*\.?\d+/); if (!m) return; const raw = m[0], n = parseFloat(raw.replace(/,/g, "")); if (!isFinite(n) || n === 0) return;
  const dec = (raw.split(".")[1] || "").length, comma = raw.includes(","), pre = t.slice(0, m.index), post = t.slice(m.index + raw.length), t0 = performance.now(), D = 700;
  const step = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3), v = n * e; el.textContent = pre + (comma ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec)) + post; if (k < 1) requestAnimationFrame(step); else { el.textContent = t; el.dataset.cu = t; } };
  requestAnimationFrame(step); }); }
window.xviCountUp = countUp;
document.addEventListener("pointerdown", e => { if (RM()) return; const b = e.target.closest("button,.xt,.xdesk,.xask,[data-o],.xw-wl .r[data-k]"); if (!b || b.closest("#drawBar")) return;
  const r = b.getBoundingClientRect(), s = h("span", "xripple"), d = Math.max(r.width, r.height) * 2; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  if (getComputedStyle(b).position === "static") b.classList.add("xrel"); b.classList.add("xclip"); b.append(s); setTimeout(() => s.remove(), 650); }, { passive: true });

/* ---------- holographic pop-up panel ---------- */
const hp = h("div", "", ""); hp.id = "xHolo"; hp.setAttribute("role", "dialog"); hp.setAttribute("aria-modal", "true"); const hpd = h("div"); hpd.id = "xHoloDim"; body.append(hpd, hp);
function openHolo(key, from) { const C = HOLO[key]; if (!C) return; const c = C();
  hp.innerHTML = `<div class="hh"><span class="ic">${c.iconHtml || V.svg(c.icon)}</span><h3>${c.title}</h3><button class="x" data-hx="close" aria-label="Close">×</button></div><div class="hb">${c.body}</div><div class="hf">${(c.acts || []).map(([l, a, cls]) => `<button class="btn ${cls || ""}" data-ha="${a}">${l}</button>`).join("")}</div>`;
  if (from) { const r = from.getBoundingClientRect(); hp.style.setProperty("--ox", (r.left + r.width / 2) + "px"); hp.style.setProperty("--oy", (r.top + r.height / 2) + "px"); } else { hp.style.setProperty("--ox", "50vw"); hp.style.setProperty("--oy", "50vh"); }
  body.classList.add("x-holo"); hp.classList.remove("in"); void hp.offsetWidth; hp.classList.add("in"); setTimeout(() => countUp(hp), 160); typeIn(q(".type", hp)); const f = q("[data-ha]", hp); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50); }
function closeHolo() { body.classList.remove("x-holo"); }
hpd.onclick = closeHolo; document.addEventListener("keydown", e => { if (e.key === "Escape" && body.classList.contains("x-holo")) closeHolo(); });
hp.addEventListener("click", e => { if (e.target.closest("[data-hx]")) { closeHolo(); return; } const g = e.target.closest("[data-xg]"); if (g) { V.setCoach(g.dataset.xg); const im = q(".hfig img", hp); if (im) { im.src = V.coachImg(); im.alt = V.X.gender + " hologram coach"; } return; }
  const b = e.target.closest("[data-ha]"); if (!b) return; const a = b.dataset.ha; closeHolo(); setTimeout(() => {
    if (a.startsWith("tab:")) V.xTab(a.slice(4)); else if (a.startsWith("sim:")) V.startSim(a.slice(4)); else if (a.startsWith("view:")) showView(a.slice(5)); else if (a.startsWith("holo:")) openHolo(a.slice(5)); else (A[a] || act.bind(null, a))(); }, RM() ? 0 : 160); });
function typeIn(el) { if (!el) return; const t = el.dataset.t || el.textContent; el.dataset.t = t; if (RM()) { el.textContent = t; return; } el.textContent = ""; el.classList.add("typing"); let i = 0; const tick = () => { i += Math.max(1, Math.round(t.length / 60)); el.textContent = t.slice(0, i); if (i < t.length) setTimeout(tick, 18); else el.classList.remove("typing"); }; tick(); }
window.xviTypeIn = typeIn;
const nB = () => { try { return BADGES.filter(b => { try { return b[3](); } catch (e) { return false; } }).length; } catch (e) { return 0; } };
const HOLO = {
  coach: () => ({ icon: "coach", title: "Your coach", body: `<div class="hcoach"><div class="hfig"><img alt="${V.X.gender} hologram coach" src="${V.coachImg()}"></div><div><p class="type">${esc(($("cbTxt") || {}).textContent || "Pick a market and I'll walk you through it.")}</p><div class="hstats"><div><b class="xcount">${usd(S.balance || 0)}</b><small>Buying power</small></div><div><b>${esc(symOf())}</b><small>Market</small></div><div><b class="xcount">${nB()}</b><small>Badges</small></div></div>${V.chip()}</div></div>`, acts: [["▶ Start guided trade", "tour", "pri"], ["💬 Ask the coach", "ask"], ["Open Coach", "tab:coach"]] }),
  lessons: () => ({ icon: "lessons", title: "Lessons", body: `<p class="type">Learning mode is ${S.learn && S.learn.on ? "on" : "off"}. Lessons pop up on the live chart when a good example shows up, and every term is in Market lingo.</p><div class="hstats"><div><b class="xcount">${(S.learned || []).length || 0}</b><small>Topics learned</small></div><div><b class="xcount">${S.learn && S.learn.cap ? "$" + S.learn.cap.toFixed(2) : "—"}</b><small>Tuition cap</small></div><div><b>${S.learn && S.learn.on ? "On" : "Off"}</b><small>Learning mode</small></div></div>`, acts: [["▶ Guided tour", "tour", "pri"], ["Explain chart", "explainGo"], ["Open Lessons", "tab:lessons"]] }),
  research: () => { const T = S.T, n = T && T.strategies ? T.strategies.length : 0, sig = T && T.strategies ? T.strategies.filter(s => s.side !== 0).length : 0; return { icon: "research", title: "Research Lab", body: `<p class="type">The brain checks ${n || "its"} strategies on every closed candle. The lab proposes one change, backtests it, and three gates decide. The AI can never approve its own work.</p><div class="hstats"><div><b class="xcount">${n}</b><small>Strategies</small></div><div><b class="xcount">${sig}</b><small>Signals now</small></div><div><b class="xcount">${(S.lab && S.lab.runs || []).length}</b><small>Lab rounds</small></div></div>`, acts: [["Open Research Lab", "tab:research", "pri"], ["💬 Ask about a strategy", "ask"]] }; },
  journal: () => ({ icon: "journal", title: "Journal", body: `<p class="type">Every closed trade gets a review: what went right, what to fix, and the fees you paid.</p><div class="hstats"><div><b class="xcount">${(S.lessons || []).length}</b><small>Trades reviewed</small></div><div><b class="xcount">${(S.fills || S.txs || []).length || 0}</b><small>Fills</small></div><div><b>${S.live ? "Live" : "Offline"}</b><small>Data</small></div></div>`, acts: [["Open Journal", "tab:journal", "pri"], ["Transactions", "view:tx"]] }),
  progress: () => { const g = nB(), t = (typeof BADGES !== "undefined" ? BADGES.length : 0) || 1; return { icon: "progress", title: "Progress", body: `<div class="hring" style="--p:${g / t * 100}"><b class="xcount">${g}</b><small>of ${t} badges</small></div><p class="type">${g ? "Nice work. Keep stacking checkpoints." : "Your first badge comes from your first guided trade."}</p>`, acts: [["Open Progress", "tab:progress", "pri"], ["▶ Guided trade", "tour"]] }; },
  stats: () => ({ icon: "progress", title: "Desk stats", body: `<div class="hstats big"><div><b class="xcount">${usd(S.balance || 0)}</b><small>Buying power</small></div><div><b class="xcount">${f2(lp())}</b><small>${esc(symOf())}</small></div><div><b class="xcount">${nB()}</b><small>Badges</small></div><div><b class="xcount">${(S.lessons || []).length}</b><small>Trades reviewed</small></div><div><b class="xcount">${(S.lab && S.lab.runs || []).length}</b><small>Lab rounds</small></div><div><b>${S.live ? "Live" : "Offline"}</b><small>Market data</small></div></div>`, acts: [["Open Progress", "tab:progress", "pri"], ["Account & fees", "tab:coach"]] }),
  apps: () => ({ icon: "sims", title: "All apps", body: `<div class="happs">${[["view:spot", "market", "Spot chart"], ["view:deriv", "market", "Derivatives"], ["view:trade", "sims", "Markets"], ["view:tx", "journal", "Transactions"], ["tab:coach", "coach", "Coach"], ["tab:lessons", "lessons", "Lessons"], ["tab:research", "research", "Research Lab"], ["tab:journal", "journal", "Journal"], ["tab:progress", "progress", "Progress"], ["sims", "sims", "Platforms"], ["menu", "home", "Settings"], ["ask", "ask", "Ask coach"]].map(([a, i, l]) => `<button data-ha="${a}">${V.svg(i)}<span>${l}</span></button>`).join("")}</div>` })
};
A.explainGo = () => { showView(S.inst && isLev() ? "deriv" : "spot"); setTimeout(() => $("expBtn").click(), 80); };
window.xviHolo = openHolo; window.xviHOLO = HOLO; window.xviCloseHolo = closeHolo;

/* ---------- live desk: drag / swipe / keys / wheel rotation, parallax, inertia ---------- */
const home = $("xHome"), stage = $("xStage"), scroller = $("xScroll"), fill = q(".fill", home);
const D = { x: 0, min: 0, max: 0, v: 0, drag: null, moved: 0, raf: 0, paused: false, target: null };
const par = h("div", "xpar"); par.innerHTML = Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${(i * 53) % 70 + 5}%;--s:${0.6 + (i % 5) * 0.25};--d:${(i % 7) * 0.7}s"></i>`).join(""); home.append(par);
const glare = h("div", "xglare"); stage.append(glare);
function layoutDesk() { const vw = innerWidth, vh = innerHeight, wide = vw / vh > 1.25; let Wd = wide ? vw : vh * 1.786; let Hd = Wd / 1.786; if (!wide && Hd < vh) { Hd = vh; Wd = Hd * 1.786; } /* wide screens: fit the whole desk (all tiles visible), letterbox filled by the blurred plate */
  stage.style.width = Wd + "px"; stage.style.height = Hd + "px"; stage.style.setProperty("--u", (Wd / 100) + "px"); D.min = vw - Wd; D.max = 0; D.y = Hd < vh ? Math.max(0, (vh - Hd) * 0.35) : Math.min(0, (vh - Hd) * 0.12); if (D.target == null) D.x = (vw - Wd) / 2; D.x = Math.max(D.min, Math.min(D.max, D.x)); paint(); }
function paint(tilt) { stage.style.transform = `translate3d(${D.x}px,${D.y}px,0) rotateY(${(tilt || 0).toFixed(2)}deg)`; const k = D.min ? (D.x - D.max) / (D.min - D.max) : 0.5;
  fill.style.transform = `translate3d(${(k - 0.5) * 60}px,0,0) scale(1.1)`; par.style.transform = `translate3d(${(k - 0.5) * -160}px,0,0)`; glare.style.backgroundPosition = `${k * 100}% 0`; }
function loop() { D.raf = 0; if (D.drag) return; if (D.target != null) { const dx = D.target - D.x; D.x += dx * 0.14; if (Math.abs(dx) < 0.5) { D.x = D.target; D.target = null; } paint(dx * 0.004); } else if (Math.abs(D.v) > 0.2) { D.x += D.v; D.v *= 0.93; if (D.x < D.min || D.x > D.max) { D.x = Math.max(D.min, Math.min(D.max, D.x)); D.v = 0; } paint(D.v * 0.05); } else { paint(0); return; } D.raf = requestAnimationFrame(loop); }
const kick = () => { if (!D.raf) D.raf = requestAnimationFrame(loop); };
function rotateTo(x) { D.v = 0; D.target = Math.max(D.min, Math.min(D.max, x)); if (RM()) { D.x = D.target; D.target = null; paint(); } else kick(); }
function nudge(dir) { rotateTo(D.x - dir * innerWidth * 0.35); }
window.xviDesk = { nudge, center: () => rotateTo((D.min + D.max) / 2) };
scroller.style.overflow = "hidden";
home.addEventListener("pointerdown", e => { if (e.button !== 0 || e.target.closest("#xHolo")) return; D.drag = { x0: e.clientX, x: D.x, t: performance.now(), lx: e.clientX }; D.moved = 0; D.v = 0; D.target = null; });
window.addEventListener("pointermove", e => { if (!D.drag) return; const dx = e.clientX - D.drag.x0; D.moved = Math.max(D.moved, Math.abs(dx)); if (D.moved > 6) { home.classList.add("dragging"); let nx = D.drag.x + dx; if (nx > D.max) nx = D.max + (nx - D.max) * 0.3; if (nx < D.min) nx = D.min + (nx - D.min) * 0.3; const now = performance.now(); D.v = (e.clientX - D.drag.lx) / Math.max(1, now - D.drag.t) * 16; D.drag.lx = e.clientX; D.drag.t = now; D.x = nx; paint(Math.max(-4, Math.min(4, D.v * 0.25))); } });
window.addEventListener("pointerup", () => { if (!D.drag) return; D.drag = null; home.classList.remove("dragging"); if (D.x > D.max || D.x < D.min) rotateTo(D.x); else if (!RM()) kick(); });
home.addEventListener("click", e => { if (D.moved > 6) { e.stopImmediatePropagation(); e.preventDefault(); D.moved = 0; } }, true);
window.addEventListener("pointercancel", () => { if (D.drag) { D.drag = null; home.classList.remove("dragging"); } });
home.addEventListener("wheel", e => { if (!body.classList.contains("x-home")) return; const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!d) return; e.preventDefault(); D.target = null; D.x = Math.max(D.min, Math.min(D.max, D.x - d)); D.v = -d * 0.15; paint(-d * 0.02); kick(); }, { passive: false });
document.addEventListener("keydown", e => { if (!body.classList.contains("x-home") || body.classList.contains("x-holo") || body.classList.contains("x-simopen") || /input|textarea|select/i.test((e.target.tagName || ""))) return; if (e.key === "ArrowLeft") { nudge(-1); e.preventDefault(); } else if (e.key === "ArrowRight") { nudge(1); e.preventDefault(); } else if (e.key === "Home") window.xviDesk.center(); });
window.addEventListener("resize", layoutDesk);

/* tiles: press -> holographic pop-up (instead of a hard page switch) */
home.addEventListener("click", e => { const t = e.target.closest(".xt[data-xt],.xcoachhit[data-xt]"); if (!t || e.target.closest("[data-xp]")) return; const k = t.dataset.xt; if (HOLO[k]) { e.stopImmediatePropagation(); t.classList.add("pressed"); setTimeout(() => t.classList.remove("pressed"), 260); openHolo(k, t); } }, true);
/* desk surface controls drawn in the image -> real actions */
const DESK = [["deskHome", "Home · re-center desk", 34.2, 66.8, 6.4, 6.2, () => window.xviDesk.center()], ["deskSet", "Settings", 34.2, 73.4, 6.4, 6, () => A.menu()], ["deskChart", "Live chart", 41, 66.5, 17.5, 11, () => showView(S.inst && isLev() ? "deriv" : "spot")],
  ["deskStats", "Desk stats", 71.5, 70.5, 9, 10.5, el => openHolo("stats", el)], ["deskApps", "All apps", 85.2, 73.6, 11, 12.6, el => openHolo("apps", el)], ["deskPlay", "Pause / play desk motion", 54.2, 55.6, 5.4, 7.6, () => togglePlay()],
  ["deskLeft", "Rotate left", 42.5, 56.6, 11, 6, () => nudge(-1)], ["deskTx", "Transactions", 7.4, 73.5, 4.8, 8.5, () => showView("tx")], ["deskTrade", "Markets", 12.8, 73.5, 5, 8.5, () => showView("trade")]];
qa(".xdesk", stage).forEach(x => x.remove());
DESK.forEach(([id, l, x, y, w, hh, fn]) => { const b = h("button", "xdesk", `<span>${l}</span>`); b.id = id; b.setAttribute("aria-label", l); b.style.cssText = `left:${x}%;top:${y}%;width:${w}%;height:${hh}%`; b.addEventListener("click", ev => { ev.stopPropagation(); if (D.moved > 6) return; fn(b); }); stage.append(b); });
function togglePlay() { D.paused = !D.paused; body.classList.toggle("x-paused", D.paused); const b = $("deskPlay"); if (b) q("span", b).textContent = D.paused ? "Play desk motion" : "Pause desk motion"; try { toast(D.paused ? "Desk motion paused." : "Desk motion on."); } catch (e) {} }
/* coach hologram: idle glow, scanlines, pedestal pulse, typed speech bubble */
const holoFx = h("div", "xcoachfx"); holoFx.innerHTML = `<i class="scan"></i><i class="ring"></i>`; stage.append(holoFx);
const bub = h("button", "xbubble"); bub.innerHTML = `<span class="type"></span>`; bub.setAttribute("aria-label", "Open your coach"); bub.addEventListener("click", ev => { ev.stopPropagation(); if (D.moved > 6) return; openHolo("coach", bub); }); stage.append(bub);
let lastSay = ""; function say() { if (!body.classList.contains("x-home")) return; const t = (($("cbTxt") || {}).textContent || "").trim(); const msg = t && !/^Loading/.test(t) ? t : "Ready when you are. Drag to look around the desk."; if (msg === lastSay) return; lastSay = msg; const s = q(".type", bub); s.dataset.t = msg.length > 90 ? msg.slice(0, 88) + "…" : msg; typeIn(s); }
setInterval(say, 2500);
const _sv2 = showView; showView = function (v) { _sv2(v); if (v === "home") { layoutDesk(); lastSay = ""; setTimeout(say, 250); } };
layoutDesk(); if (S.view === "home") { enter("home"); setTimeout(say, 400); }

/* ---------- Ask the Teacher (raised hand): desk + every platform ---------- */
const HAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V5.5a1.5 1.5 0 013 0V11"/><path d="M11 11V4a1.5 1.5 0 013 0v7"/><path d="M14 11V5.5a1.5 1.5 0 013 0V13"/><path d="M17 9.5a1.5 1.5 0 013 0V15a7 7 0 01-7 7h-1a7 7 0 01-5.6-2.8L3.6 15.4a1.6 1.6 0 012.4-2.1L8 15"/></svg>';
const at = h("button", "xteach", `<span class="hand">${HAND}</span><span class="lbl">Ask the Teacher</span>`); at.id = "xTeach"; at.setAttribute("aria-label", "Ask the Teacher"); body.append(at);
HOLO.teach = () => ({ icon: "ask", title: "Ask the Teacher", body: `<div class="hcoach"><div class="hfig"><img alt="${V.X.gender} hologram coach" src="${V.coachImg()}"></div><div><p class="type">${esc(mounted ? "You're practicing on the " + V.PLAT[mounted].n + " layout. Ask me about anything on this screen." : "Hand's up, I see you. What do you want to know?")}</p>
  <form class="hask" data-hask><input id="xTeachIn" autocomplete="off" placeholder="e.g. Is my stop too tight on ${esc(symOf())}?" aria-label="Your question"><button class="btn pri" type="submit">Ask</button></form>
  <div class="hsugg">${["Should I take this trade?", "Explain this chart", "Why is my stop there?", "What does the order book tell me?"].map(s => `<button type="button" data-hs="${esc(s)}">${esc(s)}</button>`).join("")}</div>${V.chip()}</div></div>`, acts: [["Open full chat", "ask"], ["Explain chart", "explainGo"]] });
function askTeacher(qs) { const t = (qs || "").trim(); closeHolo(); setTimeout(() => { openAsk(t); if (t) { $("askIn").value = t; $("askSend").click(); } }, RM() ? 0 : 180); }
hp.addEventListener("submit", e => { if (!e.target.closest("[data-hask]")) return; e.preventDefault(); const v = ($("xTeachIn") || {}).value || ""; if (v.trim()) askTeacher(v); else { const i = $("xTeachIn"); if (i) { i.classList.remove("shake"); void i.offsetWidth; i.classList.add("shake"); i.focus(); } } });
hp.addEventListener("click", e => { const s = e.target.closest("[data-hs]"); if (s) { e.stopPropagation(); askTeacher(s.dataset.hs); } }, true);
function raiseHand(from) { if (RM()) { openHolo("teach", from); setTimeout(() => { const i = $("xTeachIn"); if (i) i.focus(); }, 50); return; } at.classList.remove("raise"); void at.offsetWidth; at.classList.add("raise"); setTimeout(() => { openHolo("teach", from || at); setTimeout(() => { const i = $("xTeachIn"); if (i) i.focus(); }, 380); }, 650); }
at.addEventListener("click", () => raiseHand(at));
const xa = q(".xask", stage); if (xa) { xa.innerHTML = `${HAND}<em>Ask the Teacher…</em>`; xa.addEventListener("click", ev => { ev.stopImmediatePropagation(); if (D.moved > 6) return; raiseHand(xa); }, true); }
window.xviAskTeacher = raiseHand;
})();
