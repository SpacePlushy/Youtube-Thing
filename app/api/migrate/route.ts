/**
 * One-time database migration endpoint
 * DELETE THIS FILE after running the migration!
 *
 * Visit: https://youtubething.com/api/migrate?secret=YOUR_NEXTAUTH_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { initAuthTables } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Simple security check - require the NEXTAUTH_SECRET as query param
  const secret = request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await initAuthTables();

    return NextResponse.json({
      success: true,
      message: 'Auth tables created successfully. DELETE THIS FILE NOW!',
    });
  } catch (error) {
    console.error('[Migration] Error:', error);

    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
