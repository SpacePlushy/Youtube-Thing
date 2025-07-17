// LangChain-powered text splitter for transcript processing with AI timestamp continuity
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';

export interface TranscriptSegment {
  text: string;
  timestamp: string;
  duration?: number;
}

export interface SplitterConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export interface ChunkProcessingContext {
  lastTimestamp: string | null;
  previousContent: string | null;
  windowBuffer: string[]; // Rolling window of recent chunks
  windowSize: number; // Maximum chunks to keep in window
}


/**
 * Deduplicate by timestamp to handle any remaining overlaps
 */
function deduplicateByTimestamp(segments: TranscriptSegment[]): TranscriptSegment[] {
  const seenTimestamps = new Set<string>();
  const deduplicated: TranscriptSegment[] = [];
  
  for (const segment of segments) {
    if (!segment.timestamp || !seenTimestamps.has(segment.timestamp)) {
      if (segment.timestamp) {
        seenTimestamps.add(segment.timestamp);
      }
      deduplicated.push(segment);
    }
  }
  
  return deduplicated;
}

/**
 * Convert transcript segments to text format for LangChain processing
 */
function formatTranscriptForSplitting(segments: TranscriptSegment[], includeTimestamps: boolean): string {
  return segments
    .map(segment => {
      if (includeTimestamps) {
        return `[${segment.timestamp}] ${segment.text}`;
      }
      return segment.text;
    })
    .join(' ');
}

/**
 * Split transcript using LangChain as designed, then use AI to fix timestamp continuity
 */
export async function splitTranscriptWithLangChain(
  transcript: TranscriptSegment[],
  config: SplitterConfig,
  includeTimestamps: boolean = true
): Promise<TranscriptSegment[][]> {
  
  // Use LangChain exactly as designed
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    separators: [
      '\n\n',  // Paragraph breaks
      '\n',    // Line breaks
      '. ',    // Sentence endings
      '? ',    // Questions
      '! ',    // Exclamations
      ', ',    // Clause breaks
      ' ',     // Word boundaries
      ''       // Character boundaries (fallback)
    ]
  });
  
  // Convert transcript to text format
  const transcriptText = formatTranscriptForSplitting(transcript, includeTimestamps);
  
  // Split using LangChain
  const textChunks = await textSplitter.splitText(transcriptText);
  
  // Convert back to segments - this is where we'll apply AI intelligence
  const segmentChunks: TranscriptSegment[][] = [];
  
  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    const segments = parseTextChunkToSegments(chunk, includeTimestamps);
    
    if (segments.length > 0) {
      segmentChunks.push(segments);
    }
  }
  
  return segmentChunks;
}

/**
 * Parse text chunk back to segments 
 */
