import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { buildPrompt, getChunkConfig, buildChunkPrompt } from '@/lib/ai-prompts';
import { envConfig } from '@/lib/env-config';
import { API_ROUTE_CONFIG, HTTP_CONFIG, ERROR_MESSAGES, AI_PROCESSING } from '@/lib/constants';

// Advanced overlap detection using multiple strategies
function findNonOverlappingContent(
  chunkOutput: string, 
  chunkSegments: any[], 
  overlap: number, 
  includeTimestamps: boolean
): string {
  if (!includeTimestamps) {
    // For non-timestamp content, use conservative text-based splitting
    return chunkOutput.substring(Math.floor(chunkOutput.length * 0.4));
  }

  // Strategy 1: Find target timestamp from original segments
  const targetSegmentIndex = Math.min(overlap, chunkSegments.length - 1);
  const targetTimestamp = chunkSegments[targetSegmentIndex]?.timestamp;
  
  if (targetTimestamp) {
    // Look for exact timestamp match with various formatting
    const timestampPatterns = [
      `\n[${targetTimestamp}]`,      // Newline + timestamp (most common)
      `[${targetTimestamp}]`,        // Start of chunk
      `\n\n[${targetTimestamp}]`,    // Double newline + timestamp
    ];
    
    for (const pattern of timestampPatterns) {
      const splitIndex = chunkOutput.indexOf(pattern);
      if (splitIndex !== -1) {
        return chunkOutput.substring(splitIndex);
      }
    }
  }

  // Strategy 2: Parse all timestamps and find logical break point
  const timestampRegex = /(\n?)(\[[\d:]+\])/g;
  const allMatches = Array.from(chunkOutput.matchAll(timestampRegex));
  
  if (allMatches.length > 1) {
    // Calculate expected break point based on overlap ratio, but be more conservative
    const overlapRatio = Math.min(0.3, overlap / chunkSegments.length); // Cap at 30%
    const expectedBreakPoint = Math.floor(chunkOutput.length * overlapRatio);
    
    // Find the first timestamp that appears after our expected break point
    const validMatch = allMatches.find(match => 
      match.index !== undefined && match.index >= expectedBreakPoint
    );
    
    if (validMatch && validMatch.index !== undefined) {
      return chunkOutput.substring(validMatch.index);
    }
  }

  // Strategy 3: Intelligent content-based overlap detection
  if (allMatches.length > 0) {
    // Look for repeating patterns that might indicate overlap
    const lines = chunkOutput.split('\n');
    const timestampLines = lines.filter(line => /^\[[\d:]+\]/.test(line.trim()));
    
    if (timestampLines.length > 0) {
      // Find a good break point by analyzing timestamp progression - use earlier point to preserve content
      const quarterPoint = Math.floor(timestampLines.length / 4); // Use 1/4 instead of 1/2
      const targetLine = timestampLines[quarterPoint];
      const lineIndex = chunkOutput.indexOf(targetLine);
      
      if (lineIndex !== -1) {
        // Find the start of this line (include any preceding newline)
        let startIndex = lineIndex;
        while (startIndex > 0 && chunkOutput[startIndex - 1] !== '\n') {
          startIndex--;
        }
        if (startIndex > 0 && chunkOutput[startIndex - 1] === '\n') {
          startIndex--; // Include the newline
        }
        return chunkOutput.substring(startIndex);
      }
    }
  }

  // Strategy 4: Conservative fallback - prefer content preservation over perfect deduplication
  // Use a much smaller skip to avoid losing significant content
  const conservativeStart = Math.floor(chunkOutput.length * 0.25);
  const fallbackContent = chunkOutput.substring(conservativeStart);
  
  console.warn('Using conservative overlap detection fallback - preserving more content');
  return fallbackContent;
}

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
            // For subsequent chunks, use advanced overlap detection
            const deduplicatedContent = findNonOverlappingContent(
              chunkOutput, 
              chunkSegments, 
              overlap, 
              options.includeTimestamps
            );
            controller.enqueue(encoder.encode(deduplicatedContent));
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