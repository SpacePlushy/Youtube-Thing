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

  const getTierColor = (tier: string | undefined): string => {
    if (!tier) return 'from-gray-400 to-gray-600';

    const tierColors: Record<string, string> = {
      free: 'from-gray-400 to-gray-600',
      starter: 'from-blue-400 to-blue-600',
      pro: 'from-purple-400 to-purple-600',
      enterprise: 'from-yellow-400 to-yellow-600',
    };
    return tierColors[tier] || 'from-gray-400 to-gray-600';
  };

  const handleManageBilling = () => {
    // Redirect to Clerk's billing portal
    // In production, this would use Clerk's redirect helper or billing portal URL
    window.location.href = '/user-profile#billing';
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  if (loading || !isLoaded) {
    return (
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  const currentTier = (user?.publicMetadata?.subscriptionTier as string) || 'free';
  const tierName = getTierDisplayName(currentTier);
  const tierColor = getTierColor(currentTier);

  // Mock renewal date (in production, this would come from Clerk subscription metadata)
  const getRenewalDate = (): string | null => {
    if (currentTier === 'free') return null;

    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const renewalDate = getRenewalDate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-500/20 rounded-2xl">
          <CreditCard className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Billing Management</h2>
          <p className="text-gray-400 text-sm">Manage your subscription and billing</p>
        </div>
      </div>

      {/* Current Plan Display */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Current Plan</p>
            <div
              className={`inline-flex px-4 py-2 rounded-full bg-gradient-to-r ${tierColor} text-white font-semibold text-lg shadow-lg`}
            >
              {tierName}
            </div>
          </div>

          {renewalDate && (
            <div className="text-right">
              <p className="text-sm text-gray-400 mb-1">Next Billing Date</p>
              <p className="text-white font-semibold">{renewalDate}</p>
            </div>
          )}
        </div>

        {currentTier === 'free' && (
          <p className="text-sm text-gray-400">
            You're currently on the Free plan. Upgrade to unlock more features and increase your daily transcript limits.
          </p>
        )}

        {currentTier !== 'free' && (
          <p className="text-sm text-gray-400">
            Your subscription will automatically renew on {renewalDate}. You can cancel or change your plan anytime.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {currentTier === 'free' ? (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpgrade}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Upgrade Plan
              <ExternalLink className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleManageBilling}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold rounded-xl transition-all"
            >
              View Details
              <ExternalLink className="w-4 h-4" />
            </motion.button>
          </>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleManageBilling}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Manage Subscription
              <ExternalLink className="w-4 h-4" />
            </motion.button>

            {currentTier !== 'enterprise' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpgrade}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold rounded-xl transition-all"
              >
                Upgrade Plan
                <ExternalLink className="w-4 h-4" />
              </motion.button>
            )}
          </>
        )}
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <p className="text-sm text-gray-400 mb-3">
          <strong className="text-white">Need help?</strong> Contact support for billing questions or to discuss
          Enterprise plans.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href="/pricing" className="text-purple-400 hover:text-purple-300 transition-colors">
            View Pricing
          </a>
          <span className="text-gray-600">•</span>
          <a href="mailto:support@example.com" className="text-purple-400 hover:text-purple-300 transition-colors">
            Contact Support
          </a>
          <span className="text-gray-600">•</span>
          <a href="/terms" className="text-purple-400 hover:text-purple-300 transition-colors">
            Terms of Service
          </a>
        </div>
      </div>
    </motion.div>
  );
}
