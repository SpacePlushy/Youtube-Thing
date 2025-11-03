import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIdentifier, createRateLimitHeaders } from './lib/rate-limiter-upstash';

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/transcript/extract',
  '/api/transcript/history(.*)',
  '/api/user/usage',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Content Security Policy - production-ready for Next.js
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Relax CSP in development for better compatibility (especially Safari)
  const cspHeader = isDevelopment ? '' : `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.clerk.com https://*.clerk.accounts.dev;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https: https://*.clerk.com https://*.clerk.accounts.dev;
    font-src 'self' data:;
    connect-src 'self' https://*.youtube.com https://*.googleapis.com https://*.vercel.app wss://*.vercel.app https://generativelanguage.googleapis.com https://clerk.clerk.com https://*.clerk.accounts.dev;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    frame-src https://clerk.clerk.com https://*.clerk.accounts.dev;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(req.headers);

  // Security headers (relaxed in development)
  const securityHeaders: Record<string, string> = isDevelopment ? {
    // Minimal headers in development for Safari compatibility
    'X-Frame-Options': 'SAMEORIGIN', // Changed from DENY to allow Clerk iframes
    'X-Content-Type-Options': 'nosniff',
  } : {
    'Content-Security-Policy': cspHeader,
    'X-Frame-Options': 'SAMEORIGIN', // Changed from DENY to allow Clerk iframes
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-DNS-Prefetch-Control': 'on',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
  };

  // Apply headers to request
  Object.entries(securityHeaders).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

  // Check if this is an API route
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith('/api/')) {
    // Get client identifier and check rate limit
    const clientId = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(clientId, pathname);

    // If rate limit exceeded, return 429 response
    if (!rateLimitResult.success) {
      // Determine if this is a global daily limit or per-user limit
      const isGlobalLimit = rateLimitResult.globalDailyRemaining === 0;
      const message = isGlobalLimit
        ? 'Daily service limit reached. Service will resume in 24 hours.'
        : 'Rate limit exceeded. Please try again later.';

      const response = NextResponse.json(
        {
          error: 'Too Many Requests',
          message,
          retryAfter: rateLimitResult.reset,
          isGlobalLimit,
        },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );

      // Apply security headers to rate limit response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    // Add rate limit headers to successful requests
    const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      requestHeaders.set(key, value);
    });
  }

  // Create response with security headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Apply security headers to response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Remove powered-by header and any potential environment leaks
  response.headers.delete('x-powered-by');
  response.headers.delete('x-vercel-env');
  response.headers.delete('x-vercel-deployment-url');
  response.headers.delete('x-vercel-cache');
  response.headers.delete('server');

  // Add custom security headers
  response.headers.set('X-Request-ID', crypto.randomUUID());
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
