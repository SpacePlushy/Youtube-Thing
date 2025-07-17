import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
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

// Format transcript text for AI processing (text only, no timestamps)
function formatTranscriptForAI(transcript: any[], options: any): string {
  // Always send text-only to AI for cleaner processing
  return transcript
    .map(segment => segment.text)
    .join(' ');
}

// Merge AI-formatted text back with original timestamps
function mergeTimestampsWithFormattedText(
  aiFormattedText: string, 
  originalTranscript: any[], 
  options: any
): string {
  if (!options.includeTimestamps) {
    return aiFormattedText;
  }
  
  // Split AI formatted text into sentences/paragraphs
  const formattedParagraphs = aiFormattedText
    .split(/\n\s*\n/)  // Split on paragraph breaks
    .filter(p => p.trim().length > 0);
  
  if (formattedParagraphs.length === 0) {
    return aiFormattedText;
  }
  
  // Calculate timestamps per paragraph based on content distribution
  const segmentsPerParagraph = Math.ceil(originalTranscript.length / formattedParagraphs.length);
  
  return formattedParagraphs
    .map((paragraph, index) => {
      const segmentIndex = index * segmentsPerParagraph;
      const timestamp = originalTranscript[segmentIndex]?.timestamp || '0:00';
      return `[${timestamp}] ${paragraph.trim()}`;
    })
    .join('\n\n');
}

async function formatWithGroqStreamText(transcript: any[], options: any) {
  const groqApiKey = envConfig.groqApiKey;
  
  if (!groqApiKey) {
    throw new Error(ERROR_MESSAGES.SERVICE_NOT_CONFIGURED);
  }
  
  // Get prompts from secure module
  const prompts = buildPrompt(options);
  
  // Check if chunking is needed using LangChain approach
  if (shouldUseChunking(transcript.length)) {
    return formatWithLangChainChunking(transcript, options, prompts.system);
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
          // Commentary was removed - merge with timestamps and send
          const withTimestamps = mergeTimestampsWithFormattedText(cleaned, transcript, options);
          controller.enqueue(encoder.encode(withTimestamps));
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
        const withTimestamps = mergeTimestampsWithFormattedText(cleaned, transcript, options);
        controller.enqueue(encoder.encode(withTimestamps));
      }
      
      // Send completion progress
      controller.enqueue(encoder.encode(`\n__PROGRESS__:${JSON.stringify({ current: 1, total: 1 })}\n`));
    }
  });
  
  return new Response(result.textStream.pipeThrough(transformStream), {
    headers: HTTP_CONFIG.HEADERS.STREAMING
  });
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
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Processing chunk ${i + 1}/${totalChunks}, segments: ${chunk.length}`);
            const chunkContent = formatTranscriptForAI(chunk, options);
            
            // Get chunk time boundaries for AI context
            const chunkStartTime = chunk[0]?.timestamp || '0:00';
            const chunkEndTime = chunk[chunk.length - 1]?.timestamp || '0:00';
            
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
            for await (const textPart of result.textStream) {
              chunkOutput += textPart;
            }
            
            // Clean AI commentary
            let finalOutput = cleanAIOutput(chunkOutput);
            
            // Merge timestamps back with AI-formatted content
            finalOutput = mergeTimestampsWithFormattedText(finalOutput, chunk, options);
            console.log(`Merged timestamps for chunk ${i + 1}`);
            
            // Stream the result
            controller.enqueue(encoder.encode(finalOutput));
            
            processedChunks++;
            
            // Send progress update
            controller.enqueue(encoder.encode(`\n__PROGRESS__:${JSON.stringify({ current: processedChunks, total: totalChunks })}\n`));
            
            // Add separator between chunks (except for last chunk)
            if (processedChunks < totalChunks) {
              const separator = options.includeTimestamps ? '\n' : '\n\n';
              controller.enqueue(encoder.encode(separator));
            }
          }
          
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