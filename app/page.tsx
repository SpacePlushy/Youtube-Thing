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
    
    try {
      const response = await fetch('/api/format-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, options })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to format transcript');
      }
      
      if (data.success && data.formattedText) {
        setFormattedTranscript(data.formattedText);
      } else {
        throw new Error('Invalid response from formatting API');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to format transcript');
      console.error('Formatting error:', err);
    } finally {
      setIsFormatting(false);
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
            
            {formattedTranscript && (
              <div className="mt-6 p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4">Formatted Transcript</h3>
                <div className="prose prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-card-foreground">
                    {formattedTranscript}
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