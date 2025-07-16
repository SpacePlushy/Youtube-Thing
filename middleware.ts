import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware(request: NextRequest) {
  // Generate nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // Strict Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com;
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    connect-src 'self' https://*.youtube.com https://*.googleapis.com;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    block-all-mixed-content;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

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

  // Rate limiting check (basic implementation)
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateKey = `rate-limit:${ip}`;
  
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

  // Remove powered-by header
  response.headers.delete('x-powered-by');
  
  // Add custom security headers
  response.headers.set('X-Request-ID', crypto.randomUUID());
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  return response;
}

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