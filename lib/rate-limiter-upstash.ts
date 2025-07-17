import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Duration type from Upstash
type Unit = "ms" | "s" | "m" | "h" | "d";
type Duration = `${number} ${Unit}` | `${number}${Unit}`;

// Rate limiter configuration
interface RateLimitConfig {
  requests: number;
  window: Duration;
}

// Define rate limits for different endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/transcript-oxylabs': {
    requests: 60,
    window: '1 m', // 60 requests per minute (1 per second)
  },
  '/api/format-transcript': {
    requests: 60,
    window: '1 m', // 60 requests per minute (1 per second)
  },
  'default': {
    requests: 120,
    window: '1 m', // 120 requests per minute (2 per second)
  },
};

// Create Redis instance from environment variables
const redis = Redis.fromEnv();

// Create rate limiters for each endpoint
const rateLimiters: Record<string, Ratelimit> = {};

// Initialize rate limiters
Object.entries(RATE_LIMITS).forEach(([endpoint, config]) => {
  rateLimiters[endpoint] = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `@upstash/ratelimit:${endpoint}`,
    analytics: true,
  });
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<unknown>;
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<RateLimitResult> {
  // Get the appropriate rate limiter or use default
  const limiter = rateLimiters[endpoint] || rateLimiters.default;
  
  // Check rate limit
  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    pending: result.pending,
  };
}

// Helper to get client identifier
export function getClientIdentifier(request: Request): string {
  // Try to get the real IP address from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  const vercelIp = request.headers.get('x-vercel-forwarded-for'); // Vercel specific
  
  // Use the first available IP
  const ip = forwarded?.split(',')[0].trim() || realIp || cfIp || vercelIp || 'anonymous';
  
  // Optionally combine with user agent for more granular control
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Create a unique identifier
  return `${ip}:${userAgent.substring(0, 50)}`;
}

// Helper to create rate limit headers
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    headers.set('Retry-After', Math.max(retryAfter, 0).toString());
  }
  
  return headers;
}