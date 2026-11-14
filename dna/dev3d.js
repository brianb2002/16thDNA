/* ================= 16th DNA desk: Dev mode for the 3D room =================
   Lets Dev mode pick ONE thing in the 3D room: a key on a screen, a whole screen, or a room piece (bull, bear,
   clocks, Bitcoin, news band, server walls, strategy holograms). Keys: rename, sub-label, color, size, hide, give
   them a new job. Screens: hide, resize. Room pieces: hide, resize, turn. Saved in localStorage "dna_desk_ovr".
   Needs window.__hxHit / __hxSurf (shell), window.__HX3 (renderer/scene/camera), DNA_OVR (desk.js). */
(() => {
"use strict";
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SURF = { "wall:tickers": "Watchlist screen", "wall:heat": "Coach screen", "wall:chart": "Big chart screen", "wall:movers": "Account screen", "wall:sectors": "Strategies screen",
  "row:positions": "ASK strip", "row:focus": "SELL strip", "row:trades": "Symbol strip", "row:mheat": "BUY strip", "row:pnl": "SETTINGS strip",
  "pad:chart": "Timeframe tablet", "pad:order": "Connect tablet", "pad:ctrl": "Desk tablet", "ticket:ticket": "Order ticket", "watch:watch": "Learn tablet", "signals:signals": "Orders tablet" };
const surfName = id => SURF[id] || (id.startsWith("tile:") ? "Ring tile " + (+id.slice(5) + 1) : id.startsWith("station:") ? "Strategy hologram " + (+id.slice(8) + 1) : id);
const OVR = () => window.DNA_OVR;
const SW = ["#7fe3ff", "#3b8cff", "#2ee6a8", "#1fae7a", "#ff5a76", "#ffc14d", "#ffcf5a", "#b48cff", "#f2fbff"];

/* ---- geometry helpers ---- */
function X() { return window.__HX3; }
function project(v) { const { camera, renderer } = X(), r = renderer.domElement.getBoundingClientRect(), p = v.clone().project(camera); if (p.z > 1) return null; return [r.left + (p.x + 1) / 2 * r.width, r.top + (1 - p.y) / 2 * r.height]; }
function rectOfPts(pts) { pts = pts.filter(Boolean); if (!pts.length) return null; const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); const x = Math.max(0, Math.min(...xs)), y = Math.max(0, Math.min(...ys)), x2 = Math.min(innerWidth, Math.max(...xs)), y2 = Math.min(innerHeight, Math.max(...ys)); if (x2 <= x || y2 <= y) return null; return { x, y, w: x2 - x, h: y2 - y }; }
function objRect(o) { const { THREE } = X(), b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return null; const c = []; for (let i = 0; i < 8; i++) c.push(project(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z))); return rectOfPts(c); }
/* the world point on a mesh for a texture coordinate (works for flat and curved screens) */
function uvToWorld(mesh, u, v) { const { THREE } = X(), g = mesh.geometry; if (!g || !g.attributes || !g.attributes.uv) return null; const pos = g.attributes.position, uv = g.attributes.uv, idx = g.index, n = idx ? idx.count : pos.count;
  const A = new THREE.Vector2(), B = new THREE.Vector2(), C = new THREE.Vector2(), P = new THREE.Vector2(u, v);
  for (let i = 0; i + 2 < n; i += 3) { const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2; A.fromBufferAttribute(uv, a); B.fromBufferAttribute(uv, b); C.fromBufferAttribute(uv, c);
    const v0x = B.x - A.x, v0y = B.y - A.y, v1x = C.x - A.x, v1y = C.y - A.y, v2x = P.x - A.x, v2y = P.y - A.y, den = v0x * v1y - v1x * v0y; if (Math.abs(den) < 1e-12) continue;
    const l1 = (v2x * v1y - v1x * v2y) / den, l2 = (v0x * v2y - v2x * v0y) / den, l0 = 1 - l1 - l2; if (l0 < -1e-4 || l1 < -1e-4 || l2 < -1e-4) continue;
    const pa = new THREE.Vector3().fromBufferAttribute(pos, a), pb = new THREE.Vector3().fromBufferAttribute(pos, b), pc = new THREE.Vector3().fromBufferAttribute(pos, c);
    return pa.multiplyScalar(l0).add(pb.multiplyScalar(l1)).add(pc.multiplyScalar(l2)).applyMatrix4(mesh.matrixWorld); } return null; }
