/* ================= XVI DNA v7: Developer mode — inspect, edit with AI or by hand, quick-insert components; saved as an override layer ================= */
(() => {
const d = document, body = d.body, LS = "xvi_dev_v7", qa = (s, r) => [...(r || d).querySelectorAll(s)], FRAME = /[?&]xvidev=frame/.test(location.search);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 8), now = () => Date.now(), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hhmm = t => new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const PAL = ["#4cc3ff", "#9fdcff", "#2ee6a8", "#ff5a76", "#ffb347", "#ffd36a", "#b48cff", "#eaf6ff", "#8fb3d9", "#0b2a66", "#030b1f", "#ffffff", "#000000"];
const FONTS = ["Orbitron, Rajdhani, sans-serif", "Rajdhani, Inter, sans-serif", "Inter, sans-serif", "\"Share Tech Mono\", monospace", "\"JetBrains Mono\", monospace", "system-ui, sans-serif", "Georgia, serif"];
/* ---- store: the override layer (applied on every load, even with dev mode off) ---- */
const st = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) {} return Object.assign({ on: false, changes: [], redo: [], swatches: [], locked: [], allowJS: false, grid: 8, snap: true, guides: false, rulers: false, unit: "px", lockAR: false }, o); })();
if (!Array.isArray(st.changes)) st.changes = []; if (!Array.isArray(st.redo)) st.redo = [];
const save = () => { try { localStorage.setItem(LS, JSON.stringify(Object.assign({}, st, { redo: st.redo.slice(-40) }))); } catch (e) { toastD("Couldn't save dev changes (storage full?)"); } };
const toastD = m => { try { toast(m); } catch (e) {} };
const qs = sel => { try { return d.querySelector(sel); } catch (e) { return null; } };
/* only plain, safe CSS gets through */
const okProp = k => /^(--[\w-]+|-?[a-z][a-z-]*)$/.test(k), okVal = v => typeof v === "string" || typeof v === "number" ? !/(url\s*\(|expression|javascript:|@import|[{}<>;])/i.test(String(v)) && String(v).length < 400 : false;
const okSel = s => typeof s === "string" && s.trim() && s.length < 300 && !/[{}<>;]|@/.test(s) && !/#xdev|\.xdev/.test(s) && (() => { try { d.querySelector(s); return true; } catch (e) { return false; } })();
const FORM = el => el && /^(INPUT|SELECT|TEXTAREA|OPTION)$/.test(el.tagName);
const ATTR_OK = /^(title|aria-label|alt|placeholder|role|data-xd-[\w-]+)$/;
const cleanProps = p => { const o = {}; Object.entries(p || {}).forEach(([k, v]) => { k = String(k).trim().toLowerCase().replace(/[A-Z]/g, m => "-" + m.toLowerCase()); if (okProp(k) && okVal(v)) o[k] = String(v).replace(/\s*!important\s*$/i, ""); }); return o; };
/* ---- applying the layer ---- */
const cssEl = d.createElement("style"); cssEl.id = "xdevOverrides"; d.head.append(cssEl);
const compRoot = d.createElement("div"); compRoot.id = "xdevComps"; body.append(compRoot);
const ORIG = new Map(); let bypass = false, live = null; const K = (...a) => a.join("\u0001");
const TOKSEL = ":root,body,.xholo,#v-coach,#xTabs,.wrap,#dock,#xSim,#xHome,#ticket,#ask,#pop,#drawer,body.x-holo-view .wrap,body.x-holo-view #dock,body:not(.plat) .wrap,body:not(.plat) #dock,body:not(.plat) #ticket";
function ruleOf(sel, props) { const b = Object.entries(props).map(([k, v]) => `${k}:${v} !important`).join(";"); return b ? `${sel}{${b}}\n` : ""; }
function flat(list) { const out = []; list.forEach(c => { if (c.off) return; if (c.kind === "group") (c.items || []).forEach(i => out.push(i)); else out.push(c); }); return out; }
function applyAll() { ORIG.forEach((v, k) => { const [kind, sel, name] = k.split("\u0001"), el = qs(sel); if (!el) return; if (kind === "text") el.textContent = v; else if (kind === "attr") v == null ? el.removeAttribute(name) : el.setAttribute(name, v); else if (kind === "cls") el.className = v; }); ORIG.clear();
  let css = "", rot = {}; const list = flat(st.changes.concat(live ? [live] : [])), comps = new Map();
  if (!bypass) {
    list.forEach(c => { try { switch (c.kind) {
      case "style": if (okSel(c.sel)) css += ruleOf(c.sel, cleanProps(c.props)); break;
      case "tokens": { const p = cleanProps(c.vars); css += ruleOf(TOKSEL, p); if (p["--xv-blur"]) css += ruleOf(".xholo,#dock,#x6hud,#x7edit,.wrap>.view,#drawer,#ask,#ticket", { "backdrop-filter": `blur(${p["--xv-blur"]})`, "-webkit-backdrop-filter": `blur(${p["--xv-blur"]})` }); if (p["--xv-glow"]) css += ruleOf("#x6brand,#x6hud,.btn.pri,#xTabs button,.xt", { filter: `drop-shadow(0 0 calc(${p["--xv-glow"]} * 8px) rgba(76,195,255,.65))` }); break; }
      case "text": { const el = qs(c.sel); if (el && !FORM(el)) { const k = K("text", c.sel); if (!ORIG.has(k)) ORIG.set(k, el.textContent); el.textContent = String(c.text).slice(0, 2000); } break; }
      case "attr": { const el = qs(c.sel); if (el && ATTR_OK.test(c.name) && !FORM(el)) { const k = K("attr", c.sel, c.name); if (!ORIG.has(k)) ORIG.set(k, el.getAttribute(c.name)); c.value == null ? el.removeAttribute(c.name) : el.setAttribute(c.name, String(c.value).slice(0, 300)); } break; }
      case "cls": { const el = qs(c.sel); if (el) { const k = K("cls", c.sel); if (!ORIG.has(k)) ORIG.set(k, el.className); (c.add || []).forEach(x => /^[\w-]+$/.test(x) && el.classList.add(x)); (c.remove || []).forEach(x => el.classList.remove(x)); } break; }
      case "comp": comps.set(c.spec.id, JSON.parse(JSON.stringify(c.spec))); break;
      case "compset": { const s = comps.get(c.cid); if (s) Object.assign(s.props, c.props); break; }
      case "compdel": comps.delete(c.cid); break;
      case "rot3d": rot[c.id] = c.deg; break;
      case "js": if (st.allowJS && c.ok && !c.ran && !live) { c.ran = 1; try { new Function(c.code)(); } catch (e) { console.warn("XVI dev script:", e.message); } } break; } } catch (e) {} });
  }
  const sig = JSON.stringify([...comps.values()]); if (sig !== applyAll.sig) { applyAll.sig = sig; compRoot.innerHTML = ""; comps.forEach(s => { try { compRoot.append(buildComp(s)); } catch (e) {} }); }
  cssEl.textContent = css; try { ["main", "s1", "s2", "s3", "s4"].forEach(id => window.xvi6 && xvi6.rotY && xvi6.rotY(id, bypass ? 0 : rot[id] || 0)); } catch (e) {}
  if (UI.ready) { refreshSel(); renderLog(); if (UI.tab === "layers") renderLayers(); } }
/* ---- history: every kept change is undoable; per-change revert ---- */
function commit(c, label) { c.id = c.id || uid(); c.t = now(); c.label = label || c.label || c.kind; st.changes.push(c); st.redo = []; live = null; save(); applyAll(); return c; }
function undo() { const c = st.changes.pop(); if (!c) return toastD("Nothing to undo."); st.redo.push(c); save(); applyAll(); toastD("Undid: " + c.label); }
function redo() { const c = st.redo.pop(); if (!c) return toastD("Nothing to redo."); st.changes.push(c); save(); applyAll(); toastD("Redid: " + c.label); }
function revert(id) { const i = st.changes.findIndex(c => c.id === id); if (i < 0) return; const [c] = st.changes.splice(i, 1); st.redo.push(c); save(); applyAll(); }
const setLive = c => { live = c; applyAll(); };
/* ---- UI: toolbar, docked panel, overlay ---- */
const UI = { min: innerWidth < 700, ready: false, tab: "edit", inspect: true, sel: null, hov: null, mode: null, cross: false, speed: 1, snaps: [] };
const bar = d.createElement("div"); bar.id = "xdevBar"; bar.className = "xdev"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Developer tools");
const TOOLS = [["inspect", "🎯", "Inspect"], ["edit", "✎", "Edit"], ["color", "🎨", "Color"], ["insert", "＋", "Insert"], ["layers", "☰", "Layers"], ["cross", "✛", "Crosshair"], ["guides", "#", "Guides"], ["compare", "◐", "Before/after"], ["device", "📱", "Device"], ["snap", "📷", "Snapshot"], ["log", "🕘", "Changes"], ["tokens", "🎛", "Theme"], ["speed", "⏱", "Speed"], ["export", "⇩", "Export"], ["close", "✕", "Close"]];
bar.innerHTML = `<span class="grip" title="Drag the toolbar">⋮⋮</span><b>DEV</b>` + TOOLS.map(([k, i, l]) => `<button type="button" data-t="${k}" title="${l}"><i>${i}</i><span>${l}</span></button>`).join("");
const pan = d.createElement("aside"); pan.id = "xdevPanel"; pan.className = "xdev"; pan.setAttribute("aria-label", "Developer panel");
const ov = d.createElement("div"); ov.id = "xdevOv"; ov.className = "xdev";
ov.innerHTML = `<canvas id="xdevGrid"></canvas><div id="xdevRulX"></div><div id="xdevRulY"></div><div class="hov"><em></em></div><div class="dist"></div><div class="selb"><i data-h="nw"></i><i data-h="n"></i><i data-h="ne"></i><i data-h="e"></i><i data-h="se"></i><i data-h="s"></i><i data-h="sw"></i><i data-h="w"></i><b class="ring"></b><b class="rk" data-h="rot" title="Drag to rotate (Shift = 15°)">⟳</b><em></em></div><div class="gl gx"></div><div class="gl gy"></div><div class="cx"><i class="h"></i><i class="v"></i><em></em></div>`;
const $o = s => ov.querySelector(s);
function mount() { if (UI.ready) return; body.append(ov, pan, bar); UI.ready = true; wireBar(); wireOverlay(); renderPanel(); }
const isDev = el => !!(el && el.closest && el.closest(".xdev,#xdevDevice"));
const locked = sel => st.locked.includes(sel);
/* a readable, stable selector */
function cssPath(el) { if (!el || el === body) return "body"; if (el.id && !/^\d/.test(el.id)) return "#" + CSS.escape(el.id); const parts = [];
  while (el && el.nodeType === 1 && el !== body && el !== d.documentElement) { if (el.id && !/^\d/.test(el.id)) { parts.unshift("#" + CSS.escape(el.id)); break; } let s = el.tagName.toLowerCase(); const p = el.parentElement;
    if (p) { const sib = [...p.children].filter(c => c.tagName === el.tagName); if (sib.length > 1) s += `:nth-of-type(${sib.indexOf(el) + 1})`; } parts.unshift(s); el = p; }
  return (parts[0] && parts[0][0] === "#" ? "" : "body > ") + parts.join(" > "); }
const nameOf = el => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "");
/* selection: a DOM element (by selector) or a 3D object of the room */
const selEl = () => UI.sel && UI.sel.kind === "dom" ? qs(UI.sel.sel) : null;
function select(target) { UI.sel = target; UI.tab = UI.tab === "layers" || UI.tab === "insert" || UI.tab === "color" ? UI.tab : "edit"; refreshSel(); renderPanel(); }
function rectOfSel() { if (!UI.sel) return null; if (UI.sel.kind === "3d") { try { const p = xvi6.pick3dById ? null : null; return UI.sel.rect; } catch (e) { return null; } } const el = selEl(); return el ? el.getBoundingClientRect() : null; }
function place(box, r) { if (!r) { box.style.display = "none"; return; } box.style.display = "block"; Object.assign(box.style, { left: r.left + "px", top: r.top + "px", width: Math.max(1, r.width) + "px", height: Math.max(1, r.height) + "px" }); }
const R4 = r => r && { left: r.x != null ? r.x : r.left, top: r.y != null ? r.y : r.top, width: r.w != null ? r.w : r.width, height: r.h != null ? r.h : r.height };
function refreshSel() { if (!UI.ready) return; const b = $o(".selb"), r = R4(rectOfSel()); place(b, r); if (r) { const el = selEl(); b.querySelector("em").textContent = (UI.sel.kind === "3d" ? UI.sel.name : nameOf(el || body)) + "  " + Math.round(r.width) + "×" + Math.round(r.height); b.classList.toggle("is3d", UI.sel.kind === "3d"); b.classList.toggle("lock", UI.sel.kind === "dom" && locked(UI.sel.sel)); } }
setInterval(() => { if (UI.ready && st.on) refreshSel(); }, 500); addEventListener("resize", () => { refreshSel(); drawGrid(); }); addEventListener("scroll", () => refreshSel(), true);
/* ---- picking (capture phase; app handlers never see these taps, so nothing taps through) ---- */
function pickAt(x, y) { const els = d.elementsFromPoint(x, y).filter(e => !isDev(e) && e !== d.documentElement && e !== body); let el = els[0]; if (!el) return null;
  for (const id of ["x6bal", "x6mode", "x6pl", "x6brand"]) { const n = d.getElementById(id); if (!n) continue; const r = n.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { el = n; break; } }
  if (["xScroll", "xHome", "xBg"].includes(el.id) && body.classList.contains("x-home") && qs("#x3d")) el = qs("#x3d");
  if (el.id === "x3d" && window.xvi6 && xvi6.pick3d) { const h = xvi6.pick3d(x, y); if (h) return { kind: "3d", id: h.id, name: h.name, rect: h.rect }; }
  return { kind: "dom", sel: cssPath(el), el }; }
