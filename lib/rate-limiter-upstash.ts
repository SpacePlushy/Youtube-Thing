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

// Simple counter key for global daily usage
const GLOBAL_DAILY_KEY = 'oxylabs:daily:usage';
const GLOBAL_DAILY_LIMIT = 1000;

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

// Simple helper to get/increment daily usage
async function incrementDailyUsage(): Promise<{ count: number; resetAt: number }> {
  const now = Date.now();
  const todayKey = `${GLOBAL_DAILY_KEY}:${new Date().toISOString().split('T')[0]}`;
  
  // Increment and get new count
  const count = await redis.incr(todayKey);
  
  // Set expiry to end of day (+ 1 hour buffer)
  if (count === 1) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const ttl = Math.ceil((tomorrow.getTime() - now) / 1000) + 3600; // +1 hour buffer
    await redis.expire(todayKey, ttl);
  }
  
  // Calculate reset time (midnight)
  const resetAt = new Date();
  resetAt.setDate(resetAt.getDate() + 1);
  resetAt.setHours(0, 0, 0, 0);
  
  return { count, resetAt: resetAt.getTime() };
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string
): Promise<RateLimitResult> {
  // Check if this endpoint has a global daily limit
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;
  
  // Check global daily limit first
  if (config.globalDailyLimit) {
    const todayKey = `${GLOBAL_DAILY_KEY}:${new Date().toISOString().split('T')[0]}`;
    const currentCount = (await redis.get(todayKey) as number) || 0;
    
    console.log(`[Rate Limit] Checking global daily - Key: ${todayKey}, Count: ${currentCount}/${GLOBAL_DAILY_LIMIT}, Endpoint: ${endpoint}`);
    
    if (currentCount >= GLOBAL_DAILY_LIMIT) {
      console.log(`[Rate Limit] Global daily limit reached: ${currentCount}/${GLOBAL_DAILY_LIMIT}`);
      const resetAt = new Date();
      resetAt.setDate(resetAt.getDate() + 1);
      resetAt.setHours(0, 0, 0, 0);
      
      return {
        success: false,
        limit: GLOBAL_DAILY_LIMIT,
        remaining: 0,
        reset: resetAt.getTime(),
        pending: Promise.resolve(),
        globalDailyRemaining: 0,
        globalDailyReset: resetAt.getTime(),
      };
    }
  }
  
  // Check per-user rate limit
  const limiter = rateLimiters[endpoint] || rateLimiters.default;
  const result = await limiter.limit(identifier);
  
  // If per-user limit passed and this endpoint counts toward global limit, increment it
  if (result.success && config.globalDailyLimit) {
    const { count, resetAt } = await incrementDailyUsage();
    result.globalDailyRemaining = Math.max(0, GLOBAL_DAILY_LIMIT - count);
    result.globalDailyReset = resetAt;
  }
  
  return result;
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
    // Simply read today's counter
    const todayKey = `${GLOBAL_DAILY_KEY}:${new Date().toISOString().split('T')[0]}`;
    const used = (await redis.get(todayKey) as number) || 0;
    
    console.log(`[Admin Usage] Reading key: ${todayKey}, Value: ${used}`);
    
    // Calculate reset time (midnight)
    const resetAt = new Date();
    resetAt.setDate(resetAt.getDate() + 1);
    resetAt.setHours(0, 0, 0, 0);
    
    return {
      used,
      remaining: Math.max(0, GLOBAL_DAILY_LIMIT - used),
      limit: GLOBAL_DAILY_LIMIT,
      resetTime: resetAt.getTime(),
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