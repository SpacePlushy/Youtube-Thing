/**
 * Centralized type definitions for the application
 */

import { TranscriptOrigin, SupportedLanguage } from './constants';

// Re-export types from constants for convenience
export type { TranscriptOrigin, SupportedLanguage } from './constants';

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
