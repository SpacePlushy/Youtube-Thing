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
 * Split transcript segments preserving original timestamps using LangChain principles
 */
export async function splitTranscriptWithLangChain(
  transcript: TranscriptSegment[],
  config: SplitterConfig,
  includeTimestamps: boolean = true
): Promise<TranscriptSegment[][]> {
  
  // Instead of converting to text and back, we'll chunk the original segments directly
  // This preserves the original timestamps throughout the process
  
  const chunks: TranscriptSegment[][] = [];
  let currentChunk: TranscriptSegment[] = [];
  let currentChunkSize = 0;
  
  for (let i = 0; i < transcript.length; i++) {
    const segment = transcript[i];
    
    // Estimate size of this segment (timestamp + text)
    const segmentSize = includeTimestamps 
      ? `[${segment.timestamp}] ${segment.text}`.length
      : segment.text.length;
    
    // Check if adding this segment would exceed chunk size
    if (currentChunkSize + segmentSize > config.chunkSize && currentChunk.length > 0) {
      // Find optimal split point using LangChain-inspired boundary detection
      const splitPoint = findOptimalSplitPoint(currentChunk, config.chunkSize);
      
      if (splitPoint > 0 && splitPoint < currentChunk.length) {
        // Split at optimal point
        chunks.push(currentChunk.slice(0, splitPoint));
        
        // Start new chunk with overlap
        const overlapStart = Math.max(0, splitPoint - Math.floor(config.chunkOverlap / 100)); // Overlap in segments
        currentChunk = currentChunk.slice(overlapStart);
        currentChunkSize = calculateChunkSize(currentChunk, includeTimestamps);
      } else {
        // No good split point found, use the full chunk
        chunks.push([...currentChunk]);
        currentChunk = [];
        currentChunkSize = 0;
      }
    }
    
    // Add current segment to chunk
    currentChunk.push(segment);
    currentChunkSize += segmentSize;
  }
  
  // Add final chunk if not empty
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  // Deduplicate overlapping segments by timestamp
  const deduplicatedChunks = chunks.map(chunk => 
    deduplicateByTimestamp(chunk)
  ).filter(chunk => chunk.length > 0);
  
  return deduplicatedChunks;
}

/**
 * Find optimal split point using LangChain-inspired boundary detection
 */
function findOptimalSplitPoint(segments: TranscriptSegment[], targetSize: number): number {
  if (segments.length <= 1) return segments.length;
  
  // Look for natural boundaries in the last 20% of segments
  const searchStart = Math.floor(segments.length * 0.8);
  
  for (let i = segments.length - 1; i >= searchStart; i--) {
    const text = segments[i].text;
    
    // Priority 1: Paragraph-like breaks (sentences ending with periods)
    if (text.match(/[.!?]\s*$/) && i < segments.length - 1) {
      const nextText = segments[i + 1]?.text || '';
      if (nextText.match(/^[A-Z]/)) {
        return i + 1;
      }
    }
    
    // Priority 2: Question or exclamation endings
    if (text.match(/[!?]\s*$/)) {
      return i + 1;
    }
    
    // Priority 3: Sentence endings
    if (text.match(/[.]\s*$/)) {
      return i + 1;
    }
    
    // Priority 4: Clause breaks
    if (text.match(/[,:;]\s*$/)) {
      return i + 1;
    }
  }
  
  // Fallback: split at 80% point
  return Math.floor(segments.length * 0.8);
}

/**
 * Calculate total character size of a chunk
 */
function calculateChunkSize(segments: TranscriptSegment[], includeTimestamps: boolean): number {
  return segments.reduce((total, segment) => {
    const size = includeTimestamps 
      ? `[${segment.timestamp}] ${segment.text}`.length
      : segment.text.length;
    return total + size;
  }, 0);
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