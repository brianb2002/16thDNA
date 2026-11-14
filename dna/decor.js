/* ================= 16th DNA desk: Bull & Bear room decor (three.js, added to the Holodex scene) =================
   LIVE world-session clocks, a news band around the room, the holographic bull and bear on pedestals, a spinning
   Bitcoin, and server walls on the sides and behind the chair. Needs window.__HX3 = {renderer, scene, camera, THREE}. */
(() => {
"use strict";
const BULL = "/*BULL*/", BEAR = "/*BEAR*/";
function start() {
  const X = window.__HX3; if (!X) return setTimeout(start, 300);
  const { scene, THREE } = X, PI = Math.PI, D2R = PI / 180, G = new THREE.Group(); G.name = "dna-decor"; scene.add(G);
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const texOf = c => { const t = new THREE.CanvasTexture(c); if ("encoding" in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
  const front = (deg, r, y) => new THREE.Vector3(Math.sin(deg * D2R) * r, y, -Math.cos(deg * D2R) * r);   /* deg 0 = straight ahead of the chair */
  const add = (THREE.AdditiveBlending);
  const glowMat = col => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .9, blending: add, depthWrite: false });

  /* ---- LIVE session clocks ---- */
  const CITIES = [["NEW YORK", "America/New_York", 9.5, 16, -66], ["LONDON", "Europe/London", 8, 16.5, -40], ["TOKYO", "Asia/Tokyo", 9, 15, 40], ["SYDNEY", "Australia/Sydney", 10, 16, 66]];
  const clocks = CITIES.map(([name, tz, o, c, deg]) => { const cv = mk(320, 380), t = texOf(cv), m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.37), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: add }));
    m.position.copy(front(deg, 5.3, 6.25)); m.lookAt(0, 1.9, .15); m.renderOrder = 30; G.add(m); return { name, tz, o, c, cv, t, m }; });
  function drawClock(k) { const g = k.cv.getContext("2d"), W = 320, now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: k.tz, hour: "numeric", minute: "numeric", second: "numeric", weekday: "short", hour12: false }).formatToParts(now).map(p => [p.type, p.value]));
    const h = +parts.hour % 24, mi = +parts.minute, s = +parts.second, hr = h + mi / 60, open = !/Sat|Sun/.test(parts.weekday) && hr >= k.o && hr < k.c;
    g.clearRect(0, 0, W, 380); const cx = 160, cy = 140, R = 118;
    g.strokeStyle = "rgba(127,227,255,.95)"; g.shadowColor = "#4fc8ff"; g.shadowBlur = 18; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    g.fillStyle = "rgba(10,40,90,.35)"; g.fill(); g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.beginPath(); g.moveTo(cx + Math.sin(a) * R * .82, cy - Math.cos(a) * R * .82); g.lineTo(cx + Math.sin(a) * R * .94, cy - Math.cos(a) * R * .94); g.stroke(); }
    const hand = (a, len, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); g.stroke(); };
    hand((hr % 12) / 12 * 2 * PI, R * .5, 9, "#eaf8ff"); hand(mi / 60 * 2 * PI, R * .75, 6, "#bff3ff"); hand(s / 60 * 2 * PI, R * .85, 2.5, "#ffcf5a");
    g.shadowBlur = 12; g.fillStyle = "#eaf8ff"; g.textAlign = "center"; g.font = "800 34px Orbitron, Rajdhani, sans-serif"; g.fillText(k.name, cx, 300);
    g.font = "700 26px 'Share Tech Mono', monospace"; g.fillStyle = "#bff3ff"; g.fillText(String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0"), cx - 52, 344);
    g.fillStyle = open ? "rgba(46,230,168,.25)" : "rgba(255,193,77,.18)"; g.strokeStyle = open ? "#2ee6a8" : "#ffc14d"; g.lineWidth = 3; g.beginPath(); g.roundRect ? g.roundRect(186, 318, 118, 38, 10) : g.rect(186, 318, 118, 38); g.fill(); g.stroke();
    g.fillStyle = open ? "#2ee6a8" : "#ffc14d"; g.font = "800 22px Orbitron, sans-serif"; g.fillText(open ? "LIVE" : "CLOSED", 245, 345); g.shadowBlur = 0; k.t.needsUpdate = true; }

  /* ---- news band all the way around, just above the wall screens ---- */
  const NW = 4096, ncv = mk(NW, 64), ntex = texOf(ncv); ntex.wrapS = THREE.RepeatWrapping; ntex.repeat.x = -1;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, .3, 128, 1, true), new THREE.MeshBasicMaterial({ map: ntex, transparent: true, side: THREE.BackSide, depthWrite: false, blending: add }));
  band.position.set(0, 5.5, 0); band.renderOrder = 29; G.add(band);
  function drawNews() { const g = ncv.getContext("2d"), N = window.DNA; g.clearRect(0, 0, NW, 64); const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "rgba(20,80,170,.55)"); gr.addColorStop(1, "rgba(5,25,70,.35)"); g.fillStyle = gr; g.fillRect(0, 8, NW, 48);
    g.fillStyle = "rgba(127,227,255,.9)"; g.fillRect(0, 8, NW, 2); g.fillRect(0, 54, NW, 2);
    const items = ["MARKET NEWS ▸"]; if (N) { const fmt = v => v == null || !isFinite(v) ? "—" : (+v).toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 2 : 4 });
      Object.keys(N.prods || {}).forEach(s => { const p = N.prods[s]; items.push(s + " " + fmt(p.p) + " " + ((p.ch >= 0 ? "+" : "") + (p.ch || 0).toFixed(2)) + "%"); });
      const co = N.coach && N.coach(); if (co) items.push("COACH: " + co.sig + " on " + N.sym + " · " + co.why);
      CITIES.forEach(k => items.push(k[0] + " SESSION " + (sessionOpen(k) ? "OPEN" : "CLOSED"))); }
    let x = 10; g.font = "700 30px 'Share Tech Mono', monospace"; g.textBaseline = "middle"; g.shadowColor = "#4fc8ff"; g.shadowBlur = 10;
    while (x < NW) for (const s of items) { g.fillStyle = s.startsWith("MARKET") ? "#7fe3ff" : /-\d/.test(s) ? "#ff7a90" : /CLOSED/.test(s) ? "#ffc14d" : "#eaf8ff"; g.fillText(s + "   |   ", x, 33); x += g.measureText(s + "   |   ").width; if (x > NW) break; }
    g.shadowBlur = 0; ntex.needsUpdate = true; }
  const sessionOpen = k => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: k[1], hour: "numeric", minute: "numeric", weekday: "short", hour12: false }).formatToParts(new Date()).map(q => [q.type, q.value])); const hr = (+p.hour % 24) + (+p.minute) / 60; return !/Sat|Sun/.test(p.weekday) && hr >= k[2] && hr < k[3]; };

  /* ---- spinning Bitcoin ---- */
  const ccv = mk(512, 512), cg = ccv.getContext("2d"); { const g = cg, r = 240; const gr = g.createRadialGradient(256, 210, 30, 256, 256, r); gr.addColorStop(0, "#fff1b0"); gr.addColorStop(.55, "#ffbf3a"); gr.addColorStop(1, "#b86d00");
    g.fillStyle = gr; g.beginPath(); g.arc(256, 256, r, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = "#ffe28a"; g.stroke(); g.lineWidth = 4; g.strokeStyle = "#a35d00"; g.beginPath(); g.arc(256, 256, r - 30, 0, 7); g.stroke();
    g.fillStyle = "#fff6d0"; g.font = "900 300px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#a35d00"; g.shadowBlur = 16; g.fillText("₿", 256, 270); }
  const coinT = texOf(ccv), coin = new THREE.Group(); coin.position.copy(front(0, 5.2, 6.75)); coin.scale.setScalar(1.6); G.add(coin);
  const face = new THREE.MeshBasicMaterial({ map: coinT }), edge = new THREE.MeshBasicMaterial({ color: 0xd99a20 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .06, 64), [edge, face, face]); disc.rotation.x = PI / 2; coin.add(disc);
  [0, 1].forEach(i => { const o = new THREE.Mesh(new THREE.TorusGeometry(.62 + i * .14, .008, 8, 96), glowMat(i ? 0x4fc8ff : 0xffc14d)); o.rotation.set(PI / 2 + (i ? .35 : -.3), 0, i ? .4 : -.2); coin.add(o); });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = mk(128, 128), g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,200,80,.7)"); gr.addColorStop(1, "rgba(255,200,80,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return texOf(c); })(), blending: add, depthWrite: false, transparent: true }));
  halo.scale.set(2.2, 2.2, 1); coin.add(halo);

  /* ---- bull and bear holograms on pedestals, either side of the desk ---- */
  const ld = new THREE.TextureLoader();
  function beast(src, deg, w, h, flip) { const grp = new THREE.Group(); grp.position.copy(front(deg, 3.05, .25)); G.add(grp);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.5, .56, .1, 48), new THREE.MeshStandardMaterial({ color: 0x0a1a3c, metalness: .6, roughness: .35, emissive: 0x06173a }));
    ped.position.y = .55; grp.add(ped); [0, 1].forEach(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(.54 - i * .16, .01, 8, 96), glowMat(i ? 0x4fc8ff : 0xffb43a)); r.rotation.x = PI / 2; r.position.y = .64 + i * .002; grp.add(r); });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.08, .14, 1.3, 16), new THREE.MeshStandardMaterial({ color: 0x0a1a3c, metalness: .7, roughness: .3 })); col.position.y = -.1; grp.add(col);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.48, .54, h * .9, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x2f9bff, transparent: true, opacity: .07, blending: add, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = .64 + h * .45; grp.add(beam);
    const t = ld.load(src); if ("encoding" in t) t.encoding = THREE.sRGBEncoding;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: add, depthWrite: false, side: THREE.DoubleSide }));
    if (flip) m.scale.x = -1; m.position.y = .66 + h / 2; m.renderOrder = 31; grp.add(m); grp.lookAt(0, 0, .15); grp.rotation.y += 0; return { grp, m, y0: m.position.y }; }
  const bull = beast(BULL, -84, 1.15, .95, false), bear = beast(BEAR, 84, 1.15, .9, false);

  /* ---- server walls on the sides and behind the chair ---- */
  const scv = mk(128, 512), stex = texOf(scv); stex.wrapT = THREE.RepeatWrapping;
  (function paintRack() { const g = scv.getContext("2d"); g.fillStyle = "#020814"; g.fillRect(0, 0, 128, 512); for (let u = 0; u < 32; u++) { const y = u * 16; g.fillStyle = "#06132c"; g.fillRect(6, y + 2, 116, 12); g.fillStyle = "#0b2350"; g.fillRect(6, y + 2, 116, 2);
      for (let l = 0; l < 10; l++) { const r = (u * 7 + l * 13) % 11; g.fillStyle = r < 3 ? "#2a7fc0" : r < 4 ? "#5fb8e0" : r < 5 ? "#1f9e78" : r < 6 ? "#b8902f" : "#0a2048"; g.fillRect(14 + l * 10, y + 7, 5, 3); } } stex.needsUpdate = true; })();
  const rackM = new THREE.MeshBasicMaterial({ map: stex }), rackSide = new THREE.MeshStandardMaterial({ color: 0x050d1f, metalness: .7, roughness: .4 });
  const rackGeo = new THREE.BoxGeometry(.78, 3.6, .7), trim = glowMat(0x2f9bff);
  const racks = new THREE.Group(); G.add(racks);
  for (let deg = 104; deg <= 256; deg += 9.5) { const r = 5.0, p = front(deg, r, 1.8), b = new THREE.Mesh(rackGeo, [rackSide, rackSide, rackSide, rackSide, rackM, rackSide]); b.position.copy(p); b.lookAt(0, 1.8, 0); racks.add(b);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(.8, .025, .02), trim); tr.position.copy(front(deg, r - .36, 3.62)); tr.lookAt(0, 3.62, 0); racks.add(tr); }
  const floorRing = new THREE.Mesh(new THREE.TorusGeometry(4.6, .02, 8, 160, PI * .85), glowMat(0x2f9bff)); floorRing.rotation.x = PI / 2; floorRing.rotation.z = PI * .575; floorRing.position.y = .02; G.add(floorRing);

  /* show / hide pieces (Settings → Room) */
  const holo = window.__hxHolo || null;
  const PARTS = { beasts: [bull.grp, bear.grp], clocks: clocks.map(k => k.m), news: [band], coin: [coin], racks: [racks], stations: holo ? [holo] : [] };
  const DEF = { beasts: true, clocks: true, news: true, coin: true, racks: true, stations: false };
  const vis = (() => { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem("dna_decor") || "{}")); } catch (e) { return Object.assign({}, DEF); } })();
  /* pieces Dev mode can pick one by one */
  const ITEMS = { bull: [bull.grp, "Bull hologram", "beasts"], bear: [bear.grp, "Bear hologram", "beasts"], coin: [coin, "Spinning Bitcoin", "coin"], news: [band, "News band", "news"], racks: [racks, "Server walls", "racks"] };
  clocks.forEach((k, i) => ITEMS["clock" + i] = [k.m, k.name + " clock", "clocks"]);
  if (holo) ITEMS.stations = [holo, "Strategy holograms (overhead)", "stations"];
  Object.entries(ITEMS).forEach(([id, [o]]) => { o.userData.dnaDecor = id; o.userData.s0 = o.scale.clone(); o.userData.r0 = o.rotation.y; });
  const apply = () => Object.entries(ITEMS).forEach(([id, [o, , part]]) => { const ov = (window.DNA_OVR && DNA_OVR.get("d|" + id)) || {}; o.visible = vis[part] !== false && !ov.hide;
    const s = (ov.scale || 100) / 100; o.scale.copy(o.userData.s0).multiplyScalar(s); o.rotation.y = o.userData.r0 + (ov.rot || 0) * D2R; });
  window.DNA_DECOR_G = G; window.DNA_DECOR_ITEMS = ITEMS; window.DNA_DECOR_APPLY = apply;
  window.DNA_DECOR = { get: k => vis[k] !== false, set: (k, on) => { vis[k] = !!on; try { localStorage.setItem("dna_decor", JSON.stringify(vis)); } catch (e) {} apply(); } }; apply();
  /* ---- animate ---- */
  let lastSec = -1, lastNews = 0;
  window.DNA_FRAME = (now, dt) => { const t = now / 1000;
    coin.rotation.y = t * .9; halo.material.rotation = 0;
    bull.m.position.y = bull.y0 + Math.sin(t * 1.3) * .03; bear.m.position.y = bear.y0 + Math.sin(t * 1.3 + 1.7) * .03;
    bull.m.material.opacity = .82 + Math.sin(t * 7) * .04; bear.m.material.opacity = .82 + Math.sin(t * 7 + 1) * .04;
    ntex.offset.x = -(t * .012) % 1; stex.offset.y = Math.floor(t * 3) * (1 / 32) % 1;
    const s = Math.floor(Date.now() / 1000); if (s !== lastSec) { lastSec = s; clocks.forEach(drawClock); }
    if (now - lastNews > 10000) { lastNews = now; drawNews(); }
    if ((++fr & 31) === 0) apply(); };
  let fr = 0;
  clocks.forEach(drawClock); drawNews();
}
start();
})();
