import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { transcript, options } = await request.json();
    
    // Create a TransformStream for streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Process in background
    formatWithGeminiStream(transcript, options, writer, encoder).finally(() => {
      writer.close();
    });
    
    // Return streaming response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('[Format API] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to format transcript' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

interface FormatOptions {
  style: 'summary' | 'chapters' | 'clean' | 'bullets' | 'timestamps';
  includeTimestamps: boolean;
  paragraphLength: 'short' | 'medium' | 'long';
  aiProvider: string;
}

async function formatWithGeminiStream(
  transcript: any[], 
  options: FormatOptions,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder
): Promise<void> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    await writer.write(encoder.encode(`data: {"error": "GEMINI_API_KEY not configured"}\n\n`));
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest", // Fast and cheap, with 1M token context
  });
  
  // Build the system prompt based on formatting style
  const systemPrompts: Record<string, string> = {
    clean: `You are a transcript editor. Clean up this transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing grammar and punctuation
- Organizing into clear paragraphs
- Maintaining the speaker's voice and meaning
- Making it easy to read while preserving accuracy
${options.includeTimestamps ? '- IMPORTANT: Preserve all timestamps in square brackets [HH:MM:SS] or [MM:SS] exactly as they appear' : ''}`,
    
    summary: `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${options.includeTimestamps ? '- IMPORTANT: Include relevant timestamps [HH:MM:SS] or [MM:SS] for key points' : ''}`,
    
    chapters: `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${options.includeTimestamps ? '- IMPORTANT: Include the starting timestamp for each chapter' : ''}`,
    
    bullets: `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${options.includeTimestamps ? '- IMPORTANT: Include timestamps [HH:MM:SS] or [MM:SS] for each bullet point' : ''}`,
    
    timestamps: `You are a transcript formatter. Format this transcript while:
- IMPORTANT: Keep all timestamps exactly as they appear in square brackets [HH:MM:SS] or [MM:SS]
- Do NOT remove or modify any timestamp
- Organize content chronologically with timestamps intact
- Create clear paragraph breaks between different topics
- Maintain readability while preserving all timing information`
  };
  
  const paragraphInstructions = {
    short: 'Keep paragraphs brief (2-3 sentences).',
    medium: 'Use standard paragraph length (4-6 sentences).',
    long: 'Create longer, detailed paragraphs (7-10 sentences).'
  };
  
  const systemPrompt = `${systemPrompts[options.style]}\n\n${paragraphInstructions[options.paragraphLength]}`;
  
  // Process transcript in chunks for streaming
  const CHUNK_SIZE = 1000; // Process 1000 words at a time for streaming
  const words = transcript.map(segment => 
    options.includeTimestamps 
      ? `[${segment.timestamp}] ${segment.text}`
      : segment.text
  ).join(' ').split(' ');
  
  const totalChunks = Math.ceil(words.length / CHUNK_SIZE);
  
  // Send initial progress
  await writer.write(encoder.encode(`data: {"type": "progress", "message": "Starting formatting...", "progress": 0}\n\n`));
  
  let processedText = '';
  
  for (let i = 0; i < totalChunks; i++) {
    const startIdx = i * CHUNK_SIZE;
    const endIdx = Math.min((i + 1) * CHUNK_SIZE, words.length);
    const chunkWords = words.slice(startIdx, endIdx);
    const chunkText = chunkWords.join(' ');
    
    const isFirst = i === 0;
    const isLast = i === totalChunks - 1;
    
    let promptContext = '';
    if (totalChunks > 1) {
      if (isFirst) {
        promptContext = '\n\nThis is the beginning of the transcript. Start appropriately.';
      } else if (isLast) {
        promptContext = '\n\nThis is the final part of the transcript. Conclude appropriately if needed, but do not add extra line breaks at the end.';
      } else {
        promptContext = '\n\nThis is a continuation of the transcript. Start immediately without extra line breaks.';
      }
    }
    
    const prompt = `${systemPrompt}${promptContext}\n\n${options.includeTimestamps ? 'IMPORTANT: The transcript contains timestamps in square brackets like [0:23] or [1:45:30]. You MUST preserve these timestamps exactly as they appear. Do not remove or modify them.\n\n' : ''}Please format the following transcript section:\n\n${chunkText}`;
    
    try {
      // Send progress update
      const progress = Math.round((i / totalChunks) * 100);
      await writer.write(encoder.encode(`data: {"type": "progress", "message": "Processing chunk ${i + 1} of ${totalChunks}...", "progress": ${progress}}\n\n`));
      
      // Use streaming for real-time output
      const result = await model.generateContentStream(prompt);
      
      let chunkText = '';
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          chunkText += text;
          // Stream each word/phrase as it comes
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'stream',
            content: text,
            chunkIndex: i,
            isPartial: true
          })}\n\n`));
        }
      }
      
      // Send the complete chunk when done
      const finalChunk = {
        type: 'chunk',
        content: chunkText,
        chunkIndex: i,
        totalChunks: totalChunks,
        isPartial: false
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
      
      // Only add spacing if the previous chunk doesn't end with newlines
      if (i > 0 && processedText && !processedText.endsWith('\n\n')) {
        processedText += '\n\n';
      }
      processedText += chunkText;
      
      // Brief delay between chunks to avoid rate limits
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`[Gemini] Error processing chunk ${i + 1}:`, error);
      const errorData = {
        type: 'error',
        message: `Failed to format chunk ${i + 1}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      throw error;
    }
  }
  
  // Send completion message
  await writer.write(encoder.encode(`data: {"type": "complete", "message": "Formatting complete!"}\n\n`));
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