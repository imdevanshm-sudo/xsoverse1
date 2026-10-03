const LABEL = 'PREVIEW MODE — NOT FOR SHARING';

/**
 * Two staggered marks per 720x480 tile: enough that no clean screenshot of the gift exists, sparse
 * and light enough that the letter and receipt still read through it. White with a thin dark
 * outline so it shows on both the black canvas and pale paper.
 */
const mark = (x: number, y: number) =>
  `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-24 ${x} ${y})" ` +
  `font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="600" letter-spacing="3" ` +
  `fill="#fff" stroke="#000" stroke-width="0.5" paint-order="stroke">${LABEL}</text>`;

const TILE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480">${mark(180, 120)}${mark(540, 360)}</svg>`,
)}")`;

/**
 * Sits over everything on the sender's previews, so a screenshot or screen recording can't pass
 * for the real gift link.
 */
export function PreviewWatermark() {
  return (
    <div
      aria-hidden
      data-preview-watermark
      className="pointer-events-none fixed inset-0 z-[130] select-none opacity-[0.13]"
      style={{ backgroundImage: TILE, backgroundSize: '720px 480px' }}
    />
  );
}
