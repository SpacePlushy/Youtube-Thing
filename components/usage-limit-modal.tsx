'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Clock, TrendingUp, Check } from 'lucide-react';
import Link from 'next/link';

interface UsageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsage: number;
  dailyLimit: number;
  resetTime: string;
  tier: string;
}

export function UsageLimitModal({
  isOpen,
  onClose,
  currentUsage,
  dailyLimit,
  resetTime,
  tier,
}: UsageLimitModalProps) {
  const getTimeUntilReset = (): string => {
    const resetDate = new Date(resetTime);
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

  const getUpgradeRecommendation = () => {
    if (tier === 'free') {
      return {
        targetTier: 'Starter',
        benefits: ['50 transcripts per day', '30-day history', 'Full-text search'],
        price: '$9/mo',
      };
    }
    return {
      targetTier: 'Pro',
      benefits: ['Unlimited transcripts', 'Unlimited history', 'API access'],
      price: '$29/mo',
    };
  };

  const recommendation = getUpgradeRecommendation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative max-w-md w-full bg-white rounded-2xl p-6 shadow-xl"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Daily Limit Reached</h2>

              {/* Description */}
              <p className="text-gray-500 text-center text-sm mb-6">
                You have used all {dailyLimit} transcripts on your {tier} plan today.
              </p>

              {/* Usage Info */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">Usage</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {currentUsage}/{dailyLimit}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-3">
                  <div className="w-full h-1.5 rounded-full bg-red-500" />
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Resets in <span className="font-medium text-gray-700">{getTimeUntilReset()}</span>
                  </span>
                </div>
              </div>

              {/* Upgrade Recommendation */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Upgrade to {recommendation.targetTier}</h3>
                  <span className="ml-auto text-sm font-medium text-gray-500">{recommendation.price}</span>
                </div>

                <ul className="space-y-1.5">
                  {recommendation.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Link href="/pricing" className="w-full">
                  <button className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors">
                    View Pricing
                  </button>
                </Link>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
