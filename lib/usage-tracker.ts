/**
 * Usage tracking module for transcript extraction limits
 * Following patterns from lib/rate-limiter-upstash.ts
 */

import { Redis } from '@upstash/redis';
import { getUserSubscriptionTier, getDailyTranscriptLimit } from './clerk-helpers';
import type { UsageStats } from './types';

// Create Redis instance (gracefully handle missing config)
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  } else {
    console.warn('[Usage Tracker] Redis configuration not found. Usage tracking disabled for development.');
  }
} catch (error) {
  console.error('[Usage Tracker] Failed to initialize Redis:', error);
  redis = null;
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate midnight UTC reset time
 */
function getMidnightUTCReset(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Check if user can proceed with transcript extraction
 * @param userId - Clerk user ID
 * @returns usage stats with canProceed flag
 */
export async function checkUsageLimit(userId: string): Promise<UsageStats> {
  // If Redis is not available, allow in development
  if (!redis) {
    return {
      currentUsage: 0,
      dailyLimit: Infinity,
      tier: 'free',
      resetTime: getMidnightUTCReset(),
      canProceed: true,
    };
  }

  try {
    // Get user's subscription tier
    const tier = await getUserSubscriptionTier(userId);
    const dailyLimit = getDailyTranscriptLimit(tier);

    // Get current usage from Redis
    const today = getTodayKey();
    const usageKey = `usage:${userId}:${today}`;
    const currentUsage = (await redis.get<number>(usageKey)) ?? 0;

    // Calculate reset time
    const resetTime = getMidnightUTCReset();

    // Determine if user can proceed
    const canProceed = currentUsage < dailyLimit;

    return {
      currentUsage,
      dailyLimit,
      tier,
      resetTime,
      canProceed,
    };
  } catch (error) {
    console.error('[Usage Tracker] Error checking usage limit:', error);
    // Safe default: allow in case of errors
    return {
      currentUsage: 0,
      dailyLimit: 5,
      tier: 'free',
      resetTime: getMidnightUTCReset(),
      canProceed: true,
    };
  }
}

/**
 * Increment usage counter after successful transcript extraction
 * @param userId - Clerk user ID
 * @returns new usage count
 */
export async function incrementUsage(userId: string): Promise<number> {
  // If Redis is not available, return 0 (development mode)
  if (!redis) {
    return 0;
  }

  try {
    const today = getTodayKey();
    const usageKey = `usage:${userId}:${today}`;

    // Atomically increment usage counter
    const newCount = await redis.incr(usageKey);

    // Set 48-hour TTL for automatic cleanup (172800 seconds)
    // We use 48 hours instead of 24 to ensure the key doesn't expire mid-day
    await redis.expire(usageKey, 172800);

    console.log(`[Usage Tracker] Incremented usage for user ${userId}: ${newCount}`);

    return newCount;
  } catch (error) {
    console.error('[Usage Tracker] Error incrementing usage:', error);
    return 0;
  }
}

/**
 * Get current usage statistics for a user
 * @param userId - Clerk user ID
 * @returns usage stats
 */
export async function getUsageStats(userId: string): Promise<UsageStats> {
  // If Redis is not available, return default stats
  if (!redis) {
    return {
      currentUsage: 0,
      dailyLimit: Infinity,
      tier: 'free',
      resetTime: getMidnightUTCReset(),
    };
  }

  try {
    // Get user's subscription tier
    const tier = await getUserSubscriptionTier(userId);
    const dailyLimit = getDailyTranscriptLimit(tier);

    // Get current usage from Redis
    const today = getTodayKey();
    const usageKey = `usage:${userId}:${today}`;
    const currentUsage = (await redis.get<number>(usageKey)) ?? 0;

    // Calculate reset time
    const resetTime = getMidnightUTCReset();

    return {
      currentUsage,
      dailyLimit,
      tier,
      resetTime,
    };
  } catch (error) {
    console.error('[Usage Tracker] Error getting usage stats:', error);
    // Safe default
    return {
      currentUsage: 0,
      dailyLimit: 5,
      tier: 'free',
      resetTime: getMidnightUTCReset(),
    };
  }
}
