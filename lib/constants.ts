/**
 * Application-wide constants
 * These values are compile-time constants that don't change based on environment
 */

// API Route Configuration
export const API_ROUTE_CONFIG = {
  // Default timeout for standard API routes
  DEFAULT_API_TIMEOUT: 10,
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

// HTTP Configuration
export const HTTP_CONFIG = {
  HEADERS: {
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
} as const;

// Type exports for type safety
export type TranscriptOrigin = typeof TRANSCRIPT_CONFIG.ORIGIN_TYPES[keyof typeof TRANSCRIPT_CONFIG.ORIGIN_TYPES];
export type SupportedLanguage = typeof TRANSCRIPT_CONFIG.SUPPORTED_LANGUAGES[number];
