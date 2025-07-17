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
      <div className="flex items-center gap-2 mb-3 lg:mb-4">
        <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
        <h3 className="text-base lg:text-lg font-semibold">AI Formatting</h3>
      </div>

      <div className="space-y-3 lg:space-y-4">
        {/* Info about what will happen */}
        <div className="p-2 lg:p-3 bg-secondary/50 rounded-lg">
          <p className="text-xs lg:text-sm text-foreground mb-1 lg:mb-2">
            Your transcript will be cleaned and formatted with:
          </p>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs lg:text-sm text-muted-foreground">
            <li>• Timestamps preserved</li>
            <li>• Filler words removed</li>
            <li>• Grammar corrections</li>
            <li>• Readable paragraphs</li>
          </ul>
        </div>

        {/* Processing Info */}
        <div className="flex items-center justify-between pt-2 lg:pt-4">
          <div className="flex items-center gap-2 lg:gap-4 text-xs lg:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
              <span>~{estimatedMinutes} min</span>
            </div>
          </div>

          <button
            onClick={() => {
              onFormat({ style, includeTimestamps, paragraphLength });
            }}
            disabled={isFormatting}
            className="px-4 py-2 lg:px-6 lg:py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
          >
            {isFormatting ? 'Formatting...' : 'Format with AI'}
          </button>
        </div>

        {/* Warning for long transcripts */}
        {transcriptLength > 5000 && (
          <div className="p-2 lg:p-3 bg-yellow-950/20 border border-yellow-900/30 text-yellow-400 rounded text-xs lg:text-sm">
            Long transcript detected. This will be processed in chunks for best results.
          </div>
        )}
      </div>
    </div>
  );
}