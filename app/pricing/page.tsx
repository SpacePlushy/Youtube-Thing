'use client';

import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { Check, X, Play, ArrowLeft } from 'lucide-react';
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
  const { isSignedIn, user } = useUser();

  const currentTier = (user?.publicMetadata?.subscriptionTier as string) || 'free';

  const tiers: PricingTier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      priceAmount: 0,
      description: 'Get started with basic features',
      features: [
        { name: '5 transcripts per day', included: true },
        { name: 'No transcript history', included: false },
        { name: 'Community support', included: true },
        { name: 'Account required', included: true },
      ],
      cta: 'Start Free',
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$9',
      priceAmount: 9,
      description: 'Perfect for regular users',
      features: [
        { name: '50 transcripts per day', included: true },
        { name: '30-day transcript history', included: true },
        { name: 'Full-text search', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Export to TXT, PDF', included: true },
      ],
      cta: 'Upgrade to Starter',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      priceAmount: 29,
      description: 'For power users and professionals',
      features: [
        { name: 'Unlimited transcripts', included: true },
        { name: 'Unlimited history', included: true },
        { name: 'Collections & tags', included: true, badge: 'Soon' },
        { name: 'All export formats', included: true, badge: 'Soon' },
        { name: 'API access (10k/mo)', included: true, badge: 'Soon' },
        { name: 'Batch processing', included: true, badge: 'Soon' },
      ],
      cta: 'Upgrade to Pro',
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
        { name: 'Batch processing (50 videos)', included: true, badge: 'Soon' },
        { name: 'Team workspaces', included: true, badge: 'Soon' },
        { name: 'API access (100k/mo)', included: true, badge: 'Soon' },
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
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-semibold text-gray-900">Transcript</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </Link>
              <Link href="/" className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors">
                Extract
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to extractor
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl border ${
                tier.popular ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
              } p-6`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentTier(tier.id) && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
                    Current
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{tier.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  {tier.priceAmount > 0 && <span className="text-gray-500">/mo</span>}
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                      {feature.name}
                      {feature.badge && (
                        <span className="ml-1.5 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
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
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isCurrentTier(tier.id)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {isCurrentTier(tier.id) ? 'Current Plan' : tier.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Compare Plans</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-500">Feature</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Free</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Starter</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-900">Pro</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-6 text-gray-700">Daily Limit</td>
                  <td className="py-3 px-4 text-center text-gray-600">5</td>
                  <td className="py-3 px-4 text-center text-gray-600">50</td>
                  <td className="py-3 px-4 text-center text-gray-900 font-medium">Unlimited</td>
                  <td className="py-3 px-4 text-center text-gray-600">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-6 text-gray-700">History</td>
                  <td className="py-3 px-4 text-center text-gray-400">-</td>
                  <td className="py-3 px-4 text-center text-gray-600">30 days</td>
                  <td className="py-3 px-4 text-center text-gray-900 font-medium">Unlimited</td>
                  <td className="py-3 px-4 text-center text-gray-600">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-6 text-gray-700">Search</td>
                  <td className="py-3 px-4 text-center">
                    <X className="w-4 h-4 text-gray-300 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-3 px-6 text-gray-700">API Access</td>
                  <td className="py-3 px-4 text-center">
                    <X className="w-4 h-4 text-gray-300 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <X className="w-4 h-4 text-gray-300 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">10k/mo</td>
                  <td className="py-3 px-4 text-center text-gray-600">100k/mo</td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-gray-700">Support</td>
                  <td className="py-3 px-4 text-center text-gray-600">Community</td>
                  <td className="py-3 px-4 text-center text-gray-600">Email</td>
                  <td className="py-3 px-4 text-center text-gray-600">Priority</td>
                  <td className="py-3 px-4 text-center text-gray-600">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Contact section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 mb-4">
            Have questions? Need a custom plan?
          </p>
          <a
            href="mailto:sales@example.com"
            className="text-gray-900 font-medium hover:underline"
          >
            Contact us
          </a>
        </motion.div>
      </main>
    </div>
  );
}
