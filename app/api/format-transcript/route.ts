import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { transcript, options } = await request.json();
    
    // Initialize the appropriate AI client based on provider
    let formattedText = '';
    
    // For now, we'll use Gemini for all formatting
    formattedText = await formatWithGemini(transcript, options);
    
    return NextResponse.json({ formattedText, success: true });
    
  } catch (error) {
    console.error('[Format API] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to format transcript' 
    }, { status: 500 });
  }
}

interface FormatOptions {
  style: 'summary' | 'chapters' | 'clean' | 'bullets' | 'timestamps';
  includeTimestamps: boolean;
  paragraphLength: 'short' | 'medium' | 'long';
  aiProvider: string;
}

async function formatWithGemini(transcript: any[], options: FormatOptions): Promise<string> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest", // Fast and cheap, with 1M token context
  });
  
  // Prepare the transcript text
  const transcriptText = transcript.map(segment => 
    options.includeTimestamps 
      ? `[${segment.timestamp}] ${segment.text}`
      : segment.text
  ).join('\n');
  
  // Build the system prompt based on formatting style
  const systemPrompts: Record<string, string> = {
    clean: `You are a transcript editor. Clean up this transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing grammar and punctuation
- Organizing into clear paragraphs
- Maintaining the speaker's voice and meaning
- Making it easy to read while preserving accuracy`,
    
    summary: `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content`,
    
    chapters: `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section`,
    
    bullets: `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow`,
    
    timestamps: `You are a transcript formatter. Format this transcript while:
- Preserving all timestamp information
- Organizing content chronologically
- Creating clear paragraph breaks
- Maintaining readability`
  };
  
  const paragraphInstructions = {
    short: 'Keep paragraphs brief (2-3 sentences).',
    medium: 'Use standard paragraph length (4-6 sentences).',
    long: 'Create longer, detailed paragraphs (7-10 sentences).'
  };
  
  const systemPrompt = `${systemPrompts[options.style]}\n\n${paragraphInstructions[options.paragraphLength]}`;
  
  // Gemini has a 1M token context, so we can handle much larger chunks
  const MAX_CHARS = 800000; // Conservative limit for 1M tokens
  
  // Check if we need to chunk at all
  if (transcriptText.length <= MAX_CHARS) {
    // Process entire transcript at once - Gemini can handle it!
    const prompt = `${systemPrompt}\n\nPlease format the following transcript:\n\n${transcriptText}`;
    
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('[Gemini] Generation error:', error);
      throw new Error('Failed to format transcript with Gemini');
    }
  }
  
  // For extremely long transcripts (3+ hours), we still chunk
  const chunks = chunkTranscript(transcriptText, MAX_CHARS);
  let formattedChunks: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const isFirst = i === 0;
    const isLast = i === chunks.length - 1;
    
    const chunkContext = chunks.length > 1
      ? `\n\nIMPORTANT: This is part ${i + 1} of ${chunks.length} of a long transcript. ${isFirst ? 'Start with an introduction.' : 'Continue from the previous part.'} ${isLast ? 'End with a conclusion.' : ''}`
      : '';
    
    const prompt = `${systemPrompt}${chunkContext}\n\nPlease format the following transcript section:\n\n${chunks[i]}`;
    
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const formattedChunk = response.text();
      formattedChunks.push(formattedChunk);
      
      // Brief delay between chunks to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[Gemini] Error processing chunk ${i + 1}:`, error);
      throw new Error(`Failed to format chunk ${i + 1}`);
    }
  }
  
  // Combine chunks
  return formattedChunks.join('\n\n---\n\n');
}

function chunkTranscript(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  
  if (text.length <= maxChars) {
    return [text];
  }
  
  // Split by paragraphs first
  const paragraphs = text.split('\n\n');
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}