import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { buildPrompt, getChunkConfig, buildChunkPrompt } from '@/lib/ai-prompts';
import { envConfig } from '@/lib/env-config';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { transcript, options } = await request.json();
    
    // Process the request
    return formatWithGroqStreamText(transcript, options);
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
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
    throw new Error('Service not configured');
  }
  
  // Get prompts from secure module
  const prompts = buildPrompt(options);
  
  // Check if parallel processing is needed
  const chunkConfig = getChunkConfig(transcript.length);
  
  if (chunkConfig.useParallel) {
    return formatWithGroqParallel(transcript, options, prompts.system, chunkConfig.chunkSize);
  }
  
  // For smaller transcripts, use single request
  const formattedTranscript = formatTranscriptForAI(transcript, options);
  const userPrompt = prompts.user + formattedTranscript;
  
  const result = streamText({
    model: groq(envConfig.aiModel),
    system: prompts.system,
    prompt: userPrompt,
    temperature: envConfig.aiTemperature,
    maxTokens: envConfig.aiMaxTokens,
  });
  
  return result.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive'
    }
  });
}

// Parallel processing for long transcripts
async function formatWithGroqParallel(transcript: any[], options: any, systemPrompt: string, chunkSize: number) {
  const chunks = [];
  
  // Split transcript into chunks
  for (let i = 0; i < transcript.length; i += chunkSize) {
    const chunkSegments = transcript.slice(i, i + chunkSize);
    const chunkContent = formatTranscriptForAI(chunkSegments, options);
    
    chunks.push({
      index: i / chunkSize,
      content: chunkContent,
      segments: chunkSegments.length
    });
  }
  
  // Process chunks in parallel
  const processChunk = async (chunk: any) => {
    const chunkSystemPrompt = buildChunkPrompt(systemPrompt, chunk.index, chunks.length);
    const prompts = buildPrompt(options);
    const userPrompt = prompts.user + chunk.content;
    
    const result = await streamText({
      model: groq(envConfig.aiModel),
      system: chunkSystemPrompt,
      prompt: userPrompt,
      temperature: envConfig.aiTemperature,
      maxTokens: envConfig.aiMaxTokensChunk,
    });
    
    // Convert stream to text for parallel processing
    let text = '';
    for await (const textPart of result.textStream) {
      text += textPart;
    }
    
    return {
      index: chunk.index,
      content: text
    };
  };
  
  // Execute all chunks in parallel
  const chunkResults = await Promise.all(chunks.map(processChunk));
  
  // Sort and merge results
  chunkResults.sort((a, b) => a.index - b.index);
  const mergedContent = chunkResults
    .map(result => result.content)
    .join(options.includeTimestamps ? '\n' : '\n\n');
  
  // Return as text stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(mergedContent));
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive'
    }
  });
}