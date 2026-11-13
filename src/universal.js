/* ---------- universal connections: Claude when available, otherwise your own AI key + public data + any MCP server ---------- */
const UNI = (() => {
  const host = !!(typeof window !== "undefined" && window.claude && typeof window.claude.use === "function");
  const inClaude = false; /* v8: the app keeps its own settings everywhere. What the Claude viewer offers arrives through HOST below. */
  const CBN = "Coin base agents";
  const KEY = "tc_uni";
  const PRESETS = {
    claude: { n: "Claude (built in)", base: "claude", model: "auto", needsKey: false, builtin: true },
    openai: { n: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-4o-mini", needsKey: true },
    anthropic: { n: "Anthropic (Claude)", base: "https://api.anthropic.com/v1", model: "claude-sonnet-5-5", needsKey: true },
    gemini: { n: "Google Gemini", base: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash", needsKey: true },
    openrouter: { n: "OpenRouter (many models)", base: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", needsKey: true },
    ollama: { n: "Ollama (on your computer)", base: "http://localhost:11434/v1", model: "llama3.1", needsKey: false },
    custom: { n: "Other OpenAI-compatible", base: "", model: "", needsKey: false }
  };
  const load = () => { try { return Object.assign({ ai: { provider: "", model: "", key: "", base: "" }, servers: [], practice: 100 }, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return { ai: { provider: "", model: "", key: "", base: "" }, servers: [], practice: 100 }; } };
  let cfg = load();
  if (!cfg.ai || typeof cfg.ai !== "object") cfg.ai = { provider: "", model: "", key: "", base: "" };
  /* ----- Claude viewer capabilities (published artifact): each resolves on its own, the app never waits on them to paint ----- */
  const HOST = { on: host, sample: null, mcp: null, dict: null, dl: null, dead: {}, err: "", done: false };
  const hostEmit = d => { try { window.dispatchEvent(new CustomEvent("xvi-host", { detail: d || {} })); } catch (e) {} };
  const hostUse = n => { try { return Promise.resolve(window.claude.use(n)).catch(() => null); } catch (e) { return Promise.resolve(null); } };
  const hostAll = host ? Promise.all([["sample", "sample"], ["mcp", "mcp"], ["dictation", "dict"], ["downloads", "dl"]].map(([n, k]) => hostUse(n).then(v => { HOST[k] = v || null; if (v) { if (k === "sample" && !cfg.ai.provider && !cfg.aiLock && !cfg.aiOff) cfg.ai.provider = "claude"; hostEmit({ cap: n }); } }))).then(() => { HOST.done = true; hostEmit({ done: true }); }) : Promise.resolve();
  const hostReady = ms => Promise.race([hostAll, new Promise(r => setTimeout(r, ms || 1500))]);
  /* ----- model lock: while it is on, provider + model + server address are frozen, whatever any screen or script writes into cfg.ai ----- */
  const enforce = () => { const L = cfg.aiLock; if (L && L.provider) { cfg.ai.provider = L.provider; cfg.ai.model = L.model; cfg.ai.base = L.base || ""; } };
  const locked = () => !!(cfg.aiLock && cfg.aiLock.provider);
  const effModel = () => { const a = cfg.ai, p = PRESETS[a.provider]; return a.model || (p && p.model) || ""; };
  const setLock = on => { if (!on) { cfg.aiLock = null; save(); return true; } const a = cfg.ai, p = PRESETS[a.provider]; if (!p || !effModel()) return false; cfg.aiLock = { provider: a.provider, model: effModel(), base: a.base || "", at: Date.now() }; enforce(); save(); return true; };
  let LAST = null; /* the model that answered the last question */
  const save = () => { enforce(); try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, cfg, { servers: cfg.servers.map(s => ({ name: s.name, url: s.url, token: s.token })) }))); } catch (e) {} };
  const E = (code, text, extra) => Object.assign(new Error(text || code), { code, text, message: text || code }, extra || {});

  /* ----- AI: bring your own key ----- */
  const aiReady = () => { enforce(); const a = cfg.ai, p = PRESETS[a.provider]; if (p && p.builtin) return !!HOST.sample; return !!(p && (a.model || p.model) && (a.base || p.base) && (!p.needsKey || a.key)); };
  async function readSSE(res, onDelta) { const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "", full = "";
    for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop();
      for (const ln of lines) { const s = ln.trim(); if (!s.startsWith("data:")) continue; const d = s.slice(5).trim(); if (d === "[DONE]") continue; try { const j = JSON.parse(d), piece = (((j.choices || [])[0] || {}).delta || {}).content || ""; if (piece) { full += piece; onDelta(full); } } catch (e) {} } }
    return full; }
  const TIERS = ["quick", "default", "complex"];
  async function hostSample(messages, opt) { const a = cfg.ai;
    if (!HOST.sample) throw E("ai_error", "Claude isn't available in this view. Open the page inside Claude, or pick another provider in Connect AI.");
    const msgs = messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") })).filter(m => m.content.trim()); while (msgs.length && msgs[0].role !== "user") msgs.shift();
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") throw E("ai_error", "There was no question to send.");
    const want = a.model && a.model !== "auto" ? a.model : "", o = { cache: opt.cache === undefined ? false : opt.cache, modelTier: TIERS.includes(opt.modelTier) ? opt.modelTier : "default" };
    if (want) o.model = want; if (opt.signal) o.signal = opt.signal; if (opt.onText) o.onText = x => { try { opt.onText({ text: x.text }); } catch (e) {} };
    let r; try { r = await HOST.sample(msgs, o); } catch (e) { const c = e && e.code, part = e && e.text ? { partial: e.text } : {};
      if (c === "not_granted") throw E("ai_error", "Claude wasn't allowed for this page. Reload, then choose Allow when Claude asks.", part);
      if (c === "rate_limited") throw E("rate_limited", "Too many questions in a row. Wait a moment, then ask again.", part);
      if (c === "cancelled") throw E("cancelled", "Stopped.", part);
      if (c === "sampling_disabled") throw E("ai_error", "Claude is switched off for this account or page right now.", part);
      throw E("ai_error", "Claude couldn't answer" + (e && e.message ? ": " + String(e.message).slice(0, 160) : "."), part); }
    const applied = (r && r.modelApplied) || "";
    LAST = { provider: "claude", want: want || "auto", applied: applied || (want ? "" : "auto"), tier: (r && r.modelTierApplied) || o.modelTier, miss: !!(want && applied !== want), locked: locked(), at: Date.now() };
    try { window.dispatchEvent(new CustomEvent("xvi-ai-model", { detail: Object.assign({}, LAST) })); } catch (e) {}
    return { text: (r && r.text) || "", truncated: !!(r && r.truncated), model: applied }; }
  async function sample(messages, opt) { opt = opt || {}; enforce(); if (PRESETS[cfg.ai.provider] && PRESETS[cfg.ai.provider].builtin) return hostSample(messages, opt); const out = await keySample(messages, opt); LAST = { provider: cfg.ai.provider, want: effModel(), applied: effModel(), miss: false, locked: locked(), at: Date.now() }; return out; }
  async function keySample(messages, opt) { if (!aiReady()) throw E("ai_error", "No AI is set up yet. Press Connect AI and add your AI key.");
    const a = cfg.ai, p = PRESETS[a.provider], model = a.model || p.model, base = (a.base || p.base).replace(/\/+$/, ""), msgs = messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "") }));
    const img = opt.image && /^data:image\/(png|jpeg|webp);base64,/.test(opt.image) ? opt.image : null, mt = img && img.slice(5, img.indexOf(";")), b64 = img && img.split(",")[1], li = msgs.length - 1;
    const onText = t => { try { opt.onText && opt.onText({ text: t }); } catch (e) {} };
    const fail = async r => { let msg = ""; try { const j = await r.json(); msg = (j.error && (j.error.message || j.error)) || j.message || ""; } catch (e) {} if (r.status === 401 || r.status === 403) throw E("ai_error", "Your AI key was rejected. Check it with Connect AI."); if (r.status === 429) throw E("rate_limited", "Too many questions in a row."); throw E("ai_error", "The AI returned an error" + (msg ? ": " + String(msg).slice(0, 160) : ".")); };
    let r;
    try {
      if (a.provider === "anthropic") {
        r = await fetch(base + "/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": a.key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model, max_tokens: opt.maxTokens || 1024, messages: img ? msgs.map((m, i) => i === li ? { role: m.role, content: [{ type: "image", source: { type: "base64", media_type: mt, data: b64 } }, { type: "text", text: m.content }] } : m) : msgs }) });
        if (!r.ok) await fail(r); const j = await r.json(), text = (j.content || []).map(b => b.text || "").join(""); onText(text); return { text };
      }
      if (a.provider === "gemini") {
        r = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(a.key)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: msgs.map((m, i) => ({ role: m.role === "assistant" ? "model" : "user", parts: img && i === li ? [{ inline_data: { mime_type: mt, data: b64 } }, { text: m.content }] : [{ text: m.content }] })) }) });
        if (!r.ok) await fail(r); const j = await r.json(), text = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map(x => x.text || "").join(""); onText(text); return { text };
      }
      const h = { "content-type": "application/json" }; if (a.key) h.Authorization = "Bearer " + a.key;
      r = await fetch(base + "/chat/completions", { method: "POST", headers: h, body: JSON.stringify({ model, messages: img ? msgs.map((m, i) => i === li ? { role: m.role, content: [{ type: "text", text: m.content }, { type: "image_url", image_url: { url: img } }] } : m) : msgs, stream: !opt.noStream }) });
      if (!r.ok) await fail(r);
      if ((r.headers.get("content-type") || "").includes("text/event-stream") && r.body && r.body.getReader) { const text = await readSSE(r, onText); return { text }; }
      const j = await r.json(), text = ((((j.choices || [])[0] || {}).message) || {}).content || ""; onText(text); return { text };
    } catch (e) { if (e.code) throw e; throw E("ai_error", "Couldn't reach " + p.n + ". " + (a.provider === "ollama" ? "Make sure Ollama is running and allows this page (OLLAMA_ORIGINS)." : /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i.test(base || "") ? "Make sure that server is running at " + base + " and allows requests from this page (CORS)." : "Check your internet connection, the server address, and that it allows requests from this page (CORS).")); }
  }

  /* ----- voice: the browser's own speech ----- */
  const tts = (typeof window !== "undefined" && window.XVoice && window.XVoice.available) ? { speak(text, o) { return window.XVoice.speak(text, o); }, stop() { return window.XVoice.stop(); } }
    : (typeof window !== "undefined" && window.speechSynthesis && window.SpeechSynthesisUtterance) ? {
    speak(text, o) { return new Promise(res => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = (o && o.rate) || 1; u.onend = res; u.onerror = res; speechSynthesis.speak(u); } catch (e) { res(); } }); },
    stop() { try { speechSynthesis.cancel(); } catch (e) {} return Promise.resolve(); } } : null;
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const dict = SR ? (() => { let rec = null; const H = { p: [], f: [], s: [] }, emit = (k, v) => H[k].forEach(fn => { try { fn(v); } catch (e) {} });
    return { onPartial(fn) { H.p.push(fn); }, onFinal(fn) { H.f.push(fn); }, onState(fn) { H.s.push(fn); },
      start() { try { rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
          rec.onstart = () => emit("s", { state: "listening" }); rec.onend = () => emit("s", { state: "idle" }); rec.onerror = () => emit("s", { state: "idle" });
          rec.onresult = ev => { let fin = "", part = ""; for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fin += t; else part += t; } if (part) emit("p", { text: part }); if (fin) emit("f", { text: fin.trim() }); };
          rec.start(); return Promise.resolve(); } catch (e) { return Promise.reject(E("not_granted", "Microphone isn't available.")); } },
      stop() { try { rec && rec.stop(); } catch (e) {} return Promise.resolve(); } }; })() : null;

  /* ----- MCP servers you connect (Streamable HTTP) ----- */
  let rid = 0;
  async function rpc(srv, method, params, note) {
    const h = { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" };
    if (srv.token) h.authorization = "Bearer " + srv.token; if (srv.sid) h["mcp-session-id"] = srv.sid;
    const id = ++rid, body = note ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params: params || {} };
    let r; try { r = await fetch(srv.url, { method: "POST", headers: h, body: JSON.stringify(body) }); } catch (e) { throw E("server_unavailable", "Couldn't reach " + srv.name + ". The server may be down, or it doesn't allow connections from a web page.", { server: srv.name }); }
    const sid = r.headers.get("mcp-session-id"); if (sid) srv.sid = sid; if (note) return null;
    if (r.status === 401 || r.status === 403) throw E("needs_reauth", srv.name + " rejected the token.", { server: srv.name });
    if (r.status === 429) throw E("rate_limited", "Slow down.", { server: srv.name });
    if (!r.ok) throw E("upstream_error", srv.name + " returned an error (" + r.status + ").", { server: srv.name });
    let msg; if ((r.headers.get("content-type") || "").includes("text/event-stream")) { const txt = await r.text(); for (const ln of txt.split("\n")) { const s = ln.trim(); if (!s.startsWith("data:")) continue; try { const j = JSON.parse(s.slice(5)); if (j.id === id) msg = j; } catch (e) {} } } else msg = await r.json();
    if (!msg) throw E("upstream_error", srv.name + " sent no answer.", { server: srv.name });
    if (msg.error) throw E("tool_error", String(msg.error.message || "Server error").slice(0, 300), { server: srv.name });
    return msg.result;
  }
  async function connect(srv) { srv.sid = null;
    await rpc(srv, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "16thDNA", version: "1.0" } });
    await rpc(srv, "notifications/initialized", {}, true);
    const tl = await rpc(srv, "tools/list", {}); srv.tools = ((tl && tl.tools) || []).map(t => t.name); srv.ok = true; return srv.tools; }
  async function connectAll() { await Promise.all(cfg.servers.map(s => connect(s).catch(e => { s.ok = false; s.err = e.text || e.message; }))); }
  const serverFor = tool => cfg.servers.find(s => s.ok && (s.tools || []).includes(tool));
  const hasTrading = () => !!serverFor("coinbase_orders_create") || (!!(HOST.mcp && cfg.hostMcp && !HOST.dead["Coin base agents"]));
  async function callServer(srv, tool, input) { const res = await rpc(srv, "tools/call", { name: tool, arguments: input || {} });
    const txt = ((res && res.content) || []).filter(c => c.type === "text").map(c => c.text).join("\n");
    if (res && res.isError) throw E("tool_error", txt.slice(0, 300) || "The tool reported an error.", { server: srv.name });
    if (res && res.structuredContent) return res.structuredContent; try { return JSON.parse(txt); } catch (e) { return txt; } }

  /* ----- public market data (no key needed) -----
     Coinbase's brokerage "market" endpoints send no CORS header, so a browser page can't read them directly.
     Order of sources: 1) the bundled local launcher (serve.py) proxies them when present (window.XVI_PROXY);
     2) otherwise Coinbase Exchange's public API, which allows any web page (also file://), adapted to the same shapes. */
  const PUB = "https://api.coinbase.com/api/v3/brokerage/market", EXC = "https://api.exchange.coinbase.com";
  const PROXY = (typeof window !== "undefined" && window.XVI_PROXY) || "";
  const MAXC = 349; // Coinbase allows fewer than 350 candles per request
  const hostLive = server => !!(HOST.mcp && cfg.hostMcp && !HOST.dead[server || CBN]);
  /* inside the Claude viewer a page can't call Coinbase itself, so market data starts on the demo feed until Claude connectors are switched on */
  const NET = { mode: host ? "sim" : PROXY ? "proxy" : "exchange", ok: host ? true : null, err: "", get sim() { return NET.mode === "sim" && !hostLive(CBN); } };
  const netEmit = () => { try { window.dispatchEvent(new CustomEvent("xvi-net", { detail: Object.assign({}, NET) })); } catch (e) {} };
  const blockedMsg = () => (typeof location !== "undefined" && location.protocol === "file:")
    ? "Live market data was blocked because the app was opened straight from a file. Double-click start.bat (Windows) or run start.sh (Mac/Linux) in the app folder, then use the localhost page it opens."
    : "Your browser couldn't reach Coinbase's public market data. Check your internet connection, or run the bundled launcher (start.bat / start.sh) and use the localhost page it opens.";
  let qT = 0;
  async function getJ(url, gap) { const now = Date.now(), t = Math.max(now, qT); qT = t + (gap == null ? 110 : gap); if (t > now) await new Promise(r => setTimeout(r, t - now));
    let r; try { r = await fetch(url); } catch (e) { NET.ok = false; NET.err = blockedMsg(); netEmit(); throw E("server_unavailable", blockedMsg(), { server: "Coinbase public data" }); }
    if (NET.ok !== true) { NET.ok = true; NET.err = ""; netEmit(); }
    if (r.status === 429) throw E("rate_limited", "Coinbase asked us to slow down."); if (!r.ok) throw E("tool_error", "Coinbase public data returned an error (" + r.status + ")."); return r.json(); }
  const pub = path => getJ(PROXY.replace(/\/+$/, "") + "/brokerage" + path, 0);
  const GRAN = { "1m": ["ONE_MINUTE", 60], "5m": ["FIVE_MINUTE", 300], "15m": ["FIFTEEN_MINUTE", 900], "30m": ["THIRTY_MINUTE", 1800], "1h": ["ONE_HOUR", 3600], "2h": ["TWO_HOUR", 7200], "6h": ["SIX_HOUR", 21600], "1d": ["ONE_DAY", 86400] };
  const gran = g => GRAN[g] || Object.values(GRAN).find(x => x[0] === g) || GRAN["15m"];
  const secs = v => v == null ? null : /^\d+$/.test(String(v)) ? +v : Math.floor(Date.parse(v) / 1000);
  const range = i => { const s = gran(i.granularity)[1], lim = Math.max(1, Math.min(MAXC, +i.limit || 300)), end = secs(i.end) || Math.floor(Date.now() / 1000); let start = secs(i.start) || end - (lim - 1) * s;
    if ((end - start) / s > lim - 1) start = end - (lim - 1) * s; return { s, lim, start, end }; };
  /* Coinbase Exchange adapters (same output shapes as the brokerage market API) */
  const XB = { 60: 60, 300: 300, 900: 900, 1800: 900, 3600: 3600, 7200: 3600, 21600: 21600, 86400: 86400 };
  async function exCandles(i) { const { s, start, end } = range(i), b = XB[s] || 900, n = Math.ceil(((end - start) / b + 1) / 300), jobs = [];
    for (let k = 0; k < n; k++) { const pe = end - k * 300 * b, ps = Math.max(start, pe - 299 * b); if (pe < start) break;
      jobs.push(getJ(`${EXC}/products/${encodeURIComponent(i.product_id)}/candles?granularity=${b}&start=${ps}&end=${pe}`).then(r => Array.isArray(r) ? r : []).catch(e => { if (k === 0) throw e; return []; })); }
    const m = new Map(); (await Promise.all(jobs)).flat().forEach(([t, lo, hi, op, cl, v]) => { const bt = t - t % s, x = m.get(bt);
      if (!x) m.set(bt, { t: bt, o: op, h: hi, l: lo, c: cl, v, f: t, z: t }); else { if (t < x.f) { x.f = t; x.o = op; } if (t > x.z) { x.z = t; x.c = cl; } x.h = Math.max(x.h, hi); x.l = Math.min(x.l, lo); x.v += v; } });
    return { candles: [...m.values()].sort((a, c) => c.t - a.t).map(x => ({ start: String(x.t), open: String(x.o), high: String(x.h), low: String(x.l), close: String(x.c), volume: String(x.v) })) }; }
  const pbook = (pid, j, lim) => ({ product_id: pid, bids: (j.bids || []).slice(0, lim).map(([p, z]) => ({ price: p, size: z })), asks: (j.asks || []).slice(0, lim).map(([p, z]) => ({ price: p, size: z })), time: new Date().toISOString() });
  async function exList(type) { if (type && type !== "SPOT") return { products: [] }; // Exchange has spot only; futures/perps need the launcher proxy or an MCP server
    const [ps, st] = await Promise.all([getJ(EXC + "/products"), getJ(EXC + "/products/stats").catch(() => ({}))]);
    return { products: (ps || []).filter(p => p.status === "online" && !p.trading_disabled).map(p => { const x = (st[p.id] || {}).stats_24hour || {}, last = +x.last || 0, open = +x.open || 0;
      return { product_id: p.id, base_currency_id: p.base_currency, quote_currency_id: p.quote_currency, status: "online", price: String(last), price_percentage_change_24h: String(open ? (last - open) / open * 100 : 0), volume_24h: String(x.volume || 0), price_increment: p.quote_increment, base_increment: p.base_increment, quote_min_size: p.min_market_funds || "1" }; }) }; }
  const EXPUB = {
    coinbase_products_list: i => exList(i.product_type || "SPOT"),
    coinbase_products_candles: exCandles,
    coinbase_products_ticker: async i => { const t = await getJ(`${EXC}/products/${encodeURIComponent(i.product_id)}/trades?limit=${Math.min(100, i.limit || 30)}`);
      return { trades: (t || []).map(x => ({ trade_id: String(x.trade_id), product_id: i.product_id, price: x.price, size: x.size, time: x.time, side: x.side === "buy" ? "SELL" : "BUY" })) }; }, // Exchange reports the maker side
    coinbase_products_book: async i => ({ pricebook: pbook(i.product_id, await getJ(`${EXC}/products/${encodeURIComponent(i.product_id)}/book?level=2`), i.limit || 20) }),
    coinbase_products_best_bid_ask: async i => { const ids = i.product_ids || []; const books = await Promise.all(ids.map(id => getJ(`${EXC}/products/${encodeURIComponent(id)}/book?level=1`).then(j => pbook(id, j, 1)).catch(() => null))); return { pricebooks: books.filter(Boolean) }; }
  };
  const BRPUB = {
    coinbase_products_list: i => i.product_type === "GLOBAL_PERP" ? Promise.resolve({ products: [] }) /* not a valid public product_type (it always returned 400) */ : pub(`/products?product_type=${encodeURIComponent(i.product_type || "SPOT")}&limit=${i.limit || 250}`),
    coinbase_products_candles: i => { const { s, lim, start, end } = range(i), g = gran(i.granularity)[0]; return pub(`/products/${encodeURIComponent(i.product_id)}/candles?start=${start}&end=${end}&granularity=${g}&limit=${lim}`); },
    coinbase_products_ticker: i => pub(`/products/${encodeURIComponent(i.product_id)}/ticker?limit=${i.limit || 30}`),
    coinbase_products_book: i => pub(`/product_book?product_id=${encodeURIComponent(i.product_id)}&limit=${i.limit || 20}`),
    coinbase_products_best_bid_ask: async i => { const ids = i.product_ids || []; const books = await Promise.all(ids.map(id => pub(`/product_book?product_id=${encodeURIComponent(id)}&limit=1`).then(j => j.pricebook).catch(() => null))); return { pricebooks: books.filter(Boolean) }; }
  };
  const PUBLIC = PROXY ? BRPUB : EXPUB;
  /* ----- demo market: a deterministic price path (same candles on every timeframe and reload), used only when no real feed can be reached ----- */
  const SIMP = [["BTC", 67400, 1, "0.01", "0.00000001"], ["ETH", 3520, 1.25, "0.01", "0.00000001"], ["SOL", 162, 1.7, "0.01", "0.00000001"], ["XRP", 0.58, 1.5, "0.0001", "0.000001"], ["DOGE", 0.142, 2, "0.00001", "0.1"], ["ADA", 0.46, 1.6, "0.0001", "0.01"], ["AVAX", 34.2, 1.8, "0.01", "0.001"], ["LINK", 15.6, 1.6, "0.001", "0.01"], ["LTC", 84.5, 1.3, "0.01", "0.00000001"], ["DOT", 6.8, 1.6, "0.001", "0.001"], ["UNI", 9.4, 1.8, "0.001", "0.001"], ["BCH", 468, 1.4, "0.01", "0.00000001"]];
  const h32 = (i, s) => { let x = Math.imul((i | 0) ^ Math.imul(s | 0, 0x9E3779B1), 0x85EBCA6B); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const vnz = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return (h32(i, s) * (1 - u) + h32(i + 1, s) * u) * 2 - 1; };
  const SSC = [[2592000, .2], [604800, .09], [86400, .035], [21600, .016], [3600, .007], [900, .0034], [300, .002], [60, .0009], [8, .00035]];
  const simPx = (k, t) => { const p = SIMP[k]; let L = 0; for (let j = 0; j < SSC.length; j++) L += SSC[j][1] * p[2] * vnz(t / SSC[j][0], k * 31 + j + 7); return p[1] * Math.exp(L); };
  const simK = pid => { const b = String(pid || "").split("-")[0], k = SIMP.findIndex(p => p[0] === b); if (k < 0) throw E("tool_error", b + " isn't in the demo market."); return k; };
  const sdec = k => (SIMP[k][3].split(".")[1] || "").length, sfx = (k, v) => v.toFixed(sdec(k)), snow = () => Date.now() / 1000;
  const simCandle = (k, bt, s, now) => { const end = Math.min(bt + s, now), n = 24, o = simPx(k, bt); let hi = o, lo = o, c = o; for (let j = 1; j <= n; j++) { c = simPx(k, bt + (end - bt) * j / n); if (c > hi) hi = c; if (c < lo) lo = c; }
    const v = (0.35 + h32(Math.floor(bt / s), k + 99) * 1.3) * (end - bt) * 9000 / SIMP[k][1]; return { start: String(bt), open: sfx(k, o), high: sfx(k, hi), low: sfx(k, lo), close: sfx(k, c), volume: v.toFixed(4) }; };
  const simBook = (pid, lim) => { const k = simK(pid), now = snow(), mid = simPx(k, now), inc = +SIMP[k][3], half = Math.max(inc, mid * 0.00004), step = Math.max(inc, mid * 0.00008), tb = Math.floor(now / 5), bids = [], asks = [];
    for (let j = 0; j < lim; j++) { const z = d => ((h32(tb + j * 7, k + d) * 1.5 + 0.1) * 3000 / mid * (1 + j * 0.15)).toFixed(6); bids.push({ price: sfx(k, mid - half - j * step), size: z(11) }); asks.push({ price: sfx(k, mid + half + j * step), size: z(12) }); }
    return { product_id: pid, bids, asks, time: new Date().toISOString() }; };
  const SIM = {
    coinbase_products_list: i => ({ products: (i.product_type || "SPOT") !== "SPOT" ? [] : SIMP.map((p, k) => { const now = snow(), last = simPx(k, now), open = simPx(k, now - 86400); return { product_id: p[0] + "-USD", base_currency_id: p[0], quote_currency_id: "USD", status: "online", price: sfx(k, last), price_percentage_change_24h: String((last - open) / open * 100), volume_24h: String(Math.round(86400 * 9000 / p[1] * (0.7 + h32(k, 3)))), price_increment: p[3], base_increment: p[4], quote_min_size: "1" }; }) }),
    coinbase_products_candles: i => { const { s, lim, start, end } = range(i), k = simK(i.product_id), now = snow(), out = []; for (let bt = Math.floor(Math.min(end, now) / s) * s; bt > start - s && out.length <= lim; bt -= s) out.push(simCandle(k, bt, s, now)); return { candles: out }; },
    coinbase_products_ticker: i => { const k = simK(i.product_id), now = snow(), n = Math.min(100, i.limit || 30), out = []; for (let j = 0; j < n; j++) { const tb = Math.floor(now / 3) - j, t = Math.min(now, tb * 3 + h32(tb, k + 3) * 3), pr = simPx(k, t);
        out.push({ trade_id: String(tb), product_id: i.product_id, price: sfx(k, pr), size: ((Math.pow(h32(tb, k + 6), 3) * 900 + 5) / pr).toFixed(6), time: new Date(t * 1000).toISOString(), side: h32(tb, k + 4) > 0.5 ? "BUY" : "SELL" }); } return { trades: out }; },
    coinbase_products_book: i => ({ pricebook: simBook(i.product_id, Math.min(100, i.limit || 20)) }),
    coinbase_products_best_bid_ask: i => ({ pricebooks: (i.product_ids || []).map(id => { try { return simBook(id, 1); } catch (e) { return null; } }).filter(Boolean) })
  };
  const goSim = () => { if (NET.mode !== "sim") { NET.mode = "sim"; NET.ok = true; NET.err = ""; netEmit(); } };
  const retryLive = () => { if (host) return false; NET.mode = PROXY ? "proxy" : "exchange"; NET.ok = null; NET.err = ""; netEmit(); return true; };
  /* Claude connectors (Coinbase / Webull through the viewer's own claude.ai connectors): off until the person switches them on in Connect Broker */
  const HOSTDEAD = ["not_granted", "server_not_connected", "selection_required", "needs_reauth"], HOSTSKIP = ["not_in_manifest", "blocked_by_policy", "approval_required", "unavailable"];
  const setHostMcp = on => { cfg.hostMcp = !!on; HOST.dead = {}; HOST.err = ""; save(); netEmit(); hostEmit({ mcp: !!on }); };
  const NO_TRADE = "No trading connection. Outside Claude, orders only go through an MCP server you add with Connect Broker. You can still place this trade in your own broker app.";
  const PRACTICE = {
    coinbase_balance: () => ({ accounts: [{ currency: "USD", available_balance: { value: String(cfg.practice || 0) }, hold: { value: "0" } }] }),
    coinbase_fees: () => ({ fee_tier: null }), coinbase_portfolios_list: () => ({ portfolios: [] }),
    coinbase_orders_list: () => ({ orders: [] }), coinbase_orders_fills: () => ({ fills: [] }),
    coinbase_orders_preview: () => { throw E("tool_error", NO_TRADE); }, coinbase_orders_create: () => { throw E("tool_error", NO_TRADE); }, coinbase_orders_cancel: () => { throw E("tool_error", NO_TRADE); },
    get_stock_bars_single: () => { throw E("tool_error", "Stock charts need a data server that has stock bars. Add one with Connect Broker."); }
  };
  const mcp = { async callTool(server, tool, input, opt) { const order = /coinbase_orders_(create|preview)$/.test(tool);
      if (order && NET.sim) throw E("tool_error", "Live orders are off while the chart shows demo prices. Connect live market data first.");
      const srv = serverFor(tool); if (srv) return { payload: await callServer(srv, tool, input) };
      if (hostLive(server)) { try { return await HOST.mcp.callTool(server, tool, input, opt); } catch (e) { const c = e && e.code;
          if (HOSTDEAD.includes(c)) { HOST.dead[server] = c; HOST.err = (server || "The connector") + (c === "not_granted" ? " wasn't allowed for this page." : c === "needs_reauth" ? " needs reconnecting in claude.ai Settings, Connectors." : " isn't connected in claude.ai Settings, Connectors."); netEmit(); hostEmit({ dropped: server, code: c }); if (!PUBLIC[tool] && !PRACTICE[tool]) throw e; }
          else if (!HOSTSKIP.includes(c) || order) throw e; } }
      if (PUBLIC[tool]) { if (NET.mode !== "sim") { try { return { payload: await PUBLIC[tool](input || {}) }; } catch (e) { if (e.code !== "server_unavailable" || hostLive(CBN)) throw e; goSim(); } }
        if (hostLive(CBN)) throw E("server_unavailable", "Your Coinbase connector didn't answer for " + tool + ".", { server: CBN });
        return { payload: SIM[tool](input || {}) }; }
      if (PRACTICE[tool]) return { payload: await PRACTICE[tool](input || {}) };
      throw E("not_in_manifest", "No connection offers " + tool + ".", { server }); } };

  const cap = n => n === "sample" ? (aiReady() ? sample : null) : n === "tts" ? tts : n === "dictation" ? (host ? HOST.dict : dict) : n === "mcp" ? mcp : null;
  const saveFile = async (name, blob) => { if (HOST.dl) { await HOST.dl.save({ filename: name, data: blob }); return true; } if (host) throw E("unavailable", "Saving files isn't available in this view."); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true; };
  const CLAUDE_MODELS = [["auto", "Auto (Claude picks for each task)"], ["claude-fable-5-2", "Claude Fable 5.2"], ["claude-opus-5-5", "Claude Opus 5.5"], ["claude-sonnet-5-5", "Claude Sonnet 5.5"], ["claude-haiku-5-5", "Claude Haiku 5.5"]];
  return { NET, MAXC, inClaude, host, HOST, hostReady, hostLive, setHostMcp, retryLive, CBN, locked, setLock, effModel, enforce, saveFile, CLAUDE_MODELS, get last() { return LAST; }, get lock() { return cfg.aiLock || null; }, PRESETS, get cfg() { return cfg; }, save, aiReady, sample, tts, dict, mcp, cap, connect, connectAll, hasTrading, serverFor, practice: () => NET.sim || (!hostLive(CBN) && !hasTrading()) };
})();

