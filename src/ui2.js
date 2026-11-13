"use strict";
const CB = "Coin base agents", WB = "Webull";
const $ = id => document.getElementById(id);
const isF = Number.isFinite;
const fmt = (n, d = 2) => (n == null || !isF(n)) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const usd = (n, d = 2) => (n == null || !isF(n)) ? "—" : (n < 0 ? "-$" : "$") + fmt(Math.abs(n), d);
const pct = (n, d = 2) => (n == null || !isF(n)) ? "—" : fmt(n * 100, d) + "%";
const decOf = inc => { const n = parseFloat(inc) || 0.01; let d = 0; while (d < 12 && Math.abs(Math.round(n * 10 ** d) - n * 10 ** d) > 1e-9) d++; return d; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const S = {
  mcp: null, live: false, tf: 900, balance: 0, fees: { spot: { m: 0.005, t: 0.009 }, future: { m: 0.00095, t: 0.001 } }, hasPerps: false,
  inst: null, bars: [], bid: null, ask: null, lastFetch: 0, T: null, sel: null, side: 1, planEdited: false, P: null, C: [],
  lists: { crypto: [], futures: [], perps: [] }, tab: "crypto", sub: "vol", unsubs: [], loadId: 0, step: -1, thinkKey: ""
};
const pd = () => S.inst ? decOf(S.inst.priceInc) : 2;
const px = n => (n == null || !isF(n)) ? "—" : (n < 0 ? "-$" : "$") + fmt(Math.abs(n), Math.max(2, Math.min(pd(), 8)));
const rp = n => { const inc = parseFloat(S.inst.priceInc) || 0.01; return +(Math.round(n / inc) * inc).toFixed(pd()); };
const TFG = { 60: ["1m", "M1"], 300: ["5m", "M5"], 900: ["15m", "M15"], 1800: ["30m", "M30"], 3600: ["1h", "M60"], 86400: ["1d", "D"] };
const KIND = { spot: "Crypto spot", stock: "Stock / ETF", future: "US futures", perp: "Perpetual" };

/* ---------- static market lists ---------- */
const mkStock = (sym, name, cat, group) => ({ key: "wb:" + sym, kind: "stock", src: "wb", sym, cat, label: sym, name, group, dataId: sym, tradeId: sym + "-USD", priceInc: "0.01", baseInc: "0.00001", canShort: false, minQuote: 1 });
const STOCKS = [["SPY", "S&P 500 ETF", "US_ETF", "index"], ["QQQ", "Nasdaq 100 ETF", "US_ETF", "index"], ["DIA", "Dow 30 ETF", "US_ETF", "index"], ["IWM", "Russell 2000 ETF", "US_ETF", "index"],
  ["AAPL", "Apple", "US_STOCK", "stock"], ["MSFT", "Microsoft", "US_STOCK", "stock"], ["NVDA", "Nvidia", "US_STOCK", "stock"], ["TSLA", "Tesla", "US_STOCK", "stock"], ["AMZN", "Amazon", "US_STOCK", "stock"], ["GOOGL", "Alphabet", "US_STOCK", "stock"], ["META", "Meta", "US_STOCK", "stock"], ["AMD", "AMD", "US_STOCK", "stock"], ["COIN", "Coinbase", "US_STOCK", "stock"], ["MSTR", "Strategy", "US_STOCK", "stock"], ["PLTR", "Palantir", "US_STOCK", "stock"], ["NFLX", "Netflix", "US_STOCK", "stock"], ["AVGO", "Broadcom", "US_STOCK", "stock"], ["HOOD", "Robinhood", "US_STOCK", "stock"]].map(a => mkStock(...a));
const FXETF = [["FXE", "Euro vs US dollar (ETF)"], ["FXY", "Japanese yen vs US dollar (ETF)"], ["FXB", "British pound vs US dollar (ETF)"], ["FXA", "Australian dollar vs US dollar (ETF)"], ["FXC", "Canadian dollar vs US dollar (ETF)"], ["FXF", "Swiss franc vs US dollar (ETF)"], ["UUP", "US dollar index, bullish (ETF)"]].map(a => mkStock(a[0], a[1], "US_ETF", "fx"));
const CMDETF = [["GLD", "Gold (ETF)"], ["SLV", "Silver (ETF)"], ["USO", "Crude oil (ETF)"], ["UNG", "Natural gas (ETF)"]].map(a => mkStock(a[0], a[1], "US_ETF", "cmd"));
const FUT_NAME = { BIT: "Bitcoin", BIP: "Bitcoin (perp-style)", ET: "Ether", ETP: "Ether (perp-style)", SOL: "Solana", SLP: "Solana (perp-style)", XRP: "XRP", XPP: "XRP (perp-style)", GOL: "Gold", SLR: "Silver", NOL: "Crude oil", NGS: "Natural gas", CU: "Copper", PT: "Platinum", DOG: "Dogecoin", DOP: "Dogecoin (perp-style)", LC: "Litecoin", LCP: "Litecoin (perp-style)", BCH: "Bitcoin Cash", BCP: "Bitcoin Cash (perp-style)", AVA: "Avalanche", AVP: "Avalanche (perp-style)", LNK: "Chainlink", LNP: "Chainlink (perp-style)", DOT: "Polkadot", ADA: "Cardano", ADP: "Cardano (perp-style)", SUI: "Sui", SUP: "Sui (perp-style)", ZEC: "Zcash" };
const FUT_CMD = new Set(["GOL", "SLR", "NOL", "NGS", "CU", "PT"]);

/* ---------- parsing ---------- */
const parseCB = p => ((p && p.candles) || []).map(x => ({ t: +x.start, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume })).filter(x => isF(x.c));
const asArr = p => { if (typeof p === "string") { try { p = JSON.parse(p); } catch (e) { return []; } } return Array.isArray(p) ? p : (p && (p.data || p.bars)) || []; };
const parseWB = p => asArr(p).map(x => ({ t: Math.floor(Date.parse(x.time) / 1000), o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume })).filter(x => isF(x.c) && isF(x.t));
function mergeBars(a, b) { const m = new Map(); for (const x of a) m.set(x.t, x); for (const x of b) m.set(x.t, x); return [...m.values()].sort((x, y) => x.t - y.t); }
const iso = s => new Date(s * 1000).toISOString().replace(/\.\d+Z$/, "Z");

function buildCrypto(products) {
  const by = {};
  products.forEach(p => { const q = p.quote_currency_id, b = p.base_currency_id; if (!b || (q !== "USD" && q !== "USDC")) return; if (p.status && p.status !== "online") return; (by[b] = by[b] || {})[q] = p; });
  return Object.entries(by).map(([b, v]) => { const d = v.USD || v.USDC, t = v.USDC || v.USD, price = parseFloat(d.price || t.price || 0);
    return { key: "cb:" + b, kind: "spot", src: "cb", ptype: "SPOT", label: b, name: t.product_id, dataId: d.product_id, tradeId: t.product_id, price, chg: parseFloat(d.price_percentage_change_24h || 0) / 100, usdVol: parseFloat(d.volume_24h || 0) * price,
      priceInc: t.price_increment || "0.01", baseInc: t.base_increment || "0.00000001", minQuote: parseFloat(t.quote_min_size || 1), canShort: false, group: b === "EURC" ? "fx" : "crypto" }; }).filter(m => m.price > 0);
}
function buildPerps(products) {
  return products.map(p => { const d = p.perp_product_details || {}, price = parseFloat(p.price || 0), cs = parseFloat(d.contract_size || 1);
    return { key: "cbp:" + p.product_id, kind: "perp", src: "cb", ptype: "GLOBAL_PERP", label: p.base_currency_id + " perp", name: p.product_id + " · up to " + (d.max_leverage || "?") + "× leverage", dataId: p.product_id, tradeId: p.product_id, price,
      chg: parseFloat(p.price_percentage_change_24h || 0) / 100, usdVol: parseFloat(p.volume_24h || 0) * price, priceInc: p.quote_increment || "0.01", baseInc: "1", contractSize: cs, minContracts: parseFloat(p.base_min_size || 1),
      maxLev: d.max_leverage || 10, canShort: true, group: (p.underlying_type || "CRYPTO").toLowerCase() }; }).filter(m => m.price > 0);
}

/* ---------- fees for the selected market ---------- */
function applyFees(inst) {
  if (inst.kind === "spot") { inst.feeIn = S.fees.spot.m; inst.feeOut = S.fees.spot.m; inst.feeOutTaker = S.fees.spot.t; inst.slip = 0.0001; inst.feeSrc = "your Coinbase fee level (limit in, market on a stop)"; }
  else if (inst.kind === "future") { inst.feeIn = S.fees.future.m; inst.feeOut = S.fees.future.m; inst.feeOutTaker = S.fees.future.t; inst.slip = 0.0001; inst.feeSrc = "your Coinbase futures rate; exchange and clearing fees can add a little"; }
  else if (inst.kind === "stock") { inst.feeIn = 0; inst.feeOut = 0; inst.feeOutTaker = 0; inst.slip = 0.0002; inst.feeSrc = "Coinbase shows $0 stock commission; 0.02% slippage assumed"; }
  else { inst.feeIn = 0.0005; inst.feeOut = 0.0005; inst.feeOutTaker = 0.0005; inst.slip = 0.0001; inst.feeSrc = "assumed 0.05% per side (the XVI DNA default); your real perp fee isn't available here"; }
}

/* ---------- data ---------- */
async function call(server, tool, input, opt) { const r = await S.mcp.callTool(server, tool, input, opt); return r.payload; }
async function fetchHistory(inst, tf) {
  if (inst.src === "wb") {
    const tryCat = async cat => parseWB(await call(WB, "get_stock_bars_single", { symbol: inst.sym, category: cat, timespan: TFG[tf][1], real_time_required: "false", count: "1200" }, { cache: false }));
    let rows = []; try { rows = await tryCat(inst.cat); } catch (e) { if (e.code !== "tool_error") throw e; }
    if (!rows.length) { const other = inst.cat === "US_STOCK" ? "US_ETF" : "US_STOCK"; rows = await tryCat(other); if (rows.length) inst.cat = other; }
    return rows.sort((a, b) => a.t - b.t);
  }
  const now = Math.floor(Date.now() / 1000), pages = 5, per = 347, jobs = []; // each page spans 348 intervals = 349 candles (Coinbase allows < 350)
  for (let k = 0; k < pages; k++) { const end = now - k * per * tf + (k ? 0 : tf), start = end - per * tf - tf;
    jobs.push(call(CB, "coinbase_products_candles", { product_id: inst.dataId, product_type: inst.ptype, granularity: TFG[tf][0], start: iso(start), end: iso(end), limit: per }, { cache: false }).then(parseCB).catch(e => { if (k === 0) throw e; return []; })); }
  const parts = await Promise.all(jobs); let all = []; parts.forEach(p => { all = mergeBars(all, p); }); return all;
}
function tailInput(inst, tf) {
  return inst.src === "wb" ? [WB, "get_stock_bars_single", { symbol: inst.sym, category: inst.cat, timespan: TFG[tf][1], real_time_required: "false", count: "40" }, parseWB]
    : [CB, "coinbase_products_candles", { product_id: inst.dataId, product_type: inst.ptype, granularity: TFG[tf][0], limit: 60 }, parseCB];
}
function stopWatches() { S.unsubs.forEach(u => { try { u(); } catch (e) {} }); S.unsubs = []; if (S.pollT) { clearInterval(S.pollT); S.pollT = null; } }
function startWatches(inst, tf, id) { // fast polling: price every 5s, candles every 5s (15s when a live quote is available)
  stopWatches(); const [srv, tool, input, parse] = tailInput(inst, tf), hasQuote = inst.src === "cb" && inst.kind !== "perp"; let busyQ = false, busyC = false, slow = 1, n = 0;
  const bump = e => { if (e && (e.code === "rate_limited" || e.code === "server_unavailable")) slow = Math.min(6, slow * 2); if (e && ["needs_reauth", "server_not_connected", "blocked_by_policy", "approval_required", "not_in_manifest"].includes(e.code)) { connMsg(e); stopWatches(); } };
  const candles = async () => { if (busyC) return; busyC = true; try { const rows = parse(await call(srv, tool, input, { cache: false })); if (id === S.loadId && rows.length) { S.bars = mergeBars(S.bars, rows); S.lastFetch = Date.now(); slow = 1; onData(); } } catch (e) { bump(e); } busyC = false; };
  const quote = async () => { if (busyQ) return; busyQ = true; try { const p = await call(CB, "coinbase_products_best_bid_ask", { product_ids: [inst.dataId], product_type: inst.ptype }, { cache: false }), b = p && p.pricebooks && p.pricebooks[0];
      if (id === S.loadId && b && b.bids && b.bids[0] && b.asks && b.asks[0]) { S.bid = +b.bids[0].price; S.ask = +b.asks[0].price; S.lastFetch = Date.now(); slow = 1; const mid = (S.bid + S.ask) / 2, now = Math.floor(Date.now() / 1000), t0 = now - now % tf, last = S.bars[S.bars.length - 1];
        if (last && last.t === t0) { last.c = mid; if (mid > last.h) last.h = mid; if (mid < last.l) last.l = mid; } else if (last && last.t < t0 && t0 - last.t <= tf * 2) S.bars.push({ t: t0, o: last.c, h: Math.max(last.c, mid), l: Math.min(last.c, mid), c: mid, v: 0 });
        onData(); } } catch (e) { bump(e); } busyQ = false; };
  S.pollT = setInterval(() => { if (id !== S.loadId || document.hidden) return; n++; if (n % slow) return; if (hasQuote) { quote(); if (n % (3 * slow) === 0) candles(); } else candles(); }, (S.refreshSec || 5) * 1000);
}
function onWatchErr(e) { if (["needs_reauth", "server_not_connected", "blocked_by_policy", "approval_required", "not_in_manifest"].includes(e.code)) connMsg(e); }

/* ---------- brain run ---------- */
function closedBars() { const now = Date.now() / 1000; let r = S.bars; if (r.length && r[r.length - 1].t + S.tf > now) r = r.slice(0, -1); return r; }
let thinkTimer = null;
function onData() {
  const cl = closedBars(); if (!cl.length) { render(); return; }
  const key = S.inst.key + "|" + S.tf + "|" + cl[cl.length - 1].t + "|" + cl.length;
  if (key === S.thinkKey) { renderLight(); return; }
  S.thinkKey = key; $("brainHead").textContent = S.T ? $("brainHead").textContent : "Brain is testing six strategies on " + cl.length + " candles…";
  clearTimeout(thinkTimer);
  thinkTimer = setTimeout(() => {
    const prevSel = S.sel;
    try { S.T = COACH.think(cl, S.inst, S.tf, { extra: (S.lab.approved[S.inst.key + "|" + S.tf] || []) }); } catch (e) { S.T = null; $("brainHead").innerHTML = `<span class="dn">The brain hit an error on this data.</span>`; return; }
    if (S.T.strategies.length) {
      const keep = prevSel && S.T.strategies.find(s => s.name === prevSel);
      const live = S.T.pick || S.T.strategies.find(s => s.side !== 0);
      const best = S.T.strategies.slice().sort((a, b) => ((b.bt && b.bt.expR) || -9) - ((a.bt && a.bt.expR) || -9))[0];
      const chosen = (live && !S.planEdited) ? live : (keep || live || best);
      if (chosen.name !== S.sel || !S.planEdited) { S.sel = chosen.name; if (!S.planEdited) { S.side = chosen.side || (S.inst.canShort && !chosen.longOnly ? S.T.bias : 1); S.P = null; } }
    }
    render(); setTimeout(maybeTeach, 400);
  }, 30);
}
const curStrat = () => S.T && S.T.strategies.find(s => s.name === S.sel);
const lastPrice = () => (S.bid && S.ask) ? (S.bid + S.ask) / 2 : (S.bars.length ? S.bars[S.bars.length - 1].c : (S.inst && S.inst.price) || null);

function brainPlan() {
  const st = curStrat(); if (!st || !S.T || !isF(S.T.atr)) return null;
  const entry = S.side > 0 ? (S.bid || lastPrice()) : (S.ask || lastPrice()); // rest on your own side of the book = lower (maker) fee
  const r = st.spec.risk; return { entry: rp(entry), stop: rp(entry - S.side * r.stop_atr_mult * S.T.atr), target: rp(entry + S.side * r.target_atr_mult * S.T.atr) };
}
function setPlanInputs(p) { const d = pd(); $("inEntry").value = p.entry.toFixed(d); $("inStop").value = p.stop.toFixed(d); $("inTgt").value = p.target.toFixed(d); }

const GATE_NAME = { unseen_data: "unseen data", parameter_nudge: "parameter nudge", trade_shuffle: "trade shuffle" };
const GATE_SHORT = { unseen_data: "G1 unseen", parameter_nudge: "G2 nudge", trade_shuffle: "G3 shuffle" };

/* ---------- guided pop-ups ---------- */
const STEPS = [
 { id: "s-account", title: "Know the market you're in",
   what: () => `You have ${usd(S.balance)}. ${S.inst.label} is a ${KIND[S.inst.kind].toLowerCase()} market. ${S.inst.canShort ? "You can go long or short here." : "You can only buy here, so you profit only when price rises."}`,
   why: () => `The market type sets the rules: what it costs, whether you can short, and whether leverage can wipe you out. The brain uses these exact fees in every backtest, so its results are after costs.`,
   math: () => `Buying power = ${usd(S.balance)} (USDC + USD)\nFee in       = ${pct(S.inst.feeIn, 3)}\nFee out      = ${pct(S.inst.feeOut, 3)} (target) / ${pct(S.inst.feeOutTaker, 3)} (stop)\nSlippage     = ${pct(S.inst.slip, 3)} per side in backtests\nSource: ${S.inst.feeSrc}` },
 { id: "s-regime", title: "Read the market state",
   what: () => S.T && S.T.regime ? `Volatility is ${S.T.regime.vol.replace("_vol", "")} and the market is ${S.T.regime.trend}. The session is ${S.T.regime.session}.` : "Waiting for candles.",
   why: () => `XVI DNA labels every candle by volatility and trend strength, because a strategy that works in a trend can bleed in a range. Trend and breakout strategies want "trending". Fade strategies want "ranging".`,
   math: () => S.T && S.T.regime ? `ATR(14) / price = ${pct(S.T.regime.atrPct, 4)}\nLow / high cut-offs (from the first 70% of history) = ${pct(S.T.regime.volLo, 4)} / ${pct(S.T.regime.volHi, 4)}\nADX(14) = ${fmt(S.T.regime.adx, 1)} → ${S.T.regime.trend} (25+ = trending)\nSessions (UTC): Asia 23–07, London 07–16, New York 12–21` : "" },
 { id: "s-brain", title: "What the brain says",
   what: () => { const T = S.T; if (!T || !T.strategies.length) return "The brain is still loading."; const sig = T.strategies.filter(s => s.side !== 0).length; return `Your six XVI DNA strategies were checked on the last closed candle. ${sig} fired. ${T.approved.length} passed all three gates. Tap a card to see its plan.`; },
   why: () => `A signal alone isn't enough. Each strategy must also prove itself on this market: beat 100 random strategies on data it never saw (G1), stay profitable when its settings are nudged (G2), and not depend on lucky trade order (G3). Fail one and it's refused. Most get refused, and that is the system working.`,
   math: () => { const st = curStrat(); if (!st) return ""; let s = `${st.nice} on ${S.T.n} closed ${TFG[S.tf][0]} candles\n`; if (st.bt) s += `Backtest: ${st.bt.trades} trades, ${fmt(st.bt.retPct, 2)}% return, ${fmt(st.bt.expR, 3)}R expectancy,\n          max drawdown ${fmt(st.bt.maxDDPct, 2)}%, profit factor ${st.bt.pf == null ? "n/a" : fmt(st.bt.pf, 2)}\n`;
     if (st.inRegime && st.inRegime.trend) s += `In ${S.T.regime.trend} markets: ${st.inRegime.trend.trades} trades, ${fmt(st.inRegime.trend.expR, 2)}R each\n`;
     if (st.gates) st.gates.outcomes.forEach(o => { s += `\n${GATE_NAME[o.gate]}: ${o.passed ? "PASS" : "FAIL"}  observed ${fmt(o.observed, 2)} vs ${o.gate === "trade_shuffle" ? "under" : "at least"} ${o.threshold}`; if (o.detail.reason) s += ` (${o.detail.reason.replace(/_/g, " ")})`; if (o.gate === "unseen_data" && o.detail.holdoutSharpe != null) s += `\n  holdout Sharpe ${fmt(o.detail.holdoutSharpe, 2)}, random median ${fmt(o.detail.nullMedian, 2)}, ${o.detail.nullN} random strategies`; if (o.gate === "parameter_nudge" && o.detail.variants != null && !o.detail.reason) s += `\n  ${o.detail.profitable} of ${o.detail.variants} nudged versions stayed profitable`; if (o.gate === "trade_shuffle" && o.detail.origDD != null) s += `\n  drawdown ${fmt(o.detail.origDD, 1)}R, shuffled 95th pct ${fmt(o.detail.ddP95, 1)}R`; });
     else s += "\nGates need 1,000 candles of history."; s += `\n\nRules: signal on candle close, entry at the next open, stop checked before target, fees on both sides.`; return s; } },
 { id: "s-fees", title: "The fee reality check",
   what: () => `A round trip here costs ${pct(S.inst.feeIn + S.inst.feeOut, 3)} with limit orders.`,
   why: () => `The move has to beat fees before it's profit. That's why the same strategy can pass on a cheap market and fail on an expensive one: the brain backtests with the real cost of this market.`,
   math: () => { const I = S.inst, l = lastPrice(); return `Round trip = ${pct(I.feeIn, 3)} + ${pct(I.feeOut, 3)} = ${pct(I.feeIn + I.feeOut, 3)}\nBreak-even move ≈ ${px(l * (I.feeIn + I.feeOut) / (1 - I.feeOut))}\nAverage candle (ATR) = ${S.T ? px(S.T.atr) : "—"}\nIf a stop hits, the exit is a market order at ${pct(I.feeOutTaker, 3)}`; } },
 { id: "s-plan", title: "The brain's plan",
   what: () => { const st = curStrat(); return st ? `${st.nice} sets the stop ${st.spec.risk.stop_atr_mult} ATRs from entry and the target ${st.spec.risk.target_atr_mult} ATRs away. You can edit the numbers to practice.` : ""; },
   why: () => `Using ATR ties the stop to how much this market really moves, so normal wiggles don't knock you out. There's also a time stop: if neither level is hit, the strategy exits anyway.`,
   math: () => { const st = curStrat(), p = S.P; if (!st || !p || !p.valid) return "Enter a valid plan."; const r = st.spec.risk; return `ATR(14) = ${px(S.T.atr)}\nStop   = entry ${S.side > 0 ? "−" : "+"} ${r.stop_atr_mult} × ATR = ${px(p.stop)}\nTarget = entry ${S.side > 0 ? "+" : "−"} ${r.target_atr_mult} × ATR = ${px(p.target)}\nTime stop = ${r.time_stop_bars} candles\nPer unit: loss ${px(p.netLoss / p.units)} if stopped, gain ${px(p.netWin / p.units)} at target (fees included)`; } },
 { id: "s-size", title: "Size by risk, the engine's way",
   what: () => { const p = S.P, st = curStrat(); return p && p.valid && st ? `Risking ${$("inRisk").value}% of your account means losing at most ${usd(p.riskUSD, 3)} on this trade. ${st.nice}'s own setting is ${st.spec.risk.risk_per_trade_pct}%.` : "Fix the plan first."; },
   why: () => S.inst.kind === "future" || S.inst.kind === "perp" ? `With contracts you can't buy a tiny piece. If one contract already risks more than your limit, the honest answer is that this market is too big for the account. Leverage also means a move against you can take the whole balance.` : `Small, fixed risk is what lets a strategy survive its losing streaks. The stop distance sets the size: wider stop, smaller position.`,
   math: () => { const p = S.P; if (!p || !p.valid) return ""; const lev = S.inst.kind === "future" || S.inst.kind === "perp"; return `Risk budget = ${usd(S.balance)} × ${$("inRisk").value}% = ${usd(p.riskUSD, 3)}\n` + (lev ? `Risk per contract = (stop distance + fees) × ${S.inst.contractSize} = ${usd(p.oneContractRisk, 3)}\nContracts = floor(budget ÷ risk per contract) = ${p.contracts}${p.forced ? " → minimum 1 shown" : ""}\nMargin = ${usd(p.notional)} × ${pct(p.marginRate, 1)} = ${usd(p.margin)}\nRough wipe-out move = balance ÷ units = ${px(p.liqMove)}` : `Units = budget ÷ (stop distance + fees per unit) = ${p.qty.toFixed(decOf(S.inst.baseInc))}\nPosition = ${usd(p.notional)}${p.capped ? " (capped at your balance, no leverage)" : ""}`) + `\nExposure cap from the engine: 5× the account`; } },
 { id: "s-verdict", title: "The final go / no-go",
   what: () => { const f = S.C.filter(x => x.s === "fail").length, w = S.C.filter(x => x.s === "warn").length; return `${S.C.length - f - w} pass, ${w} warning${w === 1 ? "" : "s"}, ${f} fail${f === 1 ? "" : "s"}.`; },
   why: () => `GO needs all of it: a live signal, all three gates passed, a plan that pays after fees, and a size your account can carry. One ✕ means no trade. The page refreshes itself every 5 seconds and re-runs the brain on each new candle, so you can leave it open and wait.`,
   math: () => `GO       = signal + gates passed + no ✕\nCAUTION  = no ✕, but at least one !\nNO TRADE = any ✕\nRe-checked on every new closed candle.` }
];
/* ---------- connection messages ---------- */
function connMsg(err) {
  const box = $("connMsg"); if (!err) { box.innerHTML = ""; return; }
  const code = err.code || "upstream_error", srv = err.server || (S.inst && S.inst.src === "wb" ? WB : "Coinbase"); let t;
  if (code === "needs_reauth") t = `${esc(srv)} needs reconnecting in claude.ai Settings → Connectors.`;
  else if (code === "server_not_connected" || code === "selection_required") t = `${esc(srv)} isn't connected for this page. Add it in claude.ai Settings → Connectors.`;
  else if (code === "approval_required" || code === "not_in_manifest" || code === "consent_required") t = `Live data from ${esc(srv)} needs your OK. <button class="btn" id="allowBtn" style="margin-left:6px;padding:6px 10px">Allow</button>`;
  else if (code === "server_unavailable") t = `${esc(srv)} is briefly unreachable. <button class="btn" id="allowBtn" style="margin-left:6px;padding:6px 10px">Retry</button>`;
  else if (code === "tool_error") t = `${esc(srv)} couldn't load this market: ${esc((err.message || "").slice(0, 140))}`;
  else t = `Couldn't load live data from ${esc(srv)}. <button class="btn" id="allowBtn" style="margin-left:6px;padding:6px 10px">Retry</button>`;
  box.innerHTML = `<div class="alert">${t}</div>`; const ab = $("allowBtn"); if (ab) ab.onclick = () => { box.innerHTML = ""; boot(); };
}

const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (typeof cloudSave === "function") cloudSave(); } };
const HELP = {};
const THEMES = { coach: { n: "XVI DNA (default)", bg: "#000", bg2: "#040507", up: "#16f0a4", dn: "#ff4d60", acc: "#7c9cff", txt: "#f2f5fa", mut: "#8f9aae" },
  tv: { n: "TradingView style", bg: "#131722", bg2: "#1e222d", up: "#26a69a", dn: "#ef5350", acc: "#2962ff", txt: "#d1d4dc", mut: "#787b86" },
  wb: { n: "Webull style", bg: "#0b0e14", bg2: "#141a24", up: "#02c076", dn: "#f6465d", acc: "#1e9bff", txt: "#eef2f7", mut: "#8a94a6" },
  nt: { n: "NinjaTrader style", bg: "#000", bg2: "#101010", up: "#32cd32", dn: "#ff2a2a", acc: "#f58220", txt: "#f0f0f0", mut: "#9a9a9a" },
  tos: { n: "thinkorswim style", bg: "#0a0a0a", bg2: "#1b1b1b", up: "#00b84a", dn: "#e02020", acc: "#f5b301", txt: "#e8e8e8", mut: "#8c8c8c" },
  mt: { n: "MetaTrader style", bg: "#000", bg2: "#0c0c0c", up: "#00e676", dn: "#ffffff", acc: "#4caf50", txt: "#e6e6e6", mut: "#8a8a8a" } };
let TH = THEMES.coach;
const COL_DEF = [["up", "Up candles"], ["dn", "Down candles"], ["e21", "EMA 21"], ["e55", "EMA 55"], ["e200", "EMA 200"], ["sma", "SMA 20"], ["bb", "Bollinger Bands"], ["vwap", "VWAP"], ["dcU", "Donchian top"], ["dcL", "Donchian bottom"]];
const COL0 = { e21: "#ffd166", e55: "#c77dff", e200: "#ff9f6e", sma: "#9aa7bd", bb: "#7c9cff", vwap: "#4dd0e1", dcU: "#5ff0bd", dcL: "#ff8a95" };
let MYCOL = (() => { try { return JSON.parse(localStorage.getItem("tc_col")) || {}; } catch (e) { return {}; } })();
const colOf = k => MYCOL[k] || (k === "up" ? TH.up : k === "dn" ? TH.dn : COL0[k]);
function applyTheme(k) { TH = THEMES[k] || THEMES.coach; try { const st = document.documentElement.style; st.setProperty("--bg", TH.bg); st.setProperty("--bg2", TH.bg2); st.setProperty("--up", colOf("up")); st.setProperty("--dn", colOf("dn")); st.setProperty("--acc", TH.acc); st.setProperty("--txt", TH.txt); st.setProperty("--mut", TH.mut); } catch (e) {} }
const SYNC_KEYS = ["tc_learn", "tc_notes", "tc_learned", "tc_prog", "tc_draw", "tc_ip", "tc_mode", "tc_stop", "tc_refresh", "tc_theme", "tc_lab", "tc_col", "tc_name"]; let cloudDoc = null, cloudT = null, cloudOK = false;
function cloudSave() { if (!cloudDoc) return; clearTimeout(cloudT); cloudT = setTimeout(async () => { const o = {}; SYNC_KEYS.forEach(k => { const v = store.get(k, undefined); if (v !== undefined) o[k] = v; }); try { await cloudDoc.set({ json: JSON.stringify(o), ts: Date.now() }); cloudOK = true; } catch (e) { cloudOK = false; } }, 2500); }
async function cloudLoad() { try { const has = window.claude && window.claude.use; if (!has) return; const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]); if (!db || !user) return; const id = await user.id(); if (!id) return;
    cloudDoc = db.collection("data/users/" + id).doc("coach"); const r = await cloudDoc.get(), d = r && (typeof r.data === "function" ? r.data() : (r.data || r)); cloudOK = true;
    if (d && d.json) { const o = JSON.parse(d.json); SYNC_KEYS.forEach(k => { if (o[k] !== undefined) { try { localStorage.setItem(k, JSON.stringify(o[k])); } catch (e) {} } });
      S.learn = Object.assign({ on: true, cap: 0.5 }, o.tc_learn || S.learn); S.notes = o.tc_notes || S.notes; S.learned = o.tc_learned || S.learned; S.prog = Object.assign(S.prog, o.tc_prog || {}); S.draws = o.tc_draw || S.draws; if (o.tc_ip) S.ip = Object.assign(S.ip, o.tc_ip); if (o.tc_mode) { S.mode = o.tc_mode; S.teachOn = S.mode === "teacher"; } if (o.tc_stop) S.stop = Object.assign(S.stop, o.tc_stop); if (o.tc_refresh) S.refreshSec = o.tc_refresh; if (o.tc_theme) { S.set.theme = o.tc_theme; applyTheme(o.tc_theme); } if (o.tc_lab) S.lab = o.tc_lab; if (o.tc_name) setAppName(o.tc_name); if (o.tc_col) { MYCOL = o.tc_col; applyTheme(S.set.theme); }
      S._lessonSig = ""; IND.key = ""; renderLessons(); renderAll(); } else cloudSave(); } catch (e) { cloudDoc = null; } }
/* ================= v4: Coinbase-style arrangement, order ticket, indicators, voice ================= */
Object.assign(S, { view: "spot", ctab: "price", ptab: "positions", type: "bracket", amtMode: "auto", amtUnit: "usd", zoom: 80, cx: null,
  ind: { ema: false, ema200: false, sma20: false, bb: false, vwap: false, dc: false, vol: true, rsi: false, macd: false, adx: false, atr: false },
  set: { style: "candles", scale: "auto", plan: true, auto: true }, pan: 0, tool: "cursor", magnet: false, stay: false, lock: false, hideDraw: false, accounts: [], orders: [], openOrders: [], fills: [], book: null, trades: null, tts: null, voice: false, tile: "crypto", lastSpot: null, lastDeriv: null });

/* ---------- futures list with real names ---------- */
const FUT_BASE = { BIT: "Bitcoin", BIP: "Bitcoin", ET: "Ethereum", ETP: "Ethereum", SOL: "Solana", SLP: "Solana", XRP: "XRP", XPP: "XRP", GOL: "Gold", SLR: "Silver", NOL: "Oil", NGS: "Natural Gas", CU: "Copper", PT: "Platinum", DOG: "Dogecoin", DOP: "Dogecoin", LC: "Litecoin", LCP: "Litecoin", BCH: "Bitcoin Cash", BCP: "Bitcoin Cash", AVA: "Avalanche", AVP: "Avalanche", LNK: "Chainlink", LNP: "Chainlink", DOT: "Polkadot", ADA: "Cardano", ADP: "Cardano", SUI: "Sui", SUP: "Sui", ZEC: "Zcash", HYF: "Hyperliquid", HYP: "Hyperliquid", BNF: "BNB", BNB: "BNB", NER: "Near Protocol", AIP: "AI", DEF: "Defense", PAU: "PAX Gold" };
const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function buildFutures(products) {
  return products.map(p => { const f = p.future_product_details || {}, root = p.product_id.split("-")[0], price = parseFloat(p.price || 0), cs = parseFloat(f.contract_size || 1);
    const exp = f.contract_expiry ? new Date(f.contract_expiry) : null, perpStyle = f.funding_rate != null && (!exp || exp - Date.now() > 400 * 864e5), base = FUT_BASE[root] || root;
    const mL = parseFloat((f.intraday_margin_rate || {}).long_margin_rate || 0.25), mS = parseFloat((f.intraday_margin_rate || {}).short_margin_rate || 0.25);
    return { key: "cbf:" + p.product_id, kind: "future", src: "cb", ptype: "FUTURE", label: base + (perpStyle ? " Perp" : " Futures" + (exp ? " " + MON[exp.getUTCMonth()].slice(0, 3) + " " + String(exp.getUTCFullYear()).slice(2) : "")), name: (perpStyle ? base + " Perpetual" : base + " Futures" + (exp ? " · " + MON[exp.getUTCMonth()] + " " + exp.getUTCFullYear() : "")) + " · " + p.product_id.replace("-CDE", ""),
      dataId: p.product_id, tradeId: p.product_id, price, chg: parseFloat(p.price_percentage_change_24h || 0) / 100, usdVol: parseFloat(p.volume_24h || 0) * price * cs,
      priceInc: p.price_increment || "0.01", baseInc: "1", contractSize: cs, minContracts: parseFloat(p.base_min_size || 1), canShort: true, marginLong: mL, marginShort: mS, lev: Math.max(1, Math.round(1 / mL)),
      funding: perpStyle ? parseFloat(f.funding_rate) : null, perpStyle, root,
      sessionOpen: !p.fcm_trading_session_details || p.fcm_trading_session_details.is_session_open !== false, group: FUT_CMD.has(root) ? "cmd" : "other" }; }).filter(m => m.price > 0);
}

