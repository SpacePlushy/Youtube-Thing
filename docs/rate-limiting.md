# Rate Limiting Implementation

## Overview
The application implements rate limiting to prevent API abuse and ensure fair usage across all users. The rate limiting is applied at the middleware level for all API endpoints using Upstash Redis for distributed storage.

## Implementation Details

### Rate Limits by Endpoint
- **`/api/transcript-oxylabs`**: 1 request per 10 seconds + 1000 requests per day globally
- **`/api/transcript-primary`**: 1 request per 10 seconds + 1000 requests per day globally
- **`/api/format-transcript`**: 1 request per 10 seconds  
- **Other API endpoints**: 1 request per 10 seconds

### Global Daily Limits
Transcript extraction endpoints have an additional **global daily limit of 1000 requests** shared across all users to control Oxylabs API costs. This limit resets every 24 hours.

### How It Works
1. **Client Identification**: Combines IP address and user agent to create unique identifiers
2. **Distributed Storage**: Uses Upstash Redis for consistent rate limiting across all regions
3. **Sliding Window**: Implements sliding window algorithm for accurate rate limiting
4. **Analytics**: Tracks rate limit analytics for monitoring and insights
5. **Headers**: Returns standard rate limit headers with every response

### Rate Limit Headers
```
X-RateLimit-Limit: 1                          # Max requests allowed per window
X-RateLimit-Remaining: 0                      # Requests remaining in window
X-RateLimit-Reset: 1234567                    # Unix timestamp when limit resets
X-RateLimit-Global-Daily-Remaining: 856       # Global daily requests remaining
X-RateLimit-Global-Daily-Reset: 1704567890    # When global daily limit resets
Retry-After: 10                               # Seconds until next request (only on 429)
```

### Rate Limit Response (429)
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 1234567890,
  "isGlobalLimit": false
}
```

**Global Daily Limit Response:**
```json
{
  "error": "Too Many Requests", 
  "message": "Daily service limit reached. Service will resume in 24 hours.",
  "retryAfter": 1704567890,
  "isGlobalLimit": true
}
```

## Configuration
Edit `lib/rate-limiter-upstash.ts` to adjust rate limits:
```typescript
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/your-endpoint': {
    requests: 1,      // Max requests allowed
    window: '10 s',   // Time window (10 seconds)
  },
};
```

## Features
- **Upstash Redis Integration**: Uses Upstash Redis for distributed rate limiting across all regions
- **Sliding Window Algorithm**: Provides smooth rate limiting without sudden resets
- **Consistent Global Limits**: All regions share the same rate limit counters
- **Built-in Analytics**: Track rate limit usage and violations in Upstash dashboard
- **Low Latency**: Upstash provides edge locations for fast rate limit checks

## Setup Instructions
1. **Create Upstash Redis**: Go to [upstash.com](https://upstash.com) and create a Redis database
2. **Get Credentials**: Copy your REST API URL and token from Upstash console
3. **Connect to Vercel**: In Vercel dashboard, go to Storage → Connect Database → Upstash
4. **Environment Variables**: Vercel automatically adds:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. **Deploy**: The rate limiter will automatically use Upstash Redis

## Development Mode
For local development:
1. Run `vercel env pull .env.development.local` to get the latest environment variables
2. The rate limiter will use the same Upstash Redis instance as production

## Monitoring

### Real-time Usage Monitoring
Check global daily usage at: `/api/admin/usage`

Example response:
```json
{
  "oxylabsDailyUsage": {
    "used": 247,
    "remaining": 753,
    "limit": 1000,
    "percentageUsed": 25,
    "resetTime": 1704567890,
    "resetDate": "2024-01-06T12:34:50.000Z",
    "timeUntilReset": "18 hours"
  },
  "status": "healthy",
  "message": "753 requests remaining today"
}
```

### Analytics & Monitoring
- Check rate limit headers in API responses
- Monitor usage in Upstash console with built-in analytics
- View rate limit violations and patterns
- Set up alerts for high usage or violations
- Use `/api/admin/usage` endpoint for automated monitoring

## Window Types
Upstash supports various rate limiting strategies:
- **Sliding Window** (currently used): Smooth rate limiting
- **Fixed Window**: Resets at fixed intervals
- **Token Bucket**: Allows bursts with gradual refill