import { NextResponse, type NextRequest } from 'next/server';
import {
  TESTER_COOKIE,
  TESTER_COOKIE_DAYS,
  expectedTesterToken,
  siteInTestMode,
  testerTokenFor,
} from '@/lib/testerAccess';

/** Recipients' gift links, senders' dashboards and every API stay reachable while the store is paused. */
const OPEN = /^\/(?:api|xso|gift|maintenance|report)(?:\/|$)/;

export async function middleware(request: NextRequest) {
  if (!siteInTestMode()) return NextResponse.next();
  const { pathname, searchParams } = request.nextUrl;
  if (OPEN.test(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();

  const expected = await expectedTesterToken();
  const offered = searchParams.get('tester');
  if (expected && offered) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete('tester');
    const response = NextResponse.redirect(clean);
    if ((await testerTokenFor(offered)) === expected) {
      response.cookies.set(TESTER_COOKIE, expected, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: TESTER_COOKIE_DAYS * 24 * 60 * 60,
      });
    }
    return response;
  }
  if (expected && request.cookies.get(TESTER_COOKIE)?.value === expected) {
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL('/maintenance', request.url));
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
};
