import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/dashboard/dev' || request.nextUrl.pathname.startsWith('/dashboard/dev/')) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.rewrite(new URL('/not-found', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/dev/:path*'],
};