const picking = () => st.on && UI.inspect && !UI.editing;
const SW = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "touchstart", "touchend", "contextmenu"];
SW.forEach(t => addEventListener(t, e => { if (!st.on) return; if (UI.editing && UI.editing.contains(e.target)) { if (t !== "dblclick") e.stopPropagation(); return; }
  if (UI.cross && !isDev(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); if (t === "pointerup") crossPlace(e.clientX, e.clientY); return; }
  if (!picking() || isDev(e.target)) return; e.preventDefault(); e.stopImmediatePropagation();
  if (t === "pointerup") { const h = pickAt(e.clientX, e.clientY); if (!h) return; if (h.kind === "dom" && locked(h.sel)) { toastD("That element is locked (Layers)."); return; }
    const dbl = UI.lastTap && now() - UI.lastTap.t < 380 && UI.lastTap.sel === h.sel && h.kind === "dom"; UI.lastTap = { t: now(), sel: h.sel }; if (dbl) { UI.lastTap = null; inlineEdit(qs(h.sel)); return; } select(h); } }, { capture: true, passive: false }));
addEventListener("pointermove", e => { if (!st.on || !UI.ready) return; if (UI.cross) { crossMove(e.clientX, e.clientY); return; } if (!picking() || isDev(e.target) || UI.drag) { if (!UI.drag) place($o(".hov"), null); return; }
  if (UI.hovRaf) return; UI.hovRaf = requestAnimationFrame(() => { UI.hovRaf = 0; const h = pickAt(e.clientX, e.clientY); const box = $o(".hov"); if (!h) { place(box, null); $o(".dist").innerHTML = ""; return; }
    const r = h.kind === "3d" ? R4(h.rect) : h.el.getBoundingClientRect(); place(box, r); box.querySelector("em").textContent = (h.kind === "3d" ? "3D · " + h.name : nameOf(h.el) + "  ·  " + h.sel) + "  " + Math.round(r.width) + "×" + Math.round(r.height); showDist(r); }); }, { passive: true });
/* distances between the selection and the hovered element */
function showDist(r) { const D = $o(".dist"); D.innerHTML = ""; const s = R4(rectOfSel()); if (!s || !r || !st.guides && !UI.sel) return; const ln = (x, y, w, h, t) => { D.insertAdjacentHTML("beforeend", `<i style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i><em style="left:${x + w / 2}px;top:${y + h / 2}px">${Math.round(t)}</em>`); };
  const sr = { l: s.left, t: s.top, r: s.left + s.width, b: s.top + s.height }, hr = { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height }, my = (Math.max(sr.t, hr.t) + Math.min(sr.b, hr.b)) / 2, mx = (Math.max(sr.l, hr.l) + Math.min(sr.r, hr.r)) / 2;
  if (hr.l >= sr.r) ln(sr.r, my, hr.l - sr.r, 1, hr.l - sr.r); else if (sr.l >= hr.r) ln(hr.r, my, sr.l - hr.r, 1, sr.l - hr.r);
  if (hr.t >= sr.b) ln(mx, sr.b, 1, hr.t - sr.b, hr.t - sr.b); else if (sr.t >= hr.b) ln(mx, hr.b, 1, sr.t - hr.b, sr.t - hr.b); }
/* ---- direct manipulation: move / 8 resize handles / rotate ring ---- */
const num = v => parseFloat(v) || 0;
function curT(el) { const cs = getComputedStyle(el), t = (cs.translate && cs.translate !== "none" ? cs.translate : "0px 0px").split(/\s+/); return { x: num(t[0]), y: num(t[1]), r: cs.rotate && cs.rotate !== "none" ? num(cs.rotate) : 0, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height, cw: num(cs.width), ch: num(cs.height) }; }
function snapMove(el, dx, dy, r0) { UI.snaps = []; let x = dx, y = dy; if (st.snap) { if (st.guides) { x = Math.round(x / st.grid) * st.grid; y = Math.round(y / st.grid) * st.grid; }
    const L = r0.left + x, T = r0.top + y, cxs = [L, L + r0.width / 2, L + r0.width], cys = [T, T + r0.height / 2, T + r0.height], tx = [0, innerWidth / 2, innerWidth], ty = [0, innerHeight / 2, innerHeight];
    [...(el.parentElement ? el.parentElement.children : [])].concat([...compRoot.children]).forEach(s => { if (s === el || isDev(s)) return; const q = s.getBoundingClientRect(); if (!q.width) return; tx.push(q.left, q.left + q.width / 2, q.right); ty.push(q.top, q.top + q.height / 2, q.bottom); });
    let bx = 7, by = 7, sx = null, sy = null; cxs.forEach(c => tx.forEach(t => { if (Math.abs(c - t) < bx) { bx = Math.abs(c - t); sx = t - c; UI.gx = t; } })); cys.forEach(c => ty.forEach(t => { if (Math.abs(c - t) < by) { by = Math.abs(c - t); sy = t - c; UI.gy = t; } }));
    if (sx != null) { x += sx; UI.snaps.push("x"); } if (sy != null) { y += sy; UI.snaps.push("y"); } }
  const gx = $o(".gx"), gy = $o(".gy"); gx.style.display = UI.snaps.includes("x") ? "block" : "none"; gy.style.display = UI.snaps.includes("y") ? "block" : "none"; if (UI.snaps.includes("x")) gx.style.left = UI.gx + "px"; if (UI.snaps.includes("y")) gy.style.top = UI.gy + "px"; return [x, y]; }
function wireOverlay() { const b = $o(".selb");
  b.addEventListener("pointerdown", e => { if (!UI.sel) return; e.preventDefault(); e.stopPropagation(); const h = e.target.dataset.h || "move";
    if (UI.sel.kind === "3d") { if (h !== "rot") return; UI.drag = { h, x: e.clientX, y: e.clientY, id: e.pointerId, deg0: UI.sel.deg || 0 }; try { b.setPointerCapture(e.pointerId); } catch (er) {} return; }
    const el = selEl(); if (!el || locked(UI.sel.sel)) return; const t = curT(el), r = el.getBoundingClientRect(); UI.drag = { h, x: e.clientX, y: e.clientY, id: e.pointerId, t, r, moved: 0 }; try { b.setPointerCapture(e.pointerId); } catch (er) {} });
  b.addEventListener("pointermove", e => { const g = UI.drag; if (!g || e.pointerId !== g.id) return; const dx = e.clientX - g.x, dy = e.clientY - g.y; g.moved = Math.max(g.moved || 0, Math.abs(dx), Math.abs(dy));
    if (UI.sel.kind === "3d") { const deg = Math.round(g.deg0 + dx / 3); g.deg = e.shiftKey ? Math.round(deg / 15) * 15 : deg; try { xvi6.rotY(UI.sel.id, g.deg); } catch (er) {} return; }
    const el = selEl(); if (!el) return; const p = {}, t = g.t;
    if (g.h === "move") { const [x, y] = snapMove(el, dx, dy, g.r); p.translate = `${Math.round(t.x + x)}px ${Math.round(t.y + y)}px`; }
    else if (g.h === "rot") { const cx = g.r.left + g.r.width / 2, cy = g.r.top + g.r.height / 2; let a = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90; if (e.shiftKey || st.snapRot) a = Math.round(a / 15) * 15; p.rotate = Math.round(a) + "deg"; }
    else { let w = t.w, h = t.h, x = t.x, y = t.y; if (g.h.includes("e")) w = t.w + dx; if (g.h.includes("w")) { w = t.w - dx; x = t.x + dx; } if (g.h.includes("s")) h = t.h + dy; if (g.h.includes("n")) { h = t.h - dy; y = t.y + dy; }
      if (st.lockAR || e.shiftKey) { const k = t.w / Math.max(1, t.h); if (g.h === "n" || g.h === "s") w = h * k; else h = w / k; } w = Math.max(8, w); h = Math.max(8, h);
      if (st.guides && st.snap) { w = Math.round(w / st.grid) * st.grid; h = Math.round(h / st.grid) * st.grid; } Object.assign(p, sizeProps(el, w, h)); if (x !== t.x || y !== t.y) p.translate = `${Math.round(x)}px ${Math.round(y)}px`; }
    setLive({ kind: "style", sel: UI.sel.sel, props: p }); g.p = p; });
  const end = e => { const g = UI.drag; if (!g || e.pointerId !== g.id) return; UI.drag = null; $o(".gx").style.display = $o(".gy").style.display = "none";
    if (UI.sel.kind === "3d") { if (g.deg != null) commit({ kind: "rot3d", id: UI.sel.id, deg: g.deg }, `Rotate ${UI.sel.name} ${g.deg}°`); UI.sel.deg = g.deg; return; }
    if (g.p && g.moved > 2) commit({ kind: "style", sel: UI.sel.sel, props: g.p }, (g.h === "move" ? "Move " : g.h === "rot" ? "Rotate " : "Resize ") + shortSel(UI.sel.sel)); else { live = null;
      if (g.h === "move" && e.type === "pointerup") { b.style.pointerEvents = "none"; const h = pickAt(e.clientX, e.clientY); b.style.pointerEvents = ""; if (h && !(h.kind === "dom" && h.sel === UI.sel.sel)) select(h); } }
    renderPanel(); };
  b.addEventListener("pointerup", end); b.addEventListener("pointercancel", end); }
const shortSel = s => s.length > 38 ? "…" + s.slice(-36) : s;
function sizeProps(el, w, h) { if (st.unit === "%") { const p = el.parentElement ? el.parentElement.getBoundingClientRect() : { width: innerWidth, height: innerHeight }; return { width: (w / Math.max(1, p.width) * 100).toFixed(1) + "%", height: (h / Math.max(1, p.height) * 100).toFixed(1) + "%", "box-sizing": "border-box" }; } return { width: Math.round(w) + "px", height: Math.round(h) + "px", "box-sizing": "border-box" }; }
/* arrow-key nudge (Shift = 10px); merges quick repeats into one change */
addEventListener("keydown", e => { if (!st.on) return; const typing = /input|textarea|select/i.test(e.target.tagName || "") || e.target.isContentEditable;
  if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) return;
  if (typing) return;
  if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === "y")) { e.preventDefault(); redo(); return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) { const c = compOfSel(); if (c) { e.preventDefault(); dupComp(c); } return; }
  if (e.key === "\\" && !e.repeat) { bypass = true; applyAll(); bar.classList.add("cmp"); return; }
  if (e.key === "Escape") { if (UI.cross) setCross(false); else if (UI.sel) { UI.sel = null; refreshSel(); renderPanel(); } else setInspect(!UI.inspect); return; }
  if ((e.key === "Delete" || e.key === "Backspace") && compOfSel()) { e.preventDefault(); delComp(compOfSel()); return; }
  const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; const el = selEl(); if (!k || !el || locked(UI.sel.sel)) return; e.preventDefault(); const s = e.shiftKey ? 10 : 1, t = curT(el);
  const props = { translate: `${Math.round(t.x + k[0] * s)}px ${Math.round(t.y + k[1] * s)}px` }, last = st.changes[st.changes.length - 1];
  if (last && last.nudge && last.sel === UI.sel.sel && now() - last.t < 1500) { Object.assign(last.props, props); last.t = now(); save(); applyAll(); } else commit({ kind: "style", sel: UI.sel.sel, props, nudge: 1 }, "Nudge " + shortSel(UI.sel.sel)); }, true);
addEventListener("keyup", e => { if (e.key === "\\" && bypass && !UI.cmpLock) { bypass = false; applyAll(); bar.classList.remove("cmp"); } });
/* inline text edit (double-click / double-tap, or the Edit text button) */
function inlineEdit(el) { if (!el || FORM(el) || el.children.length > 3) { toastD("Pick an element that holds text."); return; } const sel = cssPath(el), before = el.textContent; UI.editing = el; el.contentEditable = "true"; el.classList.add("xdev-editing"); el.focus();
  try { const r = d.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
  const done = ok => { el.removeEventListener("blur", onB); el.removeEventListener("keydown", onK); el.contentEditable = "false"; el.classList.remove("xdev-editing"); UI.editing = null; const t = el.textContent; if (!ok) { el.textContent = before; return; } if (t !== before) { el.textContent = before; commit({ kind: "text", sel, text: t }, "Text of " + shortSel(sel)); } };
  const onB = () => done(true), onK = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); el.blur(); } if (e.key === "Escape") { e.preventDefault(); done(false); } e.stopPropagation(); };
  el.addEventListener("blur", onB); el.addEventListener("keydown", onK); }
