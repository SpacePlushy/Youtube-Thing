'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { UsageStatsCard } from '@/components/usage-stats-card';
import { TranscriptHistorySection } from '@/components/transcript-history-section';
import { BillingManagementSection } from '@/components/billing-management-section';
import { Loader2, Youtube, LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

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
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8'
                }
              }}
            />
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-1">
            Welcome back, {user?.firstName || 'there'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your transcripts and subscription
          </p>
        </motion.div>

        {/* Dashboard sections */}
        <div className="space-y-6">
          {/* Usage Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <UsageStatsCard />
          </motion.div>

          {/* Transcript History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <TranscriptHistorySection />
          </motion.div>

          {/* Billing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <BillingManagementSection />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
