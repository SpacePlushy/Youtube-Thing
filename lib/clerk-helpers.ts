/**
 * Clerk helper functions for subscription tier management and permissions
 * Following patterns from lib/youtube.ts and lib/rate-limiter-upstash.ts
 */

import { createClerkClient } from '@clerk/nextjs/server';

// Type for subscription tiers
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

// Type for feature flags
export type FeatureFlag = 'batch-processing' | 'api-access' | 'unlimited-history' | 'team-workspaces';

/**
 * Get user's subscription tier from Clerk metadata
 * @param userId - Clerk user ID
 * @returns subscription tier (defaults to 'free')
 */
export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    const clerkClient = await createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!
    });

    const user = await clerkClient.users.getUser(userId);
    const tier = user.publicMetadata?.subscriptionTier as SubscriptionTier | undefined;

    // Default to 'free' if not set
    return tier || 'free';
  } catch (error) {
    console.error('[Clerk Helpers] Error fetching user subscription tier:', error);
    return 'free'; // Safe default
  }
}

/**
 * Get daily transcript limit based on subscription tier
 * @param tier - subscription tier
 * @returns daily limit (number or Infinity for unlimited)
 */
export function getDailyTranscriptLimit(tier: SubscriptionTier): number {
  const limits: Record<SubscriptionTier, number> = {
    free: 5,
    starter: 50,
    pro: Infinity,
    enterprise: Infinity,
  } as const;

  return limits[tier];
}

/**
 * Check if user has access to a specific feature
 * @param userId - Clerk user ID
 * @param featureName - feature flag to check
 * @returns boolean indicating access
 */
export async function hasFeatureAccess(userId: string, featureName: FeatureFlag): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);

  // Feature access matrix
  const featureAccess: Record<FeatureFlag, SubscriptionTier[]> = {
    'batch-processing': ['pro', 'enterprise'],
    'api-access': ['pro', 'enterprise'],
    'unlimited-history': ['pro', 'enterprise'],
    'team-workspaces': ['enterprise'],
  };

  const allowedTiers = featureAccess[featureName];
  return allowedTiers.includes(tier);
}

/**
 * Check if user can access transcript history
 * Free tier users cannot access history
 * @param userId - Clerk user ID
 * @returns boolean indicating access
 */
export async function canAccessHistory(userId: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);
  return tier !== 'free';
}
