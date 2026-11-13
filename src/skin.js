/* ================= XVI DNA skin (visual layer only) ================= */
(() => {
const XA = window.XASSET || {};
const IC = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  coach: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
  lessons: '<path d="M4 5h11a3 3 0 013 3v12H7a3 3 0 01-3-3z"/><path d="M4 17a3 3 0 013-3h11"/><path d="M8 8h6"/>',
  research: '<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9V3"/><path d="M7 15h10"/>',
  journal: '<rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 8h6M8 12h6M8 16h3"/><path d="M20 7l-5 9-2 1 .5-2.2z"/>',
  progress: '<path d="M4 20V14M9 20V10M14 20v-7M19 20V5"/><path d="M3 9l6-4 5 3 7-5"/>',
  sims: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6 13l3-3 3 2 5-5"/>',
  ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  send: '<path d="M4 12l16-8-6 16-2-7z"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  market: '<path d="M4 19h16"/><path d="M7 15V9M12 15V6M17 15v-4"/><rect x="5.5" y="10" width="3" height="4"/><rect x="15.5" y="11" width="3" height="3"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
const TABS = [["coach", "Coach"], ["lessons", "Lessons"], ["research", "Research Lab"], ["journal", "Journal"], ["progress", "Progress"]];
const TAB_OF = { "s-learn": "lessons", "s-lingo": "lessons", "s-lab": "research", "s-brain": "research", "s-lessons": "journal", "s-progress": "progress" };
const PLAT = {
  cb: { n: "Coinbase", d: "Advanced trade · clean, rounded", pal: ["#0052ff", "#3773f5", "#27ad75", "#f0616d", "#0a0b0d", "#ffffff"] },
  tv: { n: "TradingView", d: "Supercharts · thin borders", pal: ["#2962ff", "#131722", "#26a69a", "#ef5350", "#2a2e39", "#d1d4dc"] },
  wb: { n: "Webull", d: "Desktop · green/red, dense", pal: ["#1e9bff", "#02c076", "#f6465d", "#0b0e14", "#141a24", "#eef2f7"] },
  nt: { n: "NinjaTrader", d: "Chart Trader · orange accents", pal: ["#f58220", "#32cd32", "#ff2a2a", "#000000", "#1f5fbf", "#f0f0f0"] },
  tos: { n: "thinkorswim", d: "Charts tab · gray & gold", pal: ["#f5b301", "#00b84a", "#e02020", "#0a0a0a", "#3a3a3a", "#e8e8e8"] },
  mt: { n: "MetaTrader", d: "MT5 terminal · square, Tahoma", pal: ["#00e676", "#ffffff", "#4caf50", "#000000", "#1d5fd0", "#d02a2a"] }
};
THEMES.cb = { n: "Coinbase style", bg: "#0a0b0d", bg2: "#141519", up: "#27ad75", dn: "#f0616d", acc: "#3773f5", txt: "#ffffff", mut: "#8a919e" };
Object.assign(THEMES.coach, { n: "XVI DNA Holo (default)", bg: "#030b1f", bg2: "#071733", up: "#2ee6a8", dn: "#ff5a76", acc: "#4aa8ff", txt: "#eef6ff", mut: "#9db8db" });
["tv", "wb", "nt", "tos", "mt"].forEach(k => { if (THEMES[k]) THEMES[k].n = PLAT[k].n + " simulation"; }); THEMES.cb.n = "Coinbase simulation";

const X = { gender: (() => { try { return localStorage.getItem("xvi_coach") === "male" ? "male" : "female"; } catch (e) { return "female"; } })(), tab: null };
const body = document.body;
const coachImg = () => XA[X.gender === "male" ? "coach_m" : "coach_f"] || "";
const bgImg = g => XA[(g || X.gender) === "male" ? "bg_m" : "bg_f"] || "";
const isPlat = () => !!PLAT[S.set.theme];
const chip = () => `<div class="xchip" role="group" aria-label="Choose your coach">${svg("swap")}<b>Coach:</b><button data-xg="male" class="${X.gender === "male" ? "on" : ""}" aria-pressed="${X.gender === "male"}">Male</button><button data-xg="female" class="${X.gender === "female" ? "on" : ""}" aria-pressed="${X.gender === "female"}">Female</button></div>`;

/* ---- brand ---- */
const BRAND = '<span class="xv">XVI</span><sup>TH</sup><span>DNA</span>';
const _setAppName = setAppName;
setAppName = function (nm) { _setAppName(nm); if (!S.appName) { $("appName").innerHTML = BRAND; try { document.title = "XVI DNA"; } catch (e) {} } };
setAppName(S.appName);

/* ---- fixed backdrop for holo pages ---- */
const bg = document.createElement("div"); bg.id = "xBg"; bg.innerHTML = `<i data-g="female" style="background-image:url(${bgImg("female")})"></i><i data-g="male" style="background-image:url(${bgImg("male")})"></i>`; body.prepend(bg);

/* ---- home: first-person desk ---- */
const home = document.createElement("div"); home.id = "xHome";
home.innerHTML = `<div class="fill" style="background-image:url(${bgImg()})"></div><div id="xScroll"><div class="xstage" id="xStage">
  <div class="bgi" data-g="female" style="background-image:url(${bgImg("female")})"></div><div class="bgi" data-g="male" style="background-image:url(${bgImg("male")})"></div>
  <button class="xt" data-xt="coach" style="left:2.3%;top:14.6%;width:13.4%;height:23.2%">${svg("coach")}<span class="l">Coach</span><small id="xsCoach"></small></button>
  <button class="xt" data-xt="lessons" style="left:15.9%;top:20.6%;width:13.8%;height:19.8%">${svg("lessons")}<span class="l">Lessons</span><small id="xsLessons"></small></button>
  <div class="xt dome" data-xt="sims" role="button" tabindex="0" style="left:37.5%;top:13.6%;width:25%;height:21%">${svg("sims")}<span class="l">Platform Simulations</span><div class="row">${Object.keys(PLAT).map(k => `<span data-xp="${k}">${PLAT[k].n}</span>`).join("")}</div></div>
  <button class="xt" data-xt="research" style="left:66.8%;top:21.6%;width:10%;height:20.6%">${svg("research")}<span class="l">Research Lab</span><small id="xsLab"></small></button>
  <button class="xt" data-xt="journal" style="left:76.9%;top:20.2%;width:9.8%;height:19.2%">${svg("journal")}<span class="l">Journal</span><small id="xsJournal"></small></button>
  <button class="xt" data-xt="progress" style="left:86.9%;top:14.6%;width:11.8%;height:23.6%">${svg("progress")}<span class="l">Progress</span><small id="xsProg"></small></button>
  <div class="xcoachhit" data-xt="coach" title="Open your coach" style="left:9%;top:38%;width:12%;height:34%"></div>
  <button class="xask" data-xt="ask" style="left:19.2%;top:58.2%;width:15.6%;height:7.8%">${svg("ask")}<em>Ask your coach…</em>${svg("send")}</button>
  <div class="xdesk" data-xt="market" style="left:41%;top:67%;width:17.5%;height:10.5%"><span>Live market</span></div>
  <div class="xdesk" data-xt="trade" style="left:85.5%;top:74%;width:10.5%;height:12%"><span>Trade · all markets</span></div>
  <div class="xdesk" data-xt="tx" style="left:71.5%;top:70.5%;width:9.5%;height:10.5%"><span>Transactions</span></div>
  ${chip()}
</div></div><div class="xswipe">← Swipe to look around the room →</div>`;
body.prepend(home);
home.addEventListener("click", e => {
  const p = e.target.closest("[data-xp]"); if (p) { e.stopPropagation(); startSim(p.dataset.xp); return; }
  const g = e.target.closest("[data-xg]"); if (g) { setCoach(g.dataset.xg); return; }
  const t = e.target.closest("[data-xt]"); if (!t) return; const a = t.dataset.xt;
  if (a === "sims") openSims(); else if (a === "ask") openAsk(); else if (a === "market") showView(S.inst && isLev() ? "deriv" : "spot"); else if (a === "trade" || a === "tx") showView(a); else xTab(a);
});
home.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset && e.target.dataset.xt === "sims") { e.preventDefault(); openSims(); } });

