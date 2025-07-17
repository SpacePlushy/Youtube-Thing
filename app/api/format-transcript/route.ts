import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { buildPrompt, getChunkConfig, buildChunkPrompt, buildSimpleChunkPrompt } from '@/lib/ai-prompts';
import { envConfig } from '@/lib/env-config';
import { API_ROUTE_CONFIG, HTTP_CONFIG, ERROR_MESSAGES, AI_PROCESSING } from '@/lib/constants';

// Helper function to track precise segment positions for overlap removal
function buildPositionTracker(
  chunkSegments: any[], 
  overlap: number, 
  chunkIndex: number,
  startIndex: number
): { overlapEndIndex: number; newContentStartIndex: number; actualStartIndex: number } {
  if (chunkIndex === 0) {
    return { 
      overlapEndIndex: -1, 
      newContentStartIndex: 0,
      actualStartIndex: startIndex 
    };
  }
  
  // Calculate exact indices for overlap removal
  const overlapSegments = Math.min(overlap, chunkSegments.length);
  const overlapEndIndex = overlapSegments - 1; // Last overlap segment index in current chunk
  const newContentStartIndex = overlapSegments; // First new content segment index
  
  return {
    overlapEndIndex,
    newContentStartIndex,
    actualStartIndex: startIndex
  };
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

// Precise overlap removal using position tracking - inspired by LangChain's approach
function removeOverlapPrecisely(
  chunkContent: string,
  positionTracker: any,
  options: any
): string {
  // For subsequent chunks, remove the overlap portion
  const { newContentStartIndex } = positionTracker;
  
  if (options.includeTimestamps) {
    // Parse timestamped content and remove overlapped segments
    const lines = chunkContent.split('\n').filter((line: string) => line.trim());
    const timestampPattern = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]/;
    
    // Skip lines that correspond to overlap segments
    const filteredLines = lines.filter((line: string, index: number) => {
      if (!timestampPattern.test(line)) return true; // Keep non-timestamp lines
      return index >= newContentStartIndex; // Only keep lines after overlap
    });
    
    return filteredLines.join('\n');
  } else {
    // For non-timestamped content, use paragraph-based removal
    const paragraphs = chunkContent.split('\n\n').filter((p: string) => p.trim());
    
    // Estimate which paragraphs to skip based on overlap ratio
    const overlapRatio = newContentStartIndex / (newContentStartIndex + 20); // Estimate total segments
    const paragraphsToSkip = Math.floor(paragraphs.length * overlapRatio);
    
    return paragraphs.slice(paragraphsToSkip).join('\n\n');
  }
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

// Sequential processing with precise position-based overlap removal
async function formatWithGroqSequential(transcript: any[], options: any, systemPrompt: string, chunkSize: number) {
  const encoder = new TextEncoder();
  let processedChunks = 0;
  // Scale overlap based on chunk size (5% of chunk size, min 10, max 50)
  const overlap = Math.min(50, Math.max(10, Math.floor(chunkSize * 0.05)));
  const effectiveChunkSize = chunkSize - overlap; // Adjust for overlap
  const totalChunks = Math.ceil(transcript.length / effectiveChunkSize);
  
  // Track all processed chunks for precise overlap removal
  const processedResults: { content: string; positionTracker: any }[] = [];
  
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
          const chunkIndex = Math.floor(i / effectiveChunkSize);
          
          // Track precise positions for overlap removal
          const positionTracker = buildPositionTracker(chunkSegments, overlap, chunkIndex, startIndex);
          
          // Use simplified prompts - AI focuses only on formatting
          const chunkSystemPrompt = buildSimpleChunkPrompt(systemPrompt, chunkIndex, totalChunks);
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
          
          // Store for precise overlap removal
          processedResults.push({ content: chunkOutput, positionTracker });
          
          // For first chunk, stream immediately. For subsequent chunks, remove overlap first
          let finalOutput = chunkOutput;
          if (chunkIndex > 0) {
            finalOutput = removeOverlapPrecisely(chunkOutput, positionTracker, options);
          }
          
          controller.enqueue(encoder.encode(finalOutput));
          
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