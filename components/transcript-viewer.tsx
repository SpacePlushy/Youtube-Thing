'use client';

import { Copy, Download } from 'lucide-react';

interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
  timestamp: string;
}

interface TranscriptViewerProps {
  transcript: TranscriptItem[];
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const fullText = transcript.map(item => item.text).join(' ');
  // Format with timestamps on new lines but text flowing continuously
  const fullTextWithTimestamps = transcript
    .map((item, index) => {
      // Start new line for each timestamp
      const prefix = index === 0 ? '' : '\n';
      return `${prefix}[${item.timestamp}] ${item.text}`;
    })
    .join(' ')
    .replace(/\n /g, '\n'); // Remove space after newlines
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullTextWithTimestamps);
      alert('Copied to clipboard!');
    } catch (err) {
      alert('Failed to copy');
    }
  };
  
  const downloadTranscript = () => {
    // Use the same formatting as copy - timestamps on new lines, text flows
    const blob = new Blob([fullTextWithTimestamps], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="mt-8 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transcript</h2>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={downloadTranscript}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:opacity-90 transition-opacity border border-border"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
      
      <div className="bg-card rounded p-6 max-h-96 overflow-y-auto border border-border">
        <div className="space-y-2">
          {transcript.map((item, index) => (
            <div key={index} className="flex gap-3">
              <span className="text-sm text-muted-foreground min-w-[80px] font-mono">
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