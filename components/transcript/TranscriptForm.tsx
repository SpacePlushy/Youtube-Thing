import { Loader2 } from 'lucide-react';
import type { TranscriptOrigin, SupportedLanguage } from '@/lib/types';

interface TranscriptFormProps {
  url: string;
  setUrl: (url: string) => void;
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  transcriptOrigin: TranscriptOrigin;
  setTranscriptOrigin: (origin: TranscriptOrigin) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  autoFocus?: boolean;
}

export function TranscriptForm({
  url,
  setUrl,
  language,
  setLanguage,
  transcriptOrigin,
  setTranscriptOrigin,
  loading,
  onSubmit,
  autoFocus = true
}: TranscriptFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="YouTube URL or video ID"
        className="w-full px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground text-base"
        disabled={loading}
        autoFocus={autoFocus}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          className="px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent text-base"
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
          onChange={(e) => setTranscriptOrigin(e.target.value as TranscriptOrigin)}
          className="px-3 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent text-base"
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
        <span>{loading ? 'Extracting...' : 'Extract Transcript'}</span>
      </button>
    </form>
  );
}