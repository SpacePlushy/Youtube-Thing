# Deployment Checklist

This checklist ensures all steps are completed for a successful production deployment of the YouTube Transcript Extractor with subscription features.

## Pre-Deployment Setup

### 1. Clerk Configuration

#### Development Instance
- [ ] Create Clerk application at https://dashboard.clerk.com
- [ ] Enable authentication providers:
  - [ ] Email/Password
  - [ ] Google OAuth
  - [ ] GitHub OAuth
- [ ] Copy development keys:
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_test_...)
  - [ ] `CLERK_SECRET_KEY` (sk_test_...)
- [ ] Test authentication flows in development

#### Production Instance
- [ ] Switch to Production instance in Clerk Dashboard
- [ ] Copy production keys:
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_live_...)
  - [ ] `CLERK_SECRET_KEY` (sk_live_...)
- [ ] Add production domain to allowed domains
- [ ] Configure OAuth redirect URLs for production domain
- [ ] Test production authentication in test mode

### 2. Stripe Integration via Clerk

#### Test Mode Setup
- [ ] Connect Stripe test account in Clerk Dashboard
- [ ] Create 4 subscription tiers (Free, Starter, Pro, Enterprise)
- [ ] Configure pricing: $0, $9, $29, $99 per month
- [ ] Set metadata for each tier (`subscriptionTier` field)
- [ ] Add permission flags for Pro/Enterprise tiers
- [ ] Test checkout flows with test card (4242 4242 4242 4242)
- [ ] Verify webhooks are received
- [ ] Test plan upgrades and downgrades

#### Production Mode Setup
- [ ] Switch Stripe to Live mode in Clerk Dashboard
- [ ] Verify all 4 tiers are configured correctly
- [ ] Set up webhook endpoints for production domain
- [ ] Configure Clerk webhook signing secret
- [ ] Test live checkout with real card (then refund)
- [ ] Set up billing alerts in Stripe
- [ ] Enable Stripe Radar for fraud protection

### 3. Vercel Postgres Setup

#### Create Database
- [ ] Go to Vercel project → Storage tab
- [ ] Create new Postgres database
- [ ] Verify environment variables auto-populated:
  - [ ] `POSTGRES_URL`
  - [ ] `POSTGRES_PRISMA_URL`
  - [ ] `POSTGRES_URL_NON_POOLING`
  - [ ] `POSTGRES_USER`
  - [ ] `POSTGRES_HOST`
  - [ ] `POSTGRES_PASSWORD`
  - [ ] `POSTGRES_DATABASE`

#### Initialize Schema
- [ ] Deploy application (tables auto-create on first run)
- [ ] OR manually run: `node -e "require('./lib/db').initializeDatabase()"`
- [ ] Verify tables exist:
  - [ ] `users_transcripts` table created
  - [ ] `user_settings` table created
- [ ] Verify indexes created:
  - [ ] `idx_user_created` on (user_id, created_at)
  - [ ] `idx_video` on (video_id)
- [ ] Test database connection with sample query

### 4. Upstash Redis Setup

#### Create Redis Instance
- [ ] Sign up at https://upstash.com
- [ ] Create new Redis database (choose region close to Vercel)
- [ ] Copy connection details:
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] Add to Vercel environment variables

#### Verify Usage Tracking
- [ ] Test usage counter increments
- [ ] Verify TTL set correctly (48 hours)
- [ ] Test daily limit enforcement
- [ ] Verify midnight UTC reset works

### 5. Environment Variables

#### Vercel Dashboard Setup
- [ ] Navigate to Project Settings → Environment Variables
- [ ] Add all production variables:
  - [ ] Clerk production keys
  - [ ] Clerk routing URLs
  - [ ] Postgres variables (auto-added)
  - [ ] Redis variables
  - [ ] Webhook secrets
- [ ] Ensure variables are set for "Production" environment
- [ ] Consider setting different values for "Preview" environment

#### Local Development
- [ ] Create `.env.local` file (never commit this)
- [ ] Copy all variables from `.env.example`
- [ ] Use Clerk test keys for local development
- [ ] Use local or development Postgres database
- [ ] Use development Redis instance

## Deployment Steps

### 1. Code Preparation

- [ ] Run linter: `npm run lint`
- [ ] Fix all linting errors
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Fix all TypeScript errors
- [ ] Run tests: `npm test`
- [ ] Ensure all tests pass
- [ ] Build locally: `npm run build`
- [ ] Verify build succeeds without errors

### 2. Git & GitHub

- [ ] Create feature branch: `git checkout -b feature/subscription-auth`
- [ ] Commit all changes with clear messages
- [ ] Push to GitHub: `git push origin feature/subscription-auth`
- [ ] Create Pull Request with description
- [ ] Get code review (optional)
- [ ] Merge to main branch

### 3. Vercel Deployment

#### Initial Deploy
- [ ] Import project to Vercel (if not already done)
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `.next`
  - [ ] Install Command: `npm install`
- [ ] Add all environment variables (see checklist above)
- [ ] Click "Deploy"

#### Post-Deploy Verification
- [ ] Wait for deployment to complete
- [ ] Visit production URL
- [ ] Check deployment logs for errors

### 4. Production Testing

#### Authentication Flow
- [ ] Sign up with email/password
- [ ] Verify confirmation email received
- [ ] Sign in successfully
- [ ] Sign out and sign back in
- [ ] Test Google OAuth signup
- [ ] Test GitHub OAuth signup
- [ ] Verify redirect to /dashboard after login

