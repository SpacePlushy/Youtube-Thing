/**
 * Middleware for route protection and security headers
 * Uses NextAuth for authentication
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit, getClientIdentifier, createRateLimitHeaders } from './lib/rate-limiter-upstash';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/api/transcript/extract',
  '/api/transcript/history',
  '/api/user/usage',
];

// Routes that should bypass rate limiting
const rateLimitBypassRoutes = [
  '/api/auth',
  '/api/webhooks',
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Check if this is a protected route
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    // Get the NextAuth JWT token
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      // API routes return 401, pages redirect to sign-in
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Please sign in to continue' },
          { status: 401 }
        );
      }

      // Redirect to sign-in with callback URL
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Security headers configuration
  const isDevelopment = process.env.NODE_ENV === 'development';

  const securityHeaders: Record<string, string> = isDevelopment
    ? {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
      }
    : {
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval';
          style-src 'self' 'unsafe-inline';
          img-src 'self' blob: data: https:;
          font-src 'self' data:;
          connect-src 'self' https://*.youtube.com https://*.googleapis.com https://*.vercel.app wss://*.vercel.app https://api.stripe.com;
          frame-src https://js.stripe.com https://hooks.stripe.com;
          media-src 'self';
          object-src 'none';
          base-uri 'self';
          form-action 'self';
          frame-ancestors 'none';
          upgrade-insecure-requests;
        `.replace(/\s{2,}/g, ' ').trim(),
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-XSS-Protection': '1; mode=block',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-DNS-Prefetch-Control': 'on',
        'X-Download-Options': 'noopen',
        'X-Permitted-Cross-Domain-Policies': 'none',
      };

  const requestHeaders = new Headers(req.headers);

  // Apply headers to request
  Object.entries(securityHeaders).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

  // Rate limiting for API routes (skip certain routes)
  if (pathname.startsWith('/api/') && !rateLimitBypassRoutes.some(route => pathname.startsWith(route))) {
    // Get client identifier and check rate limit
    const clientId = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(clientId, pathname);

    // If rate limit exceeded, return 429 response
    if (!rateLimitResult.success) {
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

  // Remove potentially sensitive headers
  response.headers.delete('x-powered-by');
  response.headers.delete('x-vercel-env');
  response.headers.delete('x-vercel-deployment-url');
  response.headers.delete('x-vercel-cache');
  response.headers.delete('server');

  // Add custom headers
  response.headers.set('X-Request-ID', crypto.randomUUID());
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
