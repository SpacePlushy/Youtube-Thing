# Specification: Subscription Plans with Clerk Authentication

## Goal
Implement a complete authentication and subscription tier system that transforms the YouTube transcript extractor from an anonymous tool to a sustainable SaaS product with user accounts, usage tracking, transcript history storage, and four monetization tiers (Free, Starter, Pro, Enterprise).

## User Stories
- As a free user, I want to create an account and extract up to 5 transcripts per day so that I can try the service before upgrading
- As a paid subscriber, I want to access my transcript history across devices so that I can reference past extractions
- As a power user, I want unlimited extractions and advanced features so that I can integrate transcripts into my workflow

## Specific Requirements

**Clerk Authentication Integration**
- Integrate @clerk/nextjs package for authentication wrapping the entire Next.js 15.3 app
- Support multiple sign-up/sign-in methods: email/password, Google OAuth, GitHub OAuth
- Create authentication middleware using clerkMiddleware to protect all transcript extraction routes
- Require authentication for ALL usage - no anonymous access allowed (enforces Free tier 5/day limit)
- Create /sign-in, /sign-up, and /user-profile pages using Clerk's prebuilt components
- Add user profile dropdown to navigation header with avatar, Dashboard, Settings, Billing, Sign Out options
- Configure NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL and NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL to redirect to /dashboard

**Subscription Tier Configuration in Clerk Dashboard**
- Configure Clerk's B2C SaaS billing integration with Stripe as the payment processor
- Set up Free tier: $0/month, 5 transcripts/day, no history storage, community support
- Set up Starter tier: $9/month, 50 transcripts/day, 30-day history retention, full-text search, priority email support
- Set up Pro tier: $29/month, unlimited transcripts, unlimited history, collections/tags (future), export formats (future), API access 10k/month (future), batch processing 10 videos (future), priority processing (future)
- Set up Enterprise tier: $99/month, unlimited transcripts, unlimited history, batch processing 50 videos (future), team workspaces 10 users (future), API access 100k/month (future), dedicated resources (future), SLA guarantee (future), dedicated account manager
- Use Clerk's metadata fields to store user subscription tier (free, starter, pro, enterprise) in publicMetadata
- Build permission structure for future features: feature:batch-processing, feature:api-access, feature:unlimited-history, feature:team-workspaces

**Daily Usage Tracking with Upstash Redis**
- Create usage tracking middleware that runs before transcript extraction API calls
- Store daily usage in Upstash Redis with key format: usage:{userId}:{YYYY-MM-DD}
- Increment counter atomically using redis.incr() on each successful transcript extraction
- Set 48-hour TTL on usage keys for automatic cleanup (redis.expire with 172800 seconds)
- Implement tier-based limit checking: Free=5/day, Starter=50/day, Pro=unlimited, Enterprise=unlimited
- Reset counters automatically at midnight UTC (handled by key expiration and new daily keys)
- Return usage statistics in API responses: currentUsage, dailyLimit, tier, resetTime
- Block requests that exceed daily limits with 429 status and clear error message: "Daily limit reached. Upgrade to increase limits."

**Vercel Postgres Database Schema**
- Create users_transcripts table with fields: id (UUID primary key), user_id (VARCHAR 255, Clerk user ID), video_id (VARCHAR 255), video_title (TEXT), channel_name (VARCHAR 500), video_duration (INTEGER seconds), transcript_text (TEXT), created_at (TIMESTAMP WITH TIME ZONE), updated_at (TIMESTAMP WITH TIME ZONE)
- Add indexes: idx_user_created on (user_id, created_at DESC) for fast user history queries, idx_video on (video_id) for deduplication checks
- Create user_settings table for extensibility: user_id (VARCHAR 255 primary key), default_export_format (VARCHAR 10, default 'txt'), email_notifications (BOOLEAN, default true), created_at, updated_at
- Implement automatic retention policies: Free tier users have NO history storage, Starter tier retains 30 days, Pro/Enterprise retain unlimited
- Use foreign key constraints referencing clerk_users(id) with ON DELETE CASCADE for cleanup

**Transcript Extraction API Endpoint**
- Modify POST /api/transcript/extract to require Clerk authentication via auth() helper
- Add usage tracking middleware before extraction logic: check current usage, verify tier limits, increment counter
- Accept request body: { videoUrl: string, saveToHistory?: boolean } where saveToHistory defaults to true for Starter+ tiers and is ignored for Free
- Return response with usage stats: { success, transcript, metadata: { videoId, title, channel, duration }, usage: { currentUsage, dailyLimit, tier } }
- Save transcript to users_transcripts table for Starter/Pro/Enterprise tiers after successful extraction
- Implement error responses: 401 Unauthorized (not signed in), 429 USAGE_LIMIT_EXCEEDED (daily limit reached), 400 Invalid YouTube URL, 500 Transcript extraction failed
- Leverage existing rate-limiter-upstash.ts patterns for Redis interactions

