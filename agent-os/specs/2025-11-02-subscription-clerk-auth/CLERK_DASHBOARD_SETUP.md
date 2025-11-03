# Clerk Dashboard Setup Guide

## Overview
This guide provides step-by-step instructions for configuring subscription tiers and Stripe billing integration in the Clerk Dashboard for the YouTube Transcript Extractor SaaS application.

## Prerequisites
- Active Clerk account (sign up at https://clerk.com)
- Stripe account for payment processing (sign up at https://stripe.com)
- Project already created in Clerk Dashboard

## Step 1: Connect Stripe Payment Processor

### 1.1 Navigate to Billing Settings
1. Log in to Clerk Dashboard
2. Select your project/application
3. Navigate to **Configure** → **Billing**
4. Click **Connect Stripe**

### 1.2 Configure Stripe Integration
1. Sign in to your Stripe account when prompted
2. Select the Stripe account to connect (use Test mode for development)
3. Authorize Clerk to access your Stripe account
4. Verify the connection shows "Connected" status

### 1.3 Configure Webhook Endpoints
1. In Clerk Dashboard, navigate to **Configure** → **Webhooks**
2. Click **Add Endpoint**
3. Add endpoint URL: `https://your-domain.vercel.app/api/webhooks/clerk`
4. Select events to listen for:
   - `user.created`
   - `user.updated`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`
5. Save the webhook signing secret to your `.env.local` file

## Step 2: Create Free Tier

### 2.1 Basic Configuration
1. Navigate to **Configure** → **Billing** → **Plans**
2. Click **Create Plan**
3. Enter plan details:
   - **Name**: Free
   - **Price**: $0/month
   - **Billing Interval**: Monthly
   - **Description**: Perfect for trying out the transcript extractor

### 2.2 Set Metadata Fields
1. In the plan settings, navigate to **Metadata**
2. Add custom metadata field:
   - **Key**: `subscriptionTier`
   - **Value**: `free`
3. Save the plan

### 2.3 Document Features
Add the following features in the plan description:
- 5 transcripts per day
- No transcript history storage
- Community support
- Account required (no anonymous usage)

## Step 3: Create Starter Tier ($9/month)

### 3.1 Basic Configuration
1. Navigate to **Configure** → **Billing** → **Plans**
2. Click **Create Plan**
3. Enter plan details:
   - **Name**: Starter
   - **Price**: $9/month
   - **Billing Interval**: Monthly
   - **Description**: Perfect for students and regular users

### 3.2 Set Metadata Fields
1. In the plan settings, navigate to **Metadata**
2. Add custom metadata field:
   - **Key**: `subscriptionTier`
   - **Value**: `starter`
3. Save the plan

### 3.3 Document Features
Add the following features in the plan description:
- 50 transcripts per day
- 30-day transcript history retention
- Full-text search across history
- Priority email support
- All saved transcripts accessible across devices

## Step 4: Create Pro Tier ($29/month)

### 4.1 Basic Configuration
1. Navigate to **Configure** → **Billing** → **Plans**
2. Click **Create Plan**
3. Enter plan details:
   - **Name**: Pro
   - **Price**: $29/month
   - **Billing Interval**: Monthly
   - **Description**: Perfect for professionals and power users
   - **Badge**: Most Popular (enable this option)

### 4.2 Set Metadata Fields
1. In the plan settings, navigate to **Metadata**
2. Add custom metadata field:
   - **Key**: `subscriptionTier`
   - **Value**: `pro`
3. Save the plan

### 4.3 Configure Permission Flags
In the plan metadata, add these feature flags:
- **Key**: `feature:batch-processing` | **Value**: `true`
- **Key**: `feature:api-access` | **Value**: `true`
- **Key**: `feature:unlimited-history` | **Value**: `true`

### 4.4 Document Features
Add the following features in the plan description:
- Unlimited transcripts per day
- Unlimited transcript history storage
- Collections and tags (coming soon)
- Export formats: TXT, PDF, Markdown, JSON, SRT (coming soon)
- API access: 10,000 requests/month (coming soon)
- Batch processing: up to 10 videos (coming soon)
- Priority processing queue (coming soon)
- Priority support

## Step 5: Create Enterprise Tier ($99/month)

### 5.1 Basic Configuration
1. Navigate to **Configure** → **Billing** → **Plans**
2. Click **Create Plan**
3. Enter plan details:
   - **Name**: Enterprise
   - **Price**: $99/month
   - **Billing Interval**: Monthly
   - **Description**: Perfect for teams and businesses

### 5.2 Set Metadata Fields
1. In the plan settings, navigate to **Metadata**
2. Add custom metadata field:
   - **Key**: `subscriptionTier`
   - **Value**: `enterprise`
3. Save the plan

### 5.3 Configure Permission Flags
In the plan metadata, add these feature flags:
- **Key**: `feature:batch-processing` | **Value**: `true`
- **Key**: `feature:api-access` | **Value**: `true`
- **Key**: `feature:unlimited-history` | **Value**: `true`
- **Key**: `feature:team-workspaces` | **Value**: `true`

### 5.4 Document Features
Add the following features in the plan description:
- All Pro features included
- Batch processing: up to 50 videos (coming soon)
- Team workspaces: up to 10 users (coming soon)
- API access: 100,000 requests/month (coming soon)
- Dedicated processing resources (coming soon)
- SLA guarantee (coming soon)
- Dedicated account manager
- Custom integration support

## Step 6: Configure Permission Structure

### 6.1 Define Feature Flags
Ensure all tiers have appropriate metadata for future feature gating:

**Feature Permissions Matrix:**
| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| `feature:batch-processing` | - | - | ✓ | ✓ |
| `feature:api-access` | - | - | ✓ | ✓ |
| `feature:unlimited-history` | - | - | ✓ | ✓ |
| `feature:team-workspaces` | - | - | - | ✓ |

### 6.2 Update User Metadata Schema
1. Navigate to **Configure** → **User & Authentication** → **Metadata**
2. Add schema validation for `publicMetadata`:
```json
{
  "subscriptionTier": {
    "type": "string",
    "enum": ["free", "starter", "pro", "enterprise"]
  }
}
```

## Step 7: Test Subscription Flows (Test Mode)

### 7.1 Test Free Tier
1. Create a test user account
2. Verify default metadata: `subscriptionTier: "free"`
3. Test transcript extraction (should enforce 5/day limit)

### 7.2 Test Starter Tier Checkout
1. Use Stripe test card: `4242 4242 4242 4242`
2. Navigate to pricing page
3. Click "Upgrade to Starter"
4. Complete checkout flow
5. Verify metadata updated to: `subscriptionTier: "starter"`
6. Test transcript extraction (should enforce 50/day limit)
7. Test history access (should allow 30-day retention)

### 7.3 Test Pro Tier Checkout
1. Use Stripe test card: `4242 4242 4242 4242`
2. Navigate to pricing page
3. Click "Upgrade to Pro"
4. Complete checkout flow
5. Verify metadata updated to: `subscriptionTier: "pro"`
6. Test unlimited transcript extraction
7. Test unlimited history access

### 7.4 Test Enterprise Tier
1. For Enterprise, users should contact sales (no self-serve checkout)
2. Manually update test user metadata to `subscriptionTier: "enterprise"`
3. Verify all permissions granted

### 7.5 Test Plan Upgrades
1. Test Free → Starter upgrade
2. Test Starter → Pro upgrade
3. Verify prorated billing in Stripe dashboard

### 7.6 Test Plan Downgrades
1. Test Pro → Starter downgrade
2. Test Starter → Free downgrade
3. Verify history retention policies enforced
4. Verify usage limits enforced immediately

### 7.7 Verify Webhook Events
1. Navigate to Stripe Dashboard → **Developers** → **Webhooks**
2. Verify events received:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `invoice.payment_succeeded`
3. Check Clerk Dashboard for corresponding user metadata updates

## Step 8: Production Deployment

### 8.1 Switch to Production Mode
1. In Stripe Dashboard, toggle from Test mode to Live mode
2. Reconnect Stripe to Clerk (production credentials)
3. Update webhook endpoints to production URL

### 8.2 Verify Environment Variables
Ensure these are set in production (Vercel):
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### 8.3 Production Smoke Tests
1. Create a real user account (use personal email)
2. Subscribe to Starter tier with real card
3. Verify metadata updates correctly
4. Test transcript extraction and history
5. Verify billing portal works
6. Cancel test subscription

## Troubleshooting

### Issue: Metadata not updating after subscription
**Solution:**
- Check webhook configuration in Clerk Dashboard
- Verify webhook signing secret matches `.env` file
- Check webhook logs for errors
- Manually trigger `user.updated` webhook

### Issue: Stripe checkout not opening
**Solution:**
- Verify Stripe connection status in Clerk Dashboard
- Check browser console for errors
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set
- Clear browser cache and cookies

### Issue: User stuck on Free tier after payment
**Solution:**
- Check Stripe Dashboard for successful payment
- Verify webhook delivery to Clerk
- Manually update user metadata via Clerk Dashboard API
- Contact Clerk support if issue persists

### Issue: Feature flags not working
**Solution:**
- Verify metadata keys exactly match: `feature:batch-processing`, etc.
- Check case sensitivity (lowercase only)
- Use Clerk Dashboard to inspect user's `publicMetadata`
- Clear Redis cache: `redis-cli FLUSHDB` (development only)

## Next Steps

After completing Clerk Dashboard setup:
1. Deploy application to Vercel
2. Configure production environment variables
3. Test end-to-end user journeys
4. Set up billing alerts in Stripe
5. Configure dunning emails in Stripe
6. Enable customer portal in Stripe settings
7. Set up revenue tracking and analytics

## Support Resources

- Clerk Documentation: https://clerk.com/docs
- Stripe Billing Documentation: https://stripe.com/docs/billing
- Clerk Discord Community: https://clerk.com/discord
- Project GitHub Issues: [link to your repo]

## Security Notes

- Never commit Clerk secret keys to version control
- Use separate Clerk/Stripe accounts for development and production
- Rotate webhook signing secrets periodically
- Monitor webhook logs for suspicious activity
- Enable Stripe Radar for fraud protection
- Set up billing alerts for unusual usage patterns
