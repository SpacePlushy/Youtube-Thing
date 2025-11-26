/**
 * Clerk helper functions for subscription tier management and permissions
 * Updated to use Clerk Billing features with has() method
 * Following patterns from lib/youtube.ts and lib/rate-limiter-upstash.ts
 */

import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/nextjs/server';

// Type for subscription tiers (plan slugs in Clerk Billing)
// These should match the plan slugs configured in your Clerk Dashboard
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

// Type for feature flags (feature slugs in Clerk Billing)
// These should match the feature slugs configured in your Clerk Dashboard
export type FeatureFlag = 'batch-processing' | 'api-access' | 'unlimited-history' | 'team-workspaces' | 'transcript-history';

/**
 * Get user's subscription tier using Clerk's has() method
 * This checks against plans configured in Clerk Billing
 * @returns subscription tier (defaults to 'free')
 */
export async function getUserSubscriptionTier(userId?: string): Promise<SubscriptionTier> {
  try {
    const { has } = await auth();

    // Check plans in order of highest to lowest tier
    // The has() method checks if user has access to a specific plan
    if (has({ plan: 'enterprise' })) return 'enterprise';
    if (has({ plan: 'pro' })) return 'pro';
    if (has({ plan: 'starter' })) return 'starter';

    // If userId is provided, also check publicMetadata as fallback
    // This maintains backwards compatibility during migration
    if (userId) {
      const clerkClient = await createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY!
      });
      const user = await clerkClient.users.getUser(userId);
      const metadataTier = user.publicMetadata?.subscriptionTier as SubscriptionTier | undefined;
      if (metadataTier && metadataTier !== 'free') {
        return metadataTier;
      }
    }

    return 'free';
  } catch (error) {
    console.error('[Clerk Helpers] Error checking subscription tier:', error);
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
 * Check if user has access to a specific feature using Clerk's has() method
 * Features should be configured in Clerk Dashboard and attached to plans
 * @param featureName - feature slug to check
 * @returns boolean indicating access
 */
export async function hasFeatureAccess(featureName: FeatureFlag): Promise<boolean>;
export async function hasFeatureAccess(userId: string, featureName: FeatureFlag): Promise<boolean>;
export async function hasFeatureAccess(userIdOrFeature: string | FeatureFlag, featureName?: FeatureFlag): Promise<boolean> {
  // Handle overloads
  const feature = featureName ?? (userIdOrFeature as FeatureFlag);

  try {
    const { has } = await auth();

    // Use Clerk's native feature check if available
    const hasFeature = has({ feature });
    if (hasFeature) return true;

    // Fallback to tier-based access for backwards compatibility
    const tier = await getUserSubscriptionTier();

    const featureAccess: Record<FeatureFlag, SubscriptionTier[]> = {
      'batch-processing': ['pro', 'enterprise'],
      'api-access': ['pro', 'enterprise'],
      'unlimited-history': ['pro', 'enterprise'],
      'team-workspaces': ['enterprise'],
      'transcript-history': ['starter', 'pro', 'enterprise'],
    };

    const allowedTiers = featureAccess[feature];
    return allowedTiers?.includes(tier) ?? false;
  } catch (error) {
    console.error('[Clerk Helpers] Error checking feature access:', error);
    return false;
  }
}

/**
 * Check if user can access transcript history
 * Uses Clerk's has() to check for 'transcript-history' feature or non-free plan
 * @returns boolean indicating access
 */
export async function canAccessHistory(): Promise<boolean>;
export async function canAccessHistory(userId: string): Promise<boolean>;
export async function canAccessHistory(userId?: string): Promise<boolean> {
  try {
    const { has } = await auth();

    // Check for transcript-history feature first
    if (has({ feature: 'transcript-history' })) return true;

    // Check for any paid plan
    if (has({ plan: 'starter' })) return true;
    if (has({ plan: 'pro' })) return true;
    if (has({ plan: 'enterprise' })) return true;

    // Fallback to tier check for backwards compatibility
    const tier = await getUserSubscriptionTier(userId);
    return tier !== 'free';
  } catch (error) {
    console.error('[Clerk Helpers] Error checking history access:', error);
    return false;
  }
}
