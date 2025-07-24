import { useState, useCallback } from 'react';
import { extractVideoId, extractTranscript } from '@/lib/youtube';
import { TranscriptCache } from '@/lib/transcript-cache';
import { analytics } from '@/lib/analytics';
import type { TranscriptSegment, TranscriptMetadata, TranscriptOrigin, SupportedLanguage } from '@/lib/types';

interface UseTranscriptExtractionProps {
  language: SupportedLanguage;
  transcriptOrigin: TranscriptOrigin;
}

interface UseTranscriptExtractionReturn {
  loading: boolean;
  error: string;
  transcript: TranscriptSegment[];
  transcriptMetadata: TranscriptMetadata | null;
  usingCache: boolean;
  extractTranscript: (url: string) => Promise<void>;
  clearError: () => void;
}

export function useTranscriptExtraction({
  language,
  transcriptOrigin
}: UseTranscriptExtractionProps): UseTranscriptExtractionReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [transcriptMetadata, setTranscriptMetadata] = useState<TranscriptMetadata | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const clearError = useCallback(() => setError(''), []);

  const extractTranscriptHandler = useCallback(async (url: string) => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL or video ID');
      return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid input. Please enter a YouTube video URL (e.g., youtube.com/watch?v=...) or just the video ID');
      return;
    }
    
    setLoading(true);
    setError('');
    setTranscript([]);
    setTranscriptMetadata(null);
    setUsingCache(false);
    
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cached = TranscriptCache.get(videoId, language, transcriptOrigin);
      
      if (cached) {
        setTranscript(cached.transcript);
        setTranscriptMetadata(cached.metadata);
        setUsingCache(true);
        
        // Track cache hit
        analytics.trackExtraction({
          videoId,
          language,
          transcriptType: transcriptOrigin,
          cached: true,
          duration: Date.now() - startTime
        });
        analytics.trackCacheAction('hit');
      } else {
        const result = await extractTranscript(videoId, 'primary', { language, transcriptOrigin });
        
        // Cache the result
        if (result.transcript && result.transcript.length > 0) {
          TranscriptCache.set(
            videoId,
            language,
            transcriptOrigin,
            result.transcript,
            result.metadata
          );
        }
        
        setTranscript(result.transcript || []);
        setTranscriptMetadata(result.metadata || null);
        
        // Track successful extraction
        analytics.trackExtraction({
          videoId,
          language,
          transcriptType: transcriptOrigin,
          cached: false,
          duration: Date.now() - startTime
        });
        analytics.trackCacheAction('miss');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract transcript';
      setError(errorMessage);
      
      // Track extraction error
      analytics.trackError({
        type: 'extraction',
        error: errorMessage,
        context: { videoId, language, transcriptOrigin }
      });
    } finally {
      setLoading(false);
    }
  }, [language, transcriptOrigin]);

  return {
    loading,
    error,
    transcript,
    transcriptMetadata,
    usingCache,
    extractTranscript: extractTranscriptHandler,
    clearError
  };
}