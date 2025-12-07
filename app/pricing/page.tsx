'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Check, X, Mail, ArrowRight, Youtube, LayoutDashboard, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { SignInModal } from '@/components/sign-in-modal';
import { UserMenu } from '@/components/user-menu';

export default function PricingPage() {
  const { data: session, status } = useSession();
  const isSignedIn = !!session?.user;
  const isLoaded = status !== 'loading';
  const [showSignIn, setShowSignIn] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      setShowSignIn(true);
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session');
        setCheckoutLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setCheckoutLoading(false);
    }
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
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowSignIn(true)}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors"
                >
                  Sign In
                </button>
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
            Choose the plan that fits your needs. Cancel anytime.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16"
        >
          {/* Free Plan */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Perfect for getting started</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">5 transcripts per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Copy & download transcripts</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">All supported languages</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                <X className="w-5 h-5 flex-shrink-0" />
                <span>Transcript history</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                <X className="w-5 h-5 flex-shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>

            {isSignedIn ? (
              session?.user?.subscriptionTier === 'free' ? (
                <div className="w-full py-3 text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 rounded-lg font-medium">
                  Current Plan
                </div>
              ) : (
                <div className="w-full py-3 text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 rounded-lg font-medium">
                  Included
                </div>
              )
            ) : (
              <button
                onClick={() => setShowSignIn(true)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Pro Plan */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$10</span>
                <span className="text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">For power users</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Unlimited transcripts</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Copy & download transcripts</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">All supported languages</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Unlimited transcript history</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Priority support</span>
              </li>
            </ul>

            {isSignedIn && session?.user?.subscriptionTier === 'pro' ? (
              <div className="w-full py-3 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-lg font-medium">
                Current Plan
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Upgrade to Pro
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
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
                  <th className="text-center py-3 px-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Daily Transcripts</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">5</td>
                  <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Transcript History</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center text-indigo-600 dark:text-indigo-400 font-medium">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Languages Supported</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">12+</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">12+</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-neutral-800/50">
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Copy & Download</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-6 text-gray-700 dark:text-gray-300">Support</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Community</td>
                  <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-400">Priority Email</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Help section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Need help choosing?</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Not sure which plan is right for you? We&apos;re here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard">
              <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a href="mailto:support@youtubething.com">
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Contact Support
              </button>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
      />
    </div>
  );
}
