/**
 * Subscription helper functions
 * Replaces Clerk billing helpers with database-backed subscription management
 */

import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getUserSubscriptionTier as dbGetUserSubscriptionTier } from './db';

export type SubscriptionTier = 'free' | 'pro';
export type FeatureFlag = 'transcript-history' | 'unlimited-transcripts' | 'api-access' | 'priority-support';

/**
 * Get user's subscription tier
 * @param userId - Optional user ID. If not provided, gets from session.
 */
export async function getUserSubscriptionTier(userId?: string): Promise<SubscriptionTier> {
  try {
    let id = userId;

    if (!id) {
      const session = await getServerSession(authOptions);
      id = session?.user?.id;
    }

    if (!id) {
      return 'free';
    }

    return await dbGetUserSubscriptionTier(id);
  } catch (error) {
    console.error('[Subscription Helpers] Error getting tier:', error);
    return 'free';
  }
}

/**
 * Get daily transcript limit based on subscription tier
 */
export function getDailyTranscriptLimit(tier: SubscriptionTier): number {
  return tier === 'pro' ? Infinity : 5;
}

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(featureName: FeatureFlag, userId?: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);

  const featureAccess: Record<FeatureFlag, SubscriptionTier[]> = {
    'transcript-history': ['pro'],
    'unlimited-transcripts': ['pro'],
    'api-access': ['pro'],
    'priority-support': ['pro'],
  };

  return featureAccess[featureName]?.includes(tier) ?? false;
}

/**
 * Check if user can access transcript history
 */
export async function canAccessHistory(userId?: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);
  return tier === 'pro';
}

/**
 * Get subscription details for display
 */
export async function getSubscriptionDetails(userId: string) {
  const { getUserById } = await import('./db');
  const user = await getUserById(userId);

  return {
    tier: (user?.subscription_tier as SubscriptionTier) || 'free',
    status: user?.subscription_status || 'inactive',
    periodEnd: user?.subscription_period_end ? new Date(user.subscription_period_end) : null,
    isActive: user?.subscription_status === 'active',
  };
}

/**
 * Check if user is on free tier
 */
export async function isFreeTier(userId?: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);
  return tier === 'free';
}

/**
 * Check if user is on pro tier
 */
export async function isProTier(userId?: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);
  return tier === 'pro';
}