/* ---------- account + activity ---------- */
async function loadAccount() {
  await Promise.all([
    call(CB, "coinbase_balance", {}).then(p => { S.accounts = ((p && p.accounts) || []).map(a => ({ cur: a.currency, qty: parseFloat((a.available_balance || {}).value || 0), hold: parseFloat((a.hold || {}).value || 0) })).filter(a => a.qty + a.hold > 0);
      S.balance = S.accounts.filter(a => a.cur === "USDC" || a.cur === "USD").reduce((s, a) => s + a.qty, 0); }),
    call(CB, "coinbase_fees", { product_type: "SPOT" }).then(p => { const f = p && p.fee_tier; if (f) { S.fees.spot = { m: +f.maker_fee_rate, t: +f.taker_fee_rate }; S.tier = f.pricing_tier; } }),
    call(CB, "coinbase_fees", { product_type: "FUTURE" }).then(p => { const f = p && p.fee_tier; if (f) S.fees.future = { m: +f.maker_fee_rate, t: +f.taker_fee_rate }; }).catch(() => {}),
    call(CB, "coinbase_portfolios_list", {}).then(p => { S.hasPerps = ((p && p.portfolios) || []).some(x => x.type === "INTX"); }).catch(() => {})
  ]);
}
let syncBusy = false;
async function syncOrders() { if (syncBusy || !S.mcp) return; syncBusy = true; const fk = f => f.entry_id || f.trade_id || (f.order_id + "|" + f.trade_time + "|" + f.size), before = new Set((S.fills || []).map(fk)), openB = (S.openOrders || []).map(o => o.order_id).sort().join();
  try { await loadActivity(); const fresh = (S.fills || []).filter(f => !before.has(fk(f))), openA = (S.openOrders || []).map(o => o.order_id).sort().join();
    if (before.size && fresh.length) { const f = fresh[0], base = String(f.product_id || "").split("-")[0]; toast(`Filled on Coinbase: ${f.side === "BUY" ? "bought" : "sold"} ${base} at ${px(+f.price)}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ""}.`); }
    if (fresh.length || openA !== openB) loadAccount().then(renderAll).catch(() => {}); } catch (e) {} syncBusy = false; }
async function loadActivity() {
  if (!S.mcp) return; const o = { cache: false };
  await Promise.all([
    call(CB, "coinbase_orders_list", { limit: 30 }, o).then(p => { S.orders = (p && p.orders) || []; const pn = S.pendingNote; if (pn && Date.now() - pn.at < 10 * 60000) { const m = S.orders.find(x => x.product_id === pn.pid && x.side === pn.side && Math.abs(Date.parse(x.created_time) - pn.at) < 3 * 60000 && !S.notes[x.order_id]); if (m) { S.notes[m.order_id] = pn.note; store.set("tc_notes", S.notes); S.pendingNote = null; } } }).catch(() => {}),
    call(CB, "coinbase_orders_list", { limit: 30, status: "OPEN" }, o).then(p => { S.openOrders = (p && p.orders) || []; }).catch(() => {}),
    call(CB, "coinbase_orders_fills", { limit: 100 }, o).then(p => { S.fills = (p && p.fills) || []; }).catch(() => {})
  ]);
  renderPanel(); renderTx(); renderLessons(); renderProgress();
}
async function loadLists() {
  const c = { cache: { staleTime: 120000, gcTime: 600000 } };
  await Promise.all([
    call(CB, "coinbase_products_list", { product_type: "SPOT", limit: 500 }, c).then(p => { S.lists.crypto = buildCrypto((p && p.products) || []); }).catch(() => {}),
    call(CB, "coinbase_products_list", { product_type: "FUTURE", limit: 250 }, c).then(p => { S.lists.futures = buildFutures((p && p.products) || []); }).catch(() => {}),
    call(CB, "coinbase_products_list", { product_type: "GLOBAL_PERP", limit: 500 }, c).then(p => { S.lists.perps = buildPerps((p && p.products) || []); }).catch(() => {})
  ]);
  renderTrade(); renderHeader(); renderPanel();
}
async function loadBookTrades() {
  const I = S.inst; if (!S.mcp || !I || I.src !== "cb") { S.book = S.trades = null; renderSub(); return; }
  try { if (S.ctab === "book" || S.ctab === "depth") { const p = await call(CB, "coinbase_products_book", { product_id: I.dataId, product_type: I.ptype, limit: S.ctab === "depth" ? 80 : 12 }, { cache: false }); S.book = p && p.pricebook; }
        if (S.ctab === "trades") { const p = await call(CB, "coinbase_products_ticker", { product_id: I.dataId, product_type: I.ptype, limit: 30 }, { cache: false }); S.trades = p && p.trades; } } catch (e) {}
  renderSub();
}
async function selectInst(inst) { if (S.spotK || S.spotSave) try { endSpot(); } catch (e) {}
  const id = ++S.loadId; stopWatches();
  S.inst = Object.assign({}, inst); applyFees(S.inst);
  if (S.inst.kind === "spot" || S.inst.kind === "stock") S.lastSpot = inst; else S.lastDeriv = inst;
  S.bars = []; S.bid = S.ask = null; S.T = null; S.sel = null; S.P = null; S.planEdited = false; S.thinkKey = ""; S.side = 1; S.amtMode = "auto"; S.book = S.trades = null; S.cx = null; S.pan = 0; S.tmp = null; S.fixY = null; $("previewOut").innerHTML = "";
  renderAll();
  try {
    const rows = await fetchHistory(S.inst, S.tf); if (id !== S.loadId) return;
    S.bars = rows; S.lastFetch = Date.now(); S.live = true; connMsg(null); setMode();
    if (!rows.length) { $("cbTxt").textContent = "No candle data came back for this market. Pick another market or timeframe."; drawChart(); return; }
    onData(); startWatches(S.inst, S.tf, id); if (S.ctab !== "price") loadBookTrades();
  } catch (e) { if (id !== S.loadId) return; connMsg(e); renderAll(); }
}

/* ---------- plan / ticket math ---------- */
const isLev = () => S.inst.kind === "future" || S.inst.kind === "perp";
const closeMode = () => S.side < 0 && !S.inst.canShort;
const holding = () => { const a = S.accounts.find(x => x.cur === S.inst.label); return a ? a.qty : 0; };
function computePlan() {
  const st = curStrat(), I = S.inst; if (!st || !S.T || !isF(S.T.atr)) return null;
  const mkt = S.type === "market", e = mkt ? (S.side > 0 ? (S.ask || lastPrice()) : (S.bid || lastPrice())) : parseFloat($("inEntry").value);
  if (closeMode()) { const have = holding(); let q = S.amtMode === "manual" ? parseFloat($("inAmt").value) || 0 : have; if (S.amtMode === "manual" && S.amtUnit === "usd") q = q / e;
    const fee = mkt ? I.feeOutTaker : I.feeOut; return { valid: e > 0 && q > 0, close: true, entry: e, qty: q, units: q, notional: q * e, fee: q * e * fee, proceeds: q * e * (1 - fee), have }; }
  let s = parseFloat($("inStop").value), t = parseFloat($("inTgt").value); const br = S.type === "bracket";
  if (!br) { const r = st.spec.risk; s = e - S.side * r.stop_atr_mult * S.T.atr; t = e + S.side * r.target_atr_mult * S.T.atr; }
  const valid = e > 0 && s > 0 && t > 0 && (S.side > 0 ? (s < e && t > e) : (s > e && t < e));
  if (!valid) return { valid: false, entry: e };
  const riskPct = riskPctNow(st);
  const fake = { spec: { risk: Object.assign({}, st.spec.risk, { stop_atr_mult: Math.abs(e - s) / S.T.atr, target_atr_mult: Math.abs(t - e) / S.T.atr }) } };
  const IF = mkt ? Object.assign({}, I, { feeIn: I.feeOutTaker }) : I;
  const p = COACH.plan(fake, S.side, e, S.T.atr, IF, { balance: S.balance, riskPct });
  p.valid = true; p.stop = s; p.target = t; p.noStops = !br; p.mkt = mkt; p.feeInRate = IF.feeIn;
  if (S.amtMode === "manual") { let v = parseFloat($("inAmt").value) || 0, u; const mult = I.contractSize || 1;
    if (isLev()) { const c = Math.max(0, Math.floor(v)); u = c * mult; p.qty = c; p.contracts = c; p.forced = false; p.tooSmall = false; p.margin = p.marginPer * c; p.affordable = p.margin <= S.balance; p.liqMove = u > 0 ? S.balance / u : null; p.liqPrice = p.liqMove != null ? e - S.side * p.liqMove : null; }
    else { u = S.amtUnit === "usd" ? v / e : v; const inc = parseFloat(I.baseInc) || 1e-8; u = Math.floor(u / inc + 1e-9) * inc; p.qty = u; p.capped = false; }
    const lpu = p.stopDist + e * IF.feeIn + s * I.feeOutTaker, wpu = p.tgtDist - e * IF.feeIn - t * I.feeOut;
    p.units = u; p.notional = u * e; p.netLoss = u * lpu; p.netWin = u * wpu; p.netRR = lpu > 0 ? wpu / lpu : 0; p.fees = { entry: u * e * IF.feeIn, stop: u * s * I.feeOutTaker, target: u * t * I.feeOut }; p.lossPctOfAcct = S.balance > 0 ? p.netLoss / S.balance : 0; p.manual = true; }
  return p;
}
function buildChecks(st, p) {
  const out = [], I = S.inst, T = S.T; if (!st || !T) return [{ s: "fail", t: "The brain has no data yet." }];
  if (p && p.close) { out.push(p.have > 0 ? { s: "pass", t: `You hold ${p.have.toFixed(decOf(I.baseInc))} ${I.label}.` } : { s: "fail", t: `You don't hold any ${I.label}, so there's nothing to sell. Spot can't go short.` });
    if (p.valid && p.qty > p.have + 1e-12) out.push({ s: "fail", t: "That's more than you hold." });
    if (p.valid) out.push({ s: "pass", t: `You'd receive about ${usd(p.proceeds)} after a ${usd(p.fee, 3)} fee.` }); return out; }
  if (st.side !== 0 && st.side === S.side) out.push({ s: "pass", t: `${st.nice} fired a ${st.side > 0 ? "long" : "short"} signal on the last closed candle.` });
  else if (st.side !== 0) out.push({ s: "fail", t: `${st.nice} signalled ${st.side > 0 ? "long" : "short"}, but this order is a ${S.side > 0 ? "buy" : "sell"}.` });
  else out.push({ s: "fail", t: `${st.nice} has no live signal right now. This is practice only.` });
  if (!T.gateReady) out.push({ s: "fail", t: `Only ${T.n} candles of history. The gates need 1,000, so nothing can be approved.` });
  else if (st.gatePass) out.push({ s: "pass", t: "Passed all three XVI DNA gates on this market's recent history." });
  else { const f = st.gates ? st.gates.outcomes.filter(o => !o.passed).map(o => GATE_NAME[o.gate]) : ["all gates"]; out.push({ s: "fail", t: `Refused by the gates: failed ${f.join(", ")}.` }); }
  if (!st.sessOk) out.push({ s: "fail", t: `${st.nice} only trades the ${st.sessions.join(" and ")} sessions. It's ${T.regime.session} now.` });
  if (!p || !p.valid) { out.push({ s: "fail", hard: 1, block: 1, t: S.side > 0 ? "For a buy, the stop loss goes below the limit price and the take profit above it." : "For a short, the stop loss goes above the limit price and the take profit below it." }); return out; }
  if (p.noStops) out.push({ s: "fail", hard: 1, t: `A ${S.type} order has no stop loss, so nothing caps your loss. Use Bracket.` });
  if (p.mkt) out.push({ s: "warn", t: `Market orders pay the higher ${pct(I.feeOutTaker, 2)} fee and fill at whatever price is there.` });
  else if ((S.side > 0 && S.ask && p.entry >= S.ask) || (S.side < 0 && S.bid && p.entry <= S.bid)) out.push({ s: "warn", t: `Your limit price crosses the ${S.side > 0 ? "ask" : "bid"}, so it fills right away at the higher market-order fee.` });
  if (!p.noStops && (p.stopDist > 15 * T.atr || p.stopDist / p.entry > 0.25)) out.push({ s: "fail", hard: 1, block: 1, t: `Your stop is ${pct(p.stopDist / p.entry, 1)} away from entry (${fmt(p.stopDist / T.atr, 0)} ATRs). That looks like a typo.` });
  else if (!p.noStops && p.stopDist > 6 * T.atr) out.push({ s: "warn", t: `Your stop is ${fmt(p.stopDist / T.atr, 0)} ATRs away, which is very wide.` });
  out.push(p.netWin <= 0 ? { s: "fail", t: `After fees, hitting the target still loses ${usd(-p.netWin, 3)}.` } : p.netRR >= 1.5 ? { s: "pass", t: `Reward:risk after fees is ${fmt(p.netRR, 2)}:1.` } : p.netRR >= 1 ? { s: "warn", t: `Reward:risk after fees is only ${fmt(p.netRR, 2)}:1.` } : { s: "fail", t: `Reward:risk after fees is ${fmt(p.netRR, 2)}:1. You risk more than you can make.` });
  const lim = riskPctNow(st) / 100;
  if (isLev()) {
    if (p.tooSmall) out.push({ s: "fail", hard: 1, t: `One contract risks ${usd(p.oneContractRisk)}, which is ${pct(p.oneContractRisk / S.balance, 1)} of your account. Your limit is ${pct(lim, 1)}.` });
    else if (p.qty < 1) out.push({ s: "fail", hard: 1, block: 1, t: "Enter at least 1 contract." });
    else out.push(p.lossPctOfAcct <= lim * 1.05 + 1e-9 ? { s: "pass", t: `${p.qty} contract${p.qty === 1 ? "" : "s"} keeps the loss at ${usd(p.netLoss)} (${pct(p.lossPctOfAcct, 2)} of the account).` } : { s: "fail", hard: 1, t: `Max loss is ${pct(p.lossPctOfAcct, 1)} of the account, over your ${pct(lim, 1)} limit.` });
    out.push(p.affordable ? { s: "pass", t: `Margin needed is ${usd(p.margin)}. You have ${usd(S.balance)}.` } : { s: "fail", hard: 1, block: 1, t: `Margin needed is ${usd(p.margin)}, but you have ${usd(S.balance)}.` });
    if (p.liqMove != null && p.liqMove < p.stopDist * 1.5) out.push({ s: "fail", hard: 1, t: `A move of about ${px(p.liqMove)} against you would wipe out the account, and that's close to your stop.` });
    if (I.kind === "perp" && !S.hasPerps) out.push({ s: "fail", hard: 1, block: 1, t: "Your Coinbase account has no international perps portfolio, so this market is practice only." });
    if (I.kind === "future" && I.sessionOpen === false) out.push({ s: "warn", t: "This futures session is closed right now." });
  } else {
    if (p.notional > S.balance + 1e-9) out.push({ s: "fail", hard: 1, block: 1, t: `This order costs ${usd(p.notional)} and you have ${usd(S.balance)}.` });
    out.push(p.lossPctOfAcct <= lim * 1.05 + 1e-9 ? { s: "pass", t: `Max loss is ${usd(p.netLoss, p.netLoss < 1 ? 3 : 2)} (${pct(p.lossPctOfAcct, 2)} of the account).` } : { s: "fail", hard: 1, t: `Max loss is ${usd(p.netLoss)} (${pct(p.lossPctOfAcct, 1)} of the account), over your ${pct(lim, 1)} limit.` });
    if (p.notional < (I.minQuote || 1)) out.push({ s: "fail", hard: 1, block: 1, t: `The order is ${usd(p.notional)}, under the ${usd(I.minQuote || 1)} minimum.` });
    if (/-USD$/.test(I.tradeId) && I.kind === "stock") out.push({ s: "warn", t: `${I.label} trades in USD on Coinbase and your cash is in USDC. You'd convert first.` });
  }
  if (I.kind === "stock") { const age = Date.now() / 1000 - (S.bars.length ? S.bars[S.bars.length - 1].t : 0); if (age > Math.max(3 * S.tf, 1800)) out.push({ s: "warn", t: "The stock market looks closed. These signals come from the last session." }); }
  return out;
}
function riskPctNow(st) { if (S.learn.on && S.balance > 0) return S.learn.cap / S.balance * 100; return Math.max(0, parseFloat($("inRisk").value) || st.spec.risk.risk_per_trade_pct); }
function verdictOf(C, st) { if (S.learn.on) { const hard = C.filter(x => x.hard).length, soft = C.filter(x => x.s === "fail" && !x.hard).length; if (!hard && soft) return ["v-wait", "LESSON TRADE", `The brain wouldn't take this. As a lesson, the most it can cost you is about ${usd(S.learn.cap)}.`]; }
  return verdictOf0(C, st); }
function verdictOf0(C, st) { const f = C.filter(x => x.s === "fail").length, w = C.filter(x => x.s === "warn").length;
  return f ? ["v-no", "NO TRADE", st && st.side === 0 ? "No signal. Waiting is the trade." : "A rule failed. Skipping a bad trade is a winning move."] : w ? ["v-wait", "CAUTION", "Signal and gates are good. Read the warnings first."] : ["v-go", "GO", "Signal fired, gates passed, risk fits."]; }

/* ---------- indicators ---------- */
const IP_DEF = { ema: [21, 55], ema200: [200], sma20: [20], bb: [20, 2], dc: [20], rsi: [14], macd: [12, 26, 9], adx: [14], atr: [14] }, IP_LBL = { ema: ["Fast", "Slow"], ema200: ["Length"], sma20: ["Length"], bb: ["Length", "Std dev"], dc: ["Length"], rsi: ["Length"], macd: ["Fast", "Slow", "Signal"], adx: ["Length"], atr: ["Length"] };
S.ip = Object.assign(JSON.parse(JSON.stringify(IP_DEF)), store.get("tc_ip", {})); S.ipOpen = null;
const indName = k => ({ ema: `EMA ${S.ip.ema[0]} / ${S.ip.ema[1]}`, ema200: `EMA ${S.ip.ema200[0]}`, sma20: `SMA ${S.ip.sma20[0]}`, bb: `Bollinger Bands (${S.ip.bb[0]}, ${S.ip.bb[1]})`, vwap: "VWAP", dc: `Donchian Channel (${S.ip.dc[0]})`, vol: "Volume", rsi: `RSI (${S.ip.rsi[0]})`, macd: `MACD (${S.ip.macd.join(", ")})`, adx: `ADX (${S.ip.adx[0]})`, atr: `ATR (${S.ip.atr[0]})` }[k]);
let IND = { key: "" };
function indicators() {
  const b = S.bars, key = S.inst.key + S.tf + b.length + (b.length ? b[b.length - 1].c : 0) + JSON.stringify(S.ip); if (IND.key === key) return IND;
  const c = b.map(x => x.c), h = b.map(x => x.h), l = b.map(x => x.l), n = b.length, o = { key };
  const q = S.ip, sm = (L) => c.map((_, i) => { if (i < L - 1) return NaN; let s = 0; for (let j = i - L + 1; j <= i; j++) s += c[j]; return s / L; });
  o.e21 = DNA.ema(c, q.ema[0]); o.e55 = DNA.ema(c, q.ema[1]); o.e200 = DNA.ema(c, q.ema200[0]); o.sma = sm(q.sma20[0]);
  { const L = q.bb[0], k = q.bb[1], m = sm(L); o.bbU = []; o.bbL = []; for (let i = 0; i < n; i++) { if (i < L - 1) { o.bbU.push(NaN); o.bbL.push(NaN); continue; } let s2 = 0; for (let j = i - L + 1; j <= i; j++) s2 += (c[j] - m[i]) ** 2; const sd = Math.sqrt(s2 / L); o.bbU.push(m[i] + k * sd); o.bbL.push(m[i] - k * sd); } }
  let pv = 0, vv = 0, day = null; o.vwap = b.map(x => { const d = Math.floor(x.t / 86400); if (d !== day) { day = d; pv = 0; vv = 0; } const v = x.v || 0; pv += (x.h + x.l + x.c) / 3 * v; vv += v; return vv > 0 ? pv / vv : NaN; });
  const dc = DNA.donchian(h, l, q.dc[0]); o.dcU = dc[0]; o.dcL = dc[1];
  o.rsi = DNA.rsi(c, q.rsi[0]); o.macd = DNA.macdHist(c, q.macd[0], q.macd[1], q.macd[2]); o.adx = DNA.adx(h, l, c, q.adx[0]); o.atr = DNA.atr(h, l, c, q.atr[0]);
  return IND = o;
}
const IND_DEF = [["ema", "EMA 21 / 55", "EMA Breakout's trigger", "over"], ["ema200", "EMA 200", "Range Breakout's trend filter", "over"], ["sma20", "SMA 20", "middle of the Bollinger Bands", "over"], ["bb", "Bollinger Bands (20, 2)", "Bollinger Fade", "over"], ["vwap", "VWAP", "average price paid today", "over"], ["dc", "Donchian Channel (20)", "the breakout strategies", "over"], ["vol", "Volume", "how much traded", "over"],
  ["rsi", "RSI (14)", "RSI Reversion uses RSI 2", "pane"], ["macd", "MACD histogram", "momentum", "pane"], ["adx", "ADX (14)", "trend strength; 25+ = trending", "pane"], ["atr", "ATR (14)", "sets every stop and target", "pane"]];


