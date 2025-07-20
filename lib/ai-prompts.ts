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
  const lengthConfig = getLengthConfig(options.paragraphLength, options.includeTimestamps);
  
  return {
    system: `${styleConfig}\n\n${lengthConfig}`,
    user: buildUserPrompt(options.includeTimestamps, options.style)
  };
}

// Private configuration functions
function getStyleConfig(style: string, includeTimestamps: boolean): string {
  const configs: Record<string, string> = {
    clean: buildCleanPrompt(includeTimestamps),
    summary: buildSummaryPrompt(includeTimestamps),
    chapters: buildChaptersPrompt(includeTimestamps),
    bullets: buildBulletsPrompt(includeTimestamps),
    timestamps: buildTimestampsPrompt() // Always line-by-line for timestamps style
  };
  
  return configs[style] || configs.clean;
}

function getLengthConfig(length: string, includeTimestamps: boolean): string {
  const configs: Record<string, string> = {
    short: includeTimestamps 
      ? 'Keep paragraphs brief (2-3 sentences). Place timestamps at the start of each paragraph: [0:01] Paragraph content here...'
      : 'Keep paragraphs brief (2-3 sentences).',
    medium: includeTimestamps 
      ? 'Use standard paragraph length (4-6 sentences). Place timestamps at the start of each paragraph: [0:01] Paragraph content here...'
      : 'Use standard paragraph length (4-6 sentences).',
    long: includeTimestamps 
      ? 'Create longer, detailed paragraphs (7-10 sentences). Place timestamps at the start of each paragraph: [0:01] Paragraph content here...'
      : 'Create longer, detailed paragraphs (7-10 sentences).'
  };
  
  return configs[length] || configs.medium;
}

function buildUserPrompt(includeTimestamps: boolean, style: string): string {
  const baseInstructions = `CRITICAL: Output ONLY the formatted transcript. Do not include any commentary, explanations, or introductory text like "Here is the formatted output:" or "I've cleaned up the transcript:". Start immediately with the formatted content.

PROCESSING REQUIREMENTS:
- Process ALL content provided to you
- Do not skip or omit any timestamps or segments  
- Maintain chronological order throughout
- Complete processing of the entire input before stopping`;
  
  if (!includeTimestamps) {
    return `${baseInstructions}\n\nProcess this complete transcript:\n\n`;
  }
  
  // Only the "timestamps" style uses line-by-line format
  const timestampFormat = style === 'timestamps' 
    ? `\n\nTIMESTAMP FORMAT: Keep timestamps on the same line as text exactly like this:\n[0:01] text content here\n[0:24] more text content`
    : `\n\nTIMESTAMP FORMAT: Place timestamps at the START of paragraphs only. Let content flow naturally into proper paragraphs based on the selected length.`;
    
  return `${baseInstructions}${timestampFormat}\n\nProcess this complete transcript:\n\n`;
}

// Proprietary prompt builders - core business logic
function buildCleanPrompt(includeTimestamps: boolean): string {
  const timestampFormat = includeTimestamps 
    ? '- IMPORTANT: Place timestamps at the START of each paragraph only: [0:01] Paragraph content flows naturally here with multiple sentences forming a cohesive paragraph based on the selected length.'
    : '';
    
  return `You are a transcript editor. Clean up this transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing grammar and punctuation
- Organizing into clear paragraphs based on the selected paragraph length
- Maintaining the speaker's voice and meaning
- Making it easy to read while preserving accuracy
${timestampFormat}

CRITICAL: Output ONLY the cleaned transcript. NO explanations, commentary, or introductory text. Start immediately with the formatted content.`;
}

function buildSummaryPrompt(includeTimestamps: boolean): string {
  const timestampFormat = includeTimestamps 
    ? '- IMPORTANT: Place timestamps at the START of each paragraph only: [0:01] Paragraph content flows naturally here with multiple sentences forming a cohesive paragraph.'
    : '';
    
  return `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically into paragraphs
- Uses clear, professional language
- Maintains accuracy to the original content
${timestampFormat}

CRITICAL: Output ONLY the summary. NO explanations, commentary, or introductory text. Start immediately with the summarized content.`;
}

function buildChaptersPrompt(includeTimestamps: boolean): string {
  const timestampFormat = includeTimestamps 
    ? '- IMPORTANT: Place timestamps at the START of each paragraph only: [0:01] Paragraph content flows naturally here with multiple sentences forming a cohesive paragraph.'
    : '';
    
  return `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter into proper paragraphs
- Adding brief introductions to each section
${timestampFormat}

CRITICAL: Output ONLY the organized chapters. NO explanations, commentary, or introductory text. Start immediately with the chapter content.`;
}

function buildBulletsPrompt(includeTimestamps: boolean): string {
  const timestampFormat = includeTimestamps 
    ? '- IMPORTANT: Place timestamps at the START of each bullet point: [0:01] • Bullet content flows naturally here with complete thoughts.'
    : '';
    
  return `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${timestampFormat}

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
- Place timestamps at the START of paragraphs only, not every line
- Let content flow naturally into proper paragraphs based on selected length
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

// Simplified chunk prompts that focus only on formatting - no deduplication logic
export function buildSimpleChunkPrompt(
  baseSystem: string,
  chunkIndex: number,
  totalChunks: number
): string {
  
  let chunkContext = '';
  
  if (chunkIndex === 0) {
    chunkContext = `FIRST CHUNK: Process all content with full formatting and detail.`;
  } else if (chunkIndex === totalChunks - 1) {
    chunkContext = `FINAL CHUNK: Process through to the very end of the content.`;
  } else {
    chunkContext = `MIDDLE CHUNK: Continue processing from where previous chunk left off.`;
  }
    
  return `${baseSystem}

CHUNK CONTEXT:
${chunkContext}

CRITICAL OUTPUT REQUIREMENTS:
- Process ALL content provided to you completely
- Do not skip any timestamps or segments
- Place timestamps at the START of paragraphs only, not every line
- Let content flow naturally into proper paragraphs based on selected length
- Maintain chronological timestamp order
- NO commentary, explanations, or meta-text
- Start immediately with formatted content

IMPORTANT: Your job is ONLY formatting - overlap removal will be handled separately. Process everything given to you.`;
}

// Context-aware chunk prompts for AI-managed overlap and continuity
export function buildContextAwareChunkPrompt(
  baseSystem: string,
  chunkIndex: number,
  totalChunks: number,
  contextInfo: string
): string {
  
  let chunkInstructions = '';
  
  if (chunkIndex === 0) {
    chunkInstructions = `FIRST CHUNK: Start the transcript with full formatting and detail.`;
  } else if (chunkIndex === totalChunks - 1) {
    chunkInstructions = `FINAL CHUNK: Complete the transcript, ensuring smooth continuation from previous content.`;
  } else {
    chunkInstructions = `MIDDLE CHUNK: Continue the transcript smoothly from the previous chunk.`;
  }
    
  return `${baseSystem}

CONTEXT INFORMATION:
${contextInfo}

CHUNK INSTRUCTIONS:
${chunkInstructions}

FORMATTING REQUIREMENTS:
- Process ALL content provided to you completely
- Ensure seamless continuation from any previous content
- Place timestamps at the START of paragraphs only, not every line
- Let content flow naturally into proper paragraphs based on selected length
- Maintain chronological timestamp order
- NO commentary, explanations, or meta-text
- Start immediately with formatted content
- If continuing from previous content, ensure smooth flow

CONTINUITY FOCUS: Your primary goal is creating a seamless, continuous transcript that flows naturally from chunk to chunk.`;
}