XVI DNA v7 · Holo Desk
======================

OPEN IT
  Mac / Linux : double-click or run  ./start.sh
  Windows     : double-click start.bat
  Any OS      : python3 serve.py        (opens http://localhost:8765; if that port is busy it picks
                                         the next free one and prints the address)
  Opening index.html directly also works, but live futures/broker calls need the local server.

WHAT YOU SEE
  A 3D hologram trading room (three.js + bloom) instead of the old image desk:
  - Wall screens: live chart of the XVI symbol (candles + EMA 21, LIVE/OFFLINE tag),
    watchlist (the current market's list: crypto, futures or stocks; your symbol is always
    pinned on it; tap a row to switch the XVI symbol), account (balance, realized P&L,
    trades, badges, lesson cap), coach verdict, platform simulators.
  - Curved desk buttons, every one an XVI action: Coach, Lessons, Research, Journal,
    Progress (camera flies to each tab), Platforms (6 simulators, glitch in/out),
    Connect AI, Broker, Ask (raised hand, answers offline from the lessons/glossary),
    Sell / Symbol / Buy (opens the XVI order ticket prefilled; Preview -> Place -> Confirm,
    practice or live), Settings.
  - The coach hologram follows the coach picker (male / female). Tap it to open your coach;
    with the teacher's voice on, it greets you and reads the current coaching note.
  - Desk buttons flash when pressed. Optional soft click sound: Settings -> Sounds (off by default).
  - Drag on the room to look around (long-press a screen to move it). Keyboard: the first Tab stop is a button strip with every action.
  - Spot, Trade, Derivatives and Transactions sit on their own solid backdrop (the 3D room is hidden there).
  - Reduced-motion settings stop camera flights, drift and particles.
  - No WebGL? The app falls back to the 2D image desk automatically.

BIG SCREEN, MOVABLE SCREENS AND YOUR OWN DESK (new in v7)
  - The middle wall screen is the big hologram screen. Its tab rail (Chart, Watch, Book, Coach,
    Sims, Journal, Progress, Account) or a left/right swipe on it flips it to another XVI screen.
    The order book is live from Coinbase, the journal lists closed trades, and progress shows badges.
  - Long-press any wall screen to pick it up. Drop a side screen on the big screen to swap them,
    or drop it on another spot to trade places. Screens glide and snap into place.
  - "✎ Edit desk" (top left on the desk, Settings -> Desk & developer tools, or the Tab strip):
    the buttons jiggle and glow. Drag a button to reorder it or move it to the other row, drag it
    off the desk (or tap ×) to remove it, tap one to recolor or nudge it with ◀ ▶, and add any XVI
    action from the tray (tap, or drag it onto the desk). On the Screens tab, drag screens freely,
    resize the big screen (corner handle, mouse wheel or − / +), and pick what it shows.
    Esc or Done leaves; "Reset to default" restores the factory layout.
  - Layouts are saved in this browser (localStorage), separately for the female and male coach.
  - Mouse and touch both work. Reduced motion turns off the jiggle, flips and glides.