/* ---- crosshair ---- */
function setCross(on) { UI.cross = on; ov.classList.toggle("cross", on); bar.querySelector('[data-t="cross"]').classList.toggle("on", on); if (on) toastD(UI.sel ? "Crosshair: click to move the selection there. Esc to stop." : "Crosshair: live X/Y. Select something first to place it."); }
function crossMove(x, y) { if (st.snap && st.guides) { x = Math.round(x / st.grid) * st.grid; y = Math.round(y / st.grid) * st.grid; } const c = $o(".cx"); c.querySelector(".h").style.top = y + "px"; c.querySelector(".v").style.left = x + "px"; const em = c.querySelector("em"); em.textContent = `X ${Math.round(x)}  Y ${Math.round(y)}`; em.style.left = x + 12 + "px"; em.style.top = y + 12 + "px"; UI.cxy = [x, y]; }
function crossPlace(x, y) { if (st.snap && st.guides) { x = Math.round(x / st.grid) * st.grid; y = Math.round(y / st.grid) * st.grid; } UI.lastPt = [x, y]; const el = selEl(); if (!el) { if (UI.pendingInsert) { insertComp(UI.pendingInsert, x, y); UI.pendingInsert = null; setCross(false); } return; } if (locked(UI.sel.sel)) return;
  const r = el.getBoundingClientRect(), t = curT(el); commit({ kind: "style", sel: UI.sel.sel, props: { translate: `${Math.round(t.x + x - (r.left + r.width / 2))}px ${Math.round(t.y + y - (r.top + r.height / 2))}px` } }, `Place ${shortSel(UI.sel.sel)} at ${Math.round(x)},${Math.round(y)}`); }
/* ---- guides: grid + rulers ---- */
function drawGrid() { if (!UI.ready) return; const c = $o("#xdevGrid"); ov.classList.toggle("guides", !!st.guides); if (!st.guides) return; c.width = innerWidth; c.height = innerHeight; const g = c.getContext("2d"), s = st.grid; g.clearRect(0, 0, c.width, c.height);
  for (let x = 0; x < c.width; x += s) { g.fillStyle = x % (s * 8) ? "rgba(76,195,255,.08)" : "rgba(76,195,255,.25)"; g.fillRect(x, 0, 1, c.height); } for (let y = 0; y < c.height; y += s) { g.fillStyle = y % (s * 8) ? "rgba(76,195,255,.08)" : "rgba(76,195,255,.25)"; g.fillRect(0, y, c.width, 1); }
  const rx = $o("#xdevRulX"), ry = $o("#xdevRulY"); rx.innerHTML = ""; ry.innerHTML = ""; for (let x = 0; x < innerWidth; x += 100) rx.insertAdjacentHTML("beforeend", `<i style="left:${x}px">${x}</i>`); for (let y = 0; y < innerHeight; y += 100) ry.insertAdjacentHTML("beforeend", `<i style="top:${y}px">${y}</i>`); }
