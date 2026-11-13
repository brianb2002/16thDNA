import base64, os, urllib.parse
H = os.path.dirname(os.path.abspath(__file__)); os.chdir(H)
def asset(f):
    ext = f.rsplit('.', 1)[1]; mt = {'webp': 'image/webp', 'jpg': 'image/jpeg', 'png': 'image/png'}[ext]
    return 'data:%s;base64,%s' % (mt, base64.b64encode(open('assets/' + f, 'rb').read()).decode())
A = {f.rsplit('.', 1)[0]: asset(f) for f in sorted(os.listdir('assets'))}
xa = 'window.XASSET={' + ','.join('%s:"%s"' % (k, v) for k, v in A.items()) + '};\n'
icon = 'data:image/svg+xml,' + urllib.parse.quote(open('../icon.svg').read().strip())
t=open('template2.html').read(); u=open('voice.js').read()+"\n"+open('universal.js').read()+"\n"+open('ui2.js').read()+"\n"+xa+open('skin.js').read()+"\n"+open('skin2.js').read()+"\n"+open('skin3.js').read()+"\n"+open('skin4.js').read()+"\n"+open('skin6.js').read()+"\n"+open('devmode.js').read()
t=t.replace('/*ICON*/',icon).replace('/*SKINCSS*/',open('skin.css').read()+"\n"+open('skin2.css').read()+"\n"+open('skin4.css').read()+"\n"+open('skin5.css').read()+"\n"+open('skin6.css').read()+"\n"+open('devmode.css').read())
t=t.replace('/*BRAIN*/',open('brain.js').read()).replace('/*CORE*/',open('core.js').read()).replace('/*UI*/',u)
open('../index.html','w').write(t)
print('built ../index.html', len(t), 'bytes')

# ---- Claude artifact build: the same app as a body fragment (the publisher adds the document skeleton) ----
import re
a = t
a = re.sub(r'<link rel="manifest"[^>]*>', '', a); a = re.sub(r'<link rel="apple-touch-icon"[^>]*>', '', a); a = re.sub(r'<link rel="icon"[^>]*>', '', a)
a = re.sub(r'<meta name="theme-color"[^>]*>', '', a); a = re.sub(r'<meta charset[^>]*>\s*', '', a); a = re.sub(r'<meta name="viewport"[^>]*>\s*', '', a)
a = a.replace('<title>XVI DNA · Holo Desk</title>', '<title>XVI DNA Holo Desk</title>')
for tag in (r'<!DOCTYPE html>\s*', r'<html[^>]*>\s*', r'<head>\s*', r'</head>\s*', r'<body[^>]*>\s*', r'</body>\s*', r'</html>\s*'):
    a, n = re.subn(tag, '', a, count=1); assert n == 1, tag
a = a.replace('<style>', '<style>:root{color-scheme:dark}\n', 1)
os.makedirs('../dist', exist_ok=True); open('../dist/xvi-dna-holo-desk.html', 'w').write(a)
print('built ../dist/xvi-dna-holo-desk.html', len(a), 'bytes')