function parseTextChunkToSegments(chunk: string, includeTimestamps: boolean): TranscriptSegment[] {
  if (!includeTimestamps) {
    return [{
      timestamp: '',
      text: chunk.trim()
    }];
  }
  
  // Extract timestamp-text pairs from chunk
  const timestampPattern = /\[([^\]]+)\]\s*([^[]*?)(?=\[|$)/g;
  const segments: TranscriptSegment[] = [];
  let match;
  
  while ((match = timestampPattern.exec(chunk)) !== null) {
    const [, timestamp, text] = match;
    if (text.trim()) {
      segments.push({
        timestamp,
        text: text.trim()
      });
    }
  }
  
  return segments;
}

/**
 * AI-powered timestamp continuity fixer with rolling window for long videos
 */
export async function fixTimestampContinuity(
  formattedChunk: string,
  context: ChunkProcessingContext,
  groqApiKey: string,
  chunkTimeRange?: { start: string; end: string; videoStart: string; videoEnd: string }
): Promise<string> {
  
  // If this is the first chunk, initialize window and return as-is
  if (!context.lastTimestamp || context.windowBuffer.length === 0) {
    console.log('First chunk - initializing rolling window, no timestamp fix needed');
    updateRollingWindow(context, formattedChunk);
    return formattedChunk;
  }
  
  console.log(`AI timestamp continuity: processing chunk with last timestamp ${context.lastTimestamp}`);
  
  // Build context from rolling window (last 2-3 chunks for efficiency)
  const windowContext = context.windowBuffer.slice(-2).join('\n\n');
  const lastLines = getLastContentForContext(windowContext) || '';
  
  // Add time range context if provided
  const timeRangeContext = chunkTimeRange ? 
    `\nVIDEO TIME BOUNDARIES:\n- Full video: ${chunkTimeRange.videoStart} to ${chunkTimeRange.videoEnd}\n- Expected chunk range: ${chunkTimeRange.start} to ${chunkTimeRange.end}\n` : '';
  
  const continuityPrompt = `You are a timestamp continuity expert. Fix timestamp sequence in this transcript chunk using rolling window context.

ROLLING WINDOW CONTEXT (last 2 chunks):
${windowContext}

LAST TIMESTAMP FROM CONTEXT: ${context.lastTimestamp}
LAST CONTENT LINES: "${lastLines}"${timeRangeContext}

CURRENT CHUNK WITH POTENTIALLY BROKEN TIMESTAMPS:
${formattedChunk}

YOUR TASK:
1. Check if timestamps in current chunk continue properly from ${context.lastTimestamp}
2. If timestamps restart incorrectly (like [0:01] instead of continuing), fix ALL timestamps
3. Timestamps should stay within the expected chunk range and video boundaries
4. Maintain exact same content and formatting
5. Only modify timestamps to ensure sequential continuity
6. Consider the rolling context to understand the content flow

CRITICAL: Return ONLY the corrected transcript chunk. No explanations or commentary.`;

  try {
    const result = await streamText({
      model: groq('llama-3.1-8b-instant'),
      system: 'You are a precise timestamp continuity fixer for long video transcripts. Use rolling window context efficiently.',
      prompt: continuityPrompt,
      temperature: 0.05, // Very low temperature for timestamp precision
      maxTokens: 50000, // Match main processing token limit
    });
    
    let correctedChunk = '';
    for await (const textPart of result.textStream) {
      correctedChunk += textPart;
    }
    
    const finalChunk = correctedChunk.trim();
    
    // Update rolling window with the corrected chunk
    updateRollingWindow(context, finalChunk);
    
    return finalChunk;
  } catch (error) {
    console.error('AI timestamp continuity fix failed:', error);
    // Still update window even on error
    updateRollingWindow(context, formattedChunk);
    return formattedChunk; // Fallback to original
  }
}

/**
 * Update rolling window with new chunk, maintaining size limit
 */
export function updateRollingWindow(context: ChunkProcessingContext, newChunk: string): void {
  // Add new chunk to window
  context.windowBuffer.push(newChunk);
  
  // Maintain window size limit
  if (context.windowBuffer.length > context.windowSize) {
    context.windowBuffer.shift(); // Remove oldest chunk
  }
  
  // Update context tracking
  context.lastTimestamp = extractLastTimestamp(newChunk);
  context.previousContent = getLastContentForContext(newChunk);
}

/**
 * Create initial processing context with rolling window
 */
export function createProcessingContext(windowSize: number = 3): ChunkProcessingContext {
  return {
    lastTimestamp: null,
    previousContent: null,
    windowBuffer: [],
    windowSize: Math.max(2, Math.min(windowSize, 5)) // Limit window size between 2-5
  };
}

/**
 * Extract the last timestamp from formatted content
 */
export function extractLastTimestamp(formattedContent: string): string | null {
  const timestampMatches = formattedContent.match(/\[(\d+:\d+)\]/g);
  if (timestampMatches && timestampMatches.length > 0) {
    const lastMatch = timestampMatches[timestampMatches.length - 1];
    return lastMatch.replace(/[\[\]]/g, '');
  }
  return null;
}

/**
 * Get the last few lines of content for context
 */
export function getLastContentForContext(formattedContent: string): string | null {
  const lines = formattedContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return null;
  
  // Return last 1-2 lines for context
  return lines.slice(-2).join('\n');
}

/**
 * Get optimal chunk configuration based on transcript length
 */
export function getOptimalChunkConfig(transcriptLength: number): SplitterConfig {
  // Base character counts (roughly 4 chars per word, 20 words per segment)
  const avgCharsPerSegment = 80;
  const totalChars = transcriptLength * avgCharsPerSegment;
  
  if (totalChars < 20000) { // ~5 min videos
    return { chunkSize: 8000, chunkOverlap: 200 };
  } else if (totalChars < 60000) { // ~15 min videos  
    return { chunkSize: 12000, chunkOverlap: 400 };
  } else if (totalChars < 120000) { // ~30 min videos
    return { chunkSize: 16000, chunkOverlap: 800 };
  } else { // Long videos
    return { chunkSize: 20000, chunkOverlap: 1000 };
  }
}

/**
 * Check if transcript should use chunking or single processing
 */
export function shouldUseChunking(transcriptLength: number): boolean {
  // Use chunking for videos longer than ~10 minutes to ensure robustness
  console.log(`Transcript length: ${transcriptLength} segments, using chunking: ${transcriptLength > 300}`);
  return transcriptLength > 300; // 300 segments ≈ 10 minutes
}