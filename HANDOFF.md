# 16th DNA Desk — handoff notes (for the next AI or developer)

Repo: `brianb2002/16thDNA`, branch `claude/dreamy-davinci-82ab56`. Everything below is committed there.
Published page: the "16th DNA Desk" artifact (claude.ai). Rebuild it with `cd dna && python3 build.py`, which writes `dist/dna-desk.html`.

## What the owner wants (in their words, summarized)
- The 16th DNA trading-education desktop app, built on the **Holodex room** (holodex/shell.html) — the **original Holodesk layout**, with every function where it was first placed:
  - wall: Watchlist · Coach · big Chart · Account · Strategies
  - desk strips: Ask · Sell · Symbol · Buy · Settings
  - order ticket in the middle
  - tablets: Timeframe (left), Connect (right), Desk (ctrl pad)
  - side tablets: Learn, Orders
  - ring tiles overhead
  - strategy stations
- Theme chosen: **Bull & Bear** (holographic command office: cyan/blue + gold, LIVE world clocks, news band, bull and bear holograms, spinning Bitcoin, server walls, also behind the chair).
- Button style chosen: **#4, floating 3D glass keys** (`dna/mockup/button-style-4.png`).
- First-person view from the chair, full 360° look-around (Holodesk camera controls).
- Modes: Dashboard / Full screen / Simulation (practice on trading-platform-style layouts). Dev mode must stay.
- The user moves screens and buttons themselves (Holodex Edit desk + long-press, and Dev mode).

## Status (latest session)
DONE in v2:
- **Dev mode picks single 3D things.** `dna/dev3d.js` lets you pick a key, a screen, or a room piece.
  - Keys: rename, small text, color, size, hide, new job (16th DNA actions or your Dev mode panels).
  - Screens: hide, resize.
  - Room pieces: hide, resize, turn.
  - Layers → 3D room lists everything. Changes are saved in localStorage `dna_desk_ovr`.
- **Quality:** the shell's `mk()` renders surface canvases at 1.6× (logical size kept). The bloom threshold is raised so text stays crisp.
- **Less clutter:**
  - The overhead strategy holograms are hidden by default (toggle in Settings → Room).
  - Sparkles show only on active keys.
  - Dropped the strategy rule lines and the timeframe hint.
  - Dimmer server LEDs.
  - The bull and bear moved to the desk ends, small.
- **Pro Chart** (`dna/prochart.js`): the main chart opens full screen (CHART mode, or tap the big chart). It has:
  - 6 chart types, log scale, zoom and pan, crosshair readout.
  - 30 indicators with settings.
  - 10 drawing tools.
  - Chart settings. Saved in `dna_prochart_v1`.
- **Simulation** now mirrors six broker layouts, ported from the earlier XVI build (the `src/skin.js` PLAT list; preview images in `src/assets/sim_*.webp`): Coinbase Advanced, TradingView, Webull Desktop, MetaTrader 5, thinkorswim, NinjaTrader (Chart Trader and a clickable SuperDOM).
  - All use the shared paper engine `DNA_PAPER`: market, limit and stop orders, bracket stop/target, open orders, positions with P&L, fills.
  - The 16th DNA coach strip with each platform's steps sits at the bottom.
- **QA harness** (Playwright, claude.ai-like CSP, stubbed `window.claude`). It passed:
  - live connector path (preview shape, confirm, create)
  - connector failure fallback
  - every key, panel, simulation and chart tool
  - no page errors

DONE in v3 (latest):
- **Live, accurate charts.**
  - Candles are pulled every 2.5 s (`liveTick` in desk.js), so the forming candle updates live. A new candle opens exactly on the timeframe boundary. 300 candles of history.
  - Pro Chart:
    - Auto-follows the live candle, with empty space on its right.
    - If you scroll back, it stays put and shows a "⇥ Latest" button.
    - − and + zoom buttons and ◀ ▶ scroll buttons. Keys: ← →, + −, End.
    - A countdown to candle close under the price label.
  - The big wall chart shows the countdown too. Tap it for the full chart.
- **Duplicate buttons removed.**
  - Desk pad = LESSONS, RESEARCH, FULL CHART, PLATFORMS.
  - Learn tablet → COACH PLAN (entry / stop / target / risk, info only).
  - Connect pad = CONNECT AI and BROKER only.
  - Removed: the Account DETAILS key, the Orders ALL ORDERS key, and DEV in the mode bar (the floating DEV button stays).
