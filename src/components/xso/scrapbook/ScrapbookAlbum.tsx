'use client';

import { memo, useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  SpotLight,
  SRGBColorSpace,
  type Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MAX_CANVAS_DPR } from '@/lib/deviceQuality';
import {
  canvas,
  clamp01,
  curledPlane,
  ease,
  type KeepsakeContents,
  loadPrint,
  mix,
  radialTexture,
  random,
  receiptTexture,
} from '@/components/xso/movie/KeepsakeBox';

/** The ribbon slips off, the cover swings over on its spine, and the view settles on page one. */
const RIBBON_MS = 260;
const COVER_FROM_MS = 160;
const COVER_MS = 1300;
const PUSH_FROM_MS = 620;
export const ALBUM_OPEN_MS = 1900;

/** Album proportions, in scene units: a portrait, cloth-bound post album. */
const W = 1.5;
const D = 1.96;
const BOARD = 0.05;
const PAGES = 0.15;
const RADIUS = 0.03;
const TOP = BOARD + PAGES;
const OPEN_ANGLE = Math.PI * 0.985;
/** Across the cover near the fore-edge, clear of the label: the ribbon, and the seal over it. */
const RIBBON_X = 0.53;
const SEAL = new Vector3(RIBBON_X, TOP + BOARD + 0.004, 0.36);
const CENTRE = new Vector3(0, TOP / 2 + 0.04, 0);
const PAGE = new Vector3(0.02, TOP + 0.002, 0);

export interface AlbumContents extends KeepsakeContents {
  /** Printed on the cover label under "Memories", e.g. the gift's year. */
  year?: string;
  /** Written at the top of page one: the gift's occasion and date, as the sender gave them. */
  caption?: string;
  date?: string;
}

/** Book cloth: a dusty rose linen weave with slubs, under the lamp. */
function clothTexture() {
  const [el, g] = canvas(512, 512);
  const rand = random(11);
  g.fillStyle = '#6c2638';
  g.fillRect(0, 0, 512, 512);
  /* Fine warp and weft, each thread a shade off its neighbour, so it reads as cloth, not a check. */
  for (let y = 0; y < 512; y += 1) {
    g.fillStyle = `rgba(${rand() > 0.5 ? '255,214,222' : '30,4,12'},${0.02 + rand() * 0.035})`;
    g.fillRect(0, y, 512, 1);
  }
  for (let x = 0; x < 512; x += 1) {
    g.fillStyle = `rgba(${rand() > 0.5 ? '255,214,222' : '30,4,12'},${0.015 + rand() * 0.03})`;
    g.fillRect(x, 0, 1, 512);
  }
  for (let i = 0; i < 320; i++) {
    g.fillStyle = `rgba(255,206,216,${0.03 + rand() * 0.05})`;
    g.fillRect(rand() * 512, rand() * 512, 4 + rand() * 14, 1);
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1.4, 1.8);
  return texture;
}