/* ---------- price-action reading: structure, FVG, liquidity, sweeps, order blocks, consolidation, gaps ---------- */
S.pat = { fvg: false, liq: false, sweep: false, struct: false, ob: false, cons: false, gap: false, dbl: false }; S.hl = null;
const PAT_DEF = [["fvg", "Fair value gaps (FVG)", "#7c9cff"], ["liq", "Liquidity pools", "#ffb547"], ["sweep", "Liquidity sweeps", "#ff5d6c"], ["struct", "Market structure (BOS)", "#9aa7bd"], ["ob", "Order blocks", "#c77dff"], ["cons", "Consolidation ranges", "#4dd0e1"], ["gap", "Price gaps", "#ffd166"], ["dbl", "Double tops / bottoms", "#5ff0bd"]];
const PAT_COL = Object.fromEntries(PAT_DEF.map(d => [d[0], d[2]]));
let PATC = { key: "" };
function patterns() {
  const b = S.bars, n = b.length, key = S.inst.key + S.tf + n + (n ? b[n - 1].t : 0); if (PATC.key === key) return PATC;
  const out = { key, items: [], swings: [] }; if (n < 60) return PATC = out;
  const A = DNA.atr(b.map(x => x.h), b.map(x => x.l), b.map(x => x.c), 14), s0 = Math.max(20, n - 320), k = 3, tm = i => new Date(b[i].t * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const add = o => { o.when = tm(o.i); out.items.push(o); };
  // swings (3-bar fractals)
  const SH = [], SL = [];
  for (let i = s0; i < n - k; i++) { let hi = true, lo = true; for (let j = i - k; j <= i + k; j++) { if (j === i) continue; if (b[j].h >= b[i].h) hi = false; if (b[j].l <= b[i].l) lo = false; } if (hi) SH.push({ i, p: b[i].h }); if (lo) SL.push({ i, p: b[i].l }); }
  out.SH = SH; out.SL = SL;
  // market structure: break of structure when a close clears the last confirmed swing
  { let lastH = null, lastL = null, hi = 0, li = 0, trend = 0;
    for (let i = s0; i < n; i++) { while (hi < SH.length && SH[hi].i + k < i) lastH = SH[hi++]; while (li < SL.length && SL[li].i + k < i) lastL = SL[li++];
      if (lastH && !lastH.broken && b[i].c > lastH.p) { lastH.broken = true; add({ k: "struct", dir: 1, i, from: lastH.i, p: lastH.p, change: trend < 0, title: (trend < 0 ? "Change of character up" : "Break of structure up") }); trend = 1; }
      if (lastL && !lastL.broken && b[i].c < lastL.p) { lastL.broken = true; add({ k: "struct", dir: -1, i, from: lastL.i, p: lastL.p, change: trend > 0, title: (trend > 0 ? "Change of character down" : "Break of structure down") }); trend = -1; } }
    out.trend = trend; }
  // fair value gaps (3-candle imbalance)
  for (let i = s0 + 1; i < n - 1; i++) { const a = A[i]; if (!isF(a)) continue;
    if (b[i + 1].l > b[i - 1].h && b[i + 1].l - b[i - 1].h >= 0.25 * a) { const lo = b[i - 1].h, hi = b[i + 1].l; let fill = null; for (let j = i + 2; j < n; j++) if (b[j].l <= lo) { fill = j; break; } let touched = false; for (let j = i + 2; j < n; j++) if (b[j].l <= hi) { touched = true; break; } add({ k: "fvg", dir: 1, i, lo, hi, fill, touched, title: "Bullish fair value gap" }); }
    if (b[i + 1].h < b[i - 1].l && b[i - 1].l - b[i + 1].h >= 0.25 * a) { const hi = b[i - 1].l, lo = b[i + 1].h; let fill = null; for (let j = i + 2; j < n; j++) if (b[j].h >= hi) { fill = j; break; } let touched = false; for (let j = i + 2; j < n; j++) if (b[j].h >= lo) { touched = true; break; } add({ k: "fvg", dir: -1, i, lo, hi, fill, touched, title: "Bearish fair value gap" }); } }
  // order blocks: last opposite candle before the move that left a gap
  out.items.filter(x => x.k === "fvg").forEach(g => { for (let j = g.i - 1; j >= Math.max(s0, g.i - 4); j--) { const opp = g.dir > 0 ? b[j].c < b[j].o : b[j].c > b[j].o; if (opp) { let mit = null; for (let q = g.i + 2; q < n; q++) if (g.dir > 0 ? b[q].l <= b[j].h : b[q].h >= b[j].l) { mit = q; break; } add({ k: "ob", dir: g.dir, i: j, lo: b[j].l, hi: b[j].h, fill: mit, title: (g.dir > 0 ? "Bullish" : "Bearish") + " order block" }); break; } } });
  // liquidity pools: swing highs/lows not yet taken; equal highs/lows are stronger
  const pools = (arr, dir) => { arr.forEach((s, x) => { let swept = null; for (let j = s.i + 1; j < n; j++) if (dir > 0 ? b[j].h > s.p : b[j].l < s.p) { swept = j; break; }
      let eq = 0; for (let y = 0; y < x; y++) if (Math.abs(arr[y].p - s.p) <= 0.15 * A[s.i] && s.i - arr[y].i >= 4) { let between = true; for (let j = arr[y].i + 1; j < s.i; j++) if (dir > 0 ? b[j].h > Math.max(arr[y].p, s.p) : b[j].l < Math.min(arr[y].p, s.p)) between = false; if (between) eq++; }
      s.eq = eq; s.swept = swept;
      if (swept == null) add({ k: "liq", dir, i: s.i, p: s.p, eq, title: (dir > 0 ? "Buy-side liquidity" : "Sell-side liquidity") + (eq ? " (equal " + (dir > 0 ? "highs" : "lows") + ")" : "") });
      else { const j = swept, back = dir > 0 ? b[j].c < s.p : b[j].c > s.p, back2 = j + 1 < n && (dir > 0 ? b[j + 1].c < s.p : b[j + 1].c > s.p); if ((back || back2) && j - s.i >= 4) add({ k: "sweep", dir: -dir, i: j, p: s.p, from: s.i, ext: dir > 0 ? b[j].h : b[j].l, title: (dir > 0 ? "Sweep of the highs" : "Sweep of the lows") }); }
      // double top / bottom
      if (eq) { const y = arr.slice(0, x).reverse().find(q => Math.abs(q.p - s.p) <= 0.15 * A[s.i] && s.i - q.i >= 5); if (y) { let ext = dir > 0 ? Infinity : -Infinity; for (let j = y.i; j <= s.i; j++) ext = dir > 0 ? Math.min(ext, b[j].l) : Math.max(ext, b[j].h); if (Math.abs(s.p - ext) >= 1.5 * A[s.i]) { let conf = null; for (let j = s.i + 1; j < n; j++) if (dir > 0 ? b[j].c < ext : b[j].c > ext) { conf = j; break; } add({ k: "dbl", dir: -dir, i: s.i, from: y.i, p: s.p, neck: ext, conf, title: dir > 0 ? "Double top" : "Double bottom" }); } } } }); };
  pools(SH, 1); pools(SL, -1);
  // consolidation: 12+ candles inside a range of about 2 ATRs
  { let i = n - 1; while (i > s0 + 12) { let hi = b[i].h, lo = b[i].l, j = i; const lim = 2.2 * (A[i] || 0); while (j - 1 >= s0 && Math.max(hi, b[j - 1].h) - Math.min(lo, b[j - 1].l) <= lim) { j--; hi = Math.max(hi, b[j].h); lo = Math.min(lo, b[j].l); } if (i - j + 1 >= 12 && lim > 0) { add({ k: "cons", dir: 0, i: j, end: i, lo, hi, live: i === n - 1, title: "Consolidation range" }); i = j - 1; } else i--; } }
  // price gaps between candles (mostly stocks between sessions)
  for (let i = s0 + 1; i < n; i++) { const g = b[i].o - b[i - 1].c, a = A[i - 1]; if (isF(a) && Math.abs(g) >= 0.6 * a && b[i].t - b[i - 1].t > S.tf * 1.5) { const lo = Math.min(b[i].o, b[i - 1].c), hi = Math.max(b[i].o, b[i - 1].c); let fill = null; for (let j = i; j < n; j++) if (g > 0 ? b[j].l <= lo : b[j].h >= hi) { fill = j; break; } add({ k: "gap", dir: g > 0 ? 1 : -1, i, lo, hi, fill, title: g > 0 ? "Gap up" : "Gap down" }); } }
  out.items.sort((x, y) => y.i - x.i); return PATC = out;
}
function patText(o) { // [what, how traders use it, caution]
  const d = o.dir > 0;
  switch (o.k) {
    case "fvg": return [`${o.title} between ${px(o.lo)} and ${px(o.hi)}, formed ${o.when}. Price moved so fast that the candle before and the candle after don't overlap, leaving a zone where almost nothing traded. ${o.fill != null ? "Price has since come back and filled it." : o.touched ? "Price has dipped into it but hasn't filled it." : "It hasn't been revisited yet."}`,
      `Traders treat an unfilled gap as a magnet and as ${d ? "support" : "resistance"}. A common plan is to wait for price to return into the gap, ${d ? "buy" : "sell"} there, and put the stop just ${d ? "below" : "above"} it. A gap that gets fully filled and passed through has lost its meaning.`];
    case "liq": return [`${o.title} at ${px(o.p)}, from the swing ${d ? "high" : "low"} on ${o.when}.${o.eq ? " Price turned at almost the same level more than once." : ""} Stop-loss orders pile up just ${d ? "above highs" : "below lows"} like this. Those resting orders are the liquidity.`,
      `Expect price to be drawn toward it, and don't put your own stop right on it. Many traders use it as a target: ${d ? "longs take profit just under it" : "shorts take profit just above it"}. Equal highs or lows hold more stops, so they attract price more.`];
    case "sweep": return [`${o.title} on ${o.when}. Price pushed past ${px(o.p)} to ${px(o.ext)}, triggered the stops sitting there, then closed back ${d ? "above" : "below"} the level.`,
      `A sweep that fails to hold is read as a trap: the stops got taken and price reversed. Traders look for a ${d ? "long" : "short"} after it, with the stop beyond the sweep's ${d ? "low" : "high"} at ${px(o.ext)}. If price closes beyond the level and stays there, it was a real breakout, not a sweep.`];
    case "struct": return [`${o.title} on ${o.when}. A candle closed ${d ? "above the last swing high" : "below the last swing low"} at ${px(o.p)}.${o.change ? " That flips the prior direction, which traders call a change of character." : ""}`,
      `Structure is the simplest trend read: higher highs and higher lows mean up, lower lows and lower highs mean down. Trade in the direction of the latest break, and look for entries on the pullback after it, not on the breakout candle.`];
    case "ob": return [`${o.title} between ${px(o.lo)} and ${px(o.hi)}, from ${o.when}. It's the last ${d ? "down" : "up"} candle before the sharp move ${d ? "up" : "down"}. ${o.fill != null ? "Price has already come back to it." : "Price hasn't come back to it yet."}`,
      `The idea is that large orders started the move here, so price may react when it returns. Traders ${d ? "buy" : "sell"} on the first return to the zone with a stop just beyond it. A zone that has already been revisited is weaker.`];
    case "cons": return [`${o.title} between ${px(o.lo)} and ${px(o.hi)}, ${o.end - o.i + 1} candles starting ${o.when}.${o.live ? " Price is still inside it." : ""} Buyers and sellers are balanced and price is going sideways.`,
      `Inside a range, breakout strategies get chopped up and fades work better: buy near the bottom, sell near the top. The breakout from a long range is often strong. Stops cluster above the top and below the bottom, so a false break is common before the real move.`];
    case "gap": return [`${o.title} on ${o.when}: the candle opened at a different price from the previous close, leaving empty space between ${px(o.lo)} and ${px(o.hi)}. ${o.fill != null ? "It has been filled." : "It hasn't been filled."}`,
      `Gaps happen when news hits while the market is closed. Some gaps fill within days and some start a trend. Traders watch the edge of the gap as ${d ? "support" : "resistance"}.`];
    case "dbl": return [`${o.title} at ${px(o.p)}: price turned at the same level twice, with a ${d ? "high" : "low"} of ${px(o.neck)} in between (the neckline). ${o.conf != null ? "A candle has closed beyond the neckline, which confirms the pattern." : "It isn't confirmed until a candle closes beyond the neckline."}`,
      `A confirmed ${o.dir < 0 ? "double top is bearish" : "double bottom is bullish"}. The usual target is the height of the pattern measured from the neckline. Until it confirms, the matching ${o.dir < 0 ? "highs are just buy-side" : "lows are just sell-side"} liquidity that price may run through.`];
  }
  return ["", ""];
}
const PAT_HELP = { fvg: ["Fair value gaps (FVG)", "A three-candle pattern where price moved so fast that the first and third candles don't overlap. The empty space between them is the gap.", "Price often returns to fill part of it. Traders use unfilled gaps as zones to enter in the direction of the original move."],
  liq: ["Liquidity", "Liquidity means resting orders. On a chart it shows up as swing highs and lows, because stop losses collect just beyond them.", "Buy-side liquidity sits above highs, sell-side below lows. Price tends to travel from one pool to the next. Use pools as targets and keep your own stop off them."],
  sweep: ["Liquidity sweeps", "A quick push through a high or low that triggers the stops there, followed by a close back inside.", "Also called a stop hunt or liquidity grab. It often marks a reversal, because the orders that were fuel for the move have been used up."],
  struct: ["Market structure", "The pattern of swing highs and lows. A close beyond the last swing is a break of structure. A break against the prior direction is a change of character.", "It's the basic trend read that the other concepts sit on top of."],
  ob: ["Order blocks and institutional levels", "The last opposite-colored candle before a sharp move. The theory is that banks and funds placed large orders there.", "Be honest about this one: nobody can see institutions' orders on a price chart. An order block is a guess based on where a strong move began. Treat it as a zone of interest, not a fact."],
  cons: ["Consolidation", "A stretch where price moves sideways in a tight range.", "Markets alternate between ranging and trending. Knowing which one you're in tells you whether to fade the edges or wait for the breakout."],
  gap: ["Price gaps", "Empty space between one candle's close and the next candle's open.", "Common in stocks overnight and rare in crypto, which trades all day. The edges of a gap often act as support or resistance."],
  dbl: ["Double tops and bottoms", "Price reaches the same level twice and fails both times.", "It only counts once price closes beyond the neckline between the two turns. Before that it's two matching highs or lows, which is also a liquidity pool."] };
function drawPatterns(g, geo, phase) { // phase 0 = zones under candles, 1 = lines/labels over them
  const P = patterns(), { X, y, off, N, W, padR, w } = geo, right = W - padR, vis = i => i - off, clampX = i => Math.max(0, X(Math.max(0, vis(i))) - w / 2);
  const show = P.items.filter(o => S.pat[o.k] || o === S.hl), rgba = (hex, a) => { const v = parseInt(hex.slice(1), 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; };
  let lblN = 0; const label = (txt, x, yy, col) => { if (lblN++ > 14) return; g.font = "700 9px JetBrains Mono"; g.fillStyle = col; g.fillText(txt, Math.min(Math.max(2, x), right - txt.length * 5.6), yy); };
  show.forEach(o => { const col = PAT_COL[o.k], hl = S.hl === o, endI = o.end != null ? o.end : o.fill != null ? o.fill : off + N - 1; if (endI < off) return;
    if (phase === 0 && (o.k === "fvg" || o.k === "ob" || o.k === "cons" || o.k === "gap")) { if ((o.k === "fvg" || o.k === "ob" || o.k === "gap") && o.fill != null && !hl) return; // keep the chart readable: only open zones
      const x0 = clampX(o.i), x1 = o.k === "cons" ? X(Math.min(N - 1, vis(o.end))) + w / 2 : right; g.fillStyle = rgba(col, hl ? .3 : .13); g.fillRect(x0, y(o.hi), x1 - x0, y(o.lo) - y(o.hi)); g.strokeStyle = rgba(col, hl ? 1 : .5); g.strokeRect(x0, y(o.hi), x1 - x0, y(o.lo) - y(o.hi)); label(o.k === "fvg" ? "FVG" : o.k === "ob" ? "OB" : o.k === "gap" ? "GAP" : "RANGE", x0 + 3, y(o.hi) + 10, col); }
    if (phase === 1 && o.k === "liq") { const x0 = clampX(o.i); g.strokeStyle = rgba(col, hl ? 1 : .75); g.lineWidth = o.eq ? 1.6 : 1; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x0, y(o.p)); g.lineTo(right, y(o.p)); g.stroke(); g.setLineDash([]); g.lineWidth = 1; label((o.dir > 0 ? "BSL" : "SSL") + (o.eq ? " =" : ""), right - 34, y(o.p) + (o.dir > 0 ? -3 : 10), col); }
    if (phase === 1 && o.k === "sweep" && vis(o.i) >= 0) { const xx = X(vis(o.i)), yy = y(o.ext); g.fillStyle = col; g.beginPath(); if (o.dir > 0) { g.moveTo(xx, yy + 4); g.lineTo(xx - 5, yy + 13); g.lineTo(xx + 5, yy + 13); } else { g.moveTo(xx, yy - 4); g.lineTo(xx - 5, yy - 13); g.lineTo(xx + 5, yy - 13); } g.fill(); label("SWEEP", xx - 14, o.dir > 0 ? yy + 23 : yy - 16, col); if (hl) { g.strokeStyle = col; g.beginPath(); g.moveTo(clampX(o.from), y(o.p)); g.lineTo(xx, y(o.p)); g.stroke(); } }
    if (phase === 1 && o.k === "struct" && vis(o.i) >= 0) { const x0 = clampX(o.from), x1 = X(vis(o.i)); g.strokeStyle = rgba(col, hl ? 1 : .7); g.beginPath(); g.moveTo(x0, y(o.p)); g.lineTo(x1, y(o.p)); g.stroke(); label(o.change ? "CHoCH" : "BOS", (x0 + x1) / 2 - 10, y(o.p) + (o.dir > 0 ? -3 : 10), col); }
    if (phase === 1 && o.k === "dbl" && vis(o.i) >= 0) { const x0 = clampX(o.from), x1 = X(vis(o.i)); g.strokeStyle = rgba(col, hl ? 1 : .8); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y(o.p)); g.lineTo(x1, y(o.p)); g.stroke(); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x0, y(o.neck)); g.lineTo(right, y(o.neck)); g.stroke(); g.setLineDash([]); g.lineWidth = 1; label(o.dir < 0 ? "DBL TOP" : "DBL BOTTOM", x0 + 2, y(o.p) + (o.dir < 0 ? -3 : 10), col); } });
}
function foundList() { const P = patterns(), off = S.bars.length - Math.min(S.zoom, S.bars.length); return P.items.filter(o => S.pat[o.k] && (o.end != null ? o.end : o.fill != null && o.k !== "struct" && o.k !== "sweep" ? o.fill : S.bars.length) >= off && (o.i >= off || o.fill == null)).slice(0, 14); }
function renderPatMenu() {
  const f = foundList(); S._found = f;
  $("patMenu").innerHTML = `<h4>Mark on the chart</h4>` + PAT_DEF.map(d => `<label><input type="checkbox" data-pt="${d[0]}" ${S.pat[d[0]] ? "checked" : ""}><i style="width:10px;height:10px;border-radius:3px;background:${d[2]}"></i>${d[1]} <span class="hq" data-h="${d[0]}">?</span></label>`).join("")
    + `<h4>Found on this chart (tap to learn)</h4>` + (f.length ? f.map((o, i) => `<div class="found ${S.hl === o ? "sel" : ""}" data-f="${i}"><i style="background:${PAT_COL[o.k]}"></i><div>${esc(o.title)}<small>${esc(o.when)}${o.p != null ? " · " + px(o.p) : o.lo != null ? " · " + px(o.lo) + " to " + px(o.hi) : ""}${o.fill != null && (o.k === "fvg" || o.k === "ob" || o.k === "gap") ? " · filled" : ""}</small></div></div>`).join("") : `<div class="note" style="padding:6px 4px">Nothing found in view for what's switched on. Zoom out or turn on more.</div>`)
    + `<h4>Pop-up lessons</h4><label><input type="checkbox" data-teach ${S.teachOn ? "checked" : ""}>Teach me one topic at a time from live examples<small>${TEACH.filter(x => S.learned[x[0]]).length} of ${TEACH.length} learned</small></label><div style="padding:6px 4px"><button class="btn" id="teachReset" style="padding:5px 10px;font-size:11.5px">Start the lessons over</button></div>`
    + `<div class="note" style="padding:8px 4px 2px">These are ways traders read a chart, found here by fixed rules. Your XVI DNA gates don't test them, so the coach's verdict doesn't use them.</div>`;
}
function showPattern(o) { S.hl = o; helpKey = "__pat"; const t = patText(o); HELP.__pat = [o.title, t[0], t[1]]; S.step = -1; document.body.classList.remove("touring"); drawChart(); renderPatMenu(); renderPop(); speak(o.title + ". " + t[0] + " " + t[1]); }
/* ---------- chart ---------- */
function drawChart() {
  const cv = $("chart"); if (S.ctab !== "price") return; const panes = IND_DEF.filter(d => d[3] === "pane" && S.ind[d[0]]).map(d => d[0]);
  const mainH = (typeof window.XVI_MAINH === "function" && window.XVI_MAINH()) || 280, pH = 64, Ht = mainH + panes.length * pH; cv.style.height = Ht + "px";
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth; if (!W) return;
  cv.width = W * dpr; cv.height = Ht * dpr; const g = cv.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, W, Ht);
  const all = S.bars; if (!all.length) { g.fillStyle = "#8a95a8"; g.font = "13px Inter"; g.fillText(S.mcp ? "Loading candles…" : "Live connection needed", 14, 24); $("ohlc").textContent = ""; return; }
  const N = Math.min(S.zoom, all.length); S.pan = Math.max(0, Math.min(S.pan || 0, all.length - N)); const off = all.length - N - S.pan, c = all.slice(off, off + N), K = indicators(), p = S.set.plan && S.P && S.P.valid && !S.P.close ? S.P : null, ys = [];
  c.forEach(x => { ys.push(x.h, x.l); }); if (p) ys.push(p.stop, p.target, p.entry);
  const addS = a => { for (let i = 0; i < N; i++) { const v = a[off + i]; if (isF(v)) ys.push(v); } };
  if (S.ind.bb) { addS(K.bbU); addS(K.bbL); } if (S.ind.dc) { addS(K.dcU); addS(K.dcL); }
  let hi = Math.max(...ys), lo = Math.min(...ys); const pad = (hi - lo) * .06 || 1; hi += pad; lo = Math.max(lo - pad, 1e-12); if (!S.set.auto && S.fixY) { hi = S.fixY[1]; lo = S.fixY[0]; } else S.fixY = [lo, hi];
  const log = S.set.scale === "log", f = v => log ? Math.log(v) : v, padR = 62, gapB = S.pan === 0 ? Math.max(4, Math.round(N * 0.12)) : 0, w = (W - padR) / (N + gapB), volH = S.ind.vol ? mainH * .16 : 0, top = 6, bot = mainH - 6 - volH;
  const y = v => bot - (f(v) - f(lo)) / (f(hi) - f(lo)) * (bot - top), dd = Math.max(2, Math.min(pd(), 6)), X = i => i * w + w / 2;
  g.font = "10px JetBrains Mono";
  for (let i = 0; i <= 4; i++) { const v = log ? Math.exp(f(lo) + (f(hi) - f(lo)) * i / 4) : lo + (hi - lo) * i / 4, yy = y(v); g.strokeStyle = "rgba(255,255,255,.06)"; g.beginPath(); g.moveTo(0, Math.round(yy) + .5); g.lineTo(W - padR, Math.round(yy) + .5); g.stroke(); g.fillStyle = "#9aa5b8"; g.fillText(S.set.scale === "pct" ? ((v / c[0].c - 1) * 100).toFixed(2) + "%" : fmt(v, v > 1000 ? 0 : dd), W - padR + 4, yy + 3); }
  const geo = { X, y, off, N, W, padR, w }; try { drawPatterns(g, geo, 0); } catch (e) {}
  if (S.ind.vol) { const mv = Math.max(...c.map(x => x.v || 0)) || 1; c.forEach((x, i) => { g.fillStyle = x.c >= x.o ? "#0c5a43" : "#6a1f2b"; const hh = Math.round((x.v || 0) / mv * volH), bw2 = Math.max(1, Math.floor(w * 0.72)); g.fillRect(Math.round(X(i) + .5 - bw2 / 2), mainH - 14 - hh, bw2, hh); }); }
  if (S.set.style === "line") { g.strokeStyle = "#7c9cff"; g.lineWidth = 1.8; g.beginPath(); c.forEach((x, i) => i ? g.lineTo(X(i), y(x.c)) : g.moveTo(X(i), y(x.c))); g.stroke(); g.lineWidth = 1; }
  else { const bw = Math.max(1, Math.floor(w * 0.72)); c.forEach((x, i) => { const up = x.c >= x.o, cx0 = Math.round(X(i)) + .5; g.strokeStyle = g.fillStyle = up ? colOf("up") : colOf("dn"); g.lineWidth = 1; g.beginPath(); g.moveTo(cx0, Math.round(y(x.h))); g.lineTo(cx0, Math.round(y(x.l))); g.stroke(); const t = Math.round(y(Math.max(x.o, x.c))), b = Math.round(y(Math.min(x.o, x.c))), bx0 = Math.round(cx0 - bw / 2); if (S.set.style === "hollow" && up) g.strokeRect(bx0 + .5, t + .5, bw - 1, Math.max(1, b - t)); else g.fillRect(bx0, t, bw, Math.max(1, b - t)); }); }
  const line = (arr, col, lw, yf) => { g.strokeStyle = col; g.lineWidth = lw || 1.4; g.beginPath(); let st = false; for (let i = 0; i < N; i++) { const v = arr[off + i]; if (!isF(v)) { continue; } st ? g.lineTo(X(i), (yf || y)(v)) : g.moveTo(X(i), (yf || y)(v)); st = true; } g.stroke(); g.lineWidth = 1; };
  if (S.ind.ema) { line(K.e21, colOf("e21")); line(K.e55, colOf("e55")); } if (S.ind.ema200) line(K.e200, colOf("e200")); if (S.ind.sma20) line(K.sma, colOf("sma"));
  if (S.ind.bb) { line(K.bbU, colOf("bb"), 1); line(K.bbL, colOf("bb"), 1); } if (S.ind.vwap) line(K.vwap, colOf("vwap")); if (S.ind.dc) { line(K.dcU, colOf("dcU"), 1); line(K.dcL, colOf("dcL"), 1); }
  try { drawPatterns(g, geo, 1); } catch (e) {}
  const tag = (v, col, lbl) => { g.strokeStyle = col; g.setLineDash(lbl === "LAST" ? [3, 3] : []); g.beginPath(); g.moveTo(0, y(v)); g.lineTo(W - padR, y(v)); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.fillRect(W - padR, y(v) - 8, padR, 16); g.fillStyle = "#06080c"; g.font = "700 9.5px JetBrains Mono"; g.fillText(lbl, W - padR + 3, y(v) + 3); };
  if (p) { tag(p.entry, "#7c9cff", "ENTRY"); if (!p.noStops) { tag(p.stop, "#ff8a95", "STOP"); tag(p.target, "#5ff0bd", "TARGET"); } }
  { const lb = all[all.length - 1], lc = lb.c; if (lc <= hi && lc >= lo) { const col = lc >= lb.o ? colOf("up") : colOf("dn"), yy = y(lc); g.strokeStyle = col; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(0, yy); g.lineTo(W - padR, yy); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.fillRect(W - padR, yy - 8, padR, 16); g.fillStyle = "#06080c"; g.font = "700 10px JetBrains Mono"; g.fillText(fmt(lc, lc > 1000 ? (dd > 2 ? 2 : dd) : dd), W - padR + 3, yy + 3.5); }
    g.fillStyle = "#6b768a"; g.font = "9.5px JetBrains Mono"; const stepL = Math.max(1, Math.round(N / 5)); for (let i = Math.floor(stepL / 2); i < N; i += stepL) { const d = new Date(c[i].t * 1000), s = S.tf >= 86400 ? d.toLocaleDateString([], { month: "short", day: "numeric" }) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }); g.fillText(s, X(i) - 14, mainH - 1); } }
  // sub-panes
  panes.forEach((k, pi) => { const y0 = mainH + pi * pH, arr = K[k], vis = []; for (let i = 0; i < N; i++) { const v = arr[off + i]; if (isF(v)) vis.push(v); }
    g.strokeStyle = "rgba(255,255,255,.08)"; g.beginPath(); g.moveTo(0, y0); g.lineTo(W, y0); g.stroke(); if (!vis.length) return;
    let a = Math.min(...vis), b2 = Math.max(...vis); if (k === "rsi" || k === "adx") { a = 0; b2 = 100; } if (k === "macd") { const m = Math.max(Math.abs(a), Math.abs(b2)) || 1; a = -m; b2 = m; } if (a === b2) b2 = a + 1;
    const yy = v => y0 + pH - 6 - (v - a) / (b2 - a) * (pH - 14);
    if (k === "macd") for (let i = 0; i < N; i++) { const v = arr[off + i]; if (!isF(v)) continue; g.fillStyle = v >= 0 ? "rgba(34,211,154,.7)" : "rgba(255,93,108,.7)"; g.fillRect(X(i) - w * .3, Math.min(yy(0), yy(v)), w * .6, Math.abs(yy(v) - yy(0)) || 1); }
    else line(arr, k === "rsi" ? "#ffd166" : k === "adx" ? "#4dd0e1" : "#c77dff", 1.3, yy);
    const guides = k === "rsi" ? [30, 70] : k === "adx" ? [25] : []; guides.forEach(v => { g.strokeStyle = "rgba(255,255,255,.15)"; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(0, yy(v)); g.lineTo(W - padR, yy(v)); g.stroke(); g.setLineDash([]); });
    const lastV = arr[all.length - 1]; g.fillStyle = "#8a95a8"; g.font = "10px JetBrains Mono"; g.fillText(indName(k) + "  " + (isF(lastV) ? fmt(lastV, k === "atr" || k === "macd" ? dd : 1) : "—"), 4, y0 + 11); });
  // crosshair + OHLC readout
  const ci = S.cx != null ? Math.max(0, Math.min(N - 1, S.cx)) : N - 1, bx = c[ci]; if (S.cy != null && S.cx != null && S.cy < mainH) { g.strokeStyle = 'rgba(255,255,255,.3)'; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(0, S.cy); g.lineTo(W - padR, S.cy); g.stroke(); g.setLineDash([]); g.fillStyle = '#2a3346'; g.fillRect(W - padR, S.cy - 8, padR, 16); g.fillStyle = '#e8edf5'; g.font = '10px JetBrains Mono'; g.fillText(fmt(S._geo ? S._geo.yInv(S.cy) : 0, dd), W - padR + 4, S.cy + 3); }
  if (S.cx != null) { g.strokeStyle = "rgba(255,255,255,.3)"; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X(ci), 0); g.lineTo(X(ci), Ht); g.stroke(); g.setLineDash([]); }
  const tm = new Date(bx.t * 1000); $("ohlc").innerHTML = `${tm.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · O ${fmt(bx.o, dd)} H ${fmt(bx.h, dd)} L ${fmt(bx.l, dd)} C <span class="${bx.c >= bx.o ? "up" : "dn"}">${fmt(bx.c, dd)}</span> · Vol ${fmt(bx.v || 0, 2)}`;
  if (S.selD >= 0 && curDraws()[S.selD]) setTimeout(renderSel, 0);
  S._geo = { w, N, padR, W, off, X, y, mainH, yInv: py => { const v = f(lo) + (bot - py) / (bot - top) * (f(hi) - f(lo)); return log ? Math.exp(v) : v; } };
  try { drawDrawings(g, S._geo); } catch (e) {}
}
function renderSub() {
  $("chartWrap").style.display = $("drawBar").style.display = S.ctab === "price" ? "" : "none"; $("navBar").style.display = S.ctab === "price" ? "flex" : "none"; $("depth").style.display = S.ctab === "depth" ? "block" : "none"; if (S.ctab === "depth") drawDepth();
  $("chart").style.display = S.ctab === "price" ? "block" : "none"; $("bookBox").style.display = S.ctab === "book" ? "block" : "none"; $("tradesBox").style.display = S.ctab === "trades" ? "block" : "none";
  const I = S.inst, na = `<div class="empty">${I && I.src !== "cb" ? "Coinbase doesn't share an order book for stocks here." : S.mcp ? "Loading…" : "Live connection needed"}</div>`, d = Math.max(2, Math.min(pd(), 8));
  if (S.ctab === "book") { const b = S.book; if (!b) { $("bookBox").innerHTML = na; return; } const asks = (b.asks || []).slice(0, 12).reverse(), bids = (b.bids || []).slice(0, 12); const row = (x, cls) => `<div class="${cls}">${fmt(+x.price, d)}</div><div>${(+x.size).toFixed(Math.min(6, decOf(I.baseInc)))}</div><div class="mut">${usd(+x.price * +x.size * (I.contractSize || 1), 0)}</div>`;
    const sp = b.asks && b.bids && b.asks[0] && b.bids[0] ? +b.asks[0].price - +b.bids[0].price : null;
    $("bookBox").innerHTML = `<div class="bk"><div class="hd">Price</div><div class="hd">Size</div><div class="hd">Value</div>${asks.map(x => row(x, "dn")).join("")}</div><div style="padding:6px 0;color:var(--mut)">Spread ${sp != null ? px(sp) : "—"} <span class="hq" data-h="spread">?</span></div><div class="bk">${bids.map(x => row(x, "up")).join("")}</div>`; }
  if (S.ctab === "trades") { const t = S.trades; if (!t) { $("tradesBox").innerHTML = na; return; } $("tradesBox").innerHTML = `<div class="bk"><div class="hd">Price</div><div class="hd">Size</div><div class="hd">Time</div>${t.map(x => `<div class="${x.side === "BUY" ? "up" : "dn"}">${fmt(+x.price, d)}</div><div>${(+x.size).toFixed(Math.min(6, decOf(I.baseInc)))}</div><div class="mut">${new Date(x.time).toLocaleTimeString()}</div>`).join("")}</div>`; }
}


/* ---------- trade advisor: pros, cons, stop and target advice on the user's own numbers ---------- */
let ADVC = { key: "", v: null };
function pastOutcomes(side, stopDist, tgtDist, maxBars) { // how often would these distances have hit target vs stop on this market's history
  const b = closedBars(), n = b.length; if (n < 200) return null;
  const key = [S.inst.key, S.tf, b[n - 1].t, side, stopDist.toPrecision(4), tgtDist.toPrecision(4), maxBars].join("|"); if (ADVC.key === key) return ADVC.v;
  let w = 0, l = 0, o = 0, tot = 0; const step = Math.max(1, Math.floor(n / 400));
  for (let i = 30; i < n - 2; i += step) { const e = b[i].c, st = e - side * stopDist, tg = e + side * tgtDist; let r = 0;
    for (let j = i + 1; j <= Math.min(n - 1, i + maxBars); j++) { if (side > 0 ? b[j].l <= st : b[j].h >= st) { r = -1; break; } if (side > 0 ? b[j].h >= tg : b[j].l <= tg) { r = 1; break; } }
    tot++; if (r > 0) w++; else if (r < 0) l++; else o++; }
  ADVC = { key, v: tot ? { w: w / tot, l: l / tot, o: o / tot, n: tot } : null }; return ADVC.v;
}
function advise() {
  const p = S.P, T = S.T, st = curStrat(), I = S.inst; if (!p || !p.valid || p.close || !T || !st) return null;
  const pros = [], cons = [], tips = [], side = S.side, e = p.entry, A = T.atr, b = closedBars(), look = b.slice(-40), dir = side > 0 ? "long" : "short";
  const swingLo = Math.min(...look.map(x => x.l)), swingHi = Math.max(...look.map(x => x.h)), sA = p.stopDist / A, tA = p.tgtDist / A, r = st.spec.risk;
  // brain
  if (st.side === side && st.gatePass) pros.push(`${st.nice} has a live ${dir} signal that passed all three gates.`); else if (st.side === side) cons.push(`${st.nice} fired, but the gates refused it. The edge didn't hold up on unseen data.`); else cons.push(`None of your strategies is signalling a ${dir} right now. This is your own call.`);
  // trend
  if (T.bias === side) pros.push(`You're trading with the short-term trend (EMA 21 is ${side > 0 ? "above" : "below"} EMA 55).`); else cons.push(`You're trading against the short-term trend (EMA 21 is ${T.bias > 0 ? "above" : "below"} EMA 55).`);
  // entry
  if (!p.mkt) { if ((side > 0 && S.ask && e >= S.ask) || (side < 0 && S.bid && e <= S.bid)) cons.push(`Your limit price fills immediately, so you pay ${pct(I.feeOutTaker, 2)} where a resting order pays ${pct(I.feeIn, 2)}.`); else pros.push(`Your limit order rests in the book and pays the lower ${pct(I.feeIn, 2)} fee.`); const gap = Math.abs(lastPrice() - e) / A; if (gap > 2) cons.push(`Your entry is ${fmt(gap, 1)} ATRs from the current price. It may never fill.`); }
  else cons.push(`A market order pays the higher ${pct(I.feeOutTaker, 2)} fee.`);
  if (!p.noStops) {
    // stop
    const sugStopRaw = side > 0 ? Math.min(e - r.stop_atr_mult * A, swingLo - 0.25 * A) : Math.max(e + r.stop_atr_mult * A, swingHi + 0.25 * A), sugStop = rp(side > 0 ? Math.max(sugStopRaw, e - 3.5 * A) : Math.min(sugStopRaw, e + 3.5 * A));
    const inside = side > 0 ? p.stop > swingLo : p.stop < swingHi;
    if (sA < 0.8) { cons.push(`Your stop is only ${fmt(sA, 1)} ATR away. One normal candle can hit it.`); tips.push({ t: `Stop loss looks too tight. An average candle moves ${px(A)} and your stop is ${px(p.stopDist)} away, so ordinary noise can stop you out before the trade has a chance. ${st.nice} uses ${r.stop_atr_mult} ATRs.`, f: "inStop", v: sugStop, l: "Set stop to " + px(sugStop) }); }
    else if (sA > 4) { cons.push(`Your stop is ${fmt(sA, 1)} ATRs away, which is very wide.`); tips.push({ t: `Stop loss looks too far. At ${fmt(sA, 1)} ATRs you give back a lot before admitting the trade is wrong, and your position has to be tiny to keep the risk small.`, f: "inStop", v: sugStop, l: "Set stop to " + px(sugStop) }); }
    else { pros.push(`Your stop is ${fmt(sA, 1)} ATRs away, a sensible distance for this market.`); if (inside && Math.abs(sugStop - p.stop) > 0.2 * A) tips.push({ t: `Your stop sits ${side > 0 ? "above the recent low" : "below the recent high"} (${px(side > 0 ? swingLo : swingHi)}). Price often revisits that level, which would stop you out right before a bounce. Just beyond it is safer.`, f: "inStop", v: sugStop, l: "Set stop to " + px(sugStop) }); }
    // target
    const lpu = p.stopDist + e * p.feeInRate + p.stop * I.feeOutTaker, sugT = rp(side > 0 ? (e + 2 * lpu + e * p.feeInRate) / (1 - I.feeOut) : (e - 2 * lpu - e * p.feeInRate) / (1 + I.feeOut));
    const beyond = side > 0 ? p.target > swingHi : p.target < swingLo, feeShare = p.tgtDist > 0 ? (e * p.feeInRate + p.target * I.feeOut) / p.tgtDist : 1;
    if (p.netWin <= 0) { cons.push("Your take profit is so close that fees are bigger than the gain."); tips.push({ t: `Take profit is too close. Fees take ${pct(Math.min(feeShare, 9.99), 0)} of the move, so you lose money even when you're right. For 2:1 after fees it needs to be at ${px(sugT)}.`, f: "inTgt", v: sugT, l: "Set target to " + px(sugT) }); }
    else if (feeShare > 0.35) { cons.push(`Fees eat ${pct(feeShare, 0)} of the profit at your target.`); tips.push({ t: `Take profit is close for this fee level. A target at ${px(sugT)} gives 2:1 after fees.`, f: "inTgt", v: sugT, l: "Set target to " + px(sugT) }); }
    else if (tA > 8) { cons.push(`Your take profit is ${fmt(tA, 1)} ATRs away, which is a long way.`); tips.push({ t: `Take profit looks too far. It needs about ${fmt(tA, 0)} average candles in a row going your way, and the time stop is ${r.time_stop_bars} candles. A nearer target gets hit more often.`, f: "inTgt", v: sugT, l: "Set target to " + px(sugT) }); }
    else pros.push(`Your take profit is ${fmt(tA, 1)} ATRs away and pays ${fmt(p.netRR, 1)}:1 after fees.`);
    if (beyond && p.netWin > 0) cons.push(`Your target is ${side > 0 ? "above the recent high" : "below the recent low"} (${px(side > 0 ? swingHi : swingLo)}), so price has to break new ground to reach it.`);
    if (p.netWin > 0 && p.netRR < 1) cons.push(`You're risking ${usd(p.netLoss, 3)} to make ${usd(p.netWin, 3)}.`);
  } else cons.push("There's no stop loss on this order type, so the loss isn't capped.");
  // price-action context
  try { const PT = patterns().items; if (!p.noStops) { const pool = PT.find(o => o.k === "liq" && o.dir === -side && Math.abs(o.p - p.stop) <= 0.3 * A); if (pool) cons.push(`Your stop sits right on ${side > 0 ? "sell-side" : "buy-side"} liquidity at ${px(pool.p)}. Stops cluster there and sweeps often tag that level.`);
      const tp = PT.filter(o => o.k === "liq" && o.dir === side && (side > 0 ? o.p > e && o.p < p.target : o.p < e && o.p > p.target)).sort((x, y) => Math.abs(x.p - e) - Math.abs(y.p - e))[0]; if (tp) cons.push(`Your target is past ${side > 0 ? "buy-side" : "sell-side"} liquidity at ${px(tp.p)}. Price often stalls or reverses at a pool like that.`); }
    const gz = PT.find(o => o.k === "fvg" && o.fill == null && o.dir === side && e >= o.lo && e <= o.hi); if (gz) pros.push(`Your entry is inside an unfilled ${side > 0 ? "bullish" : "bearish"} fair value gap (${px(gz.lo)} to ${px(gz.hi)}).`);
    const sw = PT.find(o => o.k === "sweep" && o.dir === side && o.i >= closedBars().length - 8); if (sw) pros.push(`Price just swept the ${side > 0 ? "lows" : "highs"} at ${px(sw.p)} and closed back, which favors a ${dir}.`); } catch (er) {}
  // size
  const lim = riskPctNow(st) / 100;
  if (!p.noStops) { if (p.lossPctOfAcct <= lim * 1.05) pros.push(`If you're wrong you lose ${usd(p.netLoss, 3)}, which is ${pct(p.lossPctOfAcct, 2)} of your account.`); else { cons.push(`If you're wrong you lose ${pct(p.lossPctOfAcct, 1)} of your account. Your limit is ${pct(lim, 1)}.`); tips.push({ t: `Position is too big for your risk limit. Coach size keeps a stop-out at ${pct(lim, 1)} of the account.`, a: "coach", l: "Use coach size" }); } }
  if (isLev() && !p.affordable) cons.push(`It needs ${usd(p.margin)} of margin and you have ${usd(S.balance)}.`);
  { const lost = lostToday(); if (dayLocked()) cons.push(`Daily stop reached: ${lost} losing trades today. New trades are locked until tomorrow.`); else if (S.stop.on && lost && lost === S.stop.n - 1) cons.push(`You've closed ${lost} losing trades today. One more and the daily stop locks the ticket.`); else if (!S.stop.on && lost >= 3) cons.push(`You've closed ${lost} losing trades today. A break usually teaches more than another try.`); }
  // history
  let odds = null; if (!p.noStops) { const h = pastOutcomes(side, p.stopDist, p.tgtDist, r.time_stop_bars); if (h) { const be = p.netWin > 0 ? p.netLoss / (p.netLoss + p.netWin) : 1; odds = Object.assign({ be }, h); const decided = h.w + h.l, wr = decided > 0 ? h.w / decided : 0; if (p.netWin > 0 && wr >= be + 0.05) pros.push(`On recent history these distances hit the target ${pct(wr, 0)} of the time when one was hit. You need ${pct(be, 0)} to break even.`); else if (p.netWin > 0) cons.push(`On recent history these distances hit the target only ${pct(wr, 0)} of the time when one was hit. You need ${pct(be, 0)} to break even.`); } }
  return { pros, cons, tips, odds };
}
function renderAdvisor() {
  const box = $("tkAdv"), a = S.ADV = advise(); if (!a) { box.innerHTML = ""; return; }
  if (S.mode === "trial" && !S.advOpen) { box.innerHTML = `<div class="adv" style="text-align:center"><button class="btn" data-advopen="1" style="padding:6px 12px;font-size:12px">Show the advisor's view</button><div class="note">Trial and error mode: the advice stays closed until you ask for it.</div></div>`; return; }
  const li = (x, c) => x.map(t => `<li>${esc(t)}</li>`).join("") || `<li class="mut">None found.</li>`;
  let odds = ""; if (a.odds) { const o = a.odds; odds = `<h5 class="mut">How these distances played out before <span class="hq" data-h="odds">?</span></h5><div class="odds"><div style="width:${o.w * 100}%;background:var(--up)"></div><div style="width:${o.o * 100}%;background:#59647a"></div><div style="width:${o.l * 100}%;background:var(--dn)"></div></div><div class="note" style="margin:0">Target first ${pct(o.w, 0)} · neither in time ${pct(o.o, 0)} · stop first ${pct(o.l, 0)} · from ${o.n} past entry points on this chart. History, not a forecast.</div>`; }
  box.innerHTML = `<div class="adv"><h4>Trade advisor <button class="btn" id="advRead" style="padding:4px 9px;font-size:11px;${S.tts ? "" : "display:none"}">🔊 Read it</button></h4><h5 class="up">Pros (${a.pros.length})</h5><ul>${li(a.pros)}</ul><h5 class="dn">Cons (${a.cons.length})</h5><ul>${li(a.cons)}</ul>${odds}${a.tips.map((t, i) => `<div class="tip">${esc(t.t)}<br><button class="btn" data-tip="${i}">${esc(t.l)}</button></div>`).join("")}</div>`;
}

