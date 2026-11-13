/* 16thDNA brain — JavaScript port of engine/{indicators,signals,backtest,metrics,evaluation,gates}.py
   Same rules: causal indicators, signal at close t -> fill at open t+1, stop before target,
   gaps fill at the worse price, costs both sides, one position at a time. */
(function (root) {
"use strict";
const NaN_ = NaN, isF = Number.isFinite;

/* ---------- pandas-compatible primitives ---------- */
// ewm(adjust=False, ignore_na=False, min_periods): leading NaNs skipped, mid NaNs decay the old weight
function ewm(x, alpha, minp) {
  const n = x.length, out = new Array(n).fill(NaN_);
  let y = NaN_, started = false, cnt = 0, oldW = 1;
  for (let i = 0; i < n; i++) {
    const v = x[i];
    if (!started) {
      if (isF(v)) { y = v; started = true; cnt = 1; oldW = 1; }
    } else if (isF(v)) {
      oldW *= (1 - alpha);
      y = (oldW * y + alpha * v) / (oldW + alpha);
      oldW = 1; cnt++;
    } else {
      oldW *= (1 - alpha);
    }
    if (started && cnt >= minp) out[i] = y;
  }
  return out;
}
const emaSpan = (x, len) => ewm(x, 2 / (len + 1), len);
function rollMean(x, len) { const n = x.length, o = new Array(n).fill(NaN_); let s = 0;
  for (let i = 0; i < n; i++) { s += x[i]; if (i >= len) s -= x[i - len]; if (i >= len - 1) o[i] = s / len; } return o; }
function rollStd0(x, len, mean) { const n = x.length, o = new Array(n).fill(NaN_);
  for (let i = len - 1; i < n; i++) { let q = 0; for (let j = i - len + 1; j <= i; j++) { const d = x[j] - mean[i]; q += d * d; } o[i] = Math.sqrt(q / len); } return o; }
function rollMax(x, len) { const n = x.length, o = new Array(n).fill(NaN_);
  for (let i = len - 1; i < n; i++) { let m = -Infinity; for (let j = i - len + 1; j <= i; j++) if (x[j] > m) m = x[j]; o[i] = m; } return o; }
function rollMin(x, len) { const n = x.length, o = new Array(n).fill(NaN_);
  for (let i = len - 1; i < n; i++) { let m = Infinity; for (let j = i - len + 1; j <= i; j++) if (x[j] < m) m = x[j]; o[i] = m; } return o; }
const shift1 = a => [NaN_].concat(a.slice(0, -1));

/* ---------- indicators.py ---------- */
function ema(c, len) { return emaSpan(c, len); }
function rsi(c, len = 14) {
  const n = c.length, g = new Array(n).fill(NaN_), l = new Array(n).fill(NaN_);
  for (let i = 1; i < n; i++) { const d = c[i] - c[i - 1]; g[i] = Math.max(d, 0); l[i] = Math.max(-d, 0); }
  const ag = ewm(g, 1 / len, len), al = ewm(l, 1 / len, len), o = new Array(n).fill(NaN_);
  for (let i = 0; i < n; i++) {
    if (!isF(ag[i])) continue;
    const rs = (al[i] === 0 || !isF(al[i])) ? NaN_ : ag[i] / al[i];
    const v = 100 - 100 / (1 + rs); o[i] = isF(v) ? v : 50;
  }
  return o;
}
function trueRange(h, l, c) { const n = c.length, o = new Array(n);
  for (let i = 0; i < n; i++) { const pc = i === 0 ? c[0] : c[i - 1]; o[i] = Math.max(h[i] - l[i], Math.max(Math.abs(h[i] - pc), Math.abs(l[i] - pc))); } return o; }
function atr(h, l, c, len = 14) { return ewm(trueRange(h, l, c), 1 / len, len); }
function atrPct(h, l, c, len = 14) { const a = atr(h, l, c, len); return a.map((v, i) => v / c[i]); }
function macdHist(c, f = 12, s = 26, sig = 9) { const ef = ema(c, f), es = ema(c, s), line = ef.map((v, i) => v - es[i]); const sg = emaSpan(line, sig); return line.map((v, i) => v - sg[i]); }
function bollingerZ(c, len = 20, k = 2) { const m = rollMean(c, len), sd = rollStd0(c, len, m); return c.map((v, i) => (sd[i] === 0 || !isF(sd[i])) ? NaN_ : (v - m[i]) / (sd[i] * k)); }
function donchian(h, l, len = 20) { const up = shift1(rollMax(h, len)), lo = shift1(rollMin(l, len)); return [up, lo, up.map((v, i) => (v + lo[i]) / 2)]; }
function adx(h, l, c, len = 14) {
  const n = c.length, pdm = new Array(n), mdm = new Array(n);
  for (let i = 0; i < n; i++) {
    const up = i === 0 ? 0 : h[i] - h[i - 1], dn = i === 0 ? 0 : -(l[i] - l[i - 1]);
    pdm[i] = (up > dn && up > 0) ? up : 0; mdm[i] = (dn > up && dn > 0) ? dn : 0;
  }
  const a = 1 / len, at = ewm(trueRange(h, l, c), a, len), pe = ewm(pdm, a, len), me = ewm(mdm, a, len);
  const dx = new Array(n);
  for (let i = 0; i < n; i++) { const p = 100 * pe[i] / at[i], m = 100 * me[i] / at[i], s = p + m; dx[i] = (s === 0 || !isF(s)) ? NaN_ : 100 * Math.abs(p - m) / s; }
  return ewm(dx, a, len);
}
const INDICATORS = {
  sma: (b, p) => rollMean(b.c, p.length), ema: (b, p) => ema(b.c, p.length), rsi: (b, p) => rsi(b.c, p.length || 14),
  atr: (b, p) => atr(b.h, b.l, b.c, p.length || 14), atr_pct: (b, p) => atrPct(b.h, b.l, b.c, p.length || 14),
  macd_hist: (b, p) => macdHist(b.c, p.fast || 12, p.slow || 26, p.signal || 9),
  bollinger_z: (b, p) => bollingerZ(b.c, p.length || 20, p.num_std == null ? 2 : p.num_std),
  donchian_upper: (b, p) => donchian(b.h, b.l, p.length || 20)[0], donchian_lower: (b, p) => donchian(b.h, b.l, p.length || 20)[1],
  donchian_mid: (b, p) => donchian(b.h, b.l, p.length || 20)[2], adx: (b, p) => adx(b.h, b.l, b.c, p.length || 14),
  close: b => b.c.slice(), constant: (b, p) => new Array(b.c.length).fill(p.value)
};

/* ---------- data.py sessions (UTC) ---------- */
function sessions(ts) { return ts.map(t => { const h = new Date(t * 1000).getUTCHours(); let s = "Asia"; if (h >= 7 && h < 16) s = "London"; if (h >= 12 && h < 21) s = "NewYork"; return s; }); }
function makeBars(rows) { // rows: [{t (sec), o,h,l,c,v}] ascending
  const b = { t: rows.map(r => r.t), o: rows.map(r => r.o), h: rows.map(r => r.h), l: rows.map(r => r.l), c: rows.map(r => r.c) };
  b.s = sessions(b.t); b.n = rows.length; return b;
}
function sliceBars(b, s, e) { e = e == null ? b.n : e; const o = {}; for (const k of ["t", "o", "h", "l", "c", "s"]) o[k] = b[k].slice(s, e); o.n = e - s; return o; }

/* ---------- signals.py ---------- */
function evalCond(cond, ser, n) {
  const a = ser[cond.indicator], b = cond.indicator2 != null ? ser[cond.indicator2] : new Array(n).fill(cond.value), out = new Array(n);
  for (let i = 0; i < n; i++) {
    const ai = a[i], bi = b[i], pa = a[(i - 1 + n) % n], pb = b[(i - 1 + n) % n]; let r;
    switch (cond.op) {
      case "crosses_above": r = ai > bi && pa <= pb; break;
      case "crosses_below": r = ai < bi && pa >= pb; break;
      case ">": r = ai > bi; break; case "<": r = ai < bi; break;
      case ">=": r = ai >= bi; break; case "<=": r = ai <= bi; break;
      case "between": r = ai >= cond.value && ai <= cond.value2; break;
    }
    out[i] = !!r;
  }
  out[0] = false; return out;
}
function evalGroup(g, ser, n) {
  if (!g) return new Array(n).fill(false);
  const conds = g.all || g.any, parts = conds.map(c => evalCond(c, ser, n));
  return Array.from({ length: n }, (_, i) => g.all ? parts.every(p => p[i]) : parts.some(p => p[i]));
}
function buildSignals(spec, b) {
  const ser = {}; for (const [k, d] of Object.entries(spec.series)) ser[k] = INDICATORS[d.type](b, d);
  const n = b.n, longE = evalGroup(spec.entry.long, ser, n);
  let shortE = evalGroup(spec.entry.short, ser, n);
  if (spec.risk.allow_short === false) shortE = new Array(n).fill(false);
  const ex = spec.exit.any || spec.exit.all || [];
  let exitS = new Array(n).fill(false);
  if (ex.length) { const parts = ex.map(c => evalCond(c, ser, n)); exitS = exitS.map((_, i) => spec.exit.any ? parts.some(p => p[i]) : parts.every(p => p[i])); }
  if (spec.filters && spec.filters.session) {
    const ok = b.s.map(s => spec.filters.session.includes(s));
    for (let i = 0; i < n; i++) if (!ok[i]) { longE[i] = false; shortE[i] = false; exitS[i] = false; }
  }
  return { long: longE, short: shortE, exit: exitS, ser };
}

/* ---------- backtest.py ---------- */
const DEFAULT_CFG = { capital: 100000, fee: 0.0005, slip: 0.0001, maxLev: 20, warmup: 200, liquidateAtEnd: true };
function runBacktest(spec, b, cfg, startIdx, endIdx) {
  cfg = Object.assign({}, DEFAULT_CFG, cfg || {});
  const sig = buildSignals(spec, b);
  startIdx = startIdx == null ? cfg.warmup : Math.max(startIdx, 1);
  endIdx = endIdx == null ? b.n : Math.min(endIdx, b.n);
  if (endIdx - startIdx < 50) throw new Error("not enough bars to backtest");
  const o = b.o.slice(startIdx, endIdx), h = b.h.slice(startIdx, endIdx), l = b.l.slice(startIdx, endIdx), c = b.c.slice(startIdx, endIdx), ts = b.t.slice(startIdx, endIdx), n = c.length;
  const atrA = atr(b.h, b.l, b.c, 14).slice(startIdx, endIdx);
  const LS = sig.long.slice(startIdx, endIdx), SS = sig.short.slice(startIdx, endIdx), XS = sig.exit.slice(startIdx, endIdx);
  const fee = cfg.fee, slip = cfg.slip, eq = new Array(n); let cash = cfg.capital; eq[0] = cash;
  let pos = 0, size = 0, entryPx = 0, entryI = 0, stop = 0, target = NaN_, riskC = 0, stopDist = 0, entryFee = 0, entrySlip = 0;
  const trades = [];
  function closePos(t, raw, reason, applySlip) {
    const px = applySlip ? raw * (1 - pos * slip) : raw;
    const exitFee = size * px * fee, exitSlip = applySlip ? size * Math.abs(px - raw) : 0;
    cash -= exitFee; const gross = pos * (px - entryPx) * size; cash += gross;
    let hi = -Infinity, lo = Infinity; for (let k = entryI; k <= t; k++) { if (h[k] > hi) hi = h[k]; if (l[k] < lo) lo = l[k]; }
    const mae = pos > 0 ? (lo - entryPx) / stopDist : (entryPx - hi) / stopDist, mfe = pos > 0 ? (hi - entryPx) / stopDist : (entryPx - lo) / stopDist;
    const net = gross - entryFee - exitFee;
    trades.push({ side: pos, entryIdx: startIdx + entryI, exitIdx: startIdx + t, entryTs: ts[entryI], exitTs: ts[t], entryPx, exitPx: px, size, gross, fees: entryFee + exitFee, slipCost: entrySlip + exitSlip, pnl: net, r: riskC ? net / riskC : 0, mae, mfe, reason });
    pos = 0; size = 0; entryPx = 0; target = NaN_; entryFee = 0; entrySlip = 0;
  }
  for (let t = 1; t < n; t++) {
    let exited = false;
    if (pos !== 0 && XS[t - 1]) { closePos(t, o[t], "signal", true); exited = true; }
    if (pos !== 0) {
      if (pos > 0) { if (l[t] <= stop) closePos(t, Math.min(stop, o[t]), "stop", true); else if (isF(target) && h[t] >= target) closePos(t, Math.max(target, o[t]), "target", false); }
      else { if (h[t] >= stop) closePos(t, Math.max(stop, o[t]), "stop", true); else if (isF(target) && l[t] <= target) closePos(t, Math.min(target, o[t]), "target", false); }
    }
    if (pos !== 0 && (t - entryI) >= spec.risk.time_stop_bars) closePos(t, c[t], "time", true);
    if (pos === 0 && !exited) {
      let side = 0; if (LS[t - 1] && !SS[t - 1]) side = 1; else if (SS[t - 1] && !LS[t - 1]) side = -1;
      if (side !== 0 && isF(atrA[t - 1]) && atrA[t - 1] > 0) {
        stopDist = spec.risk.stop_atr_mult * atrA[t - 1];
        const ef = o[t] * (1 + side * slip);
        riskC = cash * spec.risk.risk_per_trade_pct / 100;
        size = stopDist > 0 ? riskC / stopDist : 0;
        const cap = cfg.maxLev * cash; if (size * ef > cap) size = cap / ef;
        if (size > 0) {
          entryFee = size * ef * fee; entrySlip = size * Math.abs(ef - o[t]); cash -= entryFee;
          pos = side; entryPx = ef; entryI = t; stop = ef - side * stopDist;
          target = spec.risk.target_atr_mult ? ef + side * spec.risk.target_atr_mult * atrA[t - 1] : NaN_;
        }
      }
    }
    eq[t] = pos === 0 ? cash : cash + pos * (c[t] - entryPx) * size;
  }
  if (cfg.liquidateAtEnd && pos !== 0) { closePos(n - 1, c[n - 1], "eod", true); eq[n - 1] = cash; }
  return { name: spec.name, ts, eq, trades, startIdx };
}

/* ---------- metrics.py ---------- */
function resampleLast(ts, eq, periodSec) { const out = []; let key = null;
  for (let i = 0; i < ts.length; i++) { const k = Math.floor(ts[i] / periodSec); if (k !== key) { out.push(eq[i]); key = k; } else out[out.length - 1] = eq[i]; } return out; }
function sharpeOf(series, ann = 252) {
  const r = []; for (let i = 1; i < series.length; i++) { const v = series[i] / series[i - 1] - 1; if (isF(v)) r.push(v); }
  if (r.length < 2) return 0; const m = r.reduce((a, b) => a + b, 0) / r.length;
  const sd = Math.sqrt(r.reduce((a, b) => a + (b - m) * (b - m), 0) / (r.length - 1));
  if (!sd || !isF(sd)) return 0; return m / sd * Math.sqrt(ann);
}
function maxDD(eq) { let pk = -Infinity, w = 0; for (const v of eq) { if (v > pk) pk = v; w = Math.min(w, v / pk - 1); } return -w; }
function summarize(res, capital, periodSec) {
  const tr = res.trades, n = tr.length, fin = res.eq[res.eq.length - 1];
  const wins = tr.filter(t => t.pnl > 0), losses = tr.filter(t => t.pnl <= 0);
  const gw = wins.reduce((a, t) => a + t.pnl, 0), gl = -losses.reduce((a, t) => a + t.pnl, 0);
  const pf = gl > 0 ? gw / gl : (gw > 0 ? Infinity : 0);
  const rs = tr.map(t => t.r);
  return { trades: n, retPct: (fin / capital - 1) * 100, sharpe: sharpeOf(resampleLast(res.ts, res.eq, periodSec || 86400)),
    maxDDPct: maxDD(res.eq) * 100, winPct: n ? 100 * wins.length / n : 0, pf: isF(pf) ? pf : null,
    expR: n ? rs.reduce((a, b) => a + b, 0) / n : 0, fees: tr.reduce((a, t) => a + t.fees, 0),
    avgBars: n ? tr.reduce((a, t) => a + (t.exitIdx - t.entryIdx), 0) / n : 0 };
}

/* ---------- evaluation.py: regimes ---------- */
function quantile(sorted, q) { if (!sorted.length) return NaN_; const p = (sorted.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); }
function regimeLabels(b, splitIdx) {
  const ap = atrPct(b.h, b.l, b.c, 14), train = ap.slice(0, splitIdx).filter(isF).sort((a, c) => a - c);
  let lo, hi; if (train.length < 100) { const all = ap.filter(isF).sort((a, c) => a - c); lo = hi = quantile(all, 0.5); } else { lo = quantile(train, 1 / 3); hi = quantile(train, 2 / 3); }
  const vol = ap.map(v => !isF(v) ? "unknown" : v >= hi ? "high_vol" : v <= lo ? "low_vol" : "mid_vol");
  const ax = adx(b.h, b.l, b.c, 14), trend = ax.map(v => !isF(v) ? "unknown" : v >= 25 ? "trending" : "ranging");
  return { vol, trend, adx: ax, atrPct: ap, lo, hi };
}
function regimeStats(res, labels) {
  const by = {}; for (const t of res.trades) { const k = labels[t.entryIdx] || "unknown"; (by[k] = by[k] || []).push(t); }
  const out = {}; for (const [k, ts] of Object.entries(by)) { const r = ts.map(t => t.r); out[k] = { trades: ts.length, expR: r.reduce((a, b) => a + b, 0) / ts.length, winPct: 100 * r.filter(x => x > 0).length / ts.length,
    stopShare: ts.filter(t => t.reason === "stop").length / ts.length, timeShare: ts.filter(t => t.reason === "time").length / ts.length, targetShare: ts.filter(t => t.reason === "target").length / ts.length }; }
  return out;
}

/* ---------- strategies.py: the six seeds (verbatim) ---------- */
const SEEDS = [
  { name: "EMA_BREAKOUT_V1", family: "trend", series: { ema_fast: { type: "ema", length: 21 }, ema_slow: { type: "ema", length: 55 }, atr_pct: { type: "atr_pct", length: 14 } },
    entry: { long: { all: [{ indicator: "ema_fast", op: "crosses_above", indicator2: "ema_slow" }, { indicator: "atr_pct", op: ">", value: 0.00025 }] },
             short: { all: [{ indicator: "ema_fast", op: "crosses_below", indicator2: "ema_slow" }, { indicator: "atr_pct", op: ">", value: 0.00025 }] } },
    exit: { any: [{ indicator: "ema_fast", op: "crosses_below", indicator2: "ema_slow" }] },
    risk: { stop_atr_mult: 1.8, target_atr_mult: 3.6, time_stop_bars: 96, risk_per_trade_pct: 0.5, allow_short: true }, filters: { session: ["London", "NewYork"] },
    notes: "Classic fast/slow EMA cross, filtered out of dead volatility." },
  { name: "DONCHIAN_TREND_V1", family: "trend", series: { close: { type: "close" }, dc_up: { type: "donchian_upper", length: 55 }, dc_mid: { type: "donchian_mid", length: 55 }, adx: { type: "adx", length: 14 } },
    entry: { long: { all: [{ indicator: "close", op: "crosses_above", indicator2: "dc_up" }, { indicator: "adx", op: ">", value: 20 }] } },
    exit: { any: [{ indicator: "close", op: "<", indicator2: "dc_mid" }] },
    risk: { stop_atr_mult: 2.2, target_atr_mult: 6.0, time_stop_bars: 240, risk_per_trade_pct: 0.5, allow_short: false }, filters: {},
    notes: "55-bar channel breakout with a trend-strength filter, long only." },
  { name: "RSI_REVERSION_V1", family: "meanrev", series: { rsi2: { type: "rsi", length: 2 }, rsi14: { type: "rsi", length: 14 } },
    entry: { long: { all: [{ indicator: "rsi2", op: "<", value: 10 }] }, short: { all: [{ indicator: "rsi2", op: ">", value: 90 }] } },
    exit: { any: [{ indicator: "rsi2", op: ">", value: 65 }, { indicator: "rsi2", op: "<", value: 35 }] },
    risk: { stop_atr_mult: 2.0, target_atr_mult: 2.0, time_stop_bars: 24, risk_per_trade_pct: 0.4, allow_short: true }, filters: { session: ["London", "NewYork"] },
    notes: "Two-period RSI exhaustion fade." },
  { name: "BOLLINGER_FADE_V1", family: "meanrev", series: { bz: { type: "bollinger_z", length: 20, num_std: 2.0 }, adx: { type: "adx", length: 14 } },
    entry: { long: { all: [{ indicator: "bz", op: "<", value: -1.8 }, { indicator: "adx", op: "<", value: 22 }] },
             short: { all: [{ indicator: "bz", op: ">", value: 1.8 }, { indicator: "adx", op: "<", value: 22 }] } },
    exit: { any: [{ indicator: "bz", op: "between", value: -0.25, value2: 0.25 }] },
    risk: { stop_atr_mult: 2.4, target_atr_mult: 2.4, time_stop_bars: 48, risk_per_trade_pct: 0.4, allow_short: true }, filters: {},
    notes: "Fade two-sigma extensions, only when the market is not trending." },
  { name: "ATR_MOMENTUM_V1", family: "breakout", series: { close: { type: "close" }, dc_up: { type: "donchian_upper", length: 12 }, dc_dn: { type: "donchian_lower", length: 12 }, atr_pct: { type: "atr_pct", length: 14 } },
    entry: { long: { all: [{ indicator: "close", op: "crosses_above", indicator2: "dc_up" }, { indicator: "atr_pct", op: ">", value: 0.0004 }] },
             short: { all: [{ indicator: "close", op: "crosses_below", indicator2: "dc_dn" }, { indicator: "atr_pct", op: ">", value: 0.0004 }] } },
    exit: { any: [{ indicator: "close", op: "crosses_below", indicator2: "dc_up" }] },
    risk: { stop_atr_mult: 1.5, target_atr_mult: 3.0, time_stop_bars: 72, risk_per_trade_pct: 0.5, allow_short: true }, filters: {},
    notes: "Short-channel breakout that only fires when volatility is expanding." },
  { name: "RANGE_BREAKOUT_V1", family: "breakout", series: { close: { type: "close" }, dc_up: { type: "donchian_upper", length: 20 }, dc_mid: { type: "donchian_mid", length: 20 }, ema200: { type: "ema", length: 200 } },
    entry: { long: { all: [{ indicator: "close", op: "crosses_above", indicator2: "dc_up" }, { indicator: "close", op: ">", indicator2: "ema200" }] } },
    exit: { any: [{ indicator: "close", op: "<", indicator2: "dc_mid" }] },
    risk: { stop_atr_mult: 1.6, target_atr_mult: 4.0, time_stop_bars: 120, risk_per_trade_pct: 0.5, allow_short: false }, filters: {},
    notes: "20-bar breakout, only with the 200-EMA as a regime filter." }
];
const clone = o => JSON.parse(JSON.stringify(o));
function longOnly(spec) { const s = clone(spec); s.risk.allow_short = false; delete s.entry.short; return s; }

/* ---------- gates.py ---------- */
const LADDER = [2, 3, 5, 8, 10, 12, 14, 16, 18, 20, 21, 24, 26, 30, 34, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 150, 200];
function neighbours(v) { const i = LADDER.indexOf(v); if (i <= 0 || i >= LADDER.length - 1) return null; return [LADDER[i - 1], LADDER[i + 1]]; }
function nudgeCandidates(spec) { const out = [];
  for (const [k, d] of Object.entries(spec.series)) for (const f of ["length", "fast", "slow", "signal"]) { if (d[f] == null) continue; const p = neighbours(d[f]); if (p) out.push([k, f, d[f], p[0], p[1]]); }
  return out; }
function rng32(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ri = (r, a, b) => a + Math.floor(r() * (b - a)), ru = (r, a, b) => a + r() * (b - a), rc = (r, arr) => arr[Math.floor(r() * arr.length)];
function randomSpec(r, ref) {
  const ap = atrPct(ref.h, ref.l, ref.c, 14).filter(isF).sort((a, b) => a - b);
  const q = ap.length ? quantile(ap, ru(r, 0.3, 0.7)) : 0.0004;
  const stop = Math.round(ru(r, 1.2, 3.0) * 100) / 100, target = Math.round(Math.max(stop * ru(r, 1.0, 2.5), stop * 0.5) * 100) / 100;
  const risk = { stop_atr_mult: stop, target_atr_mult: target, time_stop_bars: rc(r, [24, 48, 72, 96, 120, 240]), risk_per_trade_pct: 0.5, allow_short: true };
  const tpl = ri(r, 0, 5); let s;
  if (tpl === 0) { const f = ri(r, 5, 30), sl = ri(r, 30, 120); s = { name: "NULL_MA", family: "trend", series: { fast: { type: "ema", length: f }, slow: { type: "ema", length: sl }, atr_pct: { type: "atr_pct", length: 14 } },
      entry: { long: { all: [{ indicator: "fast", op: "crosses_above", indicator2: "slow" }, { indicator: "atr_pct", op: ">", value: q }] }, short: { all: [{ indicator: "fast", op: "crosses_below", indicator2: "slow" }, { indicator: "atr_pct", op: ">", value: q }] } },
      exit: { any: [{ indicator: "fast", op: "crosses_below", indicator2: "slow" }] } }; }
  else if (tpl === 1) { const L = ri(r, 10, 100); s = { name: "NULL_CHANNEL", family: "breakout", series: { close: { type: "close" }, upper: { type: "donchian_upper", length: L }, mid: { type: "donchian_mid", length: L } },
      entry: { long: { all: [{ indicator: "close", op: "crosses_above", indicator2: "upper" }] } }, exit: { any: [{ indicator: "close", op: "<", indicator2: "mid" }] }, risk: Object.assign({}, risk, { allow_short: false }) }; }
  else if (tpl === 2) { const L = rc(r, [2, 3, 5, 7, 14]), lo = ri(r, 5, 25), hi = ri(r, 70, 95); s = { name: "NULL_RSI", family: "meanrev", series: { rsi: { type: "rsi", length: L } },
      entry: { long: { all: [{ indicator: "rsi", op: "<", value: lo }] }, short: { all: [{ indicator: "rsi", op: ">", value: hi }] } }, exit: { any: [{ indicator: "rsi", op: "between", value: 45, value2: 55 }] } }; }
  else if (tpl === 3) { const L = ri(r, 15, 50), z = Math.round(ru(r, 1.2, 2.5) * 100) / 100; s = { name: "NULL_BAND", family: "meanrev", series: { z: { type: "bollinger_z", length: L, num_std: 2.0 } },
      entry: { long: { all: [{ indicator: "z", op: "<", value: -z }] }, short: { all: [{ indicator: "z", op: ">", value: z }] } }, exit: { any: [{ indicator: "z", op: "between", value: -0.3, value2: 0.3 }] } }; }
  else { const sl = ri(r, 60, 200); s = { name: "NULL_TREND", family: "trend", series: { close: { type: "close" }, slow: { type: "ema", length: sl }, hist: { type: "macd_hist", fast: 12, slow: 26, signal: 9 } },
      entry: { long: { all: [{ indicator: "close", op: ">", indicator2: "slow" }, { indicator: "hist", op: "crosses_above", value: 0 }] } }, exit: { any: [{ indicator: "hist", op: "crosses_below", value: 0 }] }, risk: Object.assign({}, risk, { allow_short: false }) }; }
  if (!s.risk) s.risk = risk; s.filters = {}; return s;
}
function alignRisk(nullSpec, cand) { const d = clone(nullSpec); d.risk = clone(cand.risk);
  if (d.risk.allow_short === false) { if (d.entry.short && !d.entry.long) d.risk.allow_short = true; else delete d.entry.short; } return d; }
function gate1(spec, b, cfg, opt) {
  opt = Object.assign({ trainFrac: 0.7, nRandom: 100, pctThresh: 0.75, seed: 20261111, periodSec: 86400 }, opt || {});
  const split = Math.floor(b.n * opt.trainFrac);
  if (split < 500 || b.n - split < 300) return { gate: "unseen_data", passed: false, observed: 0, threshold: opt.pctThresh, detail: { reason: "not_enough_bars", bars: b.n } };
  const train = sliceBars(b, 0, split), hold = sliceBars(b, split);
  const cand = runBacktest(spec, hold, cfg), cs = sharpeOf(resampleLast(cand.ts, cand.eq, opt.periodSec));
  const r = rng32(opt.seed), nulls = [];
  for (let i = 0; i < opt.nRandom; i++) { const ns = alignRisk(randomSpec(r, train), spec); try { const res = runBacktest(ns, hold, cfg); const v = sharpeOf(resampleLast(res.ts, res.eq, opt.periodSec)); if (isF(v)) nulls.push(v); } catch (e) {} }
  const pct = nulls.length ? nulls.filter(v => v < cs).length / nulls.length : 0;
  const srt = nulls.slice().sort((a, c) => a - c);
  return { gate: "unseen_data", passed: cs > 0 && pct >= opt.pctThresh, observed: pct, threshold: opt.pctThresh,
    detail: { holdoutSharpe: cs, holdoutTrades: cand.trades.length, nullMedian: quantile(srt, 0.5), nullP95: quantile(srt, 0.95), nullN: nulls.length, split } };
}
function gate2(spec, b, cfg, minShare = 0.5, minVariants = 4) {
  const cands = nudgeCandidates(spec);
  if (cands.length * 2 < minVariants) return { gate: "parameter_nudge", passed: false, observed: 0, threshold: minShare, detail: { reason: "too_few_nudgeable_parameters", variants: cands.length * 2 } };
  const rows = []; let prof = 0; const capital = (cfg && cfg.capital) || DEFAULT_CFG.capital;
  for (const [k, f, cur, lo, hi] of cands) for (const [dir, v] of [["down", lo], ["up", hi]]) {
    const s = clone(spec); s.series[k][f] = v; let res; try { res = runBacktest(s, b, cfg); } catch (e) { continue; }
    const ret = res.eq[res.eq.length - 1] / capital - 1; rows.push({ series: k, field: f, from: cur, to: v, dir, retPct: ret * 100 }); if (ret > 0) prof++;
  }
  const share = rows.length ? prof / rows.length : 0;
  return { gate: "parameter_nudge", passed: share >= minShare && rows.length >= minVariants, observed: share, threshold: minShare, detail: { variants: rows.length, profitable: prof, rows } };
}
function ddFromR(r) { let cum = 0, pk = 0, w = 0; for (const x of r) { cum += x; pk = Math.max(pk, cum); w = Math.max(w, pk - cum); } return w; }
function gate3(spec, b, cfg, nShuf = 1000, breach = 0.2, mult = 1.5, seed = 7) {
  const res = runBacktest(spec, b, cfg), r = res.trades.map(t => t.r);
  if (r.length < 20) return { gate: "trade_shuffle", passed: false, observed: 1, threshold: breach, detail: { reason: "too_few_trades", trades: r.length } };
  const orig = ddFromR(r), rand = rng32(seed); let over = 0; const dds = [];
  for (let i = 0; i < nShuf; i++) { const a = r.slice(); for (let j = a.length - 1; j > 0; j--) { const k = Math.floor(rand() * (j + 1)); [a[j], a[k]] = [a[k], a[j]]; } const d = ddFromR(a); dds.push(d); if (d > mult * orig) over++; }
  const rate = orig > 0 ? over / nShuf : 1; dds.sort((a, c) => a - c);
  return { gate: "trade_shuffle", passed: rate < breach, observed: rate, threshold: breach, detail: { trades: r.length, origDD: orig, ddP50: quantile(dds, 0.5), ddP95: quantile(dds, 0.95) } };
}
function runGates(spec, b, cfg, opt) { const o = [gate1(spec, b, cfg, opt), gate2(spec, b, cfg), gate3(spec, b, cfg)]; return { verdict: o.every(x => x.passed) ? "pass" : "fail", outcomes: o }; }

const API = { ewm, ema, rsi, atr, atrPct, macdHist, bollingerZ, donchian, adx, trueRange, makeBars, sliceBars, sessions, buildSignals, runBacktest, summarize, sharpeOf, resampleLast, maxDD,
  regimeLabels, regimeStats, SEEDS, longOnly, clone, gate1, gate2, gate3, runGates, nudgeCandidates, randomSpec, rng32, DEFAULT_CFG };
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.DNA = API;
})(typeof self !== "undefined" ? self : this);