DEV MODE (new in v7): Settings -> Dev mode, or Ctrl+Shift+D
  A floating DEV toolbar and a docked glass panel to restyle XVI live. It never touches order
  logic or keys: inputs' values are never sent or changed, and only look-and-feel edits are allowed.
  - 🎯 Inspect: hover outlines any element (name, selector, size, and distances to the selection).
    Tap or click to select it. The 3D desk, coach and wall screens can be picked too (3D objects
    rotate on Y). While Inspect is on, taps never reach the app, so nothing taps through.
  - Move, resize and rotate: drag the selection to move it (snaps to neighbours and the screen
    centre; magenta guides). There are 8 resize handles plus W/H inputs (px or %, lock aspect).
    The ⟳ ring rotates (Shift or "snap 15°" snaps to 15°). Arrow keys nudge 1px (Shift: 10px).
  - ✎ Edit tab:
    - Ask the AI from Connect AI ("make this bigger and gold"). It gets the selector, key styles,
      text and trimmed HTML (with an optional snapshot) and returns a JSON patch. You see the list
      of changes first, then Preview -> Keep / Undo / Try again.
    - Scripts are off unless you tick "allow script", and each script asks you to confirm first.
    - With no AI connected, use the manual editor: text, size/position/rotation, font family,
      size and weight, a margin/padding box, radius, glow, opacity and z-index.
    - Double-click (or double-tap) text to edit it in place.
  - 🎨 Color: a hue/saturation picker with alpha, hex and RGB input, an eyedropper (where the
    browser supports it), the XVI palette and your own saved swatches. It applies to text,
    background, border or glow.
  - ＋ Insert (Quick Insert): sidebar, dropdown, button, tab bar, toggle, slider, checkbox/radio,
    text/search, card, modal, tooltip, badge, divider, heading/text/label, image, icon, mini live
    chart, ticker/stat tile, progress bar, list/table, accordion and toast. Tap one to add it,
    or drag it to a spot.
    - Each one has properties: label, options ("Label|action" wires each option), style, and an
      Action from XVI's own action map (open a screen, swap the big screen, Ask, Connect AI or
      Broker, a platform sim, next symbol, the coach hologram…) or a custom link.
    - Ctrl+D duplicates, and Delete removes.
  - ☰ Layers: the main screen regions, the 3D screens and inserted components as a tree.
    Tap to select, with 👁 hide and 🔒 lock.
  - ✛ Crosshair: live X/Y with full-screen lines; tap to place the selection there.
  - # Guides: grid, rulers and snapping. ◐ Before/after: toggle it, or hold \ to see the app
    without your changes.
  - 📱 Device preview at desktop, tablet and phone widths (plus a reduced-motion switch).
  - ⏱ Animation speed: normal, slow or pause.
  - 📷 Snapshot: PNG of the selection or the screen (the 3D room comes from its renderer).
  - 🕘 Changes: a timestamped history with Ctrl+Z / Ctrl+Shift+Z and per-change revert.
  - 🎛 Theme: edit the global colour tokens, glass blur and glow to restyle everything at once.
  - ⇩ Export:
    - "Export for build" downloads xvi-dev-export.zip (overrides.css, xvi-dev-overrides.json,
      patches.json, components.json and snapshots).
    - Import loads an overrides file, and Reset all clears everything.
    - Kept changes are an override layer stored in this browser and applied on every load,
      even with Dev mode closed.

NEW IN v8 (Claude artifact build, model lock, fixes)
  - dist/xvi-dna-holo-desk.html is the same app built as a Claude artifact page (cd src && python3 build.py
    writes both files).
  - Connect AI -> "Lock model": freezes the provider and model. While it is on, no screen, setting,
    script or reload can switch it; unlock to change it. Also in Settings -> AI, data and trading.
  - Connect AI -> "Claude built in" (inside Claude only): the teacher, lab and Dev mode use your own
    Claude account with no key. Pick Auto or a specific Claude model, and lock it if you want.
  - Inside Claude a page cannot call Coinbase itself, so charts start on a clearly labelled demo
    market (DEMO DATA · PRACTICE). Connect Broker -> "Claude connectors" switches to your own
    Coinbase / Webull connectors. Live orders are refused while demo prices are showing.
  - Outside Claude, if Coinbase can't be reached the app now falls back to the demo market with a
    "Retry live" button instead of an empty desk.
  - Fixed: every "are you sure?" step (reset desk, reset dev changes, import, allow/run AI script)
    used the browser's confirm(), which never appears inside Claude, so those buttons did nothing.
    They are now in-page dialogs. Dev mode exports save through Claude's download prompt.
  - Fixed: the app stopped at "Needs live connection" whenever it ran inside Claude without connectors.
  - Fixed: switching AI provider in Settings kept the previous provider's model name.

WHAT IS REAL
  - Prices and candles: live Coinbase public data (349-candle cap).
  - Orders: practice account ($100) by default. Live orders only go out after Connect Broker
    and Preview -> Place -> Confirm.
  - Stocks need a broker/data server; crypto works out of the box.
  - three.js and fonts load from CDNs (cdnjs, jsdelivr, Google Fonts) and are cached by the
    service worker for offline reuse. Market, AI and broker calls are never cached.

COACH VOICE
  Settings -> Coach voice. "Auto" picks the most natural installed voice that matches the coach:
    Windows + Edge   : Microsoft Andrew / Ava (Natural)
    Windows + Chrome : Google UK English Male / Google US English (else Microsoft David / Zira)
    macOS + Chrome   : Google UK English Male / Google US English
    Safari           : Evan / Ava premium or enhanced voices if installed
  Calm teaching pace, sentence pauses, no emoji or markdown read aloud, tickers and % spoken out.
  Pick any installed voice from the list and press Test voice. Voice on/off is in the header.
  Optional "Premium voice": OpenAI TTS (onyx for male, nova for female) using the OpenAI key
  you saved in Connect AI. Off by default; falls back to browser voices on any error.

FILES
  index.html          the whole app (built)
  src/                source; rebuild with:  cd src && python3 build.py
  serve.py, start.*   local launcher
  manifest.json, sw.js, icons   install-as-app support
Learning tool, not financial advice.