/* ---------- learning mode: lesson trades, tuition cap, reviews at your own pace ---------- */
S.learn = Object.assign({ on: true, cap: 0.5 }, store.get("tc_learn", {})); S.notes = store.get("tc_notes", {}); S.lessons = [];
function buildLessons() { // pair fills into closed round trips (signed FIFO per product)
  const by = {}; S.fills.slice().sort((a, b) => Date.parse(a.trade_time) - Date.parse(b.trade_time)).forEach(f => { (by[f.product_id] = by[f.product_id] || []).push(f); });
  const out = [];
  for (const [pid, fs] of Object.entries(by)) { let lots = [];
    for (const f of fs) { const pr = +f.price; let q = f.size_in_quote ? +f.size / pr : +f.size; const sgn = f.side === "BUY" ? 1 : -1, fee = +f.commission || 0, q0 = q; let L = null;
      while (q > 1e-12 && lots.length && lots[0].sgn === -sgn) { const lot = lots[0], m = Math.min(q, lot.q), ef = lot.fee * m / lot.q0, xf = fee * m / q0;
        L = L || { pid, side: lot.sgn, qty: 0, cost: 0, proc: 0, fees: 0, t0: lot.t, t1: Date.parse(f.trade_time), entryOrder: lot.order, taker: lot.taker || f.liquidity_indicator === "TAKER", exitTaker: f.liquidity_indicator === "TAKER" };
        L.qty += m; L.cost += m * lot.p; L.proc += m * pr; L.fees += ef + xf; lot.q -= m; q -= m; if (lot.q <= 1e-12) lots.shift(); }
      if (L) { L.entry = L.cost / L.qty; L.exit = L.proc / L.qty; L.gross = L.side * (L.proc - L.cost); L.net = L.gross - L.fees; L.id = pid + "|" + L.t1; L.note = S.notes[L.entryOrder] || null; out.push(L); }
      if (q > 1e-12 && (sgn > 0 || /-CDE$|PERP/.test(pid))) lots.push({ sgn, q, q0, p: pr, fee, t: Date.parse(f.trade_time), order: f.order_id, taker: f.liquidity_indicator === "TAKER" }); } }
  out.sort((a, b) => b.t1 - a.t1); S.lessons = out.slice(0, 20);
}
function lessonFacts(L) { const n = L.note, d = L.side > 0, fx = []; let reason = "You closed it yourself."; const tol = L.entry * 0.0015;
  if (n) { if (Math.abs(L.exit - n.stop) <= Math.max(tol, Math.abs(n.entry - n.stop) * 0.15)) reason = "Your stop loss was hit."; else if (Math.abs(L.exit - n.target) <= Math.max(tol, Math.abs(n.target - n.entry) * 0.1)) reason = "Your take profit was hit."; }
  const R = n && n.risk > 0 ? L.net / n.risk : null; return { reason, R, feeShare: Math.abs(L.gross) > 0 ? L.fees / Math.abs(L.gross) : null }; }
