'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractVideoId, extractTranscript } from '@/lib/youtube';
import { FormatOptions } from '@/components/format-options';
import { SmoothProgressBar } from '@/components/smooth-progress-bar';
import { TranscriptCache } from '@/lib/transcript-cache';
import { analytics } from '@/lib/analytics';
import { Loader2, Trash2, Copy, Download } from 'lucide-react';


export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<any[]>([]);
  const [transcriptMetadata, setTranscriptMetadata] = useState<any>(null);
  const [language, setLanguage] = useState('en');
  const [transcriptOrigin, setTranscriptOrigin] = useState<'auto_generated' | 'uploader_provided'>('auto_generated');
  const [formattedTranscript, setFormattedTranscript] = useState<string>('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingProgress, setFormattingProgress] = useState<{ message: string; progress: number } | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Helper function to copy with notification
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(`${label} copied to clipboard!`);
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (err) {
      setCopyNotification('Failed to copy');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  // Helper function to parse formatted transcript into timestamp/text pairs
  const parseFormattedTranscript = (text: string): { timestamp: string; text: string }[] => {
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
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
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
    setFormattedTranscript('');
    setFormattingProgress(null);
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
  };
  
  const handleFormat = async (options: any) => {
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
      
      // Simple text streaming following AI SDK patterns
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let progressData = { current: 0, total: 1 };
      let baseProgress = 0;
      let streamProgress = 0;
      let lastUpdate = Date.now();
      let totalBytesReceived = 0;
      
      // Helper to calculate overall progress
      const calculateProgress = () => {
        // For multi-chunk: base progress from chunks + stream progress within current chunk
        // For single chunk: just stream progress
        if (progressData.total > 1) {
          const chunkProgress = (progressData.current / progressData.total) * 90; // 90% for chunks
          const intraChunkProgress = streamProgress * 0.1; // 10% for streaming within chunk
          return Math.min(95, chunkProgress + intraChunkProgress);
        } else {
          // Single chunk - use stream progress for smooth progression
          return Math.min(95, streamProgress * 90); // Cap at 90% until complete
        }
      };
      
      // Update progress with throttling
      const updateProgress = () => {
        const now = Date.now();
        if (now - lastUpdate > 100) { // Throttle to every 100ms
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
        if (done) {
          break;
        }
        
        const textChunk = decoder.decode(value, { stream: true });
        totalBytesReceived += value.byteLength;
        
        // Estimate stream progress based on bytes received (rough estimate)
        streamProgress = Math.min(1, totalBytesReceived / 10000); // Assume ~10KB average
        
        // Check for progress markers
        const progressMatch = textChunk.match(/__PROGRESS__:({.*?})\n/);
        if (progressMatch) {
          try {
            const newProgressData = JSON.parse(progressMatch[1]);
            
            // Reset stream progress when moving to new chunk
            if (newProgressData.current > progressData.current) {
              streamProgress = 0;
              totalBytesReceived = 0;
            }
            
            progressData = newProgressData;
            
            // Remove progress marker from output
            const cleanedChunk = textChunk.replace(/__PROGRESS__:.*?\n/g, '');
            accumulatedText += cleanedChunk;
          } catch (e) {
            // If parsing fails, just add the chunk as-is
            accumulatedText += textChunk;
          }
        } else {
          accumulatedText += textChunk;
        }
        
        // Always update progress based on current state
        updateProgress();
        
        setFormattedTranscript(accumulatedText.replace(/__PROGRESS__:.*?\n/g, ''));
      }
      
      // Decode any remaining bytes without the stream flag
      const finalChunk = decoder.decode();
      if (finalChunk) {
        accumulatedText += finalChunk;
      }
      
      // Final cleanup of any remaining progress markers
      const cleanedTranscript = accumulatedText.replace(/__PROGRESS__:.*?\n/g, '');
      
      setFormattedTranscript(cleanedTranscript);
      
      // Set final progress to 100%
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
  };
  
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Copy notification toast */}
      <AnimatePresence>
        {copyNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
              <p className="text-sm text-card-foreground">{copyNotification}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="w-full mx-auto px-4 py-4 lg:py-8 flex-1 flex flex-col max-w-[1600px] min-h-0">
        <div className="text-center mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-4xl font-bold text-foreground">
            YouTube Thing
          </h1>
        </div>
        
        {/* Main content - animated layout based on transcript */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {transcript.length === 0 ? (
              /* Centered layout when no transcript */
              <motion.div
                key="centered"
                className="absolute inset-0 flex items-start justify-center pt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  layoutId="input-card"
                  className="bg-card rounded-lg border border-border p-4 lg:p-6 w-full max-w-xl"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
              <form onSubmit={handleExtract} className="space-y-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="YouTube URL or video ID"
                  className="w-full px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground text-sm"
                  disabled={loading}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                    disabled={loading}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                  </select>
                  
                  <select
                    value={transcriptOrigin}
                    onChange={(e) => setTranscriptOrigin(e.target.value as 'auto_generated' | 'uploader_provided')}
                    className="px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                    disabled={loading}
                  >
                    <option value="auto_generated">Auto-generated</option>
                    <option value="uploader_provided">Uploader Provided</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Extracting...' : 'Extract Script'}</span>
                </button>
              </form>
              
              {error && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded text-sm mt-4">
                  {error}
                </div>
              )}
              
              {transcriptMetadata?.hadToFallback && (
                <div className="p-3 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 rounded text-sm mt-4">
                  Note: The requested transcript wasn&apos;t available. 
                  Showing {transcriptMetadata.actualOrigin === 'auto_generated' ? 'auto-generated' : 'uploader-provided'} transcript 
                  in {transcriptMetadata.actualLanguage === 'en' ? 'English' : transcriptMetadata.actualLanguage}.
                </div>
              )}
              
              {usingCache && (
                <div className="p-3 bg-green-950/20 border border-green-900/30 text-green-400 rounded text-sm mt-4 flex items-center justify-between">
                  <span>Using cached transcript</span>
                  <button
                    onClick={() => {
                      TranscriptCache.clearAll();
                      setUsingCache(false);
                      analytics.trackCacheAction('clear');
                      alert('Cache cleared!');
                    }}
                    className="text-green-400 hover:text-green-300 transition-colors"
                    title="Clear cache"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            
                </motion.div>
              </motion.div>
            ) : (
              /* Two-panel layout when transcript exists */
              <motion.div
                key="panels"
                className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-h-0 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Left Panel - Input Controls and Raw Transcript */}
                <motion.div 
                  layoutId="input-card"
                  className="bg-card rounded-lg border border-border p-4 lg:p-6 flex flex-col min-h-0 overflow-hidden h-[calc(50vh-4rem)] lg:h-auto"
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
              <form onSubmit={handleExtract} className="space-y-3 mb-4">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="YouTube URL or video ID"
                  className="w-full px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground text-sm"
                  disabled={loading}
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                    disabled={loading}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                  </select>
                  
                  <select
                    value={transcriptOrigin}
                    onChange={(e) => setTranscriptOrigin(e.target.value as 'auto_generated' | 'uploader_provided')}
                    className="px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent text-sm"
                    disabled={loading}
                  >
                    <option value="auto_generated">Auto-generated</option>
                    <option value="uploader_provided">Uploader Provided</option>
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Extracting...' : 'Extract Script'}</span>
                </button>
              </form>
              
              {error && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded text-sm mb-4">
                  {error}
                </div>
              )}
              
              {transcriptMetadata?.hadToFallback && (
                <div className="p-3 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 rounded text-sm mb-4">
                  Note: The requested transcript wasn&apos;t available. 
                  Showing {transcriptMetadata.actualOrigin === 'auto_generated' ? 'auto-generated' : 'uploader-provided'} transcript 
                  in {transcriptMetadata.actualLanguage === 'en' ? 'English' : transcriptMetadata.actualLanguage}.
                </div>
              )}
              
              {usingCache && (
                <div className="p-3 bg-green-950/20 border border-green-900/30 text-green-400 rounded text-sm mb-4 flex items-center justify-between">
                  <span>Using cached transcript</span>
                  <button
                    onClick={() => {
                      TranscriptCache.clearAll();
                      setUsingCache(false);
                      analytics.trackCacheAction('clear');
                      alert('Cache cleared!');
                    }}
                    className="text-green-400 hover:text-green-300 transition-colors"
                    title="Clear cache"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Transcript Display */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Transcript</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
                        await copyToClipboard(fullText, 'Transcript');
                        analytics.trackExport('copy', 'raw');
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity text-sm"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => {
                        const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
                        const blob = new Blob([fullText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'transcript.txt';
                        a.click();
                        URL.revokeObjectURL(url);
                        analytics.trackExport('download', 'raw');
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition-opacity border border-border text-sm"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
                
                <div className="bg-secondary/50 rounded p-4 flex-1 overflow-y-auto border border-border">
                  <div className="space-y-2">
                    {transcript.map((item, index) => (
                      <div key={index} className="flex gap-3">
                        <span className="text-sm text-muted-foreground min-w-[60px] font-mono">
                          {item.timestamp}
                        </span>
                        <p className="text-sm text-card-foreground">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Right Panel - AI Formatting Options and Formatted Transcript */}
            <motion.div 
              className="bg-card rounded-lg border border-border p-4 lg:p-6 flex flex-col min-h-0 overflow-hidden h-[calc(50vh-4rem)] lg:h-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <div className="overflow-y-auto">
                <FormatOptions 
                  transcriptLength={transcript.length}
                  onFormat={handleFormat}
                  isFormatting={isFormatting}
                />
              </div>
              
              {formattingProgress && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border">
                  <SmoothProgressBar
                    progress={formattingProgress.progress}
                    message={formattingProgress.message}
                    onComplete={() => {
                      setTimeout(() => setFormattingProgress(null), 1000);
                    }}
                  />
                </div>
              )}
              
              {formattedTranscript && (
                <div className="mt-4 flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Formatted Transcript
                      {isFormatting && (
                        <span className="text-xs text-muted-foreground animate-pulse">
                          • Streaming...
                        </span>
                      )}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await copyToClipboard(formattedTranscript, 'Formatted transcript');
                          analytics.trackExport('copy', 'formatted');
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity text-sm"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([formattedTranscript], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'formatted-transcript.txt';
                          a.click();
                          URL.revokeObjectURL(url);
                          analytics.trackExport('download', 'formatted');
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition-opacity border border-border text-sm"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-secondary/50 rounded p-4 flex-1 overflow-y-auto border border-border">
                    <div className="space-y-2">
                      {parseFormattedTranscript(formattedTranscript).map((item, index) => (
                        <div key={index} className="flex gap-3">
                          <span className="text-sm text-muted-foreground min-w-[60px] font-mono">
                            {item.timestamp}
                          </span>
                          <p className="text-sm text-card-foreground">{item.text}</p>
                        </div>
                      ))}
                      {isFormatting && (
                        <div className="flex gap-3">
                          <span className="text-sm text-muted-foreground min-w-[60px] font-mono"></span>
                          <span className="text-sm text-card-foreground animate-pulse">▊</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}