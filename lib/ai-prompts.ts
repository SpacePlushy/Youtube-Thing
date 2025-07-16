// AI prompt configuration - proprietary formatting logic
export interface FormatOptions {
  style: 'summary' | 'chapters' | 'clean' | 'bullets' | 'timestamps';
  includeTimestamps: boolean;
  paragraphLength: 'short' | 'medium' | 'long';
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
    ? 'IMPORTANT: Format timestamps exactly as shown in the input - each timestamp on its own line followed by text. Maintain this format:\n[timestamp]\ntext content here\n[timestamp]\nmore text content\n\nFormat this transcript:\n\n'
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
${includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`;
}

function buildSummaryPrompt(includeTimestamps: boolean): string {
  return `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`;
}

function buildChaptersPrompt(includeTimestamps: boolean): string {
  return `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`;
}

function buildBulletsPrompt(includeTimestamps: boolean): string {
  return `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`;
}

function buildTimestampsPrompt(): string {
  return `You are a transcript formatter. Format this transcript EXACTLY like this example:
[0:01]
We may look on our time as the moment civilization was transformed...

[0:24]
The technology known as a chatbot is only one of the recent breakthroughs...

RULES:
- Each timestamp [HH:MM:SS] or [MM:SS] MUST be on its own line
- Text follows immediately on the next line
- No extra spacing or formatting
- Maintain chronological order`;
}

// Chunk configuration for parallel processing
export function getChunkConfig(transcriptLength: number): {
  chunkSize: number;
  useParallel: boolean;
} {
  const CHUNK_SIZE = 100;
  const estimatedTokens = transcriptLength * 20;
  
  return {
    chunkSize: CHUNK_SIZE,
    useParallel: estimatedTokens > 6000 || transcriptLength > CHUNK_SIZE
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