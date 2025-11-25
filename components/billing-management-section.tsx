'use client';

import { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

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
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renewalDate = getRenewalDate();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
          <p className="text-sm text-gray-500">Manage your subscription</p>
        </div>
      </div>

      {/* Current Plan Display */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Current plan</p>
            <span className="text-lg font-semibold text-gray-900">{tierName}</span>
          </div>

          {renewalDate && (
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Renews</p>
              <p className="text-sm font-medium text-gray-900">{renewalDate}</p>
            </div>
          )}
        </div>

        {currentTier === 'free' && (
          <p className="text-sm text-gray-500 mt-3">
            Upgrade for more transcripts and features
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {currentTier === 'free' ? (
          <>
            <button
              onClick={handleUpgrade}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Upgrade Plan
            </button>
            <button
              onClick={handleManageBilling}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Account Settings
              <ExternalLink className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleManageBilling}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Manage Subscription
              <ExternalLink className="w-4 h-4" />
            </button>
            {currentTier !== 'enterprise' && (
              <button
                onClick={handleUpgrade}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Change Plan
              </button>
            )}
          </>
        )}
      </div>

      {/* Help */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:support@example.com" className="text-gray-900 hover:underline">
            Contact support
          </a>
          {' '}or{' '}
          <Link href="/pricing" className="text-gray-900 hover:underline">
            view pricing
          </Link>
        </p>
      </div>
    </div>
  );
}
