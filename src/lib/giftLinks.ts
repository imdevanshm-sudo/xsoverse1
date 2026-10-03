/**
 * The two faces of a gift. `view` is the recipient's chromeless link; `manage` is the
 * sender's dashboard and only opens with the signed key from `@/lib/manageKey`.
 */
export function viewPath(giftId: string) {
  return `/xso/${encodeURIComponent(giftId)}/view`;
}

export function managePath(giftId: string, key: string) {
  return `/xso/${encodeURIComponent(giftId)}/manage?key=${encodeURIComponent(key)}`;
}

/** The sender's watermarked run-through of the recipient flow; same key as the dashboard. */
export function previewPath(giftId: string, key: string) {
  return `/xso/${encodeURIComponent(giftId)}/preview?key=${encodeURIComponent(key)}`;
}
