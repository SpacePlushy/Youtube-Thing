import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

// Utility function to safely send JSON data in streaming response
const safeStreamWrite = async (writer: WritableStreamDefaultWriter, encoder: TextEncoder, data: any) => {
  try {
    // Create a deep clone of the data and sanitize string values
    const sanitizeString = (str: string): string => {
      // Properly escape characters for JSON - don't double-escape
      return str
        .replace(/\\/g, '\\\\')  // Escape backslashes
        .replace(/"/g, '\\"')   // Escape quotes
        .replace(/\n/g, '\\n')  // Escape newlines
        .replace(/\r/g, '\\r')  // Escape carriage returns
        .replace(/\t/g, '\\t')  // Escape tabs
        .replace(/\b/g, '\\b')  // Escape backspace
        .replace(/\f/g, '\\f')  // Escape form feed
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
    };

    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return sanitizeString(value);
      } else if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      } else if (value !== null && typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };

    const sanitizedData = sanitizeValue(data);
    const jsonString = JSON.stringify(sanitizedData);
    await writer.write(encoder.encode(`data: ${jsonString}\n\n`));
  } catch (error) {
    console.error('[Stream] JSON serialization error:', error);
    // Send minimal safe fallback
    const safeData = {
      type: data.type || 'message',
      content: '[Content could not be processed safely]',
      isPartial: false,
      error: 'serialization_failed'
    };
    await writer.write(encoder.encode(`data: ${JSON.stringify(safeData)}\n\n`));
  }
};

