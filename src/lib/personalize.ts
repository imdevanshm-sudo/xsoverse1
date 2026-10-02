/** Fields that hold media or ids, never prose. */
const SKIP = new Set(['id', 'photos', 'image', 'voiceNoteUrl', 'voiceUrl', 'spotifyUrl']);
/** Signatures that are also everyday words; renaming them would rewrite every "me" in the copy. */
const COMMON = new Set(['me', 'you', 'us', 'i', 'we']);

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Swaps whole-word `from` for `to`, keeping ALL-CAPS spellings in caps (receipts shout). */
function swap(text: string, from: string, to: string) {
  return text.replace(new RegExp(`\\b${escape(from)}\\b`, 'gi'), (match) =>
    match === match.toUpperCase() && match !== match.toLowerCase() ? to.toUpperCase() : to,
  );
}

function walk<T>(value: T, from: string, to: string): T {
  if (typeof value === 'string') return swap(value, from, to) as T;
  if (Array.isArray(value)) return value.map((v) => walk(v, from, to)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, SKIP.has(key) ? v : walk(v, from, to)]),
    ) as T;
  }
  return value;
}

/**
 * Puts the real names everywhere the pack's placeholder names appear: the
 * name fields themselves and any copy that mentions them.
 */
export function personalize<T extends { customerName: string; billerName: string }>(
  draft: T,
  names: { recipient: string; sender: string },
): T {
  let next = draft;
  const pairs: [string, string][] = [
    [draft.customerName, names.recipient],
    [draft.billerName, names.sender],
  ];
  for (const [from, to] of pairs) {
    const old = from.trim().toLowerCase();
    if (old && to.trim() && !COMMON.has(old) && old !== to.trim().toLowerCase()) {
      next = walk(next, from.trim(), to.trim());
    }
  }
  return {
    ...next,
    customerName: names.recipient || next.customerName,
    billerName: names.sender || next.billerName,
  };
}
