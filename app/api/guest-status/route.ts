import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getClientIdentifier } from '@/lib/rate-limiter-upstash';
import { hasGuestUsedFreeExtraction } from '@/lib/guest-usage-upstash';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // If user is signed in, they don't have guest limitations
    if (userId) {
      return NextResponse.json({
        hasUsedFreeExtraction: false,
        isAuthenticated: true,
      });
    }
    
    // Check guest usage
    const clientId = getClientIdentifier(request);
    const hasUsed = await hasGuestUsedFreeExtraction(clientId);
    
    return NextResponse.json({
      hasUsedFreeExtraction: hasUsed,
      isAuthenticated: false,
    });
  } catch (error) {
    console.error('[Guest Status] Error:', error);
    return NextResponse.json({ 
      hasUsedFreeExtraction: false,
      isAuthenticated: false,
      error: true,
    });
  }
}