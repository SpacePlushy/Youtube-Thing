import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

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
  
  // Log API key info for debugging (first 10 chars only)
  console.log('[Groq] API Key present:', groqApiKey.substring(0, 10) + '...');
  
  // Validate API key format
  if (!groqApiKey.startsWith('gsk_')) {
    console.error('[Groq] Invalid API key format - should start with gsk_');
    await writer.write(encoder.encode(`data: {"error": "Invalid GROQ_API_KEY format - should start with gsk_"}\n\n`));
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
  
  // Calculate optimal number of workers based on token limits
  const TPM_LIMIT = 6000; // Tokens per minute limit
  const MAX_TOKENS_PER_WORKER = 2000; // More conservative limit for safety
  const ESTIMATED_CHARS_PER_TOKEN = 4; // Rough estimate: 4 characters per token
  
  // Estimate tokens more conservatively
  const totalTranscriptChars = transcript.reduce((sum, segment) => sum + segment.text.length, 0);
  const systemPromptChars = systemPrompt.length;
  
  // Conservative estimation: input + system prompt + generous output buffer
  const estimatedInputTokens = (totalTranscriptChars + systemPromptChars) / ESTIMATED_CHARS_PER_TOKEN;
  const estimatedOutputTokens = estimatedInputTokens * 1.5; // Output is usually 1.5x input for formatting
  const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
  
  // Calculate workers more conservatively
  const minWorkersForContent = Math.ceil(estimatedInputTokens / (MAX_TOKENS_PER_WORKER * 0.5)); // Only 50% of limit for input
  const maxWorkersForTPM = Math.floor(TPM_LIMIT / MAX_TOKENS_PER_WORKER);
  
  // Choose the number of workers (min 3, max based on TPM limit)
  const PARALLEL_CHUNKS = Math.max(3, Math.min(minWorkersForContent, maxWorkersForTPM, 8)); // Cap at 8 for safety
  const chunkSize = Math.ceil(transcript.length / PARALLEL_CHUNKS);
  
  console.log(`[Groq] Optimizing for ${estimatedTotalTokens} estimated tokens: Using ${PARALLEL_CHUNKS} workers (TPM limit: ${TPM_LIMIT}, max per worker: ${MAX_TOKENS_PER_WORKER})`);
  const chunks = [];
  
  for (let i = 0; i < PARALLEL_CHUNKS; i++) {
    const startIdx = i * chunkSize;
    const endIdx = Math.min((i + 1) * chunkSize, transcript.length);
    const chunkSegments = transcript.slice(startIdx, endIdx);
    
    // Format chunk with timestamps
    const formattedChunk = chunkSegments
      .map((segment, index) => {
        if (options.includeTimestamps) {
          const prefix = (i === 0 && index === 0) ? '' : '\n';
          return `${prefix}[${segment.timestamp}] ${segment.text}`;
        }
        return segment.text;
      })
      .join(options.includeTimestamps ? ' ' : ' ')
      .replace(/\n /g, '\n');
    
    chunks.push({
      index: i,
      content: formattedChunk,
      segments: chunkSegments.length
    });
  }
  
  console.log(`[Groq] Processing ${transcript.length} segments in ${PARALLEL_CHUNKS} parallel chunks`);
  
  // Send initial progress with worker count
  await writer.write(encoder.encode(`data: {"type": "progress", "message": "Starting parallel processing with ${PARALLEL_CHUNKS} workers (optimized for ${estimatedTotalTokens} tokens)...", "progress": 10}\n\n`));
  
  // Track progress across parallel workers
  const chunkProgress = new Array(PARALLEL_CHUNKS).fill(0);
  const chunkStartTimes = new Array(PARALLEL_CHUNKS).fill(0);
  
  const updateOverallProgress = () => {
    const avgProgress = chunkProgress.reduce((sum, progress) => sum + progress, 0) / PARALLEL_CHUNKS;
    const overallProgress = Math.round(20 + (avgProgress * 0.6)); // 20% to 80% during processing
    return overallProgress;
  };
  
  // Process all chunks in parallel with progress tracking
  const processChunk = async (chunk: any, chunkIndex: number) => {
    const chunkSystemPrompt = systemPrompt + `\n\nIMPORTANT: This is part ${chunkIndex + 1} of ${PARALLEL_CHUNKS} of a transcript. ${
      chunkIndex === 0 ? 'Start naturally without introduction.' :
      chunkIndex === PARALLEL_CHUNKS - 1 ? 'End naturally without conclusion.' :
      'Continue the content seamlessly - no introduction or conclusion needed.'
    }`;
    
    const chunkPrompt = `${options.includeTimestamps ? 'IMPORTANT: Each timestamp should start on a new line, text flows continuously.\n\n' : ''}Format this transcript section:\n\n${chunk.content}`;
    
    // Estimate tokens for this chunk more carefully
    const estimatedInputTokens = (chunkSystemPrompt.length + chunkPrompt.length) / ESTIMATED_CHARS_PER_TOKEN;
    const estimatedOutputTokens = Math.min(MAX_TOKENS_PER_WORKER, chunk.content.length * 1.2 / ESTIMATED_CHARS_PER_TOKEN);
    const totalEstimatedTokens = estimatedInputTokens + estimatedOutputTokens;
    
    console.log(`[Groq] Worker ${chunkIndex + 1}: Input ~${Math.round(estimatedInputTokens)} tokens, Output ~${Math.round(estimatedOutputTokens)} tokens, Total ~${Math.round(totalEstimatedTokens)} tokens`);
    
    try {
      chunkStartTimes[chunkIndex] = Date.now();
      chunkProgress[chunkIndex] = 5; // Started
      
      // Send progress update
      const currentProgress = updateOverallProgress();
      await writer.write(encoder.encode(`data: {"type": "progress", "message": "Worker ${chunkIndex + 1}/${PARALLEL_CHUNKS} started...", "progress": ${currentProgress}}\n\n`));
      
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: chunkSystemPrompt },
          { role: 'user', content: chunkPrompt }
        ],
        temperature: 0.3,
        max_tokens: MAX_TOKENS_PER_WORKER, // Dynamic limit based on worker count
        stream: false, // Use non-streaming for parallel processing
      });
      
      chunkProgress[chunkIndex] = 100; // Completed
      const processingTime = Date.now() - chunkStartTimes[chunkIndex];
      const tokensPerSecond = Math.round(totalEstimatedTokens / (processingTime / 1000));
      
      // Send completion update
      const finalProgress = updateOverallProgress();
      await writer.write(encoder.encode(`data: {"type": "progress", "message": "Worker ${chunkIndex + 1}/${PARALLEL_CHUNKS} completed (${tokensPerSecond} tokens/sec)", "progress": ${finalProgress}}\n\n`));
      
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
      await writer.write(encoder.encode(`data: {"type": "progress", "message": "Worker ${chunkIndex + 1}/${PARALLEL_CHUNKS} failed - using original content", "progress": ${errorProgress}}\n\n`));
      
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
    await writer.write(encoder.encode(`data: {"type": "progress", "message": "Processing ${PARALLEL_CHUNKS} chunks in parallel...", "progress": 20}\n\n`));
    
    const chunkPromises = chunks.map((chunk, index) => processChunk(chunk, index));
    const results = await Promise.all(chunkPromises);
    
    // Update progress
    await writer.write(encoder.encode(`data: {"type": "progress", "message": "Merging results...", "progress": 80}\n\n`));
    
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
          // Remove any leading whitespace/newlines from continuation chunks
          chunkContent = chunkContent.replace(/^\s+/, '');
          
          // Add appropriate spacing between chunks
          if (mergedContent && !mergedContent.endsWith('\n\n')) {
            if (options.includeTimestamps) {
              // For timestamps, ensure proper line breaks
              mergedContent += mergedContent.endsWith('\n') ? '' : '\n';
            } else {
              // For regular content, add paragraph spacing
              mergedContent += '\n\n';
            }
          }
        }
        
        mergedContent += chunkContent;
        
        // Stream the merged content as we process it
        try {
          const streamData = {
            type: 'stream',
            content: chunkContent,
            chunkIndex: i,
            isPartial: true
          };
          await writer.write(encoder.encode(`data: ${JSON.stringify(streamData)}\n\n`));
        } catch (jsonError) {
          console.error('[Groq] JSON serialization error:', jsonError);
        }
      } else {
        console.error(`[Groq] Failed to process chunk ${i + 1}: ${result.error}`);
      }
    }
    
    // If all chunks failed, try a single large request as fallback
    if (successfulChunks === 0) {
      console.log('[Groq] All parallel chunks failed, attempting single request fallback...');
      await writer.write(encoder.encode(`data: {"type": "progress", "message": "Parallel processing failed, trying single request...", "progress": 50}\n\n`));
      
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
        
        await writer.write(encoder.encode(`data: {"type": "progress", "message": "Single request fallback successful!", "progress": 90}\n\n`));
        
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
        await writer.write(encoder.encode(`data: {"type": "progress", "message": "Using original transcript (AI formatting unavailable)", "progress": 90}\n\n`));
      }
    }
    
    // Send the complete result
    try {
      const finalChunk = {
        type: 'chunk',
        content: mergedContent,
        chunkIndex: 0,
        totalChunks: 1,
        isPartial: false
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
    } catch (jsonError) {
      console.error('[Groq] Final chunk JSON error:', jsonError);
      await writer.write(encoder.encode(`data: {"type": "chunk", "content": "Processing completed - check formatted output above", "chunkIndex": 0, "totalChunks": 1, "isPartial": false}\n\n`));
    }
    
    // Calculate aggregate performance statistics
    const successfulResults = results.filter(r => r.success && r.tokensPerSecond);
    const avgTokensPerSecond = successfulResults.length > 0 
      ? Math.round(successfulResults.reduce((sum, r) => sum + (r.tokensPerSecond || 0), 0) / successfulResults.length)
      : 0;
    
    const totalProcessingTime = Math.max(...results.map(r => r.processingTime || 0));
    const parallelEfficiency = Math.round((successfulChunks / PARALLEL_CHUNKS) * 100);
    
    // Update to 100% complete with performance stats
    const completionMessage = successfulChunks === PARALLEL_CHUNKS 
      ? `${PARALLEL_CHUNKS} workers completed! ⚡ (${avgTokensPerSecond} tokens/sec avg, ${parallelEfficiency}% efficiency)`
      : `${successfulChunks}/${PARALLEL_CHUNKS} workers completed (${avgTokensPerSecond} tokens/sec avg, ${parallelEfficiency}% efficiency)`;
    
    await writer.write(encoder.encode(`data: {"type": "progress", "message": "${completionMessage}", "progress": 100}\n\n`));
    
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
    await writer.write(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
    throw error;
  }
  
  // Send completion message
  await writer.write(encoder.encode(`data: {"type": "complete", "message": "Groq formatting complete! ⚡"}\n\n`));
}