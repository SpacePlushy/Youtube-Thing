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

  useEffect(() => { fetchUsageStats(); }, []);

  const fetchUsageStats = async () => {
    try {
      setLoading(true); setError(null);
      const response = await fetch('/api/user/usage');
      if (!response.ok) throw new Error('Failed to fetch usage stats');
      const data = await response.json();
      setUsageStats(data);
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('Failed to load usage statistics');
    } finally { setLoading(false); }
  };

  const calculatePercentage = (): number => {
    if (!usageStats || usageStats.dailyLimit === Infinity) return 0;
    return Math.min((usageStats.currentUsage / usageStats.dailyLimit) * 100, 100);
  };

  const getTimeUntilReset = (): string => {
    if (!usageStats?.resetTime) return 'Unknown';
    const diff = new Date(usageStats.resetTime).getTime() - Date.now();
    if (diff < 0) return 'Soon';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getTierDisplayName = (tier: string): string => ({ free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }[tier] || 'Unknown');
  const shouldShowUpgrade = () => usageStats && (usageStats.tier === 'free' || usageStats.tier === 'starter');
  const getUpgradeTarget = (): 'starter' | 'pro' => usageStats?.tier === 'free' ? 'starter' : 'pro';

  if (loading) return <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6"><div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-vermillion-500" /></div></div>;
  if (error) return <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6"><div className="text-center py-8"><p className="text-red-500 text-sm font-body mb-4">{error}</p><button onClick={fetchUsageStats} className="px-4 py-2 text-sm font-body font-medium text-vermillion-500 hover:bg-vermillion-500/5 rounded-lg transition-colors">Retry</button></div></div>;
  if (!usageStats) return null;

  const percentage = calculatePercentage();
  const isUnlimited = usageStats.dailyLimit === Infinity;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-vermillion-500/8 dark:bg-vermillion-500/10 rounded-xl">
            <BarChart3 className="w-5 h-5 text-vermillion-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Usage</h2>
            <p className="text-sm font-body text-gray-500 dark:text-gray-500">Daily transcript limit</p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-gray-100 dark:bg-white/[0.04] text-xs font-mono font-medium text-gray-500 dark:text-gray-400 rounded-full uppercase tracking-wider">
          {getTierDisplayName(usageStats.tier)}
        </div>
      </div>

      <div className="mb-6">
        {isUnlimited ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/30 rounded-2xl mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1">Unlimited</p>
            <p className="text-sm font-body text-gray-500 dark:text-gray-500">No daily limits on your plan</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <span className="font-display text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{usageStats.currentUsage}</span>
                <span className="font-mono text-gray-400 dark:text-gray-600 text-lg ml-1">/ {usageStats.dailyLimit}</span>
              </div>
              <span className="text-sm font-mono text-gray-400 dark:text-gray-600">{Math.round(percentage)}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-white/[0.04] rounded-full h-1.5 overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-1.5 rounded-full ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-vermillion-500'}`}
              />
            </div>
            <p className="text-sm font-body text-gray-500 dark:text-gray-500">
              {usageStats.dailyLimit - usageStats.currentUsage > 0 ? `${usageStats.dailyLimit - usageStats.currentUsage} remaining` : 'Daily limit reached'}
            </p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] rounded-xl mb-6">
        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-600" />
        <span className="text-sm font-body text-gray-500 dark:text-gray-400">Resets in <span className="font-mono font-medium text-gray-900 dark:text-white">{getTimeUntilReset()}</span></span>
      </div>

      {shouldShowUpgrade() && (
        <UpgradeCTA
          currentTier={usageStats.tier as 'free' | 'starter'}
          targetTier={getUpgradeTarget()}
          benefits={getUpgradeTarget() === 'starter' ? ['50 transcripts per day', '30-day transcript history', 'Full-text search'] : ['Unlimited transcripts', 'Unlimited history', 'API access']}
          ctaText={`Upgrade to ${getTierDisplayName(getUpgradeTarget())}`}
          redirectTo="/pricing"
        />
      )}
    </motion.div>
  );
}
