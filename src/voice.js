/* ===== XVI DNA coach voice (shared by the coach app and the holo desk) =====
   Natural browser voices matched to the coach (male / female), a calm teaching delivery,
   text cleaned for speech, and an optional premium OpenAI voice (off by default). */
(function () {
  if (window.XVoice) return;
  var SS = window.speechSynthesis, HAS = !!(SS && window.SpeechSynthesisUtterance);
  var SKEY = 'xvi_voice', ONKEY = 'xvi_voice_on';
  function load() { try { return Object.assign({ uri: 'auto', premium: false }, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) { return { uri: 'auto', premium: false }; } }
  var cfg = load();
  function save() { try { localStorage.setItem(SKEY, JSON.stringify(cfg)); } catch (e) {} fire(); }
  var T0 = Date.now(), lastG = null; var subs = []; function fire() { subs.forEach(function (f) { try { f(); } catch (e) {} }); }
  function gender() { try { return localStorage.getItem('xvi_coach') === 'male' ? 'male' : 'female'; } catch (e) { return 'female'; } }

  /* ---------- voice catalogue ---------- */
  var MALE = /\b(male|man|guy|andrew|brian|christopher|eric|roger|steffan|davis|tony|jason|ryan|thomas|william|liam|daniel|alex|fred|aaron|arthur|oliver|gordon|lee|rishi|tom|evan|nathan|david|mark|george|james|matthew|joey|justin|kevin|stephen|connor|prabhat|luca|reed|rocko|grandpa|ralph|albert|bruce|junior)\b/i;
  var FEMALE = /\b(female|woman|aria|jenny|emma|ava|michelle|ana|sonia|libby|natasha|clara|samantha|victoria|karen|moira|tessa|fiona|serena|allison|susan|zira|hazel|heera|kate|catherine|martha|nicky|joanna|salli|kimberly|ivy|kendra|zoe|sara|nancy|jane|elizabeth|amy|olivia|maisie|neerja|emily|ruth|kathy|shelley|sandy|flo|grandma|agnes|princess|vicki|jessa|nora|amber|ashley|cora|monica|elsa)\b/i;
  function vGender(v) { var n = v.name.replace(/Microsoft|Google|Online|Natural|Premium|Enhanced|Siri|English|United States|United Kingdom|\(|\)|-/gi, ' ');
    if (/Google UK English Male/i.test(v.name)) return 'male'; if (/Google UK English Female|Google US English/i.test(v.name)) return 'female';
    if (FEMALE.test(n)) return 'female'; if (MALE.test(n)) return 'male'; return ''; }
  function tier(v) { var n = v.name;
    if (/Microsoft/i.test(n) && /Natural/i.test(n)) return 4;          /* Edge / Windows neural voices */
    if (/^Google (UK|US) English/i.test(n)) return 3;                   /* Chrome network voices */
    if (/Siri|Premium|Enhanced/i.test(n) || (!v.localService && !/Microsoft/i.test(n))) return 2.5; /* macOS high quality */
    if (/^(Daniel|Alex|Samantha|Ava|Karen|Moira|Tessa|Serena|Allison|Susan|Tom|Oliver|Evan|Nathan|Zoe)\b/i.test(n)) return 2;
    if (/eSpeak|espeak/i.test(n)) return 0;                              /* very robotic */
    return 1; }
  function voices() { if (!HAS) return []; try { return SS.getVoices() || []; } catch (e) { return []; } }
  function en(v) { return /^en([-_]|$)/i.test(v.lang || ''); }
  function rank(g) { var loc = (navigator.language || 'en-US').toLowerCase();
    return voices().filter(en).map(function (v) { var vg = vGender(v), s = tier(v) * 10;
      if (vg === g) s += 25; else if (vg) s -= 30;
      if ((v.lang || '').toLowerCase().replace('_', '-') === loc) s += 3; else if (/en-(us|gb)/i.test(v.lang)) s += 2;
      if (/Andrew|Ava|Emma|Brian/i.test(v.name) && /Natural/i.test(v.name)) s += 2; /* newest, most conversational neural voices */
      if (v.default) s += 0.5; return { v: v, s: s, g: vg }; }).sort(function (a, b) { return b.s - a.s; }); }
  function chosen(g) { g = g || gender(); var all = voices();
    if (cfg.uri && cfg.uri !== 'auto') { var f = all.find(function (v) { return v.voiceURI === cfg.uri; }); if (f) return { v: f, g: vGender(f) || g, manual: true }; }
    var r = rank(g); return r.length ? { v: r[0].v, g: r[0].g } : { v: null, g: '' }; }
  if (HAS && SS.addEventListener) SS.addEventListener('voiceschanged', fire);

  /* ---------- text cleaned for speech ---------- */
  var TICK = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', XRP: 'X R P', DOGE: 'Dogecoin', ADA: 'Cardano', AVAX: 'Avalanche', DOT: 'Polkadot', LINK: 'Chainlink', LTC: 'Litecoin', BCH: 'Bitcoin Cash', USDC: 'U S D C', USDT: 'Tether', SPY: 'the S and P 500 fund', QQQ: 'the Nasdaq fund', NVDA: 'Nvidia', TSLA: 'Tesla', AAPL: 'Apple', MSFT: 'Microsoft', AMZN: 'Amazon', GOOGL: 'Google', META: 'Meta' };
  var ABBR = { EMA: 'E M A', SMA: 'S M A', RSI: 'R S I', ATR: 'A T R', ADX: 'A D X', MACD: 'mac D', VWAP: 'V wap', FVG: 'fair value gap', OB: 'order block', PnL: 'profit and loss', 'P&L': 'profit and loss', ETF: 'E T F', MCP: 'M C P', AI: 'A I', TP: 'take profit', SL: 'stop loss', 'R:R': 'risk to reward', RR: 'risk to reward', UTC: 'U T C', API: 'A P I', USD: 'dollars', OK: 'okay' };
  function clean(t) {
    t = String(t || '');
    t = t.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' a link ');
    t = t.replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*[-*•+]\s+/gm, '').replace(/^\s*\d+[.)]\s+/gm, '').replace(/^\s*>\s?/gm, '').replace(/(\*\*|__|\*|_|~~)(\S[^*_~]*?)\1/g, '$2');
    try { t = t.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/gu, ''); } catch (e) { t = t.replace(/[\uD800-\uDFFF]/g, ''); }
    t = t.replace(/([A-Z]{2,6})[-\/](USDC?|USDT|PERP|INTX)\b/g, '$1').replace(/\b(\d+)\s?:\s?(\d+)\b(?![:\d])/g, function (m, a, b) { return +a < 25 && +b < 60 && /\d:\d\d/.test(m) ? m : a + ' to ' + b; });
    t = t.replace(/[≈~]\s?(?=\d|\$)/g, 'about ').replace(/±/g, 'plus or minus ').replace(/×/g, ' times ').replace(/(\d)\s?x\b/g, '$1 times').replace(/≥/g, ' at least ').replace(/≤/g, ' at most ').replace(/→|⇒|->/g, ', then ').replace(/←/g, ' ').replace(/&/g, ' and ').replace(/\bvs\.?\b/gi, 'versus').replace(/\be\.g\./gi, 'for example').replace(/\bi\.e\./gi, 'that is').replace(/\betc\./gi, 'and so on');
    t = t.replace(/([+\-−])?\$\s?(\d[\d,]*(?:\.\d+)?)\s?([kKmMbB])?\b/g, function (m, s, n, k) { return (s === '-' || s === '−' ? 'minus ' : s === '+' ? 'plus ' : '') + n + (k ? { k: ' thousand', m: ' million', b: ' billion' }[k.toLowerCase()] : '') + ' dollars'; });
    t = t.replace(/(^|[\s(])[+](\d)/g, '$1plus $2').replace(/(^|[\s(])[-−](\d)/g, '$1minus $2');
    t = t.replace(/\b(up|down|fell|rose|gained|lost|dropped|climbed|slid)\s+(plus|minus)\s/gi, '$1 ');
    t = t.replace(/(\d)\s?%/g, '$1 percent').replace(/(\d)\s?bps\b/gi, '$1 basis points').replace(/\b(\d+)\s?k\b/g, '$1 thousand');
    t = t.replace(/\b(\d+)\s?(m|min)\b/g, '$1 minute').replace(/\b(\d+)\s?h\b/g, '$1 hour').replace(/\b(\d+)\s?d\b/g, '$1 day').replace(/\b(\d+)R\b/g, '$1 R');
    t = t.replace(/\bP&L\b|P\s?&\s?L/g, 'profit and loss').replace(/\bR:R\b/g, 'risk to reward');
    t = t.replace(/\b([A-Z]{2,5})\b/g, function (m) { return TICK[m] || ABBR[m] || m; });
    t = t.replace(/[|•·▲▼▴▾◆◇■□●○★☆✓✔✕✖✗✘#*_^<>{}\[\]\\=]+/g, ', ').replace(/\s*[—–]\s*/g, ', ').replace(/\.{3}|…/g, '. ');
    t = t.replace(/\s*,\s*(,\s*)+/g, ', ').replace(/\s+([,.;:!?])/g, '$1').replace(/^[,\s]+/gm, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '.\n').trim();
    return t; }
  function sentences(t) {
    var parts = t.replace(/([A-Za-z0-9)%])[ \t]*\n/g, '$1.\n').replace(/([.!?;])\s+/g, '$1\n').split(/\n+/).map(function (s) { return s.trim(); }).filter(function (s) { return s && /[A-Za-z0-9]/.test(s); }), out = [];
    parts.forEach(function (s) { while (s.length > 200) { var c = s.lastIndexOf(', ', 180); if (c < 60) c = s.lastIndexOf(' ', 180); if (c < 40) c = 180; out.push(s.slice(0, c + 1).trim()); s = s.slice(c + 1).trim(); } if (s) out.push(s); });
    return out; }

  /* ---------- delivery ---------- */
  var run = 0, audio = null;
  function prosody(g, v) { var vg = (v && vGender(v)) || g; var nat = v && tier(v) >= 3;
    return { rate: nat ? 0.94 : 0.92, pitch: vg === 'male' ? 0.93 : (g === 'male' && !vg ? 0.86 : 1.0), volume: 0.88 }; }
  function stop() { run++; try { if (HAS) SS.cancel(); } catch (e) {} if (audio) { try { audio.pause(); } catch (e) {} audio = null; } return Promise.resolve(); }
  function pause(ms, id) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function sayOne(s, ch, pr) { return new Promise(function (res) { try { var u = new SpeechSynthesisUtterance(s); if (ch.v) { u.voice = ch.v; u.lang = ch.v.lang; } u.rate = pr.rate; u.pitch = pr.pitch; u.volume = pr.volume; var done = false, fin = function () { if (!done) { done = true; clearTimeout(wd); res(); } }; u.onend = fin; u.onerror = fin; var wd = setTimeout(fin, 2500 + s.length * 110); SS.speak(u); } catch (e) { res(); } }); }
  async function browserSpeak(t, o, id) {
    if (!HAS) return; var ch = chosen(o.gender), pr = prosody(o.gender || gender(), ch.v);
    if (o.rate) pr.rate = Math.min(pr.rate, o.rate);
    var ss = sentences(t);
    for (var i = 0; i < ss.length && id === run; i++) {
      await sayOne(ss[i], ch, pr);
      if (id !== run) return;
      if (i < ss.length - 1) await pause(/[.!?]$/.test(ss[i]) ? 300 : /;$/.test(ss[i]) ? 200 : 150, id);
    } }
  function openaiKey() { try { var c = JSON.parse(localStorage.getItem('tc_uni') || '{}'), a = c.ai || {}; if (a.provider === 'openai' && a.key) return { key: a.key, base: (a.base || 'https://api.openai.com/v1').replace(/\/+$/, '') }; } catch (e) {} return null; }
  var OAI_V = { male: 'onyx', female: 'nova' };
  async function premiumSpeak(t, o, id) {
    var k = openaiKey(); if (!k) throw new Error('nokey');
    var g = o.gender || gender(), chunks = [], cur = '';
    sentences(t).forEach(function (s) { if ((cur + ' ' + s).length > 700 && cur) { chunks.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s; }); if (cur) chunks.push(cur);
    var fetchOne = function (txt) { return fetch(k.base + '/audio/speech', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + k.key },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: OAI_V[g], input: txt, response_format: 'mp3', speed: 0.96, instructions: 'You are a calm, warm trading teacher. Speak naturally and unhurried, with gentle emphasis and short pauses between ideas, like explaining to one student at a desk. Never sound robotic or salesy.' }) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.blob(); }); };
    var next = fetchOne(chunks[0]);
    for (var i = 0; i < chunks.length && id === run; i++) {
      var blob = await next; if (i + 1 < chunks.length) next = fetchOne(chunks[i + 1]);
      if (id !== run) return;
      await new Promise(function (res) { var url = URL.createObjectURL(blob); audio = new Audio(url); audio.volume = 0.92; audio.onended = audio.onerror = function () { URL.revokeObjectURL(url); res(); }; audio.play().catch(function () { res(); }); });
    } }
  async function speak(text, o) {
    o = o || {}; await stop(); var id = run, t = clean(text); if (!t) return;
    if (cfg.premium && openaiKey()) { try { await premiumSpeak(t, o, id); return; } catch (e) { if (id !== run) return; XV.lastError = 'Premium voice unavailable (' + (e.message || 'error') + '); using a browser voice.'; fire(); } }
    await browserSpeak(t, o, id); }

  /* ---------- small settings UI (used by both apps) ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function label(v) { var g = vGender(v), q = tier(v); return v.name.replace(/^Microsoft /, '').replace(/ - English \((.+)\)/, ' · $1') + (g ? ' (' + g + ')' : '') + (q >= 3 ? ' ★' : ''); }
  function mount(el, opts) {
    opts = opts || {};
    function render() {
      var g = gender(), ch = chosen(g), list = voices().filter(en).sort(function (a, b) { return tier(b) - tier(a) || a.name.localeCompare(b.name); }), others = voices().filter(function (v) { return !en(v); }), k = !!openaiKey();
      el.innerHTML = '<div class="xv-row"><label for="xvSel">Voice</label><select id="xvSel" class="xv-sel"><option value="auto">Auto · matches the ' + g + ' coach' + (ch.v && !ch.manual ? ' (' + esc(label(ch.v)) + ')' : '') + '</option>' +
        list.map(function (v) { return '<option value="' + esc(v.voiceURI) + '"' + (cfg.uri === v.voiceURI ? ' selected' : '') + '>' + esc(label(v)) + '</option>'; }).join('') +
        (others.length ? '<optgroup label="Other languages">' + others.map(function (v) { return '<option value="' + esc(v.voiceURI) + '"' + (cfg.uri === v.voiceURI ? ' selected' : '') + '>' + esc(v.name + ' · ' + v.lang) + '</option>'; }).join('') + '</optgroup>' : '') + '</select></div>' +
        '<label class="xv-row xv-prem' + (k ? '' : ' off') + '"><input type="checkbox" id="xvPrem"' + (cfg.premium ? ' checked' : '') + (k ? '' : ' disabled') + '> <span>Premium voice (uses your OpenAI key)' + (k ? '' : ' · connect OpenAI with Connect AI first') + '</span></label>' +
        '<div class="xv-row"><button type="button" class="xv-test ' + (opts.btnClass || '') + '">Test voice</button><small class="xv-note">' + (!HAS && !k ? 'This browser has no built-in speech.' : list.length ? (ch.v ? 'Now: ' + esc(label(ch.v)) : '') : (Date.now() - T0 < 3000 ? 'Voices are still loading…' : 'No voices are installed, so the browser default voice is used. Add voices in your system speech settings for a more natural sound.')) + (XV.lastError ? ' · ' + esc(XV.lastError) : '') + '</small></div>';
      el.querySelector('#xvSel').onchange = function (e) { cfg.uri = e.target.value; save(); };
      el.querySelector('#xvPrem').onchange = function (e) { cfg.premium = e.target.checked; XV.lastError = ''; save(); };
      el.querySelector('.xv-test').onclick = function () { var g2 = gender(); speak(g2 === 'male' ? "Hi, I'm your coach. Let's take this one step at a time. When BTC pulls back to the 21 EMA, we look for a calm entry, and we set the stop first." : "Hi, I'm your coach. Let's take this slowly. Before any trade, we decide where we're wrong, place the stop, and only risk about 1% of the account."); };
    }
    render(); if (!voices().filter(en).length) setTimeout(function () { if (el.isConnected && !el.contains(document.activeElement)) render(); }, Math.max(0, 3100 - (Date.now() - T0))); var un = function () { if (el.isConnected) { if (!el.contains(document.activeElement)) render(); } else subs.splice(subs.indexOf(un), 1); }; subs.push(un); return render; }

  var XV = window.XVoice = { available: HAS || !!openaiKey(), speak: speak, stop: stop, clean: clean, sentences: sentences, chosen: chosen, rank: rank, gender: gender, mount: mount, cfg: function () { return cfg; }, on: function (f) { subs.push(f); }, lastError: '',
    isOn: function () { try { return localStorage.getItem(ONKEY) === '1'; } catch (e) { return false; } }, setOn: function (b) { try { localStorage.setItem(ONKEY, b ? '1' : '0'); } catch (e) {} if (!b) stop(); fire(); } };
  lastG = gender(); setInterval(function () { var g = gender(); if (g !== lastG) { lastG = g; fire(); } }, 700);
  window.addEventListener('storage', function (e) { if (e.key === SKEY) { cfg = load(); fire(); } if (e.key === 'xvi_coach' || e.key === ONKEY) fire(); });
})();
