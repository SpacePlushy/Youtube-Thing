# Task Breakdown: Subscription Plans with Clerk Authentication

## Overview
Total Task Groups: 8
Estimated Tasks: 80+

This feature transforms the YouTube transcript extractor from an anonymous tool to a sustainable SaaS product with user accounts, usage tracking, transcript history storage, and four monetization tiers (Free, Starter, Pro, Enterprise).

## Task List

### Phase 1: Environment & Dependencies Setup

#### Task Group 1: Initial Configuration
**Dependencies:** None

- [x] 1.0 Set up project dependencies and environment
  - [x] 1.1 Install Clerk dependencies
    - Add `@clerk/nextjs` package
    - Verify version compatibility with Next.js 15.3
  - [x] 1.2 Install Vercel Postgres dependencies
    - Add `@vercel/postgres` package
    - Verify version compatibility
  - [x] 1.3 Configure environment variables
    - Copy `.env.example` to `.env.local`
    - Add Clerk variables: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
    - Add Clerk routing variables: `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
    - Document Vercel Postgres variables in `.env.example` (auto-populated by Vercel)
    - Verify existing Upstash Redis variables are present
  - [x] 1.4 Update package.json scripts
    - Add database migration script if needed
    - Verify build script compatibility

**Acceptance Criteria:**
- All packages install without conflicts
- `.env.example` documents all required variables
- Project builds successfully with new dependencies

---

### Phase 2: Clerk Authentication Foundation

#### Task Group 2: Authentication Integration
**Dependencies:** Task Group 1

- [x] 2.0 Integrate Clerk authentication
  - [ ] 2.1 Write 2-5 focused tests for authentication
    - Test authenticated route protection
    - Test redirect behavior for unauthenticated users
    - Test Clerk provider initialization
  - [x] 2.2 Wrap application with ClerkProvider
    - Update `app/layout.tsx` to include ClerkProvider
    - Configure Clerk appearance to match glassmorphism theme
    - Set up routing configuration
    - Follow existing layout pattern from `app/layout.tsx`
  - [x] 2.3 Create authentication middleware
    - Create or update `middleware.ts` to integrate clerkMiddleware
    - Use `createRouteMatcher` for protected routes: `/dashboard(.*)`, `/api/transcript/extract`, `/api/transcript/history(.*)`
    - Call `auth().protect()` for protected routes
    - Preserve existing rate limiting logic from `lib/rate-limiter-upstash.ts`
    - Maintain existing security headers (CSP, X-Frame-Options, etc.)
    - Chain middleware execution: Clerk auth → rate limit → security headers
  - [x] 2.4 Create sign-in page
    - Create `app/sign-in/[[...sign-in]]/page.tsx`
    - Use Clerk's `<SignIn />` component
    - Apply glassmorphism styling: backdrop-blur-2xl, bg-white/10, border-white/20
    - Center layout with existing page structure pattern
  - [x] 2.5 Create sign-up page
    - Create `app/sign-up/[[...sign-up]]/page.tsx`
    - Use Clerk's `<SignUp />` component
    - Apply consistent glassmorphism styling
    - Enable email/password, Google OAuth, GitHub OAuth
  - [x] 2.6 Create user profile page
    - Create `app/user-profile/[[...user-profile]]/page.tsx`
    - Use Clerk's `<UserProfile />` component
    - Apply consistent glassmorphism styling
  - [ ] 2.7 Update navigation header
    - Add conditional rendering: unauthenticated → "Sign In"/"Sign Up" buttons
    - Add UserButton component with dropdown for authenticated users
    - Include dropdown items: Dashboard, Settings, Billing, Sign Out
    - Use lucide-react icons: User, CreditCard, Settings, LogOut
    - Follow existing button styling patterns from `app/page.tsx`
  - [ ] 2.8 Ensure authentication tests pass
    - Run ONLY the 2-5 tests written in 2.1
    - Verify protected routes require authentication
    - Verify redirects work correctly

**Acceptance Criteria:**
- The 2-5 tests written in 2.1 pass
- Users can sign up with email/password or OAuth
- Protected routes redirect unauthenticated users to sign-in
- Navigation header shows appropriate UI for auth state
- Clerk provider wraps entire app correctly

---

### Phase 3: Subscription Tier Configuration

#### Task Group 3: Clerk Dashboard Setup
**Dependencies:** Task Group 2

- [x] 3.0 Configure subscription tiers in Clerk Dashboard
  - [x] 3.1 Set up Clerk B2C SaaS billing integration
    - Navigate to Clerk Dashboard → Billing
    - Connect Stripe as payment processor
    - Configure webhook endpoints
  - [x] 3.2 Create Free tier in Clerk Dashboard
    - Name: "Free"
    - Price: $0/month
    - Set publicMetadata field: `subscriptionTier: "free"`
    - Document features: 5 transcripts/day, no history, community support
  - [x] 3.3 Create Starter tier in Clerk Dashboard
    - Name: "Starter"
    - Price: $9/month
    - Set publicMetadata field: `subscriptionTier: "starter"`
    - Document features: 50 transcripts/day, 30-day history, full-text search, priority support
  - [x] 3.4 Create Pro tier in Clerk Dashboard
    - Name: "Pro"
    - Price: $29/month
    - Set publicMetadata field: `subscriptionTier: "pro"`
    - Mark as "Most Popular"
    - Document features: unlimited transcripts, unlimited history, future features (batch, API, export)
  - [x] 3.5 Create Enterprise tier in Clerk Dashboard
    - Name: "Enterprise"
    - Price: $99/month
    - Set publicMetadata field: `subscriptionTier: "enterprise"`
    - Document features: all Pro features + team workspaces, dedicated resources, SLA
  - [x] 3.6 Configure permission structure
    - Add permission flags to tier metadata:
      - `feature:batch-processing` (Pro, Enterprise)
      - `feature:api-access` (Pro, Enterprise)
      - `feature:unlimited-history` (Pro, Enterprise)
      - `feature:team-workspaces` (Enterprise)
  - [x] 3.7 Test subscription flows in Clerk test mode
    - Test checkout for each paid tier
    - Verify metadata is set correctly after subscription
    - Test plan upgrades and downgrades
    - Verify webhook events are received

**Acceptance Criteria:**
- All 4 tiers configured in Clerk Dashboard
- Stripe integration working in test mode
- Metadata fields set correctly for each tier
- Test subscriptions create users with correct tier metadata

---

#### Task Group 4: Tier Helper Functions
**Dependencies:** Task Group 3

- [x] 4.0 Create tier permission helpers
  - [ ] 4.1 Write 2-6 focused tests for tier helpers
    - Test getUserSubscriptionTier returns correct tier
    - Test hasFeatureAccess for different tiers
    - Test getDailyTranscriptLimit returns correct limits
    - Test canAccessHistory for Free vs Starter+ tiers
  - [x] 4.2 Create `lib/clerk-helpers.ts` file
    - Import `createClerkClient` from '@clerk/nextjs/server'
    - Follow existing helper pattern from `lib/youtube.ts`
  - [x] 4.3 Implement getUserSubscriptionTier function
    - Accept userId parameter
    - Fetch user from Clerk API using createClerkClient()
    - Read publicMetadata.subscriptionTier
    - Default to 'free' if not set
    - Return type: 'free' | 'starter' | 'pro' | 'enterprise'
  - [x] 4.4 Implement getDailyTranscriptLimit function
    - Accept tier parameter
    - Return numeric limits: Free=5, Starter=50, Pro/Enterprise=Infinity
    - Use TypeScript const assertion for type safety
  - [x] 4.5 Implement hasFeatureAccess function
    - Accept userId and featureName parameters
    - Check tier and return boolean for feature flags
    - Feature flags: batch-processing, api-access, unlimited-history, team-workspaces
  - [x] 4.6 Implement canAccessHistory function
    - Accept userId parameter
    - Return true for starter/pro/enterprise, false for free
  - [x] 4.7 Add TypeScript types
    - Create type definitions in `lib/types.ts`
    - Add SubscriptionTier type: 'free' | 'starter' | 'pro' | 'enterprise'
    - Add FeatureFlag type for permission checking
    - Follow existing type definition patterns from `lib/types.ts`
  - [ ] 4.8 Ensure tier helper tests pass
    - Run ONLY the 2-6 tests written in 4.1
    - Verify tier detection works correctly
    - Verify feature access checks work

**Acceptance Criteria:**
- The 2-6 tests written in 4.1 pass
- Helper functions return correct values for each tier
- TypeScript types enforce proper tier values
- Functions handle missing/invalid metadata gracefully

---

### Phase 4: Database Schema & Migrations

#### Task Group 5: Vercel Postgres Setup
**Dependencies:** Task Group 2

- [x] 5.0 Create database schema for transcript history
  - [ ] 5.1 Write 2-5 focused tests for database operations
    - Test users_transcripts table CRUD operations
    - Test indexes improve query performance
    - Test foreign key constraints work
  - [x] 5.2 Create database client module
    - Create `lib/db.ts` for Vercel Postgres client
    - Import `sql` from '@vercel/postgres'
    - Follow error handling pattern from `lib/rate-limiter-upstash.ts`
  - [x] 5.3 Create users_transcripts table migration
    - Create SQL file or migration script
    - Fields: id (UUID), user_id (VARCHAR 255), video_id (VARCHAR 255), video_title (TEXT), channel_name (VARCHAR 500), video_duration (INTEGER), transcript_text (TEXT), created_at (TIMESTAMP), updated_at (TIMESTAMP)
    - Primary key: id
    - Indexes: idx_user_created (user_id, created_at DESC), idx_video (video_id)
  - [x] 5.4 Create user_settings table migration
    - Fields: user_id (VARCHAR 255 PRIMARY KEY), default_export_format (VARCHAR 10), email_notifications (BOOLEAN), created_at, updated_at
    - Foreign key: user_id references Clerk users
  - [x] 5.5 Add ON DELETE CASCADE constraints
    - Ensure user deletion cascades to transcripts and settings
    - Follow SQL foreign key constraint syntax
  - [ ] 5.6 Execute migrations
    - Run migrations against Vercel Postgres instance
    - Verify tables created successfully
    - Verify indexes created
    - Test foreign key constraints
  - [ ] 5.7 Ensure database tests pass
    - Run ONLY the 2-5 tests written in 5.1
    - Verify CRUD operations work
    - Verify indexes speed up queries

**Acceptance Criteria:**
- The 2-5 tests written in 5.1 pass
- Both tables created successfully in Vercel Postgres
- Indexes improve query performance on user_id and created_at
- Foreign key constraints enforce data integrity
- Migrations can be re-run safely (idempotent)

---

### Phase 5: Usage Tracking System

#### Task Group 6: Daily Usage Tracking with Redis
**Dependencies:** Task Groups 2, 4

- [x] 6.0 Implement usage tracking infrastructure
  - [ ] 6.1 Write 2-6 focused tests for usage tracking
    - Test usage counter increments correctly
    - Test daily limit enforcement for each tier
    - Test key expiration and TTL
    - Test reset behavior at midnight UTC
  - [x] 6.2 Create usage tracking module
    - Create `lib/usage-tracker.ts`
    - Import Redis client from existing rate limiter pattern
    - Follow structure from `lib/rate-limiter-upstash.ts`
  - [x] 6.3 Implement checkUsageLimit function
    - Accept userId parameter
    - Get today's date in YYYY-MM-DD format
    - Create key: `usage:{userId}:{YYYY-MM-DD}`
    - Get current usage from Redis (default to 0)
    - Fetch user's subscription tier using getUserSubscriptionTier
    - Get daily limit using getDailyTranscriptLimit
    - Return usage stats object: { currentUsage, dailyLimit, tier, canProceed }
  - [x] 6.4 Implement incrementUsage function
    - Accept userId parameter
    - Create key: `usage:{userId}:{YYYY-MM-DD}`
    - Use redis.incr() for atomic increment
    - Set 48-hour TTL using redis.expire (172800 seconds)
    - Return new usage count
  - [x] 6.5 Implement getUsageStats function
    - Accept userId parameter
    - Query current usage from Redis
    - Fetch tier from Clerk
    - Calculate reset time (midnight UTC)
    - Return { currentUsage, dailyLimit, tier, resetTime }
  - [x] 6.6 Add TypeScript types
    - Create UsageStats interface in `lib/types.ts`
    - Fields: currentUsage, dailyLimit, tier, resetTime, canProceed
    - Follow existing type patterns
  - [x] 6.7 Handle Redis unavailable gracefully
    - Add try-catch blocks around Redis operations
    - Log warnings when Redis unavailable (development mode)
    - Default to unlimited usage in development without Redis
    - Follow pattern from `lib/rate-limiter-upstash.ts` lines 38-48
  - [ ] 6.8 Ensure usage tracking tests pass
    - Run ONLY the 2-6 tests written in 6.1
    - Verify limits enforce correctly
    - Verify counters reset daily

**Acceptance Criteria:**
- The 2-6 tests written in 6.1 pass
- Usage counters increment atomically
- Daily limits enforced per tier (5, 50, unlimited)
- Keys expire after 48 hours automatically
- Reset time calculated correctly (midnight UTC)
- Graceful fallback when Redis unavailable

---

### Phase 6: API Endpoints

#### Task Group 7: Transcript Extraction with Usage Tracking
**Dependencies:** Task Groups 5, 6

- [x] 7.0 Update transcript extraction API with authentication and usage tracking
  - [x] 7.1 Write 2-6 focused tests for extraction API
    - Test authenticated requests succeed
    - Test unauthenticated requests return 401
    - Test usage limit enforcement (Free tier at 5/5)
    - Test transcript saves to history for Starter+ tiers
  - [x] 7.2 Update POST /api/transcript/extract
    - Add authentication check using `auth()` from '@clerk/nextjs/server'
    - Return 401 if userId is null
    - Follow existing API route pattern from `app/api/transcript/route.ts`
  - [x] 7.3 Add usage tracking middleware
    - Call checkUsageLimit before extraction
    - Return 429 USAGE_LIMIT_EXCEEDED if limit reached
    - Include usage stats in error response: { currentUsage, dailyLimit, resetTime, tier }
    - Follow error response pattern from existing code
  - [x] 7.4 Increment usage counter after successful extraction
    - Call incrementUsage after transcript extracted
    - Handle errors gracefully (log but don't fail request)
  - [x] 7.5 Add saveToHistory parameter handling
    - Accept optional `saveToHistory` boolean in request body
    - Default to true for Starter/Pro/Enterprise tiers
    - Ignore for Free tier (never save)
    - Validate request body using existing patterns
  - [x] 7.6 Save transcript to database for Starter+ tiers
    - Check tier using canAccessHistory helper
    - Insert into users_transcripts table
    - Include all metadata: user_id, video_id, video_title, channel_name, video_duration, transcript_text
    - Handle database errors gracefully (log but don't fail extraction)
    - Use timestamp helper for created_at/updated_at
  - [x] 7.7 Update response format
    - Include usage stats: { currentUsage, dailyLimit, tier }
    - Maintain existing response structure: { success, transcript, metadata }
    - Add usage field to response type
    - Follow existing JSON response pattern
  - [x] 7.8 Ensure extraction API tests pass
    - Run ONLY the 2-6 tests written in 7.1
    - Verify authentication works
    - Verify usage tracking works
    - Verify history saving works

**Acceptance Criteria:**
- The 2-6 tests written in 7.1 pass
- Unauthenticated requests return 401 with clear message
- Usage limits enforced before extraction
- Transcripts save to database for Starter+ tiers only
- Response includes usage stats
- Existing functionality preserved for valid requests

---

#### Task Group 8: Transcript History API
**Dependencies:** Task Group 5

- [x] 8.0 Create transcript history API endpoints
  - [ ] 8.1 Write 2-8 focused tests for history API
    - Test GET /api/transcript/history returns paginated list
    - Test GET /api/transcript/history/:id returns full transcript
    - Test DELETE /api/transcript/history/:id removes transcript
    - Test Free tier users receive 403 Forbidden
    - Test users can only access their own transcripts
  - [x] 8.2 Create GET /api/transcript/history route
    - Create `app/api/transcript/history/route.ts`
    - Require authentication using auth()
    - Check tier using canAccessHistory helper
    - Return 403 for Free tier users
    - Parse query params: page, limit, sortBy, order
    - Default: page=1, limit=20, sortBy=created_at, order=desc
    - Max limit: 100
  - [x] 8.3 Implement paginated query
    - Query users_transcripts WHERE user_id = authenticatedUserId
    - Select all fields EXCEPT transcript_text (performance)
    - Apply sorting: ORDER BY {sortBy} {order}
    - Apply pagination: LIMIT {limit} OFFSET {(page-1)*limit}
    - Count total records for pagination metadata
    - Use indexes for performance (idx_user_created)
  - [x] 8.4 Format history response
    - Return { transcripts: Array, pagination: { page, limit, total, totalPages } }
    - Convert timestamps to ISO 8601 format
    - Follow existing API response patterns
  - [x] 8.5 Create GET /api/transcript/history/[id]/route.ts
    - Accept transcript id parameter
    - Require authentication
    - Query single transcript including transcript_text field
    - Verify ownership: WHERE id = :id AND user_id = authenticatedUserId
    - Return 404 if not found
    - Return 403 if user doesn't own transcript
  - [x] 8.6 Create DELETE /api/transcript/history/[id]/route.ts
    - Accept transcript id parameter
    - Require authentication
    - Verify ownership before deletion
    - Hard delete from database: DELETE WHERE id = :id AND user_id = authenticatedUserId
    - Return 404 if not found
    - Return 403 if user doesn't own transcript
    - Return success message: { success: true, message: "Transcript deleted successfully" }
  - [x] 8.7 Add TypeScript types for history responses
    - Create TranscriptHistoryItem interface in `lib/types.ts`
    - Create TranscriptHistoryResponse interface
    - Follow existing type patterns from `lib/types.ts`
  - [ ] 8.8 Ensure history API tests pass
    - Run ONLY the 2-8 tests written in 8.1
    - Verify pagination works correctly
    - Verify ownership checks work
    - Verify Free tier denied access

**Acceptance Criteria:**
- The 2-8 tests written in 8.1 pass
- History endpoint returns paginated transcripts for Starter+ users
- Free tier users receive 403 with clear message
- Users can only see their own transcripts
- Single transcript endpoint includes full text
- Delete endpoint removes transcript and verifies ownership
- All responses follow consistent format

---

#### Task Group 9: User Usage Stats API
**Dependencies:** Task Group 6

- [x] 9.0 Create user usage stats API endpoint
  - [ ] 9.1 Write 2-4 focused tests for usage API
    - Test GET /api/user/usage returns current stats
    - Test unauthenticated requests return 401
    - Test correct limits for each tier
  - [x] 9.2 Create GET /api/user/usage route
    - Create `app/api/user/usage/route.ts`
    - Require authentication using auth()
    - Return 401 if not authenticated
    - Follow existing API route patterns
  - [x] 9.3 Fetch usage stats
    - Call getUsageStats from usage-tracker module
    - Pass authenticated userId
    - Handle errors gracefully (return 500 with message)
  - [x] 9.4 Format response
    - Return { currentUsage, dailyLimit, tier, resetTime }
    - resetTime should be ISO 8601 timestamp for midnight UTC
    - Follow existing JSON response pattern
  - [ ] 9.5 Ensure usage API tests pass
    - Run ONLY the 2-4 tests written in 9.1
    - Verify correct stats returned
    - Verify authentication required

**Acceptance Criteria:**
- The 2-4 tests written in 9.1 pass
- Endpoint returns accurate current usage
- Daily limits match user's subscription tier
- Reset time calculated correctly (midnight UTC)
- Unauthenticated requests rejected

---

### Phase 7: User Interface Components

#### Task Group 10: Dashboard Page
**Dependencies:** Task Groups 7, 8, 9

- [x] 10.0 Build user dashboard page
  - [x] 10.1 Write 2-6 focused tests for dashboard
    - Test dashboard renders usage stats correctly
    - Test Free tier shows upgrade CTA
    - Test Starter+ tier shows history list
    - Test pagination controls work
  - [x] 10.2 Create /dashboard route
    - Create `app/dashboard/page.tsx`
    - Use 'use client' directive
    - Require authentication (middleware handles this)
    - Apply glassmorphism theme: backdrop-blur-2xl, bg-white/10, border-white/20, rounded-3xl
    - Follow layout structure from `app/page.tsx`
  - [x] 10.3 Create UsageStatsCard component
    - Create `components/usage-stats-card.tsx`
    - Fetch usage data from `/api/user/usage`
    - Display plan badge with tier name
    - Show usage text: "X/Y transcripts used today" or "Unlimited transcripts"
    - Implement progress bar using patterns from existing smooth-progress-bar if available
    - Calculate percentage: (currentUsage / dailyLimit) * 100
    - Show time until reset (midnight UTC)
    - Display upgrade CTA for Free/Starter users
  - [x] 10.4 Create UpgradeCTA component
    - Create `components/upgrade-cta.tsx`
    - Accept props: currentTier, targetTier, benefits (array), ctaText, redirectTo
    - Display next tier benefits in bulleted list
    - Add upgrade button linking to /pricing
    - Apply glassmorphism button styling with gradient
    - Use framer-motion for hover animations
    - Follow button patterns from `app/page.tsx`
  - [x] 10.5 Create TranscriptHistorySection component
    - Create `components/transcript-history-section.tsx`
    - Fetch history from `/api/transcript/history`
    - Handle Free tier: show "Upgrade to Starter to save your transcript history" message
    - Handle Starter+ with no history: show "No transcripts yet" empty state
    - Display list of TranscriptCard components
    - Implement pagination controls
    - Add sorting dropdown: newest first, oldest first, title A-Z
    - Use lucide-react icons: History, ChevronLeft, ChevronRight
  - [x] 10.6 Create TranscriptCard component
    - Create `components/transcript-card.tsx`
    - Accept props: transcript metadata, onCopy, onDownload, onDelete handlers
    - Display video thumbnail using YouTube thumbnail API: `https://img.youtube.com/vi/{videoId}/mqdefault.jpg`
    - Show video title, channel name, relative date ("2 days ago")
    - Add action buttons: Copy, Download TXT, Download PDF, Delete
    - Use lucide-react icons: Copy, Download, Trash2
    - Apply glassmorphism card styling
    - Add hover animations with framer-motion
  - [x] 10.7 Create BillingManagementSection component
    - Create `components/billing-management-section.tsx`
    - Display current plan name from user metadata
    - Show next renewal date (if applicable)
    - Add "Manage Subscription" button
    - Link to Clerk billing portal using Clerk redirect helper
    - Apply consistent glassmorphism styling
    - Use lucide-react icon: CreditCard
  - [x] 10.8 Implement dashboard data fetching
    - Use React useState and useEffect for data fetching
    - Fetch usage stats on mount
    - Fetch transcript history on mount (if Starter+ tier)
    - Add loading states with skeleton loaders
    - Add error handling with user-friendly messages
    - Follow existing patterns from client components
  - [x] 10.9 Ensure dashboard tests pass
    - Run ONLY the 2-6 tests written in 10.1
    - Verify components render correctly
    - Verify tier-specific UI displays