function keyRect(mesh, sf, b) { const W = sf.c.width, H = sf.c.height, U = px => sf.flip ? 1 - px / W : px / W, V = py => 1 - py / H, pts = [];
  [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h], [b.x + b.w / 2, b.y + b.h / 2]].forEach(([px, py]) => { const w = uvToWorld(mesh, U(px), V(py)); pts.push(w && project(w)); }); return rectOfPts(pts); }
function meshOfSurf(id) { const M = window.__hxSurf; if (!M) return null; for (const [m, sf] of M) if (sf.__dnaId === id) return [m, sf]; return null; }

/* ---- picking ---- */
function decorHit(x, y) { const { THREE, camera, renderer } = X(), G = window.DNA_DECOR_G; if (!G) return null; const r = renderer.domElement.getBoundingClientRect(), ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1), camera); const objs = [G]; if (window.__hxHolo && window.__hxHolo.visible) objs.push(window.__hxHolo);
  const h = ray.intersectObjects(objs, true).find(i => { let o = i.object; while (o && !(o.userData && o.userData.dnaDecor)) o = o.parent; if (!o || !o.visible) return false; i.root = o; let p = i.object; while (p) { if (!p.visible) return false; p = p.parent; } return true; }); return h || null; }
function pick(x, y) {
  if (!X() || !window.__hxHit) return null; let h = null; try { h = window.__hxHit(x, y); } catch (e) {} const dh = decorHit(x, y);
  if (dh && (!h || dh.distance < h.distance)) { const id = dh.root.userData.dnaDecor, it = window.DNA_DECOR_ITEMS[id]; return { id: "d|" + id, name: it ? it[1] : id, rect: objRect(dh.root) }; }
  if (!h) return null; const o = h.object, sf = window.__hxSurf && window.__hxSurf.get(o);
  if (sf && sf.__dnaId) { if (sf.btns && sf.btns.length && h.uv) { const px = (sf.flip ? 1 - h.uv.x : h.uv.x) * sf.c.width, py = (1 - h.uv.y) * sf.c.height;
      const b = sf.btns.find(b => b.kid && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h); if (b) return { id: "k|" + b.kid, name: (b.row ? "Row · " : "Key · ") + (b.label || b.kid), rect: keyRect(o, sf, b) }; }
    return { id: "s|" + sf.__dnaId, name: surfName(sf.__dnaId), rect: objRect(o) }; }
  const u = o.userData || {}; if (u.dnaSym) return { id: "s|tile:" + u.dnaSym, name: "Ring tile " + u.dnaSym, rect: objRect(o), noEdit: true };
  return { id: "o|" + (u.id || o.uuid), name: "Room · " + (u.id || o.type), rect: objRect(o), noEdit: true };
}
function rectOf(id) { try { if (id.startsWith("d|")) { const it = window.DNA_DECOR_ITEMS && window.DNA_DECOR_ITEMS[id.slice(2)]; return it ? objRect(it[0]) : null; }
    if (id.startsWith("s|")) { const ms = meshOfSurf(id.slice(2)); return ms ? objRect(ms[0]) : null; }
    if (id.startsWith("k|")) { const kid = id.slice(2), sid = kid.split(":").slice(0, 2).join(":"), ms = meshOfSurf(sid); if (!ms) return null; const b = (ms[1].btns || []).find(b => b.kid === kid); return b ? keyRect(ms[0], ms[1], b) : objRect(ms[0]); } } catch (e) {} return null; }

