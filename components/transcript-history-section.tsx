'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { History, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, FileText } from 'lucide-react';
import { TranscriptCard } from './transcript-card';
import { UpgradeCTA } from './upgrade-cta';
import type { TranscriptHistoryResponse, TranscriptHistoryItem } from '@/lib/types';

export function TranscriptHistorySection() {
  const [history, setHistory] = useState<TranscriptHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'created_at' | 'video_title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [currentPage, sortBy, sortOrder]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        order: sortOrder,
      });

      const response = await fetch(`/api/transcript/history?${params}`);

      if (response.status === 403) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch transcript history');
      }

      setHasAccess(true);
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load transcript history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/transcript/history/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transcript');
      }

      fetchHistory();
    } catch (err) {
      console.error('Error deleting transcript:', err);
      alert('Failed to delete transcript. Please try again.');
    }
  };

  const handleCopy = async (transcript: TranscriptHistoryItem) => {
    try {
      const response = await fetch(`/api/transcript/history/${transcript.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript text');
      }

      const data = await response.json();
      await navigator.clipboard.writeText(data.transcriptText);
      alert('Transcript copied to clipboard!');
    } catch (err) {
      console.error('Error copying transcript:', err);
      alert('Failed to copy transcript. Please try again.');
    }
  };

  const handleDownload = async (transcript: TranscriptHistoryItem, format: 'txt' | 'pdf') => {
    try {
      const response = await fetch(`/api/transcript/history/${transcript.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript text');
      }

      const data = await response.json();

      if (format === 'txt') {
        const blob = new Blob([data.transcriptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${transcript.videoTitle.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('PDF export coming soon!');
      }
    } catch (err) {
      console.error('Error downloading transcript:', err);
      alert('Failed to download transcript. Please try again.');
    }
  };

  const toggleSort = () => {
    if (sortBy === 'created_at') {
      setSortBy('video_title');
      setSortOrder('asc');
    } else {
      setSortBy('created_at');
      setSortOrder('desc');
    }
  };

  if (hasAccess === false) {
    return (
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/[0.04] rounded-xl">
            <History className="w-5 h-5 text-gray-500 dark:text-gray-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Transcript History</h2>
            <p className="text-sm font-body text-gray-500 dark:text-gray-500">Save and access past transcripts</p>
          </div>
        </div>

        <div className="text-center py-10">
          <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-white/[0.04] rounded-2xl mx-auto mb-4">
            <History className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="font-display text-lg font-medium text-gray-900 dark:text-white mb-2">History Unavailable</h3>
          <p className="text-sm font-body text-gray-500 dark:text-gray-500 mb-6 max-w-sm mx-auto">
            Upgrade to save your transcript history and access past extractions
          </p>

          <UpgradeCTA
            currentTier="free"
            targetTier="starter"
            benefits={[
              '50 transcripts per day',
              '30-day transcript history',
              'Full-text search',
            ]}
            ctaText="Upgrade to Starter"
            redirectTo="/pricing"
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-vermillion-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6">
        <div className="text-center py-12">
          <p className="text-red-500 text-sm font-body mb-4">{error}</p>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 text-sm font-body font-medium text-vermillion-500 hover:bg-vermillion-500/5 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (history && history.transcripts.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/[0.04] rounded-xl">
            <History className="w-5 h-5 text-gray-500 dark:text-gray-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Transcript History</h2>
            <p className="text-sm font-body text-gray-500 dark:text-gray-500">Your saved transcripts</p>
          </div>
        </div>

        <div className="text-center py-10">
          <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-white/[0.04] rounded-2xl mx-auto mb-4">
            <FileText className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          </div>
          <h3 className="font-display text-lg font-medium text-gray-900 dark:text-white mb-2">No Transcripts Yet</h3>
          <p className="text-sm font-body text-gray-500 dark:text-gray-500 mb-6">Extract your first transcript to get started</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 btn-primary text-sm font-body"
          >
            Extract Transcript
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-vermillion-500/8 dark:bg-vermillion-500/10 rounded-xl">
            <History className="w-5 h-5 text-vermillion-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Transcript History</h2>
            <p className="text-sm font-body text-gray-500 dark:text-gray-500">
              {history?.pagination.total || 0} transcript{history?.pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <button
          onClick={toggleSort}
          className="flex items-center gap-2 px-3 py-2 text-sm font-mono text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortBy === 'created_at' ? 'Newest' : 'A–Z'}
        </button>
      </div>

      <div className="space-y-2 mb-6">
        <AnimatePresence mode="popLayout">
          {history?.transcripts.map((transcript, index) => (
            <motion.div
              key={transcript.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
            >
              <TranscriptCard
                transcript={transcript}
                onCopy={() => handleCopy(transcript)}
                onDownload={(format) => handleDownload(transcript, format)}
                onDelete={() => handleDelete(transcript.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {history && history.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/[0.04]">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm font-body text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-sm font-mono text-gray-400 dark:text-gray-600">
            {currentPage} / {history.pagination.totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(history.pagination.totalPages, prev + 1))}
            disabled={currentPage === history.pagination.totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm font-body text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
