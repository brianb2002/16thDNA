/* ================= Holodex x Dev mode bridge =================
   Loaded after the Holodex scripts and before devmode.js.
   - Seeds the "dashboard only" layer: the shell's overlay widgets start hidden as ordinary Dev mode
     changes, so the Layers panel (eye icon) can bring any of them back and Reset all restores the shell.
   - Gives Dev mode an action list that drives the Holodex's own controls, so a button you place does
     the real thing (the original buttons stay in the page, hidden, with their handlers intact).
   - Feeds Dev mode's chart and stat components from the Holodex's live state.
   - Adds a small DEV launcher, because the shell's own settings bar is hidden. */
(() => {
const d = document, LS = "holodex_dev_v1";
const A = () => window.VL_BAR_API || null;
const q = s => { try { return d.querySelector(s); } catch (e) { return null; } };
const click = sel => () => { const el = q(sel); if (el) el.click(); else toastH("That control isn't in this page."); };
const toastH = m => { try { const a = A(); if (a && a.toastFn) return a.toastFn(m); } catch (e) {} };
if (typeof window.toast !== "function") window.toast = toastH;

/* ---- the overlay widgets that make up the old design (hidden to start, restorable from Layers) ---- */
const HIDE = [["#top", "Top bar (brand, theme, market, feed, clock)"], ["#vl2-balance", "Balance tile"], ["#vl2-layer", "Widget panels (main chart and others)"], ["#vl2-sidebar", "Right sidebar"], ["#vl2-sbtab", "Sidebar tab"], ["#dock", "Camera view dock"]];
window.XDEV_REG = [["#gl", "3D dashboard"]].concat(HIDE, [["#vl2-sidepop", "Sidebar pop-up"], ["#settings", "Settings sheet"], ["#detail", "Detail sheet"], ["#editor", "Layout editor sheet"], ["#grabbar", "Move / resize bar"], ["#toast", "Toast"], ["#vl2-toasts", "Alert toasts"]]);
try {
  if (localStorage.getItem(LS) == null) {
    const t = Date.now();
    localStorage.setItem(LS, JSON.stringify({ on: false, changes: HIDE.map(([sel, name], i) => ({ kind: "style", sel, props: { display: "none" }, id: "hxbare" + i, t, label: "Hide " + name })), redo: [] }));
  }
} catch (e) { d.documentElement.classList.add("hx-nostore"); }

/* ---- actions a placed component can run ---- */
const ACTL = {}, ACT = {};
const add = (k, label, fn) => { ACT[k] = fn; ACTL[k] = label; };
add("buy", "Trade · Buy (arm ticket)", click("#vlb-buy"));
add("sell", "Trade · Sell", click("#vlb-sell"));
add("approve", "Trade · Approve ticket", click("#vlb-approve"));
add("close", "Trade · Close position", click("#vlb-close"));
add("scan", "Desk · Scan", click("#vlb-scan"));
add("lock", "Desk · Lock-in symbol", click("#vlb-lock"));
add("auto", "Desk · Autopilot (double-tap to arm)", click("#vlb-auto"));
add("feed", "Desk · Feed mode", click("#vlb-mode"));
add("day", "Theme · Day", click("#th-light"));
add("night", "Theme · Night", click("#th-dark"));
add("risk", "Theme · Risk", click("#th-alert"));
add("stocks", "Market · Stocks", click("#mk-stocks"));
add("crypto", "Market · Crypto", click("#mk-crypto"));
[["seat", "Seat"], ["floor", "Front"], ["bots", "Top"], ["side", "Side"], ["desk", "Desk"], ["wide", "Wide"], ["low", "Low"]].forEach(([id, n]) => add("view-" + id, "Camera · " + n, click("#vw-" + id)));
[["lab", "Lab"], ["alert", "Risk alert"], ["brief", "AI briefing"], ["dome", "Macro dome"], ["team", "Team floor"]].forEach(([id, n]) => add("scene-" + id, "Scene · " + n, () => { const a = A(); if (a && a.setSceneFn) a.setSceneFn(id); }));
["1m", "5m", "15m", "1H", "4H", "1D"].forEach(tf => add("tf-" + tf, "Chart · " + tf, click('#vlb-tfs [data-tf="' + tf + '"]')));
add("settings", "Open · Settings", click("#setbtn"));
add("layout", "Open · Holodex layout editor", click("#edit"));
add("widgets", "Open · Widget library", click("#vl2-sb-widgets"));
add("profile", "Open · Profile", click("#vl2-sb-profile"));
add("mode", "Open · Live / paper mode", click("#vl2-sb-mode"));
window.XDEV_FIXED = [["link", "Custom link"]];
/* starting text and wiring for each Quick Insert component ("Label|action" pairs use the keys above) */
window.XDEV_LIBP = {
  sidebar: { label: "HOLODEX", options: "Buy|buy, Sell|sell, Scan|scan, Autopilot|auto, Settings|settings" },
  select: { label: "Camera", options: "Front|view-floor, Desk|view-desk, Seat|view-seat, Wide|view-wide, Top|view-bots" },
  button: { label: "Scan", action: "scan" },
  tabs: { options: "Lab|scene-lab, Risk|scene-alert, Briefing|scene-brief, Dome|scene-dome, Team|scene-team" },
  toggle: { label: "Autopilot", action: "auto" },
  input: { label: "Search…", action: "" },
  heading: { label: "C-LO // HOLODEX" }, image: { label: "Image" }, icon: { label: "⚙", action: "settings" },
  progress: { label: "Progress" }, list: { label: "Watch", options: "AAPL|Apple|Stocks, NVDA|Nvidia|Stocks, BTC|Bitcoin|Crypto" },
  toastc: { label: "Scan complete" }
};
window.xvi6 = Object.assign(window.xvi6 || {}, { ACT, ACTL });

/* ---- live data for Dev mode's chart and stat components ---- */
if (typeof window.S === "undefined") {
  const sym = () => { try { const c = A() && A().chart; return c ? c.s : "SPY"; } catch (e) { return "SPY"; } };
  window.S = {
    get bars() { try { return (A().candles(sym(), "15m") || []).slice(-120); } catch (e) { return []; } },
    get inst() { const b = this.bars; return { label: sym(), price: b.length ? b[b.length - 1].c : null }; },
    get balance() { try { return +A().acctEq() || 0; } catch (e) { return 0; } },
    lessons: [], lists: {}
  };
}

/* ---- DEV launcher (hidden while Dev mode is open) ---- */
const go = () => {
  const b = d.createElement("button"); b.type = "button"; b.id = "xdevLaunch"; b.textContent = "DEV"; b.setAttribute("aria-label", "Open Dev mode (Ctrl+Shift+D)");
  b.addEventListener("click", () => { if (window.XVIdev) XVIdev.set(true); });
  d.body.append(b);
  const sync = () => { b.hidden = d.body.classList.contains("x-dev"); };
  new MutationObserver(sync).observe(d.body, { attributes: true, attributeFilter: ["class"] }); sync();
};
if (d.body) go(); else d.addEventListener("DOMContentLoaded", go);
})();
