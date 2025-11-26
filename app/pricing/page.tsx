'use client';

import { motion } from 'framer-motion';
import { useUser, SignInButton, UserButton, PricingTable } from '@clerk/nextjs';
import { Check, X, Mail, ArrowRight, Youtube, LayoutDashboard, Info } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const { isSignedIn, isLoaded } = useUser();

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

        {/* Clerk PricingTable - This displays plans configured in Clerk Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-16"
        >
          <div className="max-w-4xl mx-auto">
            {/* PricingTable will show plans from Clerk Dashboard, or fallback content if none configured */}
            <PricingTable />

            {/* Info notice about Clerk Billing */}
            <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Secure payments powered by Stripe</p>
                <p className="text-blue-600 dark:text-blue-400">
                  Your payment information is securely processed. You can manage your subscription anytime from your dashboard.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

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
            Not sure which plan is right for you? We&apos;re here to help.
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
