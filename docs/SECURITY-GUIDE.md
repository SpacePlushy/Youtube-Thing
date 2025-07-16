# Security Guide: Protecting Business Logic in Production

## Overview

This guide provides comprehensive strategies to protect your proprietary business logic from client-side inspection when deploying to Vercel.

## 1. Code Protection Strategies

### A. Server-Side Business Logic (Recommended) ✅

Keep all proprietary logic in API routes:

```typescript
// ❌ BAD: Client-side exposes logic
export function calculatePricing(usage: number) {
  return usage * 0.01 * PROPRIETARY_MULTIPLIER;
}

// ✅ GOOD: Server-side API
// app/api/calculate/route.ts
export async function POST(request: NextRequest) {
  const { usage } = await request.json();
  // Proprietary logic hidden server-side
  const price = calculateSecurePrice(usage);
  return NextResponse.json({ price });
}
```

### B. Environment Variable Protection

```bash
# .env.local (Never committed to git)
OXYLABS_USERNAME=secret_username
OXYLABS_PASSWORD=secret_password
PROPRIETARY_API_KEY=secret_key

# .env.example (Safe to commit)
OXYLABS_USERNAME=your_username_here
OXYLABS_PASSWORD=your_password_here
```

### C. API Route Middleware

Create middleware to protect your API routes:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rate limiting
  const ip = request.ip ?? '127.0.0.1';
  
  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

## 2. Build-Time Optimizations

### A. Next.js Configuration

```javascript
// next.config.js
module.exports = {
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Minimize client bundle
  swcMinify: true,
  
  // Configure webpack for additional obfuscation
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Obfuscate client bundle
      config.optimization.minimize = true;
    }
    return config;
  },
  
  // Experimental security features
  experimental: {
    // Runtime configuration
    runtime: 'nodejs',
  },
};
```

### B. Build-Time Environment Validation

```typescript
// env.ts
import { z } from 'zod';

const envSchema = z.object({
  OXYLABS_USERNAME: z.string().min(1),
  OXYLABS_PASSWORD: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
});

// Validate at build time
export const env = envSchema.parse(process.env);
```

## 3. Vercel-Specific Security Features

### A. Vercel Environment Variables

```bash
# Set via Vercel CLI or Dashboard
vercel env add OXYLABS_USERNAME production
vercel env add OXYLABS_PASSWORD production
vercel env add GEMINI_API_KEY production
```

### B. Vercel Edge Config (For Dynamic Secrets)

```typescript
// app/api/secure/route.ts
import { get } from '@vercel/edge-config';

export async function GET() {
  // Fetch secrets from Edge Config at runtime
  const apiKey = await get('proprietary_api_key');
  
  // Use the secret securely
  return NextResponse.json({ success: true });
}
```

### C. Vercel Firewall Rules

Add to `vercel.json`:

```json
{
  "functions": {
    "app/api/transcript/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

## 4. Client-Side Code Obfuscation

### A. Install Obfuscation Tools

```bash
npm install --save-dev webpack-obfuscator
```

### B. Configure Webpack

```javascript
// next.config.js
const JavaScriptObfuscator = require('webpack-obfuscator');

module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new JavaScriptObfuscator({
          rotateStringArray: true,
          stringArray: true,
          stringArrayThreshold: 0.75,
        }, [])
      );
    }
    return config;
  },
};
```

## 5. Runtime Protection

### A. API Rate Limiting

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 60000, // 1 minute
});

export async function rateLimit(request: NextRequest) {
  const ip = request.ip ?? 'anonymous';
  const tokenCount = rateLimitCache.get(ip) ?? 0;
  
  if (tokenCount > 10) {
    return new NextResponse('Rate limit exceeded', { status: 429 });
  }
  
  rateLimitCache.set(ip, tokenCount + 1);
  return null;
}
```

### B. Request Validation

```typescript
// app/api/transcript/route.ts
import { z } from 'zod';

const requestSchema = z.object({
  url: z.string().url(),
  language: z.string().optional(),
  transcriptOrigin: z.enum(['auto_generated', 'uploader_provided']).optional(),
});

export async function POST(request: NextRequest) {
  // Validate request
  const body = await request.json();
  const validated = requestSchema.safeParse(body);
  
  if (!validated.success) {
    return NextResponse.json({ 
      message: 'Invalid request' 
    }, { status: 400 });
  }
  
  // Process with validated data
}
```

## 6. Monitoring & Security Alerts

### A. Vercel Analytics Integration

```typescript
// app/api/transcript/route.ts
import { track } from '@vercel/analytics/server';

export async function POST(request: NextRequest) {
  // Track API usage
  await track('transcript-extraction', {
    provider: 'hidden', // Don't expose provider
    status: 'success',
  });
  
  // ... rest of implementation
}
```

### B. Security Headers Check

Use these services to verify your security:
- https://securityheaders.com
- https://observatory.mozilla.org

## 7. Architecture Recommendations

### A. Separate Concerns

```
/app
  /api
    /v1
      /public    # Public endpoints
      /internal  # Internal business logic
  /components    # UI only, no business logic
  
/lib
  /client        # Client-safe utilities
  /server        # Server-only business logic
```

### B. Use Server Components Where Possible

```typescript
// app/dashboard/page.tsx
// Server component by default - runs on server only
export default async function Dashboard() {
  // This code never reaches the client
  const secretData = await getProprietaryData();
  
  return <DashboardClient data={sanitizeForClient(secretData)} />;
}
```

## 8. Deployment Checklist

- [ ] All API keys in environment variables
- [ ] Source maps disabled in production
- [ ] Client bundle minimized and obfuscated
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Request validation on all endpoints
- [ ] Generic error messages (no stack traces)
- [ ] Monitoring and alerting set up
- [ ] Regular security audits scheduled

## Summary

The most effective approach is to:
1. Keep ALL business logic in server-side API routes
2. Use environment variables for secrets
3. Implement proper authentication and rate limiting
4. Obfuscate client code as an additional layer
5. Monitor for suspicious activity

Remember: Client-side code is ALWAYS visible to determined users. The only truly secure approach is server-side implementation.