function setInspect(on) { UI.inspect = on; body.classList.toggle("x-devpick", st.on && on); bar.querySelector('[data-t="inspect"]').classList.toggle("on", on); if (!on) place($o(".hov"), null); }
/* ---- the docked panel ---- */
const TABS = [["edit", "Edit"], ["color", "Color"], ["insert", "Insert"], ["layers", "Layers"], ["log", "Changes"], ["tokens", "Theme"], ["export", "Export"]];
const KEYS = ["display", "position", "width", "height", "color", "background-color", "font-family", "font-size", "font-weight", "margin", "padding", "border-radius", "opacity", "z-index", "translate", "rotate", "box-shadow"];
const keyStyles = el => { const cs = getComputedStyle(el), o = {}; KEYS.forEach(k => { const v = cs.getPropertyValue(k); if (v && v !== "none" && v !== "normal" && v !== "auto") o[k] = v.length > 80 ? v.slice(0, 80) + "…" : v; }); return o; };
function renderPanel() { if (!UI.ready) return; pan.classList.toggle("min", !!UI.min);
  pan.innerHTML = `<div class="ph"><b>DEV MODE</b><span class="sp"></span><button type="button" data-p="undo" title="Undo (Ctrl+Z)">↶</button><button type="button" data-p="redo" title="Redo (Ctrl+Shift+Z)">↷</button><button type="button" data-p="min" title="Collapse">${UI.min ? "▸" : "▾"}</button></div>
  <div class="ptabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${UI.tab === k}">${l}</button>`).join("")}</div><div class="pb">${UI.min ? "" : body_()}</div>`;
  if (UI.tab === "layers" && !UI.min) renderLayers(); if (UI.tab === "color" && !UI.min) cpInit(); if (UI.tab === "log" && !UI.min) renderLog(); }
function selHead() { const s = UI.sel; if (!s) return `<p class="hint">${st.on && UI.inspect ? "Tap or click anything to select it (the 3D screens, desk and coach too). Double-click text to edit it in place. Hold <kbd>\\</kbd> to compare before/after." : "Turn on 🎯 Inspect to pick an element."}</p>`;
  if (s.kind === "3d") return `<div class="selh"><b>3D · ${esc(s.name)}</b><code>${esc(s.id)}</code></div><p class="hint">3D objects can be rotated on the Y axis (drag the ⟳ ring, or type degrees). To move or swap the wall screens use ✎ Edit desk.</p>
    <div class="row"><label>Rotate Y <input type="number" step="1" data-r3="deg" value="${s.deg || 0}">°</label><button type="button" data-p="r3reset">Reset</button></div>`;
  const el = selEl(); if (!el) return `<p class="hint">The selected element is gone (it may be hidden right now): <code>${esc(s.sel)}</code></p>`; const ks = keyStyles(el), cp = compOfSel();
  return `<div class="selh"><b>${esc(nameOf(el))}</b><code title="${esc(s.sel)}">${esc(shortSel(s.sel))}</code></div>
  <details class="ks"><summary>Current styles</summary><dl>${Object.entries(ks).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl></details>${cp ? compProps(cp) : ""}`; }
function body_() { switch (UI.tab) {
  case "edit": { const s = UI.sel, el = selEl(), t = el ? curT(el) : null, cs = el ? getComputedStyle(el) : null, sp = cs ? ["margin", "padding"].map(b => ["top", "right", "bottom", "left"].map(sd => Math.round(num(cs.getPropertyValue(b + "-" + sd))))) : null;
    return selHead() + (s && s.kind === "dom" && el ? `
    <section class="ai"><h4>Ask the AI to change it</h4><textarea id="xdAsk" rows="2" placeholder='e.g. "make this bigger and gold" or "move this button left"'></textarea>
      <div class="row"><label><input type="checkbox" id="xdShot" ${UI.attShot ? "checked" : ""}> attach snapshot</label><label title="Lets the AI return a JavaScript snippet; you confirm before it runs"><input type="checkbox" id="xdJS" ${st.allowJS ? "checked" : ""}> allow script</label></div>
      <div class="row"><button type="button" class="pri" data-p="ask">Send to AI</button><button type="button" data-p="copyreq" title="Copy a fix request (selector, styles, snapshot) to paste anywhere">Copy fix request</button></div>
      <div id="xdAI">${UI.aiOut || (aiOK() ? "" : `<p class="hint">No AI connected. Use the editor below, or press Connect AI on the desk.</p>`)}</div></section>
    <section><h4>Text</h4>${FORM(el) || el.children.length > 3 ? `<p class="hint">This element holds other elements; pick the text itself to edit it.</p>` : `<div class="row"><input type="text" id="xdText" value="${esc(el.textContent.trim().slice(0, 300))}"><button type="button" data-p="text">Set</button><button type="button" data-p="inline">Edit in place</button></div>`}</section>
    <section><h4>Size & position</h4><div class="g4">
      <label>W <input type="number" data-sz="w" value="${Math.round(t.w)}"></label><label>H <input type="number" data-sz="h" value="${Math.round(t.h)}"></label><label>X <input type="number" data-tr="x" value="${Math.round(t.x)}"></label><label>Y <input type="number" data-tr="y" value="${Math.round(t.y)}"></label></div>
      <div class="row"><label><input type="checkbox" data-st="lockAR" ${st.lockAR ? "checked" : ""}> lock aspect</label><label>units <select data-st="unit"><option ${st.unit === "px" ? "selected" : ""}>px</option><option ${st.unit === "%" ? "selected" : ""}>%</option></select></label></div>
      <div class="row"><label>Rotate <input type="number" data-rot value="${Math.round(t.r)}">°</label><label><input type="checkbox" data-st="snapRot" ${st.snapRot ? "checked" : ""}> snap 15°</label><button type="button" data-p="rotreset">Reset</button><button type="button" data-p="cross">✛ Place</button></div></section>
    <section><h4>Font</h4><div class="row"><select data-css="font-family"><option value="">(keep)</option>${FONTS.map(f => `<option ${cs.fontFamily.startsWith(f.split(",")[0]) ? "selected" : ""} value='${esc(f)}'>${esc(f.split(",")[0].replace(/"/g, ""))}</option>`).join("")}</select>
      <label>size <input type="number" data-css="font-size" data-u="px" value="${Math.round(num(cs.fontSize))}"></label><select data-css="font-weight">${[300, 400, 500, 600, 700, 800].map(w => `<option ${+cs.fontWeight === w ? "selected" : ""}>${w}</option>`).join("")}</select></div></section>
    <section><h4>Spacing</h4><div class="box"><span>margin</span>${["t", "r", "b", "l"].map((sd, i) => `<input class="m${sd}" type="number" data-sp="margin-${["top", "right", "bottom", "left"][i]}" value="${sp[0][i]}" aria-label="margin ${sd}">`).join("")}
      <div class="in"><span>padding</span>${["t", "r", "b", "l"].map((sd, i) => `<input class="p${sd}" type="number" data-sp="padding-${["top", "right", "bottom", "left"][i]}" value="${sp[1][i]}" aria-label="padding ${sd}">`).join("")}<i>${Math.round(t.w)}×${Math.round(t.h)}</i></div></div></section>
    <section><h4>Look</h4><div class="g2">
      <label>Radius <input type="range" min="0" max="60" data-css="border-radius" data-u="px" value="${Math.round(num(cs.borderTopLeftRadius))}"></label>
      <label>Glow <input type="range" min="0" max="60" data-glow value="${UI.glow || 0}"></label>
      <label>Opacity <input type="range" min="0" max="100" data-css="opacity" data-k=".01" value="${Math.round(num(cs.opacity) * 100)}"></label>
      <label>Z-index <input type="number" data-css="z-index" value="${cs.zIndex === "auto" ? "" : cs.zIndex}"></label></div>
      <div class="row"><button type="button" data-p="hide">Hide</button><button type="button" data-p="lock">${locked(s.sel) ? "Unlock" : "Lock"}</button><button type="button" data-p="clearsel">Remove all edits on this</button></div></section>` : ""); }
  case "color": return selHead() + `<div class="cp"><div class="row"><label>Apply to <select id="cpT"><option value="color">Text</option><option value="background">Background</option><option value="border">Border</option><option value="glow">Glow</option></select></label></div>
    <canvas id="cpSV" width="240" height="140"></canvas><input type="range" id="cpH" min="0" max="360" aria-label="Hue"><input type="range" id="cpA" min="0" max="100" aria-label="Alpha">
    <div class="row"><span id="cpPrev"></span><input id="cpHex" size="9" aria-label="Hex"><input id="cpR" type="number" min="0" max="255" aria-label="R"><input id="cpG" type="number" min="0" max="255" aria-label="G"><input id="cpB" type="number" min="0" max="255" aria-label="B"></div>
    <div class="row">${"EyeDropper" in window ? `<button type="button" data-p="eye">💧 Eyedropper</button>` : `<small class="hint">Eyedropper: not supported in this browser</small>`}<button type="button" class="pri" data-p="cpapply">Apply</button></div>
    <h4>XVI palette</h4><div class="sw">${PAL.map(c => `<button type="button" data-cp="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}</div>
    <h4>My swatches <button type="button" data-p="swadd" title="Save the current color">＋</button></h4><div class="sw">${st.swatches.map(c => `<button type="button" data-cp="${c}" style="background:${c}" aria-label="${c}"></button>`).join("") || `<small class="hint">none yet</small>`}</div></div>`;
  case "insert": return `<p class="hint">Tap a component to drop it in the middle of the screen, or drag it where you want it. Then style it with every other tool.</p><div class="lib">${Object.entries(LIB).map(([k, v]) => `<button type="button" data-ins="${k}"><i>${v.i}</i>${esc(v.n)}</button>`).join("")}</div>`;
  case "layers": return `<div class="row"><button type="button" data-p="lyexp">Expand all</button><small class="hint">👁 hide · 🔒 lock · tap a name to select</small></div><div id="xdLayers"></div>`;
  case "log": return `<div class="row"><button type="button" data-p="undo">↶ Undo</button><button type="button" data-p="redo">↷ Redo</button><small class="hint">${st.changes.length} kept · Ctrl+Z / Ctrl+Shift+Z</small></div><ol id="xdLog"></ol>`;
  case "tokens": { const T = tokens(); return `<p class="hint">Theme tokens restyle everything at once.</p><div class="tok">${T.map(([k, v]) => `<label><code>${esc(k)}</code>${/^#|rgb/.test(v) ? `<input type="color" data-tok="${esc(k)}" value="${toHex(v)}">` : ""}<input type="text" data-tokt="${esc(k)}" value="${esc(v)}"></label>`).join("")}</div>
    <div class="row"><label>Glass blur <input type="range" min="0" max="30" data-tok2="--xv-blur" data-u="px" value="${num(tokVal("--xv-blur")) || 8}"></label><label>Glow <input type="range" min="0" max="30" data-tok2="--xv-glow" data-k=".1" value="${Math.round(num(tokVal("--xv-glow")) * 10) || 0}"></label></div>`; }
  case "export": return `<p class="hint">Changes live in this browser as an override layer and load with the app. Export them for the build, or share them as a file.</p>
    <div class="row"><button type="button" class="pri" data-p="expbuild">⇩ Export for build (.zip)</button><button type="button" data-p="expjson">⇩ xvi-dev-overrides.json</button><button type="button" data-p="expcss">⇩ overrides.css</button></div>
    <div class="row"><button type="button" data-p="import">⇧ Import…</button><button type="button" class="dn" data-p="resetall">Reset all</button></div>
    <h4>Snapshots (${SHOTS.length})</h4><div class="shots">${SHOTS.map((s, i) => `<figure><img src="${s.url}" alt="snapshot ${i + 1}"><figcaption>${esc(s.name)}</figcaption></figure>`).join("") || `<small class="hint">Use 📷 to capture the selection or the screen.</small>`}</div>`; } return ""; }
/* ---- panel events ---- */
const styleSel = (props, label) => { if (!UI.sel || UI.sel.kind !== "dom") return; if (locked(UI.sel.sel)) return toastD("That element is locked."); commit({ kind: "style", sel: UI.sel.sel, props: cleanProps(props) }, label + " · " + shortSel(UI.sel.sel)); };
const cssFromInput = i => { const k = i.dataset.css; let v = i.value; if (v === "") return null; if (i.dataset.k) v = String(+v * +i.dataset.k); if (i.dataset.u) v += i.dataset.u; return { [k]: v }; };
function wirePanel() {
  pan.addEventListener("click", async e => { const tb = e.target.closest("[data-tab]"); if (tb) { UI.tab = tb.dataset.tab; UI.min = false; renderPanel(); return; } const b = e.target.closest("button"); if (!b) return; const p = b.dataset.p, el = selEl();
    if (b.dataset.cp) { cpSet(b.dataset.cp); cpApply(true); return; } if (b.dataset.ins) { insertComp(b.dataset.ins); return; }
    switch (p) {
      case "undo": undo(); break; case "redo": redo(); break; case "min": UI.min = !UI.min; renderPanel(); break;
      case "text": { const v = pan.querySelector("#xdText").value; commit({ kind: "text", sel: UI.sel.sel, text: v }, "Text of " + shortSel(UI.sel.sel)); renderPanel(); break; }
      case "inline": inlineEdit(el); break; case "cross": setCross(true); break;
      case "rotreset": styleSel({ rotate: "0deg" }, "Reset rotation"); renderPanel(); break;
      case "r3reset": commit({ kind: "rot3d", id: UI.sel.id, deg: 0 }, "Reset rotation " + UI.sel.name); UI.sel.deg = 0; renderPanel(); break;
      case "hide": styleSel({ display: "none" }, "Hide"); break;
      case "lock": { const s = UI.sel.sel, i = st.locked.indexOf(s); i < 0 ? st.locked.push(s) : st.locked.splice(i, 1); save(); refreshSel(); renderPanel(); break; }
      case "clearsel": { const s = UI.sel.sel, n = st.changes.length; st.changes = st.changes.filter(c => c.sel !== s); toastD(`Removed ${n - st.changes.length} edits.`); save(); applyAll(); renderPanel(); break; }
      case "ask": aiAsk(); break; case "copyreq": copyReq(); break; case "aikeep": aiKeep(); break; case "aiundo": aiDiscard(); break; case "aiagain": aiDiscard(); aiAsk(); break; case "aipreview": aiPreview(); break;
      case "eye": try { const r = await new EyeDropper().open(); cpSet(r.sRGBHex); cpApply(true); } catch (er) {} break;
      case "cpapply": cpApply(false); break; case "swadd": { const h = cpHex(); if (!st.swatches.includes(h)) st.swatches.push(h); st.swatches = st.swatches.slice(-16); save(); renderPanel(); break; }
      case "lyexp": UI.lyAll = !UI.lyAll; renderLayers(); break;
      case "expbuild": exportBuild(); break; case "expjson": dl("xvi-dev-overrides.json", new Blob([JSON.stringify(exportObj(), null, 2)], { type: "application/json" })); break; case "expcss": dl("overrides.css", new Blob([buildCSS()], { type: "text/css" })); break;
      case "import": importFile(); break; case "resetall": xviConfirm("Remove every dev change (styles, text, components, theme)? This can't be undone.", "Remove all").then(ok => { if (!ok) return; st.changes = []; st.redo = []; st.locked = []; save(); applyAll(); renderPanel(); toastD("All dev changes removed."); }); break;
      case "cdel": delComp(compOfSel()); break; case "cdup": dupComp(compOfSel()); break; case "crun": runAction(compOfSel().props); break;
      case "logrev": revert(b.dataset.id); break; } });
  pan.addEventListener("input", e => { const i = e.target; if (!UI.sel && !i.dataset.tok && !i.dataset.tokt && !i.dataset.tok2) return;
    if (i.dataset.css && i.type === "range") { const p = cssFromInput(i); if (p) setLive({ kind: "style", sel: UI.sel.sel, props: p }); }
    if (i.dataset.glow != null) { const v = +i.value; UI.glow = v; setLive({ kind: "style", sel: UI.sel.sel, props: glowProps(v, UI.glowCol) }); }
    if (i.dataset.tok) { setLive({ kind: "tokens", vars: { [i.dataset.tok]: i.value } }); } if (i.dataset.tok2) setLive({ kind: "tokens", vars: { [i.dataset.tok2]: tok2(i) } }); });
  pan.addEventListener("change", e => { const i = e.target;
    if (i.id === "xdJS") { if (!i.checked) { st.allowJS = false; save(); return; } i.checked = false; xviConfirm("Allow the AI to return JavaScript? You will see each script and confirm it before it runs. Only allow this if you will read them.", "Allow scripts").then(ok => { i.checked = ok; st.allowJS = ok; save(); }); return; }
    if (i.id === "xdShot") { UI.attShot = i.checked; return; }
    if (i.dataset.st) { st[i.dataset.st] = i.type === "checkbox" ? i.checked : i.value; save(); return; }
    if (i.dataset.tok || i.dataset.tokt) { commit({ kind: "tokens", vars: { [i.dataset.tok || i.dataset.tokt]: i.value } }, "Theme " + (i.dataset.tok || i.dataset.tokt) + " = " + i.value); return; }
    if (i.dataset.tok2) { commit({ kind: "tokens", vars: { [i.dataset.tok2]: tok2(i) } }, "Theme " + i.dataset.tok2 + " = " + tok2(i)); return; }
    if (i.dataset.cprop) { setCompProp(i.dataset.cprop, i.type === "checkbox" ? i.checked : i.value); return; }
    if (i.dataset.r3 === "deg") { const v = Math.round(+i.value || 0); commit({ kind: "rot3d", id: UI.sel.id, deg: v }, `Rotate ${UI.sel.name} ${v}°`); UI.sel.deg = v; return; }
    if (!UI.sel || UI.sel.kind !== "dom") return; const el = selEl(); if (!el) return;
    if (i.dataset.css) { const p = cssFromInput(i); if (p) styleSel(p, "Set " + i.dataset.css); }
    else if (i.dataset.glow != null) styleSel(glowProps(+i.value, UI.glowCol), "Glow " + i.value);
    else if (i.dataset.sp) styleSel({ [i.dataset.sp]: (+i.value || 0) + "px" }, "Set " + i.dataset.sp);
    else if (i.dataset.sz) { const t = curT(el); let w = i.dataset.sz === "w" ? +i.value : t.w, h = i.dataset.sz === "h" ? +i.value : t.h; if (st.lockAR) { const k = t.w / Math.max(1, t.h); if (i.dataset.sz === "w") h = w / k; else w = h * k; } styleSel(sizeProps(el, w, h), "Resize"); renderPanel(); }
    else if (i.dataset.tr) { const t = curT(el), x = i.dataset.tr === "x" ? +i.value : t.x, y = i.dataset.tr === "y" ? +i.value : t.y; styleSel({ translate: `${x}px ${y}px` }, "Move"); }
    else if (i.dataset.rot != null) { let v = +i.value || 0; if (st.snapRot) v = Math.round(v / 15) * 15; styleSel({ rotate: v + "deg" }, "Rotate " + v + "°"); } });
  pan.addEventListener("keydown", e => { if (e.target.id === "xdAsk" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); aiAsk(); } });
  /* drag a library chip onto the page */
  let gd = null; pan.addEventListener("pointerdown", e => { const b = e.target.closest("[data-ins]"); if (!b) return; gd = { k: b.dataset.ins, x: e.clientX, y: e.clientY, id: e.pointerId, gh: null }; });
  addEventListener("pointermove", e => { if (!gd || e.pointerId !== gd.id) return; if (!gd.gh && Math.hypot(e.clientX - gd.x, e.clientY - gd.y) > 10) { gd.gh = d.createElement("div"); gd.gh.className = "xdev xdevGhost"; gd.gh.textContent = LIB[gd.k].i + " " + LIB[gd.k].n; body.append(gd.gh); } if (gd.gh) gd.gh.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
  const gend = (e, c) => { if (!gd || e.pointerId !== gd.id) return; const g = gd; gd = null; if (!g.gh) return; g.gh.remove(); UI.noClick = now(); if (!c && !isDev(d.elementFromPoint(e.clientX, e.clientY))) insertComp(g.k, e.clientX, e.clientY); };
  addEventListener("pointerup", e => gend(e)); addEventListener("pointercancel", e => gend(e, true));
  pan.addEventListener("click", e => { if (UI.noClick && now() - UI.noClick < 400 && e.target.closest("[data-ins]")) { e.stopImmediatePropagation(); } }, true); }
const glowProps = (v, c) => v ? { "box-shadow": `0 0 ${v}px ${Math.round(v / 3)}px ${c || "rgba(76,195,255,.75)"}`, "text-shadow": `0 0 ${Math.round(v / 2)}px ${c || "rgba(76,195,255,.9)"}` } : { "box-shadow": "none", "text-shadow": "none" };
/* ---- color picker (HSV area + hue + alpha, hex/RGB, eyedropper, swatches) ---- */
const cp = { h: 200, s: .7, v: 1, a: 1 };
const hsv2rgb = (h, s, v) => { const f = n => { const k = (n + h / 60) % 6; return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255); }; return [f(5), f(3), f(1)]; };
const rgb2hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dd = mx - mn; let h = 0; if (dd) h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; return [(h * 60 + 360) % 360, mx ? dd / mx : 0, mx]; };
const pc = d.createElement("canvas").getContext("2d"); const toHex = c => { pc.fillStyle = "#000"; pc.fillStyle = c; const v = pc.fillStyle; if (v[0] === "#") return v; const m = v.match(/[\d.]+/g) || [0, 0, 0]; return "#" + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, "0")).join(""); };
const cpHex = () => "#" + hsv2rgb(cp.h, cp.s, cp.v).map(x => x.toString(16).padStart(2, "0")).join(""), cpCss = () => { const [r, g, b] = hsv2rgb(cp.h, cp.s, cp.v); return cp.a >= 1 ? cpHex() : `rgba(${r},${g},${b},${cp.a.toFixed(2)})`; };
function cpSet(c) { const h = toHex(c), n = parseInt(h.slice(1), 16), [hh, s, v] = rgb2hsv(n >> 16 & 255, n >> 8 & 255, n & 255); Object.assign(cp, { h: hh, s, v }); const m = String(c).match(/rgba?\([^)]*,\s*([\d.]+)\)/); cp.a = m ? +m[1] : 1; cpPaint(); }
function cpInit() { const c = pan.querySelector("#cpSV"); if (!c) return; const el = selEl(); if (el && !UI.cpInit) { cpSet(getComputedStyle(el).color); } UI.cpInit = 0; cpPaint();
  let dn = false; const at = e => { const r = c.getBoundingClientRect(); cp.s = clamp((e.clientX - r.left) / r.width, 0, 1); cp.v = clamp(1 - (e.clientY - r.top) / r.height, 0, 1); cpPaint(); cpApply(true); };
  c.addEventListener("pointerdown", e => { dn = true; try { c.setPointerCapture(e.pointerId); } catch (er) {} at(e); }); c.addEventListener("pointermove", e => dn && at(e)); c.addEventListener("pointerup", () => { dn = false; cpApply(false); });
  pan.querySelector("#cpH").addEventListener("input", e => { cp.h = +e.target.value; cpPaint(); cpApply(true); }); pan.querySelector("#cpA").addEventListener("input", e => { cp.a = +e.target.value / 100; cpPaint(); cpApply(true); });
  ["#cpH", "#cpA"].forEach(s => pan.querySelector(s).addEventListener("change", () => cpApply(false)));
  pan.querySelector("#cpHex").addEventListener("change", e => { cpSet(e.target.value); cpApply(false); }); ["#cpR", "#cpG", "#cpB"].forEach(s => pan.querySelector(s).addEventListener("change", () => { const v = ["#cpR", "#cpG", "#cpB"].map(q => clamp(+pan.querySelector(q).value || 0, 0, 255)); cpSet(`rgb(${v})`); cpApply(false); })); }
function cpPaint() { const c = pan.querySelector("#cpSV"); if (!c) return; const g = c.getContext("2d"), W = c.width, H = c.height; g.fillStyle = `hsl(${cp.h},100%,50%)`; g.fillRect(0, 0, W, H); let gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.beginPath(); g.arc(cp.s * W, (1 - cp.v) * H, 7, 0, 7); g.lineWidth = 2; g.strokeStyle = cp.v > .5 ? "#000" : "#fff"; g.stroke(); const [r, gg, b] = hsv2rgb(cp.h, cp.s, cp.v);
  pan.querySelector("#cpH").value = Math.round(cp.h); pan.querySelector("#cpA").value = Math.round(cp.a * 100); pan.querySelector("#cpA").style.setProperty("--c", cpHex()); pan.querySelector("#cpHex").value = cpHex(); pan.querySelector("#cpR").value = r; pan.querySelector("#cpG").value = gg; pan.querySelector("#cpB").value = b; pan.querySelector("#cpPrev").style.background = cpCss(); }
function cpApply(preview) { const tEl = pan.querySelector("#cpT"); if (!tEl || !UI.sel || UI.sel.kind !== "dom") { if (!preview && !UI.sel) toastD("Select an element first."); return; } const t = tEl.value, c = cpCss();
  const p = t === "color" ? { color: c } : t === "background" ? { background: c } : t === "border" ? { "border-color": c, "border-style": "solid", "border-width": Math.max(1, num(getComputedStyle(selEl()).borderTopWidth)) + "px" } : glowProps(UI.glow || 16, c); if (t === "glow") UI.glowCol = c;
  if (preview) setLive({ kind: "style", sel: UI.sel.sel, props: p }); else styleSel(p, ({ color: "Text", background: "Background", border: "Border", glow: "Glow" })[t] + " color " + c); }
/* ---- theme tokens ---- */
function tokens() { if (UI.tokCache) return UI.tokCache; const seen = new Map(); try { [...d.styleSheets].forEach(ss => { let rs; try { rs = ss.cssRules; } catch (e) { return; } [...rs].forEach(r => { if (!r.style) return; for (let i = 0; i < r.style.length; i++) { const k = r.style[i]; if (k.startsWith("--") && !k.startsWith("--x7") && !seen.has(k) && seen.size < 28) seen.set(k, r.style.getPropertyValue(k).trim()); } }); }); } catch (e) {}
  const sc = qs(".xholo") || body; return UI.tokCache = [...seen.keys()].map(k => [k, (getComputedStyle(sc).getPropertyValue(k) || seen.get(k)).trim()]).filter(([k, v]) => v && v.length < 60); }
const tokVal = k => { let v = ""; flat(st.changes).forEach(c => { if (c.kind === "tokens" && c.vars[k] != null) v = c.vars[k]; }); return v; };
const tok2 = i => i.dataset.u ? i.value + i.dataset.u : String(+i.value * +(i.dataset.k || 1));
/* ---- layers ---- */
const REG = [["#x3d", "3D room"], ["#xHome", "Home overlay"], ["#x6hud", "Balance HUD"], ["#x6brand", "Brand"], ["#x7editBtn", "Edit desk button"], ["#x6nav", "Control strip"], ["#xTabs", "Scene tabs"], ["#xScene", "Scene cards"], ["#v-market", "Spot / Derivatives view"], ["#v-trade", "Trade view"], ["#v-tx", "Transactions view"], ["#v-coach", "Coach view"], ["#dock", "Bottom dock"], ["#ticket", "Order ticket"], ["#drawer", "Settings drawer"], ["#ask", "Ask the Teacher"], ["#pop", "Lesson pop-up"], ["#xTeach", "Teach button"], ["#toast", "Toast"]];
function renderLayers() { const L = pan.querySelector("#xdLayers"); if (!L) return; const row = (sel, name, depth, kids) => { const hid = flat(st.changes).some(c => c.kind === "style" && c.sel === sel && c.props.display === "none"), lk = locked(sel), on = UI.sel && UI.sel.sel === sel;
    return `<div class="ly${on ? " on" : ""}" style="--d:${depth}" data-ly="${esc(sel)}">${kids ? `<button type="button" class="tw" data-tw="${esc(sel)}">${UI.open && UI.open[sel] || UI.lyAll ? "▾" : "▸"}</button>` : `<span class="tw"></span>`}<button type="button" class="nm" data-lsel="${esc(sel)}">${esc(name)}</button><button type="button" data-lhide="${esc(sel)}" class="${hid ? "off" : ""}" title="Hide / show">${hid ? "◌" : "👁"}</button><button type="button" data-llock="${esc(sel)}" class="${lk ? "lk" : ""}" title="Lock">${lk ? "🔒" : "🔓"}</button></div>`; };
  let h = ""; const kidsOf = el => [...el.children].filter(c => !isDev(c) && c.tagName !== "SCRIPT" && c.tagName !== "STYLE" && c.getBoundingClientRect().width > 0).slice(0, 30);
  const walk = (el, depth) => { kidsOf(el).forEach(c => { const s = cssPath(c), k = kidsOf(c).length; h += row(s, nameOf(c), depth, k); if (k && depth < 6 && (UI.lyAll && depth < 2 || UI.open && UI.open[s])) walk(c, depth + 1); }); };
  h += `<h5>3D room</h5>` + ((window.xvi6 && xvi6.layout) ? xvi6.layout().pan.map(([id, pos, ck]) => `<div class="ly" style="--d:0"><span class="tw"></span><button type="button" class="nm" data-l3="${id}">${id === "main" ? "Big screen" : "Side screen " + id.slice(1)} · ${esc(ck)}</button></div>`).join("") : "<small class='hint'>off (no WebGL)</small>");
  h += `<h5>Screen regions</h5>`; REG.forEach(([s, n]) => { const el = qs(s); if (!el) return; const k = kidsOf(el).length; h += row(s, n, 0, k); if (k && (UI.lyAll || UI.open && UI.open[s])) walk(el, 1); });
  const cs = [...compRoot.children]; h += `<h5>Inserted components (${cs.length})</h5>` + cs.map(c => row("#" + c.id, (LIB[c.dataset.type] || {}).n + " · " + (c.dataset.label || ""), 0, 0)).join(""); L.innerHTML = h; }
pan.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const D = b.dataset;
  if (D.tw) { UI.open = UI.open || {}; UI.open[D.tw] = !UI.open[D.tw]; renderLayers(); } else if (D.lsel) { if (locked(D.lsel)) return toastD("Locked: unlock it first."); UI.sel = { kind: "dom", sel: D.lsel }; refreshSel(); renderLayers(); }
  else if (D.l3) { let r = null; try { const p = xvi6.panelAt(D.l3, 0, 0), q = xvi6.panelAt(D.l3, 1, 1); r = { x: Math.min(p[0], q[0]), y: Math.min(p[1], q[1]), w: Math.abs(q[0] - p[0]), h: Math.abs(q[1] - p[1]) }; } catch (er) {} UI.sel = { kind: "3d", id: D.l3, name: D.l3 === "main" ? "Big screen" : "Side screen " + D.l3.slice(1), rect: r }; refreshSel(); }
  else if (D.lhide) { const s = D.lhide, i = st.changes.findIndex(c => c.kind === "style" && c.sel === s && c.props.display === "none"); if (i >= 0) revert(st.changes[i].id); else commit({ kind: "style", sel: s, props: { display: "none" } }, "Hide " + shortSel(s)); renderLayers(); }
  else if (D.llock) { const i = st.locked.indexOf(D.llock); i < 0 ? st.locked.push(D.llock) : st.locked.splice(i, 1); save(); renderLayers(); } });
/* ---- change log ---- */
function renderLog() { const L = pan.querySelector("#xdLog"); if (!L) return; L.innerHTML = st.changes.slice().reverse().map(c => `<li><time>${hhmm(c.t)}</time><span>${esc(c.label)}</span><button type="button" data-p="logrev" data-id="${c.id}" title="Revert this change">↺</button></li>`).join("") || `<li class="hint">No changes yet.</li>`; }
/* ---- AI edit chat (uses the AI from Connect AI; never sends keys, input values or storage) ---- */
const aiOK = () => { try { return UNI.aiReady(); } catch (e) { return false; } };
function trimHTML(el) { const c = el.cloneNode(true); [c, ...c.querySelectorAll("*")].forEach(n => { if (n.removeAttribute) { n.removeAttribute("value"); if (n.tagName === "INPUT" && /password/i.test(n.type)) n.setAttribute("type", "password"); [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || a.value.length > 160) n.removeAttribute(a.name); }); } if (n.tagName === "IMG" || n.tagName === "CANVAS" || n.tagName === "SVG") n.innerHTML = ""; });
  let h = c.outerHTML.replace(/\s+/g, " "); return h.length > 1600 ? h.slice(0, 1600) + " …(trimmed)" : h; }
function reqText(q) { const el = selEl(), s = UI.sel.sel; if (el && el.closest("#ticket,#drawer,#xConnect,#xConn,#ask") && el.querySelector("input,textarea")) throw new Error("Pick a visual label instead of a container with private inputs."); return `You restyle the XVI DNA trading-education web app (dark navy holo-glass look, accent #4cc3ff, fonts Orbitron/Rajdhani). Change ONLY the look of the page.
Reply with JSON only, no prose, shaped exactly like:
{"summary":"one sentence","css":[{"selector":"CSS selector","props":{"property":"value"}}],"dom":[{"selector":"CSS selector","text":"new text (optional)","attrs":{"title":"…"},"addClass":["…"],"removeClass":["…"]}]${st.allowJS ? `,"js":"optional short JavaScript, only if CSS/DOM cannot do it"` : ""}}
Rules: use the selector ${JSON.stringify(s)} for the selected element (descendants may use it as a prefix). Plain CSS values only: no url(), no @import, no !important. Moving = the "translate" property ("Xpx Ypx", added to the current one), rotating = "rotate". Allowed attrs: title, aria-label, alt, placeholder. Never touch inputs' values, order or trading logic, or keys.${st.allowJS ? "" : " Do not return JavaScript."}
Selected element: ${JSON.stringify(s)} (${el.tagName.toLowerCase()}, ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}px, viewport ${innerWidth}×${innerHeight})
Current key styles: ${JSON.stringify(keyStyles(el))}
Text: ${JSON.stringify(el.textContent.trim().slice(0, 300))}
HTML: ${trimHTML(el)}
Request: ${q}`; }
function parsePatch(t) { const m = String(t).replace(/```(json)?/g, "").match(/\{[\s\S]*\}/); if (!m) throw new Error("The AI didn't return a JSON patch."); const o = JSON.parse(m[0]), items = [], skipped = [];
  (o.css || []).forEach(r => { const p = cleanProps(r.props); if (!okSel(r.selector)) return skipped.push("selector " + r.selector); if (Object.keys(p).length) items.push({ kind: "style", sel: r.selector, props: p }); });
  (o.dom || []).forEach(r => { if (!okSel(r.selector)) return skipped.push("selector " + r.selector); const el = qs(r.selector); if (FORM(el)) return skipped.push("form field " + r.selector);
    if (typeof r.text === "string") items.push({ kind: "text", sel: r.selector, text: r.text.slice(0, 2000) }); Object.entries(r.attrs || {}).forEach(([k, v]) => ATTR_OK.test(k) ? items.push({ kind: "attr", sel: r.selector, name: k, value: String(v) }) : skipped.push("attribute " + k));
    if ((r.addClass || []).length || (r.removeClass || []).length) items.push({ kind: "cls", sel: r.selector, add: (r.addClass || []).filter(x => /^[\w-]+$/.test(x)), remove: (r.removeClass || []).filter(x => /^[\w-]+$/.test(x)) });
    if (r.style) { const p = cleanProps(r.style); if (Object.keys(p).length) items.push({ kind: "style", sel: r.selector, props: p }); } });
  if (o.js && st.allowJS) items.push({ kind: "js", code: String(o.js).slice(0, 4000), ok: false }); else if (o.js) skipped.push("a script (allow script is off)");
  /* translate from the AI is relative: add it to the current one */
  items.forEach(i => { if (i.kind === "style" && i.props.translate) { const el = qs(i.sel); if (el) { const t = curT(el), v = i.props.translate.split(/\s+/); i.props.translate = `${Math.round(t.x + num(v[0]))}px ${Math.round(t.y + num(v[1] || 0))}px`; } } });
  return { summary: String(o.summary || "").slice(0, 300), items, skipped }; }
const descr = i => i.kind === "style" ? `<code>${esc(shortSel(i.sel))}</code> ${Object.entries(i.props).map(([k, v]) => `${esc(k)}: <b>${esc(v)}</b>`).join("; ")}` : i.kind === "text" ? `<code>${esc(shortSel(i.sel))}</code> text → “${esc(i.text.slice(0, 80))}”` : i.kind === "attr" ? `<code>${esc(shortSel(i.sel))}</code> ${esc(i.name)} = “${esc(i.value)}”` : i.kind === "cls" ? `<code>${esc(shortSel(i.sel))}</code> class +${esc((i.add || []).join(" "))} −${esc((i.remove || []).join(" "))}` : `<b>Script</b> (runs only after you confirm):<pre>${esc(i.code)}</pre>`;
async function aiAsk() { const ta = pan.querySelector("#xdAsk"), q = ta ? ta.value.trim() : UI.lastQ; if (!q) return toastD("Type what you want changed."); UI.lastQ = q; const box = () => pan.querySelector("#xdAI");
  if (!aiOK()) { UI.aiOut = `<p class="hint">No AI connected. Press Connect AI on the desk (or Settings → AI). Meanwhile use the editor below.</p>`; if (box()) box().innerHTML = UI.aiOut; return; }
  UI.aiOut = `<p class="hint">Asking the AI…</p>`; if (box()) box().innerHTML = UI.aiOut; let img = null; if (UI.attShot) { const s = await snapshot("sel", true); img = s && s.url; }
  try { let r; try { r = await UNI.sample([{ role: "user", content: reqText(q) }], { image: img, maxTokens: 1500, noStream: true }); } catch (e) { if (!img) throw e; r = await UNI.sample([{ role: "user", content: reqText(q) }], { maxTokens: 1500, noStream: true }); }
    UI.patch = parsePatch(r.text); UI.patch.q = q; if (!UI.patch.items.length) throw new Error("The AI returned no usable changes" + (UI.patch.skipped.length ? " (skipped: " + UI.patch.skipped.join(", ") + ")" : "") + ".");
    UI.aiOut = `<div class="patch"><b>${esc(UI.patch.summary || "Proposed changes")}</b><p class="hint">It will change:</p><ul>${UI.patch.items.map(i => `<li>${descr(i)}</li>`).join("")}</ul>${UI.patch.skipped.length ? `<p class="hint">Skipped for safety: ${esc(UI.patch.skipped.join(", "))}</p>` : ""}<div class="row"><button type="button" class="pri" data-p="aipreview">Preview</button><button type="button" data-p="aiundo">Discard</button></div></div>`; }
  catch (e) { UI.aiOut = `<p class="err">${esc(e.text || e.message || String(e))}</p>`; } if (box()) box().innerHTML = UI.aiOut; }
async function aiPreview() { const P = UI.patch; if (!P) return; const js = P.items.find(i => i.kind === "js"); if (js && !js.ok && !(await xviConfirm("The AI wants to run this script. Run it? It only changes what you see; it is never given your keys.", "Run script", { code: js.code }))) { P.items = P.items.filter(i => i !== js); } else if (js) js.ok = true; if (UI.patch !== P) return;
  setLive({ kind: "group", items: P.items.filter(i => i.kind !== "js") }); if (js && js.ok) { try { new Function(js.code)(); js.ran = 1; } catch (e) { toastD("Script error: " + e.message); } }
  UI.aiOut = `<div class="patch"><b>Previewing: ${esc(P.summary || P.q)}</b><div class="row"><button type="button" class="pri" data-p="aikeep">Keep</button><button type="button" data-p="aiundo">Undo</button><button type="button" data-p="aiagain">Try again</button></div></div>`; pan.querySelector("#xdAI").innerHTML = UI.aiOut; }
function aiKeep() { const P = UI.patch; if (!P) return; commit({ kind: "group", items: P.items.map(i => Object.assign({}, i, i.kind === "js" ? { ran: 1 } : {})) }, "AI: " + (P.summary || P.q).slice(0, 60)); UI.patch = null; UI.aiOut = `<p class="ok">Kept. It's in Changes and can be undone.</p>`; renderPanel(); }
function aiDiscard() { live = null; applyAll(); UI.patch = null; UI.aiOut = ""; const b = pan.querySelector("#xdAI"); if (b) b.innerHTML = ""; }
async function copyReq() { const ta = pan.querySelector("#xdAsk"), q = (ta && ta.value.trim()) || "(describe the fix)"; const txt = reqText(q), s = await snapshot("sel", true);
  try { if (s && window.ClipboardItem && navigator.clipboard.write) { const blob = await (await fetch(s.url)).blob(); await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([txt], { type: "text/plain" }), "image/png": blob })]); } else await navigator.clipboard.writeText(txt); toastD("Fix request copied" + (s ? " with a snapshot." : ".")); }
  catch (e) { try { await navigator.clipboard.writeText(txt); toastD("Fix request copied (text only)."); } catch (er) { dl("xvi-fix-request.txt", new Blob([txt], { type: "text/plain" })); } } }