function renderLessons() {
  const sig = S.fills.length + "|" + (S.fills[0] ? S.fills[0].trade_id || S.fills[0].trade_time : "") + "|" + Object.keys(S.notes).length + "|" + !!S.tts; if (sig === S._lessonSig && S.lessons.length) return; S._lessonSig = sig;
  buildLessons(); const Ls = S.lessons, wins = Ls.filter(l => l.net > 0), fees = Ls.reduce((s, l) => s + l.fees, 0), net = Ls.reduce((s, l) => s + l.net, 0), tuition = -Ls.filter(l => l.net < 0).reduce((s, l) => s + l.net, 0);
  const tags = {}; Ls.forEach(l => { if (l.taker) tags["Paid the higher market-order fee"] = (tags["Paid the higher market-order fee"] || 0) + 1; if (Math.abs(l.gross) > 0 && l.gross > 0 && l.net <= 0) tags["Right about direction, but fees ate the gain"] = (tags["Right about direction, but fees ate the gain"] || 0) + 1; if (l.t1 - l.t0 < 5 * 60000) tags["Closed within 5 minutes"] = (tags["Closed within 5 minutes"] || 0) + 1; ((l.note && l.note.cons) || []).forEach(c => { const k = /stop is only|too tight/.test(c) ? "Stop too tight" : /against the short-term trend/.test(c) ? "Traded against the trend" : /fees are bigger|Fees eat/.test(c) ? "Target too close for the fees" : /liquidity/.test(c) ? "Stop or target on a liquidity pool" : null; if (k) tags[k] = (tags[k] || 0) + 1; }); });
  const top = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 3);
  $("score").innerHTML = Ls.length ? `<div class="grid"><div class="stat"><div class="k">Lessons</div><div class="v">${Ls.length}</div></div><div class="stat"><div class="k">Won</div><div class="v">${wins.length} of ${Ls.length}</div></div><div class="stat"><div class="k">Net result</div><div class="v ${net >= 0 ? "up" : "dn"}">${net >= 0 ? "+" : "−"}${usd(Math.abs(net))}</div></div></div><div class="grid" style="margin-top:8px"><div class="stat"><div class="k">Tuition spent</div><div class="v amb">${usd(tuition)}</div></div><div class="stat"><div class="k">Fees paid</div><div class="v amb">${usd(fees)}</div></div><div class="stat"><div class="k">Avg per lesson</div><div class="v">${usd(net / Ls.length, 3)}</div></div></div>${top.length ? `<div class="note"><b>Most repeated:</b> ${top.map(x => esc(x[0]) + " (" + x[1] + "×)").join(" · ")}</div>` : ""}` : `<div class="empty">No closed trades yet. Your first lesson shows up here after you close a trade.</div>`;
  $("lessonList").innerHTML = Ls.map((L, i) => { const F = lessonFacts(L), base = L.pid.split("-")[0], dp = L.entry < 1 ? 6 : 2, n = L.note, held = (L.t1 - L.t0) / 60000;
    return `<details class="lesson" data-li="${i}"><summary><div><b>${L.side > 0 ? "Long" : "Short"} ${esc(base)}</b><small>${new Date(L.t1).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · held ${held < 90 ? fmt(held, 0) + " min" : fmt(held / 60, 1) + " h"}</small></div><div class="r mono ${L.net >= 0 ? "up" : "dn"}" style="text-align:right">${L.net >= 0 ? "+" : "−"}${usd(Math.abs(L.net), 3)}<small>${F.R != null ? (F.R >= 0 ? "+" : "") + fmt(F.R, 2) + "R" : ""}</small></div></summary><div class="in">
      <details class="stp" data-step="chart"><summary>1 · What happened on the chart</summary><p>You ${L.side > 0 ? "bought" : "sold short"} at ${usd(L.entry, dp)} and got out at ${usd(L.exit, dp)}, a move of ${pct(L.side * (L.exit / L.entry - 1))} ${L.gross >= 0 ? "in your favor" : "against you"}. ${esc(F.reason)}</p><div class="lc" data-lc="${i}"><div class="note">Open this step to load the chart for this trade.</div></div></details>
      <details class="stp"><summary>2 · What the advisor said before you placed it</summary>${n ? `<p>Coach verdict at the time: <b>${esc(n.verdict)}</b>${n.strat ? " · " + esc(n.strat) : ""}.</p><p class="up" style="font-weight:700">Pros</p><ul>${(n.pros || []).map(x => `<li>${esc(x)}</li>`).join("") || "<li>None</li>"}</ul><p class="dn" style="font-weight:700">Cons</p><ul>${(n.cons || []).map(x => `<li>${esc(x)}</li>`).join("") || "<li>None</li>"}</ul><p>${L.net < 0 && (n.cons || []).length ? "Read the cons again with the result in mind. Which one showed up in what happened?" : L.net >= 0 && (n.cons || []).length ? "It worked this time. The cons were still real, so ask whether you'd take the same trade ten times." : ""}</p>` : `<p>This trade wasn't placed from the coach's ticket on this device, so there's no saved advice for it. Place the next one from the ticket and the pros and cons get saved with it.</p>`}</details>
      <details class="stp"><summary>3 · Fees and math</summary><div class="kv"><span>Size</span><span>${L.qty.toFixed(L.qty < 1 ? 6 : 2)} ${esc(base)} (${usd(L.cost)})</span><span>Price move</span><span class="${L.gross >= 0 ? "up" : "dn"}">${L.gross >= 0 ? "+" : "−"}${usd(Math.abs(L.gross), 3)}</span><span>Fees (in + out)</span><span class="amb">−${usd(L.fees, 3)}</span><span>Net result</span><span class="${L.net >= 0 ? "up" : "dn"}">${L.net >= 0 ? "+" : "−"}${usd(Math.abs(L.net), 3)}</span>${n ? `<span>Planned risk (1R)</span><span>${usd(n.risk, 3)}</span><span>Result in R</span><span>${F.R != null ? (F.R >= 0 ? "+" : "") + fmt(F.R, 2) + "R" : "—"}</span>` : ""}</div><p>${F.feeShare != null && F.feeShare >= 1 ? "Fees were bigger than the whole price move." : F.feeShare != null ? "Fees took " + pct(F.feeShare, 0) + " of the price move." : ""} ${L.taker ? "At least one side filled as a market order at the higher fee. Resting limit orders would have cost less." : "Both sides paid the lower limit-order fee."}</p></details>
      <div class="btns"><button class="btn" data-read="${i}" style="padding:5px 10px;font-size:11.5px;${S.tts ? "" : "display:none"}">🔊 Read this lesson</button></div></div></details>`; }).join("");
}
async function loadLessonChart(i, box) { const L = S.lessons[i]; if (!L || box.dataset.done) return; box.dataset.done = "1";
  const ptype = /-CDE$/.test(L.pid) ? "FUTURE" : "SPOT", span = L.t1 - L.t0, tf = span > 60 * 3600e3 ? 3600 : span > 12 * 3600e3 ? 900 : 300, g = { 300: "5m", 900: "15m", 3600: "1h" }[tf];
  const isCrypto = ptype === "FUTURE" || S.lists.crypto.some(m => m.tradeId === L.pid || m.dataId === L.pid) || !S.lists.crypto.length && /-USDC$/.test(L.pid);
  if (!S.mcp) { box.innerHTML = `<div class="note">Live connection needed to load this chart.</div>`; return; }
  box.innerHTML = `<div class="note">Loading the chart…</div>`;
  try { let rows;
    if (isCrypto) rows = parseCB(await call(CB, "coinbase_products_candles", { product_id: L.pid, product_type: ptype, granularity: g, start: iso(Math.floor(L.t0 / 1000) - 25 * tf), end: iso(Math.floor(L.t1 / 1000) + 12 * tf), limit: 340 }, { cache: false }));
    else { const sym = L.pid.split("-")[0], inp = cat => ({ symbol: sym, category: cat, timespan: TFG[tf][1], real_time_required: "false", count: "300", start_time: L.t0 - 25 * tf * 1000, end_time: L.t1 + 12 * tf * 1000 }); rows = []; try { rows = parseWB(await call(WB, "get_stock_bars_single", inp("US_STOCK"), { cache: false })); } catch (e) {} if (!rows.length) rows = parseWB(await call(WB, "get_stock_bars_single", inp("US_ETF"), { cache: false })); }
    rows.sort((a, b) => a.t - b.t);
    if (rows.length < 3) throw 0; const during = rows.filter(r => r.t + tf >= L.t0 / 1000 && r.t <= L.t1 / 1000), hi = Math.max(...during.map(r => r.h), L.entry, L.exit), lo = Math.min(...during.map(r => r.l), L.entry, L.exit), mfe = L.side > 0 ? hi - L.entry : L.entry - lo, mae = L.side > 0 ? L.entry - lo : hi - L.entry, dp = L.entry < 1 ? 6 : 2;
    box.innerHTML = `<canvas></canvas><p>While you were in, price went as far as ${usd(mfe, dp)} in your favor and ${usd(mae, dp)} against you.${L.note ? ` Your plan was a stop at ${usd(L.note.stop, dp)} and a target at ${usd(L.note.target, dp)}.` : ""} ${mfe > 2 * Math.abs(L.exit - L.entry) && L.net <= 0 ? "The trade was in profit before it turned. Worth asking whether the target was too far or the exit plan unclear." : mae < Math.abs(L.exit - L.entry) * 0.3 && L.net > 0 ? "It barely went against you, which means the entry was well timed." : ""}</p><div class="legend"><span><i style="background:var(--acc)"></i>Entry</span><span><i style="background:#fff"></i>Exit</span>${L.note ? '<span><i style="background:#ff8a95"></i>Planned stop</span><span><i style="background:#5ff0bd"></i>Planned target</span>' : ""}</div>`;
    const cv = box.querySelector("canvas"); if (!cv || !cv.getContext) return; const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 320, H = 150; cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext("2d"); c.scale(dpr, dpr);
    const ys = []; rows.forEach(r => ys.push(r.h, r.l)); if (L.note) ys.push(L.note.stop, L.note.target); let mx = Math.max(...ys), mn = Math.min(...ys); const pad = (mx - mn) * .06 || 1; mx += pad; mn -= pad; const w = W / rows.length, y = v => H - 4 - (v - mn) / (mx - mn) * (H - 8), X = t => (rows.findIndex(r => r.t + tf > t / 1000) + .5) * w;
    rows.forEach((r, k) => { const up = r.c >= r.o; c.strokeStyle = c.fillStyle = up ? "#22d39a" : "#ff5d6c"; const x = k * w + w / 2; c.beginPath(); c.moveTo(x, y(r.h)); c.lineTo(x, y(r.l)); c.stroke(); c.fillRect(x - w * .3, y(Math.max(r.o, r.c)), w * .6, Math.max(1, Math.abs(y(r.o) - y(r.c)))); });
    const hl = (v, col) => { c.strokeStyle = col; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(0, y(v)); c.lineTo(W, y(v)); c.stroke(); c.setLineDash([]); }; if (L.note) { hl(L.note.stop, "#ff8a95"); hl(L.note.target, "#5ff0bd"); }
    const dot = (t, v, col) => { c.fillStyle = col; c.beginPath(); c.arc(X(t), y(v), 4.5, 0, 6.3); c.fill(); c.strokeStyle = "#06080c"; c.stroke(); }; dot(L.t0, L.entry, "#7c9cff"); dot(L.t1, L.exit, "#ffffff");
  } catch (e) { box.innerHTML = `<div class="note">Couldn't load the chart for this trade.</div>`; }
}
S.mode = store.get("tc_mode", "teacher"); S.teachOn = S.mode === "teacher";
const MODES = [["teacher", "Teacher-led", "Lessons pop up in order when the live chart shows a good example. The advisor is always open."], ["self", "My pace", "Nothing pops up. You tap Next lesson when you want one. The advisor is always open."], ["trial", "Trial and error", "No lessons and the advisor stays closed unless you open it. You trade, then learn from the review. Safety checks still apply."]];
HELP.modes = ["Teaching modes", "Three ways to learn: led by the teacher, at your own pace, or by trying things and reviewing what happened.", "You can switch any time. Whatever the mode, a trade still needs a stop loss and has to fit your account."];
function setMode2(m) { S.mode = m; S.teachOn = m === "teacher"; store.set("tc_mode", m); store.set("tc_teach_on", S.teachOn); S.advOpen = false; if (m !== "teacher" && S.teach) endTeach(); renderAll(); if (m === "teacher") maybeTeach(); }
function nextLesson() { const tp = nextTopic(); if (!tp) { toast("You've learned all " + TEACH.length + " topics."); return; } showView(isLev() ? "deriv" : "spot"); S.ctab = "price"; const was = S.teachOn; S.teachOn = true; const o = goodExample(tp[0]); if (o) delete S.seenEx[S.inst.key + tp[0] + o.i + (o.p || o.lo)]; maybeTeach(); S.teachOn = was; if (!S.teach) toast(`No clear live example of ${tp[1].toLowerCase()} on this chart right now. Try another market or timeframe.`); }
S.stop = Object.assign({ on: true, n: 3 }, store.get("tc_stop", {}));
HELP.dailystop = ["Daily stop", "After this many losing trades in one day, the ticket stops placing new trades until tomorrow. You can still sell what you hold and cancel orders.", "Losing streaks push people to trade bigger and faster to win it back. A hard stop takes that decision out of the heat of the moment. It only locks this page. Coinbase itself stays open, so the discipline is still yours."];
function lostToday() { const day = new Date().toDateString(); return S.lessons.filter(l => new Date(l.t1).toDateString() === day && l.net < 0).length; }
function dayLocked() { return S.stop.on && lostToday() >= S.stop.n; }
function renderLearn() { $("learnTog").textContent = S.learn.on ? "On" : "Off"; $("learnTog").style.color = S.learn.on ? "var(--up)" : "var(--mut)";
  $("learnNote").textContent = S.learn.on ? `Lesson trades are allowed even when the brain says no. The most one mistake can cost is ${usd(S.learn.cap)} with fees included (${S.balance > 0 ? pct(S.learn.cap / S.balance, 1) + " of your account" : "set once your balance loads"}). Every lesson trade still needs a stop loss.` : "Off. The coach only says GO when a strategy signals and passes the gates, and sizes trades at the strategy's own risk setting.";
  $("modeBox").innerHTML = `<div class="k" style="font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Daily stop <span class="hq" data-h="dailystop">?</span></div><div class="chips" style="padding:0 0 4px"><button class="chip ${S.stop.on ? "" : "on"}" data-stop="off">Off</button>${[2, 3, 5].map(k => `<button class="chip ${S.stop.on && S.stop.n === k ? "on" : ""}" data-stop="${k}">${k} losses</button>`).join("")}</div><div class="note" style="margin:2px 0 12px">${S.stop.on ? (dayLocked() ? `<span class="dn">Locked for today.</span> You've closed ${lostToday()} losing trades. New trades open again tomorrow.` : `${lostToday()} of ${S.stop.n} losing trades used today.`) : "No daily limit."}</div><div class="k" style="font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">How you want to learn <span class="hq" data-h="modes">?</span></div>` + MODES.map(m => `<div class="cp ${S.mode === m[0] ? "cur" : ""}" data-mode="${m[0]}" style="cursor:pointer"><div class="n">${S.mode === m[0] ? "●" : ""}</div><div><b>${m[1]}</b><small>${m[2]}</small></div></div>`).join("") + (S.mode !== "trial" ? `<div class="btns"><button class="btn" id="nextLessonBtn">Next lesson (${TEACH.filter(x => S.learned[x[0]]).length} of ${TEACH.length} learned)</button></div>` : "");
  $("capChips").innerHTML = S.learn.on ? `<span class="note" style="margin:6px 6px 0 0">Tuition cap per trade:</span>` + [0.5, 1, 2].map(c => `<button class="chip ${S.learn.cap === c ? "on" : ""}" data-cap="${c}">${usd(c)}</button>`).join("") : ""; }

/* ---------- one concept at a time: live examples, in order, until understood ---------- */
S.learned = store.get("tc_learned", {}); S.teach = null; S.seenEx = {}; S.teachOn = true;
const TEACH = [
  ["struct", "Market structure", "Which way is price heading? Start here, because every other idea builds on it.", ["A candle closes above the last swing high. What does that tell you?", ["The trend is likely up for now", "Price must fall next", "Nothing, closes don't matter"], 0, "A close above the last swing high is a break of structure up. Buyers pushed past the spot where sellers last won."]],
  ["cons", "Consolidation", "Sometimes price isn't trending at all. Spotting a range keeps you out of chop.", ["Price has gone sideways in a tight band for 15 candles. What usually works worse here?", ["Buying near the bottom of the range", "Chasing every small breakout", "Waiting"], 1, "Inside a range, small breakouts keep failing. Fading the edges or waiting for a clear break works better."]],
  ["liq", "Liquidity pools", "Where are other traders' stop losses sitting? Price tends to travel toward them.", ["Where do stop-loss orders usually pile up?", ["In the middle of the range", "Just above highs and just below lows", "At round times of day"], 1, "Traders put stops just beyond recent highs and lows, so those spots hold a pool of orders."]],
  ["sweep", "Liquidity sweeps", "What happens when price reaches one of those pools and snaps back.", ["Price pokes below a low, then closes back above it. What just happened?", ["A sweep: stops were taken and price rejected the level", "A confirmed breakdown", "A fair value gap"], 0, "The stops under the low were triggered and price closed back above. That's a sweep, and it often comes before a move the other way."]],
  ["fvg", "Fair value gaps", "Fast moves leave gaps behind. Traders watch for price to come back to them.", ["What makes a fair value gap?", ["Two candles the same size", "A big move where the candle before and the candle after don't overlap", "Any red candle"], 1, "It's a three-candle pattern. The middle candle moves so far that the first and third don't overlap, leaving a gap."]],
  ["ob", "Order blocks", "The candle where a strong move began. The idea behind 'institutional' levels.", ["Can you see a bank's actual orders on a price chart?", ["Yes, order blocks show them", "No, an order block is an educated guess about where a big move started", "Only on the 1-hour chart"], 1, "Nobody can see institutions' orders on a chart. An order block marks where a strong move began, which is a zone worth watching and nothing more certain than that."]],
  ["dbl", "Double tops and bottoms", "A classic pattern built from two failed pushes at the same level.", ["When is a double top confirmed?", ["As soon as the second high forms", "When a candle closes below the low between the two highs", "Never"], 1, "It only counts when price closes beyond the neckline, the low between the two highs. Before that it's just two matching highs."]],
  ["gap", "Price gaps", "Empty space between one candle's close and the next open. Mostly a stock-market thing.", ["Why are gaps common in stocks and rare in crypto?", ["Stocks close overnight, crypto trades all day", "Crypto has no volume", "Stocks have no fees"], 0, "News arrives while the stock market is closed, so the next open can jump. Crypto never closes."]]
];
function goodExample(k) { const P = patterns(), n = S.bars.length, A = S.T && S.T.atr, lp = lastPrice(); if (!A || !isF(A)) return null; const rec = d => o => n - 1 - (o.end != null ? o.end : o.i) <= d;
  const c = P.items.filter(o => o.k === k); let pick = null;
  if (k === "struct") pick = c.filter(rec(8))[0];
  else if (k === "cons") pick = c.find(o => o.live && o.end - o.i + 1 >= 14);
  else if (k === "liq") pick = c.filter(o => o.eq && Math.abs(o.p - lp) <= 4 * A && n - 1 - o.i <= 60)[0];
  else if (k === "sweep") pick = c.filter(o => n - 1 - o.i <= 6 && Math.abs(o.ext - o.p) >= 0.1 * A)[0];
  else if (k === "fvg") pick = c.filter(o => o.fill == null && n - 1 - o.i <= 12 && o.hi - o.lo >= 0.5 * A)[0];
  else if (k === "ob") pick = c.filter(o => o.fill == null && n - 1 - o.i <= 25)[0];
  else if (k === "dbl") pick = c.filter(rec(25))[0];
  else if (k === "gap") pick = c.filter(o => o.fill == null && n - 1 - o.i <= 20)[0];
  return pick || null; }
function nextTopic() { return TEACH.find(t => !S.learned[t[0]]); }
function maybeTeach() { if (!S.teachOn || S.teach || helpKey || S.step >= 0 || !S.T || !S.bars.length) return; if (S.view !== "spot" && S.view !== "deriv") return; if (S.ctab !== "price" || $("ticket").classList.contains("show")) return;
  const t = nextTopic(); if (!t) return; const o = goodExample(t[0]); if (!o) return; const id = S.inst.key + t[0] + o.i + (o.p || o.lo); if (S.seenEx[id]) return; S.seenEx[id] = 1;
  S.teach = { t, o, stage: "show", zoom: S.zoom, pan: S.pan }; S.hl = o; S.pan = 0; const need = (S.bars.length - o.i) + 12; if (S.zoom < need) S.zoom = Math.min(300, need); drawChart(); renderPop(); const tx = patText(o); speak("Live example. " + t[1] + ". " + t[2] + " " + tx[0] + " " + tx[1]); }
function endTeach() { if (S.teach && S.teach.zoom) { S.zoom = S.teach.zoom; S.pan = S.teach.pan || 0; } S.teach = null; S.hl = null; if (S.tts) try { S.tts.stop(); } catch (e) {} drawChart(); renderPop(); if ($("patMenu").style.display !== "none") renderPatMenu(); }
function renderTeach(pop) { const { t, o, stage } = S.teach, tx = patText(o), q = t[3], n = TEACH.findIndex(x => x[0] === t[0]) + 1, done = TEACH.filter(x => S.learned[x[0]]).length; let body;
  if (stage === "show") body = `<div class="sec what"><div class="lbl">Live example on your chart</div><p>${esc(t[2])}</p><p style="margin-top:6px">${esc(tx[0])}</p></div><div class="sec why"><div class="lbl">How traders use it</div><p>${esc(tx[1])}</p></div><div class="pp-nav">${S.sample ? `<button class="btn" id="tAsk">💬 Ask</button>` : ""}<button class="btn" id="tLater">Another later</button><button class="btn pri" id="tQuiz">I get it, quiz me</button></div>`;
  else if (stage === "quiz") body = `<div class="sec what"><div class="lbl">Quick check</div><p>${esc(q[0])}</p></div><div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">${q[1].map((a, i) => `<button class="btn" data-ans="${i}" style="justify-content:flex-start;text-align:left">${esc(a)}</button>`).join("")}</div>`;
  else if (stage === "right") body = `<div class="sec what"><div class="lbl up">Correct</div><p>${esc(q[3])}</p><p style="margin-top:6px">${done >= TEACH.length ? "That was the last topic. You've been through all of them." : "This one won't pop up again. The next topic appears when the chart shows a good example."}</p></div><div class="pp-nav"><button class="btn pri" id="tDone">Continue</button></div>`;
  else body = `<div class="sec why"><div class="lbl">Not quite</div><p>${esc(q[3])}</p><p style="margin-top:6px">No problem. I'll show you another example of this when one comes up.</p></div><div class="pp-nav"><button class="btn" id="tAgain">Look at this one again</button><button class="btn pri" id="tDone">Continue</button></div>`;
  pop.innerHTML = `<div class="pp-top"><div class="dots">${TEACH.map((x, i) => `<i class="${S.learned[x[0]] || i < n - 1 && S.learned[x[0]] ? "on" : ""}" style="${x[0] === t[0] ? "background:var(--amb)" : ""}"></i>`).join("")}</div><button class="x" id="ppX" aria-label="Close">×</button></div><h3>${n} of ${TEACH.length} · ${esc(t[1])}</h3>${body}<div class="note" style="margin-top:10px"><a href="#" id="tOff" style="color:var(--mut)">Turn off pop-up lessons</a></div>`;
  pop.classList.add("show");
  const on = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  on("ppX", endTeach); on("tLater", endTeach); on("tDone", endTeach); on("tQuiz", () => { S.teach.stage = "quiz"; renderPop(); speak(q[0]); }); on("tAgain", () => { S.teach.stage = "show"; renderPop(); });
  on("tAsk", () => openAsk()); on("tOff", e => { if (e && e.preventDefault) e.preventDefault(); endTeach(); setMode2("self"); });
  pop.querySelectorAll && pop.querySelectorAll("[data-ans]").forEach(b => b.onclick = () => { const ok = +b.dataset.ans === q[2]; if (ok) { S.learned[t[0]] = Date.now(); store.set("tc_learned", S.learned); } setTimeout(renderProgress, 0); S.teach.stage = ok ? "right" : "wrong"; renderPop(); speak((ok ? "Correct. " : "Not quite. ") + q[3]); });
}

/* ---------- checkpoints and achievements (habits, never profit or trade count) ---------- */
S.prog = Object.assign({ tour: false, tips: 0, placedStop: 0, opened: {}, got: {} }, store.get("tc_prog", {}));
const saveProg = () => store.set("tc_prog", S.prog);
const nLearned = () => TEACH.filter(x => S.learned[x[0]]).length, nReviewed = () => Object.values(S.prog.opened).filter(a => a.length >= 3).length;
const CHECKPOINTS = [["Take the guided tour", "Tap Start guided trade and go through all 7 steps.", () => S.prog.tour], ["Learn your first 3 chart topics", "Pass the quick check on three pop-up lessons.", () => nLearned() >= 3], ["Place a trade with a stop loss", "Use a Bracket order from the ticket.", () => S.prog.placedStop >= 1], ["Review your first lesson", "Open all three steps of a closed trade under Your lessons.", () => nReviewed() >= 1], ["Learn all 8 chart topics", "Finish every pop-up lesson.", () => nLearned() >= TEACH.length], ["Review 5 lessons", "Go through five closed trades, at your own pace.", () => nReviewed() >= 5]];
const BADGES = [["sp_sweep", "Sweep hunter", "Spotted 3 liquidity sweeps on your own.", () => (S.prog.spot.sweep || 0) >= 3], ["sp_cons", "Range reader", "Spotted 3 consolidations on your own.", () => (S.prog.spot.cons || 0) >= 3], ["sp_liq", "Liquidity eyes", "Spotted 3 liquidity pools on your own.", () => (S.prog.spot.liq || 0) >= 3], ["sp_fvg", "Gap finder", "Spotted 3 fair value gaps on your own.", () => (S.prog.spot.fvg || 0) >= 3], ["sp_any", "No training wheels", "Spotted 10 patterns of any kind without help.", () => Object.values(S.prog.spot).reduce((a, b) => a + b, 0) >= 10], ["sp_all", "Pattern master", "Spotted at least one of all eight pattern types.", () => SPOT_K.every(k => (S.prog.spot[k[0]] || 0) >= 1)], ["stop", "Seatbelt on", "Placed a trade with a stop loss attached.", () => S.prog.placedStop >= 1], ["maker", "Patient entry", "Five fills at the lower limit-order fee.", () => S.fills.filter(f => f.liquidity_indicator === "MAKER").length >= 5], ["tip", "Good listener", "Applied one of the advisor's suggestions.", () => S.prog.tips >= 1], ["rev3", "Student of the game", "Reviewed three of your own trades.", () => nReviewed() >= 3], ["half", "Chart reader", "Learned four chart topics.", () => nLearned() >= 4], ["all", "Full curriculum", "Learned all eight chart topics.", () => nLearned() >= TEACH.length], ["tour", "Oriented", "Finished the guided tour.", () => S.prog.tour], ["cap", "Small and steady", "Five closed trades that each lost no more than your tuition cap.", () => S.lessons.length >= 5 && S.lessons.slice(0, 5).every(l => l.net >= -S.learn.cap * 1.1)]];
let toastT = null; function toast(msg) { const el = $("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), Math.max(3800, String(msg).length * 60)); }
function renderProgress() { let cur = false, fresh = [];
  $("cpList").innerHTML = CHECKPOINTS.map((c, i) => { let d = false; try { d = !!c[2](); } catch (e) {} const isCur = !d && !cur; if (isCur) cur = true; if (d && !S.prog.got["cp" + i]) { S.prog.got["cp" + i] = 1; fresh.push("Checkpoint reached: " + c[0]); } return `<div class="cp ${d ? "done" : isCur ? "cur" : ""}"><div class="n">${d ? "✓" : i + 1}</div><div>${esc(c[0])}<small>${esc(c[1])}${isCur ? " · next up" : ""}</small></div></div>`; }).join("");
  $("badgeList").innerHTML = BADGES.map(b => { let d = false; try { d = !!b[3](); } catch (e) {} if (d && !S.prog.got[b[0]]) { S.prog.got[b[0]] = 1; fresh.push("Achievement: " + b[1]); } return `<div class="badge2 ${d ? "got" : ""}"><b>${d ? "★ " : "☆ "}${esc(b[1])}</b><small>${esc(b[2])}</small></div>`; }).join("");
  if (fresh.length) { saveProg(); toast(fresh[0] + (fresh.length > 1 ? " (+" + (fresh.length - 1) + " more)" : "")); }
}

/* ---------- talk back / type back: ask the teacher ---------- */
S.chat = []; S.sample = null; S.dict = null; S.listening = false; S.asking = false;
function teacherContext() { const I = S.inst, T = S.T, st = curStrat(), p = S.P, A = S.ADV, L = []; if (!I) return "";
  L.push(`Market: ${I.label} (${KIND[I.kind]}), ${TFG[S.tf][0]} candles, last price ${px(lastPrice())}.`);
  L.push(`Account: buying power ${usd(S.balance)}. Fees here: ${pct(I.feeIn, 2)} limit, ${pct(I.feeOutTaker, 2)} market. ${I.canShort ? "Can short." : "Buy only (spot)."}`);
  if (T && T.regime) L.push(`Market state: ${T.regime.trend}, volatility ${T.regime.vol.replace("_vol", "")}, ADX ${fmt(T.regime.adx, 0)}, session ${T.regime.session}, ATR ${px(T.atr)}, EMA21 ${T.bias > 0 ? "above" : "below"} EMA55.`);
  { const mf = myTradeFindings(); if (mf) L.push("Student's own closed trades: " + mf); }
  if (T && T.strategies.length) L.push("Strategies (XVI DNA): " + T.strategies.map(s => `${s.nice}: ${s.status.replace(/_/g, " ")}`).join("; ") + ".");
  if (S.vd) L.push(`Coach verdict: ${S.vd[1]}. Learning mode ${S.learn.on ? "on, tuition cap " + usd(S.learn.cap) + " per trade" : "off"}.`);
  if (p && p.valid && !p.close) L.push(`Order in the ticket: ${S.side > 0 ? "buy" : "sell short"} ${S.type}, entry ${px(p.entry)}, stop ${p.noStops ? "none" : px(p.stop)}, target ${p.noStops ? "none" : px(p.target)}, size ${usd(p.notional)}, max loss ${usd(p.netLoss, 3)}, profit at target ${usd(p.netWin, 3)}, reward:risk after fees ${fmt(p.netRR, 2)}.`);
  if (A) L.push(`Advisor pros: ${A.pros.join(" ") || "none"} Advisor cons: ${A.cons.join(" ") || "none"}`);
  if (S.C && S.C.length) L.push("Checks: " + S.C.map(c => (c.s === "pass" ? "PASS " : c.s === "warn" ? "WARN " : "FAIL ") + c.t).join(" "));
  const topic = S.teach ? S.teach.t[1] : helpKey && HELP[helpKey] ? HELP[helpKey][0] : null; if (topic) L.push(`The student is currently looking at the lesson on: ${topic}.` + (S.hl ? " Example on chart: " + patText(S.hl)[0] : ""));
  if (S.lessons.length) { const l = S.lessons[0]; L.push(`Most recent closed trade: ${l.side > 0 ? "long" : "short"} ${l.pid}, in ${fmt(l.entry, 2)}, out ${fmt(l.exit, 2)}, fees ${usd(l.fees, 3)}, net ${usd(l.net, 3)}.`); }
  return L.join("\n"); }
const TEACHER = `You are the teacher inside a trading education page called XVI DNA. The student is a beginner learning by placing small real trades. Answer the student's question using the LIVE CONTEXT below when it's relevant.
Rules: plain everyday words, define any trading term the first time you use it. Keep it under 110 words unless asked for more. Explain and teach; do not predict where price will go, do not promise results, and do not tell the student to buy or sell. You may explain what the page's coach and advisor are saying and why. If the context lacks something, say so. If the question isn't about trading or this page, say briefly that you only teach trading here. No markdown, no bullet symbols.`;
function renderAsk() { const sug = ["Why does the coach say " + ((S.vd && S.vd[1]) || "no trade") + "?", "Is my stop loss in a good spot?", "What should I look at first on this chart?", "Explain the last lesson again, simpler"];
  $("askLog").innerHTML = (S.chat.length ? "" : `<div class="note" style="margin-top:6px">Ask anything about what's on the screen. The teacher can see your chart's state, your ticket and the coach's checks. It explains. It doesn't predict prices or tell you what to buy.</div><div class="sugg">${sug.map(s => `<button data-sg="${esc(s)}">${esc(s)}</button>`).join("")}</div>`) + S.chat.map(m => `<div class="msg ${m.role === "user" ? "u" : "a"}">${esc(m.content || "…")}${m.offline ? `<div style="margin-top:8px"><button class="btn" data-xconnai="1" style="padding:6px 12px">Connect AI for full answers</button></div>` : ""}</div>`).join(""); const lg = $("askLog"); lg.scrollTop = lg.scrollHeight || 0; $("askSend").disabled = S.asking; }
async function askTeacher(q) { q = (q || "").trim(); if (!q || S.asking) return; if (!S.sample) { $("askIn").value = ""; const offA = (typeof window.xviOfflineAnswer === "function" && window.xviOfflineAnswer(q)) || "No AI is connected yet, so I can only answer from the built-in lessons. Press Connect AI to get full answers."; S.chat.push({ role: "user", content: q }, { role: "assistant", content: offA, offline: true }); renderAsk(); speak(offA.replace(/\(Connect[^)]*\)/g, "")); return; } S.asking = true; $("askIn").value = "";
  S.chat.push({ role: "user", content: q }); const ans = { role: "assistant", content: "" }; S.chat.push(ans); renderAsk();
  const hist = S.chat.slice(-9, -2).filter(m => m.content), msgs = [...hist, { role: "user", content: TEACHER + "\n\nLIVE CONTEXT\n" + teacherContext() + "\n\nSTUDENT'S QUESTION\n" + q }]; while (msgs.length && msgs[0].role !== "user") msgs.shift();
  try { const r = await S.sample(msgs, { cache: false, modelTier: "default", onText: ({ text }) => { ans.content = text; renderAsk(); } }); ans.content = (r && r.text) || ans.content || "I didn't get an answer. Try asking again."; speak(ans.content); }
  catch (e) { ans.content = e && e.code === "not_granted" ? "The teacher isn't allowed on this page yet. Allow it when asked, then try again." : e && e.code === "rate_limited" ? "Too many questions in a row. Give it a minute and ask again." : (e && e.text) || "I couldn't reach the teacher just now. Try again in a moment."; }
  S.asking = false; renderAsk(); }
function openAsk(prefill) { $("ask").classList.add("show"); $("askDim").classList.add("show"); if (prefill) $("askIn").value = prefill; renderAsk(); }
function closeAsk() { $("ask").classList.remove("show"); $("askDim").classList.remove("show"); if (S.listening && S.dict) try { S.dict.stop(); } catch (e) {} }
/* ---------- header / coach bar / panels ---------- */
function setMode() { const m = $("mode"); if (S.live) { m.className = "badge live"; m.textContent = (UNI.NET.sim ? "Demo · " : UNI.practice() ? "Practice · " : "Live · ") + (S.refreshSec || 5) + "s"; m.style.cursor = "pointer"; m.title = "Tap to change refresh speed"; } else { m.className = "badge"; m.textContent = S.noMcp ? "Needs live connection" : "Connecting…"; } }
function listEntry() { return [...S.lists.crypto, ...S.lists.futures, ...S.lists.perps].find(x => x.key === S.inst.key); }
function renderHeader() {
  const I = S.inst; if (!I) return; const l = listEntry(), lp = lastPrice(), now = Date.now() / 1000, day = S.bars.filter(x => x.t >= now - 86400);
  $("mktName").textContent = I.kind === "spot" ? I.dataId : I.kind === "stock" ? I.sym : I.label; $("mktLev").textContent = I.lev ? I.lev + "X" : I.maxLev ? I.maxLev + "X" : "";
  let chg = l ? l.chg : null; if (chg == null && day.length > 1) chg = lp / day[0].o - 1;
  const st = [["Last price (24h)", `${px(lp)} <span class="${chg >= 0 ? "up" : "dn"}" style="font-size:11px">${chg != null ? (chg >= 0 ? "+" : "") + pct(chg) : ""}</span>`, "lastprice"]];
  if (l && l.usdVol) st.push(["Volume (24h)", l.usdVol >= 1e9 ? "$" + fmt(l.usdVol / 1e9, 2) + "B" : l.usdVol >= 1e6 ? "$" + fmt(l.usdVol / 1e6, 2) + "M" : "$" + fmt(l.usdVol / 1e3, 0) + "K", "volume"]);
  if (day.length) { st.push(["High (24h)", px(Math.max(...day.map(x => x.h))), "highlow"]); st.push(["Low (24h)", px(Math.min(...day.map(x => x.l))), "highlow"]); }
  if (I.funding != null) st.push(["Funding rate", (I.funding * 100).toFixed(6) + "%/hr", "funding"]);
  $("mstats").innerHTML = st.map(x => `<div>${x[0]} <span class="hq" data-h="${x[2]}">?</span><b>${x[1]}</b></div>`).join("");
  $("tkTitle").textContent = (I.kind === "spot" ? I.dataId + (I.tradeId && I.tradeId !== I.dataId ? " (order book " + I.tradeId + ")" : "") : I.label) + " · " + KIND[I.kind];
}
function renderCoachBar() {
  const T = S.T, st = curStrat(), pill = $("cbPill"); if (!T || !T.regime || !st) { pill.className = "pillS ps-none"; pill.textContent = "…"; if (!S.bars.length) $("cbTxt").textContent = S.noMcp ? "Open this page in Claude to connect live data." : "Loading the brain…"; return; }
  const v = S.vd || ["v-no", "NO TRADE"]; pill.className = "pillS " + (v[0] === "v-go" ? "ps-signal" : v[0] === "v-wait" ? "ps-wait" : "ps-refused"); pill.textContent = v[1];
  const nSig = T.strategies.filter(s => s.side !== 0).length;
  $("cbTxt").textContent = T.pick ? `${T.pick.nice} has a live ${T.pick.side > 0 ? "long" : "short"} signal and passed every gate.` : nSig ? `${nSig} signal${nSig > 1 ? "s" : ""} fired but the gates refused ${nSig > 1 ? "them" : "it"}.` : `No live signals. Market is ${T.regime.trend}, volatility ${T.regime.vol.replace("_vol", "")}.`;
}
const ORD_TYPE = k => /bracket/.test(k) ? "Bracket" : /stop_limit/.test(k) ? "Stop limit" : /limit/.test(k) ? "Limit" : /market/.test(k) ? "Market" : /twap/.test(k) ? "TWAP" : "Order";
function ordRow(o) { const e = Object.entries(o.order_configuration || {})[0] || ["", {}], c = e[1] || {}, size = c.base_size || c.quote_size || o.filled_size || "", price = c.limit_price || o.average_filled_price || "";
  const stc = { FILLED: "up", OPEN: "amb", CANCELLED: "mut", FAILED: "dn", EXPIRED: "mut" }[o.status] || "";
  return `<div class="prow"><div><b class="${o.side === "BUY" ? "up" : "dn"}">${o.side === "BUY" ? "Buy" : "Sell"}</b> ${esc(o.product_id)}<small>${ORD_TYPE(e[0])} · <span class="${stc}">${esc((o.status || "").toLowerCase())}</span> · ${new Date(o.created_time).toLocaleDateString([], { month: "short", day: "numeric" })}${c.stop_price ? " · stop " + esc(c.stop_price) : ""}</small></div><div class="r">${esc(size)}<small>${price && +price ? "@ " + esc(price) : ""}</small></div></div>`; }
function fillRow(f) { const pr = +f.price, sz = +f.size, qty = f.size_in_quote ? sz / pr : sz, val = f.size_in_quote ? sz : sz * pr, base = (f.product_id || "").split("-")[0], buy = f.side === "BUY";
  return `<div class="prow"><div><b>${buy ? "Bought" : "Sold"} ${esc(base)}</b>${f.liquidity_indicator ? `<span class="tag">${f.liquidity_indicator === "MAKER" ? "Limit (maker)" : "Market (taker)"}</span>` : ""}<small>${new Date(f.trade_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · fee ${usd(+f.commission || 0, 3)}</small></div><div class="r ${buy ? "" : "up"}">${buy ? "−" : "+"}${usd(val)}<small>${qty.toFixed(Math.min(8, 6))} ${esc(base)} @ ${fmt(pr, 2)}</small></div></div>`; }
function priceOf(cur) { if (cur === "USD" || cur === "USDC") return 1; const m = S.lists.crypto.find(x => x.label === cur); return m ? m.price : (S.inst && S.inst.label === cur ? lastPrice() : null); }
function renderPanel() {
  const box = $("panelBox"), em = t => `<div class="empty">${t}</div>`; let h = "";
  const assetRow = a => { const p = priceOf(a.cur); return `<div class="prow"><div><b>${esc(a.cur)}</b><small>${a.hold ? "on hold in orders: " + a.hold : "available"}</small></div><div class="r">${a.qty.toFixed(a.cur === "USD" || a.cur === "USDC" ? 2 : 8)}<small>${p != null ? usd(a.qty * p) : ""}</small></div></div>`; };
  if (S.ptab === "positions") { const pos = S.accounts.filter(a => a.cur !== "USD" && a.cur !== "USDC"); h = pos.length ? pos.map(assetRow).join("") : em("No positions"); }
  else if (S.ptab === "open") h = S.openOrders.length ? S.openOrders.map(ordRow).join("") : em("No open orders");
  else if (S.ptab === "history") h = S.orders.length ? S.orders.map(ordRow).join("") : em("No orders yet");
  else if (S.ptab === "assets") h = S.accounts.length ? S.accounts.map(assetRow).join("") : em("No assets");
  else if (S.ptab === "fills") h = S.fills.length ? S.fills.slice(0, 25).map(fillRow).join("") : em("No trades yet");
  else { let tot = 0, unk = 0; S.accounts.forEach(a => { const p = priceOf(a.cur); if (p != null) tot += (a.qty + a.hold) * p; else unk++; }); const fees = S.fills.reduce((s, f) => s + (+f.commission || 0), 0);
    h = `<div class="kv" style="padding:8px 0"><span>Buying power (USD + USDC)</span><span>${usd(S.balance)}</span><span>Total value${unk ? " (some assets not priced)" : ""}</span><span>${usd(tot)}</span><span>Fee level</span><span>${esc(S.tier || "—")}</span><span>Limit / market fee</span><span>${pct(S.fees.spot.m, 2)} / ${pct(S.fees.spot.t, 2)}</span><span>Fees paid, last ${S.fills.length} trades</span><span class="amb">${usd(fees, 3)}</span></div>`; }
  box.innerHTML = h;
}
function renderTx() { $("txList").innerHTML = S.fills.length ? S.fills.map(fillRow).join("") : `<div class="empty">${S.mcp ? "No transactions loaded yet" : "Live connection needed"}</div>`; }

/* ---------- Trade (market browser) ---------- */
const TILES = [["crypto", "Crypto", "◎"], ["stocks", "Stocks", "◔"], ["cmd", "Commodities", "◈"], ["deriv", "Derivatives", "◆"], ["fx", "FX", "€"]];
const TSUB = { crypto: [["vol", "Top volume"], ["up", "Top gainers"], ["dn", "Top losers"], ["az", "A–Z"]], deriv: [["vol", "Top volume"], ["up", "Top gainers"], ["dn", "Top losers"]], stocks: [["all", "All"], ["index", "Index ETFs"], ["stock", "Stocks"]] };
function renderTrade() {
  $("tiles").innerHTML = TILES.map(t => `<button class="tile ${t[0] === S.tile ? "on" : ""}" data-t="${t[0]}"><i>${t[2]}</i>${t[1]}</button>`).join("");
  const subs = TSUB[S.tile] || []; if (subs.length && !subs.some(x => x[0] === S.sub)) S.sub = subs[0][0];
  $("pkSub").innerHTML = subs.map(t => `<button class="chip ${t[0] === S.sub ? "on" : ""}" data-s="${t[0]}">${t[1]}</button>`).join(""); $("pkSub").style.display = subs.length ? "flex" : "none";
  const q = $("pkSearch").value.trim().toUpperCase(), L = S.lists, so = { vol: (a, b) => b.usdVol - a.usdVol, up: (a, b) => b.chg - a.chg, dn: (a, b) => a.chg - b.chg, az: (a, b) => a.label.localeCompare(b.label) }; let list;
  if (S.tile === "crypto") list = L.crypto.filter(m => m.group !== "fx").sort(so[S.sub] || so.vol);
  else if (S.tile === "stocks") list = STOCKS.filter(m => S.sub === "all" || m.group === S.sub);
  else if (S.tile === "deriv") list = [...L.futures, ...L.perps].sort(so[S.sub] || so.vol);
  else if (S.tile === "cmd") list = [...L.futures.filter(m => m.group === "cmd"), ...L.perps.filter(m => m.group === "commodity"), ...CMDETF];
  else list = [...L.crypto.filter(m => m.label === "EURC").map(m => Object.assign({}, m, { name: "Euro vs US dollar · live on Coinbase" })), ...FXETF];
  if (q) list = list.filter(m => m.label.toUpperCase().includes(q) || (m.name || "").toUpperCase().includes(q) || (m.dataId || "").toUpperCase().includes(q));
  const shown = list.slice(0, 150), pf = m => m.price ? "$" + fmt(m.price, Math.min(Math.max(2, decOf(m.priceInc)), 8)) : "";
  let html = shown.map(m => `<div class="mk" data-k="${esc(m.key)}"><div><b>${esc(m.label)}</b>${m.lev || m.maxLev ? `<span class="lev">${m.lev || m.maxLev}X</span>` : ""}${m.kind === "perp" ? '<span class="tag">practice</span>' : ""}<small>${esc(m.name || "")}</small></div><div class="pr">${pf(m)}</div><div class="ch ${m.chg >= 0 ? "up" : "dn"}">${m.chg != null ? (m.chg >= 0 ? "↗ " : "↘ ") + pct(Math.abs(m.chg)) : ""}</div></div>`).join("");
  if (S.tile === "stocks" && /^[A-Z.]{1,6}$/.test(q) && !STOCKS.some(m => m.sym === q)) html = `<div class="mk" data-custom="${q}"><div><b>Load ${q}</b><small>Any US stock or ETF by ticker</small></div><div></div><div></div></div>` + html;
  if (list.length > shown.length) html += `<div class="note" style="padding:12px">Showing 150 of ${list.length}. Search to narrow it down.</div>`;
  if (!html) html = `<div class="empty">${!S.live ? "Loading markets…" : S.tile === "deriv" && !((S.lists.futures || []).length || (S.lists.perps || []).length) && !window.XVI_PROXY ? "Futures need the launcher: run start.sh (Mac/Linux) or start.bat (Windows), then use the localhost page it opens." : "Nothing here matches."}</div>`;
  if (S.tile === "fx") html += `<div class="note" style="padding:12px 4px">No direct forex feed is connected. EURC is a euro stablecoin that tracks EUR/USD live. The ETFs track each currency during US market hours.</div>`;
  if (S.tile === "deriv") html = `<div class="note" style="padding:4px 4px 10px">Futures can be previewed on your account. Rows tagged "practice" are international perps your account can't trade.</div>` + html;
  $("pkList").innerHTML = html;
}
function findInst(k) { return [...S.lists.crypto, ...S.lists.futures, ...S.lists.perps, ...STOCKS, ...FXETF, ...CMDETF].find(m => m.key === k); }

/* ---------- Coach view + ticket ---------- */
function renderCoach() { try { renderLab(); } catch (e) {}
  const I = S.inst, T = S.T; $("bal").textContent = usd(S.balance); $("px").textContent = px(lastPrice()); $("kind").textContent = KIND[I.kind];
  $("feeIn").textContent = pct(I.feeIn, 3); $("feeOut").textContent = pct(I.feeOutTaker, 3); $("canShort").innerHTML = I.canShort ? '<span class="up">Yes</span>' : "No, buy only";
  $("acctNote").textContent = "Fees: " + I.feeSrc + "." + (isLev() ? ` One contract = ${I.contractSize} unit${I.contractSize === 1 ? "" : "s"}, worth about ${usd(lastPrice() * I.contractSize)}.` : "");
  if (!T || !T.regime) { $("brainList").innerHTML = ""; $("brainHead").textContent = T && T.n < 260 ? `Only ${T.n} candles of history. The brain needs at least 260.` : "Brain is loading…"; ["rVol", "rTrend", "rSess"].forEach(i => $(i).textContent = "—"); return; }
  const R = T.regime, vt = { low_vol: ["Low", "mut"], mid_vol: ["Medium", ""], high_vol: ["High", "amb"], unknown: ["—", ""] }[R.vol];
  $("rVol").innerHTML = `<span class="${vt[1]}">${vt[0]}</span>`; $("rTrend").innerHTML = R.trend === "trending" ? `<span class="up">Trending</span> · ${fmt(R.adx, 0)}` : `Ranging · ${fmt(R.adx, 0)}`; $("rSess").textContent = R.session;
  $("regNote").textContent = `ATR is ${pct(R.atrPct, 3)} of price per candle. ADX ${fmt(R.adx, 1)} (25 or more counts as trending). EMA 21 is ${T.bias > 0 ? "above" : "below"} EMA 55, so the short-term lean is ${T.bias > 0 ? "up" : "down"}. ${R.trend === "trending" ? "Trend and breakout strategies fit this state better than fades." : "Fade (mean-reversion) strategies fit a ranging market better than breakouts."}`;
  const nSig = T.strategies.filter(s => s.side !== 0).length, nOk = T.approved.length;
  $("brainHead").innerHTML = T.pick ? `<b class="up">${T.pick.nice} has a live ${T.pick.side > 0 ? "long" : "short"} signal and passed every gate.</b>` : nSig ? `<b class="dn">${nSig} strategy signal${nSig > 1 ? "s" : ""} fired, but the gates refused ${nSig > 1 ? "them" : "it"}.</b> No trade.`
    : `<b>No live signals.</b> ${nOk ? nOk + " strategy passed the gates and is waiting for its setup." : T.gateReady ? "None of the six passed the gates on this market, so the brain recommends no trade." : "Not enough history to run the gates."} Tested on ${T.n} closed ${TFG[S.tf][0]} candles.`;
  $("brainList").innerHTML = T.strategies.map(s => { const pill = { signal: ["LIVE SIGNAL", "ps-signal"], refused: ["SIGNAL REFUSED", "ps-refused"], approved_waiting: ["APPROVED · WAITING", "ps-wait"], no_signal: ["NO SIGNAL", "ps-none"] }[s.status];
    const conds = (s.side < 0 ? s.shortConds : s.longConds).map(c => `<div><span class="${c.ok ? "up" : "dn"}">${c.ok ? "✓" : "✕"}</span><span>${esc(c.text)}</span></div>`).join("");
    const gts = s.gates ? s.gates.outcomes.map(o => `<span class="gt ${o.passed ? "p" : "f"}">${GATE_SHORT[o.gate]} ${o.passed ? "✓" : "✕"}</span>`).join("") : `<span class="gt n">gates need 1,000 candles</span>`;
    const bt = s.bt ? `${s.bt.trades} trades · ${s.bt.retPct >= 0 ? "+" : ""}${fmt(s.bt.retPct, 1)}% · ${s.bt.expR >= 0 ? "+" : ""}${fmt(s.bt.expR, 2)}R per trade · win ${fmt(s.bt.winPct, 0)}%` : "not enough data to backtest";
    return `<div class="sc ${s.name === S.sel ? "sel" : ""}" data-n="${s.name}"><div class="top"><div><div class="nm">${s.nice}</div><div class="fam">${s.family}${s.longOnly ? " · long only" : ""}${s.sessions ? " · " + s.sessions.join("/") : ""}</div></div><span class="pillS ${pill[1]}">${pill[0]}</span></div><div class="conds">${conds}</div><div class="gts">${gts}</div><div class="bt">${bt}</div></div>`; }).join("");
}
function syncInputs() { // keep ticket inputs on the brain's plan until the user edits them
  const st = curStrat(); if (!st || !S.T) return;
  $("inRisk").disabled = !!S.learn.on; if (S.learn.on) $("inRisk").value = S.balance > 0 ? (S.learn.cap / S.balance * 100).toFixed(2) : ""; else if (!$("inRisk").value || !S.riskEdited) $("inRisk").value = st.spec.risk.risk_per_trade_pct;
  if (!S.planEdited) { const bp = brainPlan(); if (bp) setPlanInputs(bp); }
}
function renderPlan() {
  const I = S.inst, T = S.T, st = curStrat(); $("planFor").textContent = st ? st.nice : "";
  if (!st || !T || !T.regime) { ["planKv", "sizeKv", "rrBar", "verdict", "checks", "planTag", "tkSum", "tkChecks", "tkCoach"].forEach(i => $(i).innerHTML = ""); S.P = null; S.C = []; S.vd = null; return; }
  const p = S.P = computePlan(), C = S.C = buildChecks(st, p), v = S.vd = (p && p.close) ? (C.some(x => x.s === "fail") ? ["v-no", "CAN'T SELL", "See the checks below."] : ["v-wait", "YOUR CALL", "Selling what you hold is your decision. The brain only scores entries."]) : verdictOf(C, st);
  const lp = lastPrice(), rtp = I.feeIn + I.feeOut, beU = lp * rtp / (1 - I.feeOut);
  $("rt").textContent = pct(rtp, 3); $("be").textContent = pct(rtp / (1 - I.feeOut), 3); $("beAtr").textContent = isF(T.atr) && T.atr > 0 ? fmt(beU / T.atr, 1) + "×" : "—";
  $("feeNote").textContent = rtp === 0 ? `No commission here, so only the spread and slippage cost you. An average candle moves ${px(T.atr)}.` : `${I.label} has to move about ${px(beU)} your way just to cover fees. An average ${TFG[S.tf][0]} candle moves ${px(T.atr)}, so that's ${fmt(beU / T.atr, 1)} average candles before you make a cent.`;
  $("planTag").innerHTML = st.side !== 0 && st.side === S.side ? (st.gatePass ? "" : `<div class="alert">This signal was refused by the gates. The plan is for learning only.</div>`) : `<div class="alert">Practice plan. ${st.nice} has no live signal, so this shows what the trade would look like if it fired now.</div>`;
  const d3 = x => usd(x, Math.abs(x) < 1 ? 3 : 2), lev = isLev(); let sum = "";
  if (p && p.close) { sum = p.valid ? `<span>Selling</span><span>${p.qty.toFixed(decOf(I.baseInc))} ${esc(I.label)}</span><span>Order value</span><span>${usd(p.notional)}</span><span>Est. fee</span><span class="amb">${d3(p.fee)}</span><span>You receive about</span><span>${usd(p.proceeds)}</span>` : ""; $("planKv").innerHTML = ""; $("sizeKv").innerHTML = ""; $("rrBar").innerHTML = ""; }
  else if (p && p.valid) {
    const e = p.entry, tot = Math.abs(p.target - p.stop), lw = Math.abs(e - p.stop) / tot * 100;
    $("rrBar").innerHTML = S.side > 0 ? `<div style="width:${lw}%;background:var(--dn)"></div><div style="width:${100 - lw}%;background:var(--up)"></div>` : `<div style="width:${100 - lw}%;background:var(--up)"></div><div style="width:${lw}%;background:var(--dn)"></div>`;
    $("planKv").innerHTML = `<span>Side</span><span class="${S.side > 0 ? "up" : "dn"}">${S.side > 0 ? "Buy (long)" : "Sell (short)"}</span><span>Entry</span><span>${px(e)}</span><span>Stop loss</span><span class="dn">${px(p.stop)} · ${fmt(p.stopDist / T.atr, 1)} ATR · ${pct(p.stopDist / e)}</span><span>Take profit</span><span class="up">${px(p.target)} · ${fmt(p.tgtDist / T.atr, 1)} ATR · ${pct(p.tgtDist / e)}</span><span>Reward:risk after fees</span><span class="${p.netRR >= 1.5 ? "up" : p.netRR >= 1 ? "amb" : "dn"}">${p.netWin <= 0 ? "loses money" : fmt(p.netRR, 2) + " : 1"}</span><span>Time stop</span><span>${st.spec.risk.time_stop_bars} candles ≈ ${fmt(st.spec.risk.time_stop_bars * S.tf / 3600, 0)} h</span>`;
    const sz = `<span>Risk budget</span><span>${d3(p.riskUSD)}</span>` + (lev ? `<span>Contracts</span><span>${p.qty}${p.forced ? " (minimum)" : ""}</span><span>Position value</span><span>${usd(p.notional)}</span><span>Margin needed (${pct(p.marginRate, 1)})</span><span class="${p.affordable ? "" : "dn"}">${usd(p.margin)}</span><span>Account wiped out near (rough)</span><span class="amb">${px(p.liqPrice)}</span>` : `<span>Position size</span><span>${usd(p.notional)}${p.capped ? " (all-in cap)" : ""}</span><span>Units</span><span>${p.qty.toFixed(decOf(I.baseInc))} ${esc(I.label)}</span>`)
      + `<span>If the stop hits (incl. fees)</span><span class="dn">−${d3(p.netLoss)}</span><span>If the target hits (incl. fees)</span><span class="${p.netWin > 0 ? "up" : "dn"}">${p.netWin > 0 ? "+" : ""}${d3(p.netWin)}</span>`;
    $("sizeKv").innerHTML = sz;
    sum = `<span>Order value</span><span>${usd(p.notional)}</span><span>Est. fee to enter (${pct(p.feeInRate, 2)})</span><span class="amb">${d3(p.fees.entry)}</span>` + (lev ? `<span>Margin needed</span><span class="${p.affordable ? "" : "dn"}">${usd(p.margin)}</span>` : "") + (p.noStops ? `<span>Max loss</span><span class="dn">not capped</span>` : `<span>Max loss if stopped</span><span class="dn">−${d3(p.netLoss)}</span><span>Profit at target</span><span class="${p.netWin > 0 ? "up" : "dn"}">${p.netWin > 0 ? "+" : ""}${d3(p.netWin)}</span><span>Reward:risk after fees</span><span>${p.netWin <= 0 ? "loses money" : fmt(p.netRR, 2) + " : 1"}</span>`);
  } else { $("rrBar").innerHTML = ""; $("planKv").innerHTML = `<span class="dn">The plan isn't valid yet.</span><span></span>`; $("sizeKv").innerHTML = ""; }
  const chk = C.map(x => `<li><span class="ic ${x.s}">${x.s === "pass" ? "✓" : x.s === "warn" ? "!" : "✕"}</span><span>${esc(x.t)}</span></li>`).join("");
  $("verdict").innerHTML = `<div class="verdict ${v[0]}"><div class="t">${v[1]}</div><div class="s">${v[2]}</div></div>`; $("checks").innerHTML = chk;
  // ticket
  $("tkSum").innerHTML = sum; $("tkChecks").innerHTML = chk;
  const cm = closeMode(); $("fEntry").style.display = S.type === "market" ? "none" : "block"; $("fTgt").style.display = $("fStop").style.display = S.type === "bracket" && !cm ? "block" : "none"; $("autoPlan").style.display = cm ? "none" : "inline-flex";
  $("amtUnit").textContent = lev ? "Contracts" : S.amtUnit === "usd" ? "USD" : I.label; $("amtUnit").disabled = lev;
  if (S.amtMode === "auto" && p && p.valid) $("inAmt").value = lev ? p.qty : S.amtUnit === "usd" ? p.notional.toFixed(2) : p.qty.toFixed(decOf(I.baseInc));
  $("amtQuick").innerHTML = cm ? `<button data-a="max">Max</button><button data-a="half">Half</button>` : `<button data-a="coach">Coach size</button>` + (lev ? "" : `<button data-a="max">Max</button>`);
  $("tkCoach").innerHTML = `<b class="${v[0] === "v-go" ? "up" : v[0] === "v-wait" ? "amb" : "dn"}">Coach: ${v[1]}.</b> ` + (cm ? "On spot, Sell means selling coins you already hold. It doesn't open a short." : st.side !== 0 && st.gatePass ? `${st.nice} approves a ${st.side > 0 ? "buy" : "short"}. Tap "Use coach's plan" to fill every field.` : `No approved signal on ${esc(I.label)}. You can still fill the ticket to practice. The fields below show ${st.nice}'s plan.`);
  const can = S.live && p && p.valid && (p.close ? I.kind === "spot" : ((I.kind === "spot" && S.side > 0 && p.notional >= (I.minQuote || 1)) || (I.kind === "future" && p.qty >= 1)));
  $("previewBtn").disabled = !can; $("previewBtn").textContent = I.kind === "stock" || I.kind === "perp" ? "Preview not available here" : "Preview order";
  document.querySelectorAll("#tkSide button").forEach(b => b.classList.toggle("on", +b.dataset.s === S.side));
  document.querySelectorAll("#tkType button").forEach(b => b.classList.toggle("on", b.dataset.t === S.type));
  renderAdvisor(); renderCoachBar();
}
function renderLight() { if (!S.inst) return; syncInputs(); renderHeader(); $("px").textContent = px(lastPrice()); renderPlan(); drawChart(); renderPop(); }
function render() { renderAll(); }
function renderAll() { if (!S.inst) return; syncInputs(); renderHeader(); renderCoach(); renderLearn(); renderProgress(); renderPlan(); renderSub(); drawChart(); renderPanel(); renderPop(); }
function updateMktBtn() { renderHeader(); }

/* ---------- views ---------- */
function showView(v) {
  if (v !== "spot" && v !== "deriv" && S.teach) { try { endTeach(); } catch (e) {} }
  if (v === "spot" && S.inst && isLev()) { selectInst(S.lastSpot || DEFAULT); }
  if (v === "deriv" && S.inst && !isLev()) { const d = S.lastDeriv || S.lists.futures.find(m => m.root === "BIP") || S.lists.futures[0]; if (d) selectInst(d); else { S.tile = "deriv"; v = "trade"; } }
  S.view = v; const map = { spot: "v-market", deriv: "v-market", trade: "v-trade", tx: "v-tx", coach: "v-coach" };
  ["v-market", "v-trade", "v-tx", "v-coach"].forEach(id => $(id).style.display = id === map[v] ? "block" : "none");
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  $("bsRow").style.display = v === "trade" || v === "tx" ? "none" : "flex";
  if (v === "trade") renderTrade(); if (v === "tx") renderTx(); if (map[v] === "v-market") { renderSub(); drawChart(); }
  window.scrollTo({ top: 0 });
}
function openTicket(side) { S.advOpen = false; if (side) { S.side = side; S.planEdited = false; S.amtMode = "auto"; if (closeMode() && S.type === "bracket") S.type = "limit"; if (!closeMode() && !S.typeEdited) S.type = "bracket"; }
  renderAll(); $("ticket").classList.add("show"); $("tkDim").classList.add("show"); }
function closeTicket() { $("ticket").classList.remove("show"); $("tkDim").classList.remove("show"); }

/* ---------- help: every function explained ---------- */
Object.assign(HELP, {
  lastprice: ["Last price", "The price of the most recent trade, and how much it has changed over the past 24 hours.", "Green means it's up on the day, red means down. One number can't tell you the trend. The chart does that."],
  volume: ["Volume (24h)", "The dollar value traded in the last 24 hours.", "High volume means it's easy to get in and out near the price you want. Thin markets jump around and cost more to trade."],
  highlow: ["24h high and low", "The highest and lowest prices of the last 24 hours.", "They show today's range. Price near the high is strong but has less room. Price near the low may be weak, or a bargain if the trend is up."],
  funding: ["Funding rate", "A small fee paid between longs and shorts every hour on perp-style contracts.", "Positive means longs pay shorts. It keeps the contract price close to the real price. It adds up if you hold for days."],
  charttabs: ["Chart tabs", "Price chart shows candles. Order book shows the buy and sell orders waiting right now. Recent trades shows what just traded.", "Use the price chart to plan. Glance at the order book before you place an order to see the gap between buyers and sellers."],
  timeframe: ["Timeframes", "Each candle covers this much time: 5 minutes, 15 minutes or 1 hour.", "Shorter candles give more signals and more noise. The brain re-runs its strategies and gates on whichever one you pick."],
  spread: ["Spread", "The gap between the best price a buyer will pay (bid) and the best price a seller will take (ask).", "A market order pays the spread. A limit order placed on your side of it avoids that and earns the lower fee."],
  paneltabs: ["Account tabs", "Positions: what you hold. Open orders: orders waiting to fill. Order history: every order. Assets: all balances. Trade history: every fill with its fee. Balance summary: cash, total and fees.", "Check Open orders after placing anything, so nothing is left waiting that you forgot about."],
  transactions: ["Transactions", "Your recent trades, newest first, with the fee paid on each.", "The tag shows whether you paid the cheaper limit (maker) fee or the higher market (taker) fee."],
  ordertype: ["Order type", "Market: buy or sell right now at the current price. Limit: only at your price or better. Bracket: a limit order with a take profit and a stop loss attached.", "The coach uses Bracket, because your exit is set before you enter. Market costs more in fees and gives no price control."],
  amount: ["Amount", "How much to buy or sell. Tap the unit to switch between dollars and coins. Futures use whole contracts.", "The coach sizes it so that a stop-out costs only your risk limit. Typing your own number turns that off. Tap Coach size to turn it back on."],
  limitprice: ["Limit price", "The most you'll pay on a buy, or the least you'll accept on a sell.", "A buy limit below the ask waits in the order book and pays the lower fee. At or above the ask it fills at once and pays the higher fee."],
  takeprofit: ["Take profit", "The price where the order sells automatically for a gain.", "The brain sets it a fixed number of ATRs from entry. It has to be far enough to beat fees."],
  stoploss: ["Stop loss", "The price where the order exits automatically to cap your loss.", "For a buy it sits below entry. A stop hit sells at market, so it pays the higher fee. Never place a trade without one."]
});
const IND_HELP = { ema: ["EMA 21 / 55", "Moving averages that follow price. The 21 is fast, the 55 is slow.", "Fast above slow means the short-term trend is up. The EMA Breakout strategy fires when they cross."], ema200: ["EMA 200", "A very slow moving average.", "Price above it means the bigger trend is up. Range Breakout only buys above it."], sma20: ["SMA 20", "The plain average of the last 20 closes.", "It's the middle line of the Bollinger Bands."], bb: ["Bollinger Bands", "A band two standard deviations above and below the 20-candle average.", "Price outside a band is stretched. Bollinger Fade bets on a snap back, but only when the market isn't trending."], vwap: ["VWAP", "The average price paid today, weighted by volume.", "Above VWAP, today's buyers are in profit. Many traders treat it as fair value for the day."], dc: ["Donchian Channel", "The highest high and lowest low of the last 20 candles.", "A close above the top is a breakout. Three of your strategies use channels like this."], vol: ["Volume", "How much traded in each candle.", "A breakout on high volume is more believable than one on low volume."], rsi: ["RSI", "A 0 to 100 gauge of how fast price has been rising or falling.", "Above 70 is stretched up, below 30 stretched down. RSI Reversion uses a faster 2-candle version."], macd: ["MACD histogram", "The gap between a fast and a slow moving average.", "Bars above zero mean upward momentum, below zero downward."], adx: ["ADX", "Trend strength from 0 to 100, without direction.", "The brain calls 25 or more trending. Donchian Trend needs over 20. Bollinger Fade needs under 22."], atr: ["ATR", "The average size of a candle.", "Every stop and target in the coach is a multiple of ATR, so they scale with how much the market really moves."] };
Object.assign(HELP, IND_HELP);
let helpKey = null;
function speak(text) { if (S.voice && S.tts) { try { S.tts.speak(text.slice(0, 1900), {}).catch(() => {}); } catch (e) {} } }
function showHelp(k) { const h = HELP[k]; if (!h) return; helpKey = k; S.step = -1; document.body.classList.remove("touring"); renderPop(); speak(h[0] + ". " + h[1] + " " + h[2]); }
function renderPop() {
  const pop = $("pop");
  if (S.teach && !helpKey && S.step < 0) { renderTeach(pop); return; }
  if (helpKey) { const h = HELP[helpKey]; pop.innerHTML = `<div class="pp-top"><div class="dots"></div><button class="x" id="ppX" aria-label="Close">×</button></div><h3>${esc(h[0])}</h3><div class="sec what"><div class="lbl">What it is</div><p>${esc(h[1])}</p></div><div class="sec why"><div class="lbl">${helpKey === "__pat" ? "How traders use it" : "How to use it"}</div><p>${esc(h[2])}</p></div>${S.sample ? `<div class="btns"><button class="btn" id="ppAsk">💬 Ask a question about this</button></div>` : ""}`; if ($("ppAsk")) $("ppAsk").onclick = () => openAsk(); pop.classList.add("show"); $("ppX").onclick = () => { helpKey = null; if (S.hl) { S.hl = null; drawChart(); } if (S.tts) try { S.tts.stop(); } catch (e) {} renderPop(); }; return; }
  if (S.step < 0 || !S.inst) { pop.classList.remove("show"); return; }
  const st = STEPS[S.step]; let w = "", y = "", m = ""; try { w = st.what(); y = st.why(); m = st.math(); } catch (e) {}
  pop.innerHTML = `<div class="pp-top"><div class="dots">${STEPS.map((_, i) => `<i class="${i <= S.step ? "on" : ""}"></i>`).join("")}</div><button class="x" id="ppX" aria-label="Close">×</button></div><h3>${S.step + 1}. ${st.title}</h3><div class="sec what"><div class="lbl">What you're looking at</div><p>${esc(w)}</p></div><div class="sec why"><div class="lbl">Why it matters</div><p>${esc(y)}</p></div><details class="math"${S.mathOpen ? " open" : ""}><summary>Show me the math</summary><pre>${esc(m)}</pre></details><div class="pp-nav"><button class="btn" id="ppB" ${S.step === 0 ? "disabled" : ""}>← Back</button><button class="btn pri" id="ppN">${S.step === STEPS.length - 1 ? "Finish" : "Next →"}</button></div>`;
  pop.classList.add("show"); pop.querySelector("details").addEventListener("toggle", e => S.mathOpen = e.target.open);
  $("ppX").onclick = endTour; $("ppB").onclick = () => go(S.step - 1); $("ppN").onclick = () => { if (S.step === STEPS.length - 1) { S.prog.tour = true; saveProg(); endTour(); renderProgress(); } else go(S.step + 1); };
}
function go(i) { helpKey = null; if (S.view !== "coach") showView("coach"); closeTicket(); document.querySelectorAll(".panel.spot").forEach(e => e.classList.remove("spot")); S.step = i; document.body.classList.add("touring"); const el = $(STEPS[i].id); el.classList.add("spot"); el.scrollIntoView({ behavior: "smooth", block: "start" }); renderPop(); const st = STEPS[i]; try { speak(st.title + ". " + st.what() + " " + st.why()); } catch (e) {} }
function endTour() { S.step = -1; document.body.classList.remove("touring"); document.querySelectorAll(".panel.spot").forEach(e => e.classList.remove("spot")); if (S.tts) try { S.tts.stop(); } catch (e) {} renderPop(); }

/* ---------- menus ---------- */
function renderMenus() {
  const row = d => `<label><input type="checkbox" data-i="${d[0]}" ${S.ind[d[0]] ? "checked" : ""}>${indName(d[0])} <span class="hq" data-h="${d[0]}">?</span>${S.ip[d[0]] ? `<button class="tool" data-ipo="${d[0]}" style="margin-left:auto;padding:2px 7px" aria-label="Settings for ${indName(d[0])}">⚙</button>` : `<small>${d[2]}</small>`}</label>` + (S.ipOpen === d[0] && S.ip[d[0]] ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:6px 4px 10px 26px;border-bottom:1px solid var(--line)">${S.ip[d[0]].map((v, n) => `<span class="note" style="margin:0">${IP_LBL[d[0]][n]} <input data-ip="${d[0]}:${n}" value="${v}" inputmode="decimal" style="width:54px;background:var(--bg2);border:1px solid var(--line);border-radius:7px;padding:5px;color:var(--txt);font:600 12px JetBrains Mono"></span>`).join("")}<button class="tool" data-ipr="${d[0]}">Reset</button><span class="note" style="margin:0;flex-basis:100%">${d[2]}. Changing this only changes your chart. The brain keeps its own tested settings.</span></div>` : "");
  $("indMenu").innerHTML = `<h4>On the chart</h4>` + IND_DEF.filter(d => d[3] === "over").map(row).join("") + `<h4>Below the chart</h4>` + IND_DEF.filter(d => d[3] === "pane").map(row).join("");
  const r = (g, v, l) => `<label><input type="radio" name="${g}" data-g="${g}" value="${v}" ${S.set[g] === v ? "checked" : ""}>${l}</label>`;
  $("setMenu").innerHTML = `<h4>Candle style</h4>${r("style", "candles", "Candles")}${r("style", "hollow", "Hollow candles")}${r("style", "line", "Line")}<h4>Price scale</h4>${r("scale", "auto", "Auto")}${r("scale", "log", "Log")}${r("scale", "pct", "Percent (%)")}<h4>Theme</h4>${Object.keys(THEMES).map(k => r("theme", k, THEMES[k].n)).join("")}<h4>Colors</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px">${COL_DEF.map(d => `<label style="display:flex;align-items:center;gap:6px"><input type="color" data-col="${d[0]}" value="${colOf(d[0])}" style="width:26px;height:20px;padding:0;border:0;background:none">${d[1]}</label>`).join("")}</div><button class="tool" id="colReset" style="margin:6px 0 4px">Reset colors to theme</button><h4>Coach</h4><label><input type="checkbox" data-plan ${S.set.plan ? "checked" : ""}>Show entry, stop and target lines</label>`;
}
const cvs = $("chart");

/* ---------- drawing tools ---------- */
S.draws = store.get("tc_draw", {}); S.tmp = null; S.icon = "▲";
const TOOLS = [["cursor", "✛", "Crosshair"], ["trend", "╱", "Trend line"], ["hline", "―", "Horizontal line"], ["fib", "≡", "Fib retracement"], ["xabcd", "⋈", "XABCD pattern"], ["long", "⬒", "Long position"], ["short", "⬓", "Short position"], ["brush", "✎", "Brush"], ["text", "T", "Text"], ["icon", "☺", "Icon"], ["measure", "⇲", "Measure"], ["zoom", "⌕", "Zoom in"]];
const TOGGLES = [["magnet", "⊙", "Magnet mode"], ["stay", "∞", "Stay in drawing mode"], ["lock", "⚿", "Lock all drawings"], ["hideDraw", "◌", "Hide all drawings"], ["remove", "✕", "Remove drawings"]];
const TOOL_HINT = { cursor: "Crosshair: move over the chart to read prices. Drag sideways to scroll.", trend: "Trend line: drag from one point to another.", hline: "Horizontal line: tap a price level.", fib: "Fib retracement: drag from the start of a move to its end.", xabcd: "XABCD: tap five points in order, X, A, B, C, D.", long: "Long position: drag from your entry up to your target. The stop is set at half that distance below.", short: "Short position: drag from your entry down to your target. The stop is set at half that distance above.", brush: "Brush: draw freehand.", text: "Text: tap where the note should go, then type.", icon: "Icon: tap to place a marker. Tap the tool again to change the shape.", measure: "Measure: drag between two points to see the price change, percent and time.", zoom: "Zoom in: drag across the candles you want to see." };
Object.assign(HELP, { drawtools: ["Drawing tools", "The column on the left of the chart. From the top: crosshair, trend line, horizontal line, Fib retracement, XABCD pattern, long and short position, brush, text, icon, measure and zoom in. Below the line: magnet mode, stay in drawing mode, lock, hide and remove.", "Tap any drawing with the crosshair to select it, drag it to move it, or delete just that one. Drawings are your own notes on the chart. Trend lines connect highs or lows. Fib retracement marks how far a pullback has gone. The position tools show risk against reward before you place anything. Magnet snaps points to candle prices. Stay in drawing mode keeps a tool selected. Your drawings are saved per market in this browser."],
  navbar: ["Chart navigation", "The curved arrow jumps back to the latest candle. Minus and plus zoom out and in. The left and right arrows scroll through history.", "Zoom out to see the bigger trend before you look for an entry, then use the curved arrow to come back to now."],
  scale: ["Price scale", "AUTO fits the price axis to the candles in view. LOG spaces prices by percent, so a move from 10 to 20 looks the same as 100 to 200. The % button shows change from the first candle in view.", "Leave AUTO on most of the time. Turn it off to hold the axis still while you scroll. LOG helps on long charts with big moves."],
  depth: ["Depth chart", "A picture of the order book. Green is the total size of buy orders at each price and below. Red is the total size of sell orders at each price and above.", "A tall wall on one side means a lot of orders are waiting there, which can slow price down. Orders can be pulled at any moment, so treat walls as a hint."] });
const curDraws = () => (S.draws[S.inst.key] = S.draws[S.inst.key] || []), saveDraws = () => store.set("tc_draw", S.draws);
function ptFromEvent(e) { const G = S._geo, r = cvs.getBoundingClientRect ? cvs.getBoundingClientRect() : { left: 0, top: 0 }; if (!G) return null; const px0 = e.clientX - r.left, py0 = e.clientY - r.top, fi = px0 / G.w, i = Math.max(0, Math.min(G.N - 1, Math.floor(fi))), bar = S.bars[G.off + i]; if (!bar) return null; let p = G.yInv(py0);
  if (S.magnet) { const c = [bar.o, bar.h, bar.l, bar.c]; p = c.reduce((a, b) => Math.abs(b - p) < Math.abs(a - p) ? b : a); } return { t: bar.t, f: Math.max(0, Math.min(1, fi - i)), p, x: px0, y: py0, i }; }
function xOf(G, pt) { let lo = 0, hi = S.bars.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (S.bars[m].t < pt.t) lo = m + 1; else hi = m; } return (lo - G.off + (pt.f != null ? pt.f : .5)) * G.w; }
function drawDrawings(g, G) { if (S.hideDraw) return; const list = curDraws().concat(S.tmp ? [S.tmp] : []), right = G.W - G.padR, dd = Math.max(2, Math.min(pd(), 6)), P = pt => [xOf(G, pt), G.y(pt.p)];
  g.save(); g.beginPath(); g.rect(0, 0, right, G.mainH); g.clip(); g.font = "600 10px Inter";
  const selObj = S.selD >= 0 ? curDraws()[S.selD] : null;
  for (const d of list) { const col = d === selObj ? "#ffffff" : d.col || "#e8c46b"; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = d === selObj ? 2.5 : 1.5;
    if (d.k === "trend" && d.b) { const [x1, y1] = P(d.a), [x2, y2] = P(d.b); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    else if (d.k === "hline") { const yy = G.y(d.a.p); g.beginPath(); g.moveTo(0, yy); g.lineTo(right, yy); g.stroke(); g.fillText(fmt(d.a.p, dd), 4, yy - 3); }
    else if (d.k === "fib" && d.b) { const [x1] = P(d.a), [x2] = P(d.b), xa = Math.min(x1, x2); [0, .236, .382, .5, .618, .786, 1].forEach((r, n) => { const pr = d.b.p + (d.a.p - d.b.p) * r, yy = G.y(pr); g.strokeStyle = ["#9aa7bd", "#ff8a95", "#ffb547", "#5ff0bd", "#4dd0e1", "#7c9cff", "#9aa7bd"][n]; g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(xa, yy); g.lineTo(right, yy); g.stroke(); g.fillText(r + "  " + fmt(pr, dd), xa + 3, yy - 3); }); }
    else if (d.k === "xabcd") { const L = "XABCD"; g.beginPath(); d.pts.forEach((p, n) => { const [x, yy] = P(p); n ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.stroke(); d.pts.forEach((p, n) => { const [x, yy] = P(p); g.fillText(L[n], x - 3, yy + (n % 2 ? -6 : 13)); }); const leg = (a, b) => Math.abs(d.pts[b].p - d.pts[a].p); if (d.pts.length >= 3) { const [x, yy] = P(d.pts[2]); g.fillText("AB/XA " + fmt(leg(1, 2) / leg(0, 1), 3), x + 6, yy); } if (d.pts.length >= 4) { const [x, yy] = P(d.pts[3]); g.fillText("BC/AB " + fmt(leg(2, 3) / leg(1, 2), 3), x + 6, yy); } if (d.pts.length >= 5) { const [x, yy] = P(d.pts[4]); g.fillText("CD/BC " + fmt(leg(3, 4) / leg(2, 3), 3), x + 6, yy); } }
    else if ((d.k === "long" || d.k === "short") && d.b) { const [x1] = P(d.a), e = d.a.p, tg = d.b.p, stp = e - (tg - e) / 2, x2 = Math.min(right, Math.max(x1 + 60, P(d.b)[0])); g.fillStyle = "rgba(34,211,154,.22)"; g.fillRect(x1, Math.min(G.y(e), G.y(tg)), x2 - x1, Math.abs(G.y(tg) - G.y(e))); g.fillStyle = "rgba(255,93,108,.22)"; g.fillRect(x1, Math.min(G.y(e), G.y(stp)), x2 - x1, Math.abs(G.y(stp) - G.y(e))); g.strokeStyle = "#e8edf5"; g.beginPath(); g.moveTo(x1, G.y(e)); g.lineTo(x2, G.y(e)); g.stroke(); g.fillStyle = "#e8edf5"; g.fillText(`Target ${fmt(tg, dd)} (${pct(Math.abs(tg / e - 1))})`, x1 + 4, G.y(tg) + (tg > e ? 12 : -4)); g.fillText(`Stop ${fmt(stp, dd)} (${pct(Math.abs(stp / e - 1))}) · 2:1 before fees`, x1 + 4, G.y(stp) + (stp > e ? 12 : -4)); }
    else if (d.k === "brush") { g.beginPath(); d.pts.forEach((p, n) => { const [x, yy] = P(p); n ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.stroke(); }
    else if (d.k === "text") { const [x, yy] = P(d.a); g.font = "600 12px Inter"; g.fillText(d.txt, x, yy); g.font = "600 10px Inter"; }
    else if (d.k === "icon") { const [x, yy] = P(d.a); g.font = "16px Inter"; g.fillText(d.g, x - 7, yy + 6); g.font = "600 10px Inter"; }
    else if (d.k === "measure" && d.b) { const [x1, y1] = P(d.a), [x2, y2] = P(d.b), up = d.b.p >= d.a.p; g.fillStyle = up ? "rgba(34,211,154,.18)" : "rgba(255,93,108,.18)"; g.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); const bars = Math.round(Math.abs(d.b.t - d.a.t) / S.tf), mins = bars * S.tf / 60; g.fillStyle = "#e8edf5"; g.fillText(`${up ? "+" : "−"}${fmt(Math.abs(d.b.p - d.a.p), dd)} (${pct(d.b.p / d.a.p - 1)}) · ${bars} bars · ${mins < 120 ? fmt(mins, 0) + " min" : fmt(mins / 60, 1) + " h"}`, Math.min(x1, x2) + 4, Math.min(y1, y2) - 4 < 12 ? Math.max(y1, y2) + 12 : Math.min(y1, y2) - 4); }
    else if (d.k === "zoom" && d.b) { const [x1] = P(d.a), [x2] = P(d.b); g.fillStyle = "rgba(124,156,255,.18)"; g.fillRect(Math.min(x1, x2), 0, Math.abs(x2 - x1), G.mainH); } }
  g.restore(); g.lineWidth = 1; }
S.selD = -1;
/* ---------- spot it yourself: tap where you see a pattern, the coach checks it */
const SPOT_K = [["sweep", "Liquidity sweep"], ["liq", "Liquidity pool"], ["cons", "Consolidation"], ["fvg", "Fair value gap"], ["ob", "Order block"], ["struct", "Break of structure"], ["dbl", "Double top / bottom"], ["gap", "Price gap"]];
S.prog.spot = S.prog.spot || {}; S.prog.spotMiss = S.prog.spotMiss || 0; S.spotK = null; S.spotUsed = S.spotUsed || {};
function openSpot() { const el = $("explainBox"); el.style.display = "block"; S.spotK = null;
  el.innerHTML = `<b>Spot it yourself.</b> Pick what you see, then tap the candle where it happened on the chart. Pattern markers are hidden while you hunt, so it counts as no help.<div class="chips" style="padding:8px 0 4px;flex-wrap:wrap">${SPOT_K.map(k => `<button class="chip" data-spot="${k[0]}">${k[1]} · ${S.prog.spot[k[0]] || 0}</button>`).join("")}</div><button class="tool" id="spotX">Close</button>`;
  el.querySelectorAll("[data-spot]").forEach(b => b.onclick = () => { S.spotK = b.dataset.spot; if (!S.spotSave) S.spotSave = Object.assign({}, S.pat); Object.keys(S.pat).forEach(k => S.pat[k] = false); S.tool = "cursor"; drawChart(); el.querySelectorAll("[data-spot]").forEach(x => x.classList.toggle("on", x === b)); toast("Now tap the candle where you see a " + b.textContent.split(" · ")[0].toLowerCase() + "."); });
  $("spotX").onclick = endSpot; }
function endSpot() { if (S.spotSave) S.pat = S.spotSave; S.spotSave = null; S.spotK = null; $("explainBox").style.display = "none"; drawChart(); }
function checkSpot(pt) { const k = S.spotK, nm = SPOT_K.find(x => x[0] === k)[1], idx = S._geo.off + pt.i, P = patterns().items.filter(o => o.k === k), near = P.filter(o => (o.k === "cons" && idx >= o.i - 1 && idx <= o.end + 1) || [o.i, o.from].some(v => v != null && Math.abs(v - idx) <= 2));
  const hit = near.find(o => !S.spotUsed[S.inst.key + k + o.i]);
  if (hit) { S.spotUsed[S.inst.key + k + hit.i] = 1; S.prog.spot[k] = (S.prog.spot[k] || 0) + 1; saveProg(); toast(`Correct! That's a ${nm.toLowerCase()}. You've spotted ${S.prog.spot[k]} on your own.`); speak("Correct. " + patText(hit)[0]); S.pat = Object.assign({}, S.spotSave || S.pat, { [k]: true }); S.spotSave = null; S.spotK = null; drawChart(); renderProgress(); setTimeout(() => { S.pat[k] = false; drawChart(); }, 4000); openSpot(); }
  else if (near.length) toast("You already found that one. Look for a different " + nm.toLowerCase() + ".");
  else { S.prog.spotMiss++; saveProg(); toast(P.length ? `Not quite. There is a ${nm.toLowerCase()} on this chart, but not at that candle. Try again.` : `The coach doesn't see a ${nm.toLowerCase()} on this chart right now. Try another type or timeframe.`); } }
/* ---------- explain what the chart is doing right now */
function explainChart() { const b = closedBars(), n = b.length; if (n < 30) return "Not enough candles loaded yet to read this chart."; const T = S.T, A = (T && T.atr) || 0, tfN = TFG[S.tf][0], L = [];
  const win = k => { const s = b.slice(-k), o = s[0].o, c = s[k - 1].c, hi = Math.max(...s.map(x => x.h)), lo = Math.min(...s.map(x => x.l)), ups = s.filter(x => x.c >= x.o).length; return { ch: (c / o - 1) * 100, hi, lo, ups, k, c }; };
  const a = win(20), r = win(5), dirW = x => Math.abs(x) < 0.15 ? "flat" : x > 0 ? "up" : "down";
  L.push(`<b>Last 20 ${tfN} candles:</b> price is ${dirW(a.ch)} ${Math.abs(a.ch).toFixed(2)}%, with ${a.ups} green and ${20 - a.ups} red candles. It ranged between ${px(a.lo)} and ${px(a.hi)}.`);
  const pos = (a.c - a.lo) / Math.max(1e-12, a.hi - a.lo); L.push(`Price now sits in the ${pos > .66 ? "top third" : pos < .33 ? "bottom third" : "middle"} of that range${pos > .66 ? ", so buyers have been in control" : pos < .33 ? ", so sellers have been in control" : ", so neither side is clearly winning"}.`);
  L.push(`<b>Last 5 candles:</b> ${dirW(r.ch)} ${Math.abs(r.ch).toFixed(2)}%. ${Math.sign(r.ch) === Math.sign(a.ch) && Math.abs(r.ch) > 0.15 ? "The short-term move agrees with the bigger one." : Math.abs(r.ch) <= 0.15 ? "The move has paused." : "That is a pullback against the bigger move."}`);
  if (A) { const big = b.slice(-20).reduce((m, x) => (x.h - x.l) > (m.h - m.l) ? x : m), ratio = (big.h - big.l) / A; if (ratio > 1.8) L.push(`The biggest candle (${new Date(big.t * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}) was ${ratio.toFixed(1)} times the normal size. Big candles like that usually come from news or stops being hit.`); }
  { const v1 = b.slice(-5).reduce((s, x) => s + (x.v || 0), 0) / 5, v0 = b.slice(-25, -5).reduce((s, x) => s + (x.v || 0), 0) / 20; if (v0 > 0) L.push(`Volume is ${v1 > v0 * 1.4 ? "rising, so more traders are taking part in this move" : v1 < v0 * 0.7 ? "drying up, so the move has less backing" : "about normal"}.`); }
  if (T && T.regime) L.push(`<b>Bigger picture:</b> ${T.regime.trend === "trending" ? "the market is trending" : "the market is ranging (moving sideways)"}, volatility is ${T.regime.vol.replace("_vol", "")}, and the fast average is ${T.bias > 0 ? "above" : "below"} the slow one, which leans ${T.bias > 0 ? "up" : "down"}.`);
  try { const P = patterns().items.filter(o => n - 1 - (o.end != null ? o.end : o.i) <= 20).slice(-3); if (P.length) L.push("<b>Patterns nearby:</b> " + P.map(o => patText(o)[0]).join(" ")); } catch (e) {}
  L.push(`<span class="mut">This describes what already happened. It does not predict the next candle.</span>`); return L.join("<br>"); }
function showExplain() { const el = $("explainBox"), h = explainChart(); el.style.display = "block"; el.innerHTML = h + `<div style="margin-top:8px"><button class="tool" id="expAsk">Ask the teacher about this</button> <button class="tool" id="expX">Close</button></div>`; speak(h.replace(/<[^>]+>/g, " "));
  $("expX").onclick = () => { el.style.display = "none"; if (S.tts) try { S.tts.stop(); } catch (e) {} }; $("expAsk").onclick = () => openAsk("Explain what my chart is doing right now and what I should watch for."); }
/* ---------- research lab: the XVI DNA improvement loop (evaluate, propose, test, gates decide) */
S.lab = Object.assign({ runs: [], approved: {} }, store.get("tc_lab", {}));
HELP.explain = ["Explain chart", "A short plain-English read of the last 20 and last 5 candles: direction, where price sits in its range, unusually big candles, volume, the bigger trend and any nearby patterns.", "Reading the story of the last few candles before you trade is how you learn to recognise patterns yourself. It describes what already happened and does not predict the next candle."];
HELP.spot = ["Spot it", "Pick a pattern, then tap the candle where you see it. The coach checks your answer against its own pattern finder.", "Markers are hidden while you hunt, so every correct answer is yours. Correct finds count toward badges like Sweep hunter and Pattern master."];
HELP.lab = ["Research lab", "The brain studies where a strategy loses on this market, proposes one small change, tests the new version, and then the three gates decide if it is kept.", "This is the improvement loop from your XVI DNA project. The AI may suggest a change, but it can never approve its own work. Only the gates can. Most ideas get rejected, and that is the system working. An approved version joins the brain's list for this market and timeframe. It never places a trade by itself."];
const LAB_CAUSE = { stop_dominated: "most trades there end at the stop", no_follow_through: "trades there run out of time without moving", target_capped: "trades there hit the target and miss the rest of the move", churn: "trades there go nowhere and pay fees" };
function labFindings(st) { const rows = []; for (const [dim, by] of [["volatility", st.byVol], ["trend", st.byTrend]]) for (const [k, v] of Object.entries(by || {})) rows.push(Object.assign({ dim, regime: k }, v));
  const tot = (st.byVol ? Object.values(st.byVol) : []).reduce((s, v) => s + v.trades, 0), base = tot ? Object.values(st.byVol).reduce((s, v) => s + v.expR * v.trades, 0) / tot : 0;
  return rows.filter(r => r.trades >= 20 && base - r.expR > 0.05).map(r => ({ dimension: r.dim, regime: r.regime, issue: r.expR < 0 ? "negative_expectancy" : "underperformance", cause: r.stopShare >= .55 ? "stop_dominated" : r.timeShare >= .45 ? "no_follow_through" : r.targetShare >= .45 ? "target_capped" : "churn", expectancy_r: +r.expR.toFixed(3), baseline_r: +base.toFixed(3), trades: r.trades })).sort((a, b) => a.expectancy_r - b.expectancy_r); }
function labLevers(spec) { const out = []; for (const [nm, d] of Object.entries(spec.series)) for (const f of ["length", "fast", "slow", "signal", "num_std"]) if (d[f] != null) out.push(`series.${nm}.${f} = ${d[f]}`); for (const f of ["stop_atr_mult", "target_atr_mult", "time_stop_bars", "risk_per_trade_pct"]) out.push(`risk.${f} = ${spec.risk[f]}`); out.push("filters.session = " + JSON.stringify((spec.filters && spec.filters.session) || null)); return out; }
function labPropose(spec, patch) { const d = DNA.clone(spec), before = JSON.stringify(d), num = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
  for (const [sec, vals] of Object.entries(patch || {})) { if (sec === "series") { for (const [nm, f] of Object.entries(vals || {})) { if (!d.series[nm]) throw new Error("unknown series " + nm); for (const [k, v] of Object.entries(f)) { if (!["length", "fast", "slow", "signal", "num_std"].includes(k) || d.series[nm][k] == null || !num(v, k === "num_std" ? 0.5 : 2, k === "num_std" ? 5 : 400)) throw new Error("lever not allowed: " + nm + "." + k); d.series[nm][k] = k === "num_std" ? v : Math.round(v); } } }
    else if (sec === "risk") { const lim = { stop_atr_mult: [0.5, 6], target_atr_mult: [0.5, 15], time_stop_bars: [5, 1000], risk_per_trade_pct: [0.05, 1] }; for (const [k, v] of Object.entries(vals || {})) { if (!lim[k] || !num(v, lim[k][0], lim[k][1])) throw new Error("risk lever not allowed: " + k); d.risk[k] = k === "time_stop_bars" ? Math.round(v) : v; } }
    else if (sec === "filters") { const s = vals && vals.session; if (!Array.isArray(s) || !s.length || s.some(x => !["Asia", "London", "NewYork"].includes(x))) throw new Error("bad session filter"); d.filters = Object.assign({}, d.filters, { session: s }); }
    else throw new Error("patch section not permitted: " + sec); }
  if (JSON.stringify(d) === before) throw new Error("the patch changed nothing"); const m = spec.name.match(/^(.*)_V(\d+)$/); d.name = (m ? m[1] : spec.name) + "_V" + ((m ? +m[2] : 1) + 1); return d; }
function labRule(spec, f) { const r = spec.risk; if (!f) return { hypothesis: "No weak spot had enough trades, so test a slightly wider stop to see if the result is fragile.", patch: { risk: { stop_atr_mult: +(r.stop_atr_mult * 1.15).toFixed(2) } } };
  if (f.cause === "stop_dominated") return { hypothesis: `In ${f.regime} conditions most trades end at the stop. A wider stop may survive the noise.`, patch: { risk: { stop_atr_mult: +(r.stop_atr_mult * 1.25).toFixed(2) } } };
  if (f.cause === "no_follow_through") return { hypothesis: `In ${f.regime} conditions trades stall. A shorter time limit frees the money sooner.`, patch: { risk: { time_stop_bars: Math.max(5, Math.round(r.time_stop_bars * 0.6)) } } };
  if (f.cause === "target_capped") return { hypothesis: `In ${f.regime} conditions trades hit the target early. A further target may catch more of the move.`, patch: { risk: { target_atr_mult: +(r.target_atr_mult * 1.3).toFixed(2) } } };
  const nm = Object.keys(spec.series).find(k => spec.series[k].length != null); return { hypothesis: `In ${f.regime} conditions trades go nowhere. A slower indicator may skip the weak signals.`, patch: nm ? { series: { [nm]: { length: Math.round(spec.series[nm].length * 1.3) } } } : { risk: { stop_atr_mult: +(r.stop_atr_mult * 1.2).toFixed(2) } } }; }
let labBusy = false, labLog = [];
async function runLab() { if (labBusy) return; const st = curStrat(), cl = closedBars(); if (!st || !S.T) { toast("Open a market and wait for the brain first."); return; } labBusy = true; labLog = []; const say = (s, cls) => { labLog.push([s, cls || ""]); renderLab(); }, tick = () => new Promise(r => setTimeout(r, 30));
  const run = { t: Date.now(), market: S.inst.label, key: S.inst.key + "|" + S.tf, tf: TFG[S.tf][0], parent: st.spec.name, state: "rejected" };
  try { const b = DNA.makeBars(cl), periodSec = S.tf * 24, cfg = { capital: 100000, fee: S.inst.feeIn, slip: S.inst.slip == null ? 0.0001 : S.inst.slip, maxLev: S.inst.kind === "spot" || S.inst.kind === "stock" ? 1 : 20, warmup: 200 };
    say(`1 · Evaluate: studying ${st.nice} on ${cl.length} ${run.tf} candles of ${S.inst.label}.`); await tick();
    const F = labFindings(st), f = F[0]; run.finding = f || null; say(f ? `Weak spot found: in ${f.regime.replace(/_/g, " ")} conditions it averages ${f.expectancy_r}R over ${f.trades} trades (overall ${f.baseline_r}R), because ${LAB_CAUSE[f.cause]}.` : "No weak spot with at least 20 trades. Testing a small robustness change instead.");
    let hyp = null; if (S.sample) { say("2 · Research: asking the AI for one testable change…"); try { const r = await S.sample([{ role: "user", content: "You are a hypothesis agent for a systematic trading platform. Given the failure modes and the levers available, propose ONE falsifiable change. You may only change the levers listed. Prefer the smallest change. Reply with JSON only, no other text: {\"hypothesis\": \"one plain sentence\", \"patch\": {\"series\": {\"<name>\": {\"length\": 0}}, \"risk\": {\"stop_atr_mult\": 0}, \"filters\": {\"session\": []}}} and include in patch only the one thing you change.\n\nFailure modes:\n" + JSON.stringify(F.slice(0, 3)) + "\n\nLevers:\n- " + labLevers(st.spec).join("\n- ") }], { cache: false, modelTier: "default" }); const m = r && r.text && r.text.match(/\{[\s\S]*\}/); if (m) { const j = JSON.parse(m[0]); if (j.patch) { labPropose(st.spec, j.patch); hyp = { hypothesis: String(j.hypothesis || "").slice(0, 300), patch: j.patch, by: "AI" }; } } } catch (e) { say("The AI's idea was not usable (" + String(e.message || e).slice(0, 80) + "). Using the rule book instead.", "mut"); } }
    if (!hyp) hyp = Object.assign(labRule(st.spec, f), { by: "rule" }); run.hypothesis = hyp.hypothesis; run.patch = hyp.patch; run.by = hyp.by; say(`Idea (${hyp.by}): ${esc(hyp.hypothesis)} Change: <span class="mono">${esc(JSON.stringify(hyp.patch))}</span>`); await tick();
    const cand = labPropose(st.spec, hyp.patch); run.name = cand.name; say(`3 · Build: created ${cand.name} as a new version. The original is untouched.`); await tick();
    const sum = sp => DNA.summarize(DNA.runBacktest(sp, b, cfg), cfg.capital, periodSec), B = sum(st.spec), A2 = sum(cand); run.before = { ret: B.retPct, sharpe: B.sharpe, trades: B.trades }; run.after = { ret: A2.retPct, sharpe: A2.sharpe, trades: A2.trades };
    say(`4 · Backtest: return ${fmt(B.retPct, 1)}% → <b>${fmt(A2.retPct, 1)}%</b>, Sharpe ${fmt(B.sharpe, 2)} → <b>${fmt(A2.sharpe, 2)}</b>, trades ${B.trades} → ${A2.trades}.`); await tick();
    if (b.n < 1000) { run.reason = "Not enough candles for the gates (needs 1,000)."; say("5 · Validate: " + run.reason + " Rejected by default.", "dn"); }
    else { say("5 · Validate: running the three gates. This takes a few seconds…"); await tick(); const G = DNA.runGates(cand, b, cfg, { periodSec, nRandom: 60 }); run.gates = G.outcomes.map(o => [o.gate, !!o.passed]); const better = A2.retPct > B.retPct && A2.sharpe > B.sharpe;
      say("Gates: " + G.outcomes.map(o => `${o.gate.replace(/_/g, " ")} <b class="${o.passed ? "up" : "dn"}">${o.passed ? "pass" : "fail"}</b>`).join(" · "));
      if (G.verdict === "pass" && better) { run.state = "approved"; (S.lab.approved[run.key] = S.lab.approved[run.key] || []).push(cand); S.lab.approved[run.key] = S.lab.approved[run.key].slice(-3); say(`6 · APPROVED. ${cand.name} joins the brain's list for this market and timeframe.`, "up"); S.thinkKey = ""; }
      else { run.reason = G.verdict !== "pass" ? "It failed a gate." : "It did not beat the original on both return and Sharpe."; say("6 · REJECTED. " + run.reason + " Nothing changes in the brain. The result is logged so the next round can try something else.", "dn"); } }
  } catch (e) { run.reason = String(e.message || e).slice(0, 120); say("Stopped: " + esc(run.reason), "dn"); }
  S.lab.runs.unshift(run); S.lab.runs = S.lab.runs.slice(0, 30); store.set("tc_lab", S.lab); labBusy = false; renderLab(); if (run.state === "approved") onData(); }
function myTradeFindings() { const L = S.lessons || [], n = L.length; if (n < 3) return ""; const wins = L.filter(l => l.net > 0).length, gross = L.reduce((s, l) => s + Math.abs(l.gross || 0), 0), fees = L.reduce((s, l) => s + (l.fees || 0), 0), net = L.reduce((s, l) => s + l.net, 0), quick = L.filter(l => l.net < 0 && l.t1 - l.t0 < 10 * 60000).length, losses = n - wins; const out = [`${n} closed trades, ${wins} winners, net ${usd(net)}.`]; if (gross > 0 && fees / gross > 0.4) out.push(`Fees took ${Math.round(100 * fees / gross)}% of what your trades moved. Limit orders and fewer, bigger moves fix that.`); if (losses >= 2 && quick / losses >= 0.5) out.push(`${quick} of your ${losses} losses closed within 10 minutes. That often means stops set too tight or exits made in a hurry.`); return out.join(" "); }
function renderLab() { const el = $("labBox"); if (!el) return; const st = curStrat(), R = S.lab.runs, ok = R.filter(r => r.state === "approved").length, mine = myTradeFindings();
  el.innerHTML = `<div class="note" style="margin:0 0 10px">Evaluate → propose one change → backtest → gates approve or reject. ${R.length} rounds run, ${ok} approved.</div><button class="btn" id="labRun" ${labBusy || !st ? "disabled" : ""} style="width:100%">${labBusy ? "Working…" : "Run one improvement round" + (st ? " on " + esc(st.nice) : "")}</button>`
    + (labLog.length ? `<div style="margin-top:10px;font-size:12.5px;line-height:1.55">${labLog.map(x => `<div class="${x[1]}" style="margin-bottom:5px">${x[0]}</div>`).join("")}</div>` : "")
    + (mine ? `<div class="note" style="margin-top:10px"><b style="color:var(--txt)">From your own trades:</b> ${mine}</div>` : "")
    + (R.length ? `<div class="k" style="font-size:10.5px;color:var(--mut);text-transform:uppercase;letter-spacing:.05em;margin:12px 0 6px">Version log</div>` + R.slice(0, 8).map(r => `<div style="font-size:12px;padding:6px 0;border-top:1px solid var(--line)"><b class="${r.state === "approved" ? "up" : "dn"}">${r.state === "approved" ? "Approved" : "Rejected"}</b> · ${esc(r.name || r.parent)} · ${esc(r.market)} ${r.tf}${r.after ? ` · ${fmt(r.before.ret, 1)}% → ${fmt(r.after.ret, 1)}%` : ""}<div class="mut">${esc(r.hypothesis || r.reason || "")}</div></div>`).join("") : "");
  const bn = $("labRun"); if (bn) bn.onclick = runLab; }
function segDist(px0, py0, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy; let k = l2 ? ((px0 - x1) * dx + (py0 - y1) * dy) / l2 : 0; k = Math.max(0, Math.min(1, k)); return Math.hypot(px0 - (x1 + k * dx), py0 - (y1 + k * dy)); }
function hitDrawing(x, yy) { const G = S._geo, L = curDraws(), P = pt => [xOf(G, pt), G.y(pt.p)], right = G.W - G.padR; let best = -1, bd = 9;
  L.forEach((d, i) => { let dist = 99;
    if (d.k === "hline") dist = Math.abs(yy - G.y(d.a.p));
    else if (d.k === "text" || d.k === "icon") { const [a, b] = P(d.a); dist = Math.hypot(x - a - (d.k === "text" ? 20 : 0), yy - b + 3) - (d.k === "text" ? 18 : 4); }
    else if (d.k === "brush" || d.k === "xabcd") { for (let j = 1; j < d.pts.length; j++) { const [a, b] = P(d.pts[j - 1]), [c, e] = P(d.pts[j]); dist = Math.min(dist, segDist(x, yy, a, b, c, e)); } }
    else if (d.b) { const [a, b] = P(d.a), [c, e] = P(d.b);
      if (d.k === "trend") dist = segDist(x, yy, a, b, c, e);
      else if (d.k === "fib") { const xa = Math.min(a, c); if (x >= xa - 4 && yy >= Math.min(b, e) - 4 && yy <= Math.max(b, e) + 4) dist = 0; }
      else { const stp = d.a.p - (d.b.p - d.a.p) / 2, y1 = Math.min(b, e, G.y(stp)), y2 = Math.max(b, e, G.y(stp)), x2 = Math.min(right, Math.max(a + 60, c)); if (x >= a - 4 && x <= x2 + 4 && yy >= y1 - 4 && yy <= y2 + 4) dist = 0; } }
    if (dist < bd) { bd = dist; best = i; } }); return best; }
function shiftPt(pt, dBars, dP) { let i = S.bars.findIndex(b => b.t >= pt.t); if (i < 0) i = S.bars.length - 1; i = Math.max(0, Math.min(S.bars.length - 1, i + dBars)); return Object.assign({}, pt, { t: S.bars[i].t, p: pt.p + dP }); }
function movedCopy(d, dBars, dP) { const c = JSON.parse(JSON.stringify(d)); if (c.a) c.a = shiftPt(c.a, dBars, dP); if (c.b) c.b = shiftPt(c.b, dBars, dP); if (c.pts) c.pts = c.pts.map(p => shiftPt(p, dBars, dP)); return c; }
const DRAW_NAME = { trend: "Trend line", hline: "Horizontal line", fib: "Fib retracement", xabcd: "XABCD pattern", long: "Long position", short: "Short position", brush: "Brush stroke", text: "Text note", icon: "Icon" };
function renderSel() { const d = curDraws()[S.selD]; if (!d) return; $("ohlc").innerHTML = `<b style="color:var(--txt)">${DRAW_NAME[d.k] || "Drawing"} selected.</b> Drag it to move. <button class="tool" id="selDel" style="padding:2px 8px;color:var(--dn)">Delete</button> <button class="tool" id="selDone" style="padding:2px 8px">Done</button>`;
  $("selDel").onclick = () => { if (S.lock) { toast("Drawings are locked."); return; } curDraws().splice(S.selD, 1); saveDraws(); S.selD = -1; drawChart(); }; $("selDone").onclick = () => { S.selD = -1; drawChart(); }; }
function renderDrawBar() { $("drawBar").innerHTML = TOOLS.map(x => `<button data-tool="${x[0]}" class="${S.tool === x[0] ? "on" : ""}" title="${x[2]}" aria-label="${x[2]}">${x[0] === "icon" && S.tool === "icon" ? S.icon : x[1]}</button>`).join("") + "<hr>" + TOGGLES.map(x => `<button data-tg="${x[0]}" class="${S[x[0]] ? "on" : ""}" title="${x[2]}" aria-label="${x[2]}">${x[1]}</button>`).join("") + `<span class="hq" data-h="drawtools" style="margin:4px auto 0">?</span>`;
  cvs.style.touchAction = S.tool === "cursor" ? "pan-y" : "none"; cvs.style.cursor = S.tool === "cursor" ? "crosshair" : "cell";
  document.querySelectorAll("#navBar [data-sc]").forEach(b => b.classList.toggle("on", b.dataset.sc === "auto" ? S.set.auto : S.set.scale === b.dataset.sc)); }
function finishDraw(d) { curDraws().push(d); saveDraws(); S.tmp = null; if (!S.stay) S.tool = "cursor"; renderDrawBar(); drawChart(); }
let drag = null;
function onDown(e) { const pt = ptFromEvent(e); if (!pt) return; const k = S.tool; $("drawText").style.display = "none";
  if (S.spotK) { checkSpot(pt); return; }
  if (k === "cursor") { const hit = S.hideDraw ? -1 : hitDrawing(pt.x, pt.y);
    if (hit >= 0) { S.selD = hit; S.cx = null; drag = S.lock ? null : { move: true, x: pt.x, p: S._geo.yInv(pt.y), orig: JSON.parse(JSON.stringify(curDraws()[hit])) }; drawChart(); return; }
    S.selD = -1; drag = { x: e.clientX, pan: S.pan || 0, moved: false }; S.cx = pt.i; S.cy = pt.y; drawChart(); return; }
  if (S.lock && k !== "zoom" && k !== "measure") { toast("Drawings are locked. Tap the lock to unlock."); return; }
  if (k === "hline") return finishDraw({ k, a: pt }); if (k === "icon") return finishDraw({ k, a: pt, g: S.icon });
  if (k === "text") { const el = $("drawText"); el.style.display = "block"; el.style.left = Math.min(pt.x, (S._geo.W - 200)) + "px"; el.style.top = Math.max(0, pt.y - 14) + "px"; el.value = ""; el._pt = pt; el.focus && el.focus(); return; }
  if (k === "xabcd") { if (!S.tmp || S.tmp.k !== "xabcd") S.tmp = { k, pts: [] }; S.tmp.pts.push(pt); if (S.tmp.pts.length >= 5) return finishDraw(S.tmp); drawChart(); return; }
  if (k === "brush") { S.tmp = { k, pts: [pt] }; drag = { draw: true }; return; }
  S.tmp = { k, a: pt, b: pt }; drag = { draw: true }; }
function onMove(e) { const pt = ptFromEvent(e); if (!pt) return;
  if (drag && drag.move) { const G = S._geo, dBars = Math.round((pt.x - drag.x) / G.w), dP = G.yInv(pt.y) - drag.p; curDraws()[S.selD] = movedCopy(drag.orig, dBars, dP); drag.did = true; drawChart(); return; }
  if (drag && drag.draw && S.tmp) { if (S.tmp.k === "brush") S.tmp.pts.push(pt); else S.tmp.b = pt; drawChart(); return; }
  if (drag && S.tool === "cursor") { const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) { drag.moved = true; S.pan = drag.pan + Math.round(dx / S._geo.w); S.cx = null; drawChart(); return; } }
  if (S.tool === "cursor") { S.cx = pt.i; S.cy = pt.y; drawChart(); } }
function onUp() { if (drag && drag.move) { if (drag.did) saveDraws(); drag = null; return; }
  if (drag && drag.draw && S.tmp) { const d = S.tmp, far = d.k === "brush" ? d.pts.length > 2 : (d.a.t !== d.b.t || Math.abs(d.a.p - d.b.p) > 1e-9);
    if (d.k === "zoom") { S.tmp = null; if (far) { const i1 = S.bars.findIndex(b => b.t === d.a.t), i2 = S.bars.findIndex(b => b.t === d.b.t), lo = Math.min(i1, i2), hi = Math.max(i1, i2); S.zoom = Math.max(10, hi - lo + 1); S.pan = S.bars.length - 1 - hi; } if (!S.stay) S.tool = "cursor"; renderDrawBar(); drawChart(); }
    else if (d.k === "measure") { /* stays on screen until the next tap */ if (!S.stay) S.tool = "cursor"; renderDrawBar(); drawChart(); setTimeout(() => { if (S.tmp === d) { S.tmp = null; drawChart(); } }, 6000); }
    else if (far) finishDraw(d); else { S.tmp = null; drawChart(); } }
  drag = null; }
function drawDepth() { const cv = $("depth"), b = S.book, dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = 300; if (!W) return; cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, W, H); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  if (!b || !b.bids || !b.asks || !b.bids.length || !b.asks.length) { g.fillStyle = "#8a95a8"; g.font = "13px Inter"; g.fillText(S.inst && S.inst.src !== "cb" ? "No order book for stocks here." : "Loading depth…", 14, 24); return; }
  let cb = 0, ca = 0; const bids = b.bids.map(x => ({ p: +x.price, c: cb += +x.size })), asks = b.asks.map(x => ({ p: +x.price, c: ca += +x.size })), lo = bids[bids.length - 1].p, hi = asks[asks.length - 1].p, mx = Math.max(cb, ca) || 1, X = p => (p - lo) / (hi - lo) * W, Y = c => H - 22 - c / mx * (H - 40);
  const area = (arr, col, fill) => { g.beginPath(); g.moveTo(X(arr[0].p), Y(0)); arr.forEach((q, i) => { g.lineTo(X(q.p), Y(i ? arr[i - 1].c : 0)); g.lineTo(X(q.p), Y(q.c)); }); g.lineTo(X(arr[arr.length - 1].p), Y(0)); g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = col; g.stroke(); };
  area(bids, "#22d39a", "rgba(34,211,154,.22)"); area(asks, "#ff5d6c", "rgba(255,93,108,.22)"); const d = Math.max(2, Math.min(pd(), 6)); g.fillStyle = "#8a95a8"; g.font = "10px JetBrains Mono"; g.fillText(fmt(lo, d), 4, H - 6); g.fillText(fmt((bids[0].p + asks[0].p) / 2, d), W / 2 - 24, H - 6); g.fillText(fmt(hi, d), W - 64, H - 6); g.fillText("Bids " + fmt(cb, 4), 6, 14); g.fillText("Asks " + fmt(ca, 4), W - 96, 14); }
/* ---------- preview / place / cancel ---------- */
function orderParams() {
  const p = S.P, I = S.inst, d = pd(); if (!p || !p.valid) return null;
  const o = { product_id: I.tradeId, product_type: I.ptype, side: S.side > 0 ? "BUY" : "SELL", type: S.type === "market" ? "market" : "limit" };
  const base = I.kind === "future" ? String(p.qty) : p.qty.toFixed(decOf(I.baseInc));
  if (o.type === "limit") { o.limit_price = p.entry.toFixed(d); o.time_in_force = "GTC"; o.base_size = base; }
  else if (I.kind === "spot" && S.side > 0) o.quote_size = (S.amtMode === "manual" && S.amtUnit === "usd" ? Math.floor((parseFloat($("inAmt").value) || 0) * 100) / 100 : Math.floor(p.notional * 100) / 100).toFixed(2); else o.base_size = base;
  if (S.type === "bracket" && !p.close) { o.attached_stop_loss_price = p.stop.toFixed(d); o.attached_take_profit_price = p.target.toFixed(d); }
  return o;
}
function orderLine(o) { return `${o.side} ${o.base_size ? o.base_size + (S.inst.kind === "future" ? " contract(s)" : "") : "$" + o.quote_size} ${o.product_id}, ${o.type}${o.limit_price ? " at " + o.limit_price : ""}${o.attached_stop_loss_price ? ", stop loss " + o.attached_stop_loss_price + ", take profit " + o.attached_take_profit_price : ""}`; }
const uuid = () => "tc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
$("previewBtn").onclick = async () => {
  if (S.P && S.P.valid) { const P0 = S.P, I0 = S.inst; S.planEdited = true; if (S.type !== "market") $("inEntry").value = P0.entry.toFixed(pd()); if (!P0.close && S.type === "bracket") { $("inStop").value = P0.stop.toFixed(pd()); $("inTgt").value = P0.target.toFixed(pd()); }
    if (S.amtMode === "auto") { S.amtMode = "manual"; $("inAmt").value = isLev() ? P0.qty : S.amtUnit === "usd" ? P0.notional.toFixed(2) : P0.qty.toFixed(decOf(I0.baseInc)); } renderPlan(); }
  const out = $("previewOut"), o = orderParams(); if (!S.mcp || !o) return; S.pv = null;
  out.innerHTML = `<div class="note">Asking Coinbase for an estimate…</div>`;
  try {
    const r = await S.mcp.callTool(CB, "coinbase_orders_preview", o, { cache: false });
    const rows = Object.entries(r.payload || {}).filter(([k, v]) => v !== null && typeof v !== "object").slice(0, 12);
    const errs = (r.payload && (r.payload.errs || r.payload.errors)) || [];
    S.pv = { key: JSON.stringify(o), o };
    out.innerHTML = `<div class="kv" style="margin-top:12px">${rows.map(([k, v]) => `<span>${esc(k.replace(/_/g, " "))}</span><span>${esc(v)}</span>`).join("") || "<span>Preview accepted</span><span></span>"}</div>${errs.length ? `<div class="alert" style="margin-top:8px">Coinbase flagged: ${esc(JSON.stringify(errs).slice(0, 200))}</div>` : ""}<div class="note">Estimate from Coinbase. Nothing has been placed.</div><div class="btns"><button class="btn" id="placeBtn" style="border-color:var(--amb);color:var(--amb)">Place order…</button></div><div id="placeBox"></div>`;
    $("placeBtn").onclick = showConfirm;
  } catch (e) { out.innerHTML = `<div class="alert" style="margin-top:10px">${esc(e.code === "tool_error" ? (e.message || "Coinbase rejected the preview.").slice(0, 300) : e.code === "approval_required" ? "The preview needs your approval. Tap again to allow it." : "Couldn't reach Coinbase for a preview. Try again.")}</div>`; }
};
function showConfirm() {
  if (dayLocked() && !(S.P && S.P.close)) { $("placeBox").innerHTML = `<div class="alert" style="margin-top:8px;border-color:rgba(255,93,108,.5);color:#ffc2c8;background:rgba(255,93,108,.08)"><b>Daily stop reached.</b><br>You've closed ${lostToday()} losing trades today, and your limit is ${S.stop.n}. New trades open again tomorrow. Selling what you hold and cancelling orders still work. A good use of the rest of today is opening those lessons in the Coach tab.</div>`; return; }
  const blockers = S.C.filter(x => x.block || (S.learn.on && x.hard)); if (blockers.length) { $("placeBox").innerHTML = `<div class="alert" style="margin-top:8px;border-color:rgba(255,93,108,.5);color:#ffc2c8;background:rgba(255,93,108,.08)"><b>Fix this before placing:</b><br>${blockers.map(x => esc(x.t)).join("<br>")}${S.learn.on ? "<br><br>Learning mode holds lesson trades to these safety rules. You can turn it off in the Coach tab." : ""}</div>`; return; }
  const o = orderParams(), box = $("placeBox"); if (!o || !S.pv || JSON.stringify(o) !== S.pv.key) { box.innerHTML = `<div class="alert" style="margin-top:8px">The order changed since the preview. Preview it again first.</div>`; return; }
  const v = S.vd || ["v-no", "NO TRADE"], bad = v[0] === "v-no";
  box.innerHTML = `<div class="alert" style="margin-top:8px;${bad ? "border-color:rgba(255,93,108,.5);color:#ffc2c8;background:rgba(255,93,108,.08)" : ""}"><b>Real order, real money.</b><br>${esc(orderLine(o))}<br><br>Coach verdict: <b>${v[1]}</b>.${bad ? " The coach does not recommend this trade." : ""}<div class="btns"><button class="btn" id="cfYes" style="background:var(--amb);border-color:var(--amb);color:#201400">Confirm and place</button><button class="btn" id="cfNo">Cancel</button></div></div>`;
  $("cfNo").onclick = () => { box.innerHTML = ""; };
  $("cfYes").onclick = async () => {
    $("cfYes").disabled = true; $("cfYes").textContent = "Sending…"; const sent = Object.assign({}, o, { client_order_id: uuid() }); S.pv = null;
    try { const r = await S.mcp.callTool(CB, "coinbase_orders_create", sent, { cache: false }); const pl = r.payload || {}, id = pl.order_id || (pl.success_response && pl.success_response.order_id) || (pl.order && pl.order.order_id);
      const failed = pl.success === false || pl.error_response; if (!failed && sent.attached_stop_loss_price) { S.prog.placedStop++; saveProg(); }
      if (!failed && S.P && !S.P.close) { const A0 = S.ADV || {}, st0 = curStrat(); S.pendingNote = { at: Date.now(), pid: sent.product_id, side: sent.side, price: sent.limit_price || null, note: { t: Date.now(), entry: S.P.entry, stop: S.P.stop, target: S.P.target, risk: S.P.netLoss, verdict: (S.vd || [0, ""])[1], strat: st0 ? st0.nice : "", pros: A0.pros || [], cons: A0.cons || [] } }; }
      if (!failed && id && S.P && !S.P.close) { S.pendingNote = null; const A = S.ADV || {}, st = curStrat(); S.notes[id] = { t: Date.now(), entry: S.P.entry, stop: S.P.stop, target: S.P.target, risk: S.P.netLoss, verdict: (S.vd || [0, ""])[1], strat: st ? st.nice : "", pros: A.pros || [], cons: A.cons || [] }; const ks = Object.keys(S.notes); if (ks.length > 60) delete S.notes[ks[0]]; store.set("tc_notes", S.notes); }
      box.innerHTML = failed ? `<div class="alert" style="margin-top:8px">Coinbase did not accept the order: ${esc(JSON.stringify(pl.error_response || pl).slice(0, 240))}</div>` : `<div class="alert" style="margin-top:8px;border-color:rgba(34,211,154,.5);color:#bff5e0;background:rgba(34,211,154,.08)"><b>Order sent to Coinbase.</b>${id ? "<br>Order ID " + esc(id) : ""}<br>Check the Open orders tab.</div>`;
    } catch (e) { box.innerHTML = `<div class="alert" style="margin-top:8px">${e.code === "tool_error" ? "Coinbase rejected the order: " + esc((e.message || "").slice(0, 260)) : e.code === "approval_required" || e.code === "not_in_manifest" ? "Placing orders wasn't approved for this page, so nothing was sent." : "<b>Outcome unknown.</b> The connection dropped while sending. Check the Open orders tab before trying again, so you don't place it twice."}</div>`; }
    S.ptab = "open"; document.querySelectorAll("#panelTabs button").forEach(b => b.classList.toggle("on", b.dataset.p === "open"));
    try { await loadAccount(); } catch (e) {} loadActivity(); renderAll();
  };
}
$("copyBtn").onclick = async () => { const o = orderParams(); if (!o) return; const st = curStrat(), txt = `Preview this on Coinbase, then ask me to confirm: ${orderLine(o)}${S.P.netLoss ? " (" + (st ? st.nice + ", " : "") + "max loss about " + usd(S.P.netLoss, 3) + " incl. fees)" : ""}.`;
  try { await navigator.clipboard.writeText(txt); $("copyBtn").textContent = "Copied ✓"; } catch (e) { $("previewOut").innerHTML = `<div class="alert" style="margin-top:10px">Copy this:<br><span class="mono" style="font-size:11.5px">${esc(txt)}</span></div>`; }
  setTimeout(() => $("copyBtn").textContent = "Copy order for Claude", 1800); };
const _ordRow = ordRow; ordRow = function (o) { let h = _ordRow(o); if (o.status === "OPEN" || o.status === "PENDING") h = h.replace(/<\/div>$/, `</div>`) + `<div style="padding:0 0 8px"><button class="btn" data-cancel="${esc(o.order_id)}" style="padding:5px 10px;font-size:11.5px">Cancel order</button></div>`; return h; };
$("panelBox").addEventListener("click", async e => { const b = e.target.closest("[data-cancel]"); if (!b || !S.mcp) return;
  if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Tap again to cancel"; b.style.color = "var(--amb)"; return; }
  b.disabled = true; b.textContent = "Cancelling…";
  try { await S.mcp.callTool(CB, "coinbase_orders_cancel", { order_ids: [b.dataset.cancel] }, { cache: false }); } catch (er) { b.textContent = er.code === "tool_error" ? "Coinbase couldn't cancel it" : "Not confirmed. Check again."; }
  try { await loadAccount(); } catch (er) {} loadActivity(); });

/* ---------- wiring ---------- */
Object.assign(HELP, PAT_HELP);
const LINGO = [["Long", "Buying because you expect the price to rise."], ["Short", "Selling something you don't own because you expect the price to fall. Only possible on futures and perps here."], ["Bullish / bearish", "Bullish means expecting prices to go up. Bearish means expecting them to go down."], ["Bid", "The highest price a buyer is offering right now."], ["Ask", "The lowest price a seller will accept right now."], ["Spread", "The gap between the bid and the ask. You pay it when you use a market order."], ["Slippage", "Getting a worse price than you expected, usually on a market order or a stop in a fast market."], ["Maker / taker", "A maker's order waits in the order book and pays the lower fee. A taker's order fills immediately and pays the higher fee."], ["Limit order", "An order that fills only at your price or better."], ["Market order", "An order that fills right now at the best available price."], ["Stop loss", "An order that exits automatically to cap your loss."], ["Take profit", "An order that exits automatically to lock in a gain."], ["Bracket", "An entry order with a stop loss and a take profit attached."], ["Entry / exit", "Where you get into a trade and where you get out."], ["Position", "What you currently hold in a market."], ["Position size", "How much you buy or sell. Sized so a stop-out costs only a small share of the account."], ["Risk:reward (R:R)", "How much you can make compared with how much you can lose. 2:1 means the target is twice as far as the stop."], ["R", "One unit of risk: the amount you lose if your stop is hit. A +2R trade made twice what it risked."], ["Win rate", "The share of your trades that make money. It only matters together with risk:reward."], ["Break-even", "The point where a trade neither makes nor loses money after fees."], ["Drawdown", "The drop from your account's high point to its low point."], ["Leverage", "Controlling a bigger position than your cash. 10X means a 1% move changes your money by 10%."], ["Margin", "The cash you must put up to hold a leveraged position."], ["Liquidation", "The exchange closing your leveraged position because your margin ran out."], ["Futures", "A contract to trade something at a set date. You can go long or short with leverage."], ["Perpetual (perp)", "A futures-style contract with no expiry date. Funding payments keep its price near the real price."], ["Funding rate", "The hourly fee paid between longs and shorts on a perp."], ["Mark price", "The fair price the exchange uses to work out margin and liquidations."], ["Spot", "Buying or selling the actual coin or share for immediate delivery. No leverage."], ["Candle", "One bar on the chart showing the open, high, low and close for a period."], ["Timeframe", "How much time each candle covers."], ["Trend", "The general direction of price: up, down or sideways."], ["Range / chop", "Price moving sideways between a floor and a ceiling with no trend."], ["Support", "A price level where buyers have stepped in before."], ["Resistance", "A price level where sellers have stepped in before."], ["Breakout", "Price closing beyond a level it had been stuck under or over."], ["Fakeout", "A breakout that quickly fails and reverses."], ["Pullback / retest", "Price coming back to a level after breaking it. Many traders enter there, not on the breakout."], ["Volatility", "How much price moves. ATR measures it."], ["Volume", "How much was traded."], ["Liquidity", "How easily you can trade without moving the price. Also the resting orders that sit above highs and below lows."], ["Stop hunt", "A quick push through a level that triggers stop losses, then reverses. Same idea as a liquidity sweep."], ["Confluence", "Several separate reasons pointing to the same trade."], ["Scalping", "Very short trades lasting seconds to minutes. Fees matter most here."], ["Day trading", "Opening and closing trades within the same day."], ["Swing trading", "Holding trades for days to weeks."], ["Backtest", "Running a strategy's rules over past data to see how it would have done."], ["Overfitting", "A strategy tuned so tightly to past data that it fails on new data. Your XVI DNA gates exist to catch this."], ["FOMO", "Fear of missing out. Buying because price is running, not because your plan says so."], ["Revenge trading", "Trading bigger or faster to win back a loss. It usually makes the loss worse."], ["Paper trading", "Practicing with pretend money."], ["All-time high (ATH)", "The highest price ever reached."], ["Dip", "A drop in price inside a larger uptrend."], ["Whale", "Someone holding enough to move the price with one order."], ["Pump and dump", "A coordinated run-up in price followed by the organizers selling to latecomers."], ["Stablecoin", "A coin designed to stay at one dollar, like USDC."]];
function renderLingo() { const q = ($("lgSearch").value || "").trim().toLowerCase(), l = LINGO.filter(x => !q || x[0].toLowerCase().includes(q) || x[1].toLowerCase().includes(q)); $("lgList").innerHTML = l.map((x, i) => `<div class="prow" data-l="${LINGO.indexOf(x)}" style="cursor:pointer"><div><b>${esc(x[0])}</b><small style="font-size:12px;line-height:1.45">${esc(x[1])}</small></div><div></div></div>`).join("") || `<div class="empty">No term matches.</div>`; }
$("lgSearch").addEventListener("input", renderLingo);
$("lgList").addEventListener("click", e => { const r = e.target.closest("[data-l]"); if (r) { const x = LINGO[+r.dataset.l]; if (S.voice && S.tts) speak(x[0] + ". " + x[1]); else { try { openAsk(); const a = $("askIn"); if (a) { a.value = "Explain " + x[0] + " with an example from my chart"; a.focus(); } } catch (er) {} } } });
renderLingo();
$("modeBox").addEventListener("click", e => { const sb = e.target.closest("[data-stop]"); if (sb) { if (dayLocked() && (sb.dataset.stop === "off" || +sb.dataset.stop > S.stop.n)) { toast("The daily stop can't be loosened while it's locked. It resets tomorrow."); return; } if (sb.dataset.stop === "off") S.stop.on = false; else { S.stop.on = true; S.stop.n = +sb.dataset.stop; } store.set("tc_stop", S.stop); renderAll(); return; } if (e.target.closest("#nextLessonBtn")) { nextLesson(); return; } if (e.target.closest(".hq")) return; const m = e.target.closest("[data-mode]"); if (m) setMode2(m.dataset.mode); });
S.refreshSec = store.get("tc_refresh", 5);
$("mode").onclick = () => { if (!S.live) return; const opts = [5, 15, 30]; S.refreshSec = opts[(opts.indexOf(S.refreshSec) + 1) % opts.length]; store.set("tc_refresh", S.refreshSec); setMode(); toast("Refreshing every " + S.refreshSec + " seconds."); if (S.inst && S.mcp) startWatches(S.inst, S.tf, S.loadId); };
S.set.theme = store.get("tc_theme", "coach"); applyTheme(S.set.theme); $("expBtn").onclick = showExplain; $("spotBtn").onclick = openSpot;
$("learnTog").onclick = () => { S.learn.on = !S.learn.on; store.set("tc_learn", S.learn); S.amtMode = "auto"; invalidatePv(); renderAll(); };
$("capChips").onclick = e => { const b = e.target.closest("[data-cap]"); if (!b) return; S.learn.cap = +b.dataset.cap; store.set("tc_learn", S.learn); S.amtMode = "auto"; invalidatePv(); renderAll(); };
$("lessonList").addEventListener("toggle", e => { const d = e.target; if (d.open && d.classList && d.classList.contains("stp")) { const les = d.closest(".lesson"), L = les && S.lessons[+les.dataset.li]; if (L) { const arr = S.prog.opened[L.id] = S.prog.opened[L.id] || [], ix = [...les.querySelectorAll(".stp")].indexOf(d); if (!arr.includes(ix)) { arr.push(ix); saveProg(); renderProgress(); } } } if (d.dataset && d.dataset.step === "chart" && d.open) { const box = d.querySelector(".lc"); if (box) loadLessonChart(+box.dataset.lc, box); } }, true);
$("lessonList").addEventListener("click", e => { const b = e.target.closest("[data-read]"); if (!b) return; const L = S.lessons[+b.dataset.read], F = lessonFacts(L), was = S.voice; S.voice = true; speak(`${L.side > 0 ? "Long" : "Short"} ${L.pid.split("-")[0]}. You got in at ${fmt(L.entry, 2)} and out at ${fmt(L.exit, 2)}. ${F.reason} The price move was ${L.gross >= 0 ? "plus" : "minus"} ${usd(Math.abs(L.gross), 2)}, fees were ${usd(L.fees, 2)}, so the net result was ${L.net >= 0 ? "a gain" : "a loss"} of ${usd(Math.abs(L.net), 2)}.` + (L.note && L.note.cons.length ? " Before you placed it, the advisor's cons were: " + L.note.cons.join(" ") : "")); S.voice = was; });
HELP.learn = ["Learning mode", "Lets you place small real trades even when the brain says no, so you learn from real results. Your tuition cap is the most one mistake can cost, fees included.", "Coach size is set from the cap. Safety rules still apply: every lesson trade needs a stop loss, has to fit your account, and can't lose more than the cap."];
HELP.lessons = ["Your lessons", "Every trade you close shows up here as a lesson. Open one whenever you're ready and go through it a step at a time.", "The scorecard adds them up: how many won, what fees cost you, and which mistakes repeat."];
HELP.progress = ["Checkpoints and achievements", "Checkpoints are the learning path in order. Achievements mark good habits.", "None of them reward making money or trading more often. They reward stop losses, patience, reviewing your trades and learning to read the chart."];
$("askBtn").onclick = () => openAsk(); $("askX").onclick = closeAsk; $("askDim").onclick = closeAsk;
$("askSend").onclick = () => askTeacher($("askIn").value);
$("askIn").addEventListener("keydown", e => { if (e.key === "Enter") askTeacher($("askIn").value); });
$("askLog").addEventListener("click", e => { const b = e.target.closest("[data-sg]"); if (b) askTeacher(b.dataset.sg); });
$("micBtn").onclick = () => { const d = S.dict; if (!d) return; if (S.listening) { d.stop().catch(() => {}); return; } S.micBase = $("askIn").value; d.start().catch(e => { if (e && e.code === "not_granted") $("micBtn").style.display = "none"; }); };
HELP.odds = ["Past outcomes", "The advisor replays your exact stop and target distances from many past entry points on this chart and counts which was hit first.", "It ignores your reason for entering, so treat it as a base rate. If the target-first share is below your break-even rate, these distances have been losing money on this market lately."];
$("tkAdv").addEventListener("click", e => { if (e.target.closest("[data-advopen]")) { S.advOpen = true; renderAdvisor(); return; } const r = e.target.closest("#advRead"); if (r && S.ADV) { const A = S.ADV, was = S.voice; S.voice = true; speak("Pros. " + (A.pros.join(" ") || "None.") + " Cons. " + (A.cons.join(" ") || "None.") + " " + A.tips.map(t => t.t).join(" ")); S.voice = was; return; }
  const b = e.target.closest("[data-tip]"); if (!b || !S.ADV) return; const t = S.ADV.tips[+b.dataset.tip]; if (!t) return;
  if (t.a === "coach") S.amtMode = "auto"; else { $(t.f).value = t.v.toFixed(pd()); S.planEdited = true; } S.prog.tips++; saveProg(); renderProgress(); invalidatePv(); renderPlan(); drawChart(); });

const invalidatePv = () => { S.pv = null; if ($("placeBox")) $("placeBox").innerHTML = ""; };
["inEntry", "inStop", "inTgt"].forEach(id => $(id).addEventListener("input", () => { S.planEdited = true; invalidatePv(); renderPlan(); drawChart(); }));
$("inAmt").addEventListener("input", () => { S.amtMode = "manual"; invalidatePv(); renderPlan(); });
$("inRisk").addEventListener("input", () => { S.riskEdited = true; renderPlan(); renderPop(); });
$("autoPlan").onclick = () => { S.planEdited = false; S.riskEdited = false; S.amtMode = "auto"; S.type = "bracket"; const st = curStrat(); if (st) { $("inRisk").value = st.spec.risk.risk_per_trade_pct; if (st.side) S.side = st.side; } invalidatePv(); renderAll(); };
$("amtUnit").onclick = () => { if (isLev()) return; S.amtUnit = S.amtUnit === "usd" ? "units" : "usd"; S.amtMode = "auto"; renderPlan(); };
$("amtQuick").onclick = e => { const b = e.target.closest("button"); if (!b) return; const a = b.dataset.a, I = S.inst, e0 = (S.P && S.P.entry) || lastPrice();
  if (a === "coach") S.amtMode = "auto"; else { S.amtMode = "manual"; const cm = closeMode(), full = cm ? holding() : S.balance * 0.98 / e0, u = a === "half" ? full / 2 : full; $("inAmt").value = S.amtUnit === "usd" ? (u * e0).toFixed(2) : u.toFixed(decOf(I.baseInc)); } invalidatePv(); renderPlan(); };
document.querySelectorAll("#fEntry .quick button").forEach(b => b.onclick = () => { const v = b.dataset.q === "bid" ? S.bid : b.dataset.q === "ask" ? S.ask : (S.bid && S.ask ? (S.bid + S.ask) / 2 : null); const x = v || lastPrice(); if (!x) return; $("inEntry").value = rp(x).toFixed(pd()); S.planEdited = true; invalidatePv(); renderPlan(); drawChart(); });
$("tkSide").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.side = +b.dataset.s; S.planEdited = false; S.amtMode = "auto"; if (closeMode() && S.type === "bracket") S.type = "limit"; invalidatePv(); renderAll(); };
$("tkType").onclick = e => { const b = e.target.closest("button"); if (!b || !b.dataset.t) return; S.type = b.dataset.t; S.typeEdited = true; if (closeMode() && S.type === "bracket") S.type = "limit"; invalidatePv(); renderAll(); };
$("buyBtn").onclick = () => openTicket(1); $("sellBtn").onclick = () => openTicket(-1); $("openTicket2").onclick = () => openTicket(S.side); $("tkX").onclick = closeTicket; $("tkDim").onclick = closeTicket;
$("brainList").onclick = e => { const c = e.target.closest(".sc"); if (!c) return; S.sel = c.dataset.n; S.planEdited = false; S.riskEdited = false; S.amtMode = "auto"; const st = curStrat(); S.side = st.side || (S.inst.canShort && !st.longOnly ? S.T.bias : 1); renderAll(); };
$("tfSeg").onclick = e => { const b = e.target.closest("button"); if (!b || +b.dataset.tf === S.tf) return; S.tf = +b.dataset.tf; document.querySelectorAll("#tfSeg button").forEach(x => x.classList.toggle("on", x === b)); if (S.inst && S.mcp) selectInst(S.inst); };
$("chartTabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.ctab = b.dataset.c; document.querySelectorAll("#chartTabs button").forEach(x => x.classList.toggle("on", x === b)); renderSub(); drawChart(); if (S.ctab !== "price") loadBookTrades(); };
$("panelTabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.ptab = b.dataset.p; document.querySelectorAll("#panelTabs button").forEach(x => x.classList.toggle("on", x === b)); renderPanel(); };
$("nav").onclick = e => { const b = e.target.closest("button"); if (b) showView(b.dataset.v); };
$("mktBtn").onclick = () => { S.tile = isLev() ? "deriv" : S.inst.kind === "stock" ? "stocks" : "crypto"; showView("trade"); };
$("cbWhy").onclick = () => showView("coach");
$("tiles").onclick = e => { const b = e.target.closest(".tile"); if (!b) return; S.tile = b.dataset.t; S.sub = (TSUB[S.tile] || [["all"]])[0][0]; renderTrade(); };
$("pkSub").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; S.sub = b.dataset.s; renderTrade(); };
$("pkSearch").addEventListener("input", renderTrade);
$("pkList").onclick = e => { const r = e.target.closest(".mk"); if (!r || !S.mcp) return; const m = r.dataset.custom ? mkStock(r.dataset.custom, "US stock or ETF", "US_STOCK", "stock") : findInst(r.dataset.k); if (!m) return; $("pkSearch").value = ""; selectInst(m); showView(m.kind === "spot" || m.kind === "stock" ? "spot" : "deriv"); };
$("patBtn").onclick = () => { const m = $("patMenu"); m.style.display = m.style.display === "none" ? "block" : "none"; $("indMenu").style.display = $("setMenu").style.display = "none"; renderPatMenu(); };
$("patMenu").addEventListener("change", e => { if ("teach" in e.target.dataset) { setMode2(e.target.checked ? "teacher" : "self"); return; } const k = e.target.dataset.pt; if (k) { S.pat[k] = e.target.checked; drawChart(); renderPatMenu(); } });
$("patMenu").addEventListener("click", e => { if (e.target.closest("#teachReset")) { S.learned = {}; S.seenEx = {}; store.set("tc_learned", {}); renderPatMenu(); setMode2("teacher"); return; } const f = e.target.closest(".found"); if (f && S._found) { const o = S._found[+f.dataset.f]; if (o) showPattern(o); } });
$("indBtn").onclick = () => { const m = $("indMenu"); m.style.display = m.style.display === "none" ? "block" : "none"; $("setMenu").style.display = $("patMenu").style.display = "none"; renderMenus(); };
$("setBtn").onclick = () => { const m = $("setMenu"); m.style.display = m.style.display === "none" ? "block" : "none"; $("indMenu").style.display = $("patMenu").style.display = "none"; renderMenus(); };
$("indMenu").addEventListener("change", e => { const k = e.target.dataset.i; if (k) { S.ind[k] = e.target.checked; drawChart(); return; } const ip = e.target.dataset.ip; if (ip) { const [key, n] = ip.split(":"), isStd = key === "bb" && +n === 1; let v = parseFloat(e.target.value); if (!isF(v)) return; v = isStd ? Math.max(0.5, Math.min(5, v)) : Math.max(2, Math.min(400, Math.round(v))); S.ip[key][+n] = v; store.set("tc_ip", S.ip); S.ind[key] = true; renderMenus(); drawChart(); } });
$("indMenu").addEventListener("click", e => { const o = e.target.closest("[data-ipo]"), r = e.target.closest("[data-ipr]"); if (o) { e.preventDefault(); S.ipOpen = S.ipOpen === o.dataset.ipo ? null : o.dataset.ipo; renderMenus(); } else if (r) { e.preventDefault(); S.ip[r.dataset.ipr] = IP_DEF[r.dataset.ipr].slice(); store.set("tc_ip", S.ip); renderMenus(); drawChart(); } });
$("setMenu").addEventListener("click", e => { if (e.target.closest("#colReset")) { MYCOL = {}; store.set("tc_col", MYCOL); applyTheme(S.set.theme); renderMenus(); drawChart(); } });
$("setMenu").addEventListener("change", e => { const t = e.target; if (t.dataset.col) { MYCOL[t.dataset.col] = t.value; store.set("tc_col", MYCOL); applyTheme(S.set.theme); drawChart(); return; }
  if (t.dataset.g) { S.set[t.dataset.g] = t.value; if (t.dataset.g === "theme") { store.set("tc_theme", t.value); applyTheme(t.value); } } else if ("plan" in t.dataset) S.set.plan = t.checked; renderDrawBar(); drawChart(); });
cvs.addEventListener("pointerdown", e => { try { cvs.setPointerCapture && cvs.setPointerCapture(e.pointerId); } catch (er) {} onDown(e); }); cvs.addEventListener("pointermove", onMove); cvs.addEventListener("pointerup", onUp); cvs.addEventListener("pointercancel", onUp);
cvs.addEventListener("pointerleave", () => { if (!drag) { S.cx = null; S.cy = null; drawChart(); } });
$("drawBar").onclick = e => { const b = e.target.closest("button"); if (!b) return; S.tmp = null;
  if (b.dataset.tool) { if (b.dataset.tool === "icon" && S.tool === "icon") { const gl = ["▲", "▼", "★", "●", "✔", "✖"]; S.icon = gl[(gl.indexOf(S.icon) + 1) % gl.length]; } S.tool = b.dataset.tool; $("ohlc").textContent = TOOL_HINT[S.tool]; speak(TOOL_HINT[S.tool]); renderDrawBar(); if (S.tool === "cursor") drawChart(); return; }
  const k = b.dataset.tg; if (k === "remove") { if (S.lock) { toast("Drawings are locked."); return; } if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.style.color = "var(--amb)"; toast("Tap ✕ again to remove every drawing on this chart."); return; } S.draws[S.inst.key] = []; saveDraws(); } else S[k] = !S[k]; renderDrawBar(); drawChart(); };
$("drawText").addEventListener("keydown", e => { if (e.key !== "Enter") return; const el = $("drawText"), v = el.value.trim(); el.style.display = "none"; if (v && el._pt) finishDraw({ k: "text", a: el._pt, txt: v.slice(0, 60) }); });
$("navBar").onclick = e => { const b = e.target.closest("button"); if (!b) return; const n = b.dataset.n, sc = b.dataset.sc, step = Math.max(1, Math.round(S.zoom / 4));
  if (n === "reset") { S.pan = 0; S.zoom = 80; S.set.auto = true; } else if (n === "in") S.zoom = Math.max(15, Math.round(S.zoom * 0.7)); else if (n === "out") S.zoom = Math.min(S.bars.length || 400, Math.round(S.zoom / 0.7)); else if (n === "left") S.pan = (S.pan || 0) + step; else if (n === "right") S.pan = Math.max(0, (S.pan || 0) - step);
  else if (sc === "auto") S.set.auto = !S.set.auto; else if (sc) S.set.scale = S.set.scale === sc ? "auto" : sc; renderDrawBar(); drawChart(); };
document.addEventListener("click", e => { const h = e.target.closest && e.target.closest(".hq"); if (h && h.dataset.h) { e.preventDefault(); e.stopPropagation(); showHelp(h.dataset.h); } }, true);
/* ---------- Connections: Claude, or your own AI key + public data + any MCP server */
function renderConn() { UNI.enforce(); const D = $("drawer"), C = UNI.cfg, P = UNI.PRESETS, a = C.ai, pr = P[a.provider], lk = UNI.locked(), dis = lk ? "disabled" : "";
  if (UNI.inClaude) { D.innerHTML = `<button class="tool" data-dr="back">‹ Back</button><h3>Connections</h3><div class="note" style="line-height:1.55">You're running inside Claude, so the teacher, voice, live data and order placing all go through your Claude connections. Nothing to set up here.<br><br>Opened anywhere else (a download or GitHub), this screen lets people add their own AI key and an MCP server instead.</div>`; return; }
  D.innerHTML = `<button class="tool" data-dr="back">‹ Back</button>
  <h3>AI for the teacher and lab</h3>
  <label class="di" style="cursor:default"><span>Provider</span><select id="cfProv" ${dis}><option value="">Choose…</option>${Object.keys(P).filter(k => !P[k].builtin || UNI.host || a.provider === k).map(k => `<option value="${k}" ${a.provider === k ? "selected" : ""}>${P[k].n}</option>`).join("")}</select></label>
  <label class="di" style="cursor:default"><span>Model</span>${pr && pr.builtin ? `<select id="cfModel" ${dis}>${UNI.CLAUDE_MODELS.map(([v, n]) => `<option value="${v}" ${(a.model || "auto") === v ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>` : `<input type="text" id="cfModel" value="${esc(a.model || "")}" placeholder="${esc(pr ? pr.model : "")}" style="width:150px" ${dis}>`}</label>
  <label class="di" style="cursor:default"><span>${lk ? "🔒 Model locked" : "🔓 Lock model"}<small style="display:block;font-weight:500;opacity:.75;white-space:normal">${lk ? "Every answer uses " + esc(UNI.lock.model) + ". Untick to change it." : "Freeze this provider and model so nothing can switch it."}</small></span><input type="checkbox" id="cfLock" ${lk ? "checked" : ""} ${pr ? "" : "disabled"}></label>
  <label class="di" style="cursor:default"><span>API key</span><input type="password" id="cfKey" value="${esc(a.key || "")}" placeholder="${pr && !pr.needsKey ? "not needed" : "paste your key"}" style="width:150px" autocomplete="off"></label>
  ${a.provider === "custom" || a.provider === "ollama" ? `<label class="di" style="cursor:default"><span>Server address</span><input type="text" id="cfBase" value="${esc(a.base || "")}" placeholder="${esc(pr.base || "https://…/v1")}" style="width:150px"></label>` : ""}
  <button class="btn" data-dr="aisave" style="width:100%;margin-top:8px">Save and test</button><div class="note" id="cfAiMsg" style="margin-top:6px">${UNI.aiReady() ? "Saved. The 💬 teacher uses " + esc(pr.n) + "." : "The teacher and the lab's AI ideas stay off until an AI is set up. Everything else works without one."}</div>
  <h3>Data and trading (MCP servers)</h3>
  <div class="note" style="margin-bottom:6px">Charts use Coinbase's free public data with no key. To see your own account and place real orders, add an MCP server that offers trading tools. Orders still need Preview, Place order and Confirm.</div>
  ${C.servers.map((s, i) => `<div class="di" style="cursor:default;display:block"><div style="display:flex;justify-content:space-between"><b>${esc(s.name)}</b><small class="${s.ok ? "up" : "dn"}">${s.ok ? (s.tools || []).length + " tools" + (UNI.serverFor("coinbase_orders_create") === s ? " · trading" : "") : "not connected"}</small></div><small style="word-break:break-all">${esc(s.url)}</small>${s.err ? `<div class="dn" style="font-size:12px">${esc(s.err)}</div>` : ""}<div style="margin-top:6px"><button class="tool" data-dr="srvre:${i}">Reconnect</button> <button class="tool" data-dr="srvdel:${i}">Remove</button></div></div>`).join("")}
  <label class="di" style="cursor:default"><span>Name</span><input type="text" id="svName" placeholder="Coinbase" style="width:150px"></label>
  <label class="di" style="cursor:default"><span>Server URL</span><input type="text" id="svUrl" placeholder="https://…/mcp" style="width:150px"></label>
  <label class="di" style="cursor:default"><span>Token (optional)</span><input type="password" id="svTok" style="width:150px" autocomplete="off"></label>
  <button class="btn" data-dr="srvadd" style="width:100%;margin-top:8px">Add and connect</button><div class="note" id="cfSvMsg" style="margin-top:6px"></div>
  <h3>Practice</h3><label class="di" style="cursor:default"><span>Practice balance (no trading server)</span><input type="text" id="cfPrac" value="${esc(String(C.practice))}" style="width:80px"></label>
  <div class="note" style="margin-top:10px;font-size:12px;line-height:1.5">Keys and tokens are saved only in this browser. They're sent only to the AI or server you entered, never to us or to your synced account. Some servers don't allow connections from a web page; if one fails, that's usually why.</div>`; }
function saveAI() { const C = UNI.cfg, v = id => { const el = $(id); return el ? el.value.trim() : ""; }; C.ai = { provider: v("cfProv"), model: v("cfModel"), key: v("cfKey"), base: v("cfBase") }; C.aiOff = false; UNI.save(); afterConn();
  const msg = $("cfAiMsg"); if (!UNI.aiReady()) { msg.textContent = "Not complete yet. Pick a provider and add a key (Ollama and some servers don't need one)."; return; }
  msg.textContent = "Testing…"; UNI.sample([{ role: "user", content: "Reply with the single word: ready" }], {}).then(r => { const L = UNI.last; msg.innerHTML = L && L.miss ? `<span class="amb">Claude answered, but not with ${esc(L.want)}.</span> That model isn't available to this account right now, so Claude used its ${esc(L.tier)} model.` : `<span class="up">Working.</span> The AI answered: "${esc(String(r.text || "").slice(0, 40))}"${L && L.applied && L.applied !== "auto" ? " · " + esc(L.applied) : ""}`; }).catch(e => { msg.innerHTML = `<span class="dn">${esc(e.text || e.message)}</span>`; }); }
function addServer() { const name = ($("svName").value || "").trim() || "MCP server", url = ($("svUrl").value || "").trim(), token = ($("svTok").value || "").trim(), msg = $("cfSvMsg");
  if (!/^https?:\/\//.test(url)) { msg.innerHTML = `<span class="dn">Enter the server's full address, starting with https://</span>`; return; }
  const s = { name, url, token }; UNI.cfg.servers.push(s); UNI.save(); msg.textContent = "Connecting…";
  UNI.connect(s).then(t => { s.err = ""; msg.innerHTML = `<span class="up">Connected.</span> ${t.length} tools found${t.includes("coinbase_orders_create") ? ", including trading." : "."}`; }).catch(e => { s.ok = false; s.err = e.text || e.message; }).then(() => { afterConn(); renderConn(); }); }
let lockMissAt = 0;
window.addEventListener("xvi-host", e => { const d = e.detail || {}; try { S.sample = UNI.cap("sample"); $("askBtn").style.display = S.sample ? "inline-flex" : "none"; wireDict(); } catch (er) {}
  if (d.dropped) toast(UNI.HOST.err + " Charts are back on demo prices with the practice account.");
  if (d.mcp !== undefined || d.dropped) { try { setMode(); loadAccount().then(() => { loadLists(); loadActivity(); if (S.inst) selectInst(S.inst); renderAll(); }).catch(er => { connMsg(er); renderAll(); }); } catch (er) {} } });
window.addEventListener("xvi-ai-model", e => { const d = e.detail || {}; if (d.miss && d.locked && Date.now() - lockMissAt > 120000) { lockMissAt = Date.now(); toast("Your locked model " + d.want + " didn't answer, so Claude used its " + d.tier + " model. Check Connect AI."); } });
function afterConn() { S.sample = UNI.cap("sample"); $("askBtn").style.display = S.sample ? "inline-flex" : "none"; setMode();
  loadAccount().then(() => { loadActivity(); renderAll(); }).catch(() => {}); }
$("drawer").addEventListener("change", e => { if (e.target.id === "cfProv") { if (!UNI.locked()) { const a = UNI.cfg.ai; a.provider = e.target.value; a.model = ""; a.base = ""; } renderConn(); }
  else if (e.target.id === "cfLock") { const a = UNI.cfg.ai, m = $("cfModel"), k = $("cfKey"), bs = $("cfBase"); if (!UNI.locked()) { if (m) a.model = m.value.trim(); if (k) a.key = k.value.trim(); if (bs) a.base = bs.value.trim(); } const on = e.target.checked; if (!UNI.setLock(on)) toast("Pick a provider and a model first, then lock it."); else toast(on ? "Model locked to " + UNI.lock.model + "." : "Model unlocked."); afterConn(); renderConn(); } else if (e.target.id === "cfPrac") { const n = parseFloat(e.target.value); if (isFinite(n) && n >= 0) { UNI.cfg.practice = n; UNI.save(); afterConn(); } } });
/* ---------- ☰ app menu: account, settings and shortcuts */
S.appName = store.get("tc_name", "");
function setAppName(nm) { S.appName = (nm || "").trim().slice(0, 28); store.set("tc_name", S.appName); $("appName").innerHTML = S.appName ? esc(S.appName) : '<span class="xv">XVI</span><sup>TH</sup><span>DNA</span>'; try { document.title = S.appName || "XVI DNA"; } catch (e) {} }
function goPanel(id) { closeDrawer(); showView("coach"); setTimeout(() => { const el = $(id); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); }
function closeDrawer() { $("drawer").classList.remove("show"); $("drawerDim").classList.remove("show"); }
function renderDrawer() { const I = S.inst, nB = (() => { try { return BADGES.filter(b => { try { return b[3](); } catch (e) { return false; } }).length; } catch (e) { return 0; } })();
  const di = (act, label, sub) => `<button class="di" data-dr="${act}"><span>${label}</span><small>${sub || "›"}</small></button>`;
  $("drawer").innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">${S.appName ? esc(S.appName) : "XVI DNA"}</b><button class="tool" data-dr="close" aria-label="Close menu">✕</button></div>
  <h3>Account</h3>${di("p:s-account", "Account & market", S.live ? usd(S.balance) + " buying power" : "Not connected")}${di("p:s-fees", "Fees", I ? pct(I.feeIn, 2) + " limit · " + pct(I.feeOutTaker, 2) + " market" : "")}${di("v:tx", "Transactions", "")}${di("refresh", "Reload account and orders", "↻")}
  <h3>Connections</h3>${di("conn", "AI, data and trading", UNI.inClaude ? "Through Claude" : (UNI.aiReady() ? UNI.PRESETS[UNI.cfg.ai.provider].n.split(" (")[0] : "No AI") + " · " + (UNI.hasTrading() ? "Trading on" : "Practice"))}
  ${S.tts ? `<h3>Coach voice</h3><label class="di" style="cursor:default"><span>Teacher's voice</span><input type="checkbox" id="drVoice" ${S.voice ? "checked" : ""}></label>${window.XVoice && !UNI.inClaude ? '<div id="drVoiceBox" class="xvbox"></div>' : ""}` : ""}
  <h3>Sounds</h3><label class="di" style="cursor:default"><span>Button click sound</span><input type="checkbox" id="drSfx" ${window.XVIsfx && XVIsfx.isOn() ? "checked" : ""}></label>
  <h3>Desk & developer tools</h3><button type="button" class="di" id="drEdit"><span>Edit desk</span><small>move screens · add, remove, recolor buttons</small></button><label class="di" style="cursor:default"><span>Dev mode <small style="opacity:.7">Ctrl+Shift+D</small></span><input type="checkbox" id="drDev" ${window.XVIdev && XVIdev.isOn() ? "checked" : ""}></label>
  <h3>Learning</h3>${di("p:s-learn", "Learning mode & daily stop", S.learn.on ? "On · $" + S.learn.cap.toFixed(2) + " cap" : "Off")}${di("p:s-progress", "Checkpoints & achievements", nB + " of " + BADGES.length + " badges")}${di("p:s-lessons", "Your lessons", (S.lessons || []).length + " trades")}${di("p:s-lab", "Research lab", (S.lab.runs || []).length + " rounds")}${di("tour", "Guided tour", "▶")}${di("ask", "Ask the teacher", "💬")}
  ${S.dev ? `<h3>Developer</h3>
  <label class="di" style="cursor:default"><span>App name</span><input type="text" id="drName" placeholder="XVI DNA" value="${esc(S.appName)}" style="width:140px"></label>
  <label class="di" style="cursor:default"><span>Theme</span><select id="drTheme">${Object.keys(THEMES).map(k => `<option value="${k}" ${S.set.theme === k ? "selected" : ""}>${THEMES[k].n.replace(" (default)", "")}</option>`).join("")}</select></label>
  <label class="di" style="cursor:default"><span>Refresh speed</span><select id="drRef">${[5, 15, 30].map(s => `<option value="${s}" ${(S.refreshSec || 5) === s ? "selected" : ""}>Every ${s} seconds</option>`).join("")}</select></label>
  ${di("chart", "Chart colors & indicators", "⚙")}${di("devoff", "Hide developer options", "✕")}` : ""}
  <h3>About</h3><div class="note" style="font-size:12px;line-height:1.5">${cloudOK ? "Progress, notes and drawings save to your account and follow you to other devices." : "Progress, notes and drawings are saved in this browser."} Orders only go to Coinbase after Preview, Place order and Confirm. This is a learning tool, not financial advice; real trades can lose money.</div><div class="mut" id="drVer" style="font-size:11px;margin-top:10px;user-select:none">Version 1.0</div>`; }
$("menuBtn").onclick = () => { renderDrawer(); $("drawer").classList.add("show"); $("drawerDim").classList.add("show"); };
$("drawerDim").onclick = closeDrawer;
S.dev = store.get("tc_dev", false); let devTaps = 0, devT = null;
$("drawer").addEventListener("click", e => { if (e.target.id === "drVer") { devTaps++; clearTimeout(devT); devT = setTimeout(() => devTaps = 0, 1500); if (devTaps >= 5) { devTaps = 0; S.dev = true; store.set("tc_dev", true); renderDrawer(); toast("Developer options unlocked."); } return; }
  const b = e.target.closest("[data-dr]"); if (!b) return; if (b.dataset.dr === "devoff") { S.dev = false; store.set("tc_dev", false); renderDrawer(); return; } const a = b.dataset.dr;
  if (a === "close") closeDrawer(); else if (a.startsWith("p:")) goPanel(a.slice(2)); else if (a.startsWith("v:")) { closeDrawer(); showView(a.slice(2)); }
  else if (a === "refresh") { closeDrawer(); $("refresh").click(); } else if (a === "tour") { closeDrawer(); go(0); } else if (a === "ask") { closeDrawer(); openAsk(); }
  else if (a === "conn") renderConn();
  else if (a === "back") renderDrawer();
  else if (a === "aisave") saveAI();
  else if (a === "srvadd") addServer();
  else if (a.startsWith("srvdel:")) { UNI.cfg.servers.splice(+a.slice(7), 1); UNI.save(); afterConn(); renderConn(); }
  else if (a.startsWith("srvre:")) { const s = UNI.cfg.servers[+a.slice(6)]; b.textContent = "Connecting…"; UNI.connect(s).then(() => { s.err = ""; }).catch(e => { s.ok = false; s.err = e.text || e.message; }).then(() => { afterConn(); renderConn(); }); }
  else if (a === "chart") { closeDrawer(); showView(S.inst && isLev() ? "deriv" : "spot"); setTimeout(() => $("setBtn").click(), 80); } });
$("drawer").addEventListener("change", e => { const t = e.target;
  if (t.id === "drName") setAppName(t.value);
  else if (t.id === "drTheme") { S.set.theme = t.value; store.set("tc_theme", t.value); applyTheme(t.value); drawChart(); renderMenus(); }
  else if (t.id === "drRef") { S.refreshSec = +t.value; store.set("tc_refresh", S.refreshSec); setMode(); if (S.inst && S.mcp) startWatches(S.inst, S.tf, S.loadId); }
  else if (t.id === "drVoice") { if (!!S.voice !== t.checked) $("voiceBtn").click(); }
  else if (t.id === "drSfx" && window.XVIsfx) { XVIsfx.setOn(t.checked); if (t.checked) XVIsfx(); } });
$("drawer").addEventListener("input", e => { if (e.target.id === "drName") setAppName(e.target.value); });
setAppName(S.appName);
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; closeDrawer(); if (S.spotK || S.spotSave) endSpot(); else if ($("explainBox").style.display === "block") $("explainBox").style.display = "none"; });
$("startTour").onclick = () => go(0); document.querySelectorAll(".q").forEach(b => b.onclick = () => go(+b.dataset.step)); $("dim").onclick = endTour;
$("refresh").onclick = async () => { if (!S.mcp) return; try { await loadAccount(); } catch (e) {} loadActivity(); if (S.inst) selectInst(S.inst); };
$("voiceBtn").onclick = () => { S.voice = !S.voice; try { window.XVoice && XVoice.setOn(S.voice); } catch (e) {} $("voiceBtn").textContent = S.voice ? "🔊 Voice on" : "🔈 Voice off"; $("voiceBtn").setAttribute("aria-pressed", S.voice); if (S.voice) speak("Voice is on. Tap any question mark and I'll read the explanation to you."); else if (S.tts) try { S.tts.stop(); } catch (e) {} };
window.addEventListener("resize", drawChart);
let tick = 0;
setInterval(() => { tick++; $("clock").textContent = new Date().toLocaleTimeString([], { hour12: false }) + " UTC" + (-new Date().getTimezoneOffset() / 60 >= 0 ? "+" : "") + (-new Date().getTimezoneOffset() / 60); $("ago").textContent = S.lastFetch ? Math.max(0, Math.round((Date.now() - S.lastFetch) / 1000)) + "s" : "—";
  if (S.inst && S.bars.length && S.live) { const cl = closedBars(); if (cl.length && S.thinkKey && S.inst.key + "|" + S.tf + "|" + cl[cl.length - 1].t + "|" + cl.length !== S.thinkKey) onData(); }
  if (S.live && !document.hidden) { if (tick % 30 === 0 && S.ctab !== "price" && S.view !== "trade") loadBookTrades(); if (tick % 60 === 0) loadAccount().then(renderAll).catch(() => {}); if (tick % 15 === 0) syncOrders(); } }, 1000);

const DEFAULT = { key: "cb:BTC", kind: "spot", src: "cb", ptype: "SPOT", label: "BTC", name: "BTC-USDC", dataId: "BTC-USD", tradeId: "BTC-USDC", priceInc: "0.01", baseInc: "0.00000001", minQuote: 1, canShort: false, group: "crypto" };
function wireDict() { if (S.dict) return; const d = UNI.cap("dictation"); if (!d) return; S.dict = d; $("micBtn").style.display = "inline-flex"; try { d.onPartial(({ text }) => { $("askIn").value = (S.micBase ? S.micBase + " " : "") + text; }); d.onFinal(({ text }) => { S.micBase = ((S.micBase ? S.micBase + " " : "") + text).trim(); $("askIn").value = S.micBase; }); d.onState(({ state }) => { S.listening = state === "listening"; $("micBtn").textContent = S.listening ? "■" : "🎤"; $("micBtn").style.color = S.listening ? "var(--dn)" : ""; }); } catch (e) {} }
async function boot() {
  try { await UNI.hostReady(1800); } catch (e) {}
  const has = UNI.inClaude, cap = n => has ? window.claude.use(n) : Promise.resolve(UNI.cap(n));
  if (!S.mcp) { try { S.mcp = await cap("mcp"); } catch (e) { S.mcp = null; } }
  if (!has) { try { await UNI.connectAll(); } catch (e) {} }
  cloudLoad();
  if (!S.sample) cap("sample").then(s => { if (s) { S.sample = s; $("askBtn").style.display = "inline-flex"; } }).catch(() => {});
  wireDict();
  if (!S.tts) cap("tts").then(t => { if (t) { S.tts = t; $("voiceBtn").style.display = "inline-flex"; } }).catch(() => {});
  if (!S.mcp) { S.noMcp = true; setMode(); $("connMsg").innerHTML = `<div class="alert">This page needs its live connection to Coinbase and Webull. Open it in Claude and allow the connectors when asked.</div>`; renderAll(); return; }
  try { await loadAccount(); } catch (e) { connMsg(e); renderAll(); return; }
  S.live = true; setMode(); loadLists(); loadActivity(); selectInst(S.inst || DEFAULT);
}
if (window.XVoice && XVoice.isOn() && !UNI.inClaude) { S.voice = true; $("voiceBtn").textContent = "🔊 Voice on"; $("voiceBtn").setAttribute("aria-pressed", true); }
{ const _rd = renderDrawer; renderDrawer = function () { _rd(); const vb = $("drVoiceBox"); if (vb && window.XVoice) XVoice.mount(vb, { btnClass: "btn" }); }; }
if (window.XVoice) XVoice.on(() => { const d = $("drVoice"); if (d) d.checked = !!S.voice; });
window.addEventListener("storage", e => { if (e.key === "xvi_voice_on" && window.XVoice) { const on = XVoice.isOn(); if (on !== !!S.voice) { S.voice = on; $("voiceBtn").textContent = on ? "🔊 Voice on" : "🔈 Voice off"; $("voiceBtn").setAttribute("aria-pressed", on); } } });
S.inst = Object.assign({}, DEFAULT); applyFees(S.inst); setMode(); showView("spot"); renderDrawBar(); renderAll(); boot();
