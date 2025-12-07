/**
 * Single transcript API endpoint
 * GET - Get full transcript by ID
 * DELETE - Delete transcript by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTranscriptById, deleteTranscript } from '@/lib/db';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access transcripts' },
        { status: 401 }
      );
    }

    // Get transcript ID from params
    const { id } = await params;

    // Get transcript (includes ownership check)
    const transcript = await getTranscriptById(id, userId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Transcript not found or you do not have permission to access it' },
        { status: 404 }
      );
    }

    // Format response
    const response = {
      id: transcript.id,
      videoId: transcript.video_id,
      videoTitle: transcript.video_title,
      channelName: transcript.channel_name,
      videoDuration: transcript.video_duration,
      transcriptText: transcript.transcript_text,
      createdAt: new Date(transcript.created_at).toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API Transcript] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to delete transcripts' },
        { status: 401 }
      );
    }

    // Get transcript ID from params
    const { id } = await params;

    // Delete transcript (includes ownership check)
    const success = await deleteTranscript(id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Transcript not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript deleted successfully',
    });
  } catch (error) {
    console.error('[API Transcript Delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete transcript' },
      { status: 500 }
    );
  }
}
