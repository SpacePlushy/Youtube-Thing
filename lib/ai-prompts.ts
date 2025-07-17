// AI prompt configuration - proprietary formatting logic
import { FormatStyle, ParagraphLength, AI_PROCESSING } from './constants';

export interface FormatOptions {
  style: FormatStyle;
  includeTimestamps: boolean;
  paragraphLength: ParagraphLength;
}

// Internal prompt builder - not exposed to client
export function buildPrompt(options: FormatOptions): { system: string; user: string } {
  const styleConfig = getStyleConfig(options.style, options.includeTimestamps);
  const lengthConfig = getLengthConfig(options.paragraphLength);
  
  return {
    system: `${styleConfig}\n\n${lengthConfig}`,
    user: buildUserPrompt(options.includeTimestamps)
  };
}

// Private configuration functions
function getStyleConfig(style: string, includeTimestamps: boolean): string {
  const configs: Record<string, string> = {
    clean: buildCleanPrompt(includeTimestamps),
    summary: buildSummaryPrompt(includeTimestamps),
    chapters: buildChaptersPrompt(includeTimestamps),
    bullets: buildBulletsPrompt(includeTimestamps),
    timestamps: buildTimestampsPrompt()
  };
  
  return configs[style] || configs.clean;
}

function getLengthConfig(length: string): string {
  const configs: Record<string, string> = {
    short: 'Keep paragraphs brief (2-3 sentences).',
    medium: 'Use standard paragraph length (4-6 sentences).',
    long: 'Create longer, detailed paragraphs (7-10 sentences).'
  };
  
  return configs[length] || configs.medium;
}

function buildUserPrompt(includeTimestamps: boolean): string {
  return includeTimestamps 
    ? 'IMPORTANT: Format timestamps exactly as shown in the input - keep timestamps on the same line as the text. Maintain this format:\n[0:01] text content here\n[0:24] more text content\n\nFormat this transcript:\n\n'
    : 'Format this transcript:\n\n';
}

// Proprietary prompt builders - core business logic
function buildCleanPrompt(includeTimestamps: boolean): string {
  return `You are a transcript editor. Clean up this transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing grammar and punctuation
- Organizing into clear paragraphs
- Maintaining the speaker's voice and meaning
- Making it easy to read while preserving accuracy
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}`;
}

function buildSummaryPrompt(includeTimestamps: boolean): string {
  return `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}`;
}

function buildChaptersPrompt(includeTimestamps: boolean): string {
  return `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}`;
}

function buildBulletsPrompt(includeTimestamps: boolean): string {
  return `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}`;
}

function buildTimestampsPrompt(): string {
  return `You are a transcript formatter. Format this transcript EXACTLY like this example:
[0:01] We may look on our time as the moment civilization was transformed...
[0:24] The technology known as a chatbot is only one of the recent breakthroughs...

RULES:
- Each timestamp [HH:MM:SS] or [MM:SS] MUST be on the same line as the text
- Format as: [timestamp] text content
- No extra spacing or formatting
- Maintain chronological order`;
}

// Dynamic chunk configuration based on transcript length
export function getChunkConfig(transcriptLength: number): {
  chunkSize: number;
  useParallel: boolean;
} {
  // Determine appropriate chunk size based on video length
  let chunkSize: number;
  
  if (transcriptLength < 450) { // ~30 min
    chunkSize = AI_PROCESSING.CHUNK_SIZES.SMALL;
  } else if (transcriptLength < 900) { // ~1 hour
    chunkSize = AI_PROCESSING.CHUNK_SIZES.MEDIUM;
  } else if (transcriptLength < 1800) { // ~2 hours
    chunkSize = AI_PROCESSING.CHUNK_SIZES.LARGE;
  } else { // > 2 hours
    chunkSize = AI_PROCESSING.CHUNK_SIZES.XLARGE;
  }
  
  // Use sequential processing for videos longer than ~5-6 minutes
  const useSequential = transcriptLength > AI_PROCESSING.SEQUENTIAL_PROCESSING_THRESHOLD;
  
  return {
    chunkSize,
    useParallel: useSequential // Note: This is now actually sequential processing
  };
}

// Build chunk-specific prompts for parallel processing
export function buildChunkPrompt(
  baseSystem: string,
  chunkIndex: number,
  totalChunks: number
): string {
  const position = 
    chunkIndex === 0 ? 'Start naturally without introduction.' :
    chunkIndex === totalChunks - 1 ? 'End naturally without conclusion.' :
    'Continue the content seamlessly - no introduction or conclusion needed.';
    
  return `${baseSystem}\n\nIMPORTANT: This is part ${chunkIndex + 1} of ${totalChunks} of a transcript. ${position}`;
}