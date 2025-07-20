import { NextRequest, NextResponse } from 'next/server';

// Unified endpoint that hides provider selection logic
export async function POST(request: NextRequest) {
  try {
    const { url, language = 'en', transcriptOrigin = 'auto_generated' } = await request.json();
    
    // Extract video ID server-side
    const videoId = extractVideoIdSecure(url);
    if (!videoId) {
      return NextResponse.json({ 
        message: 'Invalid URL provided' 
      }, { status: 400 });
    }

    // Provider selection logic hidden server-side
    const provider = selectOptimalProvider();
    
    // Route to appropriate handler internally
    switch (provider) {
      case 'primary':
        return handleOxylabsExtraction(videoId, language, transcriptOrigin);
      case 'fallback':
        return handleFallbackExtraction();
      default:
        return handleDefaultExtraction();
    }
  } catch {
    // Generic error messages
    return NextResponse.json({ 
      message: 'Service temporarily unavailable' 
    }, { status: 503 });
  }
}

// Server-side only functions
function extractVideoIdSecure(url: string): string | null {
  // URL parsing logic stays server-side
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

function selectOptimalProvider(): string {
  // Complex provider selection logic hidden from client
  // Can include load balancing, cost optimization, etc.
  return 'primary';
}

// Import actual handlers from separate files
async function handleOxylabsExtraction(videoId: string, language: string, origin: string) {
  // Implementation hidden in separate module
  const oxylabsModule = await import('../transcript-oxylabs/route');
  
  // Create synthetic request for internal routing
  const syntheticRequest = new NextRequest(
    new URL('http://internal'),
    {
      method: 'POST',
      body: JSON.stringify({
        videoId,
        language,
        transcriptOrigin: origin
      })
    }
  );
  
  return oxylabsModule.POST(syntheticRequest);
}

async function handleFallbackExtraction() {
  // Fallback logic
  return NextResponse.json({ message: 'Service unavailable' }, { status: 503 });
}

async function handleDefaultExtraction() {
  // Default handler
  return NextResponse.json({ message: 'Service unavailable' }, { status: 503 });
}