/* ---- screens: hide / resize ---- */
let base = new WeakMap();
function applySurfaces() { const M = window.__hxSurf; if (!M || !OVR()) return; for (const [m, sf] of M) { if (!sf.__dnaId) continue; const ov = OVR().get("s|" + sf.__dnaId), tgt = sf.group || m;
    if (!base.has(tgt)) base.set(tgt, tgt.scale.clone()); const hidden = !!ov.hide; tgt.visible = !hidden || document.body.classList.contains("x-dev"); if (m.material) { m.material.opacity = hidden ? .25 : (m.material.userData.op0 != null ? m.material.userData.op0 : (m.material.userData.op0 = m.material.opacity)); }
    if (hidden) sf.btns = []; tgt.scale.copy(base.get(tgt)).multiplyScalar((ov.scale || 100) / 100); } }
setInterval(applySurfaces, 700);

/* ---- the Dev mode panel for a 3D selection ---- */
function panel(s) {
  const id = s.id, ov = (OVR() && OVR().get(id)) || {}, head = `<div class="selh"><b>3D · ${esc(s.name)}</b><code>${esc(id)}</code></div>`;
  if (s.noEdit || !OVR()) return head + `<p class="hint">This part of the room follows the screen it belongs to. Pick a key, a screen or a room piece to edit it.</p>`;
  const hideB = `<button type="button" data-d3b="hide">${ov.hide ? "Show it again" : "Hide it"}</button>`, reset = `<button type="button" data-d3b="reset">Reset</button>`;
  const rng = (f, l, min, max, v, unit) => `<label class="row">${l} <input type="range" min="${min}" max="${max}" step="1" data-d3f="${f}" value="${v}"><output>${v}${unit}</output></label>`;
  if (id.startsWith("k|")) { const row = /^Row/.test(s.name), acts = actOptions(ov.act);
    return head + `<p class="hint">${row ? "A row on a screen: give it a new job or hide it." : "One key on this screen. Changes save right away; Reset brings back the original."}</p>
      ${row ? "" : `<label class="row">Label <input type="text" maxlength="30" data-d3f="label" value="${esc(ov.label != null ? ov.label : "")}" placeholder="(keep its own)"></label>
      <label class="row">Small text <input type="text" maxlength="40" data-d3f="sub" value="${esc(ov.sub != null ? ov.sub : "")}" placeholder="(keep its own)"></label>
      <div class="row">Color <input type="color" data-d3f="col" value="${esc(ov.col || "#7fe3ff")}">${SW.map(c => `<button type="button" data-d3sw="${c}" title="${c}" style="width:22px;height:22px;min-height:22px;padding:0;border-radius:6px;background:${c}"></button>`).join("")}</div>
      ${rng("size", "Size", 60, 120, ov.size || 100, "%")}`}
      <label class="row">Job <select data-d3f="act">${acts}</select></label><div class="row">${hideB}${reset}</div>`; }
  if (id.startsWith("s|")) return head + `<p class="hint">A whole screen. To move it, close Dev mode, then hold the screen and drag (pinch to resize), or use ✎ Edit desk to swap two screens.</p>
      ${rng("scale", "Size", 50, 150, ov.scale || 100, "%")}<div class="row">${hideB}${reset}<button type="button" data-d3b="editdesk">✎ Edit desk</button></div>`;
  return head + `<p class="hint">A room piece.</p>${rng("scale", "Size", 30, 200, ov.scale || 100, "%")}${rng("rot", "Turn", -180, 180, ov.rot || 0, "°")}<div class="row">${hideB}${reset}</div>`;
}
function actOptions(cur) { const dna = (window.DNA && DNA.acts && DNA.acts()) || [], dev = (window.XDEV_ACTS && XDEV_ACTS()) || [];
  const o = (k, l) => `<option value="${esc(k)}" ${k === (cur || "") ? "selected" : ""}>${esc(l)}</option>`;
  return o("", "(keep its own job)") + `<optgroup label="16th DNA">${dna.map(([k, l]) => o(k, l)).join("")}</optgroup>` + (dev.length ? `<optgroup label="Dev mode (your panels and pop-ups)">${dev.filter(([k]) => k).map(([k, l]) => o(k, l)).join("")}</optgroup>` : ""); }