/** The label pasted on the cover: cream stock, a printed "Memories" and the year. */
function labelTexture(year: string) {
  const [el, g] = canvas(640, 400);
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  const draw = () => {
    const rand = random(5);
    const paper = g.createLinearGradient(0, 0, 640, 400);
    paper.addColorStop(0, '#f7efdd');
    paper.addColorStop(1, '#eadfc6');
    g.fillStyle = paper;
    g.fillRect(0, 0, 640, 400);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(120,80,50,${rand() * 0.05})`;
      g.fillRect(rand() * 640, rand() * 400, 1, 1);
    }
    g.strokeStyle = 'rgba(122,48,66,0.55)';
    g.lineWidth = 3;
    g.strokeRect(22, 22, 596, 356);
    g.lineWidth = 1;
    g.strokeRect(32, 32, 576, 336);
    const serif = getComputedStyle(document.body).getPropertyValue('--font-fraunces').trim();
    const mono = getComputedStyle(document.body).getPropertyValue('--font-courier-prime').trim();
    g.fillStyle = '#6e2a3c';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `600 112px ${serif || 'Georgia'}, Georgia, serif`;
    g.fillText('Memories', 320, 178);
    g.font = `700 30px ${mono || 'Courier New'}, monospace`;
    g.fillText(year ? `· ${year} ·` : '· kept ·', 320, 286);
    texture.needsUpdate = true;
  };
  draw();
  return { texture, redraw: draw };
}

/** Inside the cover: patterned endpaper, small sprigs on cream. */
function endpaperTexture() {
  const [el, g] = canvas(512, 512);
  g.fillStyle = '#efe2cb';
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(143,59,79,0.28)';
  for (let y = 0; y < 512; y += 64) {
    for (let x = (y / 64) % 2 ? 32 : 0; x < 512; x += 64) {
      g.beginPath();
      g.ellipse(x + 8, y + 8, 7, 3.5, 0.6, 0, Math.PI * 2);
      g.ellipse(x + 16, y + 14, 6, 3, -0.5, 0, Math.PI * 2);
      g.fill();
    }
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 2.6);
  return texture;
}

/** Page one: heavy cream album card with a little tooth, captioned by hand with the gift's own day. */
function pageTexture(caption: string, date: string) {
  const [el, g] = canvas(512, 640);
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  const draw = () => {
    const rand = random(23);
    g.fillStyle = '#f2e8d4';
    g.fillRect(0, 0, 512, 640);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(110,70,40,${rand() * 0.04})`;
      g.fillRect(rand() * 512, rand() * 640, 1, 1);
    }
    const hand = getComputedStyle(document.body).getPropertyValue('--font-caveat').trim();
    g.save();
    g.translate(256, 70);
    g.rotate(-0.03);
    g.textAlign = 'center';
    g.fillStyle = '#5b2333';
    g.font = `600 46px ${hand || 'cursive'}, cursive`;
    if (caption) g.fillText(caption.slice(0, 28), 0, 0);
    g.fillStyle = 'rgba(91,35,51,0.7)';
    g.font = `400 30px ${hand || 'cursive'}, cursive`;
    if (date) g.fillText(date, 0, 40);
    g.restore();
    texture.needsUpdate = true;
  };
  draw();
  return { texture, redraw: draw };
}

