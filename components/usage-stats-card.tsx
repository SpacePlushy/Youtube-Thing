'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Loader2, TrendingUp } from 'lucide-react';
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

  const getTierColor = (tier: string): string => {
    const tierColors: Record<string, string> = {
      free: 'from-gray-400 to-gray-600',
      starter: 'from-blue-400 to-blue-600',
      pro: 'from-purple-400 to-purple-600',
      enterprise: 'from-yellow-400 to-yellow-600',
    };
    return tierColors[tier] || 'from-gray-400 to-gray-600';
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
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchUsageStats}
            className="mt-4 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-colors"
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-2xl">
            <BarChart3 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Usage Stats</h2>
            <p className="text-gray-400 text-sm">Daily transcript limit</p>
          </div>
        </div>

        {/* Tier Badge */}
        <div
          className={`px-4 py-2 rounded-full bg-gradient-to-r ${getTierColor(
            usageStats.tier
          )} text-white font-semibold text-sm shadow-lg`}
        >
          {getTierDisplayName(usageStats.tier)} Plan
        </div>
      </div>

      {/* Usage Display */}
      <div className="mb-6">
        {isUnlimited ? (
          <div className="text-center py-8">
            <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-3xl font-bold text-white mb-2">Unlimited Transcripts</p>
            <p className="text-gray-400">No daily limits on your {getTierDisplayName(usageStats.tier)} plan</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-4xl font-bold text-white">{usageStats.currentUsage}</span>
                <span className="text-gray-400 text-2xl"> / {usageStats.dailyLimit}</span>
              </div>
              <span className="text-gray-400 text-lg">{Math.round(percentage)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-3 rounded-full bg-gradient-to-r ${
                  percentage >= 90
                    ? 'from-red-400 to-red-600'
                    : percentage >= 70
                    ? 'from-yellow-400 to-yellow-600'
                    : 'from-purple-400 to-blue-400'
                }`}
              />
            </div>

            <p className="text-gray-400 text-sm">
              {usageStats.dailyLimit - usageStats.currentUsage > 0
                ? `${usageStats.dailyLimit - usageStats.currentUsage} transcripts remaining today`
                : 'Daily limit reached'}
            </p>
          </>
        )}
      </div>

      {/* Reset Time */}
      <div className="flex items-center gap-2 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <Clock className="w-5 h-5 text-blue-400" />
        <span className="text-gray-300 text-sm">
          Resets in <span className="font-semibold text-white">{getTimeUntilReset()}</span>
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
                  '50 transcripts per day (10x increase)',
                  '30-day transcript history',
                  'Full-text search',
                  'Priority email support',
                ]
              : [
                  'Unlimited transcripts per day',
                  'Unlimited transcript history',
                  'Collections and tags (coming soon)',
                  'Export to multiple formats (coming soon)',
                  'API access (coming soon)',
                ]
          }
          ctaText={`Upgrade to ${getTierDisplayName(getUpgradeTarget())}`}
          redirectTo="/pricing"
        />
      )}
    </motion.div>
  );
}
