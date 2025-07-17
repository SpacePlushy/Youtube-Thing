import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(request: NextRequest) {
  try {
    // Get all keys matching our patterns
    const patterns = [
      'oxylabs:daily:usage:*',
      '@upstash/ratelimit:global-daily-oxylabs:*',
      '@upstash/ratelimit:*'
    ];
    
    const allKeys: string[] = [];
    
    for (const pattern of patterns) {
      try {
        // Use scan to find keys (Upstash supports pattern matching)
        let cursor = 0;
        do {
          const result = await redis.scan(cursor, {
            match: pattern,
            count: 100
          });
          cursor = result[0];
          allKeys.push(...(result[1] || []));
        } while (cursor !== 0);
      } catch (e) {
        console.error(`Error scanning pattern ${pattern}:`, e);
      }
    }
    
    // Get values for our simple keys
    const keyValues: Record<string, any> = {};
    for (const key of allKeys.slice(0, 20)) { // Limit to first 20 keys
      try {
        const value = await redis.get(key);
        keyValues[key] = value;
      } catch (e) {
        keyValues[key] = `Error: ${e}`;
      }
    }
    
    // Get today's key specifically
    const todayKey = `oxylabs:daily:usage:${new Date().toISOString().split('T')[0]}`;
    const todayValue = await redis.get(todayKey);
    
    return NextResponse.json({
      todayKey,
      todayValue,
      totalKeysFound: allKeys.length,
      sampleKeys: allKeys.slice(0, 20),
      keyValues,
      patterns,
    });
    
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug keys',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}