**Transcript History API Endpoints**
- Implement GET /api/transcript/history with query params: page (default 1), limit (default 20, max 100), sortBy (created_at or video_title, default created_at), order (asc or desc, default desc)
- Return paginated transcript list with metadata (exclude transcript_text for performance): { transcripts: Array, pagination: { page, limit, total, totalPages } }
- Require authentication and Starter+ tier using Clerk's has() helper to check permissions
- Implement GET /api/transcript/history/:id to fetch full transcript including transcript_text field
- Verify ownership: user can only access their own transcripts using WHERE user_id = authenticatedUserId
- Implement DELETE /api/transcript/history/:id with ownership verification and soft delete or hard delete
- Return 403 Forbidden for Free tier users attempting to access history endpoints

**User Usage Stats API Endpoint**
- Create GET /api/user/usage endpoint requiring Clerk authentication
- Query Redis for today's usage: redis.get(`usage:{userId}:{YYYY-MM-DD}`) returning currentUsage or 0
- Fetch user's subscription tier from Clerk publicMetadata
- Calculate dailyLimit based on tier (5 for free, 50 for starter, Infinity for pro/enterprise)
- Calculate resetTime as midnight UTC (today + 1 day, set hours to 0:00:00)
- Return JSON: { currentUsage, dailyLimit, tier, resetTime }

**User Dashboard Page**
- Create /dashboard route with three main sections in glassmorphism card style matching existing UI theme
- Usage Stats Section: Display current plan badge (Free, Starter, Pro, Enterprise), show "X/Y transcripts used today" with visual progress bar using existing smooth-progress-bar.tsx patterns, calculate percentage completion, show time until reset (midnight UTC), display upgrade CTA button for Free/Starter users showing next tier benefits
- Transcript History Section (Starter+ only): List transcripts with video thumbnail (from YouTube thumbnail API using videoId), video title, channel name, relative date (e.g., "2 days ago"), quick action buttons for Copy, Download TXT, Download PDF, Delete, implement pagination with 20 items per page, add sorting dropdown (newest first, oldest first, title A-Z), show empty state for Free users: "Upgrade to Starter to save your transcript history", show empty state for Starter+ users with no history: "No transcripts yet. Extract your first transcript!"
- Billing Management Section: Display current plan name and renewal date (from Clerk subscription metadata), add "Manage Subscription" button that redirects to Clerk's hosted billing portal using Clerk's redirect helper, allow users to upgrade/downgrade plans, update payment methods, view invoices, cancel subscriptions

**Pricing Page**
- Create /pricing route using Clerk's PricingTable component which auto-renders configured tiers from Clerk dashboard
- Customize glassmorphism styling to match existing theme: backdrop-blur-2xl, bg-white/10, border-white/20, rounded-3xl
- Display all 4 tiers side-by-side with feature comparison grid
- Highlight Pro tier as "Most Popular" with accent border and badge
- Show clear feature lists: Daily limit, History retention, Search capability, Export formats, API access, Batch processing, Team features, Support level
- Add CTA buttons: "Start Free" (redirects to /sign-up), "Upgrade to Starter" (opens Clerk checkout), "Upgrade to Pro" (opens Clerk checkout), "Contact Sales" for Enterprise
- Show monthly pricing with annual pricing option (future phase)
- Link authenticated users directly to upgrade flows, unauthenticated users to sign-up

**Authentication Middleware Enhancement**
- Enhance existing middleware.ts to integrate clerkMiddleware alongside existing rate limiting and security headers
- Use createRouteMatcher to define protected routes: /dashboard(.*), /api/transcript/extract, /api/transcript/history(.*)
- Call auth().protect() for protected routes to enforce authentication
- Maintain existing rate limiting logic from rate-limiter-upstash.ts for per-IP limits
- Add user-specific rate limiting using Clerk userId as identifier instead of IP for authenticated requests
- Keep existing security headers: CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security
- Chain middleware execution: Clerk auth check, then rate limit check, then security headers

**Tier Permission Helpers**
- Create lib/clerk-helpers.ts with utility functions
- Implement getUserSubscriptionTier(userId): fetches user from Clerk API, reads publicMetadata.subscriptionTier, defaults to 'free' if not set
- Implement hasFeatureAccess(userId, featureName): checks tier and returns boolean for feature flags
- Implement canAccessHistory(userId): returns true for starter/pro/enterprise, false for free
- Implement getDailyTranscriptLimit(tier): returns numeric limits or Infinity for pro/enterprise
- Use Clerk's createClerkClient() for server-side API calls

