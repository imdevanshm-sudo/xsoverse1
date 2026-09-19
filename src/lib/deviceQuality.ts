export type DeviceTier = 'high' | 'low';

export interface CanvasQualityProfile {
  tier: DeviceTier;
  prefer2d: boolean;
  /** Clamped pixel ratio — never exceeds 1.5. */
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
}

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

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

function isNarrowViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
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
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('quality') === 'low'
  ) {
    return 'low';
  }

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (reducedMotion || readSaveData()) return 'low';

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

/** Clamp DPR so mobile never exceeds 1.5×. */
export function clampDpr(
  value: number | [number, number],
): number | [number, number] {
  if (typeof value === 'number') return Math.min(1.5, Math.max(1, value));
  return [Math.min(1.5, Math.max(1, value[0])), Math.min(1.5, value[1])];
}

export function getCanvasQualityProfile(
  tier: DeviceTier = detectDeviceTier(),
): CanvasQualityProfile {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const webglOk = typeof window !== 'undefined' ? supportsWebGL() : true;
  const coarse = isCoarsePointer();
  const narrow = isNarrowViewport();
  const mobileLike = coarse || narrow;
  const forceLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';

  // Only skip 3D when WebGL is missing, Save-Data is on, or ?lite=1.
  const prefer2d = forceLite || !webglOk || readSaveData();

  if (tier === 'low') {
    return {
      tier,
      prefer2d,
      dpr: clampDpr(1),
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
      shadowMapSize: 256,
    };
  }

  return {
    tier,
    prefer2d,
    dpr: clampDpr([1, 1.5]),
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
  };
}
