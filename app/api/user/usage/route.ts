/**
 * User usage stats API endpoint
 * Returns current usage statistics for authenticated user
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUsageStats } from '@/lib/usage-tracker';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view usage stats' },
        { status: 401 }
      );
    }

    // Get usage stats
    const stats = await getUsageStats(userId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API Usage] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}
