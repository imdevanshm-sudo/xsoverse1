/**
 * Store test mode. With `LEMONSQUEEZY_TEST_MODE=true` the public store is paused behind an
 * "under development" page and checkouts run in Lemon test mode. Only the owner's browser,
 * unlocked once with `?tester=<XSO_TESTER_CODE>`, sees the store and can check out.
 * Runs in both the edge middleware and Node routes, so it uses Web Crypto only.
 */
export const TESTER_COOKIE = 'xso_tester';
export const TESTER_COOKIE_DAYS = 30;

export function siteInTestMode(): boolean {
  return process.env.LEMONSQUEEZY_TEST_MODE === 'true';
}

/** The cookie holds a hash of the code, never the code itself. */
export async function testerTokenFor(code: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`xso-tester:${code}`),
  );
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function expectedTesterToken(): Promise<string | null> {
  const code = process.env.XSO_TESTER_CODE;
  return code ? testerTokenFor(code) : null;
}

export async function isTester(cookieValue: string | undefined): Promise<boolean> {
  const expected = await expectedTesterToken();
  return Boolean(expected && cookieValue && cookieValue === expected);
}
