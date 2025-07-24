import type { TranscriptMetadata } from '@/lib/types';

interface TranscriptStatusProps {
  error?: string;
  transcriptMetadata?: TranscriptMetadata | null;
  usingCache?: boolean;
}

export function TranscriptStatus({ error, transcriptMetadata, usingCache }: TranscriptStatusProps) {
  return (
    <>
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
        <div className="p-3 bg-green-950/20 border border-green-900/30 text-green-400 rounded text-sm mt-4">
          <span>Using cached transcript</span>
        </div>
      )}
    </>
  );
}