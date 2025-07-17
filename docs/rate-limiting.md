# Rate Limiting Implementation

## Overview
The application implements rate limiting to prevent API abuse and ensure fair usage across all users. The rate limiting is applied at the middleware level for all API endpoints using Upstash Redis for distributed storage.

## Implementation Details

### Rate Limits by Endpoint
- **`/api/transcript-oxylabs`**: 60 requests per minute (1 per second)
- **`/api/format-transcript`**: 60 requests per minute (1 per second)  
- **Other API endpoints**: 120 requests per minute (2 per second)

### How It Works
1. **Client Identification**: Combines IP address and user agent to create unique identifiers
2. **Distributed Storage**: Uses Upstash Redis for consistent rate limiting across all regions
3. **Sliding Window**: Implements sliding window algorithm for accurate rate limiting
4. **Analytics**: Tracks rate limit analytics for monitoring and insights
5. **Headers**: Returns standard rate limit headers with every response

### Rate Limit Headers
```
X-RateLimit-Limit: 10      # Max requests allowed
X-RateLimit-Remaining: 7   # Requests remaining in window
X-RateLimit-Reset: 1234567 # Unix timestamp when limit resets
Retry-After: 45            # Seconds until next request (only on 429)
```

### Rate Limit Response (429)
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 1234567890
}
```

## Configuration
Edit `lib/rate-limiter-upstash.ts` to adjust rate limits:
```typescript
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/your-endpoint': {
    requests: 10,    // Max requests allowed
    window: '1 m',   // Time window (1 minute)
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
- Check rate limit headers in API responses
- Monitor usage in Upstash console with built-in analytics
- View rate limit violations and patterns
- Set up alerts for high usage or violations

## Window Types
Upstash supports various rate limiting strategies:
- **Sliding Window** (currently used): Smooth rate limiting
- **Fixed Window**: Resets at fixed intervals
- **Token Bucket**: Allows bursts with gradual refill