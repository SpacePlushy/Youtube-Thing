import getVideoId from 'get-video-id';

// YouTube URL parsing with robust handling of various formats
export function extractVideoId(url: string): string | null {
  try {
    // First, try to normalize the URL if it's missing protocol
    let normalizedUrl = url.trim();
    
    // Check if input looks like a plain video ID (11 characters, alphanumeric with - and _)
    const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    if (videoIdPattern.test(normalizedUrl)) {
      console.log('[YouTube] Input appears to be a plain video ID:', normalizedUrl);
      return normalizedUrl;
    }
    
    // Add protocol if missing
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      // Check if it starts with youtube.com or youtu.be
      if (normalizedUrl.match(/^(www\.)?(youtube\.com|youtu\.be)/i)) {
        normalizedUrl = 'https://' + normalizedUrl;
      } else if (normalizedUrl.match(/^youtube\.com|^youtu\.be/i)) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
    }
    
    // Use get-video-id library for robust parsing
    const result = getVideoId(normalizedUrl);
    
    // Only return if it's a YouTube video
    if (result.service === 'youtube' && result.id) {
      console.log('[YouTube] Successfully extracted video ID:', result.id, 'from URL:', normalizedUrl);
      return result.id;
    }
    
    // Fallback to custom patterns for edge cases the library might miss
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/,
      /youtube\.com\/clip\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = normalizedUrl.match(pattern);
      if (match && match[1]) {
        console.log('[YouTube] Extracted video ID using fallback pattern:', match[1]);
        return match[1];
      }
    }
    
    console.error('[YouTube] Could not extract video ID from URL:', url);
    return null;
  } catch (error) {
    console.error('[YouTube] Error parsing URL:', error);
    return null;
  }
}

// Construct a clean YouTube URL from video ID for API consumption
export function constructYouTubeUrl(videoId: string): string {
  // Always return the standard watch URL format which is most compatible
  return `https://www.youtube.com/watch?v=${videoId}`;
}

interface TranscriptOptions {
  language?: string;
  transcriptOrigin?: 'auto_generated' | 'uploader_provided';
}

// Call our API endpoint to extract transcript server-side
export async function extractTranscript(
  videoId: string, 
  provider: 'default' | 'alt1' | 'alt2' | 'alt3' | 'primary' = 'primary',
  options: TranscriptOptions = {},
  customFetch: typeof fetch = fetch
) {
  try {
    console.log('[Frontend] Requesting transcript for video ID:', videoId);
    
    // Choose which API to use
    let apiUrl = '/api/transcript'; // Default endpoint
    
    if (provider === 'primary') {
      apiUrl = '/api/transcript-primary';
      console.log('[Frontend] Using primary transcript API');
    } else if (provider === 'alt3') {
      apiUrl = '/api/transcript-alt3';
      console.log('[Frontend] Using alternative API 3');
    } else if (provider === 'alt2') {
      apiUrl = '/api/transcript-alt2';
      console.log('[Frontend] Using alternative API 2');
    } else if (provider === 'alt1') {
      apiUrl = '/api/transcript-alt1';
      console.log('[Frontend] Using alternative API 1');
    } else if (process.env.NEXT_PUBLIC_WORKER_URL) {
      apiUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      console.log('[Frontend] Using worker API');
    } else {
      console.log('[Frontend] Using default API');
    }
    
    const response = await customFetch(apiUrl, {
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