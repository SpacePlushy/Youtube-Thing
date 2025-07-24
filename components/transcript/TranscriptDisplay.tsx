import { Copy, Download } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import type { TranscriptSegment } from '@/lib/types';

interface TranscriptDisplayProps {
  transcript: TranscriptSegment[];
  onCopy: (text: string, label: string) => Promise<void>;
}

export function TranscriptDisplay({ transcript, onCopy }: TranscriptDisplayProps) {
  const handleCopy = async () => {
    const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
    await onCopy(fullText, 'Transcript');
    analytics.trackExport('copy', 'raw');
  };

  const handleDownload = () => {
    const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
    analytics.trackExport('download', 'raw');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Transcript</h3>
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
  );
}