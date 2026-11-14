"""Build the Holodex dashboard with Dev mode.

   holodex/shell.html   your HOLODEX-SHELL page, kept exactly as you sent it
   holodex/bridge.js    Dev mode <-> Holodex wiring (actions, layers, live data, DEV launcher)
   holodex/holodex.css  launcher style
   ../src/universal.js, ../src/devmode.js, ../src/devmode.css   the XVI Dev mode (shared, unmodified on disk)

   Writes ../dist/holodex-dev.html : a Claude artifact page (body fragment; the publisher adds the skeleton)
          holodex/index.html       : the same page as a full document, to open in a browser
   Run:  cd holodex && python3 build.py """
import os, re
H = os.path.dirname(os.path.abspath(__file__)); os.chdir(H)
rd = lambda p: open(p, encoding='utf-8').read()
t = rd('shell.html')

def rep(s, a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:80]); return s.replace(a, b)

# 1. keep the shell's blank-button look away from Dev mode's own UI and the components you place
NOT = ':not(:where([id^=xdev],[id^=xdev] *,.xdev,.xdev *,.xdc,.xdc *,.xcf,.xcf *))'
t = rep(t, '\nbutton{background:var(--tile)!important', '\nbutton' + NOT + '{background:var(--tile)!important')
t = rep(t, '\nbutton *{color:transparent!important', '\nbutton' + NOT + ' *{color:transparent!important')
t = rep(t, '\nbutton svg,button img,button picture,button canvas{opacity:0!important}', '\nbutton' + NOT + ' svg,button' + NOT + ' img,button' + NOT + ' picture,button' + NOT + ' canvas{opacity:0!important}')
t = rep(t, "document.querySelectorAll('button[title]')", "document.querySelectorAll('button[title]" + NOT + "')")
# 2. no service worker inside an artifact (it only 404s)
t = rep(t, "<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});}</script>", '')

# 2b. theme flicker: the Claude viewer writes data-theme on the page root to sync its own light/dark mode, and
#     the Holodex kept its Day/Night choice in that same attribute (and also followed system light/dark changes),
#     so the 3D room kept flipping. The Holodex now keeps its theme in data-hx-theme, pinned at load, and only its
#     own Day / Night / Risk controls change it.
t = rep(t, ':root:not([data-theme="light"])', ':root:not([data-hx-theme="light"])')
t = rep(t, ':root[data-theme="dark"]', ':root[data-hx-theme="dark"]')
t = rep(t, "if(st==='dark'||st==='light')root.dataset.theme=st;", "root.dataset.hxTheme=(st==='dark'||st==='light')?st:(mq.matches?'dark':'light');")
t = rep(t, 'root.dataset.theme', 'root.dataset.hxTheme', 5)
t = rep(t, "attributeFilter:['data-theme']", "attributeFilter:['data-hx-theme']")
t = rep(t, "if(mq.addEventListener)mq.addEventListener('change',syncTheme);else if(mq.addListener)mq.addListener(syncTheme);", "")
assert 'data-theme' not in t.split('<!-- DEV MODE')[0] and 'dataset.theme' not in t

# 2c. the blank desk buttons and screens in the 3D room ran the Holodex's old tap handlers (readout sheets,
#     desk actions). Room taps are off unless turned on (Dev mode action "Room · 3D desk taps on / off").
#     Dragging to look around, pinch / wheel zoom and long-press to move a screen still work.
t = rep(t, "if(h)tap(h);else if(GRAB)releaseGrab()", "if(h&&window.HX_ROOM_TAPS)tap(h);else if(GRAB)releaseGrab()")
#     the same switch covers the rest of the old room behavior: long-press to pick up a screen, dragging the ticker
#     ring / hologram to spin them, and the pointer cursor over room objects. Plain drag-to-look and zoom stay.
t = rep(t, "mode=o&&tileSet.has(o)?'spin-ring':o&&stationSet.has(o)?'spin-holo':'orbit';", "mode=window.HX_ROOM_TAPS&&o&&tileSet.has(o)?'spin-ring':window.HX_ROOM_TAPS&&o&&stationSet.has(o)?'spin-holo':'orbit';")
t = rep(t, "if(SET.hold&&o&&grabKind(o))lpT=", "if(SET.hold&&window.HX_ROOM_TAPS&&o&&grabKind(o))lpT=")
t = rep(t, "const h=hit(e.clientX,e.clientY);cv.style.cursor=h?", "const h=window.HX_ROOM_TAPS?hit(e.clientX,e.clientY):null;cv.style.cursor=h?")

# 3. Dev mode, pointed at the Holodex
dm = rd('../src/devmode.js')
dm = rep(dm, 'LS = "xvi_dev_v7"', 'LS = "holodex_dev_v1"')
dm = rep(dm, 'const REG = [', 'const REG = window.XDEV_REG || [')
dm = rep(dm, '.map(k => [k, k]);', '.map(k => [k, (xvi6.ACTL && xvi6.ACTL[k]) || k]);')
dm = rep(dm, '[["holo", "Toggle coach hologram"], ["sym:next", "Next symbol"], ["sym:prev", "Previous symbol"], ["link", "Custom link"]]', '(window.XDEV_FIXED || [["holo", "Toggle coach hologram"], ["sym:next", "Next symbol"], ["sym:prev", "Previous symbol"], ["link", "Custom link"]])')
dm = rep(dm, 'You restyle the XVI DNA trading-education web app (dark navy holo-glass look, accent #4cc3ff, fonts Orbitron/Rajdhani).', 'You restyle the C-LO Holodex trading dashboard (frosted-blue holo-glass panels over a 3D trading floor, fonts Orbitron/Rajdhani/Share Tech Mono).')
dm = rep(dm, 'app: "XVI DNA"', 'app: "C-LO Holodex"')
dm = rep(dm, "<small class='hint'>off (no WebGL)</small>", "<small class='hint'>The 3D dashboard is one layer here. Its wall screens can't be picked one by one.</small>")
dm = rep(dm, 'No AI connected. Use the editor below, or press Connect AI on the desk.', 'No AI connected. Open this page inside Claude to edit with AI, or use the editor below.')
dm = rep(dm, 'No AI connected. Press Connect AI on the desk (or Settings → AI). Meanwhile use the editor below.', 'No AI connected. Open this page inside Claude to edit with AI. Meanwhile use the editor below.')
add = ('\n<!-- DEV MODE (XVI DNA) -->\n<style id="xdev-css">\n' + rd('../src/devmode.css') + '\n' + rd('holodex.css') + '\n</style>\n'
       '<script id="xdev-uni">\n' + rd('../src/universal.js') + '\n</script>\n'
       '<script id="xdev-bridge">\n' + rd('bridge.js') + '\n</script>\n'
       '<script id="xdev-js">\n' + dm + '\n</script>\n')
t = rep(t, '</body></html>', add + '</body></html>')
open('index.html', 'w', encoding='utf-8').write(t)
print('built holodex/index.html', len(t), 'bytes')

# 4. artifact fragment: drop the document skeleton and the install-as-app tags, keep everything else in order
head, body = t.split('<body>', 1)
head = head.split('<head>', 1)[1].replace('</head>', '')
head = re.sub(r'<meta charset[^>]*>|<meta name=viewport[^>]*>|<link rel="(manifest|apple-touch-icon|icon)"[^>]*>|<meta name="(theme-color|mobile-web-app-capable|apple-mobile-web-app-[a-z-]+)"[^>]*>', '', head)
head = re.sub(r'^\s*<style>:root\{color-scheme:light;box-sizing:border-box;.*?</style>', '', head, count=1, flags=re.S)  # the platform reset; the publisher adds its own
body = body.rsplit('</body>', 1)[0]
m = re.match(r'\s*(<title>[^<]*</title>\s*<meta name="claude:viewport-fit-sides"[^>]*>)', body); assert m
frag = m.group(1) + '\n' + head.strip() + '\n' + body[m.end():]
os.makedirs('../dist', exist_ok=True); open('../dist/holodex-dev.html', 'w', encoding='utf-8').write(frag)
print('built dist/holodex-dev.html', len(frag), 'bytes')
