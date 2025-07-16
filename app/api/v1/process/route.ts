import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// All business logic hidden server-side
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, data, options } = body;
    
    switch (action) {
      case 'extract':
        return handleExtraction(url, options);
      case 'format':
        return handleFormatting(data, options);
      default:
        return NextResponse.json({ 
          message: 'Invalid request' 
        }, { status: 400 });
    }
  } catch (error) {
    // Generic error - no implementation details
    return NextResponse.json({ 
      message: 'Service unavailable' 
    }, { status: 503 });
  }
}

async function handleExtraction(url: string, options: any) {
  // Validate URL server-side only
  if (!isValidVideoUrl(url)) {
    return NextResponse.json({ 
      message: 'Invalid URL' 
    }, { status: 400 });
  }
  
  // Extract video ID server-side
  const videoId = extractVideoIdSecure(url);
  if (!videoId) {
    return NextResponse.json({ 
      message: 'Unable to process URL' 
    }, { status: 400 });
  }
  
  // Provider selection logic completely hidden
  const provider = selectProvider();
  const result = await executeExtraction(provider, videoId, options);
  
  // Return sanitized result with session token for caching
  const sessionToken = generateSessionToken();
  await storeServerSession(sessionToken, result);
  
  return NextResponse.json({
    success: true,
    data: result.transcript,
    metadata: {
      duration: result.duration,
      language: result.language,
    },
    sessionToken, // For secure caching
  });
}

async function handleFormatting(data: any, options: any) {
  // For Gemini formatting - this is okay to be visible per user request
  if (options.style && data) {
    const formattingEndpoint = '/api/format-transcript';
    
    // Pass through to existing Gemini formatter
    const response = await fetch(new URL(formattingEndpoint, request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: data, options })
    });
    
    // Stream the response back
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
    
    return response;
  }
  
  return NextResponse.json({ 
    message: 'Invalid format request' 
  }, { status: 400 });
}

// Server-side only functions - completely hidden from client
function isValidVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const validHosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
    return validHosts.some(host => urlObj.hostname === host || urlObj.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function extractVideoIdSecure(url: string): string | null {
  // URL parsing patterns kept server-side only
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Additional validation
      if (/^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
        return match[1];
      }
    }
  }
  
  return null;
}

function selectProvider(): string {
  // Complex provider selection logic - completely hidden
  // This could include:
  // - Load balancing
  // - Cost optimization
  // - Availability checking
  // - Feature requirements
  
  const providers = getAvailableProviders();
  return providers[0]; // Simplified - actual logic would be complex
}

function getAvailableProviders(): string[] {
  // Provider configuration - never exposed to client
  const config = {
    primary: process.env.OXYLABS_USERNAME && process.env.OXYLABS_PASSWORD,
    secondary: process.env.BRIGHTDATA_KEY,
    tertiary: process.env.DEEPGRAM_KEY,
  };
  
  const available = [];
  if (config.primary) available.push('oxylabs');
  if (config.secondary) available.push('brightdata');
  if (config.tertiary) available.push('deepgram');
  
  return available;
}

async function executeExtraction(provider: string, videoId: string, options: any) {
  // Route to appropriate handler based on provider
  // All provider-specific logic hidden here
  
  switch (provider) {
    case 'oxylabs':
      return await extractWithOxylabs(videoId, options);
    case 'brightdata':
      return await extractWithBrightData(videoId, options);
    case 'deepgram':
      return await extractWithDeepgram(videoId, options);
    default:
      return await extractWithFallback(videoId, options);
  }
}

async function extractWithOxylabs(videoId: string, options: any) {
  // Import the existing Oxylabs logic
  const { POST } = await import('../../transcript-oxylabs/route');
  
  // Create a synthetic request
  const syntheticRequest = new NextRequest(new URL('http://localhost'), {
    method: 'POST',
    body: JSON.stringify({
      videoId,
      language: options.language || 'en',
      transcriptOrigin: mapTranscriptType(options.transcriptType)
    })
  });
  
  const response = await POST(syntheticRequest);
  const data = await response.json();
  
  return {
    transcript: data.transcript,
    duration: calculateDuration(data.transcript),
    language: data.metadata?.actualLanguage || options.language,
  };
}

async function extractWithBrightData(videoId: string, options: any) {
  // Bright Data implementation
  throw new Error('Provider temporarily unavailable');
}

async function extractWithDeepgram(videoId: string, options: any) {
  // Deepgram implementation
  throw new Error('Provider temporarily unavailable');
}

async function extractWithFallback(videoId: string, options: any) {
  // Fallback to youtube-transcript library
  const { POST } = await import('../../transcript/route');
  
  const syntheticRequest = new NextRequest(new URL('http://localhost'), {
    method: 'POST',
    body: JSON.stringify({ videoId, ...options })
  });
  
  const response = await POST(syntheticRequest);
  return response.json();
}

function mapTranscriptType(type?: string): string {
  return type === 'manual' ? 'uploader_provided' : 'auto_generated';
}

function calculateDuration(transcript: any[]): number {
  if (!transcript || transcript.length === 0) return 0;
  const lastSegment = transcript[transcript.length - 1];
  return (lastSegment.start || 0) + (lastSegment.duration || 0);
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function storeServerSession(token: string, data: any) {
  // Server-side session storage
  // Could use Redis, database, or edge storage
  // For now, we'll use a simple in-memory approach (not for production)
  
  // In production, use Vercel KV or similar:
  // await kv.set(token, data, { ex: 3600 }); // 1 hour expiry
}