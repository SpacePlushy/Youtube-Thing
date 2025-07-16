'use client';

import { useState } from 'react';
import { TranscriptAPI } from '@/lib/api-client';
import { SecureStorage } from '@/lib/secure-storage';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { FormatOptions } from '@/components/format-options';
import { Loader2, Trash2 } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [language, setLanguage] = useState('en');
  const [transcriptType, setTranscriptType] = useState<'auto' | 'manual'>('auto');
  const [formattedTranscript, setFormattedTranscript] = useState<string>('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingProgress, setFormattingProgress] = useState<{ message: string; progress: number } | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    setLoading(true);
    setError('');
    setTranscript([]);
    setMetadata(null);
    setFormattedTranscript('');
    setFormattingProgress(null);
    
    try {
      // Check secure storage first
      if (sessionToken) {
        const cached = await SecureStorage.get(sessionToken);
        if (cached) {
          setTranscript(cached.data);
          setMetadata(cached.metadata);
          setLoading(false);
          return;
        }
      }
      
      // Extract transcript through unified API
      const result = await TranscriptAPI.extract(url, {
        language,
        transcriptType
      });
      
      if (result.success) {
        setTranscript(result.data || []);
        setMetadata(result.metadata || null);
        setSessionToken(result.sessionToken);
        
        // Store in secure storage
        if (result.sessionToken) {
          await SecureStorage.set(result.sessionToken, {
            data: result.data,
            metadata: result.metadata
          });
        }
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
    setFormattingProgress(null);
    
    try {
      // Gemini formatting - visible as requested
      const response = await TranscriptAPI.format(transcript, options);
      
      if (response instanceof Response && response.body) {
        // Handle streaming response
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
                    if (data.chunkIndex !== currentChunkIndex) {
                      if (currentChunkIndex >= 0 && currentChunkText) {
                        completedChunks[currentChunkIndex] = currentChunkText;
                      }
                      currentChunkIndex = data.chunkIndex;
                      currentChunkText = '';
                    }
                    
                    currentChunkText += data.content;
                    
                    let fullText = completedChunks.filter(chunk => chunk).join('\n\n');
                    if (fullText && currentChunkText) {
                      if (!fullText.endsWith('\n')) {
                        fullText += '\n\n';
                      } else if (!fullText.endsWith('\n\n')) {
                        fullText += '\n';
                      }
                    }
                    fullText += currentChunkText;
                    setFormattedTranscript(fullText);
                    
                  } else if (data.type === 'chunk' && !data.isPartial) {
                    completedChunks[data.chunkIndex] = data.content;
                    currentChunkText = '';
                    currentChunkIndex = data.chunkIndex;
                    
                    const cleanedChunks = completedChunks.filter(chunk => chunk && chunk.trim());
                    setFormattedTranscript(cleanedChunks.join('\n\n'));
                    
                  } else if (data.type === 'progress') {
                    setFormattingProgress({ message: data.message, progress: data.progress });
                  } else if (data.type === 'error') {
                    throw new Error(data.message);
                  }
                } catch (e) {
                  // Silent error handling
                }
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to format transcript');
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
              placeholder="Enter YouTube URL"
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
                value={transcriptType}
                onChange={(e) => setTranscriptType(e.target.value as 'auto' | 'manual')}
                className="w-full px-4 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent"
                disabled={loading}
              >
                <option value="auto">Automatic</option>
                <option value="manual">Manual</option>
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
            {loading ? 'Processing...' : 'Extract Transcript'}
          </button>
        </form>
        
        {metadata?.hadToFallback && (
          <div className="mt-4 p-3 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 rounded text-sm">
            Note: The requested transcript wasn&apos;t available. 
            Showing {metadata.actualOrigin === 'auto' ? 'automatic' : 'manual'} transcript 
            in {metadata.actualLanguage === 'en' ? 'English' : metadata.actualLanguage}.
          </div>
        )}
        
        {transcript.length > 0 && (
          <>
            {sessionToken && (
              <div className="mt-4 p-3 bg-green-950/20 border border-green-900/30 text-green-400 rounded text-sm flex items-center justify-between">
                <span>Transcript loaded successfully</span>
                <button
                  onClick={() => {
                    SecureStorage.clear();
                    setSessionToken(null);
                  }}
                  className="text-green-400 hover:text-green-300 transition-colors"
                  title="Clear data"
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
            
            {/* Gemini formatting output - visible as requested */}
            {formattedTranscript && (
              <div className="mt-6 p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  AI-Formatted Transcript (Powered by Gemini)
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