'use client';

import { memo, useEffect, useRef } from 'react';
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
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
  PointLight,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  SpotLight,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MAX_CANVAS_DPR } from '@/lib/deviceQuality';

/** The lid swings open over this long. */
const LID_MS = 1300;
/** The view leaves the box and settles over the receipt between these two moments. */
const PUSH_FROM_MS = 560;
export const KEEPSAKE_PUSH_MS = 1750;

export interface KeepsakeContents {
  store?: string;
  lines: { text: string; price: string }[];
  total: string;
  /** The sender's first uploaded photo, laid in the tray as a print. */
  photo?: string;
}

/** One run of text on the film's receipt, in CSS px from the paper's top-left corner. */
export interface PaperText {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  font: string;
  lineHeight: number;
  spacing: string;
  align: 'left' | 'center' | 'right';
  color: string;
}

/** The film's receipt as laid out on screen, so the slip can be printed to match it exactly. */
export interface PaperLayout {
  w: number;
  h: number;
  texts: PaperText[];
  /** Dashed rules, as distances from the top. */
  rules: number[];
}

/** Where the film's own receipt sits on screen, as fractions of the card: the push lands on it. */
export interface KeepsakeTarget {
  cx: number;
  cy: number;
  w: number;
  paper?: PaperLayout;
}

/** Box proportions, in scene units. */
const W = 2.2;
const D = 1.5;
const H = 0.78;
const LID = 0.3;
const WALL = 0.09;
const RADIUS = 0.035;
const FOOT = 0.06;
/** The velvet bed sits just under the rim, so what's laid on it shows as soon as the lid lifts. */
const BED = H - 0.13;
const BED_TOP = FOOT + BED + 0.016;
const OPEN_ANGLE = 1.86;
/** The receipt slip, laid in the tray at the same slight tilt the film gives its receipt. */
const SLIP_W = 0.86;
const SLIP_AT = new Vector3(-0.3, BED_TOP + 0.004, 0);
const SLIP_TILT = 0.026;
/** Where the clasp sits on the front of the box: the Play button is laid over it. */
const CLASP = new Vector3(0, FOOT + H - 0.06, D / 2 + 0.03);
const BOX_CENTRE = new Vector3(0, FOOT + (H + LID) / 2 + 0.04, 0);

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic noise, so every render (and every story video) has the same grain. */
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w: number, h: number) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return [el, el.getContext('2d')!] as const;
}

/** Walnut: dark heartwood with long, gently wandering grain and fine pores under the lacquer. */
function walnutTexture() {
  const [el, g] = canvas(1024, 512);
  const rand = random(7);
  g.fillStyle = '#3a2416';
  g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 10; i++) {
    const y = rand() * 512;
    const band = g.createLinearGradient(0, y - 70, 0, y + 70);
    const tone = rand() < 0.5 ? '22, 12, 6' : '92, 60, 36';
    band.addColorStop(0, `rgba(${tone}, 0)`);
    band.addColorStop(0.5, `rgba(${tone}, ${0.1 + rand() * 0.14})`);
    band.addColorStop(1, `rgba(${tone}, 0)`);
    g.fillStyle = band;
    g.fillRect(0, y - 70, 1024, 140);
  }
  /* Grain runs in loose families, so neighbouring lines wander together like real figure. */
  for (let family = 0; family < 22; family++) {
    const y0 = rand() * 512;
    const amp = 6 + rand() * 18;
    const freq = 0.0015 + rand() * 0.0025;
    const phase = rand() * Math.PI * 2;
    const lines = 6 + Math.floor(rand() * 8);
    for (let j = 0; j < lines; j++) {
      const offset = j * (2 + rand() * 4);
      g.strokeStyle =
        rand() < 0.7
          ? `rgba(18, 9, 4, ${0.07 + rand() * 0.18})`
          : `rgba(140, 96, 58, ${0.04 + rand() * 0.08})`;
      g.lineWidth = 0.4 + rand() * 1.1;
      g.beginPath();
      for (let x = 0; x <= 1024; x += 8) {
        const y =
          y0 +
          offset +
          Math.sin(x * freq + phase) * amp +
          Math.sin(x * freq * 2.7 + phase * 1.7) * amp * 0.18 * (1 + j * 0.05);
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.fillStyle = 'rgba(8, 4, 2, 0.28)';
  for (let i = 0; i < 3800; i++) {
    g.fillRect(rand() * 1024, rand() * 512, 1 + rand() * 3, 0.7);
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** A soft round falloff, used for the lamp glow inside the box and the shadow under it. */
export function radialTexture(inner: string, outer: string) {
  const [el, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new CanvasTexture(el);
}

/** The reel's flange: brass with five round cut-outs around the hub. */
function flangeTexture() {
  const [el, g] = canvas(256, 256);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#140b07';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.beginPath();
    g.arc(128 + Math.cos(a) * 66, 128 + Math.sin(a) * 66, 30, 0, Math.PI * 2);
    g.fill();
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function fontFamily(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** The plain brass plate on the front: brushed sheen inside a fine cut border. */
function plateTexture() {
  const [el, g] = canvas(512, 290);
  const sheen = g.createLinearGradient(0, 0, 512, 290);
  sheen.addColorStop(0, '#f6e2b0');
  sheen.addColorStop(0.5, '#d7b26e');
  sheen.addColorStop(1, '#a9813e');
  g.fillStyle = sheen;
  g.fillRect(0, 0, 512, 290);
  g.strokeStyle = 'rgba(70, 44, 14, 0.55)';
  g.lineWidth = 6;
  g.strokeRect(18, 18, 476, 254);
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * The receipt slip in the tray, printed with the gift's own lines and laid out like the film's
 * receipt (310 CSS px wide, the same rows and rules), so the push-in can cut straight to it.
 */
export function receiptTexture(contents: KeepsakeContents) {
  const rows = Math.max(1, Math.min(5, contents.lines.length));
  const cssW = 310;
  const cssH = 124 + rows * 25.5;
  const k = 768 / cssW;
  const [el, g] = canvas(768, Math.round(cssH * k));
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const paper = g.createLinearGradient(0, 0, el.width, el.height);
    paper.addColorStop(0, '#f6eedc');
    paper.addColorStop(1, '#e6d8bb');
    g.fillStyle = paper;
    g.fillRect(0, 0, el.width, el.height);
    const rand = random(11);
    g.fillStyle = 'rgba(120, 90, 50, 0.06)';
    for (let i = 0; i < 2200; i++) g.fillRect(rand() * el.width, rand() * el.height, 2, 2);
    g.setTransform(k, 0, 0, k, 0, 0);
    const mono = fontFamily('--font-courier-prime', 'Courier New, monospace');
    g.fillStyle = '#2a1712';
    g.textBaseline = 'alphabetic';
    const fit = (text: string, max: number) => {
      if (g.measureText(text).width <= max) return text;
      let out = text;
      while (out.length > 1 && g.measureText(`${out}…`).width > max) out = out.slice(0, -1);
      return `${out}…`;
    };
    const rule = (y: number) => {
      g.setLineDash([4, 3]);
      g.strokeStyle = 'rgba(42, 23, 18, 0.4)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(20, y);
      g.lineTo(cssW - 20, y);
      g.stroke();
      g.setLineDash([]);
    };
    g.font = `700 13px ${mono}`;
    g.textAlign = 'center';
    g.fillText(fit((contents.store || 'Receipt').toUpperCase(), cssW - 40), cssW / 2, 36);
    rule(54);
    g.font = `400 13px ${mono}`;
    contents.lines.slice(0, rows).forEach((line, i) => {
      const y = 80 + i * 25.5;
      const price = line.price.toUpperCase();
      g.textAlign = 'right';
      g.fillText(price, cssW - 20, y);
      g.textAlign = 'left';
      g.fillText(fit(line.text.toUpperCase(), cssW - 52 - g.measureText(price).width), 20, y);
    });
    const end = 66 + rows * 25.5 + 6;
    rule(end);
    g.font = `700 13px ${mono}`;
    g.textAlign = 'left';
    g.fillText('TOTAL', 20, end + 26);
    g.textAlign = 'right';
    g.fillText(fit(contents.total.toUpperCase(), 180), cssW - 20, end + 26);
    texture.needsUpdate = true;
  };
  draw();
  return { texture, redraw: draw, aspect: cssH / cssW };
}

/** Greedy wrap, breaking inside a word only when the word alone is wider than the line. */
function wrap(g: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width <= width + 0.5) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    let rest = word;
    while (g.measureText(rest).width > width + 0.5 && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && g.measureText(rest.slice(0, cut)).width > width + 0.5) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines;
}

/** Reprints the slip from the film receipt's measured layout: same paper, rules and lines. */
function printPaper(layout: PaperLayout) {
  const k = 768 / layout.w;
  const [el, g] = canvas(768, Math.round(layout.h * k));
  g.fillStyle = '#fbf6ec';
  g.fillRect(0, 0, el.width, el.height);
  const angle = (168 * Math.PI) / 180;
  const dx = Math.sin(angle) * el.height;
  const dy = -Math.cos(angle) * el.height;
  const light = g.createLinearGradient(el.width / 2 - dx / 2, el.height / 2 - dy / 2, el.width / 2 + dx / 2, el.height / 2 + dy / 2);
  light.addColorStop(0, 'rgba(255, 252, 244, 0.9)');
  light.addColorStop(0.38, 'rgba(251, 246, 236, 0)');
  light.addColorStop(1, 'rgba(120, 84, 52, 0.12)');
  g.fillStyle = light;
  g.fillRect(0, 0, el.width, el.height);
  const rand = random(11);
  g.fillStyle = 'rgba(120, 90, 50, 0.05)';
  for (let i = 0; i < 2200; i++) g.fillRect(rand() * el.width, rand() * el.height, 2, 2);
  g.setTransform(k, 0, 0, k, 0, 0);
  for (const y of layout.rules) {
    g.setLineDash([3, 3]);
    g.strokeStyle = 'rgba(42, 23, 18, 0.4)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(20, y + 0.5);
    g.lineTo(layout.w - 20, y + 0.5);
    g.stroke();
  }
  g.setLineDash([]);
  g.textBaseline = 'middle';
  for (const run of layout.texts) {
    g.font = run.font;
    g.fillStyle = run.color;
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = run.spacing;
    g.textAlign = run.align;
    const x = run.align === 'center' ? run.x + run.w / 2 : run.align === 'right' ? run.x + run.w : run.x;
    wrap(g, run.text, run.w).forEach((line, i) => {
      g.fillText(line, x, run.y + (i + 0.5) * run.lineHeight);
    });
  }
  const texture = new CanvasTexture(el);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Paper that has been handled: flat in the middle, lifting a little towards both ends. */
export function curledPlane(w: number, h: number, lift: number) {
  const geometry = new PlaneGeometry(w, h, 1, 16);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = pos.getY(i) / (h / 2);
    pos.setZ(i, lift * v * v);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function loadPrint(src: string): Promise<CanvasTexture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      const [el, g] = canvas(512, 620);
      g.fillStyle = '#f5efe3';
      g.fillRect(0, 0, 512, 620);
      const box = { x: 28, y: 28, w: 456, h: 500 };
      const scale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
      const sw = box.w / scale;
      const sh = box.h / scale;
      try {
        g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, box.x, box.y, box.w, box.h);
      } catch {
        reject(new Error('print'));
        return;
      }
      const texture = new CanvasTexture(el);
      texture.colorSpace = SRGBColorSpace;
      resolve(texture);
    };
    img.onerror = () => reject(new Error('print'));
    img.src = src;
  });
}

/** A camera placement: what it looks at, from how high and far, and where that lands on screen. */
interface Shot {
  look: Vector3;
  elevation: number;
  distance: number;
  fov: number;
  /** Screen position of `look`, as fractions of the canvas. */
  x: number;
  y: number;
}

interface Rig {
  render: () => void;
  /** Poses the box at `t` ms into the opening. */
  pose: (t: number) => void;
  /** Prints the slip to match the film's receipt. */
  reprint: (layout: PaperLayout) => void;
}

/**
 * The Movie Box itself: a lacquered walnut keepsake box with brass fittings and a velvet bed,
 * rendered with three.js across the whole title card. It draws once and sits still until it's
 * opened; the opening swings the lid back on its hinges, lets a lamp inside warm the tray, and
 * carries the view down onto the receipt laid in it, landing where the film's receipt appears.
 */
export const KeepsakeBox = memo(function KeepsakeBox({
  contents,
  landscape,
  opening,
  reduce,
  lite = false,
  target,
  onReady,
  onFail,
  onAnchor,
}: {
  contents: KeepsakeContents;
  /** Slower devices: no shadow maps, no antialiasing, one pixel per CSS pixel. */
  lite?: boolean;
  /** Landscape cards keep the titles on the left and stand the box on the right. */
  landscape: boolean;
  opening: boolean;
  reduce: boolean;
  target: KeepsakeTarget | null;
  onReady: () => void;
  onFail: () => void;
  /** The clasp's position as fractions of the card, for the Play button laid over it. */
  onAnchor: (x: number, y: number) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const rig = useRef<Rig | null>(null);
  const live = useRef({ onReady, onFail, onAnchor, target, landscape });
  live.current = { onReady, onFail, onAnchor, target, landscape };

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
    scene.environmentIntensity = 0.3;
    const camera = new PerspectiveCamera(26, 1, 0.1, 40);

    const textures: Texture[] = [];
    const keep = <T extends Texture>(t: T) => {
      textures.push(t);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return t;
    };

    const walnut = new MeshPhysicalMaterial({
      map: keep(walnutTexture()),
      roughness: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
    });
    const velvet = new MeshPhysicalMaterial({
      color: '#250912',
      roughness: 0.95,
      sheen: 1,
      sheenRoughness: 0.5,
      sheenColor: '#7a3042',
    });
    const brass = new MeshStandardMaterial({ color: '#c9a25c', metalness: 1, roughness: 0.3 });

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

    /* The surface it rests on: only its shadows are drawn, over the card's own dark. */
    const floor = new Mesh(new PlaneGeometry(16, 16), new ShadowMaterial({ opacity: 0.4 }));
    floor.rotation.x = -Math.PI / 2;
    add(scene, floor, false, true);
    const contact = new Mesh(
      new PlaneGeometry(W * 1.4, D * 1.7),
      new MeshBasicMaterial({
        map: keep(radialTexture('rgba(0,0,0,0.9)', 'rgba(0,0,0,0)')),
        transparent: true,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.002;
    scene.add(contact);

    /* The base: four walls, a bottom, small brass feet, and a velvet bed just under the rim. */
    const base = new Group();
    base.position.y = FOOT;
    scene.add(base);
    const side = new RoundedBoxGeometry(WALL, H, D, 3, RADIUS);
    const face = new RoundedBoxGeometry(W - 2 * WALL + 0.02, H, WALL, 3, RADIUS);
    add(base, at(new Mesh(side, walnut), -(W / 2 - WALL / 2), H / 2, 0));
    add(base, at(new Mesh(side, walnut), W / 2 - WALL / 2, H / 2, 0));
    add(base, at(new Mesh(face, walnut), 0, H / 2, D / 2 - WALL / 2));
    add(base, at(new Mesh(face, walnut), 0, H / 2, -(D / 2 - WALL / 2)));
    add(base, at(new Mesh(new BoxGeometry(W - 0.03, WALL, D - 0.03), walnut), 0, WALL / 2, 0));
    const innerW = W - 2 * WALL;
    const innerD = D - 2 * WALL;
    add(base, at(new Mesh(new BoxGeometry(innerW, 0.03, innerD), velvet), 0, BED, 0), false);
    const liningH = H - BED;
    const lining = (w: number, x: number, z: number, ry: number) => {
      const mesh = at(new Mesh(new PlaneGeometry(w, liningH), velvet), x, BED + liningH / 2, z);
      mesh.rotation.y = ry;
      add(base, mesh, false);
    };
    lining(innerW, 0, D / 2 - WALL - 0.002, Math.PI);
    lining(innerW, 0, -(D / 2 - WALL - 0.002), 0);
    lining(innerD, -(W / 2 - WALL - 0.002), 0, Math.PI / 2);
    lining(innerD, W / 2 - WALL - 0.002, 0, -Math.PI / 2);
    const foot = new CylinderGeometry(0.07, 0.085, FOOT, 24);
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      add(scene, at(new Mesh(foot, brass), x * (W / 2 - 0.17), FOOT / 2, z * (D / 2 - 0.15)));
    }
    /* Front fittings: the clasp's catch, and a plain brass plate. */
    add(base, at(new Mesh(new BoxGeometry(0.22, 0.09, 0.022), brass), 0, H - 0.1, D / 2 + 0.011));
    const plateY = H * 0.34;
    add(base, at(new Mesh(new BoxGeometry(0.44, 0.25, 0.012), brass), 0, plateY, D / 2 + 0.006));
    const plateFace = new Mesh(
      new PlaneGeometry(0.41, 0.222),
      new MeshStandardMaterial({ map: keep(plateTexture()), metalness: 0.85, roughness: 0.34 }),
    );
    add(base, at(plateFace, 0, plateY, D / 2 + 0.0125), false);

    /* What's been laid in the box: the receipt, a photo print, and the film reel. */
    const receipt = receiptTexture(contents);
    keep(receipt.texture);
    const slipH = SLIP_W * receipt.aspect;
    const paper = new MeshStandardMaterial({
      map: receipt.texture,
      color: '#e9e0cf',
      roughness: 0.85,
      side: DoubleSide,
    });
    const slip = new Mesh(curledPlane(SLIP_W, slipH, 0.014), paper);
    slip.rotation.set(-Math.PI / 2, 0, SLIP_TILT);
    add(scene, at(slip, SLIP_AT.x, SLIP_AT.y, SLIP_AT.z), true, true);

    const reel = new Group();
    reel.position.set(0.66, BED_TOP, -0.4);
    scene.add(reel);
    const flangeTop = new MeshStandardMaterial({
      map: keep(flangeTexture()),
      color: '#c9a25c',
      metalness: 1,
      roughness: 0.32,
    });
    add(
      reel,
      at(new Mesh(new CylinderGeometry(0.2, 0.2, 0.05, 48), new MeshStandardMaterial({ color: '#1b100b', roughness: 0.38 })), 0, 0.03, 0),
    );
    add(reel, at(new Mesh(new CylinderGeometry(0.25, 0.25, 0.012, 56), [brass, flangeTop, brass]), 0, 0.062, 0));
    add(reel, at(new Mesh(new CylinderGeometry(0.045, 0.045, 0.09, 24), brass), 0, 0.05, 0));

    /* The lid, hinged along the back edge. */
    const hinge = new Group();
    hinge.position.set(0, FOOT + H, -D / 2);
    scene.add(hinge);
    add(hinge, at(new Mesh(new RoundedBoxGeometry(W, LID, D, 3, RADIUS), walnut), 0, LID / 2, D / 2));
    const underside = at(new Mesh(new PlaneGeometry(W - 0.24, D - 0.24), velvet), 0, -0.002, D / 2);
    underside.rotation.x = Math.PI / 2;
    add(hinge, underside, false);
    const inlay = (w: number, d: number, x: number, z: number) =>
      add(hinge, at(new Mesh(new BoxGeometry(w, 0.006, d), brass), x, LID + 0.002, z), false);
    inlay(W - 0.32, 0.014, 0, 0.16);
    inlay(W - 0.32, 0.014, 0, D - 0.16);
    inlay(0.014, D - 0.32, -(W / 2 - 0.16), D / 2);
    inlay(0.014, D - 0.32, W / 2 - 0.16, D / 2);
    add(hinge, at(new Mesh(new BoxGeometry(0.15, 0.15, 0.024), brass), 0, -0.03, D + 0.012));
    const knuckle = new CylinderGeometry(0.032, 0.032, 0.24, 20);
    for (const x of [-0.64, 0.64]) {
      const mesh = at(new Mesh(knuckle, brass), x, 0, -0.012);
      mesh.rotation.z = Math.PI / 2;
      add(hinge, mesh);
    }

    /* Light: one warm lamp from the upper left, a faint cool edge from behind, and the glow inside. */
    const key = new SpotLight('#ffd6a0', 125, 0, 0.42, 0.9, 2);
    key.position.set(-2.8, 5.4, 3.4);
    key.target.position.set(0, 0.45, 0);
    key.castShadow = true;
    /** Phones get a lighter shadow map; on a small screen the softer edge isn't visible. */
    const shadowSize = window.matchMedia('(pointer: coarse)').matches ? 512 : 768;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 14;
    scene.add(key, key.target);
    scene.add(new HemisphereLight('#ffe7cc', '#120705', 0.25));
    const rim = new DirectionalLight('#d9c6ff', 0.55);
    rim.position.set(3.2, 2.6, -3.4);
    scene.add(rim);
    const lamp = new PointLight('#ffbe80', 0, 3, 2);
    lamp.position.set(0.1, FOOT + H + 0.32, 0.05);
    scene.add(lamp);
    const glow = new Sprite(
      new SpriteMaterial({
        map: keep(radialTexture('rgba(255,196,130,1)', 'rgba(255,160,90,0)')),
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    glow.scale.set(2.6, 1.5, 1);
    glow.position.set(0, FOOT + H + 0.18, 0.05);
    scene.add(glow);

    /* Framing. */
    let width = 1;
    let height = 1;
    const tan = (fov: number) => Math.tan((fov * Math.PI) / 360);
    const closedShot = (): Shot => {
      const fov = 26;
      const elevation = 0.38;
      const aspect = width / height;
      const across = live.current.landscape ? 0.46 : 0.86;
      const tall = live.current.landscape ? 0.62 : 0.38;
      const apparentH = (H + LID + FOOT) * Math.cos(elevation) + D * Math.sin(elevation);
      const distance = Math.max(
        (W * 1.08) / (across * 2 * tan(fov) * aspect),
        apparentH / (tall * 2 * tan(fov)),
      );
      return live.current.landscape
        ? { look: BOX_CENTRE, elevation, distance, fov, x: 0.7, y: 0.56 }
        : { look: BOX_CENTRE, elevation, distance, fov, x: 0.5, y: 0.66 };
    };
    const insideShot = (): Shot => {
      const fov = 30;
      const aim = live.current.target ?? { cx: 0.5, cy: 0.47, w: 0.86 };
      const distance = SLIP_W / (Math.max(0.2, aim.w) * 2 * tan(fov) * (width / height));
      /* Nearly straight down, so the slip lands flat and square, as the film shows its receipt. */
      return { look: SLIP_AT, elevation: 1.48, distance, fov, x: aim.cx, y: aim.cy };
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
      const lid = ease(clamp01(t / LID_MS));
      hinge.rotation.x = -OPEN_ANGLE * lid;
      const warm = smooth(0.08, 0.6, lid);
      lamp.intensity = 1.1 * warm;
      (glow.material as SpriteMaterial).opacity = 0.32 * warm;
      reel.rotation.y = -2.6 * (Math.max(0, t - 300) / 1000) ** 1.4;
      const push = ease(clamp01((t - PUSH_FROM_MS) / (KEEPSAKE_PUSH_MS - PUSH_FROM_MS)));
      place(closedShot(), insideShot(), push);
    };

    const clasp = new Vector3();
    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      place(closedShot(), closedShot(), 0);
      clasp.copy(CLASP).project(camera);
      live.current.onAnchor((clasp.x + 1) / 2, (1 - clasp.y) / 2);
      render();
    };
    const observer = new ResizeObserver(() => {
      if (!rig.current) return;
      resize();
    });
    const reprint = (layout: PaperLayout) => {
      const old = paper.map;
      paper.map = keep(printPaper(layout));
      paper.needsUpdate = true;
      if (old) old.dispose();
      slip.scale.y = layout.h / layout.w / receipt.aspect;
    };
    rig.current = { render, pose, reprint };
    observer.observe(host);
    resize();
    live.current.onReady();

    /* The receipt uses the site's fonts; redraw it once they've arrived. */
    void document.fonts?.ready.then(() => {
      if (disposed) return;
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
            curledPlane(0.56, 0.68, 0.01),
            new MeshStandardMaterial({ map: texture, roughness: 0.6, side: DoubleSide }),
          );
          print.rotation.set(-Math.PI / 2, 0, -0.14);
          add(scene, at(print, 0.5, BED_TOP + 0.012, 0.22), true, true);
          render();
        })
        .catch(() => {
          /* No print (or a photo host without CORS): the tray holds the receipt and reel alone. */
        });
    }

    return () => {
      disposed = true;
      rig.current = null;
      observer.disconnect();
      el.removeEventListener('webglcontextlost', lost);
      const materials = new Set<Material>();
      scene.traverse((node) => {
        if (node instanceof Mesh || node instanceof Sprite) {
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
    // The box is built once per mount; its contents don't change while the title card is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (target?.paper) rig.current?.reprint(target.paper);
  }, [target]);

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
      if (t < KEEPSAKE_PUSH_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [opening, reduce]);

  return <div ref={holder} aria-hidden className="absolute inset-0" />;
});

export default KeepsakeBox;
