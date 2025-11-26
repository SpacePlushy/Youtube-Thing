'use client';

import { motion } from 'framer-motion';
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { Check, X, Sparkles, Mail, ArrowRight, Youtube, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceAmount: number;
  description: string;
  features: { name: string; included: boolean; badge?: string }[];
  cta: string;
  popular?: boolean;
}

export default function PricingPage() {
  const { isSignedIn, isLoaded, user } = useUser();

  const currentTier = (user?.publicMetadata?.subscriptionTier as string) || 'free';

  const tiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      priceAmount: 0,
      description: 'Try out the transcript extractor',
      features: [
        { name: '5 transcripts per day', included: true },
        { name: 'No transcript history', included: false },
        { name: 'Community support', included: true },
        { name: 'Account required', included: true },
      ],
      cta: 'Get Started',
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$9',
      priceAmount: 9,
      description: 'For students and regular users',
      features: [
        { name: '50 transcripts per day', included: true },
        { name: '30-day transcript history', included: true },
        { name: 'Full-text search', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Export to TXT, PDF', included: true },
      ],
      cta: 'Upgrade',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      priceAmount: 29,
      description: 'For professionals and power users',
      features: [
        { name: 'Unlimited transcripts', included: true },
        { name: 'Unlimited history', included: true },
        { name: 'Collections & tags', included: true, badge: 'Soon' },
        { name: 'All export formats', included: true, badge: 'Soon' },
        { name: 'API access (10k/month)', included: true, badge: 'Soon' },
        { name: 'Batch processing', included: true, badge: 'Soon' },
      ],
      cta: 'Upgrade',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$99',
      priceAmount: 99,
      description: 'For teams and businesses',
      features: [
        { name: 'All Pro features', included: true },
        { name: 'Batch processing (50)', included: true, badge: 'Soon' },
        { name: 'Team workspaces', included: true, badge: 'Soon' },
        { name: 'API access (100k/month)', included: true, badge: 'Soon' },
        { name: 'SLA guarantee', included: true, badge: 'Soon' },
        { name: 'Dedicated support', included: true },
      ],
      cta: 'Contact Sales',
    },
  ];

  const handleCTA = (tierId: string) => {
    if (!isSignedIn) {
      window.location.href = '/sign-up';
      return;
    }

    if (tierId === 'free') {
      window.location.href = '/dashboard';
    } else if (tierId === 'enterprise') {
      window.location.href = 'mailto:sales@example.com?subject=Enterprise Plan Inquiry';
    } else {
      window.location.href = `/user-profile#billing`;
    }
  };

  const isCurrentTier = (tierId: string): boolean => {
    return tierId === currentTier;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-red-100 dark:bg-red-950 rounded-lg">
              <Youtube className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white hidden sm:inline">YouTube Transcript</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
            >
              Pricing
            </Link>

            {isLoaded && isSignedIn && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}

            {isLoaded && (
              isSignedIn ? (
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'w-8 h-8'
                    }
                  }}
                />
              ) : (
                <SignInButton mode="modal">
                  <button className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              )
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12 lg:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={`relative bg-white dark:bg-neutral-900 rounded-2xl border ${
                tier.popular
                  ? 'border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-100 dark:ring-indigo-900/50'
                  : 'border-gray-200 dark:border-neutral-800'
              } p-6`}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </div>
                </div>
              )}

              {/* Current plan badge */}
              {isCurrentTier(tier.id) && (
                <div className="absolute -top-3 right-4">
                  <div className="px-2.5 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    Current
                  </div>
                </div>
              )}

              {/* Tier content */}
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{tier.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-gray-900 dark:text-white">{tier.price}</span>
                  {tier.priceAmount > 0 && (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">/month</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                      {feature.name}
                      {feature.badge && (
                        <span className="ml-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                          {feature.badge}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleCTA(tier.id)}
                disabled={isCurrentTier(tier.id)}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isCurrentTier(tier.id)
                    ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {isCurrentTier(tier.id) ? 'Current Plan' : tier.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden mb-12"
        >
          <div className="px-6 py-5 border-b border-gray-100 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compare plans</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-neutral-800">
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-500 dark:text-gray-400">Feature</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Free</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Starter</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">Pro</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Daily Transcripts</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">5</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">50</td>
                  <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">Unlimited</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">History Retention</td>
                  <td className="py-3 px-4 text-center text-gray-400 dark:text-gray-500">None</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">30 days</td>
                  <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">Unlimited</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Search</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" /></td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">API Access</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">10k/mo</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">100k/mo</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Support</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Community</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Email</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Priority</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Help section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="text-center"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Need help choosing?</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Not sure which plan is right for you? We're here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard">
              <button className="btn-secondary flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a href="mailto:sales@example.com">
              <button className="btn-primary flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Sales
              </button>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