/** The fore-edge: dozens of card leaves, each a faint line. */
function edgeTexture() {
  const [el, g] = canvas(64, 256);
  const rand = random(3);
  g.fillStyle = '#e8dcc4';
  g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 4) {
    g.fillStyle = `rgba(90,60,35,${0.12 + rand() * 0.12})`;
    g.fillRect(0, y, 64, 1);
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Translucent washi tape. */
function tapeTexture() {
  const [el, g] = canvas(256, 64);
  g.fillStyle = 'rgba(244,196,170,0.78)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let x = 0; x < 256; x += 10) g.fillRect(x, 0, 4, 64);
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

interface Shot {
  look: Vector3;
  elevation: number;
  distance: number;
  fov: number;
  x: number;
  y: number;
}

interface Rig {
  render: () => void;
  pose: (t: number) => void;
}

/**
 * The Scrapbook itself: a cloth-bound post album tied with a satin ribbon, on the desk under the
 * lamp. It draws once and sits still until it's opened; opening slips the ribbon, swings the cover
 * over on its spine, and carries the view down onto the first page.
 */
export const ScrapbookAlbum = memo(function ScrapbookAlbum({
  contents,
  landscape,
  opening,
  reduce,
  lite = false,
  onReady,
  onFail,
  onAnchor,
}: {
  contents: AlbumContents;
  /** Slower devices: no shadow maps, no antialiasing, one pixel per CSS pixel. */
  lite?: boolean;
  /** Landscape keeps the titles on the left and lays the album on the right. */
  landscape: boolean;
  opening: boolean;
  reduce: boolean;
  onReady: () => void;
  onFail: () => void;
  /** The seal's position as fractions of the card, for the button laid over it. */
  onAnchor: (x: number, y: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const rig = useRef<Rig | null>(null);
  const live = useRef({ onReady, onFail, onAnchor, landscape });
  live.current = { onReady, onFail, onAnchor, landscape };

  useEffect(() => {
    const host = holder.current;
    if (!host) return;
    /** Its own canvas each mount: a context that was released can't be taken again. */
    const el = document.createElement('canvas');
    el.className = 'block h-full w-full';
    host.appendChild(el);
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas: el, alpha: true, antialias: !lite, powerPreference: 'default' });
    } catch {
      el.remove();
      live.current.onFail();
      return;
    }
    let disposed = false;
    const lost = (e: Event) => {
      e.preventDefault();
      if (!disposed) live.current.onFail();
    };
    el.addEventListener('webglcontextlost', lost);

    renderer.setPixelRatio(lite ? 1 : Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = PCFSoftShadowMap;

    const scene = new Scene();
    const pmrem = new PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.28;
    const camera = new PerspectiveCamera(28, 1, 0.1, 40);

    const textures: Texture[] = [];
    const keep = <T extends Texture>(t: T) => {
      textures.push(t);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return t;
    };
    const add = (parent: Object3D, mesh: Mesh, cast = true, receive = true) => {
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      parent.add(mesh);
      return mesh;
    };
    const at = (mesh: Mesh, x: number, y: number, z: number) => {
      mesh.position.set(x, y, z);
      return mesh;
    };

    const cloth = new MeshPhysicalMaterial({
      map: keep(clothTexture()),
      roughness: 0.9,
      sheen: 0.6,
      sheenRoughness: 0.7,
      sheenColor: '#e8a6b4',
    });
    const brass = new MeshStandardMaterial({ color: '#c9a25c', metalness: 1, roughness: 0.32 });
    const satin = new MeshPhysicalMaterial({
      color: '#ead2bc',
      roughness: 0.42,
      sheen: 1,
      sheenRoughness: 0.3,
      sheenColor: '#fff0e6',
      transparent: true,
    });
    const leaf = pageTexture(contents.caption ?? '', contents.date ?? '');
    keep(leaf.texture);
    const page = new MeshStandardMaterial({ map: leaf.texture, roughness: 0.92 });
    const edge = new MeshStandardMaterial({ map: keep(edgeTexture()), roughness: 0.95 });
    const plain = new MeshStandardMaterial({ color: '#e1d4ba', roughness: 0.95 });

    /* The desk it rests on: only its shadows are drawn, over the wood behind the canvas. */
    const floor = new Mesh(new PlaneGeometry(16, 16), new ShadowMaterial({ opacity: 0.42 }));
    floor.rotation.x = -Math.PI / 2;
    add(scene, floor, false, true);
    const contact = new Mesh(
      new PlaneGeometry(W * 1.35, D * 1.25),
      new MeshBasicMaterial({
        map: keep(radialTexture('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)')),
        transparent: true,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.002;
    scene.add(contact);

    /* Back board, the block of card leaves, and the cloth spine wrapping the left edge. */
    add(scene, at(new Mesh(new RoundedBoxGeometry(W, BOARD, D, 3, RADIUS), cloth), 0, BOARD / 2, 0));
    const leaves = new Mesh(new BoxGeometry(W - 0.07, PAGES, D - 0.07), [
      edge,
      plain,
      page,
      plain,
      edge,
      edge,
    ]);
    add(scene, at(leaves, 0.025, BOARD + PAGES / 2, 0));
    add(scene, at(new Mesh(new RoundedBoxGeometry(0.09, TOP + BOARD, D, 3, 0.04), cloth), -W / 2 + 0.03, (TOP + BOARD) / 2, 0));
    /* A bookmark ribbon left between the pages, its tail out past the bottom edge. */
    const bookmark = new Mesh(new PlaneGeometry(0.05, 0.34), new MeshStandardMaterial({ color: '#7a2a3e', roughness: 0.5, side: DoubleSide }));
    bookmark.rotation.set(-Math.PI / 2, 0, 0.12);
    add(scene, at(bookmark, -0.32, 0.004, D / 2 + 0.12), true, true);

    /* Page one, under the cover: the gift's receipt and, if there is one, the sender's photo. */
    const receipt = receiptTexture(contents);
    keep(receipt.texture);
    const slipW = 0.68;
    const slip = new Mesh(
      curledPlane(slipW, slipW * receipt.aspect, 0.01),
      new MeshStandardMaterial({ map: receipt.texture, color: '#ece3d1', roughness: 0.85, side: DoubleSide }),
    );
    slip.rotation.set(-Math.PI / 2, 0, 0.05);
    add(scene, at(slip, -0.2, TOP + 0.004, -0.12), true, true);
    const tapeMat = new MeshBasicMaterial({ map: keep(tapeTexture()), transparent: true, depthWrite: false });
    const tape = new Mesh(new PlaneGeometry(0.3, 0.07), tapeMat);
    tape.rotation.set(-Math.PI / 2, 0, -0.18);
    add(scene, at(tape, -0.2, TOP + 0.012, -0.12 - (slipW * receipt.aspect) / 2), false, false);

    /* The cover, hinged along the spine. */
    const hinge = new Group();
    hinge.position.set(-W / 2 + 0.03, TOP, 0);
    scene.add(hinge);
    add(hinge, at(new Mesh(new RoundedBoxGeometry(W - 0.02, BOARD, D, 3, RADIUS), cloth), W / 2 - 0.02, BOARD / 2, 0));
    const endpaper = at(
      new Mesh(new PlaneGeometry(W - 0.1, D - 0.08), new MeshStandardMaterial({ map: keep(endpaperTexture()), roughness: 0.9 })),
      W / 2 - 0.02,
      -0.002,
      0,
    );
    endpaper.rotation.x = Math.PI / 2;
    add(hinge, endpaper, false);
    const label = labelTexture(contents.year ?? '');
    keep(label.texture);
    const plate = at(
      new Mesh(new PlaneGeometry(0.78, 0.49), new MeshStandardMaterial({ map: label.texture, roughness: 0.8 })),
      W / 2 - 0.08,
      BOARD + 0.002,
      -0.38,
    );
    plate.rotation.set(-Math.PI / 2, 0, 0.02);
    add(hinge, plate, false, true);
    const labelTape = new Mesh(new PlaneGeometry(0.24, 0.06), tapeMat);
    labelTape.rotation.set(-Math.PI / 2, 0, -0.6);
    add(hinge, at(labelTape, W / 2 - 0.46, BOARD + 0.006, -0.6), false, false);
    /* Brass binding posts near the spine. */
    const post = new CylinderGeometry(0.03, 0.03, 0.012, 24);
    for (const z of [-D / 3, D / 3]) add(hinge, at(new Mesh(post, brass), 0.1, BOARD + 0.006, z));

    /* The satin ribbon tied around the album, over the cover and down both ends. */
    const ribbon = new Group();
    scene.add(ribbon);
    add(ribbon, at(new Mesh(new BoxGeometry(0.12, 0.004, D + 0.012), satin), RIBBON_X, TOP + BOARD + 0.002, 0), true, false);
    for (const z of [-1, 1]) {
      add(ribbon, at(new Mesh(new BoxGeometry(0.12, TOP + BOARD, 0.004), satin), RIBBON_X, (TOP + BOARD) / 2, z * (D / 2 + 0.006)), true, false);
    }

    /* Light: one warm lamp from the upper left, a faint cool edge from behind. */
    const key = new SpotLight('#ffd9a8', 120, 0, 0.5, 0.9, 2);
    key.position.set(-2.6, 5.6, 2.8);
    key.target.position.set(0, 0.1, 0);
    key.castShadow = true;
    const shadowSize = window.matchMedia('(pointer: coarse)').matches ? 512 : 768;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 14;
    scene.add(key, key.target);
    scene.add(new HemisphereLight('#ffe9d2', '#1a0c08', 0.32));
    const rim = new DirectionalLight('#d9c6ff', 0.4);
    rim.position.set(3, 2.4, -3.2);
    scene.add(rim);

    /* Framing. */
    let width = 1;
    let height = 1;
    const tan = (fov: number) => Math.tan((fov * Math.PI) / 360);
    const closedShot = (): Shot => {
      const fov = 28;
      const elevation = 1.02;
      const aspect = width / height;
      const across = live.current.landscape ? 0.42 : 0.8;
      const tall = live.current.landscape ? 0.64 : 0.46;
      const apparentH = D * Math.sin(elevation) + (TOP + BOARD) * Math.cos(elevation);
      const distance = Math.max(
        (W * 1.06) / (across * 2 * tan(fov) * aspect),
        apparentH / (tall * 2 * tan(fov)),
      );
      return live.current.landscape
        ? { look: CENTRE, elevation, distance, fov, x: 0.7, y: 0.47 }
        : { look: CENTRE, elevation, distance, fov, x: 0.5, y: 0.63 };
    };
    const pageShot = (): Shot => {
      const fov = 30;
      const aspect = width / height;
      const distance = Math.max(
        (W - 0.07) / (0.94 * 2 * tan(fov) * aspect),
        (D - 0.07) / (0.9 * 2 * tan(fov)),
      );
      return { look: PAGE, elevation: 1.46, distance, fov, x: 0.5, y: 0.5 };
    };
    const look = new Vector3();
    const place = (a: Shot, b: Shot, t: number) => {
      look.lerpVectors(a.look, b.look, t);
      const elevation = mix(a.elevation, b.elevation, t);
      const distance = mix(a.distance, b.distance, t);
      camera.fov = mix(a.fov, b.fov, t);
      camera.aspect = width / height;
      camera.position.set(
        look.x,
        look.y + distance * Math.sin(elevation),
        look.z + distance * Math.cos(elevation),
      );
      camera.lookAt(look);
      camera.setViewOffset(
        width,
        height,
        (0.5 - mix(a.x, b.x, t)) * width,
        (0.5 - mix(a.y, b.y, t)) * height,
        width,
        height,
      );
      camera.updateProjectionMatrix();
    };

    const render = () => {
      if (!disposed) renderer.render(scene, camera);
    };
    const pose = (t: number) => {
      const slipOff = clamp01(t / RIBBON_MS);
      satin.opacity = 1 - slipOff;
      ribbon.position.x = 0.25 * ease(slipOff);
      ribbon.visible = slipOff < 1;
      hinge.rotation.z = OPEN_ANGLE * ease(clamp01((t - COVER_FROM_MS) / COVER_MS));
      const push = ease(clamp01((t - PUSH_FROM_MS) / (ALBUM_OPEN_MS - PUSH_FROM_MS)));
      place(closedShot(), pageShot(), push);
    };

    const seal = new Vector3();
    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      place(closedShot(), closedShot(), 0);
      seal.copy(SEAL).project(camera);
      live.current.onAnchor((seal.x + 1) / 2, (1 - seal.y) / 2);
      render();
    };
    const observer = new ResizeObserver(() => {
      if (!rig.current) return;
      resize();
    });
    rig.current = { render, pose };
    observer.observe(host);
    resize();
    live.current.onReady();

    /* The label and receipt use the site's fonts; redraw them once they've arrived. */
    void document.fonts?.ready.then(() => {
      if (disposed) return;
      label.redraw();
      leaf.redraw();
      receipt.redraw();
      render();
    });
    if (contents.photo) {
      loadPrint(contents.photo)
        .then((texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          keep(texture);
          const print = new Mesh(
            curledPlane(0.5, 0.6, 0.008),
            new MeshStandardMaterial({ map: texture, roughness: 0.6, side: DoubleSide }),
          );
          print.rotation.set(-Math.PI / 2, 0, -0.1);
          add(scene, at(print, 0.36, TOP + 0.008, 0.42), true, true);
          const corner = new Mesh(new PlaneGeometry(0.22, 0.06), tapeMat);
          corner.rotation.set(-Math.PI / 2, 0, 0.7);
          add(scene, at(corner, 0.56, TOP + 0.016, 0.16), false, false);
          render();
        })
        .catch(() => {
          /* No print (or a photo host without CORS): page one holds the receipt alone. */
        });
    }

    return () => {
      disposed = true;
      rig.current = null;
      observer.disconnect();
      el.removeEventListener('webglcontextlost', lost);
      const materials = new Set<Material>();
      scene.traverse((node) => {
        if (node instanceof Mesh) {
          node.geometry.dispose();
          const list = Array.isArray(node.material) ? node.material : [node.material];
          list.forEach((m: Material) => materials.add(m));
        }
      });
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.remove();
    };
    // The album is built once per mount; its contents don't change while the cover is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!opening || reduce) return;
    const r = rig.current;
    if (!r) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = now - start;
      r.pose(t);
      r.render();
      if (t < ALBUM_OPEN_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [opening, reduce]);

  return <div ref={holder} aria-hidden className="absolute inset-0" />;
});

export default ScrapbookAlbum;
