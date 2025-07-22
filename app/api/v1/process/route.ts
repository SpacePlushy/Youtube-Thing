import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Simple unified API that hides all business logic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, data, options } = body;
    
    // Basic validation
    if (!action) {
      return NextResponse.json({ 
        message: 'Invalid request' 
      }, { status: 400 });
    }
    
    switch (action) {
      case 'extract':
        return handleExtraction(url, options);
      case 'format':
        return handleFormatting(data, options, request);
      default:
        return NextResponse.json({ 
          message: 'Invalid action' 
        }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ 
      message: 'Service unavailable' 
    }, { status: 503 });
  }
}

async function handleExtraction(url: string, options: any) {
  // Validate URL server-side only
  if (!url || !isValidVideoUrl(url)) {
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
  
  try {
    // Route to Oxylabs handler (hidden from client)
    const { POST: OxylabsHandler } = await import('../../transcript-oxylabs/route');
    
    const syntheticRequest = new NextRequest(new URL('http://localhost'), {
      method: 'POST',
      body: JSON.stringify({
        videoId,
        language: options?.language || 'en',
        transcriptOrigin: options?.transcriptType === 'manual' 
          ? 'uploader_provided' 
          : 'auto_generated'
      })
    });
    
    const response = await OxylabsHandler(syntheticRequest);
    const result = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({ 
        message: 'Unable to extract transcript' 
      }, { status: 500 });
    }
    
    // Generate session token for caching
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    return NextResponse.json({
      success: true,
      data: result.transcript,
      metadata: {
        duration: calculateDuration(result.transcript),
        language: result.metadata?.actualLanguage || options?.language,
      },
      sessionToken,
    });
  } catch {
    return NextResponse.json({ 
      message: 'Service temporarily unavailable' 
    }, { status: 503 });
  }
}

async function handleFormatting(data: any, options: any, request: NextRequest) {
  // For Gemini formatting - this is okay to be visible per user request
  if (!data || !options?.style) {
    return NextResponse.json({ 
      message: 'Invalid format request' 
    }, { status: 400 });
  }
  
  try {
    // Pass through to existing Gemini formatter
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/format-transcript`, {
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
    
    return new Response(await response.text(), {
      status: response.status,
      headers: response.headers,
    });
  } catch {
    return NextResponse.json({ 
      message: 'Formatting service unavailable' 
    }, { status: 503 });
  }
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

function calculateDuration(transcript: any[]): number {
  if (!transcript || transcript.length === 0) return 0;
  const lastSegment = transcript[transcript.length - 1];
  return (lastSegment.start || 0) + (lastSegment.duration || 0);
}