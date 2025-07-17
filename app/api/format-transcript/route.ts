import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { checkBotId } from 'botid/server';
import { buildPrompt } from '@/lib/ai-prompts';
import { splitTranscriptWithLangChain, getOptimalChunkConfig, shouldUseChunking } from '@/lib/langchain-splitter';
import { envConfig } from '@/lib/env-config';
import { API_ROUTE_CONFIG, HTTP_CONFIG, ERROR_MESSAGES, AI_PROCESSING } from '@/lib/constants';


// Clean AI output by removing common commentary patterns
function cleanAIOutput(output: string): string {
  // Common patterns that AI might add before the actual content
  const commentaryPatterns = [
    /^(?:here\s+is\s+the\s+)?(?:formatted\s+)?(?:transcript|output|result|summary|content)(?:\s*:)?\s*/i,
    /^(?:i'?ve\s+)?(?:cleaned\s+up\s+|formatted\s+|organized\s+|summarized\s+)?(?:the\s+)?(?:transcript|text|content)(?:\s*:)?\s*/i,
    /^(?:the\s+)?(?:formatted\s+)?(?:transcript|output|result|summary|content)(?:\s+(?:is\s+)?(?:as\s+follows|below))(?:\s*:)?\s*/i,
    /^(?:based\s+on\s+the\s+)?(?:transcript|input|content)(?:\s*:)?\s*/i,
    /^(?:after\s+(?:cleaning|formatting|organizing))(?:\s*:)?\s*/i,
    /^(?:let\s+me\s+)?(?:format\s+|clean\s+|organize\s+)?(?:this\s+for\s+you)(?:\s*:)?\s*/i,
    /^(?:sure[!,.]?\s+)?(?:here\s+you\s+go)(?:\s*:)?\s*/i,
    /^(?:absolutely[!,.]?\s+)?(?:here\s+(?:is\s+)?(?:the\s+)?)?(?:formatted\s+)?(?:version|transcript|output)(?:\s*:)?\s*/i,
  ];
  
  let cleaned = output.trim();
  
  // Remove commentary patterns from the beginning
  for (const pattern of commentaryPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove any remaining leading whitespace or newlines
  cleaned = cleaned.replace(/^\s*\n+/, '');
  
  // Additional cleanup for common AI behavior
  // Remove standalone colons or dashes at the beginning
  cleaned = cleaned.replace(/^[:−\-—]\s*/, '');
  
  // Remove "Here's the..." patterns that might be missed
  cleaned = cleaned.replace(/^here'?s\s+(?:the\s+)?(?:formatted\s+)?(?:transcript|output|result|summary|content)(?:\s*:)?\s*/i, '');
  
  return cleaned.trim();
}



/**
 * Route segment configuration for streaming AI responses
 * @see lib/route-config.ts - ROUTE_CONFIGS.formatTranscript for documentation
 * 
 * Next.js requires this to be a literal value at build time
 * Allows up to 1 minute for processing large transcripts
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // BotID verification - protect against automated AI formatting abuse
    // Enhanced with proper error handling and CSP-compatible configuration
    try {
      console.log('[BotID] Starting bot verification for AI formatting...');
      const botVerification = await checkBotId();
      console.log('[BotID] Verification result:', { 
        isBot: botVerification.isBot,
        isHuman: botVerification.isHuman,
        isGoodBot: botVerification.isGoodBot,
        bypassed: botVerification.bypassed,
        env: process.env.NODE_ENV 
      });
      
      // More permissive approach: Only block if we're highly confident it's malicious
      // BotID can have false positives, especially on mobile browsers
      // For now, we'll rely on rate limiting as primary protection
      if (botVerification.isBot && !botVerification.isGoodBot) {
        console.warn('[BotID] Potential bot detected but allowing request (mobile browsers can trigger false positives)');
        console.warn('[BotID] User-Agent:', request.headers.get('user-agent') || 'Unknown');
        // Don't block - let rate limiting handle abuse protection
      }
      console.log('[BotID] Request verified as legitimate');
    } catch (botError) {
      console.warn('[BotID] Bot verification failed, allowing request to proceed (graceful degradation):', botError instanceof Error ? botError.message : 'Unknown error');
      // Continue with the request even if BotID fails - this ensures legitimate users are never blocked
    }

    const { transcript, options } = await request.json();
    
    // Process the request
    return formatWithGroqStreamText(transcript, options);
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: ERROR_MESSAGES.GENERIC_PROCESSING_ERROR }),
      { 
        status: HTTP_CONFIG.STATUS_CODES.INTERNAL_SERVER_ERROR, 
        headers: HTTP_CONFIG.HEADERS.JSON 
      }
    );
  }
}

// Format transcript text for AI processing
function formatTranscriptForAI(transcript: any[], options: any): string {
  if (!options.includeTimestamps) {
    // Text only for non-timestamp mode
    return transcript
      .map(segment => segment.text)
      .join(' ');
  }
  
  // Include timestamps for AI to process and maintain
  return transcript
    .map(segment => `[${segment.timestamp}] ${segment.text}`)
    .join(' ');
}


async function formatWithGroqStreamText(transcript: any[], options: any) {
  const groqApiKey = envConfig.groqApiKey;
  
  if (!groqApiKey) {
    throw new Error(ERROR_MESSAGES.SERVICE_NOT_CONFIGURED);
  }
  
  try {
  
  // Get prompts from secure module
  const prompts = buildPrompt(options);
  
  // Check if chunking is needed using LangChain approach
  const useChunking = shouldUseChunking(transcript.length);
  console.log(`Transcript length: ${transcript.length} segments, using chunking: ${useChunking}`);
  
  if (useChunking) {
    return formatWithLangChainChunking(transcript, options, prompts.system);
  }
  
  // For smaller transcripts, use single request with progress
  console.log(`Processing short video with single request, segments: ${transcript.length}`);
  const formattedTranscript = formatTranscriptForAI(transcript, options);
  console.log(`Formatted transcript length: ${formattedTranscript.length} chars`);
  const userPrompt = prompts.user + formattedTranscript;
  
  console.log(`Calling AI with model: ${envConfig.aiModel}, maxTokens: ${envConfig.aiMaxTokens}`);
  console.log(`System prompt length: ${prompts.system.length}, User prompt length: ${userPrompt.length}`);
  
  const result = streamText({
    model: groq(envConfig.aiModel),
    system: prompts.system,
    prompt: userPrompt,
    temperature: envConfig.aiTemperature,
    maxTokens: envConfig.aiMaxTokens,
  });
  
  // Add timeout detection
  let streamStarted = false;
  const streamTimeout = setTimeout(() => {
    if (!streamStarted) {
      console.error('AI stream timeout - no response received after 10 seconds');
    }
  }, 10000);
  
  // Create a transform stream to inject progress markers and clean output
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let firstChunk = true;
  let accumulatedOutput = '';
  let cleaningApplied = false;
  
  let totalChunksReceived = 0;
  
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      try {
        // Send initial progress on first chunk
        if (firstChunk) {
          controller.enqueue(encoder.encode(`__PROGRESS__:${JSON.stringify({ current: 0, total: 1 })}\n`));
          console.log('Starting single transcript processing stream');
          firstChunk = false;
        }
        
        // Validate chunk before processing
        if (!chunk) {
          console.log('Received null/undefined chunk');
          return;
        }
        
        // Log chunk type for debugging
        console.log(`Chunk type: ${typeof chunk}, constructor: ${chunk.constructor.name}`);
        
        let chunkText = '';
        
        // Handle different chunk types
        if (typeof chunk === 'string') {
          chunkText = chunk;
        } else if (chunk instanceof Uint8Array || chunk instanceof ArrayBuffer || ArrayBuffer.isView(chunk)) {
          chunkText = decoder.decode(chunk, { stream: true });
        } else {
          console.error(`Unexpected chunk type: ${typeof chunk}`);
          return;
        }
        
        accumulatedOutput += chunkText;
        totalChunksReceived++;
        
        if (totalChunksReceived === 1) {
          console.log(`Received first AI chunk, length: ${chunkText.length}`);
          console.log(`First chunk content: "${chunkText.substring(0, 100)}"`);
          streamStarted = true;
          clearTimeout(streamTimeout);
        } else if (totalChunksReceived <= 5) {
          console.log(`Chunk ${totalChunksReceived}: ${chunkText.length} chars`);
        }
      } catch (error) {
        console.error('Error in transform stream:', error);
        console.error('Error details:', (error as Error).stack);
        clearTimeout(streamTimeout);
        controller.error(error);
      }
      
      // Apply cleaning to remove commentary only at the beginning
      if (!cleaningApplied && accumulatedOutput.length > 100) {
        const cleaned = cleanAIOutput(accumulatedOutput);
        if (cleaned !== accumulatedOutput) {
          // Commentary was removed - send the cleaned version
          controller.enqueue(encoder.encode(cleaned));
          accumulatedOutput = '';
          cleaningApplied = true;
          return;
        }
        cleaningApplied = true;
      }
      
      // Pass through the original chunk if no cleaning needed
      if (cleaningApplied) {
        controller.enqueue(chunk);
      }
    },
    
    flush(controller) {
      console.log(`Stream flush: Total chunks received: ${totalChunksReceived}, Total output: ${accumulatedOutput.length} chars`);
      
      // Handle any remaining accumulated output
      if (!cleaningApplied && accumulatedOutput) {
        const cleaned = cleanAIOutput(accumulatedOutput);
        console.log(`Flushing cleaned output: ${cleaned.length} chars`);
        controller.enqueue(encoder.encode(cleaned));
      }
      
      // Send completion progress
      controller.enqueue(encoder.encode(`\n__PROGRESS__:${JSON.stringify({ current: 1, total: 1 })}\n`));
    }
  });
  
  return new Response(result.textStream.pipeThrough(transformStream), {
    headers: HTTP_CONFIG.HEADERS.STREAMING
  });
  
  } catch (error) {
    console.error('Error in formatWithGroqStreamText:', error);
    throw error;
  }
}

// LangChain-powered chunking with clean boundaries
async function formatWithLangChainChunking(transcript: any[], options: any, systemPrompt: string) {
  const encoder = new TextEncoder();
  
  try {
    // Get optimal chunk configuration for this transcript
    const chunkConfig = getOptimalChunkConfig(transcript.length);
    
    // Split transcript using LangChain's proven algorithm
    const chunks = await splitTranscriptWithLangChain(
      transcript, 
      chunkConfig, 
      options.includeTimestamps
    );
    
    const totalChunks = chunks.length;
    let processedChunks = 0;
    
    // Get transcript time boundaries for debugging
    const firstTimestamp = transcript[0]?.timestamp || '0:00';
    const lastTimestamp = transcript[transcript.length - 1]?.timestamp || '0:00';
    console.log(`Video duration: ${firstTimestamp} to ${lastTimestamp}`);
    
    // Create streaming response for clean LangChain chunks
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial progress
          controller.enqueue(encoder.encode(`__PROGRESS__:${JSON.stringify({ current: 0, total: totalChunks })}\n`));
          
          // Process each LangChain chunk sequentially with timestamp continuity
          console.log(`Processing ${totalChunks} chunks for transcript formatting`);
          let successfulChunks = 0;
          let accumulatedSegments: any[] = []; // Accumulate segments from skipped chunks
          
          for (let i = 0; i < chunks.length; i++) {
            try {
              const chunk = chunks[i];
              
              // Validate chunk before processing
              if (!chunk || chunk.length === 0) {
                console.warn(`Chunk ${i + 1} is empty, skipping`);
                continue;
              }
              
              // Merge with accumulated segments from previous invalid chunks
              const mergedChunk = [...accumulatedSegments, ...chunk];
              const previousAccumulated = accumulatedSegments.length;
              accumulatedSegments = []; // Reset accumulator
              
              console.log(`[DEBUG] Chunk ${i + 1} - Original segments: ${chunk.length}, Previously accumulated: ${previousAccumulated}, Merged total: ${mergedChunk.length}`);
              
              // Debug: Show first few segments
              if (mergedChunk.length > 0) {
                console.log(`[DEBUG] First segment: timestamp="${mergedChunk[0]?.timestamp}", text="${mergedChunk[0]?.text?.substring(0, 50)}..."`);
                console.log(`[DEBUG] Last segment: timestamp="${mergedChunk[mergedChunk.length-1]?.timestamp}", text="${mergedChunk[mergedChunk.length-1]?.text?.substring(0, 50)}..."`);
              }
              
              // Check for valid timestamps in chunk
              const validTimestamps = mergedChunk.filter(seg => 
                seg.timestamp && 
                seg.timestamp !== '__' && 
                /^\d{1,2}:\d{2}(?::\d{2})?$/.test(seg.timestamp)
              );
              
              const invalidTimestamps = mergedChunk.filter(seg => 
                seg.timestamp && 
                (seg.timestamp === '__' || !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(seg.timestamp))
              );
              
              console.log(`[DEBUG] Valid timestamps: ${validTimestamps.length}, Invalid timestamps: ${invalidTimestamps.length}`);
              
              if (invalidTimestamps.length > 0) {
                console.log(`[DEBUG] Invalid timestamp examples:`, invalidTimestamps.slice(0, 3).map(seg => seg.timestamp));
              }
              
              if (validTimestamps.length === 0 && options.includeTimestamps) {
                console.warn(`[WARNING] Chunk ${i + 1} has no valid timestamps, accumulating ${mergedChunk.length} segments for next chunk`);
                // Accumulate segments for next chunk
                accumulatedSegments = mergedChunk;
                continue;
              }
              
              // Clean invalid timestamps from the chunk
              const cleanedChunk = mergedChunk.map(seg => {
                if (seg.timestamp && (seg.timestamp === '__' || !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(seg.timestamp))) {
                  console.warn(`[CLEAN] Replacing invalid timestamp: "${seg.timestamp}" -> "0:00"`);
                  return { ...seg, timestamp: '0:00' }; // Default to 0:00 for invalid timestamps
                }
                return seg;
              });
              
              console.log(`Processing chunk ${i + 1}/${totalChunks}, segments: ${cleanedChunk.length}, first timestamp: ${cleanedChunk[0]?.timestamp}, last timestamp: ${cleanedChunk[cleanedChunk.length-1]?.timestamp}`);
              const chunkContent = formatTranscriptForAI(cleanedChunk, options);
              
              console.log(`[DEBUG] Chunk ${i + 1} content length: ${chunkContent.length} chars`);
              console.log(`[DEBUG] Chunk ${i + 1} content preview: "${chunkContent.substring(0, 100)}..."`);
              
              // Validate chunk content
              if (!chunkContent || chunkContent.trim().length === 0) {
                console.warn(`[ERROR] Chunk ${i + 1} produced empty content, skipping`);
                continue;
              }
            
            // Get chunk time boundaries for AI context
            const chunkStartTime = cleanedChunk[0]?.timestamp || '0:00';
            const chunkEndTime = cleanedChunk[cleanedChunk.length - 1]?.timestamp || '0:00';
            
            // Build prompts for this chunk with timestamp context
            const prompts = buildPrompt(options);
            const timeContextPrompt = options.includeTimestamps ? 
              `\n\nTIMESTAMP CONTEXT:\n- Video duration: ${firstTimestamp} to ${lastTimestamp}\n- This chunk covers: ${chunkStartTime} to ${chunkEndTime}\n- Ensure timestamps continue sequentially and stay within these bounds\n` : '';
            
            const userPrompt = prompts.user + timeContextPrompt + chunkContent;
            
            // Process chunk with AI
            const result = await streamText({
              model: groq(envConfig.aiModel),
              system: systemPrompt,
              prompt: userPrompt,
              temperature: envConfig.aiTemperature,
              maxTokens: envConfig.aiMaxTokensChunk,
            });
            
            // Collect chunk output
            let chunkOutput = '';
            let streamPartCount = 0;
            console.log(`[DEBUG] Starting to collect AI response for chunk ${i + 1}...`);
            
            for await (const textPart of result.textStream) {
              chunkOutput += textPart;
              streamPartCount++;
              if (streamPartCount <= 3) {
                console.log(`[DEBUG] Stream part ${streamPartCount}: ${textPart.length} chars`);
              }
            }
            
            console.log(`[DEBUG] AI response complete - Total parts: ${streamPartCount}, Total length: ${chunkOutput.length} chars`);
            
            // Clean AI commentary
            let finalOutput = cleanAIOutput(chunkOutput);
            console.log(`[DEBUG] After cleaning - Final output length: ${finalOutput.length} chars`);
            console.log(`Processed chunk ${i + 1} with AI formatting, output length: ${finalOutput.length} chars`);
            
            // Validate output before streaming
            if (!finalOutput || finalOutput.trim().length === 0) {
              console.error(`[ERROR] Chunk ${i + 1} produced empty output`);
              console.error(`[DEBUG] Original AI output was: "${chunkOutput.substring(0, 200)}..."`);
              console.error(`[DEBUG] User prompt length: ${userPrompt.length}, System prompt length: ${systemPrompt.length}`);
              
              // Try to accumulate this chunk for retry with next chunk
              accumulatedSegments = cleanedChunk;
              continue;
            }
            
            // Stream the result
            controller.enqueue(encoder.encode(finalOutput));
            
            processedChunks++;
            successfulChunks++;
            
            // Send progress update
            controller.enqueue(encoder.encode(`\n__PROGRESS__:${JSON.stringify({ current: processedChunks, total: totalChunks })}\n`));
            
            // Add separator between chunks (except for last chunk)
            if (processedChunks < totalChunks) {
              const separator = options.includeTimestamps ? '\n' : '\n\n';
              controller.enqueue(encoder.encode(separator));
            }
            
            } catch (chunkError) {
              console.error(`Error processing chunk ${i + 1}:`, chunkError);
              // Continue with next chunk instead of failing entirely
              controller.enqueue(encoder.encode(`\n[Error processing chunk ${i + 1}]\n`));
            }
          }
          
          // Handle any remaining accumulated segments
          if (accumulatedSegments.length > 0) {
            console.log(`Processing remaining accumulated segments: ${accumulatedSegments.length} segments`);
            try {
              const finalContent = formatTranscriptForAI(accumulatedSegments, options);
              if (finalContent && finalContent.trim()) {
                const prompts = buildPrompt(options);
                const result = await streamText({
                  model: groq(envConfig.aiModel),
                  system: systemPrompt,
                  prompt: prompts.user + finalContent,
                  temperature: envConfig.aiTemperature,
                  maxTokens: envConfig.aiMaxTokensChunk,
                });
                
                let finalOutput = '';
                for await (const textPart of result.textStream) {
                  finalOutput += textPart;
                }
                
                const cleaned = cleanAIOutput(finalOutput);
                if (cleaned.trim()) {
                  controller.enqueue(encoder.encode(cleaned));
                  successfulChunks++;
                }
              }
            } catch (error) {
              console.error('Error processing accumulated segments:', error);
            }
          }
          
          console.log(`Completed processing ${successfulChunks}/${totalChunks} chunks successfully`);
          
          controller.close();
        } catch (error) {
          console.error('Error in LangChain chunking:', error);
          controller.error(error);
        }
      }
    });
    
    return new Response(stream, {
      headers: HTTP_CONFIG.HEADERS.STREAMING
    });
    
  } catch (error) {
    console.error('Error setting up LangChain chunking:', error);
    throw error;
  }
}