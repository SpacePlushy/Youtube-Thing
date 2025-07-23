/**
 * Server-side guest usage tracker using Upstash Redis
 * Tracks "one free use" for unauthenticated users
 */

import { Redis } from '@upstash/redis';

// Create Redis instance from environment variables
const redis = Redis.fromEnv();

// Test connection on initialization
redis.ping().then(() => {
  console.log('[Guest Usage] Successfully connected to Upstash Redis');
}).catch((error) => {
  console.error('[Guest Usage] Failed to connect to Upstash Redis:', error);
});

// Key prefix for guest usage tracking
const GUEST_USAGE_PREFIX = 'guest:usage';
const GUEST_USAGE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export interface GuestUsageData {
  hasUsedFreeExtraction: boolean;
  firstUseTimestamp: number;
  lastAccessTimestamp: number;
  extractedVideoIds: string[];
}

/**
 * Get guest usage data from Redis
 */
export async function getGuestUsage(identifier: string): Promise<GuestUsageData | null> {
  try {
    const key = `${GUEST_USAGE_PREFIX}:${identifier}`;
    const data = await redis.get<GuestUsageData>(key);
    
    if (!data) {
      return null;
    }
    
    // Check if data has expired (shouldn't happen with TTL, but just in case)
    const age = Date.now() - data.firstUseTimestamp;
    if (age > GUEST_USAGE_TTL * 1000) {
      await redis.del(key);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[Guest Usage] Error getting usage:', error);
    return null;
  }
}

/**
 * Check if guest has used their free extraction
 */
export async function hasGuestUsedFreeExtraction(identifier: string): Promise<boolean> {
  try {
    const usage = await getGuestUsage(identifier);
    const hasUsed = usage?.hasUsedFreeExtraction || false;
    console.log(`[Guest Usage] Checking usage for ${identifier}: ${hasUsed}`);
    return hasUsed;
  } catch (error) {
    console.error('[Guest Usage] Error checking usage:', error);
    // On error, allow access to avoid blocking users
    return false;
  }
}

/**
 * Mark that guest has used their free extraction
 */
export async function markGuestUsageUsed(identifier: string, videoId: string): Promise<void> {
  try {
    const key = `${GUEST_USAGE_PREFIX}:${identifier}`;
    const now = Date.now();
    
    // Get existing data or create new
    const existing = await getGuestUsage(identifier);
    
    const usage: GuestUsageData = existing || {
      hasUsedFreeExtraction: false,
      firstUseTimestamp: now,
      lastAccessTimestamp: now,
      extractedVideoIds: [],
    };
    
    // Update usage
    usage.hasUsedFreeExtraction = true;
    usage.lastAccessTimestamp = now;
    
    // Add video ID if not already tracked
    if (!usage.extractedVideoIds.includes(videoId)) {
      usage.extractedVideoIds.push(videoId);
    }
    
    // Save to Redis with TTL
    await redis.setex(key, GUEST_USAGE_TTL, usage);
    
    console.log(`[Guest Usage] Marked usage for ${identifier}, video: ${videoId}`);
  } catch (error) {
    console.error('[Guest Usage] Error marking usage:', error);
    // Don't throw - allow the request to continue even if tracking fails
  }
}

/**
 * Get remaining time until guest usage resets (in seconds)
 */
export async function getGuestUsageResetTime(identifier: string): Promise<number | null> {
  try {
    const key = `${GUEST_USAGE_PREFIX}:${identifier}`;
    const ttl = await redis.ttl(key);
    
    if (ttl < 0) {
      return null; // Key doesn't exist or has no TTL
    }
    
    return ttl;
  } catch (error) {
    console.error('[Guest Usage] Error getting TTL:', error);
    return null;
  }
}

/**
 * Reset guest usage (for testing/admin purposes)
 */
export async function resetGuestUsage(identifier: string): Promise<void> {
  try {
    const key = `${GUEST_USAGE_PREFIX}:${identifier}`;
    await redis.del(key);
    console.log(`[Guest Usage] Reset usage for ${identifier}`);
  } catch (error) {
    console.error('[Guest Usage] Error resetting usage:', error);
  }
}

/**
 * Get guest usage statistics (for monitoring)
 */
export async function getGuestUsageStats(): Promise<{
  totalGuests: number;
  activeToday: number;
}> {
  try {
    // This is a simplified version - in production you might want to track more stats
    const pattern = `${GUEST_USAGE_PREFIX}:*`;
    const keys = await redis.keys(pattern);
    
    let activeToday = 0;
    const today = new Date().setHours(0, 0, 0, 0);
    
    // Check each guest's last access
    for (const key of keys) {
      const data = await redis.get<GuestUsageData>(key);
      if (data && data.lastAccessTimestamp >= today) {
        activeToday++;
      }
    }
    
    return {
      totalGuests: keys.length,
      activeToday,
    };
  } catch (error) {
    console.error('[Guest Usage] Error getting stats:', error);
    return {
      totalGuests: 0,
      activeToday: 0,
    };
  }
}