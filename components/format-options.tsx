'use client';

import { useState } from 'react';
import { Sparkles, Clock } from 'lucide-react';

// Client-safe constants (no business logic exposed)
const FORMAT_OPTIONS = {
  CLEAN: 'clean',
  SUMMARY: 'summary', 
  CHAPTERS: 'chapters',
  BULLETS: 'bullets',
  TIMESTAMPS: 'timestamps',
} as const;

const PARAGRAPH_OPTIONS = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
} as const;

type FormatStyle = typeof FORMAT_OPTIONS[keyof typeof FORMAT_OPTIONS];
type ParagraphLength = typeof PARAGRAPH_OPTIONS[keyof typeof PARAGRAPH_OPTIONS];

interface FormatOptionsProps {
  transcriptLength: number;
  onFormat: (options: any) => void;
  isFormatting: boolean;
}

export function FormatOptions({ transcriptLength, onFormat, isFormatting }: FormatOptionsProps) {
  const [style, setStyle] = useState<FormatStyle>(FORMAT_OPTIONS.CLEAN);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [paragraphLength, setParagraphLength] = useState<ParagraphLength>(PARAGRAPH_OPTIONS.MEDIUM);
  
  // Processing estimate
  const estimatedMinutes = 1;

  return (
    <div>
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
            <option value={FORMAT_OPTIONS.CLEAN}>Clean Transcript</option>
            <option value={FORMAT_OPTIONS.SUMMARY}>Summary</option>
            <option value={FORMAT_OPTIONS.CHAPTERS}>Chapters</option>
            <option value={FORMAT_OPTIONS.BULLETS}>Bullet Points</option>
            <option value={FORMAT_OPTIONS.TIMESTAMPS}>With Timestamps</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {style === FORMAT_OPTIONS.CLEAN && 'Remove filler words, fix grammar, organize into paragraphs'}
            {style === FORMAT_OPTIONS.SUMMARY && 'Concise summary of main points'}
            {style === FORMAT_OPTIONS.CHAPTERS && 'Organize into logical chapters with headings'}
            {style === FORMAT_OPTIONS.BULLETS && 'Key points as bullet lists'}
            {style === FORMAT_OPTIONS.TIMESTAMPS && 'Preserve timing information'}
          </p>
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
              {(Object.values(PARAGRAPH_OPTIONS) as ParagraphLength[]).map((length) => (
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