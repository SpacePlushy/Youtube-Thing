interface CachedTranscript {
  transcript: Array<{text: string, timestamp?: string}>;
  metadata: {duration?: number, language?: string};
  cachedAt: number;
  videoId: string;
  language: string;
  transcriptOrigin: 'auto_generated' | 'uploader_provided';
}

const CACHE_KEY_PREFIX = 'yt_transcript_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class TranscriptCache {
  static getCacheKey(videoId: string, language: string, origin: string): string {
    return `${CACHE_KEY_PREFIX}${videoId}_${language}_${origin}`;
  }

  static get(videoId: string, language: string, origin: string): CachedTranscript | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const key = this.getCacheKey(videoId, language, origin);
      const cached = localStorage.getItem(key);
      
      if (!cached) return null;
      
      const data: CachedTranscript = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - data.cachedAt > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  static set(
    videoId: string, 
    language: string, 
    origin: 'auto_generated' | 'uploader_provided',
    transcript: Array<{text: string, timestamp?: string}>,
    metadata: {duration?: number, language?: string}
  ): void {
    if (typeof window === 'undefined') return;
    
    try {
      const key = this.getCacheKey(videoId, language, origin);
      const data: CachedTranscript = {
        transcript,
        metadata,
        cachedAt: Date.now(),
        videoId,
        language,
        transcriptOrigin: origin
      };
      
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error writing to cache:', error);
      // If localStorage is full, try to clear old entries
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearOldEntries();
        // Try once more
        try {
          const key = this.getCacheKey(videoId, language, origin);
          localStorage.setItem(key, JSON.stringify({
            transcript,
            metadata,
            cachedAt: Date.now(),
            videoId,
            language,
            transcriptOrigin: origin
          }));
        } catch {
          // If it still fails, give up
        }
      }
    }
  }

  static clearOldEntries(): void {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // Find all transcript cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed: CachedTranscript = JSON.parse(data);
            if (now - parsed.cachedAt > CACHE_DURATION) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid entry, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove old entries
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return;
    
    const keysToRemove: string[] = [];
    
    // Find all transcript cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all cache entries
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}