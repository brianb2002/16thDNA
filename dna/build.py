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

# sharper screens: surface canvases render at up to 1.6x; drawing code and tap math still see the original size
t = rep(t, "function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}",
  "function mk(w,h){const c=document.createElement('canvas'),S=(w>=256&&h>=200)?Math.min(window.HX_RES||1.6,4096/w,4096/h):1;c.width=Math.round(w*S);c.height=Math.round(h*S);"
  "if(S>1.01){Object.defineProperty(c,'width',{get:()=>w,set:()=>{},configurable:true});Object.defineProperty(c,'height',{get:()=>h,set:()=>{},configurable:true});"
  "const gc=HTMLCanvasElement.prototype.getContext;c.getContext=function(k,o){const g=gc.call(c,k,o);if(g&&k==='2d'&&!g.__hxs){g.scale(S,S);g.__hxs=1}return g}}return c}")
# crisper text: only the brightest glows bloom
t = rep(t, "new THREE.UnrealBloomPass(new THREE.Vector2(256,256),.95,.45,.06)", "new THREE.UnrealBloomPass(new THREE.Vector2(256,256),.6,.4,.55)")
# shell objects the 3D Dev mode needs
t = rep(t, "function hit(x,y){", "window.__hxHit=(x,y)=>hit(x,y);function hit(x,y){")
t = rep(t, "holo.position.set(0,7.25,-.6);scene.add(holo);", "holo.position.set(0,7.25,-.6);scene.add(holo);window.__hxHolo=holo;")
t = rep(t, "const surfOf=new WeakMap();", "const surfOf=window.__hxSurf=new Map();")
assert "window.__hxSurf" in t, "surfOf export"
# Dev mode: pick single 3D things on the Holodex canvas (#gl)
t = rep(t, 'if (el.id === "x3d" && window.xvi6 && xvi6.pick3d)', 'if ((el.id === "x3d" || el.id === "gl") && window.xvi6 && xvi6.pick3d)')
t = rep(t, '  if (s.kind === "3d") return `<div class="selh"><b>3D', '  if (s.kind === "3d" && window.XDEV_3D) return XDEV_3D.panel(s);\n  if (s.kind === "3d") return `<div class="selh"><b>3D')
t = rep(t, 'if (UI.sel.kind === "3d") { try { const p = xvi6.pick3dById ? null : null; return UI.sel.rect; }', 'if (UI.sel.kind === "3d") { try { if (window.XDEV_3D) { const r3 = XDEV_3D.rect(UI.sel.id); if (r3) UI.sel.rect = r3; } return UI.sel.rect; }')
t = rep(t, 'if (h.kind === "3d") { toastD("3D screens can', 'if (h.kind === "3d" && window.XDEV_3D) { XDEV_3D.erase(h); return; } if (h.kind === "3d") { toastD("3D screens can')
t = rep(t, 'h += `<h5>3D room</h5>` + ((window.xvi6 && xvi6.layout)', 'h += `<h5>3D room</h5>` + (window.XDEV_3D ? XDEV_3D.layers() : (window.xvi6 && xvi6.layout)')
t = rep(t, "const CSTATE = {}; let PZ = 0;", "const CSTATE = {}; let PZ = 0; window.XDEV_SELECT = h => select(h); window.XDEV_SEL = () => UI.sel; window.XDEV_RENDER = () => renderPanel(); window.XDEV_RUN = a => runAction({}, a); window.XDEV_ACTS = () => ACTN();")

def uri(p, mime): return 'data:%s;base64,%s' % (mime, base64.b64encode(open(p, 'rb').read()).decode())
simimg = '{' + ','.join('"%s":"%s"' % (k, uri('../src/assets/sim_%s.webp' % k, 'image/webp')) for k in ['cb', 'tv', 'wb', 'mt', 'tos', 'nt']) + '}'
decor = rd('decor.js').replace('"/*BULL*/"', '"' + uri('assets/bull.jpg', 'image/jpeg') + '"').replace('"/*BEAR*/"', '"' + uri('assets/bear.jpg', 'image/jpeg') + '"')
boot = """<script id="dna-boot">(function(){function go(){var a=document.getElementById('th-dark');if(a&&document.documentElement.dataset.hxTheme!=='dark')a.click();var s=document.getElementById('vw-seat');if(s)s.click();}
if(document.readyState==='complete')setTimeout(go,400);else addEventListener('load',function(){setTimeout(go,400)});})();</script>"""
add = ('\n<!-- 16TH DNA DESK -->\n<style id="dna-css">\n' + rd('desk.css') + '\n</style>\n<script id="dna-prochart">\n' + rd('prochart.js') + '\n</script>\n<script id="dna-desk">\nwindow.DNA_SIMIMG=' + simimg + ';\n' + rd('desk.js') + '\n</script>\n<script id="dna-decor">\n' + decor + '\n</script>\n<script id="dna-dev3d">\n' + rd('dev3d.js') + '\n</script>\n' + boot + '\n')
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
