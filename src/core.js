/* Coach core: turns bars + instrument + fees into the brain's recommendation. Pure functions (no DOM). */
(function (root) {
"use strict";
const D = (typeof module !== "undefined" && module.exports) ? require("./brain.js") : root.DNA;
const isF = Number.isFinite;
const NICE = { EMA_BREAKOUT_V1: "EMA Breakout", DONCHIAN_TREND_V1: "Donchian Trend", RSI_REVERSION_V1: "RSI Reversion", BOLLINGER_FADE_V1: "Bollinger Fade", ATR_MOMENTUM_V1: "ATR Momentum", RANGE_BREAKOUT_V1: "Range Breakout" };
const FAMILY = { trend: "Trend", meanrev: "Mean reversion", breakout: "Breakout" };
const SER_LABEL = { ema_fast: "EMA 21", ema_slow: "EMA 55", atr_pct: "volatility (ATR%)", close: "price", dc_up: "channel high", dc_dn: "channel low", dc_mid: "channel middle", adx: "trend strength (ADX)", rsi2: "RSI(2)", rsi14: "RSI(14)", bz: "Bollinger z-score", ema200: "EMA 200" };
const OP_TXT = { crosses_above: "crosses above", crosses_below: "crosses below", ">": "is above", "<": "is below", ">=": "is at or above", "<=": "is at or below", between: "is between" };

function condRows(group, ser, i) {
  if (!group) return [];
  return (group.all || group.any).map(c => {
    const a = ser[c.indicator][i], b = c.indicator2 != null ? ser[c.indicator2][i] : c.value;
    const pa = ser[c.indicator][i - 1], pb = c.indicator2 != null ? ser[c.indicator2][i - 1] : c.value;
    let ok;
    switch (c.op) { case "crosses_above": ok = a > b && pa <= pb; break; case "crosses_below": ok = a < b && pa >= pb; break;
      case ">": ok = a > b; break; case "<": ok = a < b; break; case ">=": ok = a >= b; break; case "<=": ok = a <= b; break; case "between": ok = a >= c.value && a <= c.value2; break; }
    const rhs = c.indicator2 != null ? SER_LABEL[c.indicator2] || c.indicator2 : (c.op === "between" ? c.value + " and " + c.value2 : String(c.value));
    return { ok: !!ok, text: (SER_LABEL[c.indicator] || c.indicator) + " " + OP_TXT[c.op] + " " + rhs, a, b };
  });
}

/* inst: {kind:'spot'|'stock'|'future'|'perp', canShort, feeIn, feeOut, slip}  bars: closed bars only */
function think(rows, inst, tfSec, opt) {
  opt = opt || {};
  const b = D.makeBars(rows), n = b.n, last = n - 1;
  const cfg = { capital: 100000, fee: inst.feeIn, slip: inst.slip == null ? 0.0001 : inst.slip, maxLev: inst.kind === "spot" || inst.kind === "stock" ? 1 : 20, warmup: 200 };
  const out = { n, tfSec, enough: n >= 400, gateReady: n >= 1000, strategies: [] };
  if (n < 260) return out;
  const reg = D.regimeLabels(b, Math.floor(n * 0.7));
  const atrA = D.atr(b.h, b.l, b.c, 14), e21 = D.ema(b.c, 21), e55 = D.ema(b.c, 55);
  out.regime = { vol: reg.vol[last], trend: reg.trend[last], adx: reg.adx[last], atrPct: reg.atrPct[last], volLo: reg.lo, volHi: reg.hi, session: b.s[last] };
  out.atr = atrA[last]; out.close = b.c[last]; out.e21 = e21; out.e55 = e55; out.lastT = b.t[last];
  out.bias = e21[last] > e55[last] ? 1 : -1;
  const periodSec = tfSec * 24; // engine: daily closes on 1h bars = every 24 bars
  for (const seed of D.SEEDS.concat(opt.extra || [])) {
    const spec = inst.canShort ? D.clone(seed) : D.longOnly(seed);
    if (tfSec >= 86400 && spec.filters) delete spec.filters.session;
    const sig = D.buildSignals(spec, b);
    const sessOk = !(spec.filters && spec.filters.session) || spec.filters.session.includes(b.s[last]);
    let side = 0; if (sig.long[last] && !sig.short[last]) side = 1; else if (sig.short[last] && !sig.long[last]) side = -1;
    const st = { name: seed.name, nice: NICE[seed.name] || (NICE[seed.name.replace(/_V\d+$/, "_V1")] || seed.name) + " " + seed.name.match(/V\d+$/)[0] + " (lab)", family: FAMILY[seed.family], notes: seed.notes, spec, side, sessOk,
      sessions: spec.filters && spec.filters.session ? spec.filters.session : null,
      longConds: condRows(spec.entry.long, sig.ser, last), shortConds: inst.canShort ? condRows(spec.entry.short, sig.ser, last) : [],
      longOnly: !spec.entry.short };
    // bars since last signal
    let ago = -1; for (let i = last; i >= Math.max(1, last - 500); i--) if (sig.long[i] || sig.short[i]) { ago = last - i; break; }
    st.lastSignalAgo = ago;
    try {
      const res = D.runBacktest(spec, b, cfg);
      st.bt = D.summarize(res, cfg.capital, periodSec);
      st.byVol = D.regimeStats(res, reg.vol); st.byTrend = D.regimeStats(res, reg.trend);
      st.inRegime = { vol: st.byVol[out.regime.vol] || null, trend: st.byTrend[out.regime.trend] || null };
    } catch (e) { st.bt = null; }
    if (out.gateReady && !opt.skipGates) {
      try { st.gates = D.runGates(spec, b, cfg, { periodSec, nRandom: opt.nRandom || 100 }); } catch (e) { st.gates = null; }
    }
    st.gatePass = !!(st.gates && st.gates.verdict === "pass");
    st.status = side !== 0 ? (st.gatePass ? "signal" : "refused") : (st.gatePass ? "approved_waiting" : "no_signal");
    out.strategies.push(st);
  }
  // recommendation: a live signal that passed every gate, else nothing
  out.pick = out.strategies.find(s => s.status === "signal") || null;
  out.refusedSignals = out.strategies.filter(s => s.status === "refused");
  out.approved = out.strategies.filter(s => s.gatePass);
  return out;
}

/* Build a plan the engine's way: stop = k x ATR, target = m x ATR, risk % of equity, exposure cap. */
function plan(st, side, entry, atr, inst, acct) {
  const r = st.spec.risk, stopDist = r.stop_atr_mult * atr, tgtDist = (r.target_atr_mult || 0) * atr;
  const stop = entry - side * stopDist, target = entry + side * tgtDist;
  const riskPct = (acct.riskPct != null ? acct.riskPct : r.risk_per_trade_pct) / 100, riskUSD = acct.balance * riskPct;
  const fi = inst.feeIn, foStop = inst.feeOutTaker, foTgt = inst.feeOut;
  const mult = inst.contractSize || 1;                 // units of underlying per contract (1 for spot/stock)
  const lossPerUnit = stopDist + entry * fi + stop * foStop;   // per 1 unit of underlying
  const winPerUnit = tgtDist - entry * fi - target * foTgt;
  let units = lossPerUnit > 0 ? riskUSD / lossPerUnit : 0, note = [];
  const p = { side, entry, stop, target, stopDist, tgtDist, riskUSD, riskPct, timeStopBars: r.time_stop_bars, stopMult: r.stop_atr_mult, tgtMult: r.target_atr_mult };
  if (inst.kind === "future" || inst.kind === "perp") {
    let contracts = Math.floor(units / mult + 1e-9);
    const oneRisk = lossPerUnit * mult, marginRate = inst.kind === "future" ? (side > 0 ? inst.marginLong : inst.marginShort) : 1 / (inst.maxLev || 10);
    const marginPer = entry * mult * marginRate;
    p.contracts = contracts; p.oneContractRisk = oneRisk; p.marginPer = marginPer; p.marginRate = marginRate;
    p.minContracts = Math.max(1, inst.minContracts || 1);
    if (contracts < p.minContracts) { p.tooSmall = true; contracts = p.minContracts; p.forced = true; }
    const capUnits = 5 * acct.balance / entry; if (contracts * mult > capUnits && !p.forced) contracts = Math.floor(capUnits / mult);
    p.qty = contracts; units = contracts * mult; p.margin = marginPer * contracts; p.affordable = p.margin <= acct.balance;
    p.liqMove = units > 0 ? acct.balance / units : null; // rough: move that eats the whole balance
    p.liqPrice = p.liqMove != null ? entry - side * p.liqMove : null;
  } else {
    const cap = acct.balance * 0.98 / entry; if (units > cap) { units = cap; p.capped = true; }
    const inc = parseFloat(inst.baseInc) || 1e-8; units = Math.floor(units / inc + 1e-9) * inc;
    p.qty = units; p.affordable = true;
  }
  p.units = units; p.notional = units * entry;
  p.netLoss = units * lossPerUnit; p.netWin = units * winPerUnit;
  p.grossRR = tgtDist / stopDist; p.netRR = p.netLoss > 0 ? p.netWin / p.netLoss : 0;
  p.fees = { entry: units * entry * fi, stop: units * stop * foStop, target: units * target * foTgt };
  p.breakEvenMove = entry * (fi + foTgt) / (1 - foTgt);
  p.lossPctOfAcct = acct.balance > 0 ? p.netLoss / acct.balance : 0;
  return p;
}

const API = { think, plan, NICE, condRows };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.COACH = API;
})(typeof self !== "undefined" ? self : this);
