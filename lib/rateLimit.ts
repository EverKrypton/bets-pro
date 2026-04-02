/**
 * Rate limiting for API routes
 * In-memory rate limiter (suitable for single-instance deployments)
 * For distributed deployments, consider Redis-based solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const rateLimitConfigs = {
  auth: { windowMs: 60 * 1000, maxRequests: 10 },
  login: { windowMs: 60 * 1000, maxRequests: 5 },
  register: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  bet: { windowMs: 60 * 1000, maxRequests: 30 },
  withdraw: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  deposit: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  support: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
  default: { windowMs: 60 * 1000, maxRequests: 60 },
} as const;

export type RateLimitType = keyof typeof rateLimitConfigs;

export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default',
): { allowed: boolean; remaining: number; resetTime: number; retryAfter: number } {
  const config = rateLimitConfigs[type] || rateLimitConfigs.default;
  const key = `${type}:${identifier}`;
  const now = Date.now();

  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
      retryAfter: 0,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
    retryAfter: 0,
  };
}

export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetTime) {
      rateLimits.delete(key);
    }
  }
}

setInterval(cleanupRateLimits, 60 * 1000);