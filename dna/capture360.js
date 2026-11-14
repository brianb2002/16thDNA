// Renders a 360° equirectangular panorama of the Holodex room from the trader's chair (eye at 0, 1.72, 0.15).
// Usage: node capture360.js <page url> <out.png> [faceSize]
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const [url, out, face] = [process.argv[2], process.argv[3], +process.argv[4] || 1024];
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(6000);
  await p.evaluate(() => document.getElementById('vw-seat').click()); await p.waitForTimeout(2500);
  const data = await p.evaluate((face) => {
    const { renderer, scene, THREE } = window.__HX3, W = face * 4, H = face * 2;
    const cubeRT = new THREE.WebGLCubeRenderTarget(face, { generateMipmaps: false, minFilter: THREE.LinearFilter });
    const cc = new THREE.CubeCamera(0.05, 200, cubeRT); cc.position.set(0, 1.72, 0.15); scene.add(cc); cc.update(renderer, scene); scene.remove(cc);
    const mat = new THREE.ShaderMaterial({ uniforms: { env: { value: cubeRT.texture } }, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform samplerCube env;varying vec2 vUv;void main(){float lon=(vUv.x-.5)*6.2831853;float lat=(vUv.y-.5)*3.1415926;vec3 d=vec3(sin(lon)*cos(lat),sin(lat),-cos(lon)*cos(lat));gl_FragColor=textureCube(env,d);}' });
    const qs = new THREE.Scene(); qs.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)); const oc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const rt = new THREE.WebGLRenderTarget(W, H); renderer.setRenderTarget(rt); renderer.render(qs, oc);
    const px = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px); renderer.setRenderTarget(null);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    g.putImageData(img, 0, 0); return c.toDataURL('image/png');
  }, face);
  fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64')); console.log('wrote', out); await b.close(); })();
