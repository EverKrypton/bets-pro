import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, RateLimitType } from '@/lib/rateLimit';

const PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/webhook/oxapay',
  '/api/settings/public',
]);

const RATE_LIMIT_MAP: Record<string, RateLimitType> = {
  '/api/auth/login': 'login',
  '/api/auth/register': 'register',
  '/api/bet/place': 'bet',
  '/api/bet/inverse': 'bet',
  '/api/withdraw/request': 'withdraw',
  '/api/deposit': 'deposit',
  '/api/deposit/create': 'deposit',
  '/api/support': 'support',
};

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const ip = getClientIP(request);
  const path = request.nextUrl.pathname;

  const rateLimitType = RATE_LIMIT_MAP[path] || 'default';
  const { allowed, remaining, resetTime, retryAfter } = checkRateLimit(ip, rateLimitType);

  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(resetTime));

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetTime),
        },
      },
    );
  }

  response.headers.set('Access-Control-Allow-Origin', "'self'");
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};