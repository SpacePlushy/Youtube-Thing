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
  // Standard API routes
  defaultApi: {
    maxDuration: 10, // seconds
    description: 'Standard timeout for API operations'
  },
} as const;

/**
 * Usage in route files:
 *
 * // ❌ This will NOT work - Next.js cannot evaluate at build time:
 * export const maxDuration = ROUTE_CONFIGS.defaultApi.maxDuration;
 *
 * // ✅ This WILL work - use the literal value:
 * export const maxDuration = 10; // See ROUTE_CONFIGS.defaultApi for documentation
 */
