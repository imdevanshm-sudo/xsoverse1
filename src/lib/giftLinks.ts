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
