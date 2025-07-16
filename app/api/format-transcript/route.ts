import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface FormatOptions {
  style: 'summary' | 'chapters' | 'clean' | 'bullets' | 'timestamps';
  includeTimestamps: boolean;
  paragraphLength: 'short' | 'medium' | 'long';
  aiProvider: string; // Always 'groq' but keeping for compatibility
}

export async function POST(request: NextRequest) {
  console.log('[Format API] POST request received');
  try {
    const { transcript, options } = await request.json();
    console.log('[Format API] Request parsed - transcript length:', transcript?.length, 'options:', options);
    
    // Always use Groq for ultra-fast parallel processing
    return formatWithGroqStreamText(transcript, options);
    
  } catch (error) {
    console.error('[Format API] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to format transcript' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Build system prompts based on formatting style
function buildSystemPrompt(options: FormatOptions): string {
  const systemPrompts: Record<string, string> = {
    clean: `You are a transcript editor. Clean up this transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing grammar and punctuation
- Organizing into clear paragraphs
- Maintaining the speaker's voice and meaning
- Making it easy to read while preserving accuracy
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\\n[0:01]\\nText content here\\n[0:24]\\nMore text content' : ''}`,
    
    summary: `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\\n[0:01]\\nText content here\\n[0:24]\\nMore text content' : ''}`,
    
    chapters: `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\\n[0:01]\\nText content here\\n[0:24]\\nMore text content' : ''}`,
    
    bullets: `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\\n[0:01]\\nText content here\\n[0:24]\\nMore text content' : ''}`,
    
    timestamps: `You are a transcript formatter. Format this transcript EXACTLY like this example:
[0:01]
We may look on our time as the moment civilization was transformed...

[0:24]
The technology known as a chatbot is only one of the recent breakthroughs...

RULES:
- Each timestamp [HH:MM:SS] or [MM:SS] MUST be on its own line
- Text follows immediately on the next line
- No extra spacing or formatting
- Maintain chronological order`
  };
  
  const paragraphInstructions = {
    short: 'Keep paragraphs brief (2-3 sentences).',
    medium: 'Use standard paragraph length (4-6 sentences).',
    long: 'Create longer, detailed paragraphs (7-10 sentences).'
  };
  
  return `${systemPrompts[options.style]}\\n\\n${paragraphInstructions[options.paragraphLength]}`;
}

// Format transcript text for AI processing
function formatTranscriptForAI(transcript: any[], options: FormatOptions): string {
  return transcript
    .map((segment, index) => {
      if (options.includeTimestamps) {
        const prefix = index === 0 ? '' : '\\n';
        return `${prefix}[${segment.timestamp}] ${segment.text}`;
      }
      return segment.text;
    })
    .join(options.includeTimestamps ? ' ' : ' ')
    .replace(/\\n /g, '\\n');
}

async function formatWithGroqStreamText(transcript: any[], options: FormatOptions) {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.error('[Groq] GROQ_API_KEY not found in environment variables');
    throw new Error('GROQ_API_KEY not configured');
  }
  
  if (!groqApiKey.startsWith('gsk_')) {
    console.error('[Groq] Invalid API key format - should start with gsk_');
    throw new Error('Invalid GROQ_API_KEY format');
  }
  
  console.log('[Groq] Starting format with Llama 3.1 8B Instant model');
  
  const systemPrompt = buildSystemPrompt(options);
  
  // For long transcripts, use parallel processing
  const CHUNK_SIZE = 100; // segments per chunk
  const estimatedTokens = transcript.length * 20; // rough estimate: 20 tokens per segment
  
  if (estimatedTokens > 6000 || transcript.length > CHUNK_SIZE) {
    console.log(`[Groq] Large transcript detected (${transcript.length} segments, ~${estimatedTokens} tokens). Using parallel processing.`);
    return formatWithGroqParallel(transcript, options, systemPrompt);
  }
  
  // For smaller transcripts, use single request
  const formattedTranscript = formatTranscriptForAI(transcript, options);
  const userPrompt = `${options.includeTimestamps ? 'IMPORTANT: Format timestamps exactly as shown in the input - each timestamp on its own line followed by text. Maintain this format:\\n[timestamp]\\ntext content here\\n[timestamp]\\nmore text content\\n\\n' : ''}Format this transcript:\\n\\n${formattedTranscript}`;
  
  console.log(`[Groq] Processing ${transcript.length} segments with single streamText`);
  
  const result = streamText({
    model: groq('llama-3.1-8b-instant'),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.3,
    maxTokens: 8000, // Increased for longer content
  });
  
  return result.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive'
    }
  });
}

// Parallel processing for long Groq transcripts
async function formatWithGroqParallel(transcript: any[], options: FormatOptions, systemPrompt: string) {
  const CHUNK_SIZE = 100; // segments per chunk
  const chunks = [];
  
  // Split transcript into chunks
  for (let i = 0; i < transcript.length; i += CHUNK_SIZE) {
    const chunkSegments = transcript.slice(i, i + CHUNK_SIZE);
    const chunkContent = formatTranscriptForAI(chunkSegments, options);
    
    chunks.push({
      index: i / CHUNK_SIZE,
      content: chunkContent,
      segments: chunkSegments.length
    });
  }
  
  console.log(`[Groq] Processing ${transcript.length} segments in ${chunks.length} parallel chunks`);
  
  // Process chunks in parallel using Promise.all pattern from Context7
  const processChunk = async (chunk: any) => {
    const chunkSystemPrompt = systemPrompt + `\\n\\nIMPORTANT: This is part ${chunk.index + 1} of ${chunks.length} of a transcript. ${
      chunk.index === 0 ? 'Start naturally without introduction.' :
      chunk.index === chunks.length - 1 ? 'End naturally without conclusion.' :
      'Continue the content seamlessly - no introduction or conclusion needed.'
    }`;
    
    const userPrompt = `${options.includeTimestamps ? 'IMPORTANT: Format timestamps exactly as shown in the input - each timestamp on its own line followed by text.\\n\\n' : ''}Format this transcript section:\\n\\n${chunk.content}`;
    
    const result = await streamText({
      model: groq('llama-3.1-8b-instant'),
      system: chunkSystemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      maxTokens: 3000,
    });
    
    // Convert stream to text for parallel processing
    let text = '';
    for await (const textPart of result.textStream) {
      text += textPart;
    }
    
    return {
      index: chunk.index,
      content: text
    };
  };
  
  // Execute all chunks in parallel
  const chunkResults = await Promise.all(chunks.map(processChunk));
  
  // Sort and merge results
  chunkResults.sort((a, b) => a.index - b.index);
  const mergedContent = chunkResults
    .map(result => result.content)
    .join(options.includeTimestamps ? '\\n' : '\\n\\n');
  
  // Return as text stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(mergedContent));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive'
    }
  });
}