'use client';

import { useState } from 'react';
import { Sparkles, Clock } from 'lucide-react';
import { FORMAT_STYLES, PARAGRAPH_LENGTHS, type FormatStyle, type ParagraphLength } from '@/lib/constants';

interface FormatOptionsProps {
  transcriptLength: number;
  onFormat: (options: any) => void;
  isFormatting: boolean;
}

export function FormatOptions({ transcriptLength, onFormat, isFormatting }: FormatOptionsProps) {
  const [style, setStyle] = useState<FormatStyle>(FORMAT_STYLES.CLEAN);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [paragraphLength, setParagraphLength] = useState<ParagraphLength>(PARAGRAPH_LENGTHS.MEDIUM);
  
  // Processing estimate
  const estimatedMinutes = 1;

  return (
    <div className="p-4 lg:p-6 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">AI Formatting Options</h3>
      </div>

      <div className="space-y-4">
        {/* Style Selection */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Formatting Style
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as any)}
            className="w-full px-4 py-2 bg-input text-foreground border border-border rounded focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            <option value={FORMAT_STYLES.CLEAN}>Clean Transcript</option>
            <option value={FORMAT_STYLES.SUMMARY}>Summary</option>
            <option value={FORMAT_STYLES.CHAPTERS}>Chapters</option>
            <option value={FORMAT_STYLES.BULLETS}>Bullet Points</option>
            <option value={FORMAT_STYLES.TIMESTAMPS}>With Timestamps</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {style === FORMAT_STYLES.CLEAN && 'Remove filler words, fix grammar, organize into paragraphs'}
            {style === FORMAT_STYLES.SUMMARY && 'Concise summary of main points'}
            {style === FORMAT_STYLES.CHAPTERS && 'Organize into logical chapters with headings'}
            {style === FORMAT_STYLES.BULLETS && 'Key points as bullet lists'}
            {style === FORMAT_STYLES.TIMESTAMPS && 'Preserve timing information'}
          </p>
        </div>

        {/* AI Processing Info */}
        <div className="p-4 bg-secondary rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Processing
              </h4>
              <p className="text-sm text-muted-foreground">⚡ Fast processing with advanced AI</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Processing ready</div>
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTimestamps}
              onChange={(e) => setIncludeTimestamps(e.target.checked)}
              className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
            />
            <span className="text-sm">Include timestamps in formatted output</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Paragraph Length
            </label>
            <div className="flex gap-2">
              {(Object.values(PARAGRAPH_LENGTHS) as ParagraphLength[]).map((length) => (
                <button
                  key={length}
                  onClick={() => setParagraphLength(length)}
                  className={`px-3 py-1 text-sm rounded ${
                    paragraphLength === length
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
                  {length.charAt(0).toUpperCase() + length.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Processing Info */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
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