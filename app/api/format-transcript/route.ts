import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { buildPrompt, getChunkConfig, buildChunkPrompt } from '@/lib/ai-prompts';
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
  return transcript
    .map((segment, index) => {
      if (options.includeTimestamps) {
        const prefix = index === 0 ? '' : '\n';
        return `${prefix}[${segment.timestamp}] ${segment.text}`;
      }
      return segment.text;
    })
    .join(options.includeTimestamps ? ' ' : ' ')
    .replace(/\n /g, '\n');
}

async function formatWithGroqStreamText(transcript: any[], options: any) {
  const groqApiKey = envConfig.groqApiKey;
  
  if (!groqApiKey) {
    throw new Error(ERROR_MESSAGES.SERVICE_NOT_CONFIGURED);
  }
  
  // Get prompts from secure module
  const prompts = buildPrompt(options);
  
  // Check if parallel processing is needed
  const chunkConfig = getChunkConfig(transcript.length);
  
  if (chunkConfig.useParallel) {
    return formatWithGroqSequential(transcript, options, prompts.system, chunkConfig.chunkSize);
  }
  
  // For smaller transcripts, use single request with progress
  const formattedTranscript = formatTranscriptForAI(transcript, options);
  const userPrompt = prompts.user + formattedTranscript;
  
  const result = streamText({
    model: groq(envConfig.aiModel),
    system: prompts.system,
    prompt: userPrompt,
    temperature: envConfig.aiTemperature,
    maxTokens: envConfig.aiMaxTokens,
  });
  
  // Create a transform stream to inject progress markers and clean output
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let firstChunk = true;
  let accumulatedOutput = '';
  let cleaningApplied = false;
  
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      // Send initial progress on first chunk
      if (firstChunk) {
        controller.enqueue(encoder.encode(`__PROGRESS__:${JSON.stringify({ current: 0, total: 1 })}\n`));
        firstChunk = false;
      }
      
      // Accumulate chunks to apply cleaning to the beginning
      const chunkText = decoder.decode(chunk, { stream: true });
      accumulatedOutput += chunkText;
      
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
      // Handle any remaining accumulated output
      if (!cleaningApplied && accumulatedOutput) {
        const cleaned = cleanAIOutput(accumulatedOutput);
        controller.enqueue(encoder.encode(cleaned));
      }
      
      // Send completion progress
      controller.enqueue(encoder.encode(`\n__PROGRESS__:${JSON.stringify({ current: 1, total: 1 })}\n`));
    }
  });
  
  return new Response(result.textStream.pipeThrough(transformStream), {
    headers: HTTP_CONFIG.HEADERS.STREAMING
  });
}

