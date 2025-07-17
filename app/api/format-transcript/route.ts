import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { buildPrompt, getChunkConfig, buildChunkPrompt } from '@/lib/ai-prompts';
import { envConfig } from '@/lib/env-config';
import { API_ROUTE_CONFIG, HTTP_CONFIG, ERROR_MESSAGES, AI_PROCESSING } from '@/lib/constants';

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
  
  // Create a transform stream to inject progress markers
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let firstChunk = true;
  
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      // Send initial progress on first chunk
      if (firstChunk) {
        controller.enqueue(encoder.encode(`__PROGRESS__:${JSON.stringify({ current: 0, total: 1 })}\n`));
        firstChunk = false;
      }
      
      // Pass through the original chunk
      controller.enqueue(chunk);
    },
    
    flush(controller) {
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
          
          // Stream each chunk's output as it arrives
          for await (const textPart of result.textStream) {
            controller.enqueue(encoder.encode(textPart));
          }
          
          // Add separator between chunks if needed
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