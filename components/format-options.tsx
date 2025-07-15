'use client';

import { useState } from 'react';
import { Sparkles, DollarSign, Clock } from 'lucide-react';

interface FormatOptionsProps {
  transcriptLength: number;
  onFormat: (options: any) => void;
  isFormatting: boolean;
}

export function FormatOptions({ transcriptLength, onFormat, isFormatting }: FormatOptionsProps) {
  const [style, setStyle] = useState<'summary' | 'chapters' | 'clean' | 'bullets' | 'timestamps'>('clean');
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [paragraphLength, setParagraphLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [aiProvider, setAiProvider] = useState<'groq' | 'claude' | 'openai' | 'gemini'>('gemini');
  
  // Estimate processing time based on transcript length
  const estimatedMinutes = Math.ceil(transcriptLength / 1000);
  
  // Cost estimates per provider (rough)
  const costEstimates: Record<string, string> = {
    groq: 'Free (coming soon)',
    claude: 'Coming soon',
    openai: 'Coming soon',
    gemini: `~$${(transcriptLength * 0.00002).toFixed(2)}`, // Very cheap!
  };

  return (
    <div className="mt-6 p-6 bg-card rounded-lg border border-border">
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
            <option value="clean">Clean Transcript</option>
            <option value="summary">Summary</option>
            <option value="chapters">Chapters</option>
            <option value="bullets">Bullet Points</option>
            <option value="timestamps">With Timestamps</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {style === 'clean' && 'Remove filler words, fix grammar, organize into paragraphs'}
            {style === 'summary' && 'Concise summary of main points'}
            {style === 'chapters' && 'Organize into logical chapters with headings'}
            {style === 'bullets' && 'Key points as bullet lists'}
            {style === 'timestamps' && 'Preserve timing information'}
          </p>
        </div>

        {/* AI Provider Info */}
        <div className="p-4 bg-secondary rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Powered by Google Gemini</h4>
              <p className="text-sm text-muted-foreground">Fast, accurate, and incredibly affordable</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-primary">{costEstimates.gemini}</div>
              <div className="text-xs text-muted-foreground">estimated cost</div>
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
              {(['short', 'medium', 'long'] as const).map((length) => (
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
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>{costEstimates[aiProvider]}</span>
            </div>
          </div>

          <button
            onClick={() => onFormat({ style, includeTimestamps, paragraphLength, aiProvider })}
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