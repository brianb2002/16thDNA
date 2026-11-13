/* ================= XVI DNA v6: 3D hologram room (three.js) — every screen and button is XVI data / an XVI action ================= */
(() => {
const V = window.xvi, body = document.body, XA = window.XASSET || {}, $q = (s, r) => (r || document).querySelector(s);
const RMq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null, RM = () => !!(RMq && RMq.matches) || document.body.classList.contains("xdev-rm");
const CDN = ["https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"],
  FX = ["shaders/CopyShader.js", "shaders/LuminosityHighPassShader.js", "postprocessing/EffectComposer.js", "postprocessing/RenderPass.js", "postprocessing/ShaderPass.js", "postprocessing/UnrealBloomPass.js"].map(p => "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/" + p);
const loadOne = u => new Promise((res, rej) => { const s = document.createElement("script"); s.src = u; s.async = false; s.onload = res; s.onerror = () => rej(new Error("load " + u)); document.head.appendChild(s); });
const loadSeq = us => us.reduce((p, u) => p.then(() => loadOne(u)), Promise.resolve());
const hasGL = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } };
const FD = "Orbitron, Rajdhani, sans-serif", FB = "Rajdhani, Inter, sans-serif", FM = '"Share Tech Mono", "JetBrains Mono", monospace';
const COL = { ink: "#eaf6ff", dim: "#8fb3d9", acc: "#4cc3ff", acc2: "#9fdcff", up: "#2ee6a8", dn: "#ff5a76", warn: "#ffb347", glass: "rgba(8,26,64,.78)", line: "rgba(140,210,255,.55)" };
const nf = (n, d) => (n == null || !isFinite(n)) ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
const pxf = n => n == null || !isFinite(n) ? "—" : n >= 1000 ? nf(n, 2) : n >= 1 ? nf(n, n >= 100 ? 2 : 3) : nf(n, 5);
const ema = (a, n) => { const k = 2 / (n + 1); let e = a[0]; return a.map(v => e = v * k + e * (1 - k)); };
const money = n => (n < 0 ? "−$" : "$") + nf(Math.abs(n || 0));
const sym = () => S.inst ? (S.inst.kind === "spot" ? S.inst.dataId : S.inst.label) : "—";
const tfName = () => (TFG[S.tf] || ["15m"])[0];
const lastPx = () => { const b = S.bars; return b && b.length ? b[b.length - 1].c : (S.inst && S.inst.price) || null; };
const dayChg = () => { const b = S.bars; if (!b || b.length < 2) return S.inst && S.inst.chg != null ? S.inst.chg : null; const n = Math.max(1, Math.round(86400 / S.tf)), f = b[Math.max(0, b.length - 1 - n)].c; return (b[b.length - 1].c - f) / f; };
const badges = () => { try { return [BADGES.filter(b => { try { return b[3](); } catch (e) { return false; } }).length, BADGES.length]; } catch (e) { return [0, 0]; } };
const realized = () => (S.lessons || []).reduce((a, L) => a + (L.net || 0), 0), wins = () => (S.lessons || []).filter(L => L.net > 0).length, losses = () => (S.lessons || []).filter(L => L.net <= 0).length;
const practice = () => { try { return UNI.practice(); } catch (e) { return true; } };
const netOK = () => !(UNI.NET && UNI.NET.ok === false);
const connSt = id => { const b = document.getElementById(id); return b ? b.dataset.st || "off" : "off"; };
/* the actions every desk/floor button maps to (all real XVI functions) */
const ACT = {
  coach: () => V.xTab("coach"), lessons: () => V.xTab("lessons"), research: () => V.xTab("research"), journal: () => V.xTab("journal"), progress: () => V.xTab("progress"),
  platforms: () => V.openSims(), ask: () => (window.xviAskTeacher ? window.xviAskTeacher() : openAsk()), ai: () => window.xviConnect && window.xviConnect("ai"), broker: () => window.xviConnect && window.xviConnect("broker"),
  chart: () => showView(S.inst && isLev() ? "deriv" : "spot"), menu: () => $("menuBtn").click(),
  buy: () => ticket(1), sell: () => ticket(-1), coachHolo: () => { if (window.xviHolo) window.xviHolo("coach"); else V.xTab("coach"); try { const t = ($("cbTxt") || {}).textContent || ""; speak("Hi, I'm your coach. " + (t && !/^Loading|Open this page/.test(t) ? t : "Pick a market and I'll walk you through it.")); } catch (e) {} }
};
/* BUY / SELL: open the XVI order ticket (Preview → Place order → Confirm; practice or live as connected) prefilled with side, symbol and price */
function ticket(side) { if (!S.inst) return; const noShort = side < 0 && !S.inst.canShort && !(typeof holding === "function" && holding() > 0);
  showView(S.inst && isLev() ? "deriv" : "spot"); setTimeout(() => { openTicket(side); const en = $("inEntry"); try { const p = lastPx(); if (en && p && !en.value) en.value = rp(p); } catch (e) {}
    const px = en && parseFloat(String(en.value).replace(/,/g, "")), t = (($("tkTitle") || {}).textContent || sym()).split(" · ")[0].replace(/ \(order book.*\)/, "");
    toast((noShort ? `${t} can't be shorted on spot, and you hold none, so there is nothing to sell yet. ` : "") + `${side > 0 ? "BUY" : "SELL"} ${t} at ${pxf(px || lastPx())} · ${practice() ? "practice account" : "live account"}. Preview, then Place order, then Confirm.`); }, 120); }
window.xvi6 = { ACT };
/* v7: every XVI action the desk can carry (Edit desk tray lists all of them) */
Object.assign(ACT, { spot: () => showView("spot"), deriv: () => showView("deriv"), markets: () => showView("trade"), tx: () => showView("tx"),
  voice: () => { const b = $("voiceBtn"); if (b) b.click(); }, tour: () => { V.xTab("coach"); setTimeout(() => { const b = $("startTour"); if (b) b.click(); }, 80); },
  explain: () => { ACT.chart(); setTimeout(() => { try { showExplain(); } catch (e) {} }, 220); }, edit: () => { if (window.xvi6 && xvi6.edit) xvi6.edit(true); else toast("Edit desk needs the 3D room (WebGL), which is off in this browser."); }, dev: () => window.XVIdev && XVIdev.toggle() });
Object.keys(V.PLAT || {}).forEach(k => { ACT["sim_" + k] = () => V.startSim(k); });
const BTN = { coach: ["COACH", "Coach tab"], lessons: ["LESSONS", "Lessons tab"], research: ["RESEARCH", "Research Lab"], journal: ["JOURNAL", "Journal tab"], progress: ["PROGRESS", "Progress tab"],
  platforms: ["PLATFORMS", "Platform simulations"], ask: ["ASK ✋", "Ask the Teacher"], ai: ["CONNECT AI", "Connect AI"], broker: ["BROKER", "Connect Broker"], chart: ["SYMBOL", "Live chart"],
  buy: ["BUY", "Buy ticket"], sell: ["SELL", "Sell ticket"], menu: ["SETTINGS", "Settings"], spot: ["SPOT", "Spot market"], deriv: ["DERIVS", "Derivatives"], markets: ["MARKETS", "Trade / markets"],
  tx: ["TRANSACT", "Transactions"], voice: ["VOICE", "Voice on/off"], tour: ["TOUR", "Guided trade"], explain: ["EXPLAIN", "Explain this chart"], dev: ["DEV", "Developer mode"] };
Object.keys(V.PLAT || {}).forEach(k => { BTN["sim_" + k] = [String(V.PLAT[k].n || k).toUpperCase().slice(0, 12), V.PLAT[k].n + " simulation"]; });
const SWATCH = ["", "#4cc3ff", "#2ee6a8", "#ff5a76", "#ffb347", "#ffd36a", "#b48cff", "#ff7ad9", "#ffffff"];
/* optional soft click (Settings → Sounds; off by default) */
{ let ac = null; const on = () => { try { return localStorage.getItem("xvi_sfx") === "1"; } catch (e) { return false; } };
  const sfx = window.XVIsfx = () => { if (!on()) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(1250, t); o.frequency.exponentialRampToValueAtTime(620, t + .07); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .11); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .12); } catch (e) {} };
  sfx.isOn = on; sfx.setOn = v => { try { localStorage.setItem("xvi_sfx", v ? "1" : "0"); } catch (e) {} }; }
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !UNI.host && window.top === window) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

/* ---------- accessible / no-WebGL control strip (same actions) ---------- */
const NAV = [["edit", "Edit desk"], ["dev", "Dev mode"], ["coach", "Coach"], ["lessons", "Lessons"], ["research", "Research Lab"], ["journal", "Journal"], ["progress", "Progress"], ["platforms", "Platforms"], ["ask", "Ask the Teacher"], ["ai", "Connect AI"], ["broker", "Connect Broker"], ["sell", "Sell"], ["buy", "Buy"], ["chart", "Live chart"], ["menu", "Settings"]];
const sr = document.createElement("nav"); sr.id = "x6nav"; sr.setAttribute("aria-label", "Holo desk controls");
sr.innerHTML = NAV.map(([k, l]) => `<button type="button" data-a6="${k}">${l}</button>`).join(""); body.prepend(sr);
/* v7 L4: closed drawer / ticket controls are taken out of the Tab order */
{ const inr = () => { const d = $("drawer"), t = $("ticket"); if (d) d.inert = !d.classList.contains("show"); if (t) t.inert = !t.classList.contains("show") && !t.classList.contains("xw-docked"); };
  ["drawer", "ticket"].forEach(id => { const el = $(id); if (el) new MutationObserver(inr).observe(el, { attributes: true, attributeFilter: ["class"] }); }); inr(); }
sr.addEventListener("click", e => { const b = e.target.closest("[data-a6]"); if (b) { XVIsfx(); ACT[b.dataset.a6](); } });
/* HUD: balance / P&L from XVI state */
const hud = document.createElement("div"); hud.id = "x6hud"; hud.innerHTML = `<div class="b"><small id="x6mode">PRACTICE</small><b id="x6bal">—</b><span id="x6pl"></span></div>`; body.append(hud);
const brand = document.createElement("div"); brand.id = "x6brand"; brand.innerHTML = `XVI<sup>TH</sup> <em>DNA</em><small>HOLO DESK</small>`; body.append(brand);
const hint = document.createElement("div"); hint.id = "x6hint"; hint.textContent = "Tap the desk or a screen · drag to look around"; body.append(hint);
function hudPaint() { $("x6mode").textContent = practice() ? "PRACTICE ACCOUNT" : "LIVE ACCOUNT"; $("x6bal").textContent = money(S.balance || 0); const r = realized(), n = (S.lessons || []).length;
  $("x6pl").innerHTML = n ? `<i class="${r >= 0 ? "up" : "dn"}">${r >= 0 ? "+" : "−"}$${nf(Math.abs(r))}</i> realized · ${wins()}W ${losses()}L` : "No closed trades yet"; }

/* v7: the tab cards start right under the tab bar, however many rows it takes */
{ const scn = $("xScene"); if (scn) { const fitTop = () => { const tb = $("xTabs"); if (!tb || !body.classList.contains("x-scene")) return; const r = tb.getBoundingClientRect(); if (r.height) scn.style.setProperty("--x7top", Math.round(r.bottom + 12) + "px"); };
  new MutationObserver(() => requestAnimationFrame(fitTop)).observe(body, { attributes: true, attributeFilter: ["class"] }); addEventListener("resize", fitTop); setInterval(fitTop, 1500); } }
