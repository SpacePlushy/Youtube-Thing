'use client';

import { useState, useEffect } from 'react';
import { TranscriptAPI } from '@/lib/api-client';
import { CryptoStorage } from '@/lib/crypto-storage';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { FormatOptions } from '@/components/format-options';
import { Loader2, Trash2, Shield } from 'lucide-react';

// No business logic exposed - just UI
export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasData, setHasData] = useState(false);
  const [displayData, setDisplayData] = useState<Array<{text: string, timestamp?: string}>>([]);
  const [, setMetadata] = useState<{duration?: number, language?: string} | null>(null);
  const [language, setLanguage] = useState('en');
  const [transcriptType, setTranscriptType] = useState<'auto' | 'manual'>('auto');
  const [formattedContent, setFormattedContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ message: string; value: number } | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>('');
  
  // Check for CSP nonce on mount
  useEffect(() => {
    const metaTag = document.querySelector('meta[property="csp-nonce"]');
    if (metaTag) {
      // CSP is active - enhanced security
      console.info('Enhanced security active');
    }
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    setLoading(true);
    setError('');
    setHasData(false);
    setDisplayData([]);
    setMetadata(null);
    setFormattedContent('');
    setProgress(null);
    
    try {
      // Check encrypted storage first
      if (sessionToken) {
        const cached = await CryptoStorage.get(sessionToken);
        if (cached) {
          const data = cached as {data: Array<{text: string, timestamp?: string}>, metadata: {duration?: number, language?: string}};
          setDisplayData(data.data);
          setMetadata(data.metadata);
          setHasData(true);
          setSessionActive(true);
          setLoading(false);
          return;
        }
      }
      
      // Request processing through secure API
      const result = await TranscriptAPI.extract(url, {
        language,
        transcriptType
      });
      
      if (result.success && result.data) {
        setDisplayData(result.data);
        setMetadata(result.metadata);
        setHasData(true);
        
        // Store in encrypted storage
        if (result.sessionToken) {
          setSessionToken(result.sessionToken);
          setSessionActive(true);
          await CryptoStorage.set(result.sessionToken, {
            data: result.data,
            metadata: result.metadata
          });
        }
      }
    } catch {
      // Generic error message
      setError('Unable to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFormat = async (options: {style: string, includeTimestamps?: boolean, paragraphLength?: string}) => {
    setIsProcessing(true);
    setFormattedContent('');
    setError('');
    setProgress(null);
    
    try {
      const response = await TranscriptAPI.format(displayData, options);
      
      if (response instanceof Response && response.body) {
        // Handle streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'stream' || data.type === 'chunk') {
                  accumulated += data.content || '';
                  setFormattedContent(accumulated);
                } else if (data.type === 'progress') {
                  setProgress({ 
                    message: data.message, 
                    value: data.progress 
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch {
      setError('Formatting failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };
  
  const clearSession = async () => {
    await CryptoStorage.clear();
    setSessionToken('');
    setSessionActive(false);
    setDisplayData([]);
    setHasData(false);
    setMetadata(null);
    setFormattedContent('');
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground flex items-center justify-center gap-2">
            SecureTranscript
            <Shield className="w-8 h-8 text-green-500" />
          </h1>
          <p className="text-muted-foreground">
            Extract transcripts securely with enhanced protection
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter video URL"
              className="w-full px-4 py-3 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
              disabled={loading}
              autoComplete="off"
              spellCheck="false"
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
                Type
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
            {loading ? 'Processing...' : 'Extract'}
          </button>
        </form>
        
        {sessionActive && (
          <div className="mt-4 p-3 bg-green-950/20 border border-green-900/30 text-green-400 rounded text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Secure session active • Data encrypted
            </span>
            <button
              onClick={clearSession}
              className="text-green-400 hover:text-green-300 transition-colors"
              title="Clear session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {hasData && displayData.length > 0 && (
          <>
            <TranscriptViewer transcript={displayData} />
            
            <FormatOptions 
              transcriptLength={displayData.length}
              onFormat={handleFormat}
              isFormatting={isProcessing}
            />
            
            {progress && (
              <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{progress.message}</span>
                  <span className="text-sm text-muted-foreground">{progress.value}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.value}%` }}
                  />
                </div>
              </div>
            )}
            
            {formattedContent && (
              <div className="mt-6 p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  AI-Enhanced Content
                  <span className="text-xs text-muted-foreground">
                    (Powered by Gemini)
                  </span>
                </h3>
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-card-foreground">
                    {formattedContent}
                  </pre>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(formattedContent)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([formattedContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'content.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90"
                  >
                    Download
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