import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

// Rate limiting cache
const rateLimitCache = new LRUCache<string, number>({
  max: 500,
  ttl: 60000, // 1 minute
});

// Request validation schemas
const extractSchema = z.object({
  action: z.literal('extract'),
  url: z.string().url().refine((url) => {
    try {
      const urlObj = new URL(url);
      return ['youtube.com', 'youtu.be'].some(domain => 
        urlObj.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }, 'Must be a valid YouTube URL'),
  options: z.object({
    language: z.string().length(2).optional(),
    transcriptType: z.enum(['auto', 'manual']).optional(),
  }).optional(),
});

const formatSchema = z.object({
  action: z.literal('format'),
  data: z.array(z.any()).min(1),
  options: z.object({
    style: z.string(),
    includeTimestamps: z.boolean().optional(),
    paragraphLength: z.string().optional(),
  }),
});

const requestSchema = z.discriminatedUnion('action', [
  extractSchema,
  formatSchema,
]);

// Enhanced API route with all security features
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous';
  const requestCount = rateLimitCache.get(ip) ?? 0;
  
  if (requestCount > 10) {
    return new NextResponse('Too many requests', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
      }
    });
  }
  
  rateLimitCache.set(ip, requestCount + 1);
  
  // Request ID for tracking
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
  
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = requestSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json({ 
        error: 'Invalid request',
        requestId,
      }, { 
        status: 400,
        headers: {
          'X-Request-ID': requestId,
        }
      });
    }
    
    const data = validated.data;
    
    if (data.action === 'extract') {
      return await handleSecureExtraction(data.url, data.options, requestId);
    } else {
      return await handleSecureFormatting(data.data, data.options, requestId, request);
    }
  } catch (error) {
    // Log error internally without exposing details
    console.error(`[${requestId}] Error:`, error);
    
    return NextResponse.json({ 
      error: 'Service temporarily unavailable',
      requestId,
    }, { 
      status: 503,
      headers: {
        'X-Request-ID': requestId,
        'Retry-After': '30',
      }
    });
  }
}

async function handleSecureExtraction(
  url: string, 
  options: any, 
  requestId: string
): Promise<NextResponse> {
  // All business logic hidden
  const videoId = extractVideoIdInternal(url);
  
  if (!videoId) {
    return NextResponse.json({ 
      error: 'Unable to process URL',
      requestId,
    }, { status: 400 });
  }
  
  // Execute extraction with internal logic
  const result = await performExtraction(videoId, options);
  
  // Generate secure session
  const sessionToken = generateSecureToken();
  
  // Return minimal response
  return NextResponse.json({
    success: true,
    data: result.transcript,
    metadata: {
      duration: result.duration,
      language: result.language,
    },
    sessionToken,
  }, {
    headers: {
      'X-Request-ID': requestId,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    }
  });
}

async function handleSecureFormatting(
  data: any, 
  options: any,
  requestId: string,
  request: NextRequest
): Promise<NextResponse> {
  // Pass through to Gemini (visible as requested)
  const formattingEndpoint = new URL('/api/format-transcript', request.url);
  
  const response = await fetch(formattingEndpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
    body: JSON.stringify({ transcript: data, options })
  });
  
  // Stream the response
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-ID': requestId,
      },
    });
  }
  
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    }
  });
}

// Internal functions - completely hidden
function extractVideoIdInternal(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
      return match[1];
    }
  }
  
  return null;
}

async function performExtraction(videoId: string, options: any) {
  // Complex provider selection and execution logic
  const provider = selectOptimalProvider();
  
  // Route to appropriate handler
  switch (provider) {
    case 'primary':
      return await executePrimaryExtraction(videoId, options);
    default:
      throw new Error('No available providers');
  }
}

function selectOptimalProvider(): string {
  // Hidden provider selection logic
  if (process.env.OXYLABS_USERNAME && process.env.OXYLABS_PASSWORD) {
    return 'primary';
  }
  return 'none';
}

async function executePrimaryExtraction(videoId: string, options: any) {
  // Import and execute Oxylabs extraction
  const { POST } = await import('../../transcript-oxylabs/route');
  
  const syntheticRequest = new NextRequest(
    new URL('http://internal'), 
    {
      method: 'POST',
      body: JSON.stringify({
        videoId,
        language: options?.language || 'en',
        transcriptOrigin: options?.transcriptType === 'manual' 
          ? 'uploader_provided' 
          : 'auto_generated'
      })
    }
  );
  
  const response = await POST(syntheticRequest);
  const data = await response.json();
  
  return {
    transcript: data.transcript,
    duration: data.transcript?.length ? 
      (data.transcript[data.transcript.length - 1].start || 0) : 0,
    language: data.metadata?.actualLanguage || options?.language || 'en',
  };
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}