**Acceptance Criteria:**
- The 2-6 tests written in 10.1 pass
- Dashboard displays usage stats with progress bar
- Free tier shows upgrade CTA, no history
- Starter+ tier shows paginated transcript history
- All cards use glassmorphism styling
- Loading and error states handled gracefully
- Responsive design works on mobile/tablet/desktop

---

#### Task Group 11: Pricing Page
**Dependencies:** Task Group 3

- [x] 11.0 Build pricing page with tier comparison
  - [x] 11.1 Write 2-4 focused tests for pricing page
    - Test pricing page renders all 4 tiers
    - Test authenticated users see appropriate CTAs
    - Test Pro tier highlighted as "Most Popular"
  - [x] 11.2 Create /pricing route
    - Create `app/pricing/page.tsx`
    - Use 'use client' directive
    - No authentication required (public page)
    - Apply glassmorphism theme consistently
  - [x] 11.3 Integrate Clerk PricingTable component
    - Import `<PricingTable />` from '@clerk/nextjs'
    - Configure to display all 4 tiers from Clerk dashboard
    - Customize appearance to match glassmorphism theme
    - Pass appearance prop with custom CSS variables
  - [x] 11.4 Create pricing page header
    - Add title: "Choose Your Plan"
    - Add subtitle: "Perfect for students, professionals, and teams"
    - Apply gradient text effect from existing theme
    - Use framer-motion for entrance animation
  - [x] 11.5 Customize tier cards styling
    - Override Clerk's default styles using CSS modules or Tailwind
    - Apply glassmorphism effects: backdrop-blur-2xl, bg-white/10, border-white/20, rounded-3xl
    - Add Pro tier accent border and "Most Popular" badge
    - Ensure hover states match existing button interactions
  - [x] 11.6 Add feature comparison details
    - List features for each tier:
      - Free: 5/day, no history, community support
      - Starter: 50/day, 30-day history, full-text search, priority support
      - Pro: unlimited transcripts, unlimited history, batch processing (future), API access (future), export formats (future)
      - Enterprise: all Pro features + team workspaces (future), dedicated resources, SLA
    - Mark future features with "(Coming Soon)" badge
    - Use lucide-react icons: Check, X for feature availability
  - [x] 11.7 Handle authenticated vs unauthenticated CTAs
    - Unauthenticated: "Start Free" → /sign-up
    - Authenticated Free user: "Upgrade to Starter" → Clerk checkout
    - Authenticated Starter user: "Upgrade to Pro" → Clerk checkout
    - Enterprise: "Contact Sales" → email link or contact form
    - Use conditional rendering based on auth state
  - [x] 11.8 Ensure pricing page tests pass
    - Run ONLY the 2-4 tests written in 11.1
    - Verify all tiers display
    - Verify styling matches theme

