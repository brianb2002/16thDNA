/* ================= XVI DNA skin v3: full holographic tab scenes + first-launch coach picker ================= */
(() => {
const V = window.xvi, body = document.body, XA = window.XASSET || {}, RM = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const q = (s, r) => (r || document).querySelector(s), qa = (s, r) => [...(r || document).querySelectorAll(s)];
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* scene shell: the desk image unblurred, logo baked in, tab pills under it, three holo columns, desk + hands below */
const sc = h("div"); sc.id = "xScene";
sc.innerHTML = `<div class="sbg"><i data-g="female"></i><i data-g="male"></i></div><div class="sfx"></div><div class="stop"></div><div class="scols"><div class="col" data-c="0"></div><div class="col" data-c="1"></div><div class="col" data-c="2"></div></div>`;
body.append(sc);
qa(".sbg i", sc).forEach(i => i.style.backgroundImage = `url(${i.dataset.g === "male" ? XA.bg_m : XA.bg_f})`); /* chip-free backdrop; the chosen coach shows in the hero */
const cols = qa(".col", sc), top = q(".stop", sc);
const syncG = () => qa(".sbg i", sc).forEach(i => i.classList.toggle("on", i.dataset.g === V.X.gender));
const _setCoach = V.setCoach; V.setCoach = g => { _setCoach(g); syncG(); }; window.xviSetCoach = V.setCoach;
document.addEventListener("click", e => { if (e.target.closest("[data-xg]")) setTimeout(syncG, 0); }, true);

const card = (title, icon, cls) => { const c = h("section", "scard " + (cls || "")); c.innerHTML = `<div class="sh">${icon ? V.svg(icon) : ""}<h3>${title}</h3></div><div class="sb"></div>`; return c; };
const HOME = {}; const park = el => { if (!el) return el; if (!HOME[el.id]) { const mk = document.createComment("xvi-scene:" + el.id); el.parentNode.insertBefore(mk, el); HOME[el.id] = mk; } return el; };
function restore() { Object.keys(HOME).forEach(id => { const el = $(id), mk = HOME[id]; if (el && mk.parentNode) mk.parentNode.insertBefore(el, mk); }); cols.forEach(c => c.innerHTML = ""); }
const sec = id => { const s = $(id); if (s) { park(s); s.classList.add("sinner"); } return s; };
const wrapCard = (title, icon, ...els) => { const c = card(title, icon); els.forEach(e => e && q(".sb", c).append(e)); return c; };

/* hero = coach hologram + typed speech + ask */
function hero(text, acts) { const c = h("section", "scard shero"); c.innerHTML = `<div class="hfig2"><img alt="${V.X.gender} hologram coach" src="${V.coachImg()}"><i class="pad"></i></div><div class="hbody"><div class="say2"><span class="type">${esc(text)}</span></div><div class="hacts">${acts || ""}</div><button class="askbar" data-sa="teach">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 013 0V11"/><path d="M11 11V4a1.5 1.5 0 013 0v7"/><path d="M14 11V5.5a1.5 1.5 0 013 0V13"/><path d="M17 9.5a1.5 1.5 0 013 0V15a7 7 0 01-7 7h-1a7 7 0 01-5.6-2.8L3.6 15.4a1.6 1.6 0 012.4-2.1L8 15"/></svg>'}<em>Ask the coach…</em></button></div>`; return c; }
const nB = () => { try { return BADGES.filter(b => { try { return b[3](); } catch (e) { return false; } }).length; } catch (e) { return 0; } };

const LAYOUT = {
  coach: () => { const say = (($("cbTxt") || {}).textContent || "").trim();
    return [[wrapCard("Market state", "progress", sec("s-regime")), wrapCard("Account & market", "home", sec("s-account"))],
      [hero(say && !/^Loading/.test(say) ? say : "Live coach is on. Pick a market and I'll walk you through the trade.", `<button class="btn pri" data-sa="tour">▶ Start guided trade</button><button class="btn" data-sa="market">Open chart</button>`), wrapCard("Go / no-go", "coach", sec("s-verdict")), wrapCard("Plan", "market", sec("s-plan"))],
      [wrapCard("Today's focus · position size", "progress", sec("s-size")), wrapCard("Fee reality check", "journal", sec("s-fees"))]]; },
  lessons: () => [[wrapCard("Course path · learning mode", "lessons", sec("s-learn"))],
      [hero("Let's learn on the live chart. Turn on learning mode, then I'll pop up lessons when a good example shows up.", `<button class="btn pri" data-sa="tour">▶ Guided tour</button><button class="btn" data-sa="explain">▶ Explain chart</button><button class="btn" data-sa="spot">◎ Spot it</button>`), wrapCard("Market lingo", "lessons", sec("s-lingo"))],
      [quiz()]],
  research: () => [[hero("Let's research the market. The brain runs every strategy on each closed candle, and the lab tests one change at a time.", `<button class="btn" data-sa="market">Open chart</button>`)],
      [wrapCard("Brain · XVI DNA strategies", "research", sec("s-brain"))], [wrapCard("Research lab · self-improving brain", "research", sec("s-lab"))]],
  journal: () => { const tx = $("v-tx"); park(tx); tx.classList.add("sinner"); tx.style.display = "block"; try { renderTx(); } catch (e) {}
    return [[wrapCard("Trading days · transactions", "journal", tx)], [wrapCard("Trade journal entries", "journal", sec("s-lessons"))],
      [hero("Coach's notes on this entry: what you did well, and what to consider next time. Close a trade and I'll review it here.", `<button class="btn" data-sa="ask">💬 Review a trade with me</button>`)]]; },
  progress: () => { const s = sec("s-progress"), bl = $("badgeList"); park(bl); const bc = wrapCard("Badges & milestones", "progress", bl);
    return [[bc], [skill(), wrapCard("Checkpoints", "progress", s)], [hero(nB() ? "Nice work. Keep stacking checkpoints and keep your risk at one R." : "Your first badge comes from your first guided trade.", `<button class="btn pri" data-sa="tour">▶ Guided trade</button>`)]]; }
};
function quiz() { const c = card("Quick actions", "coach"); q(".sb", c).innerHTML = `<p class="note" style="margin:0 0 8px">Practice what you just learned.</p><div class="qa">${[["tour", "Take the guided trade"], ["explain", "Explain the live chart"], ["spot", "Spot it: find a pattern"], ["next", "Next lesson"], ["ask", "Ask a question"]].map(([a, l], i) => `<button data-sa="${a}"><b>${String.fromCharCode(65 + i)}</b>${l}</button>`).join("")}</div>`; return c; }
function skill() { const g = nB(), t = (typeof BADGES !== "undefined" ? BADGES.length : 1) || 1, lvl = 1 + Math.floor(g / 3); const c = card("Skill level", "progress"); q(".sb", c).innerHTML = `<div class="skill"><div class="ring" style="--p:${g / t * 100}"><b>Level <span class="xcount">${lvl}</span></b><small>Trader</small></div><div class="kv3"><div><b class="xcount">${g}</b><small>Badges</small></div><div><b class="xcount">${(S.lessons || []).length}</b><small>Trades reviewed</small></div><div><b class="xcount">${(S.lab && S.lab.runs || []).length}</b><small>Lab rounds</small></div></div></div><div class="xpbar"><i style="width:${Math.max(4, (g % 3) / 3 * 100)}%"></i></div><small class="mut">${3 - (g % 3)} badge${3 - (g % 3) === 1 ? "" : "s"} to Level ${lvl + 1}</small>`; return c; }

let cur = null;
function mountScene(tab) { restore(); cur = tab; const L = LAYOUT[tab] ? LAYOUT[tab]() : LAYOUT.coach();
  L.forEach((items, i) => { cols[i].innerHTML = ""; items.forEach((it, k) => { if (!it) return; it.style.setProperty("--d", (i * 90 + k * 70) + "ms"); cols[i].append(it); }); });
  top.append($("xTabs")); const tb = $("xTabs"); qa(".xchip", tb).forEach(x => x.remove()); tb.insertAdjacentHTML("beforeend", V.chip()); body.classList.add("x-scene"); sc.dataset.tab = tab; syncG();
  if (!RM()) { sc.classList.remove("in"); void sc.offsetWidth; sc.classList.add("in"); }
  qa(".type", sc).forEach(t => window.xviTypeIn && window.xviTypeIn(t)); setTimeout(() => window.xviCountUp && window.xviCountUp(sc), 200); }
function unmountScene() { if (!cur) return; restore(); const tx = $("v-tx"); if (tx) tx.classList.remove("sinner"); qa(".sinner").forEach(s => s.classList.remove("sinner")); const tb = $("xTabs"); if (tb) qa(".xchip", tb).forEach(x => x.remove()); const hdr = q(".wrap header"); if (tb && hdr) hdr.after(tb); body.classList.remove("x-scene"); cur = null; }
sc.addEventListener("click", e => { const b = e.target.closest("[data-sa]"); if (!b) return; const a = b.dataset.sa;
  if (a === "tour") $("startTour").click(); else if (a === "teach") window.xviAskTeacher && window.xviAskTeacher(b); else if (a === "ask") openAsk();
  else if (a === "market") showView(S.inst && isLev() ? "deriv" : "spot"); else if (a === "explain" || a === "spot") { showView(S.inst && isLev() ? "deriv" : "spot"); setTimeout(() => $(a === "explain" ? "expBtn" : "spotBtn").click(), 80); }
  else if (a === "next") { const n = [...document.querySelectorAll("#s-learn button")].find(x => /Next lesson/.test(x.textContent)); if (n) n.click(); else window.xviAskTeacher && window.xviAskTeacher(b); } });
const _sv = showView; showView = function (v) { _sv(v); if (v === "coach" && !body.classList.contains("touring")) mountScene(V.X.tab || "coach"); else unmountScene(); };
const _go = go; go = function (i) { unmountScene(); _go(i); };
const _et = endTour; endTour = function () { _et(); if (S.view === "coach") mountScene(V.X.tab || "coach"); };
if (S.view === "coach") mountScene(V.X.tab || "coach");

/* ---------- first-launch coach picker (coach_picker.png) ---------- */
let chosen = null; try { chosen = localStorage.getItem("xvi_coach_picked"); } catch (e) {}
const pk = h("div"); pk.id = "xPick"; pk.setAttribute("role", "dialog"); pk.setAttribute("aria-label", "Choose your coach");
pk.innerHTML = `<div class="pfill" style="background-image:url(${XA.picker})"></div><div class="pstage"><div class="pbg" style="background-image:url(${XA.picker})"></div>
  <div class="ptitle">Choose Your Coach</div>
  <button class="pfig" data-pg="male" style="left:27%;top:14%;width:17%;height:62%" aria-label="Male coach"></button>
  <button class="pfig" data-pg="female" style="left:56%;top:16%;width:16%;height:60%" aria-label="Female coach"></button>
  <div class="pcard" style="left:21.5%;top:74.5%;width:28%;height:19.5%"><span>COACH — MALE</span><button data-pg="male">SELECT</button></div>
  <div class="pcard" style="left:51.2%;top:74.5%;width:28%;height:19.5%"><span>COACH — FEMALE</span><button data-pg="female">SELECT</button></div>
  <button class="pside" data-ps="lessons" style="left:2%;top:21%;width:12.5%;height:7%">Lessons</button><button class="pside" data-ps="journal" style="left:2%;top:28.5%;width:12.5%;height:7%">Journal</button><button class="pside" data-ps="sims" style="left:2%;top:36%;width:12.5%;height:7%">Simulations</button>
  <button class="pside" data-ps="research" style="left:85.5%;top:21%;width:12.5%;height:7%">Research Lab</button><button class="pside" data-ps="market" style="left:85.5%;top:28.5%;width:12.5%;height:7%">Analyze</button><button class="pside" data-ps="menu" style="left:85.5%;top:36%;width:12.5%;height:7%">Settings</button>
  <p class="phint">Pick the hologram coach who'll teach you. You can swap anytime with the Coach chip.</p></div>`;
body.append(pk);
function layoutPick() { const s = q(".pstage", pk), vw = innerWidth, vh = innerHeight; let w = vw, hh = vw / 1.786; if (body.classList.contains("x-embed")) { w = Math.min(vw, vh * 1.786); hh = w / 1.786; } else if (hh < vh) { hh = vh; w = vh * 1.786; } s.style.width = w + "px"; s.style.height = hh + "px"; s.style.setProperty("--u", (w / 100) + "px"); s.style.left = (vw - w) / 2 + "px"; s.style.top = (vh - hh) / 2 + "px"; }
let nextAct = null;
function pick(g) { pk.classList.add("chosen-" + g); V.setCoach(g); try { localStorage.setItem("xvi_coach", g); localStorage.setItem("xvi_coach_picked", g); } catch (e) {}
  setTimeout(() => { pk.classList.add("out"); setTimeout(() => { pk.remove(); body.classList.remove("x-picking"); const a = nextAct; nextAct = null; if (a) { if (a === "sims") V.openSims(); else if (a === "menu") $("menuBtn").click(); else if (a === "market") showView("spot"); else V.xTab(a); } }, RM() ? 0 : 650); }, RM() ? 0 : 700); }
pk.addEventListener("click", e => { const g = e.target.closest("[data-pg]"); if (g) { pick(g.dataset.pg); return; } const s = e.target.closest("[data-ps]"); if (s) { nextAct = s.dataset.ps; pk.classList.add("needpick"); setTimeout(() => pk.classList.remove("needpick"), 900); try { toast("Pick your coach first, then I'll open " + s.textContent + "."); } catch (er) {} } });
if (chosen === "male" || chosen === "female") pk.remove(); else { body.classList.add("x-picking"); layoutPick(); window.addEventListener("resize", () => { if (pk.isConnected) layoutPick(); }); }
window.xviPick = pick;
})();
