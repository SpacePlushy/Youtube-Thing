import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { transcript, options } = await request.json();
    
    // Create a TransformStream for streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Process in background - route to appropriate AI provider
    const formatFunction = options.aiProvider === 'groq' 
      ? formatWithGroqStream 
      : formatWithGeminiStream;
      
    formatFunction(transcript, options, writer, encoder).finally(() => {
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
${options.includeTimestamps ? '- IMPORTANT: Each timestamp [HH:MM:SS] or [MM:SS] must start on a new line, text flows continuously until next timestamp' : ''}`,
    
    summary: `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${options.includeTimestamps ? '- IMPORTANT: Include timestamps [HH:MM:SS] or [MM:SS] for key points, each on a new line with text flowing after' : ''}`,
    
    chapters: `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${options.includeTimestamps ? '- IMPORTANT: Each chapter should start with its timestamp on a new line, content flows continuously' : ''}`,
    
    bullets: `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${options.includeTimestamps ? '- IMPORTANT: Include timestamps [HH:MM:SS] or [MM:SS] at the start of relevant bullet points' : ''}`,
    
    timestamps: `You are a transcript formatter. Format this transcript while:
- IMPORTANT: Keep all timestamps exactly as they appear in square brackets [HH:MM:SS] or [MM:SS]
- Each timestamp MUST start on a new line
- Text should flow continuously without extra line breaks until the next timestamp
- Format: [timestamp] text continues until next timestamp
- Do NOT add paragraph breaks within timestamped sections
- Maintain chronological order and readability`
  };
  
  const paragraphInstructions = {
    short: 'Keep paragraphs brief (2-3 sentences).',
    medium: 'Use standard paragraph length (4-6 sentences).',
    long: 'Create longer, detailed paragraphs (7-10 sentences).'
  };
  
  const systemPrompt = `${systemPrompts[options.style]}\n\n${paragraphInstructions[options.paragraphLength]}`;
  
  // Process transcript in chunks for streaming
  const LINES_PER_CHUNK = 5; // Process 5 transcript segments at a time
  
  // Format transcript for AI processing - timestamps on new lines, text flows
  const formattedTranscript = transcript
    .map((segment, index) => {
      if (options.includeTimestamps) {
        // Each timestamp starts a new line
        const prefix = index === 0 ? '' : '\n';
        return `${prefix}[${segment.timestamp}] ${segment.text}`;
      }
      return segment.text;
    })
    .join(options.includeTimestamps ? ' ' : ' ')
    .replace(/\n /g, '\n'); // Clean up spaces after newlines
    
  // Split into chunks for processing
  const transcriptSegments = transcript;
  
  const totalChunks = Math.ceil(transcriptSegments.length / LINES_PER_CHUNK);
  
  // Send initial progress
  await writer.write(encoder.encode(`data: {"type": "progress", "message": "Starting formatting...", "progress": 0}\n\n`));
  
  let processedText = '';
  
  for (let i = 0; i < totalChunks; i++) {
    const startIdx = i * LINES_PER_CHUNK;
    const endIdx = Math.min((i + 1) * LINES_PER_CHUNK, transcriptSegments.length);
    const chunkSegments = transcriptSegments.slice(startIdx, endIdx);
    
    // Format chunk with timestamps on new lines
    const chunkText = chunkSegments
      .map((segment, index) => {
        if (options.includeTimestamps) {
          const prefix = (i === 0 && index === 0) ? '' : '\n';
          return `${prefix}[${segment.timestamp}] ${segment.text}`;
        }
        return segment.text;
      })
      .join(options.includeTimestamps ? ' ' : ' ')
      .replace(/\n /g, '\n');
    
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
    
    const prompt = `${systemPrompt}${promptContext}\n\n${options.includeTimestamps ? 'IMPORTANT: The transcript has timestamps in square brackets like [0:23] or [1:45:30]. Each timestamp should start on a new line, but the text should flow continuously without extra line breaks until the next timestamp. Keep the format: \n[timestamp] text text text\n[timestamp] more text text\n\n' : ''}Please format the following transcript section:\n\n${chunkText}`;
    
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

// Groq implementation for ultra-fast formatting
async function formatWithGroqStream(
  transcript: any[], 
  options: FormatOptions,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder
): Promise<void> {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    console.error('[Groq] GROQ_API_KEY not found in environment variables');
    await writer.write(encoder.encode(`data: {"error": "GROQ_API_KEY not configured"}\n\n`));
    throw new Error('GROQ_API_KEY not configured');
  }
  
  console.log('[Groq] Starting format with Llama 3.2 3B model');
  
  // System prompts (same as Gemini)
  const systemPrompts: Record<string, string> = {
    clean: `You are a transcript editor. Clean up this transcript by:
- Removing filler words (um, uh, like, you know)
- Fixing grammar and punctuation
- Organizing into clear paragraphs
- Maintaining the speaker's voice and meaning
- Making it easy to read while preserving accuracy
${options.includeTimestamps ? '- IMPORTANT: Each timestamp [HH:MM:SS] or [MM:SS] must start on a new line, text flows continuously until next timestamp' : ''}`,
    
    summary: `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${options.includeTimestamps ? '- IMPORTANT: Include timestamps [HH:MM:SS] or [MM:SS] for key points, each on a new line with text flowing after' : ''}`,
    
    chapters: `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${options.includeTimestamps ? '- IMPORTANT: Each chapter should start with its timestamp on a new line, content flows continuously' : ''}`,
    
    bullets: `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${options.includeTimestamps ? '- IMPORTANT: Include timestamps [HH:MM:SS] or [MM:SS] at the start of relevant bullet points' : ''}`,
    
    timestamps: `You are a transcript formatter. Format this transcript while:
- IMPORTANT: Keep all timestamps exactly as they appear in square brackets [HH:MM:SS] or [MM:SS]
- Each timestamp MUST start on a new line
- Text should flow continuously without extra line breaks until the next timestamp
- Format: [timestamp] text continues until next timestamp
- Do NOT add paragraph breaks within timestamped sections
- Maintain chronological order and readability`
  };
  
  const paragraphInstructions = {
    short: 'Keep paragraphs brief (2-3 sentences).',
    medium: 'Use standard paragraph length (4-6 sentences).',
    long: 'Create longer, detailed paragraphs (7-10 sentences).'
  };
  
  const systemPrompt = `${systemPrompts[options.style]}\n\n${paragraphInstructions[options.paragraphLength]}`;
  
  // Process transcript in larger chunks for Groq (it's fast!)
  const LINES_PER_CHUNK = 20; // Groq can handle more at once
  
  // Format transcript for AI processing
  const formattedTranscript = transcript
    .map((segment, index) => {
      if (options.includeTimestamps) {
        const prefix = index === 0 ? '' : '\n';
        return `${prefix}[${segment.timestamp}] ${segment.text}`;
      }
      return segment.text;
    })
    .join(options.includeTimestamps ? ' ' : ' ')
    .replace(/\n /g, '\n');
    
  const transcriptSegments = transcript;
  const totalChunks = Math.ceil(transcriptSegments.length / LINES_PER_CHUNK);
  
  // Send initial progress
  await writer.write(encoder.encode(`data: {"type": "progress", "message": "Starting ultra-fast Groq formatting...", "progress": 0}\n\n`));
  
  let processedText = '';
  
  for (let i = 0; i < totalChunks; i++) {
    const startIdx = i * LINES_PER_CHUNK;
    const endIdx = Math.min((i + 1) * LINES_PER_CHUNK, transcriptSegments.length);
    const chunkSegments = transcriptSegments.slice(startIdx, endIdx);
    
    // Format chunk with timestamps on new lines
    const chunkText = chunkSegments
      .map((segment, index) => {
        if (options.includeTimestamps) {
          const prefix = (i === 0 && index === 0) ? '' : '\n';
          return `${prefix}[${segment.timestamp}] ${segment.text}`;
        }
        return segment.text;
      })
      .join(options.includeTimestamps ? ' ' : ' ')
      .replace(/\n /g, '\n');
    
    const isFirst = i === 0;
    const isLast = i === totalChunks - 1;
    
    let promptContext = '';
    if (totalChunks > 1) {
      if (isFirst) {
        promptContext = '\n\nThis is the beginning of the transcript. Start appropriately.';
      } else if (isLast) {
        promptContext = '\n\nThis is the final part of the transcript. Conclude appropriately if needed.';
      } else {
        promptContext = '\n\nThis is a continuation of the transcript.';
      }
    }
    
    const prompt = `${systemPrompt}${promptContext}\n\n${options.includeTimestamps ? 'IMPORTANT: Each timestamp should start on a new line, text flows continuously.\n\n' : ''}Format:\n\n${chunkText}`;
    
    try {
      // Send progress update
      const progress = Math.round((i / totalChunks) * 100);
      await writer.write(encoder.encode(`data: {"type": "progress", "message": "Groq processing chunk ${i + 1} of ${totalChunks}...", "progress": ${progress}}\n\n`));
      
      console.log(`[Groq] Processing chunk ${i + 1}/${totalChunks}, ${chunkSegments.length} lines`);
      
      // Call Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Using stable Llama 3 8B model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: chunkText }
          ],
          temperature: 0.3,
          max_tokens: 4000,
          stream: true,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Groq] API Error Response:', errorText);
        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunkResult = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  chunkResult += content;
                  // Stream each piece as it comes
                  await writer.write(encoder.encode(`data: ${JSON.stringify({
                    type: 'stream',
                    content: content,
                    chunkIndex: i,
                    isPartial: true
                  })}\n\n`));
                }
              } catch (e) {
                // Skip parsing errors
              }
            }
          }
        }
      }
      
      // Send the complete chunk
      const finalChunk = {
        type: 'chunk',
        content: chunkResult,
        chunkIndex: i,
        totalChunks: totalChunks,
        isPartial: false
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
      
      // Add to processed text
      if (i > 0 && processedText && !processedText.endsWith('\n')) {
        processedText += '\n';
      }
      processedText += chunkResult;
      
      // Very brief delay between chunks (Groq is fast, no need for long delays)
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`[Groq] Error processing chunk ${i + 1}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = {
        type: 'error',
        message: `Failed to format chunk ${i + 1}: ${errorMessage}`,
        error: errorMessage,
        details: {
          chunk: i + 1,
          totalChunks,
          model: 'llama3-8b-8192'
        }
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      throw error;
    }
  }
  
  // Send completion message
  await writer.write(encoder.encode(`data: {"type": "complete", "message": "Groq formatting complete! ⚡"}\n\n`));
}