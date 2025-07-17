// LangChain-powered text splitter for transcript processing
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface TranscriptSegment {
  text: string;
  timestamp: string;
  duration?: number;
}

export interface SplitterConfig {
  chunkSize: number;
  chunkOverlap: number;
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
 * Parse LangChain chunks back into structured format
 */
function parseChunksToSegments(chunks: string[], includeTimestamps: boolean): TranscriptSegment[][] {
  return chunks.map(chunk => {
    if (includeTimestamps) {
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
    } else {
      // For non-timestamp chunks, create single segment
      return [{
        timestamp: '',
        text: chunk.trim()
      }];
    }
  });
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
 * Split transcript using LangChain's proven RecursiveCharacterTextSplitter
 */
export async function splitTranscriptWithLangChain(
  transcript: TranscriptSegment[],
  config: SplitterConfig,
  includeTimestamps: boolean = true
): Promise<TranscriptSegment[][]> {
  
  // Initialize LangChain's RecursiveCharacterTextSplitter
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    // Use separators optimized for transcript content
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
  const chunks = await textSplitter.splitText(transcriptText);
  
  // Parse chunks back to structured format
  const segmentChunks = parseChunksToSegments(chunks, includeTimestamps);
  
  // Deduplicate each chunk to handle any remaining overlaps
  const deduplicatedChunks = segmentChunks.map(chunk => 
    deduplicateByTimestamp(chunk)
  ).filter(chunk => chunk.length > 0); // Remove empty chunks
  
  return deduplicatedChunks;
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
  // Use chunking for videos longer than ~20 minutes
  return transcriptLength > 600; // 600 segments ≈ 20 minutes
}