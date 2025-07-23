import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getClientIdentifier } from '@/lib/rate-limiter-upstash';
import { hasGuestUsedFreeExtraction, getGuestUsage } from '@/lib/guest-usage-upstash';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const clientId = getClientIdentifier(request);
    
    // Get detailed guest usage info
    const hasUsed = await hasGuestUsedFreeExtraction(clientId);
    const usage = await getGuestUsage(clientId);
    
    // Get request headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    
    return NextResponse.json({
      userId: userId || null,
      clientId,
      hasUsedFreeExtraction: hasUsed,
      guestUsageData: usage,
      requestHeaders: {
        'x-forwarded-for': headers['x-forwarded-for'] || null,
        'x-real-ip': headers['x-real-ip'] || null,
        'cf-connecting-ip': headers['cf-connecting-ip'] || null,
        'x-vercel-forwarded-for': headers['x-vercel-forwarded-for'] || null,
        'user-agent': headers['user-agent'] || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Debug Guest Status] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}