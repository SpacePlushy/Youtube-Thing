import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Duration type from Upstash
type Unit = "ms" | "s" | "m" | "h" | "d";
type Duration = `${number} ${Unit}` | `${number}${Unit}`;

// Rate limiter configuration
interface RateLimitConfig {
  requests: number;
  window: Duration;
  globalDailyLimit?: number; // Optional global daily limit
}

// Define rate limits for different endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/transcript-oxylabs': {
    requests: 1,
    window: '10 s', // 1 request every 10 seconds
    globalDailyLimit: 1000, // 1000 requests per day globally
  },
  '/api/transcript-primary': {
    requests: 1,
    window: '10 s', // 1 request every 10 seconds (proxy to oxylabs)
    globalDailyLimit: 1000, // Same global limit (shares with oxylabs)
  },
  '/api/format-transcript': {
    requests: 1,
    window: '10 s', // 1 request every 10 seconds
  },
  'default': {
    requests: 1,
    window: '10 s', // 1 request every 10 seconds
  },
};

// Create Redis instance from environment variables
const redis = Redis.fromEnv();

// Create rate limiters for each endpoint
const rateLimiters: Record<string, Ratelimit> = {};

// Global daily rate limiter for Oxylabs API usage
const globalDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '24 h'), // 1000 requests per 24 hours
  prefix: '@upstash/ratelimit:global-daily-oxylabs',
  analytics: true,
});

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
  globalDailyRemaining?: number; // Remaining global daily requests
  globalDailyReset?: number; // When global daily limit resets
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<RateLimitResult> {
  // Check if this endpoint has a global daily limit
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  
  // If endpoint has global daily limit, check it first
  if (config.globalDailyLimit) {
    const globalResult = await globalDailyLimiter.limit('global-oxylabs-daily');
    
    if (!globalResult.success) {
      console.log(`[Rate Limit] Global daily limit reached: ${globalResult.remaining}/${globalResult.limit}`);
      return {
        success: false,
        limit: globalResult.limit,
        remaining: 0,
        reset: globalResult.reset,
        pending: globalResult.pending,
        globalDailyRemaining: globalResult.remaining,
        globalDailyReset: globalResult.reset,
      };
    }
  }
  
  // Get the appropriate rate limiter or use default
  const limiter = rateLimiters[endpoint] || rateLimiters.default;
  
  // Check per-user rate limit
  const result = await limiter.limit(identifier);
  
  // Get current global daily stats for response headers
  let globalDailyRemaining: number | undefined;
  let globalDailyReset: number | undefined;
  
  if (config.globalDailyLimit) {
    try {
      // Get current global state without incrementing
      const key = '@upstash/ratelimit:global-daily-oxylabs:global-oxylabs-daily';
      const currentCount = await redis.get(key) as number || 0;
      globalDailyRemaining = Math.max(0, config.globalDailyLimit - currentCount);
      globalDailyReset = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
    } catch (error) {
      console.warn('[Rate Limit] Could not get global daily stats:', error);
    }
  }
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    pending: result.pending,
    globalDailyRemaining,
    globalDailyReset,
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
  
  // Per-user rate limit headers
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  // Global daily limit headers (if applicable)
  if (result.globalDailyRemaining !== undefined) {
    headers.set('X-RateLimit-Global-Daily-Remaining', result.globalDailyRemaining.toString());
  }
  if (result.globalDailyReset !== undefined) {
    headers.set('X-RateLimit-Global-Daily-Reset', result.globalDailyReset.toString());
  }
  
  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    headers.set('Retry-After', Math.max(retryAfter, 0).toString());
  }
  
  return headers;
}

// Helper to get current global daily usage (for monitoring/admin purposes)
export async function getGlobalDailyUsage(): Promise<{
  used: number;
  remaining: number;
  limit: number;
  resetTime: number;
}> {
  try {
    // Use the analytics feature to get the current state
    // The getRemaining method gets the remaining count without incrementing
    const identifier = 'global-oxylabs-daily';
    const remaining = await globalDailyLimiter.getRemaining(identifier);
    
    const limit = 1000;
    const used = limit - remaining;
    
    // For sliding window, the reset time is always 24 hours from the oldest request
    // Since we don't have access to the exact reset time without incrementing,
    // we'll estimate it as 24 hours from now
    const resetTime = Date.now() + (24 * 60 * 60 * 1000);
    
    return {
      used,
      remaining,
      limit,
      resetTime,
    };
  } catch (error) {
    console.error('[Rate Limit] Error getting global daily usage:', error);
    return {
      used: 0,
      remaining: 1000,
      limit: 1000,
      resetTime: Date.now() + (24 * 60 * 60 * 1000),
    };
  }
}