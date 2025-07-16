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
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [paragraphLength, setParagraphLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [aiProvider, setAiProvider] = useState<'groq' | 'claude' | 'openai' | 'gemini'>('groq'); // Default to Groq for speed!
  
  // Estimate processing time based on transcript length and provider
  // Groq: 10 lines per chunk, 30 chunks per minute = 300 lines/minute
  // Assuming ~10 words per line = 3000 words/minute
  const estimatedMinutes = aiProvider === 'groq' 
    ? Math.max(1, Math.ceil(transcriptLength / 3000)) // Groq processes ~3000 words/min at rate limit
    : Math.ceil(transcriptLength / 1000);
  
  // Cost estimates per provider (rough)
  const costEstimates: Record<string, string> = {
    groq: 'Free! 🚀', // Groq has generous free tier
    claude: 'Coming soon',
    openai: 'Coming soon',
    gemini: `~$${(transcriptLength * 0.00002).toFixed(2)}`, // Very cheap!
  };
  
  // Speed estimates
  const speedInfo: Record<string, string> = {
    groq: '⚡ 30 chunks/min with Llama 3.1 8B Instant',
    claude: 'Fast',
    openai: 'Fast',
    gemini: 'Good speed (470 tokens/sec)',
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

        {/* AI Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            AI Provider
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setAiProvider('groq')}
              className={`p-3 rounded-lg border text-left transition-all ${
                aiProvider === 'groq' 
                  ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-medium">Groq ⚡</div>
              <div className="text-xs text-muted-foreground">Ultra-fast & Free</div>
            </button>
            <button
              onClick={() => setAiProvider('gemini')}
              className={`p-3 rounded-lg border text-left transition-all ${
                aiProvider === 'gemini' 
                  ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-medium">Gemini</div>
              <div className="text-xs text-muted-foreground">Reliable & Cheap</div>
            </button>
            <button
              disabled
              className="p-3 rounded-lg border border-border opacity-50 cursor-not-allowed text-left"
            >
              <div className="font-medium">Claude</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </button>
            <button
              disabled
              className="p-3 rounded-lg border border-border opacity-50 cursor-not-allowed text-left"
            >
              <div className="font-medium">OpenAI</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </button>
          </div>
          
          {/* Provider Info */}
          <div className="p-4 bg-secondary rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">
                  {aiProvider === 'groq' ? 'Powered by Groq LPU™' : 'Powered by Google Gemini'}
                </h4>
                <p className="text-sm text-muted-foreground">{speedInfo[aiProvider]}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-primary">{costEstimates[aiProvider]}</div>
                <div className="text-xs text-muted-foreground">estimated cost</div>
              </div>
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