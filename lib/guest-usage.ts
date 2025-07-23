/**
 * Guest usage tracker for implementing "one free use" before requiring authentication
 */

interface GuestUsage {
  firstUseTimestamp: number;
  hasUsedFreeExtraction: boolean;
  videoIds: string[]; // Track which videos were extracted
  lastAccessTimestamp: number;
}

export class GuestUsageTracker {
  private static readonly STORAGE_KEY = 'yt_guest_usage';
  private static readonly EXPIRY_DAYS = 30; // Keep track for 30 days
  
  /**
   * Get current guest usage data
   */
  static getUsage(): GuestUsage | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      
      const usage: GuestUsage = JSON.parse(data);
      
      // Check if expired (30 days)
      const expiryTime = this.EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - usage.firstUseTimestamp > expiryTime) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
      
      return usage;
    } catch (error) {
      console.error('Error reading guest usage:', error);
      return null;
    }
  }
  
  /**
   * Mark that the user has used their free extraction
   */
  static markUsed(videoId: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const existing = this.getUsage();
      const now = Date.now();
      
      const usage: GuestUsage = existing || {
        firstUseTimestamp: now,
        hasUsedFreeExtraction: false,
        videoIds: [],
        lastAccessTimestamp: now
      };
      
      usage.hasUsedFreeExtraction = true;
      usage.lastAccessTimestamp = now;
      
      if (!usage.videoIds.includes(videoId)) {
        usage.videoIds.push(videoId);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error('Error saving guest usage:', error);
    }
  }
  
  /**
   * Check if the guest has already used their free extraction
   */
  static hasUsedFreeExtraction(): boolean {
    const usage = this.getUsage();
    return usage?.hasUsedFreeExtraction || false;
  }
  
  /**
   * Get the number of videos extracted by this guest
   */
  static getExtractedVideoCount(): number {
    const usage = this.getUsage();
    return usage?.videoIds.length || 0;
  }
  
  /**
   * Check if a specific video was already extracted
   */
  static hasExtractedVideo(videoId: string): boolean {
    const usage = this.getUsage();
    return usage?.videoIds.includes(videoId) || false;
  }
  
  /**
   * Reset guest usage (useful for development)
   */
  static reset(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  /**
   * Get time since first use in milliseconds
   */
  static getTimeSinceFirstUse(): number | null {
    const usage = this.getUsage();
    if (!usage) return null;
    
    return Date.now() - usage.firstUseTimestamp;
  }
}