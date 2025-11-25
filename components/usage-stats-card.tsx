'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Loader2, Infinity as InfinityIcon } from 'lucide-react';
import { UpgradeCTA } from './upgrade-cta';
import type { UsageStats } from '@/lib/types';

export function UsageStatsCard() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/usage');

      if (!response.ok) {
        throw new Error('Failed to fetch usage stats');
      }

      const data = await response.json();
      setUsageStats(data);
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (): number => {
    if (!usageStats || usageStats.dailyLimit === Infinity) {
      return 0;
    }
    return Math.min((usageStats.currentUsage / usageStats.dailyLimit) * 100, 100);
  };

  const getTimeUntilReset = (): string => {
    if (!usageStats?.resetTime) return 'Unknown';

    const resetDate = new Date(usageStats.resetTime);
    const now = new Date();
    const diff = resetDate.getTime() - now.getTime();

    if (diff < 0) return 'Soon';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTierDisplayName = (tier: string): string => {
    const tierNames: Record<string, string> = {
      free: 'Free',
      starter: 'Starter',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return tierNames[tier] || 'Unknown';
  };

  const shouldShowUpgrade = (): boolean => {
    if (!usageStats) return false;
    return usageStats.tier === 'free' || usageStats.tier === 'starter';
  };

  const getUpgradeTarget = (): 'starter' | 'pro' => {
    if (usageStats?.tier === 'free') return 'starter';
    return 'pro';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchUsageStats}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!usageStats) {
    return null;
  }

  const percentage = calculatePercentage();
  const isUnlimited = usageStats.dailyLimit === Infinity;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Usage</h2>
            <p className="text-sm text-gray-500">Daily transcript limit</p>
          </div>
        </div>

        {/* Tier Badge */}
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
          {getTierDisplayName(usageStats.tier)}
        </span>
      </div>

      {/* Usage Display */}
      <div className="mb-6">
        {isUnlimited ? (
          <div className="text-center py-6">
            <InfinityIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-xl font-semibold text-gray-900 mb-1">Unlimited</p>
            <p className="text-sm text-gray-500">No daily limits on your plan</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="text-3xl font-bold text-gray-900">{usageStats.currentUsage}</span>
                <span className="text-gray-500 text-lg"> / {usageStats.dailyLimit}</span>
              </div>
              <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-2 rounded-full ${
                  percentage >= 90
                    ? 'bg-red-500'
                    : percentage >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

            <p className="text-sm text-gray-500">
              {usageStats.dailyLimit - usageStats.currentUsage > 0
                ? `${usageStats.dailyLimit - usageStats.currentUsage} transcripts remaining`
                : 'Daily limit reached'}
            </p>
          </>
        )}
      </div>

      {/* Reset Time */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <Clock className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">
          Resets in <span className="font-medium text-gray-900">{getTimeUntilReset()}</span>
        </span>
      </div>

      {/* Upgrade CTA */}
      {shouldShowUpgrade() && (
        <UpgradeCTA
          currentTier={usageStats.tier as 'free' | 'starter'}
          targetTier={getUpgradeTarget()}
          benefits={
            getUpgradeTarget() === 'starter'
              ? [
                  '50 transcripts per day',
                  '30-day transcript history',
                  'Full-text search',
                ]
              : [
                  'Unlimited transcripts',
                  'Unlimited history',
                  'API access',
                ]
          }
          ctaText={`Upgrade to ${getTierDisplayName(getUpgradeTarget())}`}
          redirectTo="/pricing"
        />
      )}
    </div>
  );
}
