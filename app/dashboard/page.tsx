'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { UsageStatsCard } from '@/components/usage-stats-card';
import { TranscriptHistorySection } from '@/components/transcript-history-section';
import { BillingManagementSection } from '@/components/billing-management-section';
import { UserMenu } from '@/components/user-menu';
import { Loader2, Play, LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoaded = status !== 'loading';
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (isLoaded) setLoading(false); }, [isLoaded]);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[#f8f6f3] dark:bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-vermillion-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f3] dark:bg-[#050505]">
      {/* Navigation */}
      <nav className="border-b border-gray-200/60 dark:border-white/[0.06] bg-[#f8f6f3]/80 dark:bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center bg-vermillion-500 rounded-lg">
              <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
            </div>
            <span className="font-display font-semibold text-gray-900 dark:text-white hidden sm:inline tracking-tight">Transcript</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link href="/pricing" className="px-3 py-1.5 text-sm font-body text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
              Pricing
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-body font-medium text-vermillion-500">
              <LayoutDashboard className="w-3.5 h-3.5" /><span className="hidden sm:inline">Dashboard</span>
            </Link>
            <UserMenu />
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="font-body text-gray-500 dark:text-gray-500">Manage your transcripts and subscription</p>
        </motion.div>

        {/* Dashboard sections */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <UsageStatsCard />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <TranscriptHistorySection />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <BillingManagementSection />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
