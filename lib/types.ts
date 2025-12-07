/**
 * Centralized type definitions for the application
 */

import { TranscriptOrigin, SupportedLanguage } from './constants';

// Re-export types from constants for convenience
export type { TranscriptOrigin, SupportedLanguage } from './constants';

// Re-export subscription-related types
export type { SubscriptionTier, FeatureFlag } from './subscription-helpers';

// Transcript related types
export interface TranscriptSegment {
  text: string;
  timestamp: string;
  duration?: number;
}

export interface TranscriptMetadata {
  videoId: string;
  title?: string;
  author?: string;
  duration?: string;
  language: SupportedLanguage;
  origin: TranscriptOrigin;
  hadToFallback?: boolean;
  actualLanguage?: string;
  actualOrigin?: TranscriptOrigin;
}

export interface TranscriptResponse {
  transcript: TranscriptSegment[];
  metadata?: TranscriptMetadata;
  usage?: UsageStats; // Added for authenticated requests
}

export interface ExtractTranscriptOptions {
  language: SupportedLanguage;
  transcriptOrigin: TranscriptOrigin;
}

// Cache types
export interface CachedTranscript {
  transcript: TranscriptSegment[];
  metadata?: TranscriptMetadata;
  cachedAt: number;
}

// Error response
export interface ErrorResponse {
  error: string;
  details?: string;
}

// Usage tracking types
export interface UsageStats {
  currentUsage: number;
  dailyLimit: number;
  tier: string;
  resetTime?: string; // ISO 8601 timestamp
  canProceed?: boolean;
}

// Transcript history types
export interface TranscriptHistoryItem {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName: string | null;
  videoDuration: number | null;
  createdAt: string;
}

export interface TranscriptHistoryResponse {
  transcripts: TranscriptHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TranscriptFullItem extends TranscriptHistoryItem {
  transcriptText: string;
}

// Database types
export interface UserTranscriptRow {
  id: string;
  user_id: string;
  video_id: string;
  video_title: string;
  channel_name: string | null;
  video_duration: number | null;
  transcript_text: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSettingsRow {
  user_id: string;
  default_export_format: string;
  email_notifications: boolean;
  created_at: Date;
  updated_at: Date;
}
