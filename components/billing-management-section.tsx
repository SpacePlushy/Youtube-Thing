'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export function BillingManagementSection() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded]);

  const getTierDisplayName = (tier: string | undefined): string => {
    if (!tier) return 'Free';

    const tierNames: Record<string, string> = {
      free: 'Free',
      starter: 'Starter',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return tierNames[tier] || 'Unknown';
  };

  const handleManageBilling = () => {
    window.location.href = '/user-profile#billing';
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  if (loading || !isLoaded) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    );
  }

  const currentTier = (user?.publicMetadata?.subscriptionTier as string) || 'free';
  const tierName = getTierDisplayName(currentTier);

  const getRenewalDate = (): string | null => {
    if (currentTier === 'free') return null;

    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renewalDate = getRenewalDate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 flex items-center justify-center bg-indigo-100 dark:bg-indigo-950 rounded-xl">
          <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage subscription</p>
        </div>
      </div>

      {/* Current Plan Display */}
      <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Plan</p>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{tierName}</span>
          </div>

          {renewalDate && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next billing</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{renewalDate}</p>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {currentTier === 'free'
            ? 'Upgrade to unlock more features and higher limits.'
            : `Your subscription renews on ${renewalDate}.`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentTier === 'free' ? (
          <>
            <button
              onClick={handleUpgrade}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Upgrade Plan
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={handleManageBilling}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              View Details
              <ExternalLink className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleManageBilling}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Manage Subscription
              <ExternalLink className="w-4 h-4" />
            </button>

            {currentTier !== 'enterprise' && (
              <button
                onClick={handleUpgrade}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                Upgrade Plan
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Help links */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-neutral-800">
        <div className="flex flex-wrap gap-4 text-sm">
          <a href="/pricing" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            View Pricing
          </a>
          <a href="mailto:support@example.com" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    </motion.div>
  );
}
