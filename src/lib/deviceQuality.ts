export type DeviceTier = 'high' | 'low';

export interface CanvasQualityProfile {
  tier: DeviceTier;
  prefer2d: boolean;
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
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 768px)').matches;

  if (cores <= 4 && (coarse || narrow)) return 'low';
  if (coarse && narrow) return 'low';

  return 'high';
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
  const mobileLike =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 768px)').matches;
  const prefer2d =
    !webglOk ||
    readSaveData() ||
    (memory !== undefined && memory <= 2) ||
    cores <= 2 ||
    (tier === 'low' && mobileLike);

  if (tier === 'low') {
    return {
      tier,
      prefer2d,
      dpr: 1,
      shadows: false,
      antialias: false,
      powerPreference: 'default',
      float: false,
      contactShadows: false,
      presentationControls: !reducedMotion,
      fog: false,
      deskStripes: 0,
      paperFibers: false,
      anisotropy: 1,
      softOverlays: false,
      reducedMotion,
    };
  }

  return {
    tier,
    prefer2d,
    dpr: [1, 1.5],
    shadows: true,
    antialias: true,
    powerPreference: 'high-performance',
    float: !reducedMotion,
    contactShadows: true,
    presentationControls: true,
    fog: true,
    deskStripes: 18,
    paperFibers: true,
    anisotropy: 4,
    softOverlays: true,
    reducedMotion,
  };
}
