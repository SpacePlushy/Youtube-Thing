/**
 * Transcript history API endpoint
 * GET - List user's transcript history (paginated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranscriptHistory } from '@/lib/db';
import { canAccessHistory } from '@/lib/subscription-helpers';
import type { TranscriptHistoryResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access transcript history' },
        { status: 401 }
      );
    }

    // Check if user can access history (Pro tier)
    const hasAccess = await canAccessHistory(userId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Upgrade to Pro plan to access transcript history',
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sortBy = (searchParams.get('sortBy') || 'created_at') as 'created_at' | 'video_title';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

    // Validate sortBy
    if (sortBy !== 'created_at' && sortBy !== 'video_title') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid sortBy parameter. Use "created_at" or "video_title"' },
        { status: 400 }
      );
    }

    // Validate order
    if (order !== 'asc' && order !== 'desc') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid order parameter. Use "asc" or "desc"' },
        { status: 400 }
      );
    }

    // Get transcript history
    const { transcripts, total } = await getTranscriptHistory(userId, page, limit, sortBy, order);

    // Format response
    const response: TranscriptHistoryResponse = {
      transcripts: transcripts.map((t) => ({
        id: t.id,
        videoId: t.video_id,
        videoTitle: t.video_title,
        channelName: t.channel_name,
        videoDuration: t.video_duration,
        createdAt: new Date(t.created_at).toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API History] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch transcript history' },
      { status: 500 }
    );
  }
}
