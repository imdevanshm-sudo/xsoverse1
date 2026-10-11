/**
 * Lite mode: `html.lite` switches off the paint-heavy effects in globals.css (backdrop blur,
 * looping glows and shimmers, film grain, SVG wood grain) on devices that can't keep up.
 *
 * Two triggers: a head script flags known-weak hardware before first paint, and a frame-rate
 * watch catches the rest (iPhones don't report memory or cores). `?lite=1` turns it on and
 * `?lite=0` off, both remembered on that browser.
 */

export const LITE_STORAGE_KEY = 'xso-lite';

/** Runs inline in <head>; keep it dependency-free ES5. */
export const LITE_HEAD_SCRIPT = `(function(){try{
var d=document.documentElement,q=location.search,k='${LITE_STORAGE_KEY}',s=localStorage.getItem(k);
if(/[?&]lite=0/.test(q)){localStorage.setItem(k,'0');return}
if(/[?&]lite=1/.test(q)){localStorage.setItem(k,'1');s='1'}
var n=navigator,c=n.connection,m=n.deviceMemory,h=n.hardwareConcurrency;
var weak=(c&&c.saveData)||(m!==undefined&&(m<=3||(h>0&&h<=4)));
if(s==='1'||(s!=='0'&&weak))d.classList.add('lite')
}catch(e){}})()`;

const WINDOW_MS = 2000;
const MAX_WINDOWS = 20;
const SLOW_FPS = 40;
const SLOW_WINDOWS_IN_A_ROW = 2;

export function isLite(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('lite');
}

function optedOut(): boolean {
  try {
    return localStorage.getItem(LITE_STORAGE_KEY) === '0';
  } catch {
    return false;
  }
}

function enableLite() {
  document.documentElement.classList.add('lite');
  try {
    localStorage.setItem(LITE_STORAGE_KEY, '1');
  } catch {
    /* private mode: lite for this visit only */
  }
}

/**
 * Samples the frame rate in short windows for the first ~40 s and turns lite mode on (and
 * remembers it) after two slow windows in a row. The first window is skipped: it covers
 * hydration and font loading, which stutter on every device. Returns a stop function.
 */
export function watchFrameRate(): () => void {
  if (isLite() || optedOut()) return () => {};

  let raf = 0;
  let frames = 0;
  let start = 0;
  let windows = 0;
  let slowInARow = 0;
  let stopped = false;

  const stop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
  };

  const tick = (now: number) => {
    if (stopped) return;
    if (!start) start = now;
    frames += 1;
    const elapsed = now - start;
    if (elapsed >= WINDOW_MS) {
      const fps = ((frames - 1) * 1000) / elapsed;
      windows += 1;
      if (windows > 1) {
        slowInARow = fps < SLOW_FPS ? slowInARow + 1 : 0;
        if (slowInARow >= SLOW_WINDOWS_IN_A_ROW) {
          enableLite();
          stop();
          return;
        }
      }
      if (windows >= MAX_WINDOWS) {
        stop();
        return;
      }
      frames = 0;
      start = 0;
    }
    raf = requestAnimationFrame(tick);
  };

  /** A hidden tab pauses frames; restart the window instead of counting the gap as slow. */
  const onVisibility = () => {
    cancelAnimationFrame(raf);
    frames = 0;
    start = 0;
    if (document.visibilityState === 'visible' && !stopped) raf = requestAnimationFrame(tick);
  };

  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(tick);
  return stop;
}