**Acceptance Criteria:**
- The 2-4 tests written in 11.1 pass
- All 4 tiers displayed with accurate pricing
- Pro tier highlighted as "Most Popular"
- Clerk checkout flows work for paid tiers
- Glassmorphism styling applied consistently
- Responsive layout works on all screen sizes
- CTAs adapt based on user auth state

---

### Phase 8: Testing & Quality Assurance

#### Task Group 12: Integration Testing & Gap Analysis
**Dependencies:** Task Groups 1-11

- [x] 12.0 Review existing tests and fill critical gaps only
  - [x] 12.1 Review tests from Task Groups 1-11
    - Count total tests written by previous groups
    - Review authentication tests (2.1)
    - Review tier helper tests (4.1)
    - Review database tests (5.1)
    - Review usage tracking tests (6.1)
    - Review API endpoint tests (7.1, 8.1, 9.1)
    - Review UI component tests (10.1, 11.1)
    - Estimated total: approximately 16-40 existing tests
  - [x] 12.2 Analyze test coverage gaps for THIS feature only
    - Identify critical end-to-end workflows lacking coverage
    - Focus on integration between components (auth + usage + history)
    - Identify edge cases for subscription tier transitions
    - Prioritize user journey tests over unit test gaps
    - Do NOT assess entire application test coverage
  - [x] 12.3 Write up to 10 additional strategic tests maximum
    - Complete user journey: sign up → extract transcript → view dashboard → upgrade
    - Usage limit enforcement across multiple requests
    - Tier upgrade/downgrade flow with metadata verification
    - Transcript history retention policy enforcement (30-day for Starter)
    - Concurrent usage tracking (race condition handling)
    - Midnight UTC reset verification
    - Cross-feature integration (auth + DB + Redis)
    - Focus on end-to-end workflows, not exhaustive coverage
  - [x] 12.4 Run feature-specific tests only
    - Run ONLY tests related to this spec's feature
    - Expected total: approximately 26-50 tests maximum
    - Do NOT run entire application test suite
    - Verify all critical workflows pass
    - Generate test coverage report for new code only

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 26-50 tests total)
- Critical user workflows for subscription system covered
- No more than 10 additional tests added in gap analysis
- Test coverage focused exclusively on this feature
- No regression in existing functionality

