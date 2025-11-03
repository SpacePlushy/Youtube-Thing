'use client';

import { motion } from 'framer-motion';
import { Copy, Download, Trash2, FileText } from 'lucide-react';
import type { TranscriptHistoryItem } from '@/lib/types';

interface TranscriptCardProps {
  transcript: TranscriptHistoryItem;
  onCopy: () => void;
  onDownload: (format: 'txt' | 'pdf') => void;
  onDelete: () => void;
}

export function TranscriptCard({ transcript, onCopy, onDownload, onDelete }: TranscriptCardProps) {
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  const getThumbnailUrl = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'Unknown';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteClick = () => {
    if (confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
      onDelete();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <div className="relative w-full sm:w-40 h-24 rounded-xl overflow-hidden bg-gray-800">
            <img
              src={getThumbnailUrl(transcript.videoId)}
              alt={transcript.videoTitle}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if thumbnail fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                    <svg class="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                `;
              }}
            />
            {transcript.videoDuration && (
              <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/80 rounded text-xs text-white">
                {formatDuration(transcript.videoDuration)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1 truncate">{transcript.videoTitle}</h3>
          {transcript.channelName && (
            <p className="text-sm text-gray-400 mb-2 truncate">{transcript.channelName}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FileText className="w-3 h-3" />
            <span>{getRelativeTime(transcript.createdAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row sm:flex-col gap-2 justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCopy}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400 hidden sm:inline">Copy</span>
          </motion.button>

          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl transition-colors"
              title="Download transcript"
            >
              <Download className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400 hidden sm:inline">Download</span>
            </motion.button>

            {/* Download Menu */}
            <div className="absolute right-0 mt-2 w-32 bg-gray-900 border border-white/20 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => onDownload('txt')}
                className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/10 rounded-t-xl transition-colors"
              >
                TXT
              </button>
              <button
                onClick={() => onDownload('pdf')}
                className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-white/10 rounded-b-xl transition-colors"
              >
                PDF
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDeleteClick}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-colors"
            title="Delete transcript"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400 hidden sm:inline">Delete</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
