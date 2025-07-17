'use client';

import { Sparkles, Clock } from 'lucide-react';

interface FormatOptionsProps {
  transcriptLength: number;
  onFormat: (options: any) => void;
  isFormatting: boolean;
}

export function FormatOptions({ transcriptLength, onFormat, isFormatting }: FormatOptionsProps) {
  // Hardcoded settings
  const style = 'clean';
  const includeTimestamps = true;
  const paragraphLength = 'medium';
  
  // Processing estimate
  const estimatedMinutes = 1;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">AI Formatting</h3>
      </div>

      <div className="space-y-4">
        {/* Info about what will happen */}
        <div className="p-3 bg-secondary/50 rounded-lg">
          <p className="text-sm text-foreground">
            Your transcript will be cleaned and formatted with:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Timestamps preserved throughout</li>
            <li>• Filler words removed</li>
            <li>• Grammar corrections</li>
            <li>• Organized into readable paragraphs</li>
          </ul>
        </div>

        {/* Processing Info */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>~{estimatedMinutes} min</span>
            </div>
          </div>

          <button
            onClick={() => {
              onFormat({ style, includeTimestamps, paragraphLength });
            }}
            disabled={isFormatting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFormatting ? 'Formatting...' : 'Format with AI'}
          </button>
        </div>

        {/* Warning for long transcripts */}
        {transcriptLength > 5000 && (
          <div className="p-3 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 rounded text-sm">
            Long transcript detected. This will be processed in chunks for best results.
          </div>
        )}
      </div>
    </div>
  );
}