export async function POST(request: NextRequest) {
  console.log('[Format API] POST request received');
  try {
    const { transcript, options } = await request.json();
    console.log('[Format API] Request parsed - transcript length:', transcript?.length, 'options:', options);
    
    // Create a TransformStream for streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Process in background - route to appropriate AI provider
    const formatFunction = options.aiProvider === 'groq' 
      ? formatWithGroqStream 
      : formatWithGeminiStream;
      
    formatFunction(transcript, options, writer, encoder).finally(() => {
      console.log('[Format API] Format function completed, closing writer');
      writer.close();
    });
    
    console.log('[Format API] Returning streaming response');
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
    await safeStreamWrite(writer, encoder, { error: "GEMINI_API_KEY not configured" });
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
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`,
    
    summary: `You are a transcript summarizer. Create a concise summary that:
- Captures all main points and key insights
- Organizes information logically
- Uses clear, professional language
- Maintains accuracy to the original content
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`,
    
    chapters: `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`,
    
    bullets: `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`,
    
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
  await safeStreamWrite(writer, encoder, {
    type: "progress", 
    message: "Starting formatting...", 
    progress: 0
  });
  
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
      await safeStreamWrite(writer, encoder, {
        type: "progress", 
        message: `Processing chunk ${i + 1} of ${totalChunks}...`, 
        progress: progress
      });
      
      // Use streaming for real-time output
      const result = await model.generateContentStream(prompt);
      
      let chunkText = '';
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          chunkText += text;
          // Stream each word/phrase as it comes
          await safeStreamWrite(writer, encoder, {
            type: 'stream',
            content: text,
            chunkIndex: i,
            isPartial: true
          });
        }
      }
      
      // Send the complete chunk when done
      await safeStreamWrite(writer, encoder, {
        type: 'chunk',
        content: chunkText,
        chunkIndex: i,
        totalChunks: totalChunks,
        isPartial: false
      });
      
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
      await safeStreamWrite(writer, encoder, {
        type: 'error',
        message: `Failed to format chunk ${i + 1}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  // Send completion message
  await safeStreamWrite(writer, encoder, {
    type: "complete", 
    message: "Formatting complete!"
  });
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
    await safeStreamWrite(writer, encoder, { error: "GROQ_API_KEY not configured" });
    throw new Error('GROQ_API_KEY not configured');
  }
  
  // Log API key info for debugging (first 10 chars only)
  console.log('[Groq] API Key present:', groqApiKey.substring(0, 10) + '...');
  
  // Validate API key format
  if (!groqApiKey.startsWith('gsk_')) {
    console.error('[Groq] Invalid API key format - should start with gsk_');
    await safeStreamWrite(writer, encoder, { error: "Invalid GROQ_API_KEY format - should start with gsk_" });
    throw new Error('Invalid GROQ_API_KEY format');
  }
  
  // Initialize Groq client
  const groq = new Groq({
    apiKey: groqApiKey.trim(), // Ensure no whitespace
  });
  
  console.log('[Groq] Starting format with Llama 3.1 8B Instant model');
  
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
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`,
    
    chapters: `You are a transcript organizer. Structure this transcript into chapters by:
- Identifying major topic shifts
- Creating descriptive chapter titles
- Organizing content under each chapter
- Adding brief introductions to each section
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`,
    
    bullets: `You are a transcript analyzer. Convert this transcript into bullet points that:
- Highlight key information and insights
- Group related points together
- Use clear, concise language
- Maintain logical flow
${options.includeTimestamps ? '- IMPORTANT: Format timestamps exactly like this:\n[0:01]\nText content here\n[0:24]\nMore text content' : ''}`,
    
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
  
  const systemPrompt = `${systemPrompts[options.style]}\n\n${paragraphInstructions[options.paragraphLength]}`;
  
  // Calculate optimal number of agents based on token limits
  const TPM_LIMIT = 6000; // Tokens per minute limit
  const MAX_TOKENS_PER_AGENT = 2000; // More conservative limit for safety
  const ESTIMATED_CHARS_PER_TOKEN = 4; // Rough estimate: 4 characters per token
  
  // Estimate tokens more conservatively
  const totalTranscriptChars = transcript.reduce((sum, segment) => sum + segment.text.length, 0);
  const systemPromptChars = systemPrompt.length;
  
  // Conservative estimation: input + system prompt + generous output buffer
  const estimatedInputTokens = (totalTranscriptChars + systemPromptChars) / ESTIMATED_CHARS_PER_TOKEN;
  const estimatedOutputTokens = estimatedInputTokens * 1.5; // Output is usually 1.5x input for formatting
  const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
  
  // Calculate agents more conservatively
  const minAgentsForContent = Math.ceil(estimatedInputTokens / (MAX_TOKENS_PER_AGENT * 0.5)); // Only 50% of limit for input
  const maxAgentsForTPM = Math.floor(TPM_LIMIT / MAX_TOKENS_PER_AGENT);
  
  // Choose the number of agents (min 3, max based on TPM limit)
  const PARALLEL_CHUNKS = Math.max(3, Math.min(minAgentsForContent, maxAgentsForTPM, 8)); // Cap at 8 for safety
  const chunkSize = Math.ceil(transcript.length / PARALLEL_CHUNKS);
  
  console.log(`[Groq] Optimizing for ${estimatedTotalTokens} estimated tokens: Using ${PARALLEL_CHUNKS} agents (TPM limit: ${TPM_LIMIT}, max per agent: ${MAX_TOKENS_PER_AGENT})`);
  const chunks = [];
  
  for (let i = 0; i < PARALLEL_CHUNKS; i++) {
    const startIdx = i * chunkSize;
    const endIdx = Math.min((i + 1) * chunkSize, transcript.length);
    const chunkSegments = transcript.slice(startIdx, endIdx);
    
    // Format chunk with timestamps
    const formattedChunk = chunkSegments
      .map((segment, index) => {
        if (options.includeTimestamps) {
          // Always start timestamps on new line, except for the very first one
          const prefix = (i === 0 && index === 0) ? '' : '\n';
          return `${prefix}[${segment.timestamp}]\n${segment.text}`;
        }
        return segment.text;
      })
      .join(''); // Join without spaces to preserve newlines
    
    chunks.push({
      index: i,
      content: formattedChunk,
      segments: chunkSegments.length
    });
  }
  
  console.log(`[Groq] Processing ${transcript.length} segments in ${PARALLEL_CHUNKS} parallel chunks`);
  
  // Send initial progress with agent count
  await safeStreamWrite(writer, encoder, {
    type: "progress", 
    message: `Starting parallel processing with ${PARALLEL_CHUNKS} agents (optimized for ${estimatedTotalTokens} tokens)...`, 
    progress: 10
  });
  
  // Track progress across parallel agents
  const chunkProgress = new Array(PARALLEL_CHUNKS).fill(0);
  const chunkStartTimes = new Array(PARALLEL_CHUNKS).fill(0);
  
  // Mutex for thread-safe streaming writes
  let writeMutex = Promise.resolve();
  const safeStreamWriteWithMutex = async (data: any) => {
    writeMutex = writeMutex.then(async () => {
      await safeStreamWrite(writer, encoder, data);
    });
    await writeMutex;
  };
  
  const updateOverallProgress = () => {
    const avgProgress = chunkProgress.reduce((sum, progress) => sum + progress, 0) / PARALLEL_CHUNKS;
    const overallProgress = Math.round(20 + (avgProgress * 0.6)); // 20% to 80% during processing
    return overallProgress;
  };
  
  // Process all chunks in parallel with agent progress tracking
  const processChunk = async (chunk: any, chunkIndex: number) => {
    const chunkSystemPrompt = systemPrompt + `\n\nIMPORTANT: This is part ${chunkIndex + 1} of ${PARALLEL_CHUNKS} of a transcript. ${
      chunkIndex === 0 ? 'Start naturally without introduction.' :
      chunkIndex === PARALLEL_CHUNKS - 1 ? 'End naturally without conclusion.' :
      'Continue the content seamlessly - no introduction or conclusion needed.'
    }`;
    
    const chunkPrompt = `${options.includeTimestamps ? 'IMPORTANT: Format timestamps exactly as shown in the input - each timestamp on its own line followed by text. Maintain this format:\n[timestamp]\ntext content here\n[timestamp]\nmore text content\n\n' : ''}Format this transcript section:\n\n${chunk.content}`;
    
    // Estimate tokens for this chunk more carefully
    const estimatedInputTokens = (chunkSystemPrompt.length + chunkPrompt.length) / ESTIMATED_CHARS_PER_TOKEN;
    const estimatedOutputTokens = Math.min(MAX_TOKENS_PER_AGENT, chunk.content.length * 1.2 / ESTIMATED_CHARS_PER_TOKEN);
    const totalEstimatedTokens = estimatedInputTokens + estimatedOutputTokens;
    
    console.log(`[Groq] Agent ${chunkIndex + 1}: Input ~${Math.round(estimatedInputTokens)} tokens, Output ~${Math.round(estimatedOutputTokens)} tokens, Total ~${Math.round(totalEstimatedTokens)} tokens`);
    
    try {
      chunkStartTimes[chunkIndex] = Date.now();
      chunkProgress[chunkIndex] = 5; // Started
      
      // Send progress update
      const currentProgress = updateOverallProgress();
      await safeStreamWriteWithMutex({
        type: "progress", 
        message: `Agent ${chunkIndex + 1}/${PARALLEL_CHUNKS} started...`, 
        progress: currentProgress
      });
      
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: chunkSystemPrompt },
          { role: 'user', content: chunkPrompt }
        ],
        temperature: 0.3,
        max_tokens: MAX_TOKENS_PER_AGENT, // Dynamic limit based on agent count
        stream: false, // Use non-streaming for parallel processing
      });
      
      chunkProgress[chunkIndex] = 100; // Completed
      const processingTime = Date.now() - chunkStartTimes[chunkIndex];
      const tokensPerSecond = Math.round(totalEstimatedTokens / (processingTime / 1000));
      
      // Send completion update
      const finalProgress = updateOverallProgress();
      await safeStreamWriteWithMutex({
        type: "progress", 
        message: `Agent ${chunkIndex + 1}/${PARALLEL_CHUNKS} completed (${tokensPerSecond} tokens/sec)`, 
        progress: finalProgress
      });
      
      return {
        index: chunkIndex,
        content: completion.choices[0].message.content || '',
        success: true,
        processingTime,
        tokensPerSecond
      };
    } catch (error) {
      console.error(`[Groq] Error processing chunk ${chunkIndex + 1}:`, error);
      chunkProgress[chunkIndex] = 0; // Failed
      
      const errorProgress = updateOverallProgress();
      await safeStreamWriteWithMutex({
        type: "progress", 
        message: `Agent ${chunkIndex + 1}/${PARALLEL_CHUNKS} failed - using original content`, 
        progress: errorProgress
      });
      
      // Return original content instead of error message to preserve transcript
      return {
        index: chunkIndex,
        content: chunk.content, // Use original transcript content as fallback
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true
      };
    }
  };
  
  try {
    // Process all chunks in parallel
    await safeStreamWrite(writer, encoder, {
      type: "progress", 
      message: `Processing ${PARALLEL_CHUNKS} chunks with parallel agents...`, 
      progress: 20
    });
    
    const chunkPromises = chunks.map((chunk, index) => processChunk(chunk, index));
    const results = await Promise.all(chunkPromises);
    
    // Update progress
    await safeStreamWrite(writer, encoder, {
      type: "progress", 
      message: "Merging results...", 
      progress: 80
    });
    
    // Sort results by index to maintain order
    results.sort((a, b) => a.index - b.index);
    
    // Merge results seamlessly
    let mergedContent = '';
    let successfulChunks = 0;
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      if (result.success) {
        successfulChunks++;
        let chunkContent = result.content;
        
        // Clean up chunk boundaries for seamless merging
        if (i > 0) {
          // For timestamp formatting, preserve leading newlines that precede timestamps
          if (options.includeTimestamps && chunkContent.startsWith('\n[')) {
            // Don't remove leading newlines if they precede timestamps
          } else {
            // Remove leading whitespace for non-timestamp content
            chunkContent = chunkContent.replace(/^\s+/, '');
          }
          
          // Add spacing only if not already present
          if (mergedContent && !mergedContent.endsWith('\n') && !chunkContent.startsWith('\n')) {
            if (options.includeTimestamps) {
              // For timestamps, add single newline
              mergedContent += '\n';
            } else {
              // For regular content, add paragraph spacing
              mergedContent += '\n\n';
            }
          }
        }
        
        mergedContent += chunkContent;
        
        // Stream the merged content as we process it with safe JSON handling
        await safeStreamWrite(writer, encoder, {
          type: 'stream',
          content: chunkContent,
          chunkIndex: i,
          isPartial: true
        });
      } else {
        console.error(`[Groq] Failed to process chunk ${i + 1}: ${result.error}`);
      }
    }
    
    // If all chunks failed, try a single large request as fallback
    if (successfulChunks === 0) {
      console.log('[Groq] All parallel chunks failed, attempting single request fallback...');
      await safeStreamWrite(writer, encoder, {
        type: "progress", 
        message: "Parallel processing failed, trying single request...", 
        progress: 50
      });
      
      try {
        // Format entire transcript as single request with lower token limit
        const fullTranscript = transcript
          .map((segment, index) => {
            if (options.includeTimestamps) {
              const prefix = index === 0 ? '' : '\n';
              return `${prefix}[${segment.timestamp}] ${segment.text}`;
            }
            return segment.text;
          })
          .join(options.includeTimestamps ? ' ' : ' ')
          .replace(/\n /g, '\n');
        
        const fallbackCompletion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${options.includeTimestamps ? 'IMPORTANT: Each timestamp should start on a new line, text flows continuously.\n\n' : ''}Format this transcript:\n\n${fullTranscript}` }
          ],
          temperature: 0.3,
          max_tokens: 4000, // Conservative limit for fallback
          stream: false,
        });
        
        const fallbackContent = fallbackCompletion.choices[0].message.content || fullTranscript;
        mergedContent = fallbackContent;
        
        await safeStreamWrite(writer, encoder, {
          type: "progress", 
          message: "Single request fallback successful!", 
          progress: 90
        });
        
      } catch (fallbackError) {
        console.error('[Groq] Fallback request also failed:', fallbackError);
        // Final fallback: return original transcript
        const originalTranscript = transcript
          .map((segment, index) => {
            if (options.includeTimestamps) {
              const prefix = index === 0 ? '' : '\n';
              return `${prefix}[${segment.timestamp}] ${segment.text}`;
            }
            return segment.text;
          })
          .join(options.includeTimestamps ? ' ' : ' ')
          .replace(/\n /g, '\n');
        
        mergedContent = originalTranscript;
        await safeStreamWrite(writer, encoder, {
          type: "progress", 
          message: "Using original transcript (AI formatting unavailable)", 
          progress: 90
        });
      }
    }
    
    // Send the complete result with safe JSON handling
    await safeStreamWrite(writer, encoder, {
      type: 'chunk',
      content: mergedContent,
      chunkIndex: 0,
      totalChunks: 1,
      isPartial: false
    });
    
    // Calculate aggregate performance statistics
    const successfulResults = results.filter(r => r.success && r.tokensPerSecond);
    const avgTokensPerSecond = successfulResults.length > 0 
      ? Math.round(successfulResults.reduce((sum, r) => sum + (r.tokensPerSecond || 0), 0) / successfulResults.length)
      : 0;
    
    const totalProcessingTime = Math.max(...results.map(r => r.processingTime || 0));
    const parallelEfficiency = Math.round((successfulChunks / PARALLEL_CHUNKS) * 100);
    
    // Update to 100% complete with performance stats
    const completionMessage = successfulChunks === PARALLEL_CHUNKS 
      ? `${PARALLEL_CHUNKS} agents completed! ⚡ (${avgTokensPerSecond} tokens/sec avg, ${parallelEfficiency}% efficiency)`
      : `${successfulChunks}/${PARALLEL_CHUNKS} agents completed (${avgTokensPerSecond} tokens/sec avg, ${parallelEfficiency}% efficiency)`;
    
    await safeStreamWrite(writer, encoder, {
      type: "progress", 
      message: completionMessage, 
      progress: 100
    });
    
  } catch (error) {
    console.error('[Groq] Error in parallel processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorData = {
      type: 'error',
      message: `Failed to format transcript: ${errorMessage}`,
      error: errorMessage,
      details: {
        model: 'llama-3.1-8b-instant',
        transcriptLength: transcript.length,
        parallelChunks: PARALLEL_CHUNKS
      }
    };
    await safeStreamWrite(writer, encoder, errorData);
    throw error;
  }
  
  // Send completion message
  await safeStreamWrite(writer, encoder, {
    type: "complete", 
    message: "Groq formatting complete! ⚡"
  });
}