'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface UpgradeCTAProps {
  currentTier: 'free' | 'starter';
  targetTier: 'starter' | 'pro';
  benefits: string[];
  ctaText: string;
  redirectTo: string;
}

export function UpgradeCTA({ currentTier, targetTier, benefits, ctaText, redirectTo }: UpgradeCTAProps) {
  const getTierColor = (tier: string): string => {
    const tierColors: Record<string, string> = {
      starter: 'from-blue-500 to-blue-600',
      pro: 'from-purple-500 to-blue-500',
    };
    return tierColors[tier] || 'from-purple-500 to-blue-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-6 p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl"
    >
      <h3 className="text-xl font-bold text-white mb-3">
        Unlock More with {targetTier === 'starter' ? 'Starter' : 'Pro'}
      </h3>

      <ul className="space-y-2 mb-6">
        {benefits.map((benefit, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-start gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-300 text-sm">{benefit}</span>
          </motion.li>
        ))}
      </ul>

      <Link href={redirectTo}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r ${getTierColor(
            targetTier
          )} text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all`}
        >
          {ctaText}
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </Link>

      {currentTier === 'free' && (
        <p className="text-center text-gray-400 text-xs mt-3">
          Start with a 7-day free trial. Cancel anytime.
        </p>
      )}
    </motion.div>
  );
}