function cur() { return window.XDEV_SEL && XDEV_SEL(); }
const rerender = () => { try { window.XDEV_RENDER && XDEV_RENDER(); } catch (e) {} };
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-d3b],[data-d3sw],[data-d3sel]"); if (!b || !OVR()) return; const s = cur();
  if (b.dataset.d3sel) { const id = b.dataset.d3sel, nm = b.dataset.d3name || id; window.XDEV_SELECT && XDEV_SELECT({ kind: "3d", id, name: nm, rect: rectOf(id) }); return; }
  if (!s || s.kind !== "3d") return;
  if (b.dataset.d3sw) { OVR().set(s.id, { col: b.dataset.d3sw }); rerender(); return; }
  const a = b.dataset.d3b; if (a === "hide") { OVR().set(s.id, { hide: !(OVR().get(s.id).hide) }); applySurfaces(); window.DNA_DECOR_APPLY && DNA_DECOR_APPLY(); rerender(); }
  else if (a === "reset") { OVR().reset(s.id); applySurfaces(); window.DNA_DECOR_APPLY && DNA_DECOR_APPLY(); rerender(); }
  else if (a === "editdesk") { window.DNA_MODES && DNA_MODES.editDesk(); } }, true);
const onField = e => { const f = e.target.closest && e.target.closest("[data-d3f]"); if (!f || !OVR()) return; const s = cur(); if (!s || s.kind !== "3d") return; const k = f.dataset.d3f; let v = f.value;
  if (f.type === "range") { v = +v; const out = f.parentElement.querySelector("output"); if (out) out.textContent = v + (k === "rot" ? "°" : "%"); }
  OVR().set(s.id, { [k]: v }); applySurfaces(); window.DNA_DECOR_APPLY && DNA_DECOR_APPLY(); };
document.addEventListener("input", e => { const f = e.target.closest && e.target.closest("[data-d3f]"); if (f && (f.type === "range" || f.type === "color")) onField(e); }, true);
document.addEventListener("change", onField, true);

/* Layers tab: every screen, key and room piece, so hidden ones can be found again */
function layers() { if (!window.__hxSurf || !OVR()) return "<small class='hint'>The 3D room is still loading.</small>"; let h = ""; const all = OVR().all(), seen = new Set();
  const row = (id, nm, d) => { const ov = all[id] || {}; return `<div class="ly" style="--d:${d}"><span class="tw"></span><button type="button" class="nm" data-d3sel="${esc(id)}" data-d3name="${esc(nm)}">${esc(nm)}${ov.hide ? " · hidden" : Object.keys(ov).length ? " · edited" : ""}</button></div>`; };
  for (const [, sf] of window.__hxSurf) { if (!sf.__dnaId || seen.has(sf.__dnaId) || /^tile:|^station:/.test(sf.__dnaId)) continue; seen.add(sf.__dnaId); h += row("s|" + sf.__dnaId, surfName(sf.__dnaId), 0);
    (sf.btns || []).filter(b => b.kid && !b.row).forEach(b => { h += row("k|" + b.kid, "Key · " + (b.label || b.kid), 1); }); }
  Object.entries(window.DNA_DECOR_ITEMS || {}).forEach(([id, it]) => { h += row("d|" + id, it[1], 0); });
  return h + `<div class="row"><button type="button" data-d3b="resetall">Reset every 3D change</button></div>`; }
document.addEventListener("click", async e => { const b = e.target.closest && e.target.closest('[data-d3b="resetall"]'); if (!b || !OVR()) return; if (!(await window.xviConfirm("Reset every change to the 3D keys, screens and room pieces?", "Reset all"))) return; OVR().resetAll(); applySurfaces(); window.DNA_DECOR_APPLY && DNA_DECOR_APPLY(); rerender(); }, true);

function erase(h) { if (!h || h.noEdit || !OVR()) return; OVR().set(h.id, { hide: true }); applySurfaces(); window.DNA_DECOR_APPLY && DNA_DECOR_APPLY(); try { window.toast && toast("Hid " + h.name + ". Find it again under Layers → 3D room."); } catch (e) {} }

window.XDEV_3D = { panel, layers, rect: rectOf, erase, pick };
const hook = () => { if (!window.xvi6) return setTimeout(hook, 200); xvi6.pick3d = pick; xvi6.rotY = xvi6.rotY || (() => {}); };
hook();
})();
