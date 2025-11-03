'use client';

import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { CheckCircle2, X, Sparkles, Users, Zap, Mail } from 'lucide-react';
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
  color: string;
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
      description: 'Perfect for trying out the transcript extractor',
      features: [
        { name: '5 transcripts per day', included: true },
        { name: 'No transcript history', included: false },
        { name: 'Community support', included: true },
        { name: 'Account required', included: true },
      ],
      cta: 'Start Free',
      color: 'from-gray-400 to-gray-600',
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '$9',
      priceAmount: 9,
      description: 'Perfect for students and regular users',
      features: [
        { name: '50 transcripts per day', included: true },
        { name: '30-day transcript history', included: true },
        { name: 'Full-text search', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Export to TXT, PDF', included: true },
      ],
      cta: 'Upgrade to Starter',
      color: 'from-blue-400 to-blue-600',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      priceAmount: 29,
      description: 'Perfect for professionals and power users',
      features: [
        { name: 'Unlimited transcripts', included: true },
        { name: 'Unlimited transcript history', included: true },
        { name: 'Collections & tags', included: true, badge: 'Coming Soon' },
        { name: 'Export to all formats', included: true, badge: 'Coming Soon' },
        { name: 'API access (10k/month)', included: true, badge: 'Coming Soon' },
        { name: 'Batch processing (10 videos)', included: true, badge: 'Coming Soon' },
        { name: 'Priority processing', included: true, badge: 'Coming Soon' },
      ],
      cta: 'Upgrade to Pro',
      popular: true,
      color: 'from-purple-400 to-purple-600',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$99',
      priceAmount: 99,
      description: 'Perfect for teams and businesses',
      features: [
        { name: 'All Pro features', included: true },
        { name: 'Batch processing (50 videos)', included: true, badge: 'Coming Soon' },
        { name: 'Team workspaces (10 users)', included: true, badge: 'Coming Soon' },
        { name: 'API access (100k/month)', included: true, badge: 'Coming Soon' },
        { name: 'Dedicated resources', included: true, badge: 'Coming Soon' },
        { name: 'SLA guarantee', included: true, badge: 'Coming Soon' },
        { name: 'Dedicated account manager', included: true },
      ],
      cta: 'Contact Sales',
      color: 'from-yellow-400 to-yellow-600',
    },
  ];

  const handleCTA = (tierId: string) => {
    if (!isSignedIn) {
      window.location.href = '/sign-up';
      return;
    }

    if (tierId === 'free') {
      // Already on free tier, redirect to dashboard
      window.location.href = '/dashboard';
    } else if (tierId === 'enterprise') {
      // Contact sales
      window.location.href = 'mailto:sales@example.com?subject=Enterprise Plan Inquiry';
    } else {
      // Redirect to Clerk checkout/upgrade flow
      // In production, this would use Clerk's checkout API
      window.location.href = `/user-profile#billing`;
    }
  };

  const isCurrentTier = (tierId: string): boolean => {
    return tierId === currentTier;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400 text-transparent bg-clip-text mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Perfect for students, professionals, and teams
          </p>
        </motion.div>

        {/* Pricing Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative backdrop-blur-2xl bg-white/10 border ${
                tier.popular ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' : 'border-white/20'
              } rounded-3xl p-6 sm:p-8 ${tier.popular ? 'lg:scale-105' : ''}`}
            >
              {/* Most Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm rounded-full shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentTier(tier.id) && (
                <div className="absolute -top-3 right-4">
                  <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-xs rounded-full">
                    Current Plan
                  </div>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6">
                <div className={`inline-flex px-4 py-2 rounded-full bg-gradient-to-r ${tier.color} text-white font-semibold text-sm mb-4`}>
                  {tier.name}
                </div>
                <p className="text-gray-400 text-sm mb-4">{tier.description}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-bold text-white">{tier.price}</span>
                  {tier.priceAmount > 0 && <span className="text-gray-400 text-xl">/month</span>}
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    {feature.included ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-gray-300' : 'text-gray-600'}`}>
                      {feature.name}
                      {feature.badge && (
                        <span className="ml-2 text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                          {feature.badge}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: isCurrentTier(tier.id) ? 1 : 1.02 }}
                whileTap={{ scale: isCurrentTier(tier.id) ? 1 : 0.98 }}
                onClick={() => handleCTA(tier.id)}
                disabled={isCurrentTier(tier.id)}
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  isCurrentTier(tier.id)
                    ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
                    : tier.popular
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg hover:shadow-xl'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                {isCurrentTier(tier.id) ? 'Current Plan' : tier.cta}
              </motion.button>

              {tier.id === 'starter' && !isSignedIn && (
                <p className="text-center text-gray-400 text-xs mt-3">Start with a 7-day free trial</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Compare All Features</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4 text-gray-400 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-semibold">Starter</th>
                  <th className="text-center py-4 px-4 text-purple-400 font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 text-gray-400 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 text-gray-300">Daily Transcript Limit</td>
                  <td className="py-3 px-4 text-center text-gray-300">5</td>
                  <td className="py-3 px-4 text-center text-gray-300">50</td>
                  <td className="py-3 px-4 text-center text-purple-300">Unlimited</td>
                  <td className="py-3 px-4 text-center text-gray-300">Unlimited</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 text-gray-300">History Retention</td>
                  <td className="py-3 px-4 text-center text-gray-300">None</td>
                  <td className="py-3 px-4 text-center text-gray-300">30 days</td>
                  <td className="py-3 px-4 text-center text-purple-300">Unlimited</td>
                  <td className="py-3 px-4 text-center text-gray-300">Unlimited</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 text-gray-300">Search</td>
                  <td className="py-3 px-4 text-center">
                    <X className="w-5 h-5 text-gray-600 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 text-gray-300">API Access</td>
                  <td className="py-3 px-4 text-center">
                    <X className="w-5 h-5 text-gray-600 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <X className="w-5 h-5 text-gray-600 mx-auto" />
                  </td>
                  <td className="py-3 px-4 text-center text-gray-300">10k/month</td>
                  <td className="py-3 px-4 text-center text-gray-300">100k/month</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-3 px-4 text-gray-300">Support</td>
                  <td className="py-3 px-4 text-center text-gray-300">Community</td>
                  <td className="py-3 px-4 text-center text-gray-300">Priority Email</td>
                  <td className="py-3 px-4 text-center text-gray-300">Priority</td>
                  <td className="py-3 px-4 text-center text-gray-300">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQs or Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Need Help Choosing?</h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Not sure which plan is right for you? Contact our sales team for personalized recommendations.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-all"
              >
                <Zap className="w-5 h-5" />
                View Dashboard
              </motion.button>
            </Link>
            <a href="mailto:sales@example.com">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Mail className="w-5 h-5" />
                Contact Sales
              </motion.button>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
