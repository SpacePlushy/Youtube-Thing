'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, Search } from 'lucide-react';
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

      // Refresh history after deletion
      fetchHistory();
    } catch (err) {
      console.error('Error deleting transcript:', err);
      alert('Failed to delete transcript. Please try again.');
    }
  };

  const handleCopy = async (transcript: TranscriptHistoryItem) => {
    try {
      // Fetch full transcript text
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
      // Fetch full transcript text
      const response = await fetch(`/api/transcript/history/${transcript.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript text');
      }

      const data = await response.json();

      if (format === 'txt') {
        // Download as TXT
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
        // PDF download not implemented yet
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

  // Free tier - no access
  if (hasAccess === false) {
    return (
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-2xl">
            <History className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Transcript History</h2>
            <p className="text-gray-400 text-sm">Save and access your past transcripts</p>
          </div>
        </div>

        <div className="text-center py-12">
          <History className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">Transcript History Unavailable</h3>
          <p className="text-gray-400 mb-8">Upgrade to Starter plan or higher to save your transcript history</p>

          <UpgradeCTA
            currentTier="free"
            targetTier="starter"
            benefits={[
              '50 transcripts per day',
              '30-day transcript history',
              'Full-text search',
              'Priority email support',
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
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (history && history.transcripts.length === 0) {
    return (
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-2xl">
            <History className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Transcript History</h2>
            <p className="text-gray-400 text-sm">Your saved transcripts</p>
          </div>
        </div>

        <div className="text-center py-12">
          <History className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">No Transcripts Yet</h3>
          <p className="text-gray-400 mb-6">Extract your first transcript to get started!</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
          >
            <Search className="w-5 h-5" />
            Extract Transcript
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-2xl">
            <History className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Transcript History</h2>
            <p className="text-gray-400 text-sm">
              {history?.pagination.total || 0} saved transcript{history?.pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Sort Button */}
        <button
          onClick={toggleSort}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
        >
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">
            {sortBy === 'created_at' ? 'Newest First' : 'Title A-Z'}
          </span>
        </button>
      </div>

      {/* Transcript List */}
      <div className="space-y-4 mb-6">
        <AnimatePresence mode="popLayout">
          {history?.transcripts.map((transcript, index) => (
            <motion.div
              key={transcript.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
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

      {/* Pagination */}
      {history && history.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Previous</span>
          </button>

          <span className="text-sm text-gray-400">
            Page {currentPage} of {history.pagination.totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(history.pagination.totalPages, prev + 1))}
            disabled={currentPage === history.pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-xl transition-colors"
          >
            <span className="text-sm">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
