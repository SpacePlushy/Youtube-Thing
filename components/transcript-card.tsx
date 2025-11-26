'use client';

import { Copy, Download, Trash2, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { TranscriptHistoryItem } from '@/lib/types';

interface TranscriptCardProps {
  transcript: TranscriptHistoryItem;
  onCopy: () => void;
  onDownload: (format: 'txt' | 'pdf') => void;
  onDelete: () => void;
}

export function TranscriptCard({ transcript, onCopy, onDownload, onDelete }: TranscriptCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getThumbnailUrl = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteClick = () => {
    if (confirm('Delete this transcript?')) {
      onDelete();
    }
  };

  return (
    <div className="flex gap-4 p-4 bg-gray-50 dark:bg-neutral-800/50 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
      {/* Thumbnail */}
      <div className="flex-shrink-0 hidden sm:block">
        <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-neutral-700">
          <img
            src={getThumbnailUrl(transcript.videoId)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {transcript.videoDuration && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/75 rounded text-xs text-white">
              {formatDuration(transcript.videoDuration)}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1">{transcript.videoTitle}</h3>
        {transcript.channelName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-1">{transcript.channelName}</p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">{getRelativeTime(transcript.createdAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-start gap-1">
        <button
          onClick={onCopy}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          title="Copy"
        >
          <Copy className="w-4 h-4" />
        </button>

        <button
          onClick={() => onDownload('txt')}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => {
                    onDownload('pdf');
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-t-lg"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    handleDeleteClick();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-b-lg"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