- **Sharper.**
  - Surface canvases at 2× (HX_RES).
  - Max anisotropic filtering on screen textures.
  - The quality auto-drop only goes as low as level 2.
  - Bull and bear re-rendered on Higgsfield at high quality 2k (`dna/assets/*-src-hq.png` → 1024 px jpg).

STILL OPEN / ideas:
- The three platform layouts that are usually stock or forex (thinkorswim, MetaTrader, Webull) run on the crypto demo market. Add stock symbols if a stock data connector is added.
- Not yet verified on the real connector: the preview and create result fields.

## Architecture
```
holodex/shell.html     the owner's HOLODEX-SHELL page (unchanged on disk)
holodex/build.py       blank-shell scoping, theme-flicker fix (data-hx-theme), room-tap gating, embeds Dev mode
holodex/bridge.js      Dev mode <-> Holodex actions (xvi6.ACT/ACTL/STATE), seeds hidden overlay widgets
src/universal.js       UNI: Claude built-in AI (sample), model lock, Coinbase connector via window.claude.use('mcp'),
                       demo market (SIM) when no connector, xviConfirm dialog
src/devmode.js/.css    Dev mode (shared with the XVI app)
dna/hooks.py           inserts window.DNA_PAINT(kind,id,g,W,H,sf) into every blanked Holodex surface drawer
dna/desk.js            16th DNA engine + painter (3D glass keys), panels, modes, Simulation
dna/decor.js           Bull & Bear decor in three.js (window.__HX3), DNA_FRAME per-frame hook, DNA_DECOR toggles
dna/desk.css           mode bar, panels, Simulation styles (DOM version of the 3D key = .dna-k)
dna/assets/            bull.jpg / bear.jpg hologram sprites (additive blending on black)
dna/build.py           runs holodex/build.py, then patches + embeds -> dna/index.html, dist/dna-desk.html
```
Build patches in `dna/build.py`:
- `window.__HX3` exposes the renderer, scene, camera and THREE.
- `window.__HXREDRAW = redraw`
- `DNA_FRAME` runs inside the render loop.
- Yaw is unlimited (`YMAX = PI`).
- `window.__seatLook(yaw, pitch)` turns the seat camera.
- `DNA_TAP` handles ring tiles and strategy holograms.
- `DNA_ON` blocks the old Holodex readout sheets.
- Room taps are on by default (long-press moves screens).
- The localStorage keys are separate (`dna_desk_dev_v1`).
- `.dna` is excluded from the shell's blank-button CSS.

Surfaces passed to `DNA_PAINT`, as kind and id:
- `wall`: tickers = Watchlist, heat = Coach, chart, movers = Account, sectors = Strategies
- `row`: positions = Ask, focus = Sell, trades = Symbol, mheat = Buy, pnl = Settings
- `pad`: chart = Timeframe, order = Connect, ctrl = Desk
- `ticket`, `watch` (Learn), `signals` (Orders), `tile` (by index), `station` (strategy), `ring` (price band)

Buttons are `sf.btns.push({x, y, w, h, act})` in canvas pixels. The shell's `tap()` → `hitBtn` runs `act()`.

## Trading rules (keep these)
- Practice (paper) by default.
- Live orders only through the user's Claude "Coin base agents" connector: Settings → "Use my Coinbase connector".
- Always PREVIEW, then an in-page confirm (`xviConfirm`), before `coinbase_orders_create`. Never place orders without the user's explicit OK.
- Connector order shape: `{product_id, side, type:"market", product_type:"SPOT", quote_size (BUY) | base_size (SELL)}`. Use the USDC pair when the user holds USDC (they do).
- Verified real shapes:
  - candles: `{candles:[{start,open,high,low,close,volume}]}`, all strings; `granularity` takes values like `"15m"`.
  - balance: `{accounts:[{currency, available_balance:{value}}]}`.
- Not yet verified: the result fields of preview and create.

## Higgsfield (image generation) notes
- Model `gpt_image_2_6`, quality low, 1k for concept references.
- Upload flow: `media_upload` → `curl PUT` with `Content-Type` and `If-None-Match: *` → `media_confirm`.
- References: the original seat view is media `0985d172-ca95-4557-9d9c-9bb6306a243c`; the Bull & Bear theme is job `e49130ff-3030-4ea6-abf8-0bffb9c960c9`; the chosen button style 4 is job `03c81c27-fa9d-412d-9dd4-50c1270a330c`.

## Commits
- Never put model names in commits.
- End every commit message with:
  - `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  - `Claude-Session: https://claude.ai/code/session_01J3fvpsKyFxeJ9WXUBcu2cx`
- No pull requests unless the owner asks.
