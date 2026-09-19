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

/** True when the device can create a usable WebGL context. */
export function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', {
        failIfMajorPerformanceCaveat: true,
      }) ||
      canvas.getContext('webgl', {
        failIfMajorPerformanceCaveat: true,
      }) ||
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
    const lose = (gl as WebGLRenderingContext).getExtension(
      'WEBGL_lose_context',
    );
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Heuristic for older / constrained mobile GPUs and data-saver modes. */
export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'high';

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (reducedMotion || readSaveData()) return 'low';

  const memory = readDeviceMemory();
  if (memory !== undefined && memory <= 4) return 'low';

  const cores = navigator.hardwareConcurrency || 4;
  const coarse = isCoarsePointer();
  const narrow = isNarrowViewport();

  // Any touch phone/tablet: prefer the low path for stable frame times.
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
  const memory = typeof window !== 'undefined' ? readDeviceMemory() : undefined;
  const cores =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 8;
  const webglOk = typeof window !== 'undefined' ? supportsWebGL() : true;
  const coarse = isCoarsePointer();
  const narrow = isNarrowViewport();
  const mobileLike = coarse || narrow;
  const forceLite =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('lite') === '1';
  const prefer2d =
    forceLite ||
    !webglOk ||
    readSaveData() ||
    (memory !== undefined && memory <= 2) ||
    cores <= 2 ||
    (tier === 'low' && mobileLike);

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
