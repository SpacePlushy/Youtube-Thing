import { NextRequest, NextResponse } from 'next/server';
import { NextFetchEvent } from 'next/server';
import { checkRateLimit, getClientIdentifier, createRateLimitHeaders } from './lib/rate-limiter-upstash';
import { hasGuestUsedFreeExtraction } from './lib/guest-usage-upstash';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/transcript(.*)', // Allow guest access to transcript endpoints
  '/api/format-transcript', // Allow guest access to formatting
]);

// Define protected feature routes that require guest usage check
const isProtectedFeature = createRouteMatcher([
  '/api/transcript(.*)',
  '/api/format-transcript',
]);

export default clerkMiddleware(async (auth, request: NextRequest, context: NextFetchEvent) => {
  const { userId } = await auth();
  
  // Content Security Policy - production-ready for Next.js
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDevelopment ? "'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.dev https://vercel.live blob:;
    worker-src 'self' blob:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    connect-src 'self' https://*.youtube.com https://*.googleapis.com https://*.vercel.app wss://*.vercel.app https://generativelanguage.googleapis.com https://*.clerk.accounts.dev https://*.clerk.dev https://clerk-telemetry.com;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src 'self' https://vercel.live;
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);

  // Security headers
  const securityHeaders = {
    'Content-Security-Policy': cspHeader,
    'X-Frame-Options': 'DENY',
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

  const pathname = request.nextUrl.pathname;

  // Check if accessing protected feature without auth
  if (isProtectedFeature(request) && !userId) {
    // Get client identifier for guest tracking
    const clientId = getClientIdentifier(request);
    
    // Check if guest has already used their free extraction
    const hasUsedFree = await hasGuestUsedFreeExtraction(clientId);
    
    if (hasUsedFree) {
      // Guest has already used their free extraction
      const url = new URL('/sign-up', request.url);
      url.searchParams.set('redirect_url', pathname);
      url.searchParams.set('message', 'free_limit_reached');
      return NextResponse.redirect(url);
    }
    
    // Guest hasn't used their free extraction yet - allow the request
    // The actual usage will be tracked in the API route after successful extraction
  }

  // Check if this is an API route for rate limiting
  if (pathname.startsWith('/api/')) {
    // Get client identifier and check rate limit
    const clientId = userId || getClientIdentifier(request);
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
    
    // Handle analytics with waitUntil
    context.waitUntil(rateLimitResult.pending);
    
    // Add rate limit headers to successful requests
    Object.entries(createRateLimitHeaders(rateLimitResult)).forEach(([key, value]) => {
      requestHeaders.set(key, value);
    });
  }
  
  // Protect non-public routes
  if (!isPublicRoute(request) && !userId) {
    await auth.protect();
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
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt (metadata)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
      ]
    }
  ]
};