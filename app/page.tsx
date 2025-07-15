'use client';

import { useState } from 'react';
import { extractVideoId, extractTranscript } from '@/lib/youtube';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<any[]>([]);
  const [transcriptMetadata, setTranscriptMetadata] = useState<any>(null);
  const [language, setLanguage] = useState('en');
  const [transcriptOrigin, setTranscriptOrigin] = useState<'auto_generated' | 'uploader_provided'>('auto_generated');
  
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
                <option value="auto_generated">Auto-generated (Default)</option>
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
        
        {transcript.length > 0 && <TranscriptViewer transcript={transcript} />}
      </div>
    </div>
  );
}