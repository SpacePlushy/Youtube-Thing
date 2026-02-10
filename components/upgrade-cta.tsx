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
    <div className="p-4 bg-vermillion-500/5 dark:bg-vermillion-500/[0.06] border border-vermillion-500/10 dark:border-vermillion-500/10 rounded-xl">
      <h3 className="text-sm font-display font-semibold text-gray-900 dark:text-white mb-3">
        Upgrade to {targetTier === 'starter' ? 'Starter' : 'Pro'}
      </h3>
      <ul className="space-y-2 mb-4">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-vermillion-500 flex-shrink-0 mt-0.5" />
            <span className="font-body text-gray-600 dark:text-gray-400 text-sm">{benefit}</span>
          </li>
        ))}
      </ul>
      <Link href={redirectTo}>
        <button className="w-full btn-primary flex items-center justify-center gap-2 text-sm font-body">
          {ctaText}<ArrowRight className="w-4 h-4" />
        </button>
      </Link>
      {currentTier === 'free' && (
        <p className="text-center font-body text-gray-400 dark:text-gray-600 text-xs mt-3">7-day free trial. Cancel anytime.</p>
      )}
    </div>
  );
}
