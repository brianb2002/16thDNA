# 16thDNA — engine, phases 0–9

A working implementation of *16thDNA*: a research platform that generates
trading strategies, tests them, and refuses to ship the ones that only work in
hindsight. Real bars, real costs, real refusals.

It is deliberately not a profitable strategy. In its current state the platform
rejects **every** candidate it generates — including one that returned +25%
in-sample and one the agent layer approved. That is the intended output.

## Quickstart

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

python scripts/fetch_data.py --intervals 15m,1h   # phase 0
python scripts/demo.py --timeframe 1h             # phases 1-2
python scripts/evaluate.py --timeframe 1h         # phase 3
python scripts/rejection_demo.py --farm 200       # phase 4
python scripts/full_loop.py --farm 120            # phases 5-9, writes out/full_loop.json
uvicorn app.server:app --port 8077                # phase 6 dashboard
pytest -q                                         # 62 tests
```

## What each phase delivers

| Phase | Module | What it proves |
|---|---|---|
| 0 Data | `engine/data.py` | Bars are clean, monotonic, timezone-correct, session-tagged; defects are reported, never silently repaired |
| 1 Backtest | `engine/backtest.py` | Signal at close `t` fills at open `t+1`; stop before target; gaps fill at the worse price; costs on both sides |
| 2 Spec | `engine/spec.py`, `engine/strategies.py` | Strategies are validated JSON, not code; six seeds across three families |
| 3 Evaluation | `engine/evaluation.py` | Three anchored walk-forward folds; machine-readable weakness report |
| 4 Gates | `engine/gates.py`, `engine/validator.py` | Random-baseline holdout, parameter nudge, trade shuffle, HMAC-signed verdicts |
| 5 Registry | `engine/registry.py` | State machine; no path to `gated`/`paper`/`live` without a signed pass |
| 6 Dashboard | `app/` | Every panel driven by gate results and fills, including the failures |
| 7 Paper | `engine/execution.py` | Broker adapter, risk limits, daily-loss halt, decay rule, kill switch |
| 8 Agents | `engine/agents.py` | Four roles with a tool boundary that makes self-approval impossible |
| 9 Live | `engine/execution.py` | `LiveBroker` interface + `ReplayLiveBroker` and paper↔live reconciliation |

## The four tests that make the numbers mean anything

`tests/test_engine.py`:

1. **No lookahead** — truncating the future cannot change a past signal (synthetic and real bars).
2. **Cost accounting** — trade P&L reconciles to the equity curve to 1e-9; a costed run loses exactly `2 × (cost + slippage)` per round trip.
3. **Drawdown maths** — vectorised max DD agrees with an explicit scan to 1e-12.
4. **Determinism** — identical inputs, identical trades and equity.

## Results on real data

GC=F (COMEX gold, the closest continuously quoted XAUUSD proxy), 1h bars,
2024-06-23 → 2026-11-12, 13,656 bars, 5 bps commission + 1 bp slippage per side.

| Strategy | Trades | Return | Sharpe | Max DD | PF | Exp (R) |
|---|---:|---:|---:|---:|---:|---:|
| EMA_BREAKOUT_V1 | 134 | −6.98% | −0.46 | 12.39% | 0.86 | −0.10 |
| DONCHIAN_TREND_V1 | 127 | +12.92% | 0.77 | 6.16% | 1.31 | +0.20 |
| RSI_REVERSION_V1 | 1,393 | −59.56% | −6.50 | 59.70% | 0.41 | −0.16 |
| BOLLINGER_FADE_V1 | 14 | +0.09% | 0.04 | 1.45% | 1.04 | +0.02 |
| ATR_MOMENTUM_V1 | 1,136 | −70.27% | −3.80 | 70.95% | 0.52 | −0.21 |
| RANGE_BREAKOUT_V1 | 294 | −4.87% | −0.18 | 10.35% | 0.95 | −0.03 |

### The gate run that matters

A farm of 126 candidates, ranked by in-sample return on the training window:

- winner: **+25.2% in-sample, Sharpe 2.16, max DD 2.5%** — the kind of equity curve that gets posted on the internet
- holdout: **−0.5%, Sharpe −0.17**
- Gate 1: **FAIL** — 91st percentile against 100 random strategies, but the holdout Sharpe is negative, so it fails anyway
- Gate 2: PASS (all four nudged variants still profitable) · Gate 3: PASS (little path dependence)
- registry: **refused**, state `rejected`
- tamper test: editing the stored payload to `pass` invalidates the HMAC → **refused**

### The agent run that matters

Four agents on EMA_BREAKOUT: research read the weakness report, hypothesis proposed
widening the ATR stop from 1.8 to 2.4, implementation wrote the patch, and the
reviewer **approved** it (profit factor 0.86 → 0.93, max DD 12.39% → 10.05%).

The gates then rejected the identical candidate: Gate 1 FAIL (holdout percentile 0.80)
and Gate 2 FAIL (0.00 — no nudged variant stayed profitable). The agent layer's
approval bought it nothing, because it has no key and no write access to `gate_runs`.

## Architecture

```
bars ──► strategy spec ──► backtest ──► evaluation ──► weakness report
                                    ▲                         │
                                    │                         ▼
                              gates (signed) ◄── research agents (patch only)
                                    │
                             registry / state machine
                                    │
                        paper trading ──► reconciliation ──► live adapter
```

## Structure

```
engine/
  config.py      cost model, backtest config, walk-forward config
  data.py        Bars, integrity report, sessions, synthetic generator
  indicators.py  causal indicator library
  spec.py        Pydantic strategy schema + canonical hash
  signals.py     spec -> boolean signal arrays
  backtest.py    event-driven simulator, Trade records, MTM equity
  metrics.py     performance/risk metrics, two drawdown implementations
  strategies.py  six seed strategies
  evaluation.py  walk-forward folds, regime labels, weakness report
  gates.py       three gates + random-strategy baseline
  validator.py   HMAC signing, verification, the require_pass choke point
  registry.py    SQLite state machine that refuses unsigned promotions
  execution.py   PaperBroker, RiskManager, run_paper, LiveBroker, reconcile
  agents.py      four roles + Toolbox with a deliberately tiny surface
app/
  server.py      FastAPI dashboard API
  templates/     dashboard UI
scripts/
  fetch_data.py, demo.py, evaluate.py, rejection_demo.py, full_loop.py
tests/           62 tests
```

## Known limitations

- **Data** is a futures proxy, not spot XAUUSD. Swap in a broker feed via `from_dataframe`; nothing else changes.
- **Gates are expensive by design.** 100 random specs per candidate means the farm is fast and validation is slow — which is the correct asymmetry.
- **Live trading is an interface, not an adapter.** `LiveBroker` raises `NotImplementedError` on purpose; `ReplayLiveBroker` exists so reconciliation can be tested first.
- **One position per strategy**, fixed ATR stops, no trailing stops or partial exits.
- **Agents can only change parameters**, not add logic. That is a deliberate safety limit, and it caps how much the loop can improve.
- **The dashboard is single-user and read-mostly**; the kill switch flips an in-process flag.