---

### Phase 9: Error Handling & Edge Cases

#### Task Group 13: Error States & User Feedback
**Dependencies:** Task Groups 7-11

- [x] 13.0 Implement comprehensive error handling
  - [x] 13.1 Add usage limit exceeded UI
    - Create error modal/toast component
    - Display when 429 error returned from API
    - Show: "Daily limit reached. Upgrade to increase limits."
    - Include current usage, reset time, upgrade CTA
    - Use framer-motion for smooth appearance
  - [x] 13.2 Add authentication error handling
    - Handle 401 errors from protected endpoints
    - Redirect to /sign-in with return URL
    - Show user-friendly message: "Please sign in to continue"
    - Preserve user intent (redirect back after login)
  - [x] 13.3 Add database error handling
    - Handle connection failures gracefully
    - Log errors to console (or monitoring service)
    - Show user-friendly message: "Unable to save transcript. Please try again."
    - Don't block transcript extraction on history save failure
  - [x] 13.4 Add Redis error handling
    - Handle usage tracking failures gracefully
    - Log warnings when Redis unavailable
    - Default to allowing request in development mode
    - Show admin alert in production (don't fail user request)
  - [x] 13.5 Add loading states
    - Add skeleton loaders for dashboard data fetching
    - Add spinner for transcript extraction
    - Add loading state for history pagination
    - Use existing loading patterns if available
  - [x] 13.6 Add empty states
    - Create empty state for transcript history (Free tier)
    - Create empty state for new users with no history
    - Include helpful CTAs and illustrations
    - Use consistent messaging

**Acceptance Criteria:**
- All error states have user-friendly messages
- Loading states prevent user confusion
- Empty states guide users to next actions
- Errors logged for debugging without exposing internals
- Critical operations (extraction) never fail due to non-critical errors (history save)

---

### Phase 10: Documentation & Deployment Prep

#### Task Group 14: Documentation & Configuration
**Dependencies:** All previous task groups

- [x] 14.0 Finalize documentation and deployment configuration
  - [x] 14.1 Update README.md
    - Document authentication setup steps
    - Document Clerk configuration requirements
    - Document environment variables with examples
    - Document database setup and migration steps
    - Document subscription tier configuration
  - [x] 14.2 Update .env.example
    - Document all Clerk variables
    - Document Vercel Postgres variables
    - Document existing Upstash Redis variables
    - Add helpful comments for each variable
    - Include example values (non-sensitive)
  - [x] 14.3 Create database migration guide
    - Document how to run migrations
    - Document how to roll back migrations
    - Document how to seed test data
    - Include SQL scripts or commands
  - [x] 14.4 Create deployment checklist
    - List Vercel environment variables to set
    - List Clerk dashboard configuration steps
    - List database migration steps
    - List testing steps before production deployment
  - [x] 14.5 Update API documentation
    - Document new endpoints: /api/transcript/extract (updated), /api/transcript/history, /api/transcript/history/:id, /api/user/usage
    - Document request/response formats
    - Document error codes and messages
    - Document authentication requirements
    - Include example cURL requests
  - [x] 14.6 Create troubleshooting guide
    - Common issues: Redis connection, Clerk webhooks, database migrations
    - Solutions for each issue
    - Contact information for support
  - [x] 14.7 Verify build configuration
    - Test production build: `npm run build`
    - Verify no TypeScript errors
    - Verify no ESLint errors
    - Verify all environment variables accessed correctly
    - Test build with missing optional variables (graceful degradation)

**Acceptance Criteria:**
- README.md contains complete setup instructions
- .env.example documents all required variables
- Database migrations documented and tested
- API documentation complete and accurate
- Production build succeeds without errors
- Deployment checklist comprehensive

---

## Execution Order

Recommended implementation sequence:

1. **Phase 1: Environment & Dependencies Setup** (Task Group 1)
   - Foundation for all subsequent work
   - Verify compatibility early

2. **Phase 2: Clerk Authentication Foundation** (Task Group 2)
   - Enables protected routes and user identification
   - Required for all user-specific features

3. **Phase 3: Subscription Tier Configuration** (Task Groups 3-4)
   - Configure tiers in Clerk Dashboard
   - Create helper functions for tier checking
   - Enables tier-based access control

4. **Phase 4: Database Schema & Migrations** (Task Group 5)
   - Set up persistent storage for transcript history
   - Required before history API endpoints

5. **Phase 5: Usage Tracking System** (Task Group 6)
   - Implement Redis-based daily limits
   - Required before transcript extraction updates

6. **Phase 6: API Endpoints** (Task Groups 7-9)
   - Update transcript extraction with auth and usage tracking
   - Create history and usage stats endpoints
   - Core backend functionality

7. **Phase 7: User Interface Components** (Task Groups 10-11)
   - Build dashboard and pricing pages
   - Integrate all backend functionality
   - User-facing features

8. **Phase 8: Testing & Quality Assurance** (Task Group 12)
   - Review and fill critical test gaps
   - Verify end-to-end workflows
   - Ensure quality and reliability

9. **Phase 9: Error Handling & Edge Cases** (Task Group 13)
   - Polish user experience
   - Handle edge cases gracefully
   - Improve resilience

10. **Phase 10: Documentation & Deployment Prep** (Task Group 14)
    - Document configuration and deployment
    - Prepare for production launch
    - Enable team collaboration

---

## Key Dependencies Summary

- **Clerk must be set up** before dashboard, history, and usage tracking can work
- **Database schema must exist** before API endpoints can store transcript history
- **Usage tracking must work** before middleware can enforce tier limits
- **Tier helpers must exist** before API endpoints can check permissions
- **API endpoints must work** before UI components can fetch data
- **Authentication must work** before any protected features are accessible

---

## Testing Philosophy

Following the user's testing standards from `agent-os/standards/testing/test-writing.md`:

- **Minimal Tests During Development**: Each task group writes 2-8 focused tests maximum
- **Test Only Core User Flows**: Focus exclusively on critical paths and primary workflows
- **Defer Edge Case Testing**: Address edge cases only if business-critical
- **Strategic Gap Filling**: Test coverage group adds maximum 10 tests to fill critical gaps
- **Feature-Specific Testing**: Run only tests related to this spec's feature (approximately 26-50 tests total)
- **No Exhaustive Coverage**: Skip comprehensive unit tests for all methods and scenarios

---

## Technical Notes

### Reusing Existing Patterns

- **Redis Client**: Follow initialization pattern from `lib/rate-limiter-upstash.ts` (lines 38-48) with graceful fallback
- **API Routes**: Follow structure from `app/api/transcript/route.ts` for error handling and response formats
- **TypeScript Types**: Follow pattern from `lib/types.ts` for interface definitions
- **Glassmorphism Styling**: Follow theme from `app/page.tsx` (backdrop-blur-2xl, bg-white/10, border-white/20, rounded-3xl)
- **Client Components**: Use 'use client' directive, framer-motion for animations, lucide-react for icons

### Alignment with Standards

- **Tech Stack** (`agent-os/standards/global/tech-stack.md`): Using Next.js 15.3, React, Tailwind CSS, Vercel Postgres, Upstash Redis, Clerk authentication
- **API Conventions** (`agent-os/standards/backend/api.md`): RESTful design, consistent naming, appropriate HTTP status codes, query parameters for filtering/pagination
- **Testing Standards** (`agent-os/standards/testing/test-writing.md`): Minimal tests during development, test only core user flows, defer edge cases, strategic gap filling
- **Conventions** (`agent-os/standards/global/conventions.md`): Clear documentation, environment variables for config, version control best practices

### Out of Scope (Future Phases)

The following features are explicitly OUT OF SCOPE for this implementation but infrastructure is prepared:

- Batch processing implementation
- API access implementation
- Team accounts and workspaces
- Collections and tagging system
- Full-text search across transcripts
- Advanced export formats (Markdown, JSON, SRT, styled PDF)
- Priority processing infrastructure
- SLA monitoring and guarantees
- Email notifications
- Mobile app development

---

## Success Metrics

### Functional Success
- Free users can sign up and extract 5 transcripts/day
- Starter users can extract 50/day and access 30-day history
- Pro/Enterprise users have unlimited extractions and history
- Usage limits reset correctly at midnight UTC
- Transcript history saves and retrieves correctly
- Billing management works via Clerk portal
- All API endpoints enforce proper authentication and authorization

### Technical Success
- Zero downtime deployment
- API response times under 500ms
- Database queries optimized with proper indexes
- Redis usage tracking adds <50ms latency
- No authentication/authorization vulnerabilities
- Proper error handling and user feedback
- Production build succeeds without errors

### Business Success
- Clear upgrade path from Free → Starter → Pro
- Free tier conversion rate tracking enabled
- All payment flows functional and secure
- Infrastructure ready for Phase 3-4 features
- Billing infrastructure sustainable and scalable
