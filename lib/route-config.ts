/**
 * Next.js Route Segment Configuration
 * 
 * IMPORTANT: Next.js requires these values to be static literals at build time.
 * They cannot be computed or referenced from other objects.
 * 
 * This file serves as the single source of truth for route configurations,
 * but the actual exports in route files must use literal values.
 */

// Document the values that should be used in route files
export const ROUTE_CONFIGS = {
  // Format transcript route configuration
  formatTranscript: {
    // Maximum duration for streaming AI responses
    maxDuration: 60, // seconds (1 minute)
    description: 'Allows streaming responses for AI formatting operations on large transcripts'
  },
  
  // Standard API routes
  defaultApi: {
    maxDuration: 10, // seconds
    description: 'Standard timeout for non-streaming API operations'
  },
} as const;

/**
 * Usage in route files:
 * 
 * // ❌ This will NOT work - Next.js cannot evaluate at build time:
 * export const maxDuration = ROUTE_CONFIGS.formatTranscript.maxDuration;
 * 
 * // ✅ This WILL work - use the literal value:
 * export const maxDuration = 30; // See ROUTE_CONFIGS.formatTranscript for documentation
 */