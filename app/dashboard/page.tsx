'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { UsageStatsCard } from '@/components/usage-stats-card';
import { TranscriptHistorySection } from '@/components/transcript-history-section';
import { BillingManagementSection } from '@/components/billing-management-section';
import { Loader2, Play, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

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
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/" className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors">
                Extract
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to extractor
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-gray-500">
            Manage your transcripts and subscription
          </p>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="space-y-6">
          {/* Usage Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <UsageStatsCard />
          </motion.div>

          {/* Transcript History Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <TranscriptHistorySection />
          </motion.div>

          {/* Billing Management Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <BillingManagementSection />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
