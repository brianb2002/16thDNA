/* ================= XVI DNA skin v3: live desk screens, data status, Connect AI / Connect Broker ================= */
(() => {
const V = window.xvi, body = document.body, RM = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const q = (s, r) => (r || document).querySelector(s), qa = (s, r) => [...(r || document).querySelectorAll(s)];
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const stage = $("xStage"), home = $("xHome"); if (!stage || !home) return;
const fmtP = v => !isFinite(v) ? "—" : v >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : v >= 1 ? v.toFixed(v >= 100 ? 2 : 3) : v.toPrecision(4);
const onHome = () => body.classList.contains("x-home") && !document.hidden;

/* ---------- live data status: helpful message when the browser blocks market data ---------- */
const net = h("div", "", ""); net.id = "xNet"; net.setAttribute("role", "status"); body.append(net);
let simSeen = false;
function showNet(d) { if (d && d.sim && !UNI.host) { if (simSeen) return; simSeen = true; net.innerHTML = `<b>Showing demo market data</b><span>Live Coinbase data couldn't be reached from this page, so charts use a simulated market and orders stay in practice.</span><button class="btn" data-n="retry">Retry live</button><button class="x" data-n="x" aria-label="Dismiss">×</button>`; net.classList.add("show"); return; }
  if (!d || d.ok !== false) { net.classList.remove("show"); return; }
  const file = location.protocol === "file:";
  net.innerHTML = `<b>Live charts can't load</b><span>${esc(d.err || "")}</span>${file ? `<code>start.bat</code> <i>or</i> <code>./start.sh</code>` : ""}<button class="btn" data-n="retry">Retry</button><button class="x" data-n="x" aria-label="Dismiss">×</button>`;
  net.classList.add("show"); }
window.addEventListener("xvi-net", e => showNet(e.detail));
net.addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (!b) return; net.classList.remove("show"); if (b.dataset.n === "retry") { if (UNI.NET.sim) { simSeen = false; UNI.retryLive(); } try { selectInst(S.inst); } catch (er) {} try { loadLists(); } catch (er) {} } });
if (UNI.NET && UNI.NET.ok === false) showNet(UNI.NET);

/* ---------- desk mini-screens: real candles, redrawn live ---------- */
const MINI = [ // stage % boxes over the screens drawn into the desk art
  { id: "xmA", l: 41.1, t: 37.7, w: 15.0, h: 13.2, main: true, tag: "Broker A" },
  { id: "xmB", l: 33.5, t: 40.0, w: 6.5, h: 9.4, tag: "Broker B" },
  { id: "xmC", l: 56.8, t: 40.0, w: 6.4, h: 9.0, tag: "Broker C" },
  { id: "xmD", l: 42.2, t: 68.0, w: 14.4, h: 7.8, main: true, desk: true, tag: "Desk" }];
const ALT = { data: {}, busy: false, t: 0 };
const altIds = () => { const cur = S.inst && S.inst.dataId; return ["ETH-USD", "SOL-USD", "BTC-USD", "XRP-USD"].filter(x => x !== cur).slice(0, 2); };
MINI.forEach(m => { const el = h(m.desk ? "div" : "button", "xmini" + (m.desk ? " desk" : ""), `<canvas></canvas><div class="mh"><b></b><em></em></div><i class="live">LIVE</i>`);
  el.id = m.id; el.style.cssText = `left:${m.l}%;top:${m.t}%;width:${m.w}%;height:${m.h}%`; if (!m.desk) el.setAttribute("aria-label", "Open live chart"); stage.append(el); m.el = el; m.cv = q("canvas", el); });
qa(".xmini:not(.desk)", stage).forEach((el, i) => el.addEventListener("click", ev => { ev.stopPropagation(); const m = MINI.find(x => x.el === el); if (!m) return;
  el.classList.add("pressed"); setTimeout(() => el.classList.remove("pressed"), 240);
  if (!m.main && m.sym) { const inst = (S.lists.crypto || []).find(x => x.dataId === m.sym); if (inst) { try { selectInst(inst); } catch (e) {} } }
  setTimeout(() => showView("spot"), RM() ? 0 : 200); }));
