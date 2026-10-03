const LABEL = 'PREVIEW MODE — NOT FOR SHARING';

/** White text with a dark outline reads on both the black canvas and pale paper cards. */
const TILE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="240">` +
    `<text x="190" y="120" text-anchor="middle" dominant-baseline="middle" transform="rotate(-30 190 120)" ` +
    `font-family="ui-monospace, Menlo, monospace" font-size="15" font-weight="700" letter-spacing="3" ` +
    `fill="#fff" stroke="#000" stroke-width="0.8" paint-order="stroke">${LABEL}</text></svg>`,
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
      className="pointer-events-none fixed inset-0 z-[130] select-none opacity-20"
      style={{ backgroundImage: TILE, backgroundSize: '380px 240px' }}
    />
  );
}
