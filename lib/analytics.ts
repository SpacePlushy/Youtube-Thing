/**
 * Analytics utility for tracking user interactions and business metrics
 * Note: Custom events require Vercel Pro or Enterprise plan
 */

import { track } from '@vercel/analytics';

// Type definitions for analytics events
interface ExtractEventData {
  videoId: string;
  language: string;
  transcriptType: 'auto_generated' | 'uploader_provided';
  cached: boolean;
  duration?: number;
}

interface FormatEventData {
  style: string;
  transcriptLength: number;
  includeTimestamps: boolean;
  paragraphLength: string;
  duration?: number;
  error?: boolean;
}

interface ErrorEventData {
  type: 'extraction' | 'formatting' | 'api';
  error: string;
  context?: Record<string, any>;
}

export const analytics = {
  // Track successful transcript extraction
  trackExtraction: (data: ExtractEventData) => {
    if (typeof window !== 'undefined') {
      // Convert to plain object for Vercel Analytics
      track('transcript_extracted', {
        videoId: data.videoId,
        language: data.language,
        transcriptType: data.transcriptType,
        cached: data.cached,
        ...(data.duration !== undefined && { duration: data.duration })
      });
    }
  },

  // Track AI formatting
  trackFormatting: (data: FormatEventData) => {
    if (typeof window !== 'undefined') {
      // Convert to plain object for Vercel Analytics
      track('transcript_formatted', {
        style: data.style,
        transcriptLength: data.transcriptLength,
        includeTimestamps: data.includeTimestamps,
        paragraphLength: data.paragraphLength,
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.error !== undefined && { error: data.error })
      });
    }
  },

  // Track export actions
  trackExport: (method: 'copy' | 'download', type: 'raw' | 'formatted') => {
    if (typeof window !== 'undefined') {
      track('transcript_exported', { method, type });
    }
  },

  // Track cache actions
  trackCacheAction: (action: 'hit' | 'miss' | 'clear') => {
    if (typeof window !== 'undefined') {
      track('cache_action', { action });
    }
  },

  // Track errors for monitoring
  trackError: (data: ErrorEventData) => {
    if (typeof window !== 'undefined') {
      // Convert to plain object for Vercel Analytics
      track('error_occurred', {
        type: data.type,
        error: data.error,
        ...(data.context && { context: JSON.stringify(data.context) })
      });
    }
  },

  // Generic action tracking
  trackAction: (action: string, data?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      track(action, data);
    }
  },

  // Track page-specific events
  trackPageAction: (page: string, action: string, data?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      track(`${page}_${action}`, data);
    }
  }
};

// Helper to measure operation duration
export const measureDuration = async <T>(
  operation: () => Promise<T>,
  trackingFn: (duration: number) => void
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await operation();
    trackingFn(Date.now() - startTime);
    return result;
  } catch (error) {
    trackingFn(Date.now() - startTime);
    throw error;
  }
};