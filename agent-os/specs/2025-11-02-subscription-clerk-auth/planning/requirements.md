# Spec Requirements: Subscription Plans with Clerk Authentication

## Initial Description

"I want to build the subscription plan into this website with authentication with clerk"

This spec implements the full Phase 2 foundation from the product roadmap: Clerk authentication integration, subscription tier system, usage tracking, transcript history storage, and user dashboard. This enables the transition from free anonymous usage to a sustainable SaaS business model with Free, Starter, Pro, and Enterprise tiers.

## Product Context

### Alignment with Product Mission
This feature directly enables the core product mission by:
- Allowing users to maintain transcript history across devices
- Enabling organized collections and search functionality for power users
- Protecting service sustainability through usage-based pricing
- Providing upgrade path for professional users who need batch processing and API access

### Roadmap Position
This spec completes Phase 2 (User Accounts & History) and establishes the foundation for Phase 3 (Power User Features) and Phase 4 (Monetization & Scale). It implements roadmap items #5-8 and prepares the infrastructure for items #9-16.

### Technical Foundation
Builds on existing tech stack:
- Next.js 15.3 App Router with TypeScript
- Upstash Redis (already in use for caching)
- Vercel Postgres (to be added for persistent storage)
- Clerk for authentication (referenced in tech-stack.md)
- Existing glassmorphism UI theme

## Requirements Discussion

### First Round Questions

**Q1:** Project setup approach
**Answer:** Start fresh from main branch, create new feature branch for this work. Do NOT use the existing `feature/clerk-authentication` branch.

**Q2:** Subscription tier implementation
**Answer:** Implement all 4 tiers (Free, Starter, Pro, Enterprise) in the initial release. Set up all tiers in Clerk dashboard even though Pro/Enterprise features like batch processing won't be implemented yet.

**Q3:** Payment provider confirmation
**Answer:** Confirmed - use Clerk's built-in B2C SaaS billing features which integrate with Stripe. Clerk handles the payment UI, processing, and plan management.

**Q4:** Usage tracking implementation
**Answer:** Use Upstash Redis for daily usage counters. Reset counters at midnight UTC daily. Implement middleware to check current plan and enforce daily limits before processing transcripts.

**Q5:** Free tier behavior
**Answer:** Free users MUST create a Clerk account to use the service. No anonymous usage. This enables usage tracking (5/day limit) and provides conversion funnel to paid tiers.

**Q6:** Dashboard requirements
**Answer:** Build `/dashboard` page showing:
- Current usage stats (e.g., "3/5 transcripts used today")
- Transcript history list with video metadata
- Link to Clerk's billing portal for plan management (upgrade/downgrade/cancel)

**Q7:** Plan-gated features
**Answer:** Build infrastructure to check tier permissions, but DON'T implement batch processing or API access features yet. Those are Phase 3-4. Focus on usage limits and history access.

**Q8:** Database schema requirements
**Answer:** Use Vercel Postgres for storing:
- Transcript history (user_id, video_id, transcript_data, created_at)
- Usage metadata
- User settings and preferences

### Existing Code to Reference

No similar existing features identified for reference. This is a greenfield implementation building on top of the existing transcript extraction functionality.

### Follow-up Questions

No follow-up questions needed - all requirements are clear and comprehensive.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
Follow existing glassmorphism UI theme from current application. Dashboard should maintain consistent styling with existing pages.

## Requirements Summary

### Functional Requirements

#### 1. Authentication System
- Integrate Clerk for user authentication
- Support email/password and OAuth (Google, GitHub)
- Protect all transcript extraction routes (no anonymous usage)
- Implement protected routes using Clerk middleware
- Add sign-up, sign-in, and user profile pages
- Display user info in navigation header

#### 2. Subscription Tier System
All four tiers must be configured in Clerk dashboard:

**Free Tier**
- 5 transcripts per day
- Account required (no anonymous usage)
- No transcript history (transcripts are ephemeral)
- Community support

**Starter Tier - $9/month**
- 50 transcripts per day
- User account with 30-day history
- Full-text search across history
- Priority email support

**Pro Tier - $29/month**
- Unlimited transcripts
- Unlimited history with collections/tags (future)
- All export formats (MD, JSON, SRT - future)
- API access (10,000 requests/month - future)
- Batch processing up to 10 videos (future)
- Priority processing (future)

**Enterprise Tier - $99/month**
- Everything in Pro tier
- Batch processing up to 50 videos (future)
- Team workspaces up to 10 users (future)
- API access (100,000 requests/month - future)
- Dedicated processing resources (future)
- SLA guarantee (future)
- Dedicated account manager

