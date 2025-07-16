// Secure version with minimal client exposure
interface TranscriptOptions {
  language?: string;
  transcriptOrigin?: 'auto_generated' | 'uploader_provided';
}

// Minimal URL validation without exposing patterns
export function validateYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
  } catch {
    return false;
  }
}

// Single endpoint without provider details
export async function fetchTranscript(
  url: string,
  options: TranscriptOptions = {}
) {
  const response = await fetch('/api/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      url, // Send full URL, let server extract ID
      ...options
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch transcript');
  }
  
  return response.json();
}