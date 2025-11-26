'use client';

import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface UpgradeCTAProps {
  currentTier: 'free' | 'starter';
  targetTier: 'starter' | 'pro';
  benefits: string[];
  ctaText: string;
  redirectTo: string;
}

export function UpgradeCTA({ currentTier, targetTier, benefits, ctaText, redirectTo }: UpgradeCTAProps) {
  return (
    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Upgrade to {targetTier === 'starter' ? 'Starter' : 'Pro'}
      </h3>

      <ul className="space-y-2 mb-4">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600 dark:text-gray-300 text-sm">{benefit}</span>
          </li>
        ))}
      </ul>

      <Link href={redirectTo}>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors">
          {ctaText}
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>

      {currentTier === 'free' && (
        <p className="text-center text-gray-500 dark:text-gray-400 text-xs mt-3">
          7-day free trial. Cancel anytime.
        </p>
      )}
    </div>
  );
}
