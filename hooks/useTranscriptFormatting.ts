import { useState, useCallback } from 'react';
import { analytics } from '@/lib/analytics';
import type { TranscriptSegment, FormattingProgress } from '@/lib/types';

interface FormatOptions {
  style: string;
  includeTimestamps: boolean;
  paragraphLength: string;
}

interface UseTranscriptFormattingReturn {
  formattedTranscript: string;
  isFormatting: boolean;
  formattingProgress: FormattingProgress | null;
  error: string;
  formatTranscript: (transcript: TranscriptSegment[], options: FormatOptions) => Promise<void>;
  clearError: () => void;
  clearFormattingProgress: () => void;
  parseFormattedTranscript: (text: string) => { timestamp: string; text: string }[];
}

export function useTranscriptFormatting(): UseTranscriptFormattingReturn {
  const [formattedTranscript, setFormattedTranscript] = useState<string>('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingProgress, setFormattingProgress] = useState<FormattingProgress | null>(null);
  const [error, setError] = useState('');

  const clearError = useCallback(() => setError(''), []);
  const clearFormattingProgress = useCallback(() => setFormattingProgress(null), []);

  const parseFormattedTranscript = useCallback((text: string): { timestamp: string; text: string }[] => {
    const lines = text.split('\n');
    const parsed: { timestamp: string; text: string }[] = [];
    
    for (const line of lines) {
      // Match [timestamp] text pattern
      const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (match) {
        const [, timestamp, text] = match;
        parsed.push({ timestamp: timestamp.trim(), text: text.trim() });
      } else if (line.trim()) {
        // Handle text without timestamp (continuation)
        if (parsed.length > 0) {
          parsed[parsed.length - 1].text += ' ' + line.trim();
        }
      }
    }
    
    return parsed;
  }, []);

  const formatTranscript = useCallback(async (transcript: TranscriptSegment[], options: FormatOptions) => {
    setIsFormatting(true);
    setFormattedTranscript('');
    setError('');
    setFormattingProgress({ message: 'Initializing AI formatter...', progress: 0 });
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('/api/format-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, options })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Failed to format transcript';
        } catch {
          errorMessage = errorText || 'Failed to format transcript';
        }
        throw new Error(errorMessage);
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      // Stream processing logic
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let progressData = { current: 0, total: 1 };
      let streamProgress = 0;
      let lastUpdate = Date.now();
      let totalBytesReceived = 0;
      
      // Helper to calculate overall progress
      const calculateProgress = () => {
        if (progressData.total > 1) {
          const chunkProgress = (progressData.current / progressData.total) * 90;
          const intraChunkProgress = streamProgress * 0.1;
          return Math.min(95, chunkProgress + intraChunkProgress);
        } else {
          return Math.min(95, streamProgress * 90);
        }
      };
      
      // Update progress with throttling
      const updateProgress = () => {
        const now = Date.now();
        if (now - lastUpdate > 100) {
          const progress = calculateProgress();
          const message = progressData.total > 1 
            ? `Formatting transcript... (chunk ${progressData.current} of ${progressData.total})`
            : 'Formatting transcript...';
          
          setFormattingProgress({ message, progress: Math.round(progress) });
          lastUpdate = now;
        }
      };
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const textChunk = decoder.decode(value, { stream: true });
        totalBytesReceived += value.byteLength;
        
        // Estimate stream progress
        streamProgress = Math.min(1, totalBytesReceived / 10000);
        
        // Check for progress markers
        const progressMatch = textChunk.match(/__PROGRESS__:({.*?})\n/);
        if (progressMatch) {
          try {
            const newProgressData = JSON.parse(progressMatch[1]);
            
            if (newProgressData.current > progressData.current) {
              streamProgress = 0;
              totalBytesReceived = 0;
            }
            
            progressData = newProgressData;
            const cleanedChunk = textChunk.replace(/__PROGRESS__:.*?\n/g, '');
            accumulatedText += cleanedChunk;
          } catch {
            accumulatedText += textChunk;
          }
        } else {
          accumulatedText += textChunk;
        }
        
        updateProgress();
        setFormattedTranscript(accumulatedText.replace(/__PROGRESS__:.*?\n/g, ''));
      }
      
      // Final cleanup
      const finalChunk = decoder.decode();
      if (finalChunk) {
        accumulatedText += finalChunk;
      }
      
      const cleanedTranscript = accumulatedText.replace(/__PROGRESS__:.*?\n/g, '');
      setFormattedTranscript(cleanedTranscript);
      setFormattingProgress({ message: 'Complete!', progress: 100 });
      
      // Track successful formatting
      analytics.trackFormatting({
        style: options.style,
        transcriptLength: transcript.length,
        includeTimestamps: options.includeTimestamps,
        paragraphLength: options.paragraphLength,
        duration: Date.now() - startTime,
        error: false
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to format transcript';
      setError(errorMessage);
      
      // Track formatting error
      analytics.trackError({
        type: 'formatting',
        error: errorMessage,
        context: { style: options.style, transcriptLength: transcript.length }
      });
      
      analytics.trackFormatting({
        style: options.style,
        transcriptLength: transcript.length,
        includeTimestamps: options.includeTimestamps,
        paragraphLength: options.paragraphLength,
        duration: Date.now() - startTime,
        error: true
      });
    } finally {
      setIsFormatting(false);
    }
  }, []);

  return {
    formattedTranscript,
    isFormatting,
    formattingProgress,
    error,
    formatTranscript,
    clearError,
    clearFormattingProgress,
    parseFormattedTranscript
  };
}