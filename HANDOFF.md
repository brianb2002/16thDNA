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

## Latest requests still OPEN (do these next)
1. **Dev mode must select individual things in the 3D room.** Today, clicking the 3D canvas selects the whole page, because Dev mode only knows the old XVI canvas `#x3d`, not `#gl`. Plan, half-written in `dna/dev3d.js` if present:
   - Patch the embedded devmode in `dna/build.py`:
     - In `pickAt`, accept `el.id === "gl"`.
     - In `selHead`, call `window.XDEV_3D.panel(sel)` for 3D selections.
     - In `rectOfSel`, use `XDEV_3D.rect(id)` so the box follows the camera.
     - In `eraseAt`, call `XDEV_3D.erase(h)`.
     - In the Layers "3D room" list, use `XDEV_3D.layers()`.
     - Expose `window.XDEV_SELECT = select`, `window.XDEV_RUN = a => runAction({}, a)` and `window.XDEV_ACTS = () => ACTN()`.
   - Shell exports to add in `build.py`:
     - `window.__hxHit = hit`
     - `window.__hxSurf = surfOf` (a Map from mesh to surface)
     - `window.__hxHolo = holo`
   - `xvi6.pick3d(x, y)`:
     - Raycast with `__hxHit`.
     - If it hits a surface with buttons, find the button under the UV (flip-aware, like the shell's `hitBtn`) and return a key: `{id: "k|" + kid, name, rect}`. Get the rect from the UV corners mapped to world space through the mesh triangles, then projected to the screen.
     - Otherwise return the whole screen (`"s|" + sf.__dnaId`), or a decor piece (`"d|bull"` and so on, raycast against the decor group).
   - Overrides go in localStorage `dna_desk_ovr`:
     - keys: `{label, sub, col, size, hide, act}`; `key()` in desk.js must read them.
     - screens: `{hide, scale}`
     - decor: `{hide, scale, rot}`
   - Hidden keys draw as a dashed ghost while Dev mode is on (`body.x-dev`), so they can be selected and shown again.
2. **Better quality.**
   - In `build.py`, patch the shell's `function mk(w,h)` so surface canvases render at about 1.6× (cap each side at 4096 px). Report the logical width and height through instance getters, so the shell's drawing code and `hitBtn` math stay the same.
   - Skip canvases under 256×200: the land mask uses `getImageData`.
   - Raise the bloom threshold (`UnrealBloomPass(...,.95,.45,.06)` → about `.55,.4,.6`) so text isn't blurred.
3. **Less clutter.**
   - Hide the overhead strategy stations (`holo` group) by default, with a toggle under Settings → Room.
   - Sparkles only on active keys.
   - Drop the rule text lines under Strategies.
   - Drop the hint text on the timeframe pad.
   - Dimmer server LEDs.
4. **Bugs / holes / errors test pass** (the user asked for it). Use `scratchpad/dt/shot.js` and `act.js`-style Playwright harnesses (CSP like claude.ai, a stubbed `window.claude`):
   - Collect `pageerror` and console errors.
   - Run `act()` on every `sf.btns` entry on every surface; skip live PLACE.
   - Open and close every panel and Simulation platform.
   - Test the practice order flow.
   - Stub `mcp` both ways: failing (`server_not_connected`) and returning the real shapes below. Check live preview and create.
   - Phone viewport 390×844.
   - Dev mode 3D pick, edit, hide, reset.
   - `node --check` every JS file.

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