/* ---- hologram tab bar ---- */
const tabs = document.createElement("nav"); tabs.id = "xTabs"; tabs.setAttribute("aria-label", "XVI DNA sections");
tabs.innerHTML = `<button data-xtb="home">${svg("home")}Home</button>${TABS.map(([k, n]) => `<button data-xtb="${k}">${svg(k)}${n}</button>`).join("")}<button data-xtb="market">${svg("market")}Market</button><span class="sp"></span><button class="xsimbtn" data-xtb="sims">${svg("sims")}Platform Simulations</button>`;
document.querySelector(".wrap header").after(tabs);
tabs.addEventListener("click", e => { const g = e.target.closest("[data-xg]"); if (g) { ((window.xvi && window.xvi.setCoach) || setCoach)(g.dataset.xg); return; } const b = e.target.closest("[data-xtb]"); if (!b) return; const a = b.dataset.xtb;
  if (a === "home") showView("home"); else if (a === "sims") openSims(); else if (a === "market") showView(S.inst && isLev() ? "deriv" : "spot"); else xTab(a); });

/* ---- hero card on top of the coach page ---- */
$("v-coach").after($("v-tx")); /* journal shows trade reviews, then fills */
const hero = document.createElement("div"); hero.className = "xhero"; hero.id = "xHero"; $("v-coach").prepend(hero);
const HERO = {
  coach: ["Coach", "Live coaching on the market you have open: account, market state, fees, plan, size and a go / no-go."],
  lessons: ["Lessons", "Learning mode, the guided tour, chart lessons and the market lingo dictionary."],
  research: ["Research Lab", "The strategies the brain runs, and the lab that tests one change at a time through three gates."],
  journal: ["Journal", "A review of each of your closed trades, plus every fill and fee."],
  progress: ["Progress", "Checkpoints you've reached and badges you've earned."]
};
function renderHero() { const t = X.tab || "coach", h = HERO[t]; const big = t === "coach";
  const said = big ? ($("cbTxt") ? $("cbTxt").textContent : "") : h[1];
  hero.className = "xhero" + (big ? "" : " small");
  const acts = big ? `<button class="btn pri" data-xh="tour">▶ Start guided trade</button><button class="btn" data-xh="ask">${"💬"} Ask the coach</button>`
    : t === "lessons" ? `<button class="btn pri" data-xh="tour">▶ Guided tour</button><button class="btn" data-xh="explain">▶ Explain chart</button><button class="btn" data-xh="spot">◎ Spot it</button>`
    : t === "journal" ? `<button class="btn" data-xh="ask">💬 Review a trade with the coach</button>`
    : t === "research" ? `<button class="btn" data-xh="ask">💬 Ask about a strategy</button>` : "";
  hero.innerHTML = `<div class="fig"><img alt="${X.gender} hologram coach" src="${coachImg()}"></div><div class="body"><h2>${svg(t)}${h[0]}</h2>${big || said ? `<div class="say">${esc(said || "Pick a market and I'll walk you through it.")}</div>` : ""}<div class="acts">${acts}${chip()}</div></div>`; }
