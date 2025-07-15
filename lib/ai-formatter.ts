interface FormattingOptions {
  style: 'summary' | 'chapters' | 'clean' | 'bullets' | 'timestamps';
  includeTimestamps: boolean;
  paragraphLength: 'short' | 'medium' | 'long';
  aiProvider: 'groq' | 'claude' | 'openai' | 'gemini';
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
  timestamp: string;
}

interface FormattedChunk {
  chunkIndex: number;
  totalChunks: number;
  formattedText: string;
  startTime: number;
  endTime: number;
}

export class TranscriptFormatter {
  private readonly CHUNK_SIZE = 2000; // segments per chunk
  private readonly OVERLAP_SIZE = 50; // segments overlap for context
  
  constructor(private apiKeys: {
    groq?: string;
    anthropic?: string;
    openai?: string;
    gemini?: string;
  }) {}

  /**
   * Splits long transcript into manageable chunks with overlap
   */
  private splitIntoChunks(transcript: TranscriptSegment[]): TranscriptSegment[][] {
    const chunks: TranscriptSegment[][] = [];
    
    for (let i = 0; i < transcript.length; i += this.CHUNK_SIZE - this.OVERLAP_SIZE) {
      const chunk = transcript.slice(i, i + this.CHUNK_SIZE);
      chunks.push(chunk);
      
      // If this is the last chunk and it's too small, merge with previous
      if (chunk.length < 100 && chunks.length > 1) {
        const lastChunk = chunks.pop()!;
        chunks[chunks.length - 1].push(...lastChunk);
      }
    }
    
    return chunks;
  }

  /**
   * Estimates token count for pricing calculation
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculates estimated cost based on provider
   */
  calculateEstimatedCost(transcript: TranscriptSegment[], provider: string): {
    estimatedCost: number;
    tokenCount: number;
  } {
    const fullText = transcript.map(s => s.text).join(' ');
    const tokenCount = this.estimateTokens(fullText);
    
    // Pricing per million tokens (input + output estimate)
    const pricing: Record<string, number> = {
      groq: 0, // Currently free
      claude: 1.50, // Haiku pricing
      openai: 2.00, // GPT-3.5 Turbo
      gemini: 0.50, // Gemini Flash
    };
    
    const estimatedCost = (tokenCount / 1_000_000) * (pricing[provider] || 2.00) * 1.5; // 1.5x for output
    
    return { estimatedCost, tokenCount };
  }

  /**
   * Formats a single chunk using the specified AI provider
   */
  private async formatChunk(
    chunk: TranscriptSegment[],
    options: FormattingOptions,
    chunkIndex: number,
    totalChunks: number
  ): Promise<FormattedChunk> {
    const chunkText = chunk.map(s => 
      options.includeTimestamps ? `[${s.timestamp}] ${s.text}` : s.text
    ).join('\n');

    const prompt = this.buildPrompt(options, chunkIndex, totalChunks);
    
    let formattedText = '';
    
    switch (options.aiProvider) {
      case 'groq':
        formattedText = await this.callGroqAPI(chunkText, prompt);
        break;
      case 'claude':
        formattedText = await this.callClaudeAPI(chunkText, prompt);
        break;
      case 'openai':
        formattedText = await this.callOpenAIAPI(chunkText, prompt);
        break;
      case 'gemini':
        formattedText = await this.callGeminiAPI(chunkText, prompt);
        break;
    }
    
    return {
      chunkIndex,
      totalChunks,
      formattedText,
      startTime: chunk[0].start,
      endTime: chunk[chunk.length - 1].start + chunk[chunk.length - 1].duration
    };
  }

  /**
   * Builds the formatting prompt based on style
   */
  private buildPrompt(options: FormattingOptions, chunkIndex: number, totalChunks: number): string {
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === totalChunks - 1;
    
    const basePrompt = `Format this transcript segment professionally. This is part ${chunkIndex + 1} of ${totalChunks}.`;
    
    const stylePrompts: Record<string, string> = {
      summary: `Create a concise summary of the main points discussed. ${isFirstChunk ? 'Include an introduction.' : ''} ${isLastChunk ? 'Include a conclusion.' : ''}`,
      chapters: `Organize into clear chapters with descriptive headings. Maintain continuity from previous sections.`,
      clean: `Clean up the transcript for readability: fix grammar, remove filler words, organize into paragraphs.`,
      bullets: `Convert to bullet points highlighting key information and insights.`,
      timestamps: `Preserve timestamps and organize content chronologically with clear breaks.`
    };
    
    return `${basePrompt}\n\n${stylePrompts[options.style]}\n\nParagraph length preference: ${options.paragraphLength}`;
  }

  /**
   * Main formatting function with progress callback
   */
  async formatTranscript(
    transcript: TranscriptSegment[],
    options: FormattingOptions,
    onProgress?: (progress: number, status: string) => void
  ): Promise<string> {
    // For very long transcripts, use chunk processing
    if (transcript.length > this.CHUNK_SIZE) {
      const chunks = this.splitIntoChunks(transcript);
      const formattedChunks: FormattedChunk[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        onProgress?.(
          (i / chunks.length) * 100,
          `Processing chunk ${i + 1} of ${chunks.length}...`
        );
        
        const formatted = await this.formatChunk(chunks[i], options, i, chunks.length);
        formattedChunks.push(formatted);
        
        // Rate limiting delay
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      onProgress?.(90, 'Combining chunks...');
      
      // Combine chunks intelligently
      return this.combineFormattedChunks(formattedChunks, options);
    } else {
      // For shorter transcripts, process in one go
      onProgress?.(50, 'Formatting transcript...');
      const formatted = await this.formatChunk(transcript, options, 0, 1);
      onProgress?.(100, 'Complete!');
      return formatted.formattedText;
    }
  }

  /**
   * Intelligently combines formatted chunks
   */
  private combineFormattedChunks(chunks: FormattedChunk[], options: FormattingOptions): string {
    if (options.style === 'chapters') {
      // For chapters, just concatenate with spacing
      return chunks.map(c => c.formattedText).join('\n\n---\n\n');
    }
    
    // For other styles, may need to merge overlapping content
    const combined = chunks.map((chunk, index) => {
      if (index === 0) return chunk.formattedText;
      
      // Remove potential duplicate content from overlap
      const lines = chunk.formattedText.split('\n');
      const previousLines = chunks[index - 1].formattedText.split('\n');
      
      // Simple deduplication - can be made more sophisticated
      let startIndex = 0;
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (!previousLines.includes(lines[i])) {
          startIndex = i;
          break;
        }
      }
      
      return lines.slice(startIndex).join('\n');
    }).join('\n\n');
    
    return combined;
  }

  // API implementation stubs - to be implemented with actual API calls
  private async callGroqAPI(text: string, prompt: string): Promise<string> {
    // Implementation for Groq API
    throw new Error('Groq API not implemented yet');
  }

  private async callClaudeAPI(text: string, prompt: string): Promise<string> {
    // Implementation for Claude API
    throw new Error('Claude API not implemented yet');
  }

  private async callOpenAIAPI(text: string, prompt: string): Promise<string> {
    // Implementation for OpenAI API
    throw new Error('OpenAI API not implemented yet');
  }

  private async callGeminiAPI(text: string, prompt: string): Promise<string> {
    // Implementation for Gemini API
    throw new Error('Gemini API not implemented yet');
  }
}