// Sequential processing for long transcripts with proper streaming
async function formatWithGroqSequential(transcript: any[], options: any, systemPrompt: string, chunkSize: number) {
  const encoder = new TextEncoder();
  let processedChunks = 0;
  // Scale overlap based on chunk size (5% of chunk size, min 10, max 50)
  const overlap = Math.min(50, Math.max(10, Math.floor(chunkSize * 0.05)));
  const effectiveChunkSize = chunkSize - overlap; // Adjust for overlap
  const totalChunks = Math.ceil(transcript.length / effectiveChunkSize);
  
  // Create a streaming response that processes chunks sequentially
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial progress metadata
        controller.enqueue(encoder.encode(`__PROGRESS__:${JSON.stringify({ current: 0, total: totalChunks })}\n`));
        
        // Process each chunk sequentially with overlap
        for (let i = 0; i < transcript.length; i += effectiveChunkSize) {
          // Include overlap from previous chunk (except for first chunk)
          const startIndex = i === 0 ? 0 : Math.max(0, i - overlap);
          const endIndex = Math.min(transcript.length, i + chunkSize);
          const chunkSegments = transcript.slice(startIndex, endIndex);
          const chunkContent = formatTranscriptForAI(chunkSegments, options);
          const chunkIndex = Math.floor(i / effectiveChunkSize); // Fix: Use Math.floor for proper integer index
          
          // Build prompts for this chunk
          const chunkSystemPrompt = buildChunkPrompt(systemPrompt, chunkIndex, totalChunks);
          const prompts = buildPrompt(options);
          const userPrompt = prompts.user + chunkContent;
          
          // Stream process this chunk
          const result = await streamText({
            model: groq(envConfig.aiModel),
            system: chunkSystemPrompt,
            prompt: userPrompt,
            temperature: envConfig.aiTemperature,
            maxTokens: envConfig.aiMaxTokensChunk,
          });
          
          // Collect the full chunk output first
          let chunkOutput = '';
          for await (const textPart of result.textStream) {
            chunkOutput += textPart;
          }
          
          // Clean the chunk output to remove any AI commentary
          chunkOutput = cleanAIOutput(chunkOutput);
          
          // Process chunk output based on whether it's overlapping
          if (chunkIndex === 0) {
            // First chunk: output everything
            controller.enqueue(encoder.encode(chunkOutput));
          } else {
            // For subsequent chunks, remove the overlapping content
            if (options.includeTimestamps) {
              // Calculate where the new content should start
              // The original segments have overlap from the previous chunk
              // We want to find where the truly new content begins
              const nonOverlapStartIndex = overlap;
              const firstNewSegment = chunkSegments[nonOverlapStartIndex];
              
              if (firstNewSegment) {
                // Look for this timestamp in the AI output to find where new content starts
                const targetTimestamp = firstNewSegment.timestamp;
                const timestampPatterns = [
                  `\n[${targetTimestamp}]`,      // Most common case
                  `[${targetTimestamp}]`,        // At start of output
                ];
                
                let splitIndex = -1;
                for (const pattern of timestampPatterns) {
                  splitIndex = chunkOutput.indexOf(pattern);
                  if (splitIndex !== -1) {
                    break;
                  }
                }
                
                if (splitIndex !== -1) {
                  // Found the exact split point - use it
                  const newContent = chunkOutput.substring(splitIndex);
                  controller.enqueue(encoder.encode(newContent));
                } else {
                  // Couldn't find exact timestamp - use a safer approach
                  // Look for any timestamp that appears later in the output
                  const allTimestamps = Array.from(chunkOutput.matchAll(/\n?(\[[\d:]+\])/g));
                  
                  if (allTimestamps.length > 0) {
                    // Find the timestamp that appears roughly where we expect new content
                    // This should be after the overlap portion
                    const expectedNewContentRatio = overlap / chunkSegments.length;
                    const targetCharPosition = Math.floor(chunkOutput.length * expectedNewContentRatio);
                    
                    // Find the first timestamp at or after this position
                    const laterTimestamp = allTimestamps.find(match => 
                      match.index !== undefined && match.index >= targetCharPosition
                    );
                    
                    if (laterTimestamp && laterTimestamp.index !== undefined) {
                      const newContent = chunkOutput.substring(laterTimestamp.index);
                      controller.enqueue(encoder.encode(newContent));
                    } else {
                      // Last resort: use middle of the output to avoid most duplication
                      const middlePoint = Math.floor(chunkOutput.length * 0.5);
                      const newContent = chunkOutput.substring(middlePoint);
                      controller.enqueue(encoder.encode(newContent));
                      console.warn(`Could not find reliable split point for chunk ${chunkIndex}, using middle split`);
                    }
                  } else {
                    // No timestamps found at all - output whole chunk with warning
                    controller.enqueue(encoder.encode(chunkOutput));
                    console.warn(`No timestamps found in chunk ${chunkIndex} output`);
                  }
                }
              } else {
                // No clear non-overlap segment - output everything
                controller.enqueue(encoder.encode(chunkOutput));
              }
            } else {
              // No timestamps - use simple text-based deduplication
              // Skip first 1/3 of the output to avoid overlap
              const skipAmount = Math.floor(chunkOutput.length * 0.33);
              const newContent = chunkOutput.substring(skipAmount);
              controller.enqueue(encoder.encode(newContent));
            }
          }
          
          processedChunks++;
          
          // Send progress update after each chunk completes
          controller.enqueue(encoder.encode(`\n__PROGRESS__:${JSON.stringify({ current: processedChunks, total: totalChunks })}\n`));
          
          if (processedChunks < totalChunks) {
            const separator = options.includeTimestamps ? '\n' : '\n\n';
            controller.enqueue(encoder.encode(separator));
          }
        }
        
        // Close the stream when done
        controller.close();
      } catch (error) {
        console.error('Error in sequential processing:', error);
        controller.error(error);
      }
    }
  });
  
  return new Response(stream, {
    headers: HTTP_CONFIG.HEADERS.STREAMING
  });
}