// YouTube URL parsing
export function extractVideoId(url: string): string | null {
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

interface TranscriptOptions {
  language?: string;
  transcriptOrigin?: 'auto_generated' | 'uploader_provided';
}

// Call our API endpoint to extract transcript server-side
export async function extractTranscript(
  videoId: string, 
  provider: 'youtube-transcript' | 'deepgram' | 'brightdata' | 'brightdata-proxy' | 'oxylabs' = 'oxylabs',
  options: TranscriptOptions = {}
) {
  try {
    console.log('[Frontend] Requesting transcript for video ID:', videoId);
    
    // Choose which API to use
    let apiUrl = '/api/transcript'; // Default to youtube-transcript library
    
    if (provider === 'oxylabs') {
      apiUrl = '/api/transcript-oxylabs';
      console.log('[Frontend] Using Oxylabs API');
    } else if (provider === 'brightdata-proxy') {
      apiUrl = '/api/transcript-brightdata-proxy';
      console.log('[Frontend] Using Bright Data Proxy API');
    } else if (provider === 'brightdata') {
      apiUrl = '/api/transcript-brightdata';
      console.log('[Frontend] Using Bright Data API');
    } else if (provider === 'deepgram') {
      apiUrl = '/api/transcript-deepgram';
      console.log('[Frontend] Using Deepgram API');
    } else if (process.env.NEXT_PUBLIC_WORKER_URL) {
      apiUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      console.log('[Frontend] Using Cloudflare Worker');
    } else {
      console.log('[Frontend] Using Vercel API with youtube-transcript');
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        videoId,
        language: options.language || 'en',
        transcriptOrigin: options.transcriptOrigin || 'auto_generated'
      }),
    });
    
    console.log('[Frontend] Response status:', response.status);
    
    const data = await response.json() as { 
      transcript?: any[], 
      error?: string,
      metadata?: any,
      success?: boolean,
      provider?: string,
      segmentCount?: number
    };
    console.log('[Frontend] Response data:', data);
    
    if (!response.ok) {
      console.error('[Frontend] API error:', data.error);
      throw new Error(data.error || 'Failed to fetch transcript');
    }
    
    console.log('[Frontend] Successfully received transcript');
    return data;
  } catch (error) {
    console.error('[Frontend] Extraction error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error?.constructor?.name,
      error
    });
    
    if (error instanceof Error) {
      // Pass through the error message from the API
      throw error;
    }
    throw new Error('Failed to extract transcript. Please check the console for details.');
  }
}