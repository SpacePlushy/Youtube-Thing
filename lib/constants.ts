/**
 * Application-wide constants
 * These values are compile-time constants that don't change based on environment
 */

// API Route Configuration
export const API_ROUTE_CONFIG = {
  // Maximum duration for streaming responses in seconds
  // This is a Next.js route segment config requirement
  FORMAT_TRANSCRIPT_MAX_DURATION: 60, // 1 minute for large transcripts
  
  // Default timeout for standard API routes
  DEFAULT_API_TIMEOUT: 10,
} as const;

// AI Processing Configuration
export const AI_PROCESSING = {
  // Chunk size for parallel processing
  DEFAULT_CHUNK_SIZE: 100,
  
  // Token estimation multiplier (average tokens per transcript segment)
  TOKENS_PER_SEGMENT_ESTIMATE: 20,
  
  // Threshold for enabling parallel processing
  PARALLEL_PROCESSING_TOKEN_THRESHOLD: 6000,
  
  // Maximum tokens for single request processing
  MAX_TOKENS_SINGLE_REQUEST: 8000,
  
  // Maximum tokens per chunk in parallel processing
  MAX_TOKENS_PER_CHUNK: 3000,
  
  // Default AI temperature for consistency
  DEFAULT_TEMPERATURE: 0.3,
} as const;

// Transcript Processing
export const TRANSCRIPT_CONFIG = {
  // Cache TTL in days
  CACHE_TTL_DAYS: 7,
  
  // Maximum transcript segments to process
  MAX_SEGMENTS: 10000,
  
  // Supported languages
  SUPPORTED_LANGUAGES: [
    'en', 'es', 'fr', 'de', 'it', 'pt', 
    'ru', 'ja', 'ko', 'zh', 'ar', 'hi'
  ] as const,
  
  // Transcript origin types
  ORIGIN_TYPES: {
    AUTO_GENERATED: 'auto_generated',
    UPLOADER_PROVIDED: 'uploader_provided',
  } as const,
} as const;

// Format Style Configuration
export const FORMAT_STYLES = {
  CLEAN: 'clean',
  SUMMARY: 'summary',
  CHAPTERS: 'chapters',
  BULLETS: 'bullets',
  TIMESTAMPS: 'timestamps',
} as const;

// Paragraph Length Options
export const PARAGRAPH_LENGTHS = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
} as const;

// HTTP Configuration
export const HTTP_CONFIG = {
  HEADERS: {
    STREAMING: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
    },
    JSON: {
      'Content-Type': 'application/json',
    },
  },
  
  STATUS_CODES: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC_PROCESSING_ERROR: 'Failed to process request',
  SERVICE_NOT_CONFIGURED: 'Service not configured',
  INVALID_REQUEST: 'Invalid request format',
  TRANSCRIPT_NOT_FOUND: 'Transcript not available',
  FORMATTING_FAILED: 'Failed to format transcript',
} as const;

// Type exports for type safety
export type FormatStyle = typeof FORMAT_STYLES[keyof typeof FORMAT_STYLES];
export type ParagraphLength = typeof PARAGRAPH_LENGTHS[keyof typeof PARAGRAPH_LENGTHS];
export type TranscriptOrigin = typeof TRANSCRIPT_CONFIG.ORIGIN_TYPES[keyof typeof TRANSCRIPT_CONFIG.ORIGIN_TYPES];
export type SupportedLanguage = typeof TRANSCRIPT_CONFIG.SUPPORTED_LANGUAGES[number];