hero.addEventListener("click", e => { const g = e.target.closest("[data-xg]"); if (g) { setCoach(g.dataset.xg); return; } const b = e.target.closest("[data-xh]"); if (!b) return; const a = b.dataset.xh;
  if (a === "tour") $("startTour").click(); else if (a === "ask") openAsk(); else if (a === "explain" || a === "spot") { showView(S.inst && isLev() ? "deriv" : "spot"); setTimeout(() => $(a === "explain" ? "expBtn" : "spotBtn").click(), 80); } });
try { new MutationObserver(() => { if (X.tab === "coach" || !X.tab) { const s = hero.querySelector(".say"); if (s) s.textContent = $("cbTxt").textContent; } }).observe($("cbTxt"), { childList: true, characterData: true, subtree: true }); } catch (e) {}

/* ---- coach swap ---- */
function setCoach(g) { X.gender = g === "male" ? "male" : "female"; try { localStorage.setItem("xvi_coach", X.gender); } catch (e) {}
  document.querySelectorAll("#xStage .bgi,#xBg i").forEach(el => el.classList.toggle("on", el.dataset.g === X.gender));
  home.querySelector(".fill").style.backgroundImage = `url(${bgImg()})`;
  document.querySelectorAll(".xchip [data-xg]").forEach(b => { const on = b.dataset.xg === X.gender; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  const im = hero.querySelector(".fig img"); if (im) { im.src = coachImg(); im.alt = X.gender + " hologram coach"; }
  homeStats(); }

/* ---- views & tabs ---- */
const _showView = showView;
showView = function (v) {
  const tab = X.pending || null; X.pending = null;
  _showView(v);
  body.classList.toggle("x-home", v === "home");
  if (v === "coach") { X.tab = tab || "coach"; body.dataset.xtab = X.tab; renderHero(); } else { X.tab = null; delete body.dataset.xtab; }
  body.classList.toggle("x-tab-journal", X.tab === "journal");
  if (X.tab === "journal") { $("v-tx").style.display = "block"; try { renderTx(); } catch (e) {} }
  body.classList.toggle("x-holo-view", v === "home" || v === "coach");
  if (v === "home") { $("bsRow").style.display = "none"; homeStats(); centerStage(); }
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  document.querySelectorAll("#xTabs [data-xtb]").forEach(b => b.classList.toggle("on", v === "coach" ? b.dataset.xtb === X.tab : (v === "spot" || v === "deriv") && b.dataset.xtb === "market"));
};
function xTab(t) { X.pending = t; showView("coach"); }
const _goPanel = goPanel;
goPanel = function (id) { X.pending = TAB_OF[id] || "coach"; _goPanel(id); };
const nb = document.createElement("button"); nb.dataset.v = "home"; nb.innerHTML = "<i>⌂</i>Home"; $("nav").prepend(nb);
function centerStage() { const sc = $("xScroll"); if (sc) requestAnimationFrame(() => { sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2; }); }
function homeStats() { const set = (id, t) => { const el = $(id); if (el) el.textContent = t; };
  set("xsCoach", (X.gender === "male" ? "Male" : "Female") + " coach");
  try { set("xsLessons", S.learn && S.learn.on ? "Learning mode on" : "Learning mode off"); } catch (e) {}
  try { set("xsLab", (S.lab.runs || []).length + " rounds"); } catch (e) {}
  try { set("xsJournal", (S.lessons || []).length + " trades reviewed"); } catch (e) {}
  try { set("xsProg", BADGES.filter(b => { try { return b[3](); } catch (e) { return false; } }).length + " / " + BADGES.length + " badges"); } catch (e) {} }

/* ---- Platform Simulations ---- */
const dim = document.createElement("div"); dim.id = "xSimDim"; body.append(dim);
const sim = document.createElement("div"); sim.id = "xSim"; sim.setAttribute("role", "dialog"); sim.setAttribute("aria-label", "Platform Simulations"); body.append(sim);
function renderSims() { const cur = S.set.theme;
  sim.innerHTML = `<div class="hd"><h3>Platform Simulations</h3><button class="x" data-xs="close" aria-label="Close" style="color:#cfe3ff">×</button></div>
  <p class="s">Practice on a screen that looks like the broker you'll really use. Your coach stays with you; only the trading screen changes. The pictures are style previews: every simulation runs on your current market${S.inst ? ", " + S.inst.label : ""}.</p>
  <div class="gridp">${Object.keys(PLAT).map(k => { const P = PLAT[k]; return `<button class="xpc ${cur === k ? "on" : ""}" data-xs="${k}" style="--pa:${P.pal[0]}"><img alt="" src="${XA["sim_" + k] || ""}"><em class="xsym">${S.inst ? "Trades " + S.inst.label : "Style preview"}</em><div class="sw">${P.pal.map(c => `<b style="background:${c}"></b>`).join("")}</div><div class="t"><i></i>${P.n}<small>${cur === k ? "Running" : P.d}</small></div></button>`; }).join("")}</div>
  <div class="foot"><span>Practice balance unless you connect a trading server. Coaching, not financial advice.</span>${PLAT[cur] ? `<button class="btn" data-xs="exit">Exit simulation · back to XVI DNA</button>` : ""}</div>`; }
function openSims() { renderSims(); body.classList.add("x-simopen"); }
function closeSims() { body.classList.remove("x-simopen"); }
dim.onclick = closeSims;
sim.addEventListener("click", e => { const b = e.target.closest("[data-xs]"); if (!b) return; const a = b.dataset.xs; closeSims();
  if (a === "close") return; if (a === "exit") return stopSim(); startSim(a); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSims(); });

const _applyTheme = applyTheme;
applyTheme = function (k) { _applyTheme(k); Object.keys(PLAT).forEach(p => body.classList.toggle("plat-" + p, p === k)); body.classList.toggle("plat", !!PLAT[k]);
  const n = $("xSimName"); if (n) n.textContent = PLAT[k] ? PLAT[k].n : ""; };
function setTheme(k) { S.set.theme = k; store.set("tc_theme", k); applyTheme(k); try { drawChart(); renderMenus(); } catch (e) {} }
function startSim(k) { if (!PLAT[k]) return; closeDrawer(); closeSims();
  glitch(PLAT[k], () => { setTheme(k); showView(S.inst && isLev() ? "deriv" : "spot"); }); }
function stopSim() { glitch({ n: "XVI DNA", pal: ["#4aa8ff", "#8fd3ff", "#ffffff", "#2a7dff", "#030b1f", "#0b2a66"] }, () => { setTheme("coach"); showView("home"); }); }

/* sim bar inside the dock */
const sb = document.createElement("div"); sb.id = "xSimBar"; sb.innerHTML = `<span>XVI DNA Coach — learning <b id="xSimName"></b></span><span class="sp"></span><button data-sb="home">⌂ Home</button><button data-sb="coach">★ Coach</button><button data-sb="switch">Switch platform</button><button data-sb="exit">Exit simulation</button>`;
$("dock").prepend(sb);
sb.onclick = e => { const b = e.target.closest("[data-sb]"); if (!b) return; const a = b.dataset.sb; if (a === "home") showView("home"); else if (a === "coach") xTab("coach"); else if (a === "switch") openSims(); else stopSim(); };

/* pixel-glitch build-in, recolored per platform */
let glitching = false;
function glitch(P, mid, done) {
  if (glitching) return; glitching = true;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = document.createElement("canvas"); cv.id = "xGlitch"; const lab = document.createElement("div"); lab.id = "xGlitchTxt";
  lab.innerHTML = `<div class="gt">${P.n === "XVI DNA" ? "EXITING SIMULATION — Returning to the XVI DNA desk…" : "PLATFORM SIMULATION — Loading " + P.n + " mirror…"}</div><div class="gb"><i></i></div><b class="gp">0%</b>`; lab.style.color = P.pal[0]; body.append(cv, lab); body.classList.add("x-glitching");
  const W = innerWidth, H = innerHeight, cell = Math.max(10, Math.round(Math.min(W, H) / 48)), cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  cv.width = cols; cv.height = rows; const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  const N = cols * rows, r1 = new Float32Array(N), r2 = new Float32Array(N), ci = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const y = (i / cols) | 0; const band = Math.sin(y * 0.37) * 0.15; r1[i] = Math.min(1, Math.max(0, Math.random() * 0.85 + band + 0.1)); r2[i] = Math.random(); ci[i] = (Math.random() * P.pal.length) | 0; }
  const T = reduce ? 450 : 1750, MID = 0.52; let t0 = null, midDone = false;
  const ease = x => x * x * (3 - 2 * x);
  function frame(ts) { if (t0 == null) t0 = ts; const t = Math.min(1, (ts - t0) / T);
    g.clearRect(0, 0, cols, rows);
    const fill = t < MID ? ease(t / MID) : 1, clear = t < MID ? 0 : ease((t - MID) / (1 - MID));
    for (let y = 0; y < rows; y++) { const tear = Math.random() < 0.08 ? ((Math.random() * 6 - 3) | 0) : 0;
      for (let x = 0; x < cols; x++) { const i = y * cols + x; if (r1[i] > fill * 1.05 || r2[i] < clear) continue;
        let c = ci[i]; if (Math.random() < 0.06) c = (Math.random() * P.pal.length) | 0;
        g.fillStyle = P.pal[c]; g.globalAlpha = t < MID ? 0.55 + 0.45 * fill : 1; g.fillRect(x + tear, y, 1, 1); } }
    g.globalAlpha = 1;
    if (Math.random() < 0.5) { const yy = (Math.random() * rows) | 0, hh = 1 + ((Math.random() * 3) | 0); g.fillStyle = P.pal[0]; g.globalAlpha = 0.8; g.fillRect(0, yy, cols, hh); g.globalAlpha = 1; }
    lab.style.opacity = t > 0.85 ? Math.max(0, (1 - t) / 0.15) : 1; const pc = Math.min(100, Math.round(t / 0.8 * 100)); lab.querySelector(".gb i").style.width = pc + "%"; lab.querySelector(".gp").textContent = pc + "%";
    if (!midDone && t >= MID) { midDone = true; try { mid && mid(); } catch (e) { console.error(e); } }
    if (t < 1) requestAnimationFrame(frame); else { cv.remove(); lab.remove(); body.classList.remove("x-glitching"); glitching = false; done && done(); } }
  requestAnimationFrame(frame);
}
window.xvi = { X, PLAT, svg, chip, openSims, closeSims, stopSim, startSim, setCoach, xTab, glitch, coachImg, homeStats, isPlat };
window.xviGlitch = glitch; window.xviStartSim = startSim; window.xviTab = xTab; window.xviSetCoach = setCoach;

/* ---- settings drawer: Platform Simulations + coach ---- */
const _renderDrawer = renderDrawer;
renderDrawer = function () { _renderDrawer(); const D = $("drawer"), b = D.querySelector("b"); if (b && !S.appName) b.innerHTML = `<span class="xbrand" style="font-size:17px">${BRAND}</span>`;
  const about = [...D.querySelectorAll("h3")].find(h => h.textContent === "About"); if (!about) return;
  const cur = S.set.theme, wrap = document.createElement("div");
  wrap.innerHTML = `<h3>Platform Simulations</h3><div class="xdr">${Object.keys(PLAT).map(k => `<button data-xd="${k}" class="${cur === k ? "on" : ""}"><i style="background:linear-gradient(90deg,${PLAT[k].pal.slice(0, 4).join(",")})"></i>${PLAT[k].n}<small>${cur === k ? "Running" : PLAT[k].d}</small></button>`).join("")}<button data-xd="coach" class="${PLAT[cur] ? "" : "on"}" style="grid-column:span 2"><i style="background:linear-gradient(90deg,#fff,#4aa8ff,#2a7dff)"></i>XVI DNA Holo<small>${PLAT[cur] ? "Exit the simulation" : "Default · running"}</small></button></div>
  <h3>Coach</h3><div style="padding:6px 0">${chip()}</div>`;
  D.insertBefore(wrap, about); };
$("drawer").addEventListener("click", e => { const g = e.target.closest("[data-xg]"); if (g) { setCoach(g.dataset.xg); return; }
  const b = e.target.closest("[data-xd]"); if (!b) return; const k = b.dataset.xd; if (k === "coach") { closeDrawer(); if (PLAT[S.set.theme]) stopSim(); } else startSim(k); });

/* ---- start ---- */
applyTheme(S.set.theme); try { drawChart(); } catch (e) {}
setCoach(X.gender);
showView("home");
})();