**Environment Variables Configuration**
- Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY for client-side Clerk SDK initialization
- Add CLERK_SECRET_KEY for server-side Clerk API authentication
- Add NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in and NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up for routing
- Add NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard and NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard for post-auth redirects
- Leverage existing UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for usage tracking
- Add Vercel Postgres variables (auto-populated by Vercel): POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, POSTGRES_USER, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_DATABASE
- Document all variables in .env.example with placeholder values

**UI Component Enhancements**
- Update app/layout.tsx to wrap children with ClerkProvider component
- Add navigation header component with conditional rendering: unauthenticated users see "Sign In" and "Sign Up" buttons, authenticated users see UserButton component with dropdown menu
- Create reusable UpgradeCTA component accepting props: currentTier, targetTier, benefits array, ctaText, redirectTo
- Create UsageProgressBar component extending smooth-progress-bar.tsx with props: currentUsage, limit, tier, showUpgradeCTA
- Create TranscriptCard component for history list with props: transcript metadata, onCopy, onDownload, onDelete handlers
- Apply consistent glassmorphism styling: backdrop-blur-2xl, bg-white/10, border-white/20, hover:bg-white/20 transitions
- Use lucide-react icons consistently: User, CreditCard, Settings, LogOut for user menu, ChartBar for usage, History for transcript history

## Visual Design
No visual assets were provided. Follow the existing glassmorphism UI theme found in app/page.tsx: backdrop-blur-2xl effects, white/10 background opacity, white/20 border colors, rounded-3xl border radius, gradient buttons from purple-600 to blue-600, shadow-2xl drop shadows, animated motion effects with framer-motion.

## Existing Code to Leverage

**Rate Limiting and Redis Patterns (lib/rate-limiter-upstash.ts)**
- Reuse Redis client initialization pattern with graceful fallback when credentials missing
- Replicate sliding window rate limiting structure for user-based usage tracking
- Follow daily key expiration pattern: create keys with date suffix, set TTL for automatic cleanup
- Use increment-and-check pattern: redis.incr() for atomic counter updates, redis.expire() for TTL
- Mirror error handling approach with try-catch blocks and fallback to safe defaults

**API Route Structure (app/api/transcript/route.ts)**
- Follow existing POST handler pattern with NextRequest/NextResponse types
- Maintain error response structure: { error: string, details?: string } with appropriate HTTP status codes
- Use existing timestamp formatting helper formatTimestamp() for consistency
- Replicate logging pattern with descriptive console.log messages prefixed by [API name]
- Keep validation approach: check required fields early, return 400 for invalid input

**Middleware Architecture (middleware.ts)**
- Extend existing middleware.ts by adding Clerk authentication before rate limiting checks
- Preserve security headers configuration and CSP policy
- Maintain development mode detection using process.env.NODE_ENV for relaxed policies
- Keep rate limit header injection pattern using createRateLimitHeaders()
- Follow response header manipulation approach: set custom headers, delete sensitive headers

**TypeScript Type Definitions (lib/types.ts)**
- Create new types following same pattern: export interface structures with clear field documentation
- Add TranscriptHistoryItem, UsageStats, SubscriptionTier, UserDashboardData types
- Extend TranscriptResponse to include usage statistics
- Define API response types for all new endpoints following ErrorResponse pattern

**Component Patterns (components/transcript-viewer.tsx, app/page.tsx)**
- Use client component directive 'use client' for interactive components
- Apply framer-motion for animations: motion.div with initial/animate/exit props
- Follow button styling: flex items-center gap-2, lucide-react icons, hover states with opacity/scale
- Replicate copy-to-clipboard pattern: navigator.clipboard.writeText with try-catch and user notification
- Use useState hooks for local state management and loading indicators

## Out of Scope
- Batch processing implementation (UI and backend logic for processing multiple videos simultaneously)
- API access implementation (generating API keys, rate limiting API endpoints, API documentation)
- Team accounts and workspaces (invitation system, role-based permissions, team billing)
- Collections and tagging system (organizing transcripts into folders, applying tags, filtering by tags)
- Full-text search across transcript history (search UI, search indexing, relevance ranking)
- Advanced export formats beyond TXT (Markdown with formatting, JSON with metadata, SRT subtitle files, PDF with styling)
- Priority processing infrastructure (dedicated processing queues, faster extraction for paid users)
- SLA monitoring and guarantees (uptime tracking, performance metrics, automated alerts)
- Email notifications (welcome emails, usage limit warnings, invoice receipts, feature announcements)
- Mobile app development (native iOS/Android apps, app store submissions)
