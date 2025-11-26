'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Clock, TrendingUp } from 'lucide-react';
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
      return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const getUpgradeRecommendation = () => {
    if (tier === 'free') {
      return {
        targetTier: 'Starter',
        benefits: ['50 transcripts per day (10x increase)', '30-day transcript history', 'Full-text search'],
        price: '$9/month',
      };
    }
    return {
      targetTier: 'Pro',
      benefits: ['Unlimited transcripts per day', 'Unlimited transcript history', 'Advanced features'],
      price: '$29/month',
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative max-w-lg w-full backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-white text-center mb-3">Daily Limit Reached</h2>

              {/* Usage Info */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Usage Today</span>
                  <span className="text-xl font-bold text-white">
                    {currentUsage}/{dailyLimit}
                  </span>
                </div>

                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-4">
                  <div className="w-full h-2 rounded-full bg-gradient-to-r from-red-400 to-red-600" />
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>
                    Your limit resets in <span className="font-semibold text-white">{getTimeUntilReset()}</span>
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-center mb-6">
                You&apos;ve used all {dailyLimit} transcripts available on your {tier} plan today. Upgrade to get more
                transcripts and unlock additional features.
              </p>

              {/* Upgrade Recommendation */}
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Upgrade to {recommendation.targetTier}</h3>
                  <span className="ml-auto text-sm font-semibold text-purple-400">{recommendation.price}</span>
                </div>

                <ul className="space-y-2 mb-4">
                  {recommendation.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/pricing" className="flex-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    View Pricing Plans
                  </motion.button>
                </Link>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold rounded-xl transition-all"
                >
                  Maybe Later
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