/* never leave scene cards invisible if the entry animation can't run (busy GPU) */
{ const scn = $("xScene"); if (scn) { let st = 0, key = ""; new MutationObserver(() => { const k = (scn.classList.contains("in") ? "in:" : "out:") + (scn.dataset.tab || ""); if (k === key) return; key = k; clearTimeout(st); if (scn.classList.contains("x5done")) scn.classList.remove("x5done"); if (k.startsWith("in:")) st = setTimeout(() => scn.classList.add("x5done"), 1400); }).observe(scn, { attributes: true, attributeFilter: ["class", "data-tab"] }); } }
if (!hasGL()) { body.classList.add("x-no3d"); setInterval(hudPaint, 2000); hudPaint(); return; }
body.classList.add("x-3dload");
loadSeq(CDN).then(() => loadSeq(FX).then(() => true, () => false)).then(bloomOK => { try { build(bloomOK); } catch (e) { body.classList.remove("x-3dload"); body.classList.add("x-no3d"); } }, () => { body.classList.remove("x-3dload"); body.classList.add("x-no3d"); setInterval(hudPaint, 2000); hudPaint(); });

function build(bloomOK) {
  const T3 = window.THREE, PI = Math.PI, D = PI / 180;
  const cv = document.createElement("canvas"); cv.id = "x3d"; cv.setAttribute("aria-hidden", "true"); body.prepend(cv);
  const renderer = new T3.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" });
  let PR = Math.min(devicePixelRatio || 1, 1.75); renderer.setPixelRatio(PR); renderer.outputEncoding = T3.sRGBEncoding; renderer.toneMapping = T3.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  const scene = new T3.Scene(); scene.background = new T3.Color(0x030b1f); scene.fog = new T3.FogExp2(0x05153a, 0.038);
  const cam = new T3.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 80);
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const tex = c => { const t = new T3.CanvasTexture(c); t.encoding = T3.sRGBEncoding; t.anisotropy = 4; return t; };
  const glowMat = (c, o) => new T3.MeshBasicMaterial({ color: c, transparent: o != null, opacity: o == null ? 1 : o, toneMapped: false });
  /* --- room --- */
  { const c = mk(1024, 1024), g = c.getContext("2d"), gr = g.createRadialGradient(512, 512, 40, 512, 512, 512); gr.addColorStop(0, "#123b7a"); gr.addColorStop(.45, "#071c45"); gr.addColorStop(1, "#030b1f"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = "rgba(120,200,255,.20)"; g.lineWidth = 1.2; for (let r = 40; r < 512; r += 38) { g.beginPath(); g.arc(512, 512, r, 0, 2 * PI); g.stroke(); }
    for (let a = 0; a < 48; a++) { g.beginPath(); g.moveTo(512, 512); g.lineTo(512 + Math.cos(a / 48 * 2 * PI) * 512, 512 + Math.sin(a / 48 * 2 * PI) * 512); g.stroke(); }
    const fl = new T3.Mesh(new T3.CircleGeometry(15, 96), new T3.MeshBasicMaterial({ map: tex(c) })); fl.rotation.x = -PI / 2; scene.add(fl); }
  { const c = mk(256, 1024), g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#020815"); gr.addColorStop(.5, "#0a2457"); gr.addColorStop(1, "#04112c"); g.fillStyle = gr; g.fillRect(0, 0, 256, 1024);
    g.fillStyle = "rgba(160,220,255,.55)"; g.fillRect(122, 120, 3, 700); g.fillStyle = "rgba(90,170,255,.18)"; g.fillRect(20, 0, 2, 1024); g.fillRect(232, 0, 2, 1024);
    for (let y = 860; y < 1000; y += 18) { g.fillStyle = "rgba(120,200,255,.12)"; g.fillRect(0, y, 256, 2); }
    const t = tex(c); t.wrapS = T3.RepeatWrapping; t.repeat.x = 22; const w = new T3.Mesh(new T3.CylinderGeometry(15, 15, 11, 96, 1, true), new T3.MeshBasicMaterial({ map: t, side: T3.BackSide })); w.position.y = 5.5; scene.add(w); }
  [[9.5, 8.6, 0x9fdcff], [6.2, 8.9, 0x4cc3ff], [3.4, .02, 0x4cc3ff], [5.6, .02, 0x2a7dff]].forEach(([r, y, c]) => { const m = new T3.Mesh(new T3.TorusGeometry(r, y < 1 ? .018 : .05, 8, 160), glowMat(c)); m.rotation.x = PI / 2; m.position.y = y; scene.add(m); });
  const parts = (() => { const n = 520, g = new T3.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = 2 + Math.random() * 11, a = Math.random() * 2 * PI; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = Math.random() * 8; p[i * 3 + 2] = Math.sin(a) * r; }
    g.setAttribute("position", new T3.BufferAttribute(p, 3)); const m = new T3.Points(g, new T3.PointsMaterial({ color: 0x9fdcff, size: .035, transparent: true, opacity: .7, depthWrite: false })); scene.add(m); return m; })();
  /* --- wall screens (v7): one big main screen + side screens; each shows one XVI "content"; screens can move, resize and swap --- */
  const R = 7.2, PANELS = {}, pick = [], CONTENT = {};
  const POS = [{ ang: 0, y: 4.05 }, { ang: -40, y: 3.05 }, { ang: 40, y: 3.05 }, { ang: -74, y: 2.7 }, { ang: 74, y: 2.7 }];
  const content = (k, t, draw, hit) => { CONTENT[k] = { k, t, draw, hit }; };
  function panel(id, w, h, cw, pos, ck) { const c = mk(cw, Math.round(cw * h / w)), t = tex(c), grp = new T3.Group();
    const m = new T3.Mesh(new T3.PlaneGeometry(w, h), new T3.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false })); m.userData.id = id;
    const back = new T3.Mesh(new T3.PlaneGeometry(w + .12, h + .12), new T3.MeshBasicMaterial({ color: 0x0b2a66, transparent: true, opacity: .55 })); back.position.z = -.02;
    const edge = new T3.LineSegments(new T3.EdgesGeometry(new T3.PlaneGeometry(w + .12, h + .12)), new T3.LineBasicMaterial({ color: 0x9fdcff, toneMapped: false })); edge.position.z = -.015;
    grp.add(back, edge, m); scene.add(grp);
    const P = PANELS[id] = { id, ck, c, g: c.getContext("2d"), t, m, edge, W3: w, H3: h, w: c.width, h: c.height, hits: [], grp, pos, cur: { ang: POS[pos].ang, y: POS[pos].y, s: 1 }, tgt: null, flip: null,
      draw: P => (CONTENT[P.ck] || CONTENT.chart).draw(P), onHit: a => { const C = CONTENT[P.ck]; if (C && C.hit) C.hit(a); } };
    P.tgt = Object.assign({}, P.cur); pick.push(m); place(P); return P; }
  function place(P) { const a = P.cur.ang * D, y = P.cur.y; P.grp.position.set(Math.sin(a) * R, y, -Math.cos(a) * R); P.grp.lookAt(0, y, 0); if (P.flip && P.flip.r) P.grp.rotateY(P.flip.r); if (P.ry) P.grp.rotateY(P.ry); P.grp.scale.setScalar(P.cur.s); }
  function frame(P, title, sub) { const g = P.g, W = P.w, H = P.h; g.clearRect(0, 0, W, H); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(30,90,190,.78)"); gr.addColorStop(.25, "rgba(8,26,64,.86)"); gr.addColorStop(1, "rgba(6,20,52,.9)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(170,225,255,.05)"; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    g.font = `700 ${Math.round(W / 26)}px ${FD}`; g.fillStyle = "#fff"; g.shadowColor = "#4cc3ff"; g.shadowBlur = 14; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(title, W * .04, W * .062); g.shadowBlur = 0;
    if (sub) { g.font = `600 ${Math.round(W / 40)}px ${FB}`; g.fillStyle = COL.dim; g.textAlign = "right"; g.fillText(sub, W * .96, W * .06); g.textAlign = "left"; }
    g.fillStyle = "rgba(140,210,255,.35)"; g.fillRect(W * .04, W * .08, W * .92, 2); P.hits = []; }
  const txt = (g, s, x, y, f, c, al) => { g.font = f; g.fillStyle = c || COL.ink; g.textAlign = al || "left"; g.fillText(s, x, y); };
  const fit = (g, s, mw) => { if (g.measureText(s).width <= mw) return s; while (s.length > 1 && g.measureText(s + "…").width > mw) s = s.slice(0, -1); return s + "…"; };
  function wrap(g, s, x, y, mw, lh, maxL, f, c) { g.font = f; g.fillStyle = c; const w = String(s).split(/\s+/); let line = "", n = 0; for (const t of w) { const tt = line ? line + " " + t : t; if (g.measureText(tt).width > mw && line) { g.fillText(line, x, y + n * lh); n++; line = t; if (n >= maxL) return; } else line = tt; } if (line && n < maxL) g.fillText(line, x, y + n * lh); }
  /* main chart: XVI's selected symbol, timeframe and live candles */
  content("chart", "Chart", P => { const g = P.g, W = P.w, H = P.h, live = S.live && netOK(); frame(P, sym() + " · " + tfName(), live ? (UNI.NET.sim ? "DEMO DATA · PRACTICE" : "LIVE · " + (practice() ? "PRACTICE" : "TRADING")) : S.bars.length ? "OFFLINE · last data" : "LOADING");
    const b = (S.bars || []).slice(-90), x0 = W * .04, x1 = W * .86, y0 = H * .17, y1 = H * .78, v0 = H * .8, v1 = H * .94;
    if (b.length < 2) { txt(g, S.inst && S.inst.kind === "stock" ? "Stock bars need a broker server with stock data (Connect Broker)." : "Loading live candles…", W / 2, H / 2, `600 ${W / 40}px ${FB}`, COL.dim, "center"); return; }
    let lo = Math.min(...b.map(k => k.l)), hi = Math.max(...b.map(k => k.h)); const pad = (hi - lo) * .06 || 1; lo -= pad; hi += pad; const Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0), cw = (x1 - x0) / b.length, vm = Math.max(...b.map(k => k.v || 0)) || 1;
    g.strokeStyle = "rgba(140,210,255,.12)"; g.lineWidth = 1; for (let i = 0; i <= 4; i++) { const yy = y0 + (y1 - y0) * i / 4; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke(); txt(g, pxf(hi - (hi - lo) * i / 4), x1 + 10, yy + 6, `${W / 64}px ${FM}`, COL.dim); }
    b.forEach((k, i) => { const x = x0 + i * cw + cw / 2, up = k.c >= k.o, c = up ? COL.up : COL.dn; g.strokeStyle = c; g.fillStyle = c; g.lineWidth = Math.max(1, cw * .12); g.beginPath(); g.moveTo(x, Y(k.h)); g.lineTo(x, Y(k.l)); g.stroke();
      const bt = Y(Math.max(k.o, k.c)), bh = Math.max(1.5, Math.abs(Y(k.o) - Y(k.c))); g.globalAlpha = up ? .95 : .9; g.fillRect(x - cw * .34, bt, cw * .68, bh); g.globalAlpha = .35; const vh = (k.v || 0) / vm * (v1 - v0); g.fillRect(x - cw * .34, v1 - vh, cw * .68, vh); g.globalAlpha = 1; });
    const e = ema(b.map(k => k.c), 21); g.strokeStyle = "#ffd36a"; g.lineWidth = 2.5; g.beginPath(); e.forEach((v, i) => { const x = x0 + i * cw + cw / 2; i ? g.lineTo(x, Y(v)) : g.moveTo(x, Y(v)); }); g.stroke();
    const p = b[b.length - 1].c, py = Y(p), ch = dayChg(); g.setLineDash([8, 6]); g.strokeStyle = COL.acc; g.beginPath(); g.moveTo(x0, py); g.lineTo(x1, py); g.stroke(); g.setLineDash([]);
    g.fillStyle = COL.acc; g.fillRect(x1 + 4, py - H * .03, W * .13, H * .06); txt(g, pxf(p), x1 + 10, py + H * .015, `700 ${W / 52}px ${FM}`, "#03122e");
    txt(g, pxf(p), W * .04, H * .135, `700 ${W / 30}px ${FM}`, "#fff"); if (ch != null) txt(g, (ch >= 0 ? "+" : "−") + nf(Math.abs(ch * 100)) + "% 24h", W * .3, H * .135, `600 ${W / 46}px ${FM}`, ch >= 0 ? COL.up : COL.dn);
    txt(g, "EMA 21", W * .55, H * .135, `600 ${W / 60}px ${FM}`, "#ffd36a"); txt(g, "Tap to open the full chart", W * .96, H * .135, `600 ${W / 60}px ${FB}`, COL.dim, "right");
    P.hits.push([0, 0, W, H, "chart"]); }, a => ACT[a] && ACT[a]());
  /* watchlist: XVI market list (live Coinbase); tapping a row selects it in XVI */
  const wlSrc = () => { const I = S.inst, lev = I && isLev(); const L = lev ? (S.lists.futures || []).concat(S.lists.perps || []) : I && I.kind === "stock" ? [].concat(typeof STOCKS !== "undefined" ? STOCKS : [], typeof FXETF !== "undefined" ? FXETF : [], typeof CMDETF !== "undefined" ? CMDETF : []) : (S.lists.crypto || []);
    return { lev, kind: lev ? (I.kind === "perp" ? "PERPS" : "FUTURES") : I && I.kind === "stock" ? "STOCKS" : "CRYPTO", L }; };
  const wlRows = () => { const { L } = wlSrc(), I = S.inst; let R = L.slice().sort((a, b) => (b.usdVol || 0) - (a.usdVol || 0)).slice(0, 9);
    if (I && !R.some(m => m.key === I.key)) R = [I].concat(R.slice(0, 8)); return R; };
  content("watch", "Watchlist", P => { const g = P.g, W = P.w, H = P.h, F = Math.min(W, H * .82), src = wlSrc(), L = wlRows(); frame(P, "WATCHLIST", src.kind + (UNI.NET.sim ? " · DEMO" : netOK() ? " · LIVE" : " · OFFLINE"));
    if (!L.length) { txt(g, netOK() ? "Loading markets…" : "No live data", W / 2, H / 2, `600 ${F / 18}px ${FB}`, COL.dim, "center"); return; }
    const rh = (H * .86) / 9.4; L.forEach((m, i) => { const y = H * .12 + i * rh, on = S.inst && S.inst.key === m.key, px = on ? lastPx() : m.price, ch = on ? dayChg() : m.chg;
      if (on) { g.fillStyle = "rgba(76,195,255,.22)"; g.fillRect(W * .03, y, W * .94, rh - 6); }
      g.font = `700 ${F / (src.lev ? 20 : 15)}px ${FD}`; txt(g, fit(g, m.label, W * .4), W * .06, y + rh * .62, g.font, on ? "#fff" : COL.ink); txt(g, pxf(px), W * .7, y + rh * .62, `${F / 17}px ${FM}`, COL.ink, "right");
      txt(g, ch == null ? "—" : (ch >= 0 ? "+" : "−") + nf(Math.abs(ch * 100)) + "%", W * .95, y + rh * .62, `${F / 19}px ${FM}`, ch >= 0 ? COL.up : COL.dn, "right"); P.hits.push([0, y, W, rh, "sym:" + m.key]); }); },
    a => { if (a.startsWith("sym:")) { const k = a.slice(4), m = wlRows().find(x => x.key === k); if (m && (!S.inst || S.inst.key !== k)) { selectInst(m); toast(`${m.label} selected. The chart and ticket now follow ${m.label}.`); } else if (m) ACT.chart(); } });
  /* account: balance, mode and P&L straight from XVI */
  content("acct", "Account", P => { const g = P.g, W = P.w, H = P.h, F = Math.min(W, H * .82), r = realized(), n = (S.lessons || []).length, [gb, gt] = badges(); frame(P, "ACCOUNT", practice() ? "PRACTICE" : "LIVE");
    txt(g, practice() ? "Practice balance" : "Buying power", W * .06, H * .17, `600 ${F / 18}px ${FB}`, COL.dim); txt(g, money(S.balance || 0), W * .06, H * .27, `700 ${F / 9.5}px ${FM}`, "#fff");
    txt(g, "Realized P&L", W * .06, H * .37, `600 ${F / 18}px ${FB}`, COL.dim); txt(g, n ? (r >= 0 ? "+" : "−") + "$" + nf(Math.abs(r)) : "—", W * .06, H * .46, `700 ${F / 11}px ${FM}`, n ? (r >= 0 ? COL.up : COL.dn) : COL.ink);
    const st = [["Trades", n], ["Wins", wins()], ["Losses", losses()], ["Fills", (S.fills || []).length], ["Badges", gb + "/" + gt], ["Lesson cap", S.learn && S.learn.on ? "$" + nf(S.learn.cap) : "off"]];
    st.forEach(([k, v], i) => { const x = W * (.06 + (i % 2) * .47), y = H * (.55 + Math.floor(i / 2) * .12); g.fillStyle = "rgba(6,22,56,.65)"; g.fillRect(x, y, W * .42, H * .1); txt(g, k, x + 12, y + H * .038, `600 ${F / 24}px ${FB}`, COL.dim); txt(g, String(v), x + 12, y + H * .083, `700 ${F / 18}px ${FM}`, "#fff"); });
    txt(g, "Tap: Journal", W * .94, H * .97, `600 ${F / 26}px ${FB}`, COL.dim, "right"); P.hits.push([0, 0, W, H, "journal"]); }, a => ACT[a] && ACT[a]());
  /* coach verdict panel */
  content("coach", "Coach", P => { const g = P.g, W = P.w, H = P.h, F = Math.min(W, H * .82); frame(P, "COACH", (V.X.gender || "female").toUpperCase()); const vd = S.vd ? S.vd[1] : "Reading the market…", t = (($("cbTxt") || {}).textContent || "Pick a market and I'll walk you through it.").trim();
    txt(g, vd, W * .06, H * .25, `800 ${F / 12}px ${FD}`, /NO|STOP|SKIP/.test(vd) ? COL.dn : /GO|TAKE|LONG|SHORT/.test(vd) ? COL.up : COL.warn); wrap(g, t, W * .06, H * .38, W * .88, W / 15, 6, `600 ${F / 19}px ${FB}`, COL.ink);
    txt(g, "Tap: Coach tab", W * .94, H * .95, `600 ${F / 24}px ${FB}`, COL.dim, "right"); P.hits.push([0, 0, W, H, "coach"]); }, a => ACT[a] && ACT[a]());
  /* the six platform simulations */
  const simImg = {}; Object.keys(V.PLAT).forEach(k => { const im = new Image(); im.onload = () => { Object.values(PANELS).forEach(P => { if (P.ck === "plats") redrawP(P); }); }; im.src = XA["sim_" + k] || ""; simImg[k] = im; });
  content("plats", "Platforms", P => { const g = P.g, W = P.w, H = P.h, F = Math.min(W, H * .82), ks = Object.keys(V.PLAT); frame(P, "PLATFORMS", "SIMULATIONS");
    ks.forEach((k, i) => { const nc = W / H > 1.3 ? 3 : 2, cw = W * (.92 / nc - .04), chh = H * (nc === 3 ? .36 : .25), x = W * (.04 + (i % nc) * (.92 / nc)), y = H * (.13 + Math.floor(i / nc) * (nc === 3 ? .42 : .28)), pl = V.PLAT[k]; const im = simImg[k];
      if (im && im.complete && im.naturalWidth) { g.globalAlpha = .9; g.drawImage(im, x, y, cw, chh); g.globalAlpha = 1; } else { g.fillStyle = pl.pal[4]; g.fillRect(x, y, cw, chh); }
      g.fillStyle = "rgba(3,11,31,.6)"; g.fillRect(x, y + chh * .66, cw, chh * .34); g.strokeStyle = pl.pal[0]; g.lineWidth = 3; g.strokeRect(x, y, cw, chh); txt(g, fit(g, pl.n.toUpperCase(), cw - 12), x + 8, y + chh * .92, `700 ${F / 30}px ${FD}`, "#fff"); P.hits.push([x, y, cw, chh, "sim:" + k]); }); },
    a => { if (a.startsWith("sim:")) V.startSim(a.slice(4)); });
  /* v7 extra screen contents: order book, journal, progress */
  let BOOK = null, bookT = 0, bookBusy = false;
  async function pullBook() { const I = S.inst; if (bookBusy || !I || I.kind === "stock" || I.src === "wb" || !netOK()) return; bookBusy = true;
    try { const p = await call(CB, "coinbase_products_book", { product_id: I.dataId, product_type: I.ptype, limit: 12 }, { cache: false }); if (p && p.pricebook) BOOK = { k: I.key, b: p.pricebook, t: Date.now() }; } catch (e) {} bookBusy = false; }
  content("book", "Order book", P => { const g = P.g, W = P.w, H = P.h, F = Math.min(W, H * .82), I = S.inst; frame(P, "ORDER BOOK", sym() + (UNI.NET.sim ? " · DEMO" : netOK() ? " · LIVE" : " · OFFLINE"));
    if (!I || I.kind === "stock" || I.src === "wb") { txt(g, "No order book for stocks here.", W / 2, H / 2, `600 ${F / 20}px ${FB}`, COL.dim, "center"); P.hits.push([0, 0, W, H, "chart"]); return; }
    const b = BOOK && BOOK.k === I.key ? BOOK.b : null; if (!b || !b.bids || !b.asks || !b.bids.length || !b.asks.length) { txt(g, netOK() ? "Loading the order book…" : "No live data", W / 2, H / 2, `600 ${F / 20}px ${FB}`, COL.dim, "center"); return; }
    const n = 7, asks = b.asks.slice(0, n).reverse(), bids = b.bids.slice(0, n), mx = Math.max(...asks.concat(bids).map(x => +x.size || 0)) || 1, top = H * .14, rh = (H * .84) / (2 * n + 1.3);
    txt(g, "PRICE", W * .06, top - 6, `600 ${F / 30}px ${FB}`, COL.dim); txt(g, "SIZE", W * .94, top - 6, `600 ${F / 30}px ${FB}`, COL.dim, "right");
    const row = (q, y, c, f) => { const s = +q.size || 0; g.fillStyle = f; g.fillRect(W * .97 - s / mx * W * .9, y + 2, s / mx * W * .9, rh - 4); txt(g, pxf(+q.price), W * .06, y + rh * .72, `700 ${F / 22}px ${FM}`, c); txt(g, nf(s, s >= 100 ? 0 : 4), W * .94, y + rh * .72, `${F / 24}px ${FM}`, COL.ink, "right"); };
    asks.forEach((q, i) => row(q, top + i * rh, COL.dn, "rgba(255,90,118,.22)"));
    const sp = +b.asks[0].price - +b.bids[0].price, my = top + n * rh; txt(g, "Spread " + pxf(sp), W / 2, my + rh * .9, `700 ${F / 24}px ${FM}`, COL.acc2, "center");
    bids.forEach((q, i) => row(q, my + rh * 1.3 + i * rh, COL.up, "rgba(46,230,168,.2)")); P.hits.push([0, 0, W, H, "chart"]); }, a => ACT[a] && ACT[a]());
  content("journal", "Journal", P => { const g = P.g, W = P.w, H = P.h, F = Math.min(W, H * .82), L = (S.lessons || []).slice(0, 7); frame(P, "JOURNAL", L.length ? S.lessons.length + " CLOSED" : "NO TRADES YET");
    if (!L.length) { wrap(g, "Closed trades show up here with their fees and net result. Place a practice trade (BUY or SELL on the desk) to start your journal.", W * .06, H * .26, W * .88, F / 13, 7, `600 ${F / 19}px ${FB}`, COL.dim); P.hits.push([0, 0, W, H, "journal"]); return; }
    const rh = H * .8 / 7; L.forEach((l, i) => { const y = H * .13 + i * rh, up = l.net > 0; g.fillStyle = i % 2 ? "rgba(6,22,56,.55)" : "rgba(12,36,84,.55)"; g.fillRect(W * .03, y, W * .94, rh - 5);
      txt(g, (l.side > 0 ? "LONG " : "SHORT ") + String(l.pid || "").split("-")[0], W * .06, y + rh * .62, `700 ${F / 22}px ${FD}`, l.side > 0 ? COL.up : COL.dn);
      txt(g, l.t1 ? new Date(l.t1).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "", W * .56, y + rh * .62, `${F / 24}px ${FM}`, COL.dim, "center");
      txt(g, (up ? "+" : "−") + "$" + nf(Math.abs(l.net || 0), Math.abs(l.net || 0) < 1 ? 3 : 2), W * .94, y + rh * .62, `700 ${F / 21}px ${FM}`, up ? COL.up : COL.dn, "right"); });
    P.hits.push([0, 0, W, H, "journal"]); }, a => ACT[a] && ACT[a]());
  content("progress", "Progress", P => { const g = P.g, W = P.w, H = P.h, F = Math.min(W, H * .82), B = typeof BADGES !== "undefined" ? BADGES : [], [gb, gt] = badges(); frame(P, "PROGRESS", gb + " / " + gt + " BADGES");
    g.fillStyle = "rgba(6,22,56,.8)"; g.fillRect(W * .06, H * .13, W * .88, H * .045); g.fillStyle = COL.up; g.fillRect(W * .06, H * .13, W * .88 * (gt ? gb / gt : 0), H * .045);
    const ok = b => { try { return !!b[3](); } catch (e) { return false; } }, L = B.slice().sort((a, b) => ok(b) - ok(a)).slice(0, 8), cols = W / H > 1.3 ? 2 : 1, rows = Math.ceil(L.length / cols) || 1, rh = H * .74 / Math.max(rows, 4);
    L.forEach((b, i) => { const x = W * (.06 + (i % cols) * (.88 / cols)), y = H * .21 + Math.floor(i / cols) * rh, on = ok(b); txt(g, on ? "★" : "☆", x, y + rh * .6, `700 ${F / 18}px ${FB}`, on ? "#ffd36a" : COL.dim);
      txt(g, fit(g, b[1], W * .8 / cols), x + F / 14, y + rh * .6, `700 ${F / 22}px ${FB}`, on ? "#fff" : COL.dim); });
    P.hits.push([0, 0, W, H, "progress"]); }, a => ACT[a] && ACT[a]());
  /* the screens: one big main screen plus four side screens */
  const MAIN = panel("main", 5.6, 3.05, 1400, 0, "chart"); MAIN.us = 1; panel("s1", 2.7, 3.3, 760, 1, "watch"); panel("s2", 2.7, 3.3, 760, 2, "acct"); panel("s3", 2.5, 2.3, 700, 3, "coach"); panel("s4", 2.5, 2.3, 700, 4, "plats");
  const TABS = ["chart", "watch", "book", "coach", "plats", "journal", "progress", "acct"];
  const RC = mk(1400, 96), rgx = RC.getContext("2d"), rT = tex(RC), rail = new T3.Mesh(new T3.PlaneGeometry(5.6, .384), new T3.MeshBasicMaterial({ map: rT, transparent: true, toneMapped: false }));
  rail.position.set(0, -3.05 / 2 - .3, 0); rail.userData.id = "rail"; MAIN.grp.add(rail); pick.push(rail); let railHits = [];
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  function drawRail() { const g = rgx, W = 1400, H = 96, n = TABS.length, tw = W / n; g.clearRect(0, 0, W, H); railHits = [];
    TABS.forEach((k, i) => { const on = MAIN.ck === k, x = i * tw; rr(g, x + 4, 8, tw - 8, H - 16, 16); g.fillStyle = on ? "rgba(76,195,255,.6)" : "rgba(8,26,64,.85)"; g.fill(); g.lineWidth = on ? 4 : 2; g.strokeStyle = on ? "#fff" : "rgba(160,220,255,.6)"; g.stroke();
      g.font = `700 21px ${FD}`; txt(g, fit(g, ({ plats: "SIMS", watch: "WATCH", book: "BOOK", acct: "ACCOUNT" }[k] || CONTENT[k].t).toUpperCase(), tw - 16), x + tw / 2, H * .6, g.font, on ? "#fff" : COL.acc2, "center"); railHits.push([x, 0, tw, H, "tab:" + k]); }); rT.needsUpdate = true; }
  /* resize handle (edit mode, Screens) */
  const HC = mk(128, 128); { const g = HC.getContext("2d"); g.fillStyle = "rgba(76,195,255,.9)"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 8; g.stroke(); g.lineWidth = 10; g.beginPath(); g.moveTo(40, 40); g.lineTo(88, 88); g.moveTo(88, 60); g.lineTo(88, 88); g.lineTo(60, 88); g.moveTo(40, 68); g.lineTo(40, 40); g.lineTo(68, 40); g.stroke(); }
  const handle = new T3.Mesh(new T3.PlaneGeometry(.5, .5), new T3.MeshBasicMaterial({ map: tex(HC), transparent: true, toneMapped: false, depthTest: false })); handle.position.set(5.6 / 2 + .05, -3.05 / 2 - .05, .05); handle.userData.id = "handle"; handle.visible = false; handle.renderOrder = 5; MAIN.grp.add(handle);
  const tgtS = P => P === MAIN ? (P.pos ? .5 : 1) * MAIN.us : P.pos ? 1 : 1.3;
  function settle(P) { const p = POS[P.pos]; P.tgt = { ang: p.ang, y: p.y, s: tgtS(P) }; if (RM()) { Object.assign(P.cur, P.tgt); place(P); } }
  function setCk(P, k, dir) { if (P.ck === k) return; if (RM()) { P.ck = k; delete sigs[P.id]; redrawP(P); drawRail(); return; } P.flip = { t0: performance.now(), k, dir: dir || 1, done: false, r: 0 }; }
  function showOnMain(k, dir) { if (MAIN.ck === k || !CONTENT[k]) return; const o = Object.values(PANELS).find(P => P !== MAIN && P.ck === k), old = MAIN.ck; setCk(MAIN, k, dir); if (o) setCk(o, old, -(dir || 1)); if (k === "book") { bookT = 0; } saveL(); }
  function swapCk(A, B) { const a = A.ck, b = B.ck; setCk(A, b, 1); setCk(B, a, -1); saveL(); }
  const cycleMain = d => { const i = TABS.indexOf(MAIN.ck); showOnMain(TABS[(i + d + TABS.length) % TABS.length], d); };
  /* --- the desk: curved table with real controls --- */
  const C0 = new T3.Vector3(0, 0, 3.15), RIN = 1.05, RMID = 1.58, ROUT = 2.15, DY = 1.02, A0 = 24 * D, A1 = 156 * D;
  const DEF = { r1: ["coach", "lessons", "research", "journal", "progress", "platforms", "ai", "broker"], r2: ["ask", "sell", "chart", "buy", "menu"], col: {} }, MAXR = { r1: 10, r2: 7 };
  let DK = JSON.parse(JSON.stringify(DEF)), EDIT = null;
  const DC = mk(2048, 2048), dg = DC.getContext("2d"), dT = tex(DC); let hover = null;
  const slots = []; const lay = (row, r0, r1, rw) => { const n = row.length; if (!n) return; const span = (A1 - A0) / n; row.forEach((a, i) => { const hi = A1 - i * span, lo = hi - span; slots.push({ a, l: BTN[a][0], r0, r1, lo: lo + .6 * D, hi: hi - .6 * D, row: rw, i }); }); };
  function relay() { slots.length = 0; ["r1", "r2"].forEach(k => { DK[k] = DK[k].filter((a, i, A) => BTN[a] && A.indexOf(a) === i); }); lay(DK.r1, RMID + .04, ROUT - .05, "r1"); lay(DK.r2, RIN + .05, RMID - .03, "r2"); }
  relay();
  const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  /* where a desk-space point (lx, ly) would land: row + insert index */
  const dropAt = (r, a) => { const rw = r > RMID ? "r1" : "r2", n = DK[rw].length, span = (A1 - A0) / Math.max(1, n); return { rw, i: Math.max(0, Math.min(n, Math.floor((A1 - a) / span + .5))) }; };
  function drawDesk() { const g = dg, S2 = 2048, K = S2 / (2 * ROUT), cx = S2 / 2, cy = S2 / 2, now = performance.now(), jig = EDIT && !RM(); g.clearRect(0, 0, S2, S2);
    const P2 = (r, a) => [cx + Math.cos(a) * r * K, cy - Math.sin(a) * r * K];
    g.beginPath(); g.arc(cx, cy, ROUT * K, -A0, -A1, true); g.arc(cx, cy, RIN * K, -A1, -A0, false); g.closePath(); const gr = g.createRadialGradient(cx, cy, RIN * K, cx, cy, ROUT * K); gr.addColorStop(0, "rgba(14,44,100,.95)"); gr.addColorStop(1, "rgba(30,80,170,.92)"); g.fillStyle = gr; g.fill();
    if (EDIT) { g.save(); g.setLineDash([22, 14]); g.lineWidth = 6; g.strokeStyle = "rgba(255,211,106,.85)"; g.stroke(); g.restore(); }
    slots.forEach((s, si) => { const prs = !!(pz && pz.s === s), sel = EDIT && EDIT.sel === s.a, dragging = EDIT && EDIT.drag && EDIT.drag.a === s.a, on = hover === s || prs || sel, st = s.a === "ai" ? connSt("xConnAI") : s.a === "broker" ? connSt("xConnBr") : null, isTab = ["coach", "lessons", "research", "journal", "progress"].includes(s.a) && V.X.tab === s.a && body.classList.contains("x-scene");
      const am = (s.lo + s.hi) / 2, rm = (s.r0 + s.r1) / 2, [x, y] = P2(rm, am), cc = DK.col[s.a]; g.save(); if (jig) { g.translate(x, y); g.rotate(Math.sin(now / 85 + si * 1.9) * .022); g.translate(-x, -y); } if (dragging) g.globalAlpha = .3;
      g.beginPath(); g.arc(cx, cy, s.r1 * K, -s.lo, -s.hi, true); g.arc(cx, cy, s.r0 * K, -s.hi, -s.lo, false); g.closePath();
      const base = cc ? null : s.a === "buy" ? "rgba(46,230,168," : s.a === "sell" ? "rgba(255,90,118," : s.a === "ask" ? "rgba(76,195,255," : "rgba(120,190,255,", al = on ? .55 : isTab ? .42 : cc ? .3 : .2;
      g.fillStyle = prs ? "rgba(235,248,255,.85)" : cc ? hexA(cc, al) : base + al + ")"; g.fill(); g.lineWidth = prs ? 10 : on ? 6 : 3;
      if (EDIT) { g.shadowColor = cc || "#4cc3ff"; g.shadowBlur = 26 + (jig ? Math.sin(now / 240 + si) * 10 : 0); }
      g.strokeStyle = prs ? "#ffffff" : sel ? "#ffd36a" : st === "on" ? "#2ee6a8" : st === "err" ? "#ff5a76" : st === "set" ? "#ffb347" : on ? "#ffffff" : cc || "rgba(170,225,255,.85)"; if (sel) g.lineWidth = 9; g.stroke(); g.shadowBlur = 0;
      g.translate(x, y); g.rotate(-(am - PI / 2));
      let label = s.l, sub = ""; if (s.a === "chart") { label = S.inst ? S.inst.label : "—"; sub = pxf(lastPx()); } if (s.a === "buy" || s.a === "sell") sub = practice() ? "PRACTICE" : "LIVE"; if (s.a === "ai" || s.a === "broker") sub = st === "on" ? "CONNECTED" : st === "err" ? "CHECK" : st === "set" ? "SAVED" : "OFF";
      const mw = (s.hi - s.lo) * rm * K - 18; let fs = s.r0 > RMID ? 48 : 54; g.font = `700 ${fs}px ${FD}`; while (fs > 18 && g.measureText(label).width > mw) { fs -= 2; g.font = `700 ${fs}px ${FD}`; } g.fillStyle = prs ? "#06204a" : "#fff"; g.textAlign = "center"; g.shadowColor = "#4cc3ff"; g.shadowBlur = prs ? 0 : on ? 18 : 8; g.fillText(fit(g, label, mw), 0, sub ? -4 : 11); g.shadowBlur = 0;
      if (sub) { g.font = `600 ${fs * .72}px ${FM}`; g.fillStyle = s.a === "buy" ? "#9ff5d6" : s.a === "sell" ? "#ffc0cb" : COL.acc2; g.fillText(sub, 0, fs * .85); } g.restore();
      if (EDIT && !dragging) { const [bx, by] = P2(s.r1 - .1, s.hi - .045); s.xb = [bx, by]; g.beginPath(); g.arc(bx, by, 34, 0, 7); g.fillStyle = "#ff5a76"; g.fill(); g.lineWidth = 5; g.strokeStyle = "#fff"; g.stroke(); g.font = `800 46px ${FB}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText("×", bx, by + 15); } });
    if (EDIT && EDIT.drag && EDIT.drag.p) { const d = EDIT.drag, { rw, i } = dropAt(d.p.r, d.p.a), n = DK[rw].length + (DK[rw].includes(d.a) ? 0 : 1), span = (A1 - A0) / Math.max(1, n - (DK[rw].includes(d.a) ? 1 : 0) + 0), ia = A1 - i * ((A1 - A0) / Math.max(1, DK[rw].length)), r0 = rw === "r1" ? RMID + .04 : RIN + .05, r1 = rw === "r1" ? ROUT - .05 : RMID - .03;
      if (d.p.r > RIN - .2 && d.p.r < ROUT + .25) { g.lineWidth = 10; g.strokeStyle = "#ffd36a"; g.beginPath(); g.moveTo(...P2(r0, ia)); g.lineTo(...P2(r1, ia)); g.stroke(); }
      const [gx, gy] = [cx + d.p.lx * K, cy - d.p.ly * K]; g.save(); g.translate(gx, gy); g.rotate(-(Math.atan2(d.p.ly, d.p.lx) - PI / 2)); rr(g, -150, -50, 300, 100, 22); g.fillStyle = d.out ? "rgba(255,90,118,.75)" : "rgba(76,195,255,.75)"; g.shadowColor = "#fff"; g.shadowBlur = 30; g.fill(); g.shadowBlur = 0; g.lineWidth = 5; g.strokeStyle = "#fff"; g.stroke();
      g.font = `700 40px ${FD}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.fillText(fit(g, d.out ? "REMOVE" : BTN[d.a][0], 270), 0, 14); g.restore(); }
    dT.needsUpdate = true; }
  const deskTop = new T3.Mesh(new T3.RingGeometry(RIN, ROUT, 96, 2, A0, A1 - A0), new T3.MeshBasicMaterial({ map: dT, transparent: true, toneMapped: false, side: T3.DoubleSide }));
  { const pos = deskTop.geometry.attributes.position, uv = deskTop.geometry.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + ROUT) / (2 * ROUT), (pos.getY(i) + ROUT) / (2 * ROUT)); uv.needsUpdate = true; }
  deskTop.rotation.x = -PI / 2; deskTop.position.set(C0.x, DY, C0.z); deskTop.userData.id = "desk"; scene.add(deskTop); pick.push(deskTop);
  const skirt = new T3.Mesh(new T3.CylinderGeometry(ROUT, ROUT * .96, DY, 96, 1, true, PI + (PI / 2 - A1), A1 - A0), new T3.MeshBasicMaterial({ color: 0x0d2f6e, transparent: true, opacity: .55, side: T3.DoubleSide })); skirt.position.set(C0.x, DY / 2, C0.z); scene.add(skirt);
  const arcPts = (r, y) => { const p = []; for (let k = 0; k <= 64; k++) { const a = A0 + (A1 - A0) * k / 64; p.push(new T3.Vector3(C0.x + Math.cos(a) * r, y, C0.z - Math.sin(a) * r)); } return p; };
  [[ROUT, DY + .01, .016], [RIN, DY + .01, .012], [ROUT * .96, .03, .02]].forEach(([r, y, w]) => scene.add(new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(arcPts(r, y)), 96, w, 6, false), glowMat(0xbfe9ff))));
  /* --- coach hologram: cut-outs of the approved coach images, floating over a light pedestal --- */
  const fadeC = mk(64, 256), fg = fadeC.getContext("2d"), fgr = fg.createLinearGradient(0, 256, 0, 0); fgr.addColorStop(0, "#000"); fgr.addColorStop(.28, "#fff"); fgr.addColorStop(1, "#fff"); fg.fillStyle = fgr; fg.fillRect(0, 0, 64, 256); const fadeT = new T3.CanvasTexture(fadeC);
  const coachTexs = {}; const coachT = g => { if (!coachTexs[g]) { const t = new T3.TextureLoader().load(XA["holo_" + (g === "male" ? "m" : "f")] || V.coachImg(), tt => { if (gNow === g) fitCoach(tt); }); t.encoding = T3.sRGBEncoding; coachTexs[g] = t; } return coachTexs[g]; };
  const holoMat = new T3.MeshBasicMaterial({ map: null, alphaMap: fadeT, transparent: true, depthWrite: false, toneMapped: false, color: 0xd8efff });
  const glowMatC = new T3.MeshBasicMaterial({ map: null, alphaMap: fadeT, transparent: true, blending: T3.AdditiveBlending, depthWrite: false, toneMapped: false, color: 0x2f8fff, opacity: .45 });
  const CH = 1.75, coach = new T3.Mesh(new T3.PlaneGeometry(1, 1), holoMat), cglow = new T3.Mesh(new T3.PlaneGeometry(1, 1), glowMatC); cglow.position.z = -.01; cglow.scale.set(1.04, 1.03, 1);
  const cgrp = new T3.Group(); cgrp.add(cglow, coach); cgrp.position.set(0, 1.0 + CH / 2, -.55); scene.add(cgrp); coach.userData.id = "coach"; pick.push(coach);
  function fitCoach(t) { const im = t && t.image; const ar = im && im.width ? im.width / im.height : .8; coach.scale.set(CH * ar, CH, 1); }
  let gNow = V.X.gender; { const t = coachT(gNow); holoMat.map = t; glowMatC.map = t; fitCoach(t); }
  const ped = new T3.Mesh(new T3.CylinderGeometry(.62, .7, .08, 64), new T3.MeshBasicMaterial({ color: 0x0d3a80 })); ped.position.set(0, .04, -.55); scene.add(ped);
  const pedRing = new T3.Mesh(new T3.TorusGeometry(.66, .022, 8, 96), glowMat(0x7fd0ff)); pedRing.rotation.x = PI / 2; pedRing.position.set(0, .09, -.55); scene.add(pedRing);
  const beam = new T3.Mesh(new T3.CylinderGeometry(.5, .66, 2.6, 48, 1, true), new T3.MeshBasicMaterial({ color: 0x4cc3ff, transparent: true, opacity: .07, side: T3.DoubleSide, depthWrite: false, blending: T3.AdditiveBlending })); beam.position.set(0, 1.35, -.55); scene.add(beam);
  const syncCoach = () => { if (V.X.gender !== gNow) { gNow = V.X.gender; const t = coachT(gNow); holoMat.map = glowMatC.map = t; holoMat.needsUpdate = glowMatC.needsUpdate = true; fitCoach(t); Object.values(PANELS).forEach(P => { if (P.ck === "coach") redrawP(P); }); loadL(false); } };
  /* --- post: bloom --- */
  let comp = null, bloom = null; if (bloomOK && T3.EffectComposer && T3.UnrealBloomPass) { try { comp = new T3.EffectComposer(renderer); comp.addPass(new T3.RenderPass(scene, cam)); bloom = new T3.UnrealBloomPass(new T3.Vector2(innerWidth / 2, innerHeight / 2), .75, .55, .55); comp.addPass(bloom); } catch (e) { comp = null; } }
  function size() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < .8 ? 72 : w / h < 1.2 ? 60 : 52; cam.updateProjectionMatrix(); if (comp) { comp.setSize(w, h); bloom.setSize(w / 2, h / 2); } }
  addEventListener("resize", size); size();
  /* --- camera: a shot per view / tab, flown between --- */
  const VIEWS = { home: [[0, 2.75, 5.85], [0, 1.95, -2.5]], coach: [[.6, 2.0, 2.2], [0, 1.9, -.55]], lessons: [[-2.6, 2.4, 2.4], [-5.2, 2.6, -3.0]], research: [[0, 3.4, 2.2], [0, 3.9, -7]], journal: [[2.6, 2.5, 2.4], [5.2, 2.9, -3.0]], progress: [[3.4, 2.2, 2.0], [6.4, 2.6, -1.8]], sims: [[2.8, 2.4, 2.2], [6.8, 2.6, -2]], chart: [[0, 3.3, 3.2], [0, 3.9, -7]], edit: [[1.0, 4.5, 5.9], [1.0, .9, 1.8]] };
  const HOME_W = VIEWS.home, HOME_P = [[0, 4.6, 6.9], [0, 1.3, -0.6]];
  const EDIT_W = VIEWS.edit, EDIT_P = [[0, 7.4, 7.6], [0, 2.4, 1.2]]; const homeFit = () => { const p = innerWidth / innerHeight < .8; VIEWS.home = p ? HOME_P : HOME_W; VIEWS.edit = p ? EDIT_P : EDIT_W; }; homeFit(); addEventListener("resize", homeFit);
  const camS = { p: new T3.Vector3(...VIEWS.home[0]), l: new T3.Vector3(...VIEWS.home[1]), f: null, t0: 0, from: null, yaw: 0, yawV: 0, pitch: 0, mx: 0, my: 0 };
  function fly(k) { const v = VIEWS[k] || VIEWS.home; if (RM()) { camS.p.set(...v[0]); camS.l.set(...v[1]); camS.f = null; return; } camS.from = [camS.p.clone(), camS.l.clone()]; camS.f = [new T3.Vector3(...v[0]), new T3.Vector3(...v[1])]; camS.t0 = performance.now(); }
  let curShot = "home"; function shot() { const k = body.classList.contains("x-simopen") ? "sims" : body.classList.contains("x-home") ? (EDIT && EDIT.tab === "desk" ? "edit" : "home") : body.classList.contains("x-scene") ? (V.X.tab || "coach") : body.classList.contains("x-simopen") ? "sims" : "chart"; if (k !== curShot) { curShot = k; fly(k); if (k !== "home") camS.yaw = 0; } }
  /* --- input on the 3D room (home only): tap = action, drag = look around; v7: long-press / Edit desk = move screens, swipe the big screen, drag desk buttons --- */
  const ray = new T3.Raycaster(), mv = new T3.Vector2(); let drag = null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const active = () => body.classList.contains("x-home") && !body.classList.contains("x-holo") && !body.classList.contains("x-picking") && !body.classList.contains("x-simopen") && !body.classList.contains("x-devpick");
  const setRay = (cx, cy) => { mv.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(mv, cam); };
  const KD = 2048 / (2 * ROUT);
  function hitAt(cx, cy) { setRay(cx, cy); const h = ray.intersectObjects(handle.visible ? [handle].concat(pick) : pick, false)[0]; if (!h) return null; const id = h.object.userData.id;
    if (id === "handle") return { kind: "handle" };
    if (id === "desk") { const lx = h.uv.x * 2 * ROUT - ROUT, ly = h.uv.y * 2 * ROUT - ROUT, r = Math.hypot(lx, ly), a = Math.atan2(ly, lx);
      if (EDIT) { const X = 1024 + lx * KD, Y = 1024 - ly * KD, xs = slots.find(s => s.xb && Math.hypot(s.xb[0] - X, s.xb[1] - Y) < 48); if (xs) return { kind: "x", s: xs }; }
      const s = slots.find(s => r >= s.r0 && r <= s.r1 && a >= s.lo && a <= s.hi); return s ? { kind: "desk", s } : null; }
    if (id === "coach") return { kind: "coach" };
    if (id === "rail") { const x = h.uv.x * 1400, z = railHits.find(([hx, hy, hw]) => x >= hx && x <= hx + hw); return z ? { kind: "panel", P: MAIN, a: z[4], rail: 1 } : null; }
    const P = PANELS[id]; if (!P) return null; const x = h.uv.x * P.w, y = (1 - h.uv.y) * P.h; const z = P.hits.find(([hx, hy, hw, hh]) => x >= hx && x <= hx + hw && y >= hy && y <= hy + hh); return { kind: "panel", P, a: z ? z[4] : null }; }
  /* pointer -> point on the desk plane / on the wall cylinder */
  function deskPt(cx, cy) { setRay(cx, cy); const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.y) < 1e-4) return null; const t = (DY - o.y) / d.y; if (t < 0) return null; const lx = o.x + d.x * t - C0.x, ly = C0.z - (o.z + d.z * t); return { lx, ly, r: Math.hypot(lx, ly), a: Math.atan2(ly, lx) }; }
  function wallPt(cx, cy) { setRay(cx, cy); const o = ray.ray.origin, d = ray.ray.direction, A = d.x * d.x + d.z * d.z, B = 2 * (o.x * d.x + o.z * d.z), Cc = o.x * o.x + o.z * o.z - R * R, q = B * B - 4 * A * Cc; if (A < 1e-6 || q < 0) return null;
    const t = (-B + Math.sqrt(q)) / (2 * A), x = o.x + d.x * t, z = o.z + d.z * t; return { ang: Math.atan2(x, -z) / D, y: o.y + d.y * t }; }
  const nearMain = P => P !== MAIN && Math.abs(P.cur.ang - MAIN.cur.ang) * D * R < MAIN.W3 * MAIN.cur.s / 2 && Math.abs(P.cur.y - MAIN.cur.y) < MAIN.H3 * MAIN.cur.s / 2 + .3;
  const glowEdge = (P, c) => P.edge.material.color.set(c);
  function startPanelDrag(P, cx, cy) { const w = wallPt(cx, cy); if (!w || !drag) return; clearTimeout(drag.lp); Object.assign(drag, { mode: "panel", P, w0: w, c0: { ang: P.cur.ang, y: P.cur.y } }); P.lift = true; glowEdge(P, 0xffd36a); XVIsfx(); try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} hint.textContent = P === MAIN ? "Drop the big screen where you want it — it snaps into place" : "Drop on the big screen to swap · or on another spot to move"; body.classList.add("x7-moving"); }
  function dropPanel(P) { P.lift = false; Object.values(PANELS).forEach(Q => glowEdge(Q, 0x9fdcff)); body.classList.remove("x7-moving");
    if (nearMain(P)) { swapCk(MAIN, P); settle(P); }
    else { let best = 0, bd = 1e9; POS.forEach((p, i) => { const dd = Math.abs(p.ang - P.cur.ang) / 12 + Math.abs(p.y - P.cur.y); if (dd < bd) { bd = dd; best = i; } }); const Q = Object.values(PANELS).find(Q => Q !== P && Q.pos === best); if (Q) { Q.pos = P.pos; settle(Q); } P.pos = best; settle(P); }
    saveL(); XVIsfx(); if (EDIT) edUI(); }
  cv.style.touchAction = "none"; cv.addEventListener("contextmenu", e => { if (active()) e.preventDefault(); });
  addEventListener("pointerdown", e => { if (drag || !active() || e.target !== cv && !e.target.closest("#xHome")) return; const h = hitAt(e.clientX, e.clientY);
    drag = { x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, yaw: camS.yaw, moved: 0, h, mode: "look", id: e.pointerId };
    if (EDIT && h) { if (h.kind === "x" || h.kind === "desk") drag.mode = "btn?"; else if (h.kind === "handle") { drag.mode = "resize"; drag.s0 = MAIN.us; } else if (h.kind === "panel" && !h.rail) drag.mode = "panel?"; }
    else if (h && h.kind === "panel" && !h.rail) { if (h.P === MAIN) drag.mode = "swipe?"; drag.lp = setTimeout(() => { if (drag && drag.moved < 10 && drag.h === h) startPanelDrag(h.P, drag.cx, drag.cy); }, 480); } }, true);
  addEventListener("pointermove", e => { camS.mx = e.clientX / innerWidth - .5; camS.my = e.clientY / innerHeight - .5;
    if (drag && e.pointerId === drag.id) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx), Math.abs(dy)); drag.cx = e.clientX; drag.cy = e.clientY; if (drag.moved > 10) clearTimeout(drag.lp);
      if (drag.mode === "swipe?" && drag.moved > 8) drag.mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? "swipe" : "look";
      if (drag.mode === "panel?" && drag.moved > 6) startPanelDrag(drag.h.P, drag.x, drag.y);
      if (drag.mode === "btn?" && drag.moved > 6) { if (drag.h.kind === "desk") { EDIT.drag = { a: drag.h.s.a, p: null }; drag.mode = "btn"; } else drag.mode = "none"; }
      switch (drag.mode) {
        case "look": if (drag.moved > 6) camS.yaw = clamp(drag.yaw - dx / innerWidth * 1.6, -.6, .6); break;
        case "swipe": MAIN.lift = true; MAIN.cur.ang = MAIN.tgt.ang - dx / innerWidth * (RM() ? 0 : 8); place(MAIN); break;
        case "panel": { const w = wallPt(e.clientX, e.clientY), P = drag.P; if (w) { P.cur.ang = P.tgt.ang = clamp(drag.c0.ang + w.ang - drag.w0.ang, -100, 100); P.cur.y = P.tgt.y = clamp(drag.c0.y + w.y - drag.w0.y, 1.3, 6); place(P); if (P !== MAIN) glowEdge(MAIN, nearMain(P) ? 0x2ee6a8 : 0x9fdcff); } break; }
        case "resize": MAIN.us = clamp(drag.s0 + (dx + dy) / (innerWidth + innerHeight) * 3, .6, 1.5); settle(MAIN); if (EDIT) edUI(); break;
        case "btn": { const p = deskPt(e.clientX, e.clientY), tr = document.elementFromPoint(e.clientX, e.clientY); EDIT.drag.p = p; EDIT.drag.out = !p || p.r > ROUT + .35 || p.r < RIN - .35 || !!(tr && tr.closest && tr.closest("#x7edit")); drawDesk(); break; } }
      return; }
    if (!active()) { if (hover) { hover = null; drawDesk(); } cv.style.cursor = ""; return; } const h = hitAt(e.clientX, e.clientY), ns = h && h.kind === "desk" ? h.s : null; if (ns !== hover) { hover = ns; drawDesk(); }
    cv.style.cursor = !h ? "grab" : EDIT && h.kind === "handle" ? "nwse-resize" : EDIT && (h.kind === "desk" || h.kind === "panel" && !h.rail) ? "move" : "pointer"; }, { passive: true });
  /* A tap runs its action on the browser's own follow-up click, which is swallowed here, so on touch screens it can't land on the panel the action opens. */
  let pend = null, pendT = 0;
  const runPend = () => { clearTimeout(pendT); const h = pend; pend = null; if (!h) return;
    if (h.kind === "none") return; if (h.kind === "desk") ACT[h.s.a](); else if (h.kind === "coach") ACT.coachHolo(); else if (h.a && h.a.startsWith("tab:")) showOnMain(h.a.slice(4), 1); else if (h.a) h.P.onHit(h.a); };
  const swallow = h => { pend = h; clearTimeout(pendT); pendT = setTimeout(runPend, 450); };
  function endDrag(d, e, cancel) { clearTimeout(d.lp);
    if (d.mode === "panel") { dropPanel(d.P); return true; }
    if (d.mode === "resize") { saveL(); return true; }
    if (d.mode === "swipe") { MAIN.lift = false; settle(MAIN); if (RM()) Object.assign(MAIN.cur, MAIN.tgt), place(MAIN); if (!cancel && Math.abs(e.clientX - d.x) > 50) cycleMain(e.clientX < d.x ? 1 : -1); return true; }
    if (d.mode === "btn") { const dd = EDIT.drag; EDIT.drag = null; if (!cancel) dropBtn(dd.a, dd.out ? null : dd.p, true); drawDesk(); return true; }
    return false; }
  addEventListener("pointerup", e => { const d = drag; if (!d || e.pointerId !== d.id) return; drag = null; if (endDrag(d, e)) { swallow({ kind: "none" }); return; } if (d.moved > 6 || !active()) return;
    const h = hitAt(e.clientX, e.clientY);
    if (EDIT) { swallow({ kind: "none" }); if (!h) { if (EDIT.sel) { EDIT.sel = null; edUI(); drawDesk(); } return; } XVIsfx();
      if (h.kind === "x") removeBtn(h.s.a); else if (h.kind === "desk") { EDIT.sel = EDIT.sel === h.s.a ? null : h.s.a; edUI(); drawDesk(); }
      else if (h.kind === "panel" && h.a && h.a.startsWith("tab:")) showOnMain(h.a.slice(4), 1); else if (h.kind === "panel" && h.P !== MAIN) swapCk(MAIN, h.P); return; }
    if (!h) return; XVIsfx(); if (h.kind === "desk") pulse(h.s); swallow(h); });
  addEventListener("click", e => { if (!pend) return; e.preventDefault(); e.stopImmediatePropagation(); runPend(); }, true);
  addEventListener("pointercancel", e => { const d = drag; if (!d || e.pointerId !== d.id) return; drag = null; endDrag(d, e, true); }, true);
  cv.addEventListener("wheel", e => { if (!EDIT || !active()) return; const h = hitAt(e.clientX, e.clientY); if (!h || h.kind !== "panel" || h.P !== MAIN) return; e.preventDefault(); MAIN.us = clamp(MAIN.us - Math.sign(e.deltaY) * .05, .6, 1.5); settle(MAIN); edUI(); clearTimeout(MAIN.svT); MAIN.svT = setTimeout(saveL, 300); }, { passive: false });
  let pz = null; function pulse(s) { pz = { s, t: performance.now() }; drawDesk(); }
  const toScr = v => { v.project(cam); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]; };
  Object.assign(window.xvi6, { wl: () => ({ kind: wlSrc().kind, rows: wlRows().map(m => m.label) }), shot: () => curShot, cam: () => [cam.position.x, cam.position.y, cam.position.z].map(n => +n.toFixed(2)),
    deskAt: a => { const s = slots.find(s => s.a === a); if (!s) return null; const am = (s.lo + s.hi) / 2, rm = (s.r0 + s.r1) / 2; return toScr(new T3.Vector3(C0.x + Math.cos(am) * rm, DY, C0.z - Math.sin(am) * rm)); },
    panelAt: (id, u, v) => { const P = PANELS[id] || Object.values(PANELS).find(Q => Q.ck === ({ coachp: "coach" }[id] || id)); if (!P) return null; P.m.updateMatrixWorld(); const gp = P.m.geometry.parameters; return toScr(P.m.localToWorld(new T3.Vector3((u - .5) * gp.width, (.5 - v) * gp.height, 0))); } });
  /* --- redraw from XVI state when it changes --- */
  const sigs = {}; function redrawP(P) { try { P.draw(P); P.t.needsUpdate = true; } catch (e) {} }
  function sig(id) { const b = S.bars || [], k = b[b.length - 1] || {}; switch (id) {
    case "chart": return [sym(), S.tf, b.length, k.t, k.c, S.live, netOK(), practice(), UNI.NET.sim].join("|");
    case "watch": { const w = wlSrc(); return w.kind + "|" + w.L.length + "|" + (S.inst && S.inst.key) + "|" + netOK() + "|" + Math.floor(Date.now() / 15000); }
    case "acct": return [S.balance, (S.lessons || []).length, (S.fills || []).length, practice(), badges().join("/"), S.learn && S.learn.cap].join("|");
    case "coach": return [S.vd && S.vd[1], ($("cbTxt") || {}).textContent, V.X.gender].join("|");
    case "book": return (BOOK && BOOK.t) + "|" + (S.inst && S.inst.key) + "|" + netOK();
    case "journal": return (S.lessons || []).length + "|" + ((S.lessons || [])[0] || {}).net;
    case "progress": return badges().join("/");
    default: return "static"; } }
  function refresh() { Object.values(PANELS).forEach(P => { if (P.flip) return; const s = P.ck + "#" + sig(P.ck); if (sigs[P.id] !== s) { sigs[P.id] = s; redrawP(P); } }); if (Date.now() - bookT > 4000 && Object.values(PANELS).some(P => P.ck === "book") && body.classList.contains("x-home")) { bookT = Date.now(); pullBook(); } const ds = [S.inst && S.inst.label, lastPx(), connSt("xConnAI"), connSt("xConnBr"), practice(), V.X.tab, body.classList.contains("x-scene")].join("|"); if (ds !== sigs.desk) { sigs.desk = ds; drawDesk(); } hudPaint(); syncCoach(); shot(); }
  setInterval(refresh, 1000); drawRail(); drawDesk(); refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { Object.keys(sigs).forEach(k => delete sigs[k]); refresh(); });
  /* --- loop --- */
  const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; let last = performance.now(), slow = 0, frames = 0;
  const paused = () => document.hidden || body.classList.contains("xdev-pause") || body.classList.contains("x-ws") || body.classList.contains("x-glitching") && body.classList.contains("x-ws") || (!body.classList.contains("x-home") && !body.classList.contains("x-scene") && !body.classList.contains("x-picking"));
  let dead = false; function loop(now) { if (dead) return; requestAnimationFrame(loop); if (paused()) { last = now; return; } const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (camS.f) { const u = Math.max(0, Math.min(1, (now - camS.t0) / 1400)), e = ease(u); camS.p.lerpVectors(camS.from[0], camS.f[0], e); camS.l.lerpVectors(camS.from[1], camS.f[1], e); if (u >= 1) camS.f = null; if (!isFinite(camS.p.x + camS.l.x)) { const v = VIEWS[curShot] || VIEWS.home; camS.p.set(...v[0]); camS.l.set(...v[1]); camS.f = null; } }
    const rm = RM(), drift = rm ? 0 : Math.sin(now / 5200) * .06, yaw = camS.yaw + (rm ? 0 : camS.mx * -.08), pit = rm ? 0 : camS.my * .05;
    const off = camS.p.clone().sub(camS.l), ry = new T3.Matrix4().makeRotationY(yaw + drift * .3); off.applyMatrix4(ry); cam.position.copy(camS.l).add(off); cam.position.y += pit; cam.lookAt(camS.l);
    if (!rm) { parts.rotation.y += dt * .02; const pp = parts.geometry.attributes.position; for (let i = 1; i < pp.array.length; i += 3) { pp.array[i] += dt * .12; if (pp.array[i] > 8) pp.array[i] = 0; } pp.needsUpdate = true;
      cgrp.position.y = 1.0 + CH / 2 + Math.sin(now / 900) * .03; holoMat.opacity = .9 + Math.sin(now / 130) * .04 + (Math.random() < .008 ? -.35 : 0); glowMatC.opacity = .35 + Math.sin(now / 400) * .1; pedRing.scale.setScalar(1 + Math.sin(now / 600) * .03); beam.material.opacity = .06 + Math.sin(now / 700) * .02; }
    cgrp.lookAt(cam.position.x, cgrp.position.y, cam.position.z);
    if (pz) { const u = (now - pz.t) / 380; if (u >= 1) { pz = null; drawDesk(); } }
    { const kk = rm ? 1 : 1 - Math.exp(-dt * 9); Object.values(PANELS).forEach(P => { let ch = false; if (!P.lift) ["ang", "y", "s"].forEach(q => { const d = P.tgt[q] - P.cur[q]; if (Math.abs(d) > 1e-4) { P.cur[q] += d * kk; ch = true; } else if (d) { P.cur[q] = P.tgt[q]; ch = true; } });
        if (P.flip) { const f = P.flip, u = Math.min(1, (now - f.t0) / 460); if (u >= .5 && !f.done) { f.done = true; P.ck = f.k; delete sigs[P.id]; redrawP(P); if (P === MAIN) drawRail(); } f.r = f.dir * (u < .5 ? u * 2 : (u - 1) * 2) * PI / 2; if (u >= 1) { P.flip = null; if (EDIT) edUI(); } ch = true; }
        if (ch || P.lift) place(P); }); handle.visible = !!(EDIT && EDIT.tab === "screens"); }
    if (EDIT && !rm && now - (loop.jt || 0) > 70) { loop.jt = now; drawDesk(); }
    if (comp) comp.render(); else renderer.render(scene, cam);
    frames++; if (dt > .045) slow++; if (frames === 180) { if (slow > 120 && comp) { comp = null; PR = 1; renderer.setPixelRatio(1); size(); } frames = slow = 0; } }
  /* GPU reset: wait for the browser to restore the context; if it doesn't, fall back to the image desk */
  let lostT = 0; cv.addEventListener("webglcontextlost", e => { e.preventDefault(); console.warn("XVI holo: WebGL context lost"); lostT = setTimeout(() => { dead = true; cv.remove(); body.classList.remove("x-3d"); body.classList.add("x-no3d"); }, 3000); });
  cv.addEventListener("webglcontextrestored", () => { clearTimeout(lostT); Object.values(PANELS).forEach(redrawP); drawRail(); drawDesk(); });

  /* --- v7: Edit desk mode + saved layouts (per coach) --- */
  const LK = () => "xvi_holo_v7_" + (V.X.gender === "male" ? "male" : "female");
  function saveL() { try { const pan = {}; Object.values(PANELS).forEach(P => { pan[P.id] = { pos: P.pos, ck: P.flip ? P.flip.k : P.ck }; }); localStorage.setItem(LK(), JSON.stringify({ v: 1, desk: DK, us: MAIN.us, pan })); } catch (e) {} }
  const DPAN = { main: [0, "chart"], s1: [1, "watch"], s2: [2, "acct"], s3: [3, "coach"], s4: [4, "plats"] };
  function applyL(o, anim) { DK = JSON.parse(JSON.stringify(o && o.desk && Array.isArray(o.desk.r1) && Array.isArray(o.desk.r2) ? o.desk : DEF)); DK.col = DK.col && typeof DK.col === "object" ? DK.col : {}; relay();
    if (!slots.length) { DK = JSON.parse(JSON.stringify(DEF)); relay(); }
    MAIN.us = o && +o.us ? clamp(+o.us, .6, 1.5) : 1; let pan = o && o.pan || {}; const ids = Object.keys(PANELS), ps = ids.map(id => (pan[id] || {}).pos), cs = ids.map(id => (pan[id] || {}).ck);
    const okP = ps.every(p => POS[p]) && new Set(ps).size === ids.length, okC = cs.every(c => CONTENT[c]) && new Set(cs).size === ids.length; if (!okP || !okC) pan = null;
    ids.forEach(id => { const P = PANELS[id], q = pan ? pan[id] : { pos: DPAN[id][0], ck: DPAN[id][1] }; P.pos = q.pos; P.flip = null; if (P.ck !== q.ck) { P.ck = q.ck; delete sigs[P.id]; redrawP(P); } settle(P); if (!anim) { Object.assign(P.cur, P.tgt); place(P); } });
    drawRail(); drawDesk(); if (EDIT) edUI(); }
  function loadL(anim) { let o = null; try { o = JSON.parse(localStorage.getItem(LK()) || "null"); } catch (e) {} applyL(o, anim); }
  const rowOf = a => DK.r1.includes(a) ? "r1" : DK.r2.includes(a) ? "r2" : null;
  function removeBtn(a) { const rw = rowOf(a); if (!rw) return; if (DK.r1.length + DK.r2.length <= 1) { toast("Keep at least one button on the desk."); return; } DK[rw].splice(DK[rw].indexOf(a), 1); delete DK.col[a]; if (EDIT && EDIT.sel === a) EDIT.sel = null; relay(); drawDesk(); saveL(); edUI(); }
  function addBtn(a, rw, i) { if (rowOf(a)) { if (EDIT) { EDIT.sel = a; edUI(); drawDesk(); } return; } rw = rw || (DK.r1.length < MAXR.r1 ? "r1" : "r2"); if (DK[rw].length >= MAXR[rw]) { rw = rw === "r1" ? "r2" : "r1"; if (DK[rw].length >= MAXR[rw]) { toast("The desk is full. Remove a button first."); return; } i = null; }
    DK[rw].splice(i == null ? DK[rw].length : i, 0, a); if (EDIT) EDIT.sel = a; relay(); drawDesk(); saveL(); edUI(); }
  function dropBtn(a, p, fromDesk) { const from = rowOf(a); if (!p || p.r > ROUT + .35 || p.r < RIN - .35) { if (fromDesk && from) removeBtn(a); return; }
    const { rw, i } = dropAt(p.r, p.a); if (!from) { addBtn(a, rw, i); return; } const fi = DK[from].indexOf(a); let ii = i; if (from === rw && fi < i) ii--;
    if (from !== rw && DK[rw].length >= MAXR[rw]) { toast("That row is full."); return; } DK[from].splice(fi, 1); DK[rw].splice(ii, 0, a); EDIT && (EDIT.sel = a); relay(); drawDesk(); saveL(); edUI(); }
  function moveSel(d) { const a = EDIT && EDIT.sel, rw = a && rowOf(a); if (!rw) return; const L = DK[rw], i = L.indexOf(a), j = i + d;
    if (j < 0 || j >= L.length) { const o = rw === "r1" ? "r2" : "r1"; if (DK[o].length >= MAXR[o]) return; L.splice(i, 1); d > 0 ? DK[o].unshift(a) : DK[o].push(a); } else { L.splice(i, 1); L.splice(j, 0, a); } relay(); drawDesk(); saveL(); edUI(); }
  /* the tray */
  const tray = document.createElement("div"); tray.id = "x7edit"; tray.setAttribute("role", "dialog"); tray.setAttribute("aria-label", "Edit desk"); body.append(tray);
  const edBtn = document.createElement("button"); edBtn.type = "button"; edBtn.id = "x7editBtn"; edBtn.innerHTML = "✎ <span>Edit desk</span>"; edBtn.title = "Edit desk: move screens, add, remove and recolor buttons"; body.append(edBtn);
  edBtn.addEventListener("click", () => toggleEdit(!EDIT));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function edUI() { if (!EDIT) return; const sel = EDIT.sel, g = V.X.gender === "male" ? "male" : "female";
    tray.innerHTML = `<div class="hd"><b>EDITING DESK</b><small>Saved for the ${g} coach</small><button type="button" class="pri" data-e="done">Done</button></div>
    <div class="seg" role="tablist"><button type="button" role="tab" data-e="tab:desk" aria-selected="${EDIT.tab === "desk"}">Desk buttons</button><button type="button" role="tab" data-e="tab:screens" aria-selected="${EDIT.tab === "screens"}">Screens</button></div>
    ${EDIT.tab === "desk" ? `<p class="hint">Drag a button to move it. Drag it off the desk, or tap ×, to remove it. Tap a button to pick a color.</p>
    ${sel ? `<div class="sel"><b>${esc(BTN[sel][0])}</b><button type="button" data-e="mv:-1" aria-label="Move left">◀</button><button type="button" data-e="mv:1" aria-label="Move right">▶</button><button type="button" data-e="rm" class="dn">Remove</button>
      <div class="sw">${SWATCH.map(c => `<button type="button" data-col="${c}" aria-label="${c ? "Color " + c : "Default color"}" class="${(DK.col[sel] || "") === c ? "on" : ""}" style="${c ? "background:" + c : ""}">${c ? "" : "∅"}</button>`).join("")}</div></div>` : ""}
    <h4>Add buttons <small>tap or drag onto the desk</small></h4><div class="cat">${Object.keys(BTN).map(k => `<button type="button" data-add="${k}" class="${rowOf(k) ? "on" : ""}" title="${esc(BTN[k][1])}">${rowOf(k) ? "✓ " : "+ "}${esc(BTN[k][0])}</button>`).join("")}</div>`
    : `<p class="hint">Drag a screen to move it; it snaps into place. Drop a side screen on the big screen to swap them. Swipe the big screen, or use its tabs, to change what it shows. Outside this mode a long-press picks a screen up.</p>
    <div class="sz">Big screen size <button type="button" data-e="sz:-1" aria-label="Smaller">−</button><output>${Math.round(MAIN.us * 100)}%</output><button type="button" data-e="sz:1" aria-label="Bigger">+</button></div>
    <h4>Show on the big screen</h4><div class="cat">${TABS.map(k => `<button type="button" data-main="${k}" class="${(MAIN.flip ? MAIN.flip.k : MAIN.ck) === k ? "on" : ""}">${esc(CONTENT[k].t)}</button>`).join("")}</div>`}
    <div class="ft"><button type="button" data-e="reset">Reset to default</button></div>`; }
  function toggleEdit(on) { if (on && !EDIT) { if (!body.classList.contains("x-home")) showView("home"); EDIT = { tab: "desk", sel: null, drag: null }; body.classList.add("x-edit"); edBtn.setAttribute("aria-pressed", "true"); edUI(); drawDesk(); shot(); }
    else if (!on && EDIT) { EDIT = null; body.classList.remove("x-edit"); edBtn.setAttribute("aria-pressed", "false"); tray.innerHTML = ""; handle.visible = false; drawDesk(); saveL(); shot(); toast("Desk saved."); } }
  tray.addEventListener("click", e => { if (tray.dataset.nc === "1") { tray.dataset.nc = ""; return; } const b = e.target.closest("button"); if (!b || !EDIT) return; XVIsfx(); const k = b.dataset.e;
    if (k === "done") toggleEdit(false); else if (k && k.startsWith("tab:")) { EDIT.tab = k.slice(4); EDIT.sel = null; edUI(); drawDesk(); shot(); } else if (k && k.startsWith("mv:")) moveSel(+k.slice(3)); else if (k === "rm") removeBtn(EDIT.sel);
    else if (k && k.startsWith("sz:")) { MAIN.us = clamp(Math.round((MAIN.us + +k.slice(3) * .1) * 10) / 10, .6, 1.5); settle(MAIN); saveL(); edUI(); }
    else if (k === "reset") { xviConfirm("Reset the desk buttons and screens to the default layout for this coach?", "Reset desk").then(ok => { if (!ok) return; try { localStorage.removeItem(LK()); } catch (er) {} applyL(null, true); toast("Desk reset to default."); }); }
    else if (b.dataset.col != null && EDIT.sel) { if (b.dataset.col) DK.col[EDIT.sel] = b.dataset.col; else delete DK.col[EDIT.sel]; drawDesk(); saveL(); edUI(); }
    else if (b.dataset.add) addBtn(b.dataset.add); else if (b.dataset.main) { showOnMain(b.dataset.main, 1); setTimeout(edUI, 480); } });
  /* drag a tray chip onto the desk */
  { let td = null; tray.addEventListener("pointerdown", e => { const b = e.target.closest("[data-add]"); if (!b || !EDIT) return; td = { a: b.dataset.add, x: e.clientX, y: e.clientY, id: e.pointerId, gh: null }; });
    addEventListener("pointermove", e => { if (!td || e.pointerId !== td.id) return; if (!td.gh && Math.hypot(e.clientX - td.x, e.clientY - td.y) > 10) { td.gh = document.createElement("div"); td.gh.id = "x7ghost"; td.gh.textContent = BTN[td.a][0]; body.append(td.gh); }
      if (td.gh) { td.gh.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; const p = deskPt(e.clientX, e.clientY), over = document.elementFromPoint(e.clientX, e.clientY), ok = p && p.r > RIN - .35 && p.r < ROUT + .35 && over === cv; td.gh.classList.toggle("ok", !!ok); } }, { passive: true });
    const end = (e, cancel) => { if (!td || e.pointerId !== td.id) return; const t = td; td = null; if (!t.gh) return; t.gh.remove(); tray.dataset.nc = "1"; setTimeout(() => { tray.dataset.nc = ""; }, 400); if (cancel) return;
      const over = document.elementFromPoint(e.clientX, e.clientY), p = over === cv ? deskPt(e.clientX, e.clientY) : null; if (p && p.r > RIN - .35 && p.r < ROUT + .35) dropBtn(t.a, p, false); };
    addEventListener("pointerup", e => end(e)); addEventListener("pointercancel", e => end(e, true)); }
  addEventListener("keydown", e => { if (EDIT && e.key === "Escape" && !/input|textarea|select/i.test(e.target.tagName || "")) { toggleEdit(false); e.preventDefault(); } });
  Object.assign(window.xvi6, { edit: on => toggleEdit(on !== false), editing: () => !!EDIT, layout: () => ({ desk: JSON.parse(JSON.stringify(DK)), us: MAIN.us, pan: Object.values(PANELS).map(P => [P.id, P.pos, P.ck]) }), showOnMain, cycleMain,
    resetLayout: () => { try { localStorage.removeItem(LK()); } catch (e) {} applyL(null, false); }, mainAt: (u, v) => window.xvi6.panelAt("main", u, v), wallAt: (ang, y) => toScr(new T3.Vector3(Math.sin(ang * D) * R, y, -Math.cos(ang * D) * R)),
    pick3d: (cx, cy) => { setRay(cx, cy); const h = ray.intersectObjects(pick.concat(handle.visible ? [handle] : []), false)[0]; if (!h) return null; const id = h.object.userData.id, P = PANELS[id]; return { id, name: id === "desk" ? "Desk" : id === "coach" ? "Coach hologram" : id === "rail" ? "Big screen tabs" : P ? (P === MAIN ? "Big screen: " : "Side screen: ") + CONTENT[P.ck].t : id, obj: P ? P.grp : h.object, rect: rectOf(P ? P.m : h.object) }; },
    drawContent: (k, c) => { const C = CONTENT[k]; if (!C || !c) return; const P = { id: "dev", ck: k, c, g: c.getContext("2d"), w: c.width, h: c.height, hits: [] }; try { C.draw(P); } catch (e) {} }, contents: () => Object.keys(CONTENT).map(k => [k, CONTENT[k].t]), rotY: (id, deg) => { const P = PANELS[id]; if (!P) return; P.ry = deg * D; place(P); }, snapshot: () => { try { if (comp) comp.render(); else renderer.render(scene, cam); return cv.toDataURL("image/png"); } catch (e) { return null; } } });
  function rectOf(o) { const b = new T3.Box3().setFromObject(o), pts = [[b.min.x, b.min.y, b.min.z], [b.max.x, b.max.y, b.max.z], [b.min.x, b.max.y, b.min.z], [b.max.x, b.min.y, b.max.z], [b.min.x, b.min.y, b.max.z], [b.max.x, b.max.y, b.min.z]].map(p => toScr(new T3.Vector3(...p)));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }
  loadL(false);
  body.classList.remove("x-3dload"); body.classList.add("x-3d"); requestAnimationFrame(loop);
}
})();
