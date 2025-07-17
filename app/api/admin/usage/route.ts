import { NextRequest, NextResponse } from 'next/server';
import { getGlobalDailyUsage } from '@/lib/rate-limiter-upstash';

export async function GET(request: NextRequest) {
  try {
    // Simple IP-based admin access (you can enhance this later)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
              request.headers.get('x-real-ip') || 
              'unknown';
    
    console.log(`[Admin] Usage check requested from IP: ${ip}`);
    
    // Get current global daily usage
    const usage = await getGlobalDailyUsage();
    
    // Calculate percentage used
    const percentageUsed = Math.round((usage.used / usage.limit) * 100);
    
    // Format reset time
    const resetDate = new Date(usage.resetTime);
    
    return NextResponse.json({
      oxylabsDailyUsage: {
        used: usage.used,
        remaining: usage.remaining,
        limit: usage.limit,
        percentageUsed,
        resetTime: usage.resetTime,
        resetDate: resetDate.toISOString(),
        timeUntilReset: `${Math.ceil((usage.resetTime - Date.now()) / (1000 * 60 * 60))} hours`,
      },
      status: usage.remaining > 0 ? 'healthy' : 'limit_reached',
      message: usage.remaining > 0 
        ? `${usage.remaining} requests remaining today`
        : 'Daily limit reached - service will resume tomorrow',
    });
    
  } catch (error) {
    console.error('[Admin] Error getting usage stats:', error);
    return NextResponse.json({ 
      error: 'Failed to get usage statistics' 
    }, { status: 500 });
  }
}