#### 3. Usage Tracking System
- Store daily usage counts in Upstash Redis
- Key format: `usage:{userId}:{YYYY-MM-DD}`
- Implement automatic reset at midnight UTC
- Track per-user, per-day transcript extractions
- Enforce tier-based daily limits via middleware
- Return clear error messages when limit exceeded

#### 4. Transcript History Storage
- Store transcript metadata in Vercel Postgres
- Include: user_id, video_id, video_title, channel_name, video_duration, transcript_text, created_at, updated_at
- Implement retention policies: 30 days for Starter, unlimited for Pro/Enterprise
- Free tier users: no history storage (transcripts are session-based only)
- Build API endpoints for CRUD operations on history

#### 5. User Dashboard
Build `/dashboard` page with following sections:

**Usage Stats Section**
- Display current daily usage: "3/5 transcripts used today" or "12/50 transcripts used today"
- Show remaining quota with progress bar
- Display tier name (Free, Starter, Pro, Enterprise)
- Upgrade CTA for Free/Starter users showing next tier benefits

**Transcript History Section** (Starter/Pro/Enterprise only)
- List of extracted transcripts with:
  - Video thumbnail
  - Video title and channel name
  - Extraction date/time
  - Quick actions: view, copy, download (TXT, PDF), delete
- Pagination (20 per page)
- Sorting options: date (newest/oldest), video title
- Empty state for users with no history

**Billing Management Section**
- Display current plan and renewal date
- Link to Clerk's billing portal for:
  - Upgrade/downgrade plans
  - Update payment method
  - View invoices
  - Cancel subscription

#### 6. Pricing Page
- Use Clerk's `<PricingTable />` component
- Display all 4 tiers with features comparison
- Clear CTAs: "Start Free", "Upgrade to Starter", etc.
- Highlight Pro tier as "Most Popular"
- Show monthly pricing
- Link to dashboard after sign-up

#### 7. Access Control Infrastructure
- Implement tier checking helper functions
- Use Clerk's `<Protect>` component for UI elements
- Use Clerk's `has()` helper for server-side checks
- Prepare permission structure for future features:
  - `feature:batch-processing`
  - `feature:api-access`
  - `feature:unlimited-history`
  - `feature:team-workspaces`

### Reusability Opportunities

No existing similar features to reuse. However, this implementation will establish patterns for:
- Protected route middleware (reusable for future features)
- Usage tracking infrastructure (reusable for API rate limiting)
- Tier-gated UI components (reusable for batch processing, API access features)
- Database schema patterns (reusable for team accounts, collections)

### Scope Boundaries

**In Scope:**
- Clerk authentication integration (sign-up, sign-in, user management)
- All 4 subscription tiers configured in Clerk dashboard
- Stripe payment processing via Clerk's billing features
- Usage tracking and enforcement for daily limits
- Transcript history storage and retrieval (Starter/Pro/Enterprise)
- User dashboard with usage stats, history, and billing management
- Pricing page with tier comparison
- Middleware for protecting routes and checking permissions
- Database schema for transcript history
- Free tier requires account creation (no anonymous usage)

**Out of Scope (Future Phases):**
- Batch processing implementation (Phase 3)
- API access implementation (Phase 4)
- Team accounts and workspaces (Phase 4)
- Collections and tagging system (Phase 3)
- Full-text search across transcripts (Phase 3)
- Advanced export formats: Markdown, JSON, SRT (Phase 3)
- Priority processing infrastructure (Phase 3)
- SLA monitoring and guarantees (Phase 4)

**Build Infrastructure For (But Don't Implement):**
- Batch processing permissions checking
- API access permissions checking
- Team workspace permissions structure
- Priority processing flag in user metadata

### Technical Considerations

#### Integration Points
- Clerk authentication wraps entire Next.js app via middleware
- Usage tracking middleware runs before transcript extraction endpoints
- Vercel Postgres connects to API routes for history CRUD
- Upstash Redis connects to usage tracking and existing caching
- Clerk billing portal handles all payment UI (external redirect)

#### Existing System Constraints
- Must maintain current transcript extraction functionality
- Must preserve existing glassmorphism UI theme
- Must work with Next.js 15.3 App Router patterns
- Must integrate with existing Upstash Redis instance
- Must deploy to Vercel without infrastructure changes

#### Technology Stack Confirmed
- @clerk/nextjs for authentication
- Clerk's B2C SaaS billing features for subscriptions
- Upstash Redis for usage tracking
- @upstash/redis client (already in use)
- Vercel Postgres for transcript history (new addition)
- @vercel/postgres client
- Next.js 15.3 App Router
- TypeScript 5.x
- Tailwind CSS 3.4 (existing theme)
- React 18

#### Similar Code Patterns to Follow
While no existing features are identical, follow these established patterns:
- API route structure from existing transcript extraction endpoints
- Error handling patterns from current codebase
- TypeScript type definitions for API responses
- Tailwind utility classes and glassmorphism theme
- Component structure and organization

## Database Schema

### Vercel Postgres Tables

#### users_transcripts
```sql
CREATE TABLE users_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,  -- Clerk user ID
  video_id VARCHAR(255) NOT NULL,
  video_title TEXT NOT NULL,
  channel_name VARCHAR(500),
  video_duration INTEGER,  -- seconds
  transcript_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_video (video_id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES clerk_users(id) ON DELETE CASCADE
);
```

#### user_settings (optional, for future extensibility)
```sql
CREATE TABLE user_settings (
  user_id VARCHAR(255) PRIMARY KEY,  -- Clerk user ID
  default_export_format VARCHAR(10) DEFAULT 'txt',  -- 'txt', 'pdf', 'md', 'json', 'srt'
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES clerk_users(id) ON DELETE CASCADE
);
```

### Upstash Redis Keys

#### Daily Usage Tracking
```
Key: usage:{userId}:{YYYY-MM-DD}
Value: integer (count of transcripts extracted today)
TTL: 48 hours (automatic cleanup after 2 days)

Example:
  Key: usage:user_2abc123:2025-11-02
  Value: 3
  TTL: 172800 seconds
```

#### Rate Limiting (existing)
```
Key: ratelimit:{ip}:{endpoint}
Value: integer (request count in window)
TTL: varies by endpoint
```

#### Transcript Cache (existing)
```
Key: transcript:{videoId}
Value: JSON string (cached transcript data)
TTL: 7 days
```

## Middleware Requirements

### Authentication Middleware
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/transcript/extract',
  '/api/transcript/history(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### Usage Tracking Middleware
```typescript
// lib/middleware/usage-tracker.ts
import { auth } from '@clerk/nextjs/server';
import { redis } from '@/lib/redis';
import { getUserSubscriptionTier } from '@/lib/clerk-helpers';

export async function checkUsageLimit() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const usageKey = `usage:${userId}:${today}`;

  const currentUsage = await redis.get<number>(usageKey) ?? 0;
  const tier = await getUserSubscriptionTier(userId);

  const limits = {
    'free': 5,
    'starter': 50,
    'pro': Infinity,
    'enterprise': Infinity,
  };

  const dailyLimit = limits[tier];

  if (currentUsage >= dailyLimit) {
    throw new Error(`Daily limit reached. Upgrade to increase limits.`);
  }

  // Increment usage
  await redis.incr(usageKey);
  await redis.expire(usageKey, 60 * 60 * 48); // 48 hour TTL

  return {
    currentUsage: currentUsage + 1,
    dailyLimit,
    tier,
  };
}
```

## UI/UX Requirements

### Navigation Header Updates
- Add user profile dropdown when authenticated
  - User avatar/initials
  - Dropdown menu: Dashboard, Settings, Billing, Sign Out
- Add "Sign In" / "Sign Up" buttons when unauthenticated
- Display current tier badge (optional, for Pro/Enterprise users)

### Dashboard Page (`/dashboard`)

**Layout Structure:**
```
┌─────────────────────────────────────────┐
│ Dashboard Header                         │
│ Welcome back, [User Name]!              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Usage Stats Card (glassmorphism)        │
│ ┌─────────────────────────────────────┐ │
│ │ [Plan Name] Plan                    │ │
│ │ 3/5 transcripts used today          │ │
│ │ [████████░░░░░░░░] 60%              │ │
│ │                                     │ │
│ │ [Upgrade to Starter →]              │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Transcript History                       │
│ ┌─────────────────────────────────────┐ │
│ │ [Thumb] Video Title                 │ │
│ │         Channel Name · 2 days ago   │ │
│ │         [Copy] [TXT] [PDF] [Delete] │ │
│ ├─────────────────────────────────────┤ │
│ │ [Thumb] Another Video               │ │
│ │         ...                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [← Prev]              [Next →]         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Billing Management                       │
│ Current Plan: Starter                    │
│ Next billing date: Dec 2, 2025          │
│                                         │
│ [Manage Subscription →]                 │
└─────────────────────────────────────────┘
```

**Tier-Specific UI States:**

**Free Tier:**
- Usage stats card shows 5/day limit with upgrade CTA
- Transcript history section shows message: "Upgrade to Starter to save your transcript history"
- Billing section shows: "Current Plan: Free" with "Upgrade to Starter" button

**Starter/Pro/Enterprise:**
- Usage stats card shows tier-appropriate limit (50/day or "Unlimited")
- Transcript history section displays list with pagination
- Billing section shows next renewal date and "Manage Subscription" link to Clerk portal

### Pricing Page (`/pricing`)

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Choose Your Plan                          │
│          Perfect for students, professionals, and teams      │
└─────────────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│   Free   │  Starter │   Pro    │Enterprise│
│          │          │MOST      │          │
│   $0     │   $9/mo  │POPULAR   │  $99/mo  │
│          │          │  $29/mo  │          │
├──────────┼──────────┼──────────┼──────────┤
│ 5/day    │ 50/day   │Unlimited │Unlimited │
│          │          │          │          │
│ Features │ Features │ Features │ Features │
│ ...      │ ...      │ ...      │ ...      │
│          │          │          │          │
│[Sign Up] │[Upgrade] │[Upgrade] │[Contact] │
└──────────┴──────────┴──────────┴──────────┘
```

Use Clerk's `<PricingTable />` component which automatically:
- Displays configured tiers from Clerk dashboard
- Handles checkout flows
- Shows current plan state for logged-in users
- Manages upgrade/downgrade logic

### Usage Limit Exceeded UI

**In-App Error State:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Daily Limit Reached                  │
│                                         │
│ You've used all 5 transcripts for      │
│ today. Your limit resets at midnight   │
│ UTC (in 6 hours).                      │
│                                         │
│ Want more transcripts?                  │
│                                         │
│ [Upgrade to Starter (50/day) →]        │
│ [View Pricing Plans]                   │
└─────────────────────────────────────────┘
```

**API Error Response:**
```json
{
  "error": "USAGE_LIMIT_EXCEEDED",
  "message": "Daily transcript limit reached. Upgrade to increase limits.",
  "details": {
    "currentUsage": 5,
    "dailyLimit": 5,
    "resetTime": "2025-11-03T00:00:00Z",
    "tier": "free"
  }
}
```

### Protected Route Redirects
- Unauthenticated users accessing `/dashboard` → redirect to `/sign-in`
- Unauthenticated users calling `/api/transcript/extract` → 401 error with message: "Please sign in to extract transcripts"

## Environment Variables

### Required New Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Vercel Postgres (auto-populated by Vercel)
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_USER=default
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=verceldb
```

### Existing Variables (Already Configured)
```bash
# Upstash Redis (already in use)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Vercel Analytics (already in use)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=...
```

## API Endpoints

### New Endpoints to Implement

#### `POST /api/transcript/extract`
**Purpose:** Extract transcript with usage tracking
**Authentication:** Required (Clerk)
**Request Body:**
```typescript
{
  videoUrl: string;
  saveToHistory?: boolean; // default: true for Starter+, ignored for Free
}
```
**Response:**
```typescript
{
  success: true;
  transcript: string;
  metadata: {
    videoId: string;
    title: string;
    channel: string;
    duration: number;
  };
  usage: {
    currentUsage: number;
    dailyLimit: number;
    tier: string;
  };
}
```
**Errors:**
- 401: Unauthorized (not signed in)
- 429: USAGE_LIMIT_EXCEEDED
- 400: Invalid YouTube URL
- 500: Transcript extraction failed

#### `GET /api/transcript/history`
**Purpose:** Fetch user's transcript history
**Authentication:** Required (Clerk, Starter+ tier)
**Query Params:**
```typescript
{
  page?: number; // default: 1
  limit?: number; // default: 20, max: 100
  sortBy?: 'created_at' | 'video_title'; // default: created_at
  order?: 'asc' | 'desc'; // default: desc
}
```
**Response:**
```typescript
{
  transcripts: Array<{
    id: string;
    videoId: string;
    videoTitle: string;
    channelName: string;
    videoDuration: number;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```
**Errors:**
- 401: Unauthorized
- 403: Forbidden (Free tier user)

#### `GET /api/transcript/history/:id`
**Purpose:** Fetch full transcript by ID
**Authentication:** Required (Clerk, must own transcript)
**Response:**
```typescript
{
  id: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  videoDuration: number;
  transcriptText: string;
  createdAt: string;
}
```
**Errors:**
- 401: Unauthorized
- 403: Forbidden (not owner)
- 404: Transcript not found

#### `DELETE /api/transcript/history/:id`
**Purpose:** Delete transcript from history
**Authentication:** Required (Clerk, must own transcript)
**Response:**
```typescript
{
  success: true;
  message: "Transcript deleted successfully";
}
```
**Errors:**
- 401: Unauthorized
- 403: Forbidden (not owner)
- 404: Transcript not found

#### `GET /api/user/usage`
**Purpose:** Get current usage stats
**Authentication:** Required (Clerk)
**Response:**
```typescript
{
  currentUsage: number;
  dailyLimit: number;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  resetTime: string; // ISO 8601 timestamp for midnight UTC
}
```
**Errors:**
- 401: Unauthorized

## Testing Considerations

### Unit Tests
- Usage tracking logic (increment, limit checking, reset)
- Tier permission helpers
- Database query functions
- API route handlers

### Integration Tests
- Clerk authentication flow (sign-up, sign-in, sign-out)
- Usage limit enforcement across multiple requests
- Transcript history CRUD operations
- Tier-based access control

### E2E Tests
- Complete user journey: sign up → extract transcript → view dashboard → upgrade plan
- Usage limit reached → upgrade flow → increased limit verification
- Transcript history: save → retrieve → delete
- Billing portal navigation (redirect to Clerk)

### Manual Testing Scenarios

**Free Tier User:**
1. Sign up with email
2. Extract 5 transcripts successfully
3. Attempt 6th transcript → see limit exceeded error
4. Wait for midnight UTC → limit resets
5. Navigate to dashboard → see "Upgrade to save history" message
6. Click upgrade → redirected to pricing page

**Starter Tier User:**
1. Sign up and subscribe to Starter ($9/mo)
2. Extract 10 transcripts throughout the day
3. View dashboard → see all 10 in history
4. Extract 50 transcripts → verify limit
5. Attempt 51st → see limit exceeded
6. Click "Manage Subscription" → redirected to Clerk portal
7. Downgrade to Free → verify history retention policy (30 days)

**Pro Tier User:**
1. Sign up and subscribe to Pro ($29/mo)
2. Extract 100+ transcripts → verify no limit
3. View dashboard → see all transcripts with pagination
4. Test search and sorting (when implemented)
5. Verify "unlimited" display in usage stats

### Test Data Setup
- Create test users for each tier in Clerk dashboard
- Use Clerk test mode for development
- Seed database with sample transcripts for each test user
- Mock Upstash Redis for unit tests
- Use separate test database for integration tests

## Implementation Phases

### Phase 1: Authentication Foundation
1. Install and configure Clerk
2. Add authentication middleware
3. Create sign-in, sign-up pages
4. Add user menu to navigation
5. Protect existing transcript extraction route

### Phase 2: Database & Storage
1. Set up Vercel Postgres
2. Create database schema (migrations)
3. Build transcript history API endpoints
4. Implement CRUD operations with proper auth checks

### Phase 3: Usage Tracking
1. Build usage tracking middleware using Upstash Redis
2. Integrate with transcript extraction endpoint
3. Implement daily limit enforcement
4. Add usage stats API endpoint
5. Test limit reset at midnight UTC

### Phase 4: Subscription Tiers
1. Configure all 4 tiers in Clerk dashboard
2. Connect Stripe payment method
3. Test checkout flows for each tier
4. Implement tier checking helpers
5. Add tier-based access control

### Phase 5: User Dashboard
1. Build dashboard page layout
2. Add usage stats card with tier display
3. Implement transcript history list with pagination
4. Add billing management section with Clerk portal link
5. Create empty states and upgrade CTAs

### Phase 6: Pricing Page
1. Integrate Clerk's `<PricingTable />` component
2. Customize styling to match glassmorphism theme
3. Add feature comparison details
4. Test upgrade/downgrade flows

### Phase 7: Polish & Testing
1. Add loading states and error handling
2. Implement E2E test suite
3. Test all user journeys for each tier
4. Performance testing for high usage scenarios
5. Security audit of authentication and data access

## Success Criteria

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

### Business Success
- Clear upgrade path from Free → Starter → Pro
- Free tier conversion rate tracking enabled
- All payment flows functional and secure
- Infrastructure ready for Phase 3-4 features
- Billing infrastructure sustainable and scalable

## Notes

- This spec focuses on core authentication, usage tracking, and history storage. Advanced features (batch processing, API access, teams) are out of scope but infrastructure is prepared.
- Free tier requires account creation to enable usage tracking and provide conversion funnel. No anonymous usage.
- Clerk handles ALL payment UI and processing. We only implement usage enforcement and history storage.
- Future phases will leverage the permission infrastructure built in this spec.
- Database schema designed for extensibility (settings table, future feature flags).
