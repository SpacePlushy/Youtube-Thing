import { Copy, Download } from 'lucide-react';
import { analytics } from '@/lib/analytics';

interface FormattedTranscriptDisplayProps {
  formattedTranscript: string;
  isFormatting: boolean;
  parseFormattedTranscript: (text: string) => { timestamp: string; text: string }[];
  onCopy: (text: string, label: string) => Promise<void>;
}

export function FormattedTranscriptDisplay({ 
  formattedTranscript, 
  isFormatting,
  parseFormattedTranscript,
  onCopy 
}: FormattedTranscriptDisplayProps) {
  const handleCopy = async () => {
    await onCopy(formattedTranscript, 'Formatted transcript');
    analytics.trackExport('copy', 'formatted');
  };

  const handleDownload = () => {
    const blob = new Blob([formattedTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted-transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
    analytics.trackExport('download', 'formatted');
  };

  return (
    <div className="mt-4 flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          Formatted Transcript
          {isFormatting && (
            <span className="text-xs text-muted-foreground animate-pulse">
              • Streaming...
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity text-sm"
          >
            <Copy className="w-3 h-3" />
            <span>Copy</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition-opacity border border-border text-sm"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>
        </div>
      </div>
      
      <div className="bg-secondary/50 rounded p-4 flex-1 overflow-y-auto border border-border max-h-[60vh] sm:max-h-[50vh] lg:max-h-none">
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
  );
}