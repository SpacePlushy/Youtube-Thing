# Quick Start: Clerk Authentication & Subscriptions

This guide will help you complete the Clerk authentication and subscription setup for YouTube Thing.

## Prerequisites

- Clerk account (sign up at https://clerk.com)
- Stripe account (for payment processing)
- Vercel account (for Postgres database)
- Upstash Redis (should already be configured)

## Step 1: Set Up Clerk Application (15 minutes)

### 1.1 Create Clerk Application
1. Visit https://dashboard.clerk.com
2. Click "Add application" or select your existing app
3. Choose application name: "YouTube Thing"
4. Enable authentication methods:
   - ✅ Email/Password
   - ✅ Google OAuth
   - ✅ GitHub OAuth

### 1.2 Get API Keys
1. In Clerk Dashboard, go to "API Keys"
2. Copy **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Copy **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   CLERK_SECRET_KEY=sk_test_your_key_here
   ```

### 1.3 Configure URLs
In Clerk Dashboard → "Paths":
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in URL: `/dashboard`
- After sign-up URL: `/dashboard`

## Step 2: Set Up Subscription Tiers in Clerk (30 minutes)

### 2.1 Connect Stripe
1. In Clerk Dashboard → "Billing"
2. Click "Connect Stripe"
3. Authorize Clerk to access your Stripe account
4. Complete the connection flow

### 2.2 Create Subscription Plans

**Important**: You must create these exact plans with these exact metadata values.

#### Free Plan
1. In Clerk Dashboard → "Billing" → "Products"
2. Click "Add Product"
3. Configure:
   - Name: `Free`
   - Description: `5 transcripts per day`
   - Price: `$0/month`
   - Metadata: Click "Add metadata"
     - Key: `subscriptionTier`
     - Value: `free`

#### Starter Plan ($9/month)
1. Click "Add Product"
2. Configure:
   - Name: `Starter`
   - Description: `50 transcripts per day with 30-day history`
   - Price: `$9/month` (set up in Stripe)
   - Metadata:
     - Key: `subscriptionTier`
     - Value: `starter`

#### Pro Plan ($29/month) - Mark as Popular
1. Click "Add Product"
2. Configure:
   - Name: `Pro`
   - Description: `Unlimited transcripts and history`
   - Price: `$29/month`
   - Mark as: "Most Popular" (if option available)
   - Metadata:
     - Key: `subscriptionTier`
     - Value: `pro`

#### Enterprise Plan ($99/month)
1. Click "Add Product"
2. Configure:
   - Name: `Enterprise`
   - Description: `Everything in Pro plus team features`
   - Price: `$99/month`
   - Metadata:
     - Key: `subscriptionTier`
     - Value: `enterprise`

### 2.3 Verify Metadata
**CRITICAL**: The `subscriptionTier` metadata must match exactly:
- ✅ `free` (lowercase)
- ✅ `starter` (lowercase)
- ✅ `pro` (lowercase)
- ✅ `enterprise` (lowercase)

The code relies on these exact values in `lib/clerk-helpers.ts`.

## Step 3: Set Up Vercel Postgres (10 minutes)

### 3.1 Add Postgres to Vercel Project
1. Go to your Vercel project dashboard
2. Click "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose region closest to your users
6. Click "Create"

### 3.2 Get Connection Strings
1. After creation, click on your Postgres database
2. Go to "Settings" → "Connection String"
3. Copy all environment variables
4. Add to `.env.local`:
   ```bash
   POSTGRES_URL=postgres://...
   POSTGRES_PRISMA_URL=postgres://...
   POSTGRES_URL_NON_POOLING=postgres://...
   POSTGRES_USER=default
   POSTGRES_HOST=...
   POSTGRES_PASSWORD=...
   POSTGRES_DATABASE=verceldb
   ```

### 3.3 Initialize Database Schema
The database schema will be created automatically on first use. Alternatively, run:

```sql
-- Run this in Vercel Postgres Query tab
CREATE TABLE IF NOT EXISTS users_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  video_id VARCHAR(255) NOT NULL,
  video_title TEXT NOT NULL,
  channel_name VARCHAR(500),
  video_duration INTEGER,
  transcript_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_created ON users_transcripts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video ON users_transcripts (video_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  default_export_format VARCHAR(10) DEFAULT 'txt',
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Step 4: Verify Environment Variables

Your `.env.local` should now have:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Vercel Postgres
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_USER=default
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=verceldb

# Upstash Redis (existing)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Step 5: Test the Implementation (10 minutes)

### 5.1 Start Development Server
```bash
npm run dev
```

### 5.2 Test Authentication
1. Visit http://localhost:3000/sign-in
2. Click "Sign up" to create a new account
3. Try signing up with:
   - Email/password
   - Google OAuth
   - GitHub OAuth
4. After sign up, verify redirect to `/dashboard` (will be 404 for now)

### 5.3 Test API Endpoints

**Test Usage Stats:**
```bash
# Get auth token from browser DevTools:
# 1. Log in to the app
# 2. Open DevTools → Application → Cookies
# 3. Copy the __session cookie value

curl -H "Cookie: __session=YOUR_SESSION_TOKEN" \
  http://localhost:3000/api/user/usage
```

Expected response:
```json
{
  "currentUsage": 0,
  "dailyLimit": 5,
  "tier": "free",
  "resetTime": "2025-11-03T00:00:00.000Z"
}
```

**Test Transcript History (will be empty initially):**
```bash
curl -H "Cookie: __session=YOUR_SESSION_TOKEN" \
  http://localhost:3000/api/transcript/history
```

Expected response:
```json
{
  "transcripts": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### 5.4 Test Subscription Tier Assignment

**Method 1: Clerk Dashboard (for testing)**
1. Go to Clerk Dashboard → "Users"
2. Click on your test user
3. Go to "Metadata" tab
4. Add public metadata:
   ```json
   {
     "subscriptionTier": "starter"
   }
   ```
5. Save changes
6. Call `/api/user/usage` again - should show `dailyLimit: 50`

**Method 2: Subscription Flow (proper way)**
1. In Clerk Dashboard → "Billing"
2. Get the checkout URL for Starter plan
3. Complete a test checkout (use Stripe test cards)
4. Verify metadata is automatically set

## Step 6: Build Remaining UI (Next Steps)

Now that authentication and API infrastructure is working, you need to build:

1. **Dashboard page** (`/app/dashboard/page.tsx`)
   - Usage stats display
   - Transcript history list
   - Billing management

2. **Pricing page** (`/app/pricing/page.tsx`)
   - Use Clerk's `<PricingTable />` component
   - Display all 4 tiers
   - Upgrade CTAs

3. **Navigation header**
   - Add `<UserButton />` component to existing layout
   - Show user avatar and dropdown menu

4. **Update transcript extraction API**
   - Add authentication to existing `/api/transcript/route.ts`
   - Integrate usage tracking
   - Save to history for Starter+ users

## Troubleshooting

### Build Fails: "Missing publishableKey"
- ✅ Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to `.env.local`
- ✅ Restart dev server after adding env vars

### "Unauthorized" on API calls
- ✅ Verify you're logged in
- ✅ Check session cookie exists
- ✅ Verify middleware is protecting routes correctly

### Usage limit not enforcing
- ✅ Check Redis connection (UPSTASH_REDIS_REST_URL)
- ✅ Verify user has correct tier in publicMetadata
- ✅ Check console logs for "[Usage Tracker]" messages

### Transcript history not saving
- ✅ Check Postgres connection (POSTGRES_URL)
- ✅ Verify database tables exist
- ✅ Check user tier is Starter+ (free users can't save history)
- ✅ Look for "[Database]" logs in console

### Subscription tier not updating
- ✅ Verify exact metadata key: `subscriptionTier` (case-sensitive)
- ✅ Verify exact tier values: `free`, `starter`, `pro`, `enterprise` (lowercase)
- ✅ Clear browser cache and re-login
- ✅ Check Clerk webhook is working

## Testing Subscription Flows

### Test Card Numbers (Stripe Test Mode)
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires auth: `4000 0027 6000 3184`

Use any future date for expiry, any 3-digit CVC, any ZIP code.

## Next Implementation Priorities

1. ✅ **DONE**: Core auth infrastructure
2. ✅ **DONE**: Database schema
3. ✅ **DONE**: Usage tracking
4. ✅ **DONE**: API endpoints (history, usage)
5. ⏸ **TODO**: Update transcript extraction API
6. ⏸ **TODO**: Build dashboard page
7. ⏸ **TODO**: Build pricing page
8. ⏸ **TODO**: Add navigation with UserButton
9. ⏸ **TODO**: Write tests (20-30 focused tests)
10. ⏸ **TODO**: Add error states and loading indicators

## Resources

- **Clerk Docs**: https://clerk.com/docs/quickstarts/nextjs
- **Clerk B2C SaaS**: https://clerk.com/docs/billing/overview
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Stripe Testing**: https://stripe.com/docs/testing
- **Implementation Status**: See `CLERK_AUTH_IMPLEMENTATION_STATUS.md`

---

**Estimated Time to Complete Setup**: 1-2 hours
**Estimated Time to Build Remaining UI**: 3-4 hours
**Estimated Time for Testing**: 2-3 hours

**Total Project Completion Time**: 6-9 hours
