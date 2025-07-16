'use client';

import { useState } from 'react';
import { extractVideoId, extractTranscript } from '@/lib/youtube';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { FormatOptions } from '@/components/format-options';
import { TranscriptCache } from '@/lib/transcript-cache';
import { Loader2, Trash2 } from 'lucide-react';

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

  // Clean text streaming with AI SDK - no complex parsing needed
  
  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL');
      return;
    }
    
    setLoading(true);
    setError('');
    setTranscript([]);
    setTranscriptMetadata(null);
    setFormattedTranscript('');
    setFormattingProgress(null);
    setUsingCache(false);
    
    try {
      // Check cache first
      const cached = TranscriptCache.get(videoId, language, transcriptOrigin);
      
      if (cached) {
        setTranscript(cached.transcript);
        setTranscriptMetadata(cached.metadata);
        setUsingCache(true);
      } else {
        const result = await extractTranscript(videoId, 'oxylabs', { language, transcriptOrigin });
        
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract transcript');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFormat = async (options: any) => {
    setIsFormatting(true);
    setFormattedTranscript('');
    setError('');
    setFormattingProgress({ message: 'Starting AI formatting...', progress: 10 });
    
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
      
      setFormattingProgress({ message: 'Streaming AI response...', progress: 30 });
      
      // Simple text streaming following AI SDK patterns
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        
        const textChunk = decoder.decode(value, { stream: true });
        accumulatedText += textChunk;
        setFormattedTranscript(accumulatedText);
        
        // Update progress based on content length (simple heuristic)
        const progress = Math.min(90, 30 + (accumulatedText.length / 50));
        setFormattingProgress({ message: 'Formatting transcript...', progress });
      }
      
      setFormattingProgress({ message: 'Complete!', progress: 100 });
      setTimeout(() => setFormattingProgress(null), 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to format transcript');
    } finally {
      setIsFormatting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            YouTube Thing
          </h1>
          <p className="text-muted-foreground">
            Extract transcripts from any YouTube video with captions
          </p>
        </div>
        
        <form onSubmit={handleExtract} className="space-y-4">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
              className="w-full px-4 py-3 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
              disabled={loading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent"
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Transcript Type
              </label>
              <select
                value={transcriptOrigin}
                onChange={(e) => setTranscriptOrigin(e.target.value as 'auto_generated' | 'uploader_provided')}
                className="w-full px-4 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent"
                disabled={loading}
              >
                <option value="auto_generated">Auto-generated</option>
                <option value="uploader_provided">Uploader Provided</option>
              </select>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 rounded">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Extracting...' : 'Extract Transcript'}
          </button>
        </form>
        
        {transcriptMetadata?.hadToFallback && (
          <div className="mt-4 p-3 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 rounded text-sm">
            Note: The requested transcript wasn&apos;t available. 
            Showing {transcriptMetadata.actualOrigin === 'auto_generated' ? 'auto-generated' : 'uploader-provided'} transcript 
            in {transcriptMetadata.actualLanguage === 'en' ? 'English' : transcriptMetadata.actualLanguage}.
          </div>
        )}
        
        {transcript.length > 0 && (
          <>
            {usingCache && (
              <div className="mt-4 p-3 bg-green-950/20 border border-green-900/30 text-green-400 rounded text-sm flex items-center justify-between">
                <span>Using cached transcript • Loaded instantly from browser storage</span>
                <button
                  onClick={() => {
                    TranscriptCache.clearAll();
                    setUsingCache(false);
                    alert('Cache cleared! Next extraction will fetch fresh data.');
                  }}
                  className="text-green-400 hover:text-green-300 transition-colors"
                  title="Clear all cached transcripts"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <TranscriptViewer transcript={transcript} />
            
            <FormatOptions 
              transcriptLength={transcript.length}
              onFormat={handleFormat}
              isFormatting={isFormatting}
            />
            
            {formattingProgress && (
              <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{formattingProgress.message}</span>
                  <span className="text-sm text-muted-foreground">{formattingProgress.progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${formattingProgress.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {formattedTranscript && (
              <div className="mt-6 p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  Formatted Transcript
                  {isFormatting && (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      • Streaming...
                    </span>
                  )}
                </h3>
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(formattedTranscript)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
                  >
                    Copy Formatted
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
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90"
                  >
                    Download Formatted
                  </button>
                </div>
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-card-foreground">
                    {formattedTranscript}
                    {isFormatting && (
                      <span className="animate-pulse">▊</span>
                    )}
                  </pre>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(formattedTranscript)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
                  >
                    Copy Formatted
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
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90"
                  >
                    Download Formatted
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}