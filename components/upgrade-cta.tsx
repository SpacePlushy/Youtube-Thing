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

export function UpgradeCTA({ targetTier, benefits, ctaText, redirectTo }: UpgradeCTAProps) {
  return (
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Upgrade to {targetTier === 'starter' ? 'Starter' : 'Pro'}
      </h3>

      <ul className="space-y-2 mb-4">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-600">{benefit}</span>
          </li>
        ))}
      </ul>

      <Link href={redirectTo}>
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors">
          {ctaText}
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>
    </div>
  );
}