/* ---------- in-page confirm: browsers inside Claude never show confirm(), so every "are you sure" is a real dialog here ---------- */
window.xviConfirm = (text, okLabel, opts) => new Promise(res => { opts = opts || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const w = document.createElement("div"); w.className = "xcf xdev"; w.setAttribute("role", "alertdialog"); w.setAttribute("aria-modal", "true"); w.setAttribute("aria-label", "Please confirm");
  w.style.cssText = "position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:16px;background:rgba(2,8,22,.72);backdrop-filter:blur(4px)";
  w.innerHTML = `<div style="max-width:min(480px,100%);max-height:86vh;overflow:auto;padding:18px;border-radius:16px;border:1px solid rgba(150,212,255,.55);background:linear-gradient(180deg,#0b2452,#061430);color:#eaf4ff;font:14px/1.5 Inter,system-ui,sans-serif;box-shadow:0 0 34px rgba(74,168,255,.45)"><div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(text)}</div>${opts.code ? `<pre style="margin-top:10px;padding:10px;border-radius:10px;background:rgba(0,0,0,.45);font:12px/1.45 'JetBrains Mono',monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:40vh;overflow:auto">${esc(opts.code)}</pre>` : ""}<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:16px"><button type="button" data-v="0" style="padding:9px 16px;border-radius:10px;border:1px solid rgba(150,212,255,.4);background:rgba(10,36,86,.6);color:#eaf4ff;font:600 13px Inter,sans-serif;cursor:pointer">Cancel</button><button type="button" data-v="1" style="padding:9px 16px;border-radius:10px;border:1px solid #7fd0ff;background:#2f7fe6;color:#fff;font:700 13px Inter,sans-serif;cursor:pointer">${esc(okLabel || "Confirm")}</button></div></div>`;
  const prev = document.activeElement, done = v => { document.removeEventListener("keydown", key, true); w.remove(); try { prev && prev.focus && prev.focus(); } catch (e) {} res(v); };
  const key = e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); } else if (e.key === "Tab") { const b = w.querySelectorAll("button"); if (e.shiftKey && document.activeElement === b[0]) { e.preventDefault(); b[1].focus(); } else if (!e.shiftKey && document.activeElement === b[1]) { e.preventDefault(); b[0].focus(); } } };
  w.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) done(b.dataset.v === "1"); else if (e.target === w) done(false); });
  document.addEventListener("keydown", key, true); document.body.append(w); const c = w.querySelector('button[data-v="0"]'); try { c.focus(); } catch (e) {} });
