# Specification: Remove AI Integration

## Goal
Completely remove all AI-related code, dependencies, and configuration from the YouTube transcript extraction tool to focus solely on simple transcript extraction and copying functionality.

## User Stories
- As a developer, I want a clean codebase without unused AI features so that the application is simpler to maintain
- As a user, I want prominent copy and download buttons so that I can easily get transcripts into my own AI tools

## Specific Requirements

**Complete AI Code Removal**
- Remove all AI-related API routes: `/api/format-transcript/route.ts` and `/api/v1/process/` directory
- Delete AI utility modules: `lib/ai-prompts.ts` and `lib/langchain-splitter.ts`
- Remove AI import statements from all components (cerebras, @ai-sdk/*, streamText, etc.)
- Clean up AI-related constants from `lib/constants.ts` (AI_PROCESSING, FORMAT_STYLES, PARAGRAPH_LENGTHS)
- Remove AI-related environment configuration from `lib/env-config.ts` (cerebrasApiKey, aiModel, aiTemperature, etc.)
- Remove AI validation logic from environment validation functions
- Search codebase for any remaining AI references or commented-out AI code

**Dependency Cleanup**
- Remove from package.json: @ai-sdk/cerebras, @ai-sdk/openai, @deepgram/sdk, @langchain/textsplitters, ai
- Run npm install to regenerate package-lock.json
- Verify no peer dependency warnings remain after removal
- Ensure application builds successfully without AI packages

**Environment Variable Cleanup**
- Remove from .env.example: CEREBRAS_API_KEY, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS, AI_MAX_TOKENS_CHUNK
- Remove from .env.example: DEEPGRAM_API_KEY, BRIGHT_DATA_API_TOKEN (marked unused)
- Keep only: OXYLABS_USERNAME, OXYLABS_PASSWORD
- Update validation logic to no longer require AI-related keys
- Document removal in deployment instructions

**UI Component Updates**
- Remove FormatOptions component entirely from codebase (`components/format-options.tsx`)
- Remove all AI formatting UI elements from `app/page.tsx`
- Enhance copy button prominence in transcript viewer (make it primary action)
- Enhance download button visibility alongside copy button
- Maintain existing glassmorphism design theme and framer-motion animations
- Keep transcript display with timestamps, segments, and scrollable view

**Main Page Simplification (app/page.tsx)**
- Remove format options state management
- Remove AI formatting handlers and streaming logic
- Keep core functionality: URL extraction, language selection, transcript type selection
- Maintain transcript display with copy and download actions
- Keep error handling, loading states, and cache notifications
- Preserve responsive design and animation patterns

**API Route Cleanup**
- Delete entire `/api/v1/process/` directory (contains AI formatting routes)
- Delete `/api/format-transcript/route.ts` completely
- Keep `/api/transcript-oxylabs/route.ts` (core transcript extraction)
- Keep other transcript endpoints (alt1, alt2, alt3, primary, etc.) if they don't use AI
- Update `/api/test-env/route.ts` if it validates AI environment variables

**Documentation Updates**
- Remove AI formatting features from README.md (lines 15-17 mention AI formatting, free tier, ultra-fast processing)
- Remove CEREBRAS_API_KEY setup instructions (lines 57-59)
- Remove AI formatting API route documentation (line 100)
- Update feature list to focus on transcript extraction, copying, and downloading
- Update environment variables table to remove AI-related variables
- Emphasize simplicity and speed of transcript copying workflow

**Constants File Refactoring**
- Remove AI_PROCESSING configuration object entirely
- Remove FORMAT_STYLES configuration object
- Remove PARAGRAPH_LENGTHS configuration object
- Keep TRANSCRIPT_CONFIG, HTTP_CONFIG, ERROR_MESSAGES, API_ROUTE_CONFIG
- Remove type exports: FormatStyle, ParagraphLength (keep TranscriptOrigin, SupportedLanguage)

## Visual Design

No visual assets provided. Follow existing UI patterns from the codebase:
- Use existing glassmorphism theme with backdrop-blur effects
- Maintain purple-to-blue gradient color scheme
- Keep framer-motion animations for smooth transitions
- Make copy/download buttons more prominent using existing button component styles
- Use lucide-react icons (Copy, Download, FileText) consistently

## Existing Code to Leverage

**Transcript Viewer Component (`components/transcript-viewer.tsx`)**
- Already has clean copy and download functionality without AI
- Uses simple clipboard API and blob download pattern
- Can serve as reference for enhancing main page buttons
- Has proper analytics tracking for copy/download actions

**Main Page Core Functionality (`app/page.tsx`)**
- Keep existing URL input, language selector, and transcript type selector
- Preserve transcript display with timestamps and segments
- Maintain animation patterns with AnimatePresence and motion components
- Keep error handling and loading states

**Environment Configuration Pattern (`lib/env-config.ts`)**
- Use existing validation helper functions (safeParseInt, safeParseFloat)
- Simplify validateEnvConfig to only check Oxylabs credentials
- Remove all AI-related configuration properties

**Constants Organization (`lib/constants.ts`)**
- Keep HTTP_CONFIG pattern for consistent headers and status codes
- Maintain ERROR_MESSAGES pattern for standardized error handling
- Preserve TRANSCRIPT_CONFIG for language and origin type management

**Analytics Integration (`lib/analytics.ts`)**
- Keep existing trackExtraction and trackExport patterns
- Remove any AI-specific event tracking
- Maintain error tracking for non-AI features

## Out of Scope
- Adding new features to replace AI functionality (focus is removal only)
- Major UI redesigns beyond making copy/download more prominent
- Changes to core transcript extraction logic or YouTube API integration
- Performance optimizations unrelated to AI removal
- Migration of user data or creation of user-facing announcements
- Creation of feature flags or fallback options for AI
- Gradual deprecation approach (complete removal required)
- Changes to authentication, caching, or rate limiting systems
- Adding alternative formatting options (focus on raw transcript access)
- Modifications to Oxylabs integration or backup transcript sources