function draw(m, bars, sym) { const cv = m.cv, r = m.el.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), W = Math.max(40, Math.round(r.width)), H = Math.max(30, Math.round(r.height));
  if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const b = (bars || []).slice(-(m.desk ? 90 : m.main ? 70 : 40)); const hb = q(".mh b", m.el), em = q(".mh em", m.el);
  hb.textContent = sym || "—"; if (b.length < 2) { em.textContent = "loading…"; em.className = ""; m.el.classList.remove("ok"); return; }
  const last = b[b.length - 1].c, first = b[0].o, ch = (last - first) / first * 100; em.textContent = fmtP(last) + "  " + (ch >= 0 ? "+" : "") + ch.toFixed(2) + "%"; em.className = ch >= 0 ? "up" : "dn"; m.el.classList.add("ok");
  let hi = -Infinity, lo = Infinity, vmax = 0; b.forEach(x => { hi = Math.max(hi, x.h); lo = Math.min(lo, x.l); vmax = Math.max(vmax, x.v || 0); }); if (hi === lo) { hi += 1; lo -= 1; }
  const top = m.desk ? 6 : Math.max(16, H * 0.2), bot = H - (m.desk ? 4 : 4), Y = v => top + (hi - v) / (hi - lo) * (bot - top - (m.desk ? H * 0.25 : 0)), bw = W / b.length;
  if (m.desk && vmax) { g.fillStyle = "rgba(90,190,255,.35)"; b.forEach((x, i) => { const vh = (x.v / vmax) * H * 0.25; g.fillRect(i * bw + bw * 0.15, H - vh, Math.max(1, bw * 0.7), vh); }); }
  if (m.main && !m.desk && bw >= 3) { b.forEach((x, i) => { const up = x.c >= x.o, cx = i * bw + bw / 2; g.strokeStyle = g.fillStyle = up ? "#3ef0a5" : "#ff5d7a"; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, Y(x.h)); g.lineTo(cx, Y(x.l)); g.stroke(); const y1 = Y(Math.max(x.o, x.c)), y2 = Y(Math.min(x.o, x.c)); g.fillRect(cx - bw * 0.32, y1, Math.max(1, bw * 0.64), Math.max(1, y2 - y1)); }); }
  else { const grd = g.createLinearGradient(0, top, 0, bot); grd.addColorStop(0, ch >= 0 ? "rgba(62,240,165,.45)" : "rgba(255,93,122,.45)"); grd.addColorStop(1, "rgba(40,120,255,0)");
    g.beginPath(); b.forEach((x, i) => { const px = i * bw + bw / 2, py = Y(x.c); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.strokeStyle = ch >= 0 ? "#3ef0a5" : "#ff5d7a"; g.lineWidth = 1.6; g.shadowColor = g.strokeStyle; g.shadowBlur = 6; g.stroke(); g.shadowBlur = 0;
    g.lineTo(W - bw / 2, bot); g.lineTo(bw / 2, bot); g.closePath(); g.fillStyle = grd; g.fill(); }
  const ly = Y(last); g.setLineDash([3, 3]); g.strokeStyle = "rgba(170,225,255,.6)"; g.beginPath(); g.moveTo(0, ly); g.lineTo(W, ly); g.stroke(); g.setLineDash([]);
  if (!RM()) { const px = W - bw / 2; g.fillStyle = "#fff"; g.shadowColor = "#7fd0ff"; g.shadowBlur = 10; g.beginPath(); g.arc(px, ly, 2.4, 0, 6.3); g.fill(); g.shadowBlur = 0; } }
const parseC = p => ((p && p.candles) || []).map(x => ({ t: +x.start, o: +x.open, h: +x.high, l: +x.low, c: +x.close, v: +x.volume })).filter(x => isFinite(x.c)).sort((a, b) => a.t - b.t);
async function pullAlt() { if (ALT.busy || !S.mcp) return; ALT.busy = true; ALT.t = Date.now();
  try { await Promise.all(altIds().map(id => call(CB, "coinbase_products_candles", { product_id: id, product_type: "SPOT", granularity: "FIVE_MINUTE", limit: 60 }, { cache: false }).then(p => { ALT.data[id] = parseC(p); }).catch(() => {}))); } catch (e) {}
  ALT.busy = false; paintAll(); }
function paintAll() { if (!onHome()) return; const ids = altIds(), sym = S.inst ? (S.inst.kind === "spot" ? S.inst.dataId : S.inst.label) : "—";
  MINI.forEach(m => { if (m.main) draw(m, S.bars, sym); else { const id = m.id === "xmB" ? ids[0] : ids[1]; m.sym = id; draw(m, ALT.data[id], id); } }); }
setInterval(() => { if (!onHome()) return; paintAll(); if (Date.now() - ALT.t > 20000) pullAlt(); }, 2000);
const _sv4 = showView; showView = function (v) { _sv4(v); if (v === "home") setTimeout(() => { paintAll(); if (Date.now() - ALT.t > 20000) pullAlt(); }, 120); };
window.addEventListener("resize", () => setTimeout(paintAll, 60));
setTimeout(() => { paintAll(); pullAlt(); }, 1500);

/* ---------- Connect AI / Connect Broker: hologram panels over the app's Connections (UNI) logic ---------- */
const IAI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 7V4M9 2.8h6M9 12h.01M15 12h.01M9.5 15h5M2.5 11v3M21.5 11v3"/></svg>';
const IBR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 15l6-6"/><path d="M11 6l1.5-1.5a4.2 4.2 0 016 6L17 12"/><path d="M13 18l-1.5 1.5a4.2 4.2 0 01-6-6L7 12"/></svg>';
const ST = { aiTest: (() => { try { return JSON.parse(localStorage.getItem("xvi_ai_test") || "null"); } catch (e) { return null; } })() };
const aiSig = () => { const a = UNI.cfg.ai; return [a.provider, a.model, a.base, (a.key || "").slice(-4)].join("|"); };
const aiState = () => !UNI.aiReady() ? "off" : UNI.PRESETS[UNI.cfg.ai.provider].builtin ? (ST.aiTest && ST.aiTest.sig === aiSig() && !ST.aiTest.ok ? "err" : "on") : ST.aiTest && ST.aiTest.sig === aiSig() ? (ST.aiTest.ok ? "on" : "err") : "set";
const brState = () => { if (UNI.hostLive(UNI.CBN)) return "on"; const s = UNI.cfg.servers || []; if (!s.length) return "off"; return s.some(x => x.err) ? "err" : s.some(x => x.ok) ? "on" : "set"; };
const LBL = { on: "Connected", set: "Saved · not tested", err: "Needs attention", off: "Not connected" };
const dock = h("div", "", ""); dock.id = "xConn";
dock.innerHTML = `<button class="xcbtn" id="xConnAI" data-cn="ai"><span class="ic">${IAI}</span><span class="tx"><b>Connect AI</b><small></small></span><i class="dot"></i></button>
<button class="xcbtn" id="xConnBr" data-cn="broker"><span class="ic">${IBR}</span><span class="tx"><b>Connect Broker</b><small></small></span><i class="dot"></i></button>`;
body.append(dock);
function syncDock() { [["xConnAI", aiState()], ["xConnBr", brState()]].forEach(([id, s]) => { const b = $(id); if (!b) return; if (b.dataset.st !== s) { b.dataset.st = s; if (s === "on" && !RM()) { b.classList.remove("burst"); void b.offsetWidth; b.classList.add("burst"); } } q("small", b).textContent = LBL[s]; b.setAttribute("aria-label", q("b", b).textContent + ": " + LBL[s]); }); }
syncDock(); setInterval(syncDock, 2000);
function press(b, fn) { if (RM()) return fn(); b.classList.remove("press"); void b.offsetWidth; b.classList.add("press"); setTimeout(fn, 260); }
dock.addEventListener("click", e => { const b = e.target.closest("[data-cn]"); if (!b) return; press(b, () => window.xviHolo(b.dataset.cn === "ai" ? "connai" : "connbr", b)); });

const PS = { claude: "Your Claude account, no key", openai: "GPT models", anthropic: "by Anthropic", gemini: "by Google", openrouter: "Many models, one key", ollama: "Runs on your computer", custom: "Any OpenAI-compatible server" };
const P = UNI.PRESETS, ORDER0 = ["openai", "anthropic", "gemini", "openrouter", "ollama", "custom"], ORDER = () => UNI.host || UNI.cfg.ai.provider === "claude" ? ["claude"].concat(ORDER0) : ORDER0, PN = { claude: "Claude built in", openai: "OpenAI", anthropic: "Claude API", gemini: "Gemini", openrouter: "OpenRouter", ollama: "Ollama", custom: "Custom" };
const aiForm = () => { UNI.enforce(); const a = UNI.cfg.ai, pr = P[a.provider], lk = UNI.locked(), dis = lk ? "disabled" : "", L = UNI.last, st = aiState(), bi = !!(pr && pr.builtin);
  const last = L && L.provider === a.provider ? (L.miss ? ` The last answer came from Claude's ${esc(L.tier)} model, because ${esc(L.want)} didn't answer.` : L.applied && L.applied !== "auto" ? ` Last answer: ${esc(L.applied)}.` : "") : "";
  const say = bi ? (UNI.HOST.sample ? (st === "err" ? esc(ST.aiTest.msg || "The last test failed.") : "Connected. The teacher uses Claude through your own Claude account." + last) : UNI.HOST.done || !UNI.host ? "Claude isn't available in this view. Open this page inside Claude, or pick another provider." : "Checking for Claude…")
    : st === "on" ? "Connected. The teacher uses " + esc(P[a.provider].n) + "." + last : st === "err" ? esc(ST.aiTest.msg || "The last test failed.") : UNI.aiReady() ? "Saved. Press Test connection to check it." : "Pick a provider, then add the model and key.";
  return `<div class="hcpv" role="radiogroup" aria-label="AI provider">${ORDER().map(k => `<button type="button" role="radio" aria-checked="${a.provider === k}" class="${a.provider === k ? "on" : ""}" data-pv="${k}" ${lk && a.provider !== k ? "disabled" : ""}><b>${PN[k]}</b><small>${PS[k]}</small></button>`).join("")}</div>
  <div class="hcf"><label><span>Model</span>${bi ? `<select id="hcModel" ${dis}>${UNI.CLAUDE_MODELS.map(([v, n]) => `<option value="${v}" ${(a.model || "auto") === v ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>` : `<input id="hcModel" autocomplete="off" value="${esc(a.model || "")}" placeholder="${esc(pr ? pr.model || "model name" : "pick a provider first")}" ${dis}>`}</label>
  ${bi ? "" : `<label><span>API key</span><input id="hcKey" type="password" autocomplete="off" value="${esc(a.key || "")}" placeholder="${pr && !pr.needsKey ? "not needed" : "paste your key"}"></label>`}
  ${a.provider === "custom" || a.provider === "ollama" ? `<label><span>Server address</span><input id="hcBase" autocomplete="off" value="${esc(a.base || "")}" placeholder="${esc((pr && pr.base) || "https://…/v1")}" ${dis}></label>` : ""}</div>
  <div class="hclock ${lk ? "on" : ""}"><div><b>${lk ? "🔒 Model locked" : "🔓 Lock model"}</b><small>${lk ? `Every answer uses ${esc(UNI.lock.model)} on ${esc(P[UNI.lock.provider].n)}. Unlock to change it.` : "Freeze this provider and model so no screen, setting or reload can switch it."}</small></div><button type="button" class="hcsw" role="switch" aria-checked="${lk}" aria-label="Lock model" data-cx="ailock" ${pr ? "" : "disabled"}><i></i></button></div>
  <div class="hcst ${st}" id="hcAiMsg"><i></i><span>${say}</span></div>
  <p class="hcnote">${bi ? "Built-in Claude runs on your own Claude account. Claude asks you to allow it the first time you ask something." : "Keys stay in this browser only and are sent only to the provider you pick."}</p>`; };
const hostBlock = () => { const N = UNI.NET;
  if (!UNI.host) return N.sim ? `<div class="hclock"><div><b>Demo market data</b><small>Coinbase couldn't be reached from this page, so charts show a simulated market and orders stay in practice.</small></div><button type="button" class="btn" data-cx="retrylive">Retry live</button></div>` : "";
  const on = !!UNI.cfg.hostMcp, live = UNI.hostLive(UNI.CBN), can = !!UNI.HOST.mcp;
  return `<div class="hclock ${live ? "on" : ""}"><div><b>Claude connectors</b><small>${!can ? (UNI.HOST.done ? "Not available in this view, so charts show demo prices and orders stay in practice." : "Checking…") : live ? "On. Prices, your account and orders use your Coinbase and Webull connectors in Claude. Orders still need Preview, Place order and Confirm." : on && UNI.HOST.err ? esc(UNI.HOST.err) + " Charts show demo prices." : "Off. Charts show demo prices and orders stay in practice. Turn on to use your own Coinbase and Webull connectors from Claude."}</small></div><button type="button" class="hcsw" role="switch" aria-checked="${live}" aria-label="Use Claude connectors" data-cx="hostmcp" ${can ? "" : "disabled"}><i></i></button></div>`; };
const brForm = () => { const C = UNI.cfg, tr = UNI.hasTrading();
  return `${hostBlock()}<div class="hcsrv">${C.servers.length ? C.servers.map((s, i) => `<div class="sv ${s.ok ? "ok" : s.err ? "bad" : ""}"><div class="t"><i></i><b>${esc(s.name)}</b><small>${s.ok ? (s.tools || []).length + " tools" + (UNI.serverFor("coinbase_orders_create") === s ? " · trading enabled" : " · data only") : s.err ? "not connected" : "saved"}</small></div><small class="u">${esc(s.url)}</small>${s.err ? `<div class="e">${esc(s.err)}</div>` : ""}${s.ok && (s.tools || []).length ? `<details><summary>Tools found (${s.tools.length})</summary><div class="tl">${s.tools.map(t => `<code>${esc(t)}</code>`).join("")}</div></details>` : ""}<div class="a"><button type="button" class="btn" data-cx="re:${i}">Reconnect</button><button type="button" class="btn" data-cx="del:${i}">Remove</button></div></div>`).join("") : `<p class="hcnote">No MCP server yet. ${UNI.NET.sim ? "Charts show demo prices" : "Charts use Coinbase's free public data"}; orders stay in practice mode.</p>`}</div>
  <div class="hcf"><label><span>Name</span><input id="hcSvName" autocomplete="off" placeholder="Coinbase"></label><label><span>Server URL</span><input id="hcSvUrl" autocomplete="off" placeholder="https://…/mcp"></label><label><span>Token (optional)</span><input id="hcSvTok" type="password" autocomplete="off"></label></div>
  <div class="hcst ${brState()}" id="hcBrMsg"><i></i><span>${UNI.hostLive(UNI.CBN) ? "Trading through your Claude connectors. Orders still need Preview, Place order and Confirm." : C.servers.some(s => s.err) ? "A saved server isn't connected right now. Press Reconnect, or Remove it." : tr ? "Trading enabled. Orders still need Preview, Place order and Confirm." : C.servers.some(s => s.ok) ? "Connected for data. No trading tools found, so orders stay in practice mode." : "Not connected. Practice mode."}</span></div>
  <h4 class="hch">Platforms</h4><div class="hcplat">${[["Coinbase", "Supported today via a Coinbase MCP server (data + orders with confirm). Public charts work without one.", "ok"], ["TradingView", "Coming soon · via MCP if available", ""], ["Webull", "Coming soon · via MCP if available (stock charts need a server with stock bars)", ""], ["NinjaTrader", "Coming soon · via MCP if available", ""], ["thinkorswim", "Coming soon · via MCP if available", ""], ["MetaTrader", "Coming soon · via MCP if available", ""]].map(([n, t, c]) => `<div class="${c}"><b>${n}</b><small>${t}</small></div>`).join("")}</div>
  <p class="hcnote">Tokens are saved only in this browser, and only for servers that connected. The six platform simulations are practice layouts. Only an MCP server with trading tools can send real orders.</p>`; };
const HO = window.xviHOLO;
HO.connai = () => ({ iconHtml: IAI, title: "Connect AI", body: `<div id="hcAI">${aiForm()}</div>`, acts: UNI.inClaude ? [] : [] });
HO.connbr = () => ({ iconHtml: IBR, title: "Connect Broker", body: `<div id="hcBR">${brForm()}</div>`, acts: [] });
const hp = $("xHolo");
const foot = k => k === "ai" ? `<div class="hf hcfoot"><button type="button" class="btn pri" data-cx="aitest">Test connection</button><button type="button" class="btn" data-cx="aiclear">Disconnect</button><button type="button" class="btn" data-cx="close">Done</button></div>` : `<div class="hf hcfoot"><button type="button" class="btn pri" data-cx="connect">Connect</button><button type="button" class="btn" data-cx="close">Done</button></div>`;
const _oh = window.xviHolo; window.xviHolo = function (k, from) { _oh(k, from); if (k === "connai" || k === "connbr") { const f = q(".hf", hp); if (f && !UNI.inClaude) f.outerHTML = foot(k === "connai" ? "ai" : "br"); } };
const reAI = () => { const w = $("hcAI"); if (w) w.innerHTML = aiForm(); syncDock(); }, reBR = () => { const w = $("hcBR"); if (w) w.innerHTML = brForm(); syncDock(); };
const keepAI = () => { const a = UNI.cfg.ai, v = id => { const el = $(id); return el ? el.value.trim() : null; }; const m = v("hcModel"), k = v("hcKey"), b = v("hcBase"); if (m != null) a.model = m; if (k != null) a.key = k; if (b != null) a.base = b; };
const msg = (id, cls, t) => { const el = $(id); if (el) { el.className = "hcst " + cls; q("span", el).innerHTML = t; } };
hp.addEventListener("change", e => { if (e.target.id === "hcModel" && e.target.tagName === "SELECT") { keepAI(); UNI.save(); syncDock(); } });
window.addEventListener("xvi-host", () => { try { if ($("hcAI")) { keepAI(); reAI(); } if ($("hcBR")) reBR(); syncDock(); } catch (er) {} });
window.addEventListener("xvi-ai-model", () => { try { if ($("hcAI") && !q("#hcAiMsg.busy", hp)) { keepAI(); reAI(); } } catch (er) {} });
hp.addEventListener("click", e => { const pv = e.target.closest("[data-pv]"); if (pv) { if (UNI.locked()) { msg("hcAiMsg", "set", "The model is locked. Unlock it to switch provider."); return; } keepAI(); const a = UNI.cfg.ai; if (a.provider !== pv.dataset.pv) { a.provider = pv.dataset.pv; a.model = ""; a.base = ""; } UNI.cfg.aiOff = false; UNI.save(); try { afterConn(); } catch (er) {} reAI(); const nb = q('[data-pv="' + pv.dataset.pv + '"]', hp); if (nb) nb.focus(); return; }
  const b = e.target.closest("[data-cx]"); if (!b) return; const c = b.dataset.cx;
  if (c === "close") { window.xviCloseHolo(); return; }
  if (c === "ailock") { keepAI(); const on = !UNI.locked(); if (!UNI.setLock(on)) { msg("hcAiMsg", "err", "Pick a provider and a model first, then lock it."); return; } try { afterConn(); } catch (er) {} reAI(); try { toast(on ? "Model locked to " + UNI.lock.model + "." : "Model unlocked."); } catch (er) {} const sw = q("[data-cx=ailock]", hp); if (sw) sw.focus(); return; }
  if (c === "hostmcp") { UNI.setHostMcp(!UNI.hostLive(UNI.CBN)); reBR(); const sw = q("[data-cx=hostmcp]", hp); if (sw) sw.focus(); return; }
  if (c === "retrylive") { UNI.retryLive(); try { loadLists(); selectInst(S.inst); } catch (er) {} msg("hcBrMsg", "set busy", "Trying Coinbase again…"); setTimeout(reBR, 2500); return; }
  if (c === "aitest") { keepAI(); UNI.save(); try { afterConn(); } catch (er) {} if (!UNI.aiReady()) { msg("hcAiMsg", "err", UNI.PRESETS[UNI.cfg.ai.provider] && UNI.PRESETS[UNI.cfg.ai.provider].builtin ? "Claude isn't available in this view. Open this page inside Claude, or pick another provider." : "Not complete yet. Pick a provider and add a key (Ollama and some servers don't need one)."); return; }
    msg("hcAiMsg", "set busy", "Testing…"); b.disabled = true; const sig = aiSig();
    UNI.sample([{ role: "user", content: "Reply with the single word: ready" }], {}).then(r => { ST.aiTest = { sig, ok: true }; const L = UNI.last; if (L && L.miss) msg("hcAiMsg", "set", `Claude answered, but not with ${esc(L.want)}. That model isn't available to this account right now, so Claude used its ${esc(L.tier)} model.`); else msg("hcAiMsg", "on", `Connected. The AI answered: "${esc(String(r.text || "").slice(0, 40))}"${L && L.applied && L.applied !== "auto" ? " · " + esc(L.applied) : ""}`); })
      .catch(er => { ST.aiTest = { sig, ok: false, msg: er.text || er.message }; msg("hcAiMsg", "err", esc(er.text || er.message)); })
      .then(() => { b.disabled = false; try { localStorage.setItem("xvi_ai_test", JSON.stringify(ST.aiTest)); } catch (er) {} syncDock(); }); return; }
  if (c === "aiclear") { if (UNI.locked()) { msg("hcAiMsg", "set", "The model is locked. Unlock it before disconnecting."); return; } UNI.cfg.ai = { provider: "", model: "", key: "", base: "" }; UNI.cfg.aiOff = true; UNI.save(); ST.aiTest = null; try { localStorage.removeItem("xvi_ai_test"); afterConn(); } catch (er) {} reAI(); return; }
  if (c === "connect") { const nm = $("hcSvName"), ur = $("hcSvUrl"), tk = $("hcSvTok"), name = (nm.value || "").trim() || "MCP server", url = (ur.value || "").trim(), token = (tk.value || "").trim();
    const bad = t => { msg("hcBrMsg", "err", t); ur.classList.remove("shake"); void ur.offsetWidth; ur.classList.add("shake"); };
    if (!/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url)) { bad("Enter the server's full address, starting with https:// (http:// is only allowed for localhost)."); return; }
    if (UNI.cfg.servers.some(x => x.url.replace(/\/+$/, "") === url.replace(/\/+$/, ""))) { bad("That server is already in the list. Use Reconnect on it instead."); return; }
    const s = { name, url, token }; msg("hcBrMsg", "set busy", "Connecting to " + esc(name) + "…"); b.disabled = true;
    UNI.connect(s).then(t => { s.err = ""; UNI.cfg.servers.push(s); UNI.save(); try { afterConn(); } catch (er) {} reBR(); b.disabled = false; { const nb = q("[data-cx=connect]", hp); if (nb) nb.disabled = false; } try { syncDock(); } catch (er) {} msg("hcBrMsg", "on", `Connected to ${esc(name)}: ${t.length} tools found${t.includes("coinbase_orders_create") ? ", trading enabled." : ", data only."}`); })
      .catch(er => { b.disabled = false; msg("hcBrMsg", "err", esc(er.text || er.message) + " Nothing was saved; fix the details and press Connect again."); syncDock(); }); return; }
  if (c.startsWith("re:")) { const s = UNI.cfg.servers[+c.slice(3)]; if (!s) return; b.textContent = "Connecting…"; b.disabled = true; UNI.connect(s).then(() => { s.err = ""; }).catch(er => { s.ok = false; s.err = er.text || er.message; }).then(() => { try { afterConn(); } catch (er) {} reBR(); }); return; }
  if (c.startsWith("del:")) { UNI.cfg.servers.splice(+c.slice(4), 1); UNI.save(); try { afterConn(); } catch (er) {} reBR(); return; } });
hp.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.closest("#hcAI input")) { e.preventDefault(); const t = q("[data-cx=aitest]", hp); if (t) t.click(); } else if (e.key === "Enter" && e.target.closest("#hcBR .hcf input")) { e.preventDefault(); const t = q("[data-cx=connect]", hp); if (t) t.click(); } });
/* Ask the Teacher without an AI: answer from the app's own lessons, help and lingo text */
window.xviOfflineAnswer = qs => { const words = String(qs).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !/^(the|and|what|why|how|does|this|that|is|are|for|with|my|you|your|its|can|should|about|explain|there|when|where|which|from|into|then)$/.test(w));
  if (!words.length) return ""; const docs = [];
  try { LINGO.forEach(x => docs.push([x[0], x[1]])); } catch (e) {}
  try { Object.values(IND_HELP).forEach(x => docs.push([x[0], x[1] + " " + x[2]])); } catch (e) {}
  try { Object.values(PAT_HELP).forEach(x => docs.push([x[0], x[1] + " " + x[2]])); } catch (e) {}
  try { Object.values(HELP).forEach(x => { if (Array.isArray(x)) docs.push([x[0], x[1] + " " + (x[2] || "")]); }); } catch (e) {}
  try { TEACH.forEach(t => docs.push([t[1], t[2] + " " + ((t[3] && t[3][3]) || "")])); } catch (e) {}
  let best = null, bs = 0; docs.forEach(d => { const tl = d[0].toLowerCase(), tx = d[1].toLowerCase(); let sc = 0; words.forEach(w => { const st = w.replace(/s$/, ""); if (tl.includes(st)) sc += 3; else if (tx.includes(st)) sc += 1; }); if (sc > bs) { bs = sc; best = d; } });
  return best && bs >= 2 ? `From the built-in lessons, ${best[0]}: ${best[1]} (Connect an AI for answers about your exact chart.)` : ""; };
document.addEventListener("click", e => { const b = e.target.closest("[data-xconnai]"); if (!b) return; try { closeAsk(); } catch (er) { const a = $("ask"); if (a) a.classList.remove("show"); const d = $("askDim"); if (d) d.classList.remove("show"); } setTimeout(() => window.xviConnect("ai"), 120); });
const _sm = setMode; setMode = function () { _sm(); const m = $("mode"); if (m && UNI.NET && UNI.NET.ok === false) { m.className = "badge"; m.style.background = "rgba(255,150,60,.18)"; m.style.color = "#ffb070"; m.textContent = "No live data"; m.title = "Coinbase market data can't be reached right now."; } else if (m) { m.style.background = ""; m.style.color = ""; } };
window.addEventListener("xvi-net", () => { try { setMode(); } catch (e) {} });
window.xviConnect = k => window.xviHolo(k === "broker" ? "connbr" : "connai", $(k === "broker" ? "xConnBr" : "xConnAI"));
})();
