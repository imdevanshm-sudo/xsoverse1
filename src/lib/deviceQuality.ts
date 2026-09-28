export type DeviceTier = 'high' | 'low';

export type LiteReason = 'forced' | 'no-webgl' | 'save-data' | 'low-end' | 'performance';

export interface CanvasQualityProfile {
  tier: DeviceTier;
  prefer2d: boolean;
  /** Why the 2D viewer was chosen; null when 3D is allowed. */
  liteReason: LiteReason | null;
  /** Clamped pixel ratio — never exceeds 1.5. Prefer tuple form. */
  dpr: number | [number, number];
  shadows: boolean;
  antialias: boolean;
  powerPreference: WebGLPowerPreference;
  float: boolean;
  contactShadows: boolean;
  presentationControls: boolean;
  fog: boolean;
  deskStripes: number;
  paperFibers: boolean;
  anisotropy: number;
  softOverlays: boolean;
  reducedMotion: boolean;
  /** Cap for ContactShadows map size when enabled. */
  shadowMapSize: number;
  /** How many PerformanceMonitor declines have been applied (0–2). */
  degradeSteps: number;
  /** Geometry segment budget for cylinders / toruses. */
  segments: number;
}

/** Hard ceiling for all Canvas DPR values. */
export const MAX_CANVAS_DPR = 1.5;

export const DPR_RANGE: [number, number] = [1, MAX_CANVAS_DPR];

function readSaveData(): boolean {
  try {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection;
    return Boolean(connection?.saveData);
  } catch {
    return false;
  }
}

function readDeviceMemory(): number | undefined {
  try {
    return (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  } catch {
    return undefined;
  }
}

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function tryWebGlContext(
  canvas: HTMLCanvasElement,
  failIfMajorPerformanceCaveat: boolean,
): boolean {
  const attrs = { failIfMajorPerformanceCaveat };
  const gl =
    canvas.getContext('webgl2', attrs) ||
    canvas.getContext('webgl', attrs) ||
    canvas.getContext('experimental-webgl', attrs);
  if (!gl) return false;
  const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
  lose?.loseContext();
  return true;
}

/**
 * True when the device can create a usable WebGL context.
 * Tries without the major-performance caveat first (older GPUs often
 * fail that check but still run fine at DPR 1).
 */
export function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    if (tryWebGlContext(canvas, false)) return true;
    return tryWebGlContext(document.createElement('canvas'), true);
  } catch {
    return false;
  }
}

/** Heuristic for older / constrained mobile GPUs and data-saver modes. */
export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'high';

  if (
    new URLSearchParams(window.location.search).get('quality') === 'low'
  ) {
    return 'low';
  }

  if (prefersReducedMotion() || readSaveData()) return 'low';

  const memory = readDeviceMemory();
  if (memory !== undefined && memory <= 4) return 'low';

  const cores = navigator.hardwareConcurrency || 4;
  const coarse = isCoarsePointer();
  const narrow = isNarrowViewport();

  // Touch / narrow viewports use the low-quality 3D profile (not 2D).
  if (coarse) return 'low';
  if (cores <= 4 && narrow) return 'low';

  return 'high';
}

/**
 * Phones and laptops too weak for three.js — these get the 2D viewer.
 * Ordinary modern phones stay on the low-tier 3D profile.
 */
export function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('quality') === 'low') {
    return true;
  }
  if (readSaveData()) return true;
  const memory = readDeviceMemory();
  if (memory !== undefined && memory <= 3) return true;
  const cores = navigator.hardwareConcurrency;
  return cores !== undefined && cores > 0 && cores <= 4;
}

export function liteReasonLabel(reason: LiteReason | null): string {
  switch (reason) {
    case 'no-webgl':
      return 'Lite mode · WebGL unavailable';
    case 'save-data':
      return 'Lite mode · Data saver on';
    case 'low-end':
      return 'Lite mode · Optimized for this device';
    case 'performance':
      return 'Lite mode · Switched for smoother playback';
    case 'forced':
    default:
      return 'Lite mode';
  }
}