#### Transcript Extraction
- [ ] Extract first transcript as Free user
- [ ] Verify usage counter increments (1/5)
- [ ] Extract 4 more transcripts (reach 5/5 limit)
- [ ] Attempt 6th extraction → verify 429 error
- [ ] Check error modal displays correctly
- [ ] Verify usage stats show on dashboard

#### Subscription Flow
- [ ] Click "Upgrade to Starter" from dashboard
- [ ] Go through Clerk checkout flow
- [ ] Use real credit card (will charge $9)
- [ ] Verify subscription activated
- [ ] Check metadata updated to `subscriptionTier: "starter"`
- [ ] Verify new limit: 50/day instead of 5/day
- [ ] Extract transcript → verify history saves

#### Dashboard Features
- [ ] View usage stats card
- [ ] Check progress bar displays correctly
- [ ] View transcript history section
- [ ] Test pagination (if enough transcripts)
- [ ] Test sorting (newest first, title A-Z)
- [ ] Copy transcript to clipboard
- [ ] Download transcript as TXT
- [ ] Delete transcript
- [ ] View billing management section

#### Billing Management
- [ ] Click "Manage Subscription"
- [ ] Verify redirects to Clerk billing portal
- [ ] View current plan details
- [ ] Check next billing date
- [ ] Test plan upgrade (Starter → Pro)
- [ ] Test plan downgrade (Pro → Starter)
- [ ] Verify prorated billing works
- [ ] Test subscription cancellation

#### Pricing Page
- [ ] Visit /pricing page
- [ ] Verify all 4 tiers display
- [ ] Check Pro tier marked "Most Popular"
- [ ] Verify CTAs work for each tier
- [ ] Test unauthenticated CTA ("Start Free")
- [ ] Test authenticated CTA ("Upgrade to X")
- [ ] Verify Enterprise "Contact Sales" link

### 5. Error Handling

- [ ] Test unauthenticated API calls → 401
- [ ] Test usage limit exceeded → 429 with modal
- [ ] Test invalid video ID → 400
- [ ] Test non-existent transcript → 404
- [ ] Test database errors (disconnect DB temporarily)
- [ ] Test Redis errors (disconnect Redis temporarily)
- [ ] Verify error messages are user-friendly
- [ ] Check error logging works

### 6. Performance & Monitoring

#### Load Testing
- [ ] Test multiple concurrent requests
- [ ] Verify rate limiting works
- [ ] Check database query performance
- [ ] Monitor Redis latency
- [ ] Test with 100+ transcripts in history

#### Monitoring Setup
- [ ] Enable Vercel Analytics
- [ ] Set up Vercel Speed Insights
- [ ] Configure Stripe dashboard notifications
- [ ] Set up Clerk dashboard alerts
- [ ] Monitor error rates in Vercel logs
- [ ] Set up uptime monitoring (e.g., UptimeRobot)

### 7. Documentation

- [ ] Verify README.md is up to date
- [ ] Check CLERK_DASHBOARD_SETUP.md is accurate
- [ ] Review API documentation
- [ ] Update changelog (if applicable)
- [ ] Create user guide (optional)

### 8. Rollback Plan

- [ ] Document current production version
- [ ] Know how to revert deployment in Vercel
- [ ] Have backup of database schema
- [ ] Test rollback procedure
- [ ] Document rollback steps for team

## Post-Deployment

### 1. Monitor First 24 Hours

- [ ] Check error rates in Vercel
- [ ] Monitor Clerk authentication logs
- [ ] Review Stripe payment events
- [ ] Check database performance
- [ ] Monitor Redis hit rates
- [ ] Review user feedback/support tickets

### 2. User Communication

- [ ] Announce new features (if applicable)
- [ ] Send email to existing users (if any)
- [ ] Update marketing materials
- [ ] Post on social media (if applicable)

### 3. Analytics Setup

- [ ] Track sign-up conversion rate
- [ ] Monitor Free → Starter upgrade rate
- [ ] Track daily active users (DAU)
- [ ] Monitor transcript extraction volume
- [ ] Track MRR (Monthly Recurring Revenue)
- [ ] Set up dashboard for key metrics

### 4. Ongoing Maintenance

- [ ] Schedule weekly database backups
- [ ] Monitor Postgres storage usage
- [ ] Check Redis memory usage
- [ ] Review Clerk user growth
- [ ] Monitor Stripe transaction fees
- [ ] Update dependencies regularly
- [ ] Review and rotate API keys quarterly

## Emergency Contacts

- **Vercel Support**: https://vercel.com/support
- **Clerk Support**: https://clerk.com/support
- **Stripe Support**: https://support.stripe.com
- **Upstash Support**: https://upstash.com/support

## Rollback Procedure

If critical issues arise:

1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click three dots → "Promote to Production"
4. Verify rollback successful
5. Investigate issue in development
6. Fix and redeploy when ready

## Success Criteria

Deployment is successful when:

- [ ] All 4 tiers are functional
- [ ] Authentication works for all methods
- [ ] Usage tracking enforces limits correctly
- [ ] Transcript history saves and retrieves correctly
- [ ] Billing/subscription flows work end-to-end
- [ ] Error rates < 1%
- [ ] API response times < 500ms
- [ ] Dashboard loads in < 2 seconds
- [ ] No critical bugs reported in first 24 hours

## Notes

- Test thoroughly in Clerk test mode before going live
- Use separate Stripe test account for testing
- Never commit `.env.local` or production keys to Git
- Always test rollback procedure before launch
- Have at least one team member available for first 24 hours post-launch
