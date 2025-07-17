import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { buildPrompt, getChunkConfig, buildChunkPrompt, buildContextAwareChunkPrompt } from '@/lib/ai-prompts';
import { envConfig } from '@/lib/env-config';
import { API_ROUTE_CONFIG, HTTP_CONFIG, ERROR_MESSAGES, AI_PROCESSING } from '@/lib/constants';

// Helper function to build intelligent context for AI-managed overlap
function buildChunkContext(
  chunkSegments: any[], 
  previousChunkResult: string | null,
  overlap: number, 
  chunkIndex: number,
  options: any
): { contextInfo: string; overlapSegments: any[] } {
  if (chunkIndex === 0) {
    return { 
      contextInfo: 'FIRST CHUNK: Start fresh with complete formatting.',
      overlapSegments: []
    };
  }
  
  // Extract overlap segments for context
  const overlapSegments = chunkSegments.slice(0, Math.min(overlap, chunkSegments.length));
  
  // Build context from previous chunk's ending
  let previousContext = '';
  if (previousChunkResult) {
    const previousLines = previousChunkResult.split('\n').filter(line => line.trim());
    const lastFewLines = previousLines.slice(-10).join('\n'); // Last 10 lines of previous chunk for better context
    previousContext = `PREVIOUS CHUNK ENDED WITH:\n${lastFewLines}`;
  }
  
  const contextInfo = `CONTINUATION CHUNK ${chunkIndex + 1}:
${previousContext}

OVERLAP SEGMENTS (for context):
${formatTranscriptForAI(overlapSegments, options)}

Your task: Continue seamlessly from where the previous chunk ended. Use the overlap segments as context to ensure smooth continuation, but don't duplicate content that was already properly formatted in the previous chunk.`;
  
  return {
    contextInfo,
    overlapSegments
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

// Rolling context window to prevent memory overflow with long transcripts
function maintainContextWindow(previousResult: string | null, newContent: string, maxLines: number = 1000): string {
  if (!previousResult) {
    return newContent;
  }
  
  const combined = previousResult + '\n' + newContent;
  const lines = combined.split('\n').filter(line => line.trim());
  
  // Keep the last N lines for comprehensive context while preventing infinite growth
  if (lines.length > maxLines) {
    return lines.slice(-maxLines).join('\n');
  }
  
  return combined;
}

// AI-powered intelligent overlap resolution using Groq
async function resolveOverlapWithAI(
  chunkContent: string,
  previousChunkResult: string | null,
  overlapSegments: any[],
  options: any
): Promise<string> {
  if (!previousChunkResult) {
    return chunkContent; // First chunk, no overlap to resolve
  }
  
  const overlapContext = formatTranscriptForAI(overlapSegments, options);
  
  const resolutionPrompt = `You are an expert transcript continuity manager. Your task is to ensure seamless flow between transcript chunks.

PREVIOUS CHUNK ENDED WITH:
${previousChunkResult.split('\n').slice(-10).join('\n')}

OVERLAP CONTENT (for reference):
${overlapContext}

CURRENT CHUNK OUTPUT:
${chunkContent}

Your task: Return ONLY the portion of the current chunk that represents NEW content (not duplicated from the previous chunk). Ensure:
1. Seamless continuation from the previous chunk
2. No duplicate timestamps or content
3. Maintain the same formatting style
4. Start exactly where the previous chunk left off

Return only the deduplicated NEW content:`;
  
  try {
    const result = await streamText({
      model: groq(envConfig.aiModel),
      system: 'You are a precise transcript deduplication expert. Return only the new content without any explanations.',
      prompt: resolutionPrompt,
      temperature: 0.1, // Low temperature for consistency
      maxTokens: envConfig.aiMaxTokensChunk,
    });
    
    let resolvedContent = '';
    for await (const textPart of result.textStream) {
      resolvedContent += textPart;
    }
    
    return cleanAIOutput(resolvedContent);
  } catch (error) {
    console.error('AI overlap resolution failed, using fallback:', error);
    return chunkContent; // Fallback to original content
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

// AI-managed sequential processing with intelligent overlap resolution
async function formatWithGroqSequential(transcript: any[], options: any, systemPrompt: string, chunkSize: number) {
  const encoder = new TextEncoder();
  let processedChunks = 0;
  // Scale overlap based on chunk size (5% of chunk size, min 10, max 50)
  const overlap = Math.min(50, Math.max(10, Math.floor(chunkSize * 0.05)));
  const effectiveChunkSize = chunkSize - overlap; // Adjust for overlap
  const totalChunks = Math.ceil(transcript.length / effectiveChunkSize);
  
  // Track processed results for AI context
  let previousChunkResult: string | null = null;
  
  // Create a streaming response that processes chunks sequentially
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial progress metadata
        controller.enqueue(encoder.encode(`__PROGRESS__:${JSON.stringify({ current: 0, total: totalChunks })}\n`));
        
        // Process each chunk sequentially with AI-managed overlap
        for (let i = 0; i < transcript.length; i += effectiveChunkSize) {
          // Include overlap from previous chunk (except for first chunk)
          const startIndex = i === 0 ? 0 : Math.max(0, i - overlap);
          const endIndex = Math.min(transcript.length, i + chunkSize);
          const chunkSegments = transcript.slice(startIndex, endIndex);
          const chunkIndex = Math.floor(i / effectiveChunkSize);
          
          // Build intelligent context for AI-managed overlap
          const { contextInfo, overlapSegments } = buildChunkContext(
            chunkSegments, 
            previousChunkResult, 
            overlap, 
            chunkIndex, 
            options
          );
          
          // Get the non-overlap segments for processing
          const newContentSegments = chunkIndex === 0 
            ? chunkSegments 
            : chunkSegments.slice(overlap);
          const chunkContent = formatTranscriptForAI(newContentSegments, options);
          
          // Use context-aware prompts that help AI understand continuity
          const chunkSystemPrompt = buildContextAwareChunkPrompt(
            systemPrompt, 
            chunkIndex, 
            totalChunks, 
            contextInfo
          );
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
          
          // Use AI to intelligently resolve any overlaps and ensure continuity
          let finalOutput = chunkOutput;
          // TEMPORARILY DISABLED: AI overlap resolution is cutting too much content
          // Prioritizing content preservation over perfect deduplication
          // if (chunkIndex > 0 && previousChunkResult) {
          //   finalOutput = await resolveOverlapWithAI(
          //     chunkOutput, 
          //     previousChunkResult, 
          //     overlapSegments, 
          //     options
          //   );
          // }
          
          // Store this result for the next chunk's context
          previousChunkResult = maintainContextWindow(previousChunkResult, finalOutput || '');
          
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