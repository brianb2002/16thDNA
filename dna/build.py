"""Build the 16th DNA desk: the Holodex room (your original Holodesk layout) + Dev mode + the 16th DNA engine,
   painted in the Bull & Bear theme with the floating 3D glass keys.

   ../holodex/build.py   builds the Holodex + Dev mode page (run first, automatically)
   hooks.py              lets 16th DNA paint into every room surface
   desk.js / desk.css    engine, 3D-key painter, panels, modes (Dashboard / Full screen / Simulation)
   decor.js              Bull & Bear room: clocks, news band, bull and bear, Bitcoin, server walls
   assets/bull.jpg, bear.jpg   hologram sprites

   Writes ../dist/dna-desk.html (Claude artifact fragment) and index.html (full page for a browser).
   Run:  cd dna && python3 build.py """
import os, re, subprocess, sys, base64
H = os.path.dirname(os.path.abspath(__file__)); os.chdir(H)
sys.path.insert(0, H)
from hooks import add_hooks, rep
rd = lambda p: open(p, encoding='utf-8').read()
subprocess.run([sys.executable, 'build.py'], cwd=os.path.join(H, '..', 'holodex'), check=True)
t = rd('../holodex/index.html')

# separate storage from the Holodex build, room interactions on (long-press moves screens; desk keys work)
t = t.replace('holodex_dev_v1', 'dna_desk_dev_v1')
t = rep(t, 'localStorage.getItem("hx_room_taps") === "1"', 'localStorage.getItem("hx_room_taps") !== "0"')
t = t.replace('.xcf,.xcf *))', '.xcf,.xcf *,.dna,.dna *))')
t = rep(t, 'app: "C-LO Holodex"', 'app: "16th DNA Desk"')

# paint hooks + engine access
t = add_hooks(t)
t = rep(t, 'const camera=new THREE.PerspectiveCamera(55,1,.1,100);', 'const camera=new THREE.PerspectiveCamera(55,1,.1,100);window.__HX3={renderer,scene,camera,THREE};')
t = rep(t, "const clockEl=document.getElementById('clock');", "window.__HXREDRAW=redraw;const clockEl=document.getElementById('clock');")
t = rep(t, 'sceneStep(now,dt);placeCam();', 'sceneStep(now,dt);try{window.DNA_FRAME&&window.DNA_FRAME(now,dt)}catch(e){}placeCam();')
# full 360 from the chair
t = rep(t, "YMAX=()=>SCENE==='team'?PI:115*D;", "YMAX=()=>PI;window.__seatLook=(y,p)=>goTo(seatG(y,p));")
# taps: 16th DNA keys first; ring tiles and strategy holograms go to 16th DNA; the old Holodex readout sheets stay off
t = rep(t, " if(EDIT.on||!id)return;\n if(SET.popups)", " if(EDIT.on||!id)return;if(window.DNA_TAP&&window.DNA_TAP(o,h))return;if(window.DNA_ON)return;\n if(SET.popups)")

def uri(p, mime): return 'data:%s;base64,%s' % (mime, base64.b64encode(open(p, 'rb').read()).decode())
decor = rd('decor.js').replace('"/*BULL*/"', '"' + uri('assets/bull.jpg', 'image/jpeg') + '"').replace('"/*BEAR*/"', '"' + uri('assets/bear.jpg', 'image/jpeg') + '"')
boot = """<script id="dna-boot">(function(){function go(){var a=document.getElementById('th-dark');if(a&&document.documentElement.dataset.hxTheme!=='dark')a.click();var s=document.getElementById('vw-seat');if(s)s.click();}
if(document.readyState==='complete')setTimeout(go,400);else addEventListener('load',function(){setTimeout(go,400)});})();</script>"""
add = ('\n<!-- 16TH DNA DESK -->\n<style id="dna-css">\n' + rd('desk.css') + '\n</style>\n<script id="dna-desk">\n' + rd('desk.js') + '\n</script>\n<script id="dna-decor">\n' + decor + '\n</script>\n' + boot + '\n')
t = rep(t, '</body></html>', add + '</body></html>')
t = re.sub(r'<title>[^<]*</title>', '<title>16th DNA Desk</title>', t, count=1)
open('index.html', 'w', encoding='utf-8').write(t)
print('built dna/index.html', len(t), 'bytes')

head, body = t.split('<body>', 1)
head = head.split('<head>', 1)[1].replace('</head>', '')
head = re.sub(r'<meta charset[^>]*>|<meta name=viewport[^>]*>|<link rel="(manifest|apple-touch-icon|icon)"[^>]*>|<meta name="(theme-color|mobile-web-app-capable|apple-mobile-web-app-[a-z-]+)"[^>]*>', '', head)
head = re.sub(r'^\s*<style>:root\{color-scheme:light;box-sizing:border-box;.*?</style>', '', head, count=1, flags=re.S)
body = body.rsplit('</body>', 1)[0]
m = re.match(r'\s*(<title>[^<]*</title>\s*<meta name="claude:viewport-fit-sides"[^>]*>)', body)
if m: frag = m.group(1) + '\n' + head.strip() + '\n' + body[m.end():]
else:
    tm = re.search(r'<title>[^<]*</title>', head); head2 = head.replace(tm.group(0), '') if tm else head
    frag = (tm.group(0) if tm else '<title>16th DNA Desk</title>') + '\n' + head2.strip() + '\n' + body
frag = re.sub(r'<title>[^<]*</title>', '<title>16th DNA Desk</title>', frag, count=1)
os.makedirs('../dist', exist_ok=True); open('../dist/dna-desk.html', 'w', encoding='utf-8').write(frag)
print('built dist/dna-desk.html', len(frag), 'bytes')
