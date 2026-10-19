#!/usr/bin/env node
/**
 * Bakes the XSO pearl with the installed three.js (physical material: clearcoat, sheen,
 * iridescence, a warm key and a rim light over three's built-in room environment) into
 * transparent WebPs, so recipients get a photographic pearl with no WebGL at runtime.
 *
 *   node scripts/render-pearl.mjs        (needs Google Chrome; PW_CHANNEL overrides the channel)
 *
 * Outputs (committed): public/brand/pearl-720.webp, public/brand/pearl-160.webp
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const THREE = path.join(ROOT, 'node_modules/three');
const OUT = path.join(ROOT, 'public/brand');
const ORIGIN = 'https://pearl.render';
const SIZE = 720;

const PAGE = `<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"${ORIGIN}/build/three.module.js"}}</script>
<canvas id="c" width="${SIZE}" height="${SIZE}"></canvas>
<script type="module">
import * as THREE from 'three';

/** A dark room with a few soft light panels: their colours are what the nacre reflects. */
function environment() {
  const room = new THREE.Scene();
  room.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(20, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0x241b15, side: THREE.BackSide }),
    ),
  );
  const panel = (color, intensity, w, h, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  };
  panel(0xffe2b4, 5.5, 7, 9, 6, 7, 4);
  panel(0xfffaf0, 7, 3, 2, -1, 9, 3);
  panel(0xffa8cc, 4, 3, 4, -8, 2, 3);
  panel(0xa8d8ff, 3.8, 3, 3, -5, -6, 5);
  panel(0xfff0dc, 3, 5, 3, 2, -7, -6);
  panel(0xfff6ea, 3.5, 8, 8, -2, 3, -10);
  return room;
}

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(${SIZE}, ${SIZE}, false);
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environment(), 0.035).texture;

const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
camera.position.set(0, 0, 5.5);

const pearl = new THREE.Mesh(
  new THREE.SphereGeometry(1, 160, 160),
  new THREE.MeshPhysicalMaterial({
    color: 0xebe3d5,
    roughness: 0.15,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 1,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [120, 900],
    sheen: 0.35,
    sheenColor: new THREE.Color(0xfff0dc),
    sheenRoughness: 0.4,
    emissive: new THREE.Color(0x45372a),
    emissiveIntensity: 0.7,
    envMapIntensity: 1.2,
  }),
);
scene.add(pearl);

const key = new THREE.DirectionalLight(0xffe0ac, 1.4);
key.position.set(2.6, 3.2, 2.2);
const rim = new THREE.DirectionalLight(0xfff4e4, 1.1);
rim.position.set(-0.6, 1.4, -3.2);
scene.add(key, rim);

renderer.render(scene, camera);

function exportAt(size) {
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, size, size);
  return out.toDataURL('image/webp', 0.9);
}
window.__pearl = { large: exportAt(${SIZE}), small: exportAt(160) };
</script></body></html>`;

const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL ?? 'chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  page.on('pageerror', (error) => console.error('page error:', String(error)));
  await page.route(`${ORIGIN}/**`, (route) => {
    const file = path.join(THREE, new URL(route.request().url()).pathname);
    if (!file.startsWith(THREE)) return route.abort();
    return route.fulfill({ body: readFileSync(file), contentType: 'text/javascript' });
  });
  await page.route(`${ORIGIN}/`, (route) => route.fulfill({ body: PAGE, contentType: 'text/html' }));
  await page.goto(`${ORIGIN}/`);
  const result = await page.waitForFunction(() => window.__pearl, null, { timeout: 60_000 });
  const { large, small } = await result.jsonValue();
  for (const [name, dataUrl] of [
    ['pearl-720.webp', large],
    ['pearl-160.webp', small],
  ]) {
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    writeFileSync(path.join(OUT, name), buffer);
    console.log(`wrote public/brand/${name} (${Math.round(buffer.length / 1024)} KB)`);
  }
} finally {
  await browser.close();
}
