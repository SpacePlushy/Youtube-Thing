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
  const baseInstructions = `CRITICAL: Output ONLY the formatted transcript. Do not include any commentary, explanations, or introductory text like "Here is the formatted output:" or "I've cleaned up the transcript:". Start immediately with the formatted content.

PROCESSING REQUIREMENTS:
- Process ALL content provided to you
- Do not skip or omit any timestamps or segments  
- Maintain chronological order throughout
- Complete processing of the entire input before stopping`;
  
  return includeTimestamps 
    ? `${baseInstructions}\n\nTIMESTAMP FORMAT: Keep timestamps on the same line as text exactly like this:\n[0:01] text content here\n[0:24] more text content\n\nProcess this complete transcript:\n\n`
    : `${baseInstructions}\n\nProcess this complete transcript:\n\n`;
}

// Proprietary prompt builders - core business logic
function buildCleanPrompt(includeTimestamps: boolean): string {
  return `You are a transcript editor. Clean up this transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing grammar and punctuation
- Organizing into clear paragraphs
- Maintaining the speaker's voice and meaning
- Making it easy to read while preserving accuracy
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}

CRITICAL: Output ONLY the cleaned transcript. NO explanations, commentary, or introductory text. Start immediately with the formatted content.`;
}

function buildSummaryPrompt(includeTimestamps: boolean): string {
  return `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}

CRITICAL: Output ONLY the summary. NO explanations, commentary, or introductory text. Start immediately with the summarized content.`;
}

function buildChaptersPrompt(includeTimestamps: boolean): string {
  return `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}

CRITICAL: Output ONLY the organized chapters. NO explanations, commentary, or introductory text. Start immediately with the chapter content.`;
}

function buildBulletsPrompt(includeTimestamps: boolean): string {
  return `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${includeTimestamps ? '- IMPORTANT: Keep timestamps on the same line as text exactly like this:\n[0:01] Text content here\n[0:24] More text content' : ''}

CRITICAL: Output ONLY the bullet points. NO explanations, commentary, or introductory text. Start immediately with the bullet point content.`;
}

function buildTimestampsPrompt(): string {
  return `You are a transcript formatter. Format this transcript EXACTLY like this example:
[0:01] We may look on our time as the moment civilization was transformed...
[0:24] The technology known as a chatbot is only one of the recent breakthroughs...

RULES:
- Each timestamp [HH:MM:SS] or [MM:SS] MUST be on the same line as the text
- Format as: [timestamp] text content
- No extra spacing or formatting
- Maintain chronological order

CRITICAL: Output ONLY the formatted transcript. NO explanations, commentary, or introductory text. Start immediately with the timestamped content.`;
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

// Build intelligent chunk-specific prompts with explicit overlap awareness
export function buildChunkPrompt(
  baseSystem: string,
  chunkIndex: number,
  totalChunks: number,
  overlapInfo?: { 
    overlapSegments: number; 
    newContentStartTimestamp?: string; 
    lastProcessedTimestamp?: string;
  }
): string {
  
  let processingStrategy = '';
  
  if (chunkIndex === 0) {
    processingStrategy = `FIRST CHUNK: Process all content with full formatting and detail.`;
  } else {
    const overlapSize = overlapInfo?.overlapSegments || 0;
    const newStart = overlapInfo?.newContentStartTimestamp;
    const lastProcessed = overlapInfo?.lastProcessedTimestamp;
    
    processingStrategy = `CONTINUATION CHUNK: You are now processing chunk ${chunkIndex + 1} of ${totalChunks}.

OVERLAP AWARENESS:
- This chunk includes ${overlapSize} timestamps from the previous chunk (overlap region)
- Previous chunk ended around: ${lastProcessed || '[previous timestamp]'}  
- NEW content starts around: ${newStart || '[overlap boundary]'}

SMART PROCESSING STRATEGY:
- For timestamps BEFORE ${newStart || '[boundary]'}: These are overlaps from previous chunk
  → Skip or provide minimal processing to avoid duplication
- For timestamps AT/AFTER ${newStart || '[boundary]'}: This is NEW content
  → Process with full detail and formatting

YOUR RESPONSIBILITY: Intelligently avoid duplicating content while ensuring seamless flow.`;
  }
  
  const endingInstructions = chunkIndex === totalChunks - 1
    ? 'FINAL CHUNK: Process through to the very end.'
    : 'Process to the end of your assigned content.';
    
  return `${baseSystem}

INTELLIGENT OVERLAP-AWARE PROCESSING:
${processingStrategy}
${endingInstructions}

CRITICAL OUTPUT REQUIREMENTS:
- EXACTLY this format: [timestamp] text content
- Each [timestamp] MUST be on same line as its text
- Maintain chronological timestamp order
- Start with your first meaningful timestamp
- NO commentary, explanations, or meta-text
- Create smooth, continuous transcript flow

DEDUPLICATION INTELLIGENCE:
- YOU handle overlap detection and avoidance
- Focus processing effort on genuinely NEW content
- Ensure no content gaps or abrupt transitions
- If unsure about overlap, err on the side of light processing rather than full duplication

GOAL: Seamless continuous transcript with zero duplicates and zero gaps.`;
}