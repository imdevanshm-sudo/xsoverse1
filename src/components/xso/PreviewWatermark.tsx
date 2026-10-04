const LABEL = 'PREVIEW MODE — NOT FOR SHARING';

/**
 * Sparse, staggered marks: enough that no clean screenshot of the gift exists, light enough that
 * the letter and receipt still read through them. White with a thin dark outline so they show on
 * both the black canvas and pale paper.
 */
const mark = (x: number, y: number) =>
  `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-24 ${x} ${y})" ` +
  `font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="600" letter-spacing="3" ` +
  `fill="#fff" stroke="#000" stroke-width="0.5" paint-order="stroke">${LABEL}</text>`;

const tile = (width: number, height: number, marks: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${marks}</svg>`,
  )}")`;

/** About one mark per phone screen and two on a laptop: always in frame, never in the way. */
const PHONE = tile(520, 640, mark(250, 330));
const DESKTOP = tile(1400, 900, mark(360, 240) + mark(1050, 680));

const LAYER = 'pointer-events-none fixed inset-0 z-[130] select-none opacity-[0.09]';

/**
 * Sits over everything on the sender's previews, so a screenshot or screen recording can't pass
 * for the real gift link.
 */
export function PreviewWatermark() {
  return (
    <div aria-hidden data-preview-watermark>
      <div
        className={`${LAYER} md:hidden`}
        style={{ backgroundImage: PHONE, backgroundSize: '520px 640px' }}
      />
      <div
        className={`${LAYER} hidden md:block`}
        style={{ backgroundImage: DESKTOP, backgroundSize: '1400px 900px' }}
      />
    </div>
  );
}
