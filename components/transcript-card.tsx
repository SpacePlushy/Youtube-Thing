'use client';

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
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <div className="relative w-full sm:w-36 h-20 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={getThumbnailUrl(transcript.videoId)}
              alt={transcript.videoTitle}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `
                  <div class="w-full h-full flex items-center justify-center bg-gray-100">
                    <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                `;
              }}
            />
            {transcript.videoDuration && (
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/75 rounded text-xs text-white font-medium">
                {formatDuration(transcript.videoDuration)}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{transcript.videoTitle}</h3>
          {transcript.channelName && (
            <p className="text-xs text-gray-500 mb-2 truncate">{transcript.channelName}</p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText className="w-3 h-3" />
            <span>{getRelativeTime(transcript.createdAt)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row sm:flex-col gap-1.5 justify-end">
          <button
            onClick={onCopy}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          <div className="relative group">
            <button
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Download Menu */}
            <div className="absolute right-0 mt-1 w-24 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => onDownload('txt')}
                className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors"
              >
                TXT
              </button>
              <button
                onClick={() => onDownload('pdf')}
                className="w-full px-3 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 rounded-b-lg transition-colors"
              >
                PDF
              </button>
            </div>
          </div>

          <button
            onClick={handleDeleteClick}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
