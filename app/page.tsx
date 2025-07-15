'use client';

import { useState } from 'react';
import { extractVideoId, extractTranscript } from '@/lib/youtube';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { FormatOptions } from '@/components/format-options';
import { Loader2 } from 'lucide-react';

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
    
    try {
      const result = await extractTranscript(videoId, 'oxylabs', { language, transcriptOrigin });
      setTranscript(result.transcript || []);
      setTranscriptMetadata(result.metadata || null);
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
    setFormattingProgress(null);
    
    try {
      const response = await fetch('/api/format-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, options })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to format transcript');
      }
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completedChunks: string[] = [];
      let currentChunkText = '';
      let currentChunkIndex = -1;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr.trim()) {
              try {
                const data = JSON.parse(dataStr);
                
                if (data.type === 'stream' && data.isPartial) {
                  // Handle streaming text within a chunk
                  if (data.chunkIndex !== currentChunkIndex) {
                    // New chunk started
                    if (currentChunkIndex >= 0 && currentChunkText) {
                      // Save the previous chunk
                      completedChunks[currentChunkIndex] = currentChunkText;
                    }
                    currentChunkIndex = data.chunkIndex;
                    currentChunkText = '';
                  }
                  
                  // Append new content to current chunk
                  currentChunkText += data.content;
                  
                  // Build the full text from completed chunks + current streaming chunk
                  let fullText = completedChunks.filter(chunk => chunk).join('\n\n');
                  if (fullText && currentChunkText) {
                    // Only add spacing if needed
                    if (!fullText.endsWith('\n')) {
                      fullText += '\n\n';
                    } else if (!fullText.endsWith('\n\n')) {
                      fullText += '\n';
                    }
                  }
                  fullText += currentChunkText;
                  setFormattedTranscript(fullText);
                  
                } else if (data.type === 'chunk' && !data.isPartial) {
                  // Final chunk complete
                  completedChunks[data.chunkIndex] = data.content;
                  currentChunkText = '';
                  currentChunkIndex = data.chunkIndex;
                  
                  // Update with all completed chunks, filtering empty ones
                  const cleanedChunks = completedChunks.filter(chunk => chunk && chunk.trim());
                  setFormattedTranscript(cleanedChunks.join('\n\n'));
                  
                } else if (data.type === 'progress') {
                  // Update progress in UI
                  setFormattingProgress({ message: data.message, progress: data.progress });
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error('Failed to parse streaming data:', e);
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to format transcript');
      console.error('Formatting error:', err);
    } finally {
      setIsFormatting(false);
      setFormattingProgress(null);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Youtube-Thing
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