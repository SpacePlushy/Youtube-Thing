'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function BillingManagementSection() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded]);

  const getTierDisplayName = (tier: string | undefined): string => {
    if (!tier) return 'Free';

    const tierNames: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
    };
    return tierNames[tier] || 'Free';
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create portal session');
        setPortalLoading(false);
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      setPortalLoading(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  if (loading || !isLoaded) {
    return (
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-vermillion-500" />
        </div>
      </div>
    );
  }

  const currentTier = user?.subscriptionTier || 'free';
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
      className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 flex items-center justify-center bg-vermillion-500/8 dark:bg-vermillion-500/10 rounded-xl">
          <CreditCard className="w-5 h-5 text-vermillion-500" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Billing</h2>
          <p className="text-sm font-body text-gray-500 dark:text-gray-500">Manage subscription</p>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-1">Current Plan</p>
            <span className="font-display text-lg font-semibold text-gray-900 dark:text-white">{tierName}</span>
          </div>

          {renewalDate && (
            <div className="text-right">
              <p className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-1">Next billing</p>
              <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">{renewalDate}</p>
            </div>
          )}
        </div>

        <p className="text-sm font-body text-gray-500 dark:text-gray-500">
          {currentTier === 'free'
            ? 'Upgrade to unlock more features and higher limits.'
            : `Your subscription renews on ${renewalDate}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentTier === 'free' ? (
          <>
            <button
              onClick={handleUpgrade}
              className="btn-primary flex items-center justify-center gap-2 text-sm font-body"
            >
              Upgrade Plan
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={handleManageBilling}
              className="btn-secondary flex items-center justify-center gap-2 text-sm font-body"
            >
              View Details
              <ExternalLink className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="btn-primary flex items-center justify-center gap-2 text-sm font-body disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Manage Subscription
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.04]">
        <div className="flex flex-wrap gap-4 text-sm font-body">
          <a href="/pricing" className="text-vermillion-500 hover:text-vermillion-600 dark:hover:text-vermillion-400 transition-colors">
            View Pricing
          </a>
          <a href="mailto:support@example.com" className="text-vermillion-500 hover:text-vermillion-600 dark:hover:text-vermillion-400 transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    </motion.div>
  );
}