/** Clamp DPR so nothing ever exceeds 1.5×. */
export function clampDpr(
  value: number | [number, number],
): number | [number, number] {
  if (typeof value === 'number') {
    return Math.min(MAX_CANVAS_DPR, Math.max(1, value));
  }
  return [
    Math.min(MAX_CANVAS_DPR, Math.max(1, value[0])),
    Math.min(MAX_CANVAS_DPR, value[1]),
  ];
}

export function getCanvasQualityProfile(
  tier: DeviceTier = detectDeviceTier(),
): CanvasQualityProfile {
  const reducedMotion = prefersReducedMotion();
  const webglOk = typeof window !== 'undefined' ? supportsWebGL() : true;
  const coarse = isCoarsePointer();
  const narrow = isNarrowViewport();
  const mobileLike = coarse || narrow;
  const forceLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  const liteReason: LiteReason | null = forceLite
    ? 'forced'
    : !webglOk
      ? 'no-webgl'
      : typeof window !== 'undefined' && readSaveData()
        ? 'save-data'
        : isLowEndDevice()
          ? 'low-end'
          : null;
  const prefer2d = liteReason !== null;

  if (tier === 'low') {
    return {
      tier,
      prefer2d,
      liteReason,
      dpr: 1,
      shadows: false,
      antialias: false,
      powerPreference: 'default',
      float: false,
      contactShadows: false,
      presentationControls: false,
      fog: false,
      deskStripes: 0,
      paperFibers: false,
      anisotropy: 1,
      softOverlays: false,
      reducedMotion,
      shadowMapSize: 128,
      degradeSteps: 0,
      segments: 12,
    };
  }

  return {
    tier,
    prefer2d,
    liteReason,
    dpr: clampDpr(DPR_RANGE),
    shadows: !coarse,
    antialias: false,
    powerPreference: 'default',
    float: !reducedMotion && !coarse,
    contactShadows: !coarse,
    presentationControls: !coarse,
    fog: !coarse,
    deskStripes: coarse ? 0 : 18,
    paperFibers: !coarse,
    anisotropy: coarse ? 1 : 2,
    softOverlays: !mobileLike,
    reducedMotion,
    shadowMapSize: 256,
    degradeSteps: 0,
    segments: mobileLike ? 16 : 24,
  };
}

/** Deterministic profile for SSR and the hydration render. */
export const SSR_QUALITY_PROFILE: CanvasQualityProfile = {
  tier: 'high',
  prefer2d: false,
  liteReason: null,
  dpr: DPR_RANGE,
  shadows: true,
  antialias: false,
  powerPreference: 'default',
  float: true,
  contactShadows: true,
  presentationControls: true,
  fog: true,
  deskStripes: 18,
  paperFibers: true,
  anisotropy: 2,
  softOverlays: true,
  reducedMotion: false,
  shadowMapSize: 256,
  degradeSteps: 0,
  segments: 24,
};

/**
 * Step down fidelity when PerformanceMonitor reports a decline.
 * Safe to call repeatedly; caps at a minimal GPU-friendly profile.
 */
export function downgradeCanvasQuality(
  profile: CanvasQualityProfile,
): CanvasQualityProfile {
  const step = Math.min(2, profile.degradeSteps + 1);
  if (step === 1) {
    return {
      ...profile,
      degradeSteps: 1,
      dpr: 1,
      shadows: false,
      contactShadows: false,
      float: false,
      fog: false,
      softOverlays: false,
      deskStripes: 0,
      paperFibers: false,
      shadowMapSize: 128,
      segments: Math.min(profile.segments, 12),
    };
  }
  return {
    ...profile,
    tier: 'low',
    degradeSteps: 2,
    dpr: 1,
    shadows: false,
    contactShadows: false,
    float: false,
    fog: false,
    softOverlays: false,
    presentationControls: false,
    deskStripes: 0,
    paperFibers: false,
    anisotropy: 1,
    shadowMapSize: 128,
    segments: 8,
  };
}

/** Gentle restore toward the device baseline after FPS recovers. */
export function upgradeCanvasQuality(
  current: CanvasQualityProfile,
  baseline: CanvasQualityProfile,
): CanvasQualityProfile {
  if (current.degradeSteps <= 0) return baseline;
  const step = current.degradeSteps - 1;
  if (step === 0) return { ...baseline, degradeSteps: 0 };
  return downgradeCanvasQuality({ ...baseline, degradeSteps: 0 });
}