/* ---- snapshots: the 3D renderer for the room, an SVG foreignObject render for DOM ---- */
const SHOTS = [];
async function domPng(el, r) { const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height)), clone = el.cloneNode(true), src = [el, ...el.querySelectorAll("*")], dst = [clone, ...clone.querySelectorAll("*")]; if (src.length > 900) throw new Error("too big");
  src.forEach((s, i) => { const t = dst[i]; if (!t || !t.style) return; const cs = getComputedStyle(s); let css = ""; for (let k = 0; k < cs.length; k++) { const p = cs[k]; css += `${p}:${cs.getPropertyValue(p)};`; } t.setAttribute("style", css); if (s.tagName === "CANVAS") { try { const im = d.createElement("img"); im.src = s.toDataURL(); im.setAttribute("style", css); t.replaceWith(im); } catch (e) {} } if (isDev(s)) t.remove && t.remove(); });
  clone.style.margin = "0"; clone.style.translate = "none"; clone.style.position = "static"; const xml = new XMLSerializer().serializeToString(clone), svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${xml}</div></foreignObject></svg>`;
  const im = new Image(); im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await Promise.race([im.decode(), new Promise((_, rej) => setTimeout(() => rej(new Error("Image timeout")), 4000))]); const c = d.createElement("canvas"); c.width = W; c.height = H; c.getContext("2d").drawImage(im, 0, 0); return c.toDataURL("image/png"); }
async function snapshot(what, quiet) { let url = null, name = ""; try {
    if (what === "sel" && UI.sel && UI.sel.kind === "dom" && selEl()) { const el = selEl(), r = el.getBoundingClientRect(); name = nameOf(el); url = await domPng(el, r).catch(() => null); if (!url && window.xvi6 && xvi6.snapshot) url = await crop(xvi6.snapshot(), r); }
    else if (what === "sel" && UI.sel && UI.sel.kind === "3d" && window.xvi6) { name = UI.sel.name; const r = UI.sel.rect; url = await crop(xvi6.snapshot(), r ? { left: r.x, top: r.y, width: r.w, height: r.h } : null); }
    else { name = "screen " + innerWidth + "×" + innerHeight; const c = d.createElement("canvas"); c.width = innerWidth; c.height = innerHeight; const g = c.getContext("2d"); g.fillStyle = "#030b1f"; g.fillRect(0, 0, c.width, c.height);
      const s3 = window.xvi6 && xvi6.snapshot && qs("#x3d") && getComputedStyle(qs("#x3d")).visibility !== "hidden" ? xvi6.snapshot() : null; if (s3) { const im = new Image(); im.src = s3; await Promise.race([im.decode(), new Promise((_, rej) => setTimeout(() => rej(new Error("Image timeout")), 4000))]); g.drawImage(im, 0, 0, c.width, c.height); }
      ov.style.visibility = pan.style.visibility = bar.style.visibility = "hidden"; try { const u = await domPng(qs(".wrap") && getComputedStyle(qs(".wrap")).display !== "none" && !body.classList.contains("x-home") ? qs(".wrap") : qs("#xHome") || body, (qs(".wrap") || body).getBoundingClientRect()).catch(() => null); if (u) { const im = new Image(); im.src = u; await Promise.race([im.decode(), new Promise((_, rej) => setTimeout(() => rej(new Error("Image timeout")), 4000))]); const r = (qs(".wrap") || body).getBoundingClientRect(); g.drawImage(im, r.left, r.top); } } finally { ov.style.visibility = pan.style.visibility = bar.style.visibility = ""; }
      url = c.toDataURL("image/png"); } } catch (e) { url = null; }
  if (!url) { if (!quiet) toastD("Couldn't capture that (cross-origin content?)."); return null; } const s = { url, name, t: now() }; SHOTS.unshift(s); SHOTS.length = Math.min(SHOTS.length, 8); if (!quiet) { toastD("Snapshot saved (Export tab)."); if (UI.tab === "export") renderPanel(); } return s; }
function crop(u, r) { if (!u || !r) return u; const c = d.createElement("canvas"), im = new Image(); return new Promise(res => { im.onload = () => { const k = im.width / innerWidth; c.width = Math.max(1, r.width * k); c.height = Math.max(1, r.height * k); c.getContext("2d").drawImage(im, r.left * k, r.top * k, r.width * k, r.height * k, 0, 0, c.width, c.height); res(c.toDataURL("image/png")); }; im.onerror = () => res(u); im.src = u; }); }
/* ---- Quick Insert: XVI holo-glass components, saved as JSON specs and rebuilt on load ---- */
const LIB = { sidebar: { n: "Sidebar", i: "▤", w: 220, h: 0, p: { label: "XVI", options: "Coach|coach, Lessons|lessons, Journal|journal, Progress|progress, Platforms|platforms", side: "left", collapsed: false } },
  select: { n: "Dropdown", i: "▾", w: 200, h: 40, p: { label: "Big screen", options: "Chart|main:chart, Watchlist|main:watch, Order book|main:book, Journal|main:journal" } },
  button: { n: "Button", i: "⬚", w: 150, h: 44, p: { label: "Ask the Teacher", variant: "primary", action: "ask" } }, tabs: { n: "Tab bar", i: "⇆", w: 360, h: 42, p: { options: "Spot|spot, Derivatives|deriv, Trade|markets, Transactions|tx" } },
  toggle: { n: "Toggle", i: "◐", w: 180, h: 36, p: { label: "Voice", action: "voice", value: false } }, slider: { n: "Slider", i: "━", w: 220, h: 44, p: { label: "Amount", value: 50 } },
  check: { n: "Checkbox / radio", i: "☑", w: 200, h: 70, p: { label: "Options", options: "Show tips, Sound on", variant: "checkbox" } }, input: { n: "Text / search", i: "⌕", w: 240, h: 40, p: { label: "Ask the teacher…", variant: "search", action: "ask" } },
  card: { n: "Card / glass panel", i: "▭", w: 260, h: 150, p: { label: "Glass card", text: "Put anything here." } }, modal: { n: "Modal / pop-up", i: "❐", w: 340, h: 190, p: { label: "Heads up", text: "This is a pop-up. Tap × to close it.", action: "" } },
  tooltip: { n: "Tooltip", i: "💬", w: 190, h: 52, p: { label: "Tap here to start" } }, badge: { n: "Badge / pill", i: "◉", w: 110, h: 30, p: { label: "NEW", variant: "accent" } }, divider: { n: "Divider", i: "—", w: 300, h: 12, p: {} },
  heading: { n: "Heading / text / label", i: "H", w: 280, h: 46, p: { label: "XVI DNA", variant: "h1" } }, image: { n: "Image", i: "🖼", w: 160, h: 160, p: { src: "", label: "Coach" } }, icon: { n: "Icon", i: "★", w: 54, h: 54, p: { label: "★", action: "coach" } },
  chart: { n: "Mini live chart", i: "📈", w: 320, h: 180, p: { label: "chart", action: "chart" } }, stat: { n: "Ticker / stat tile", i: "▲", w: 200, h: 92, p: { label: "price", action: "chart" } },
  progress: { n: "Progress bar", i: "▰", w: 240, h: 40, p: { label: "Badges", value: "badges" } }, list: { n: "List / table", i: "☷", w: 280, h: 160, p: { label: "Watch", options: "BTC|Bitcoin|Crypto, ETH|Ether|Crypto, SOL|Solana|Crypto" } },
  accordion: { n: "Accordion", i: "≡", w: 280, h: 140, p: { options: "What is a stop?: An order that exits when price hits your level., What is a spread?: The gap between the best bid and ask." } }, toastc: { n: "Toast", i: "🔔", w: 280, h: 52, p: { label: "Order preview ready", variant: "info" } } };
const ACTN = () => { const A = (window.xvi6 && xvi6.ACT) || {}, n = Object.keys(A).filter(k => k !== "coachHolo").map(k => [k, k]); return [["", "(none)"]].concat(n, ((window.xvi6 && xvi6.contents) ? xvi6.contents() : []).map(([k, t]) => ["main:" + k, "Big screen → " + t]), [["holo", "Toggle coach hologram"], ["sym:next", "Next symbol"], ["sym:prev", "Previous symbol"], ["link", "Custom link"]]); };
const opts = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean).map(x => { const [l, a] = x.split("|").map(y => y.trim()); return { l, a: a || "" }; });
function runAction(p, a) { a = a != null ? a : p.action; if (!a) return; try { XVIsfx && XVIsfx(); } catch (e) {}
  if (a === "link") { if (/^https?:\/\//i.test(p.link || "")) window.open(p.link, "_blank", "noopener"); else toastD("Set an http(s) link for this component."); return; }
  if (a.startsWith("main:")) { if (window.xvi6 && xvi6.showOnMain) { if (!body.classList.contains("x-home")) showView("home"); xvi6.showOnMain(a.slice(5), 1); } return; }
  if (a === "holo") { body.classList.contains("x-holo") ? (window.xviCloseHolo && xviCloseHolo()) : (window.xviHolo && xviHolo("coach")); return; }
  if (a.startsWith("sym:")) { const L = S.lists && S.lists.crypto || [], i = L.findIndex(m => S.inst && m.key === S.inst.key), m = L[(i + (a === "sym:next" ? 1 : -1) + L.length) % L.length]; if (m) selectInst(m); return; }
  const A = window.xvi6 && xvi6.ACT; if (A && A[a]) A[a](); }
function buildComp(s) { const L = LIB[s.type]; if (!L) return d.createTextNode(""); const p = s.props, el = d.createElement("div"); el.id = "xc-" + s.id; el.className = "xdc xdc-" + s.type + (p.variant ? " v-" + p.variant : ""); el.dataset.type = s.type; el.dataset.label = String(p.label || "").slice(0, 30);
  Object.assign(el.style, { left: s.x + "px", top: s.y + "px", width: s.w ? s.w + "px" : "", height: s.h ? s.h + "px" : "" }); const run = a => () => runAction(p, a), on = (sel, ev, f) => el.querySelectorAll(sel).forEach(n => n.addEventListener(ev, f));
  const O = opts(p.options);
  switch (s.type) {
    case "sidebar": el.classList.add(p.side === "right" ? "r" : "l"); if (p.collapsed) el.classList.add("col"); el.innerHTML = `<button type="button" class="tg" aria-label="Collapse">${p.side === "right" ? "›" : "‹"}</button><b>${esc(p.label)}</b><nav>${O.map((o, i) => `<button type="button" data-i="${i}">${esc(o.l)}</button>`).join("")}</nav>`; on(".tg", "click", () => el.classList.toggle("col")); on("nav button", "click", e => runAction(p, O[+e.currentTarget.dataset.i].a)); break;
    case "select": el.innerHTML = `<label><span>${esc(p.label)}</span><select>${O.map((o, i) => `<option value="${i}">${esc(o.l)}</option>`).join("")}</select></label>`; on("select", "change", e => runAction(p, O[+e.target.value].a)); break;
    case "button": el.innerHTML = `<button type="button">${esc(p.label)}</button>`; on("button", "click", run()); break;
    case "tabs": el.innerHTML = O.map((o, i) => `<button type="button" data-i="${i}" class="${i === 0 ? "on" : ""}">${esc(o.l)}</button>`).join(""); on("button", "click", e => { el.querySelectorAll("button").forEach(b => b.classList.remove("on")); e.currentTarget.classList.add("on"); runAction(p, O[+e.currentTarget.dataset.i].a); }); break;
    case "toggle": el.innerHTML = `<label><input type="checkbox" ${p.value ? "checked" : ""}><i></i><span>${esc(p.label)}</span></label>`; on("input", "change", run()); break;
    case "slider": el.innerHTML = `<label><span>${esc(p.label)}</span><input type="range" min="0" max="100" value="${+p.value || 0}"><output>${+p.value || 0}</output></label>`; on("input", "input", e => { el.querySelector("output").textContent = e.target.value; }); on("input", "change", run()); break;
    case "check": el.innerHTML = `<b>${esc(p.label)}</b>` + O.map((o, i) => `<label><input type="${p.variant === "radio" ? "radio" : "checkbox"}" name="r${s.id}"> ${esc(o.l)}</label>`).join(""); on("input", "change", e => { const i = [...el.querySelectorAll("input")].indexOf(e.target); runAction(p, O[i].a || p.action); }); break;
    case "input": el.innerHTML = `<label>${p.variant === "search" ? "<i>⌕</i>" : ""}<input type="text" placeholder="${esc(p.label)}"></label>`; on("input", "keydown", e => { if (e.key === "Enter") { const v = e.target.value; if (p.action === "ask" && window.openAsk) { try { openAsk(); setTimeout(() => { const t = qs("#askIn") || qs("#ask textarea") || qs("#ask input"); if (t) { t.value = v; t.dispatchEvent(new Event("input", { bubbles: true })); } }, 120); } catch (er) {} } else runAction(p); } }); break;
    case "card": el.innerHTML = `<b>${esc(p.label)}</b><p>${esc(p.text)}</p>`; if (p.action) el.addEventListener("click", run()); break;
    case "modal": el.innerHTML = `<button type="button" class="x" aria-label="Close">×</button><b>${esc(p.label)}</b><p>${esc(p.text)}</p>${p.action ? `<button type="button" class="go">OK</button>` : ""}`; on(".x", "click", () => el.classList.add("closed")); on(".go", "click", run()); break;
    case "tooltip": el.innerHTML = `<span>${esc(p.label)}</span>`; if (p.action) el.addEventListener("click", run()); break;
    case "badge": el.innerHTML = `<span>${esc(p.label)}</span>`; if (p.action) el.addEventListener("click", run()); break;
    case "divider": el.innerHTML = "<hr>"; break;
    case "heading": el.innerHTML = p.variant === "h1" ? `<h2>${esc(p.label)}</h2>` : p.variant === "label" ? `<small>${esc(p.label)}</small>` : `<p>${esc(p.label)}</p>`; break;
    case "image": el.innerHTML = `<img alt="${esc(p.label)}" src="${esc(/^(https?:|data:image\/)/.test(p.src || "") ? p.src : (window.XASSET && (XASSET.holo_f || XASSET.coach_f)) || "")}">`; if (p.action) el.addEventListener("click", run()); break;
    case "icon": el.innerHTML = `<button type="button" aria-label="${esc(p.action || p.label)}">${esc(p.label)}</button>`; on("button", "click", run()); break;
    case "chart": el.innerHTML = `<canvas width="640" height="360"></canvas>`; liveComp(el, () => { const c = el.querySelector("canvas"); if (window.xvi6 && xvi6.drawContent) xvi6.drawContent(p.label || "chart", c); else spark(c); }); if (p.action) el.addEventListener("click", run()); break;
    case "stat": el.innerHTML = `<small></small><b></b><em></em>`; liveComp(el, () => { const k = p.label, b = S.bars || [], c = b.length ? b[b.length - 1].c : S.inst && S.inst.price, f = b.length > 1 ? b[0].c : null; const [a, v, w] = k === "balance" ? ["Balance", "$" + (+S.balance || 0).toFixed(2), UNI.practice && UNI.practice() ? "practice" : "live"] : k === "pnl" ? ["Realized P&L", "$" + (S.lessons || []).reduce((s, l) => s + (l.net || 0), 0).toFixed(2), (S.lessons || []).length + " trades"] : [S.inst ? S.inst.label : "—", c ? (+c).toLocaleString("en-US", { maximumFractionDigits: c < 1 ? 5 : 2 }) : "—", f && c ? ((c - f) / f * 100).toFixed(2) + "%" : ""]; el.querySelector("small").textContent = a; el.querySelector("b").textContent = v; const em = el.querySelector("em"); em.textContent = w; em.className = /^-/.test(w) ? "dn" : "up"; }); if (p.action) el.addEventListener("click", run()); break;
    case "progress": el.innerHTML = `<small>${esc(p.label)}</small><div><i></i></div>`; liveComp(el, () => { let v = +p.value; if (p.value === "badges") { try { const n = BADGES.filter(b => { try { return b[3](); } catch (e) { return false; } }).length; v = n / BADGES.length * 100; } catch (e) { v = 0; } } el.querySelector("i").style.width = clamp(v || 0, 0, 100) + "%"; }); break;
    case "list": el.innerHTML = `<b>${esc(p.label)}</b><table>${String(p.options || "").split(",").map(r => `<tr>${r.split("|").map(c => `<td>${esc(c.trim())}</td>`).join("")}</tr>`).join("")}</table>`; break;
    case "accordion": el.innerHTML = String(p.options || "").split(",").map(x => { const [t, ...b] = x.split(":"); return `<details><summary>${esc(t.trim())}</summary><p>${esc(b.join(":").trim())}</p></details>`; }).join(""); break;
    case "toastc": el.innerHTML = `<span>${p.variant === "error" ? "⚠" : "🔔"}</span><p>${esc(p.label)}</p>`; if (p.action) el.addEventListener("click", run()); break; }
  return el; }
const liveC = new Set(); function liveComp(el, f) { el._f = f; liveC.add(el); setTimeout(f, 30); }
setInterval(() => { liveC.forEach(el => { if (!el.isConnected) { liveC.delete(el); return; } try { el._f(); } catch (e) {} }); }, 2000);
function spark(c) { const g = c.getContext("2d"), b = (S.bars || []).slice(-80); g.clearRect(0, 0, c.width, c.height); if (b.length < 2) return; const lo = Math.min(...b.map(k => k.l)), hi = Math.max(...b.map(k => k.h)); g.strokeStyle = "#4cc3ff"; g.lineWidth = 3; g.beginPath(); b.forEach((k, i) => { const x = i / (b.length - 1) * c.width, y = c.height - (k.c - lo) / (hi - lo || 1) * c.height; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
function insertComp(k, x, y) { const L = LIB[k]; if (!L) return; const w = L.w, h = L.h || Math.round(innerHeight * .7); if (x == null) { x = innerWidth / 2; y = innerHeight / 2; }
  const spec = { id: uid(), type: k, x: Math.round(k === "sidebar" ? 8 : clamp(x - w / 2, 0, innerWidth - 40)), y: Math.round(k === "sidebar" ? 80 : clamp(y - (L.h || 40) / 2, 0, innerHeight - 30)), w, h: L.h ? L.h : h, props: JSON.parse(JSON.stringify(L.p)) };
  commit({ kind: "comp", spec }, "Insert " + L.n); UI.sel = { kind: "dom", sel: "#xc-" + spec.id }; UI.tab = "edit"; refreshSel(); renderPanel(); }
const compOfSel = () => { const el = selEl(); const c = el && el.closest && el.closest(".xdc"); if (!c) return null; let spec = null; flat(st.changes).forEach(ch => { if (ch.kind === "comp" && "xc-" + ch.spec.id === c.id) spec = JSON.parse(JSON.stringify(ch.spec)); if (ch.kind === "compset" && spec && ch.cid === spec.id) Object.assign(spec.props, ch.props); }); return spec; };
function compProps(s) { const L = LIB[s.type], p = s.props, A = ACTN(); const f = (k, lab, inp) => `<label>${lab} ${inp}</label>`;
  return `<section class="cprops"><h4>${esc(L.n)} properties</h4>${"label" in p ? f("label", s.type === "chart" ? "Screen" : s.type === "stat" ? "Shows" : "Label / text", s.type === "chart" ? `<select data-cprop="label">${((window.xvi6 && xvi6.contents) ? xvi6.contents() : [["chart", "Chart"]]).map(([k, t]) => `<option value="${k}" ${p.label === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : s.type === "stat" ? `<select data-cprop="label">${["price", "balance", "pnl"].map(k => `<option ${p.label === k ? "selected" : ""}>${k}</option>`).join("")}</select>` : `<input type="text" data-cprop="label" value="${esc(p.label)}">`) : ""}
    ${"text" in p ? f("text", "Body", `<textarea data-cprop="text" rows="2">${esc(p.text)}</textarea>`) : ""}${"options" in p ? f("options", "Options <small>(comma separated; “Label|action” wires each one)</small>", `<textarea data-cprop="options" rows="2">${esc(p.options)}</textarea>`) : ""}
    ${"variant" in p ? f("variant", "Style", `<select data-cprop="variant">${({ button: ["primary", "ghost", "icon"], check: ["checkbox", "radio"], input: ["search", "text"], badge: ["accent", "up", "down", "warn"], heading: ["h1", "text", "label"], toastc: ["info", "error"] }[s.type] || [p.variant]).map(v => `<option ${p.variant === v ? "selected" : ""}>${v}</option>`).join("")}</select>`) : ""}
    ${"side" in p ? f("side", "Side", `<select data-cprop="side"><option ${p.side === "left" ? "selected" : ""}>left</option><option ${p.side === "right" ? "selected" : ""}>right</option></select>`) : ""}${"src" in p ? f("src", "Image URL", `<input type="url" data-cprop="src" value="${esc(p.src)}" placeholder="https://… (blank = coach)">`) : ""}
    ${["divider", "list", "accordion", "progress", "slider", "heading"].includes(s.type) ? "" : f("action", "Action", `<select data-cprop="action">${A.map(([k, t]) => `<option value="${k}" ${(p.action || "") === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`)}
    ${p.action === "link" || "link" in p ? f("link", "Custom link", `<input type="url" data-cprop="link" value="${esc(p.link || "")}" placeholder="https://">`) : ""}
    <div class="row"><button type="button" data-p="crun">▶ Test action</button><button type="button" data-p="cdup" title="Ctrl+D">Duplicate</button><button type="button" class="dn" data-p="cdel">Delete</button></div></section>`; }
function setCompProp(k, v) { const s = compOfSel(); if (!s) return; commit({ kind: "compset", cid: s.id, props: { [k]: v } }, `${LIB[s.type].n}: ${k}`); renderPanel(); }
function dupComp(s) { if (!s) return; const t = selEl(), r = t ? t.getBoundingClientRect() : null, n = Object.assign(JSON.parse(JSON.stringify(s)), { id: uid(), x: Math.round((r ? r.left : s.x) + 16), y: Math.round((r ? r.top : s.y) + 16) }); commit({ kind: "comp", spec: n }, "Duplicate " + LIB[s.type].n); UI.sel = { kind: "dom", sel: "#xc-" + n.id }; refreshSel(); renderPanel(); }
function delComp(s) { if (!s) return; commit({ kind: "compdel", cid: s.id }, "Delete " + LIB[s.type].n); UI.sel = null; refreshSel(); renderPanel(); }
/* ---- export / import ---- */
const exportObj = () => ({ app: "XVI DNA", kind: "xvi-dev-overrides", version: 1, exported: new Date().toISOString(), changes: st.changes.map(c => { const o = Object.assign({}, c); delete o.ran; return o; }), locked: st.locked, swatches: st.swatches });
function buildCSS() { const keep = bypass; bypass = false; let css = "/* XVI DNA dev overrides — generated " + new Date().toISOString() + " */\n"; flat(st.changes).forEach(c => { if (c.kind === "style" && okSel(c.sel)) css += `/* ${c.label || ""} */\n` + ruleOf(c.sel, cleanProps(c.props)); if (c.kind === "tokens") css += ruleOf(TOKSEL, cleanProps(c.vars)); }); bypass = keep;
  const comps = [...compRoot.children]; if (comps.length) css += "\n/* inserted components are rebuilt from components.json; their look comes from the XVI dev component styles */\n"; return css; }
function dl(name, blob) { UNI.saveFile(name, blob).catch(e => { if (e && e.code !== "cancelled" && e.code !== "declined") toastD("Couldn't save " + name + (e && e.code === "unavailable" ? ". Saving files isn't available in this view." : ".")); }); }
/* tiny store-only ZIP writer (no dependencies) */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
function zip(files) { const enc = new TextEncoder(), parts = [], cen = []; let off = 0; files.forEach(([name, data]) => { const nb = enc.encode(name), b = typeof data === "string" ? enc.encode(data) : data, crc = CRC(b), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint32(14, crc, true); h.setUint32(18, b.length, true); h.setUint32(22, b.length, true); h.setUint16(26, nb.length, true); parts.push(new Uint8Array(h.buffer), nb, b);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint32(16, crc, true); c.setUint32(20, b.length, true); c.setUint32(24, b.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true); cen.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + b.length; });
  const cs = cen.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true); return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/zip" }); }
const b64u8 = u => { const s = atob(u.split(",")[1]), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
async function exportBuild() { if (!SHOTS.length) await snapshot("screen", true); const o = exportObj(), comps = []; flat(st.changes).forEach(c => { if (c.kind === "comp") comps.push(c.spec); });
  const files = [["xvi-dev-overrides.json", JSON.stringify(o, null, 2)], ["overrides.css", buildCSS()], ["patches.json", JSON.stringify(st.changes.map(c => ({ time: new Date(c.t).toISOString(), label: c.label, kind: c.kind })), null, 2)], ["components.json", JSON.stringify(comps, null, 2)],
    ["README.txt", "XVI DNA — dev-mode export\n\noverrides.css      CSS for the build (append after the app CSS)\nxvi-dev-overrides.json  the full override layer (Dev mode → Export → Import loads it back)\npatches.json       timestamped change list\ncomponents.json    Quick Insert components (JSON specs; rebuilt by dev mode on load)\nsnapshots/         PNG captures\n"]];
  SHOTS.forEach((s, i) => files.push([`snapshots/${String(i + 1).padStart(2, "0")}-${s.name.replace(/[^\w.-]+/g, "_").slice(0, 40)}.png`, b64u8(s.url)]));
  dl("xvi-dev-export.zip", zip(files)); toastD("Exported xvi-dev-export.zip."); }
function importFile() { const i = d.createElement("input"); i.className = "xdev"; i.type = "file"; i.accept = "application/json,.json"; i.onchange = async () => { try { const o = JSON.parse(await i.files[0].text()); if (!o || !Array.isArray(o.changes)) throw new Error("Not an XVI dev overrides file.");
      const okK = ["style", "tokens", "text", "attr", "cls", "comp", "compset", "compdel", "rot3d", "group", "js"]; const ch = o.changes.filter(c => c && okK.includes(c.kind)).map(c => Object.assign({}, c, c.kind === "js" ? { ok: false } : {}));
      if (!(await xviConfirm(`Import ${ch.length} changes? They replace your current dev changes (${st.changes.length}).`, "Import"))) return; st.changes = ch; st.redo = []; st.locked = Array.isArray(o.locked) ? o.locked : []; st.swatches = Array.isArray(o.swatches) ? o.swatches.slice(0, 16) : st.swatches; save(); applyAll(); renderPanel(); toastD(`Imported ${ch.length} changes.`); } catch (e) { toastD("Import failed: " + e.message); } }; i.click(); }
/* ---- device preview + reduced motion + animation speed ---- */
function device(w) { let D = qs("#xdevDevice"); if (!w) { if (D) D.remove(); return; } if (!D) { D = d.createElement("div"); D.id = "xdevDevice"; D.innerHTML = `<div class="dh"><b>DEVICE PREVIEW</b>${[["Desktop", 1280, 800], ["Tablet", 820, 1180], ["Phone", 390, 844]].map(([n, a, b]) => `<button type="button" data-dv="${a}x${b}">${n} ${a}</button>`).join("")}<label><input type="checkbox" id="xdvRM" ${body.classList.contains("xdev-rm") ? "checked" : ""}> reduced motion</label><button type="button" data-dv="0">✕</button></div><div class="fr"><iframe title="Device preview"></iframe></div>`; body.append(D);
    D.addEventListener("click", e => { const b = e.target.closest("[data-dv]"); if (b) device(b.dataset.dv === "0" ? 0 : b.dataset.dv); }); D.querySelector("#xdvRM").addEventListener("change", e => { body.classList.toggle("xdev-rm", e.target.checked); device(D.dataset.w); }); }
  const [W, H] = String(w).split("x").map(Number), f = D.querySelector("iframe"), box = D.querySelector(".fr"), k = Math.min(1, (box.clientWidth - 20) / W, (box.clientHeight - 20) / H); D.dataset.w = w;
  Object.assign(f.style, { width: W + "px", height: H + "px", transform: `scale(${k})` }); const u = new URL(location.href); u.searchParams.set("xvidev", "frame"); if (body.classList.contains("xdev-rm")) u.searchParams.set("rm", "1"); else u.searchParams.delete("rm"); if (f.dataset.src !== u.href) { f.dataset.src = u.href; f.src = u.href; } }
if (FRAME && /[?&]rm=1/.test(location.search)) body.classList.add("xdev-rm");
const SPEEDS = [[1, "Normal"], [.25, "Slow ¼"], [0, "Pause"]];
function setSpeed(v) { UI.speed = v; body.classList.toggle("xdev-pause", v === 0); body.classList.toggle("xdev-slow", v > 0 && v < 1); const b = bar.querySelector('[data-t="speed"] span'); if (b) b.textContent = (SPEEDS.find(s => s[0] === v) || SPEEDS[0])[1]; }
setInterval(() => { if (UI.speed === 1 || !d.getAnimations) return; d.getAnimations().forEach(a => { try { if (!isDev(a.effect && a.effect.target)) a.playbackRate = UI.speed || 0.0001; if (UI.speed === 0) a.pause(); else if (a.playState === "paused") a.play(); } catch (e) {} }); }, 250);
/* ---- toolbar ---- */
function wireBar() { wirePanel();
  bar.addEventListener("click", async e => { const b = e.target.closest("[data-t]"); if (!b) return; const t = b.dataset.t;
    switch (t) { case "inspect": setInspect(!UI.inspect); break; case "close": setOn(false); break; case "cross": setCross(!UI.cross); break;
      case "guides": st.guides = !st.guides; save(); drawGrid(); b.classList.toggle("on", st.guides); toastD(st.guides ? "Grid, rulers and snapping guides on (grid " + st.grid + "px)." : "Guides off."); break;
      case "compare": UI.cmpLock = !UI.cmpLock; bypass = UI.cmpLock; applyAll(); b.classList.toggle("on", bypass); bar.classList.toggle("cmp", bypass); toastD(bypass ? "Showing BEFORE (overrides off). Tap again for after. Tip: hold \\ ." : "Showing AFTER (overrides on)."); break;
      case "device": device(qs("#xdevDevice") ? 0 : "820x1180"); break;
      case "snap": await snapshot(UI.sel ? "sel" : "screen"); break;
      case "speed": { const i = SPEEDS.findIndex(s => s[0] === UI.speed); setSpeed(SPEEDS[(i + 1) % SPEEDS.length][0]); break; }
      case "edit": case "color": case "insert": case "layers": case "log": case "tokens": case "export": UI.tab = t; UI.min = false; renderPanel(); break; } });
  /* the toolbar can be dragged out of the way */
  const gp = bar.querySelector(".grip"); let g = null; gp.addEventListener("pointerdown", e => { const r = bar.getBoundingClientRect(); g = { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId }; try { gp.setPointerCapture(e.pointerId); } catch (er) {} });
  gp.addEventListener("pointermove", e => { if (!g) return; bar.style.left = clamp(e.clientX - g.x, 0, innerWidth - 60) + "px"; bar.style.top = clamp(e.clientY - g.y, 0, innerHeight - 40) + "px"; bar.style.transform = "none"; }); gp.addEventListener("pointerup", () => { g = null; }); }
function setOn(on) { if (FRAME) return; st.on = !!on; save(); if (on) { mount(); body.classList.add("x-dev"); setInspect(UI.inspect); drawGrid(); bar.querySelector('[data-t="guides"]').classList.toggle("on", !!st.guides); renderPanel(); toastD("Dev mode on. Tap anything to select it · Ctrl+Shift+D to close."); }
  else { body.classList.remove("x-dev", "x-devpick"); if (UI.cross) setCross(false); if (UI.cmpLock) { UI.cmpLock = false; bypass = false; applyAll(); } live = null; device(0); setSpeed(1); UI.sel = null; if (UI.ready) { refreshSel(); place($o(".hov"), null); } }
  const cb = qs("#drDev"); if (cb) cb.checked = st.on; }
window.XVIdev = { toggle: () => setOn(!st.on), set: setOn, isOn: () => !!st.on, undo, redo, changes: () => st.changes.slice(), select: s => { setOn(true); select(typeof s === "string" ? { kind: "dom", sel: s } : s); }, insert: (k, x, y) => { setOn(true); insertComp(k, x, y); }, apply: applyAll, exportObj, buildCSS, _ui: UI, _ai: { parsePatch, reqText } };
addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d")) { e.preventDefault(); setOn(!st.on); } });
d.addEventListener("change", e => { if (e.target && e.target.id === "drDev") setOn(e.target.checked); });
d.addEventListener("click", e => { const b = e.target.closest && e.target.closest("#drEdit"); if (b) { try { closeDrawer(); } catch (er) {} setTimeout(() => window.xvi6 && xvi6.ACT && xvi6.ACT.edit(), 80); } });
const start = () => { applyAll(); if (st.on && !FRAME) setOn(true); };
if (d.readyState === "complete") setTimeout(start, 50); else addEventListener("load", () => setTimeout(start, 50));
setTimeout(() => applyAll(), 4000); /* 3D screens appear later: re-apply their rotations */
})();
