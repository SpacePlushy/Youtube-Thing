'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { UsageStatsCard } from '@/components/usage-stats-card';
import { TranscriptHistorySection } from '@/components/transcript-history-section';
import { BillingManagementSection } from '@/components/billing-management-section';
import { Loader2 } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-teal-900/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400 text-transparent bg-clip-text mb-2">
            Welcome back, {user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-400 text-lg">
            Manage your transcripts and subscription
          </p>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="space-y-6">
          {/* Usage Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <UsageStatsCard />
          </motion.div>

          {/* Transcript History Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <TranscriptHistorySection />
          </motion.div>

          {/* Billing Management Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <BillingManagementSection />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
