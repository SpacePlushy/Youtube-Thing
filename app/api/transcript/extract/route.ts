/**
 * Transcript extraction API with authentication and usage tracking
 * POST - Extract transcript from YouTube video with tier-based limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { checkUsageLimit, incrementUsage } from '@/lib/usage-tracker';
import { canAccessHistory } from '@/lib/clerk-helpers';
import { saveTranscript } from '@/lib/db';
import type { TranscriptResponse, ErrorResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized',
        details: 'Please sign in to extract transcripts',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Check usage limit before extraction
    const usageStats = await checkUsageLimit(userId);

    if (!usageStats.canProceed) {
      const errorResponse: ErrorResponse = {
        error: 'USAGE_LIMIT_EXCEEDED',
        details: `Daily transcript limit reached. Upgrade to increase limits. Resets at ${usageStats.resetTime}`,
      };
      return NextResponse.json(
        {
          ...errorResponse,
          usage: {
            currentUsage: usageStats.currentUsage,
            dailyLimit: usageStats.dailyLimit,
            resetTime: usageStats.resetTime,
            tier: usageStats.tier,
          },
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { videoId, videoUrl, saveToHistory = true } = body as {
      videoId?: string;
      videoUrl?: string;
      saveToHistory?: boolean;
    };

    // Extract video ID from URL if provided instead of videoId
    let extractedVideoId = videoId;
    if (!extractedVideoId && videoUrl) {
      const urlMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      extractedVideoId = urlMatch?.[1];
    }

    console.log('[Transcript Extract API] Received request for video ID:', extractedVideoId);

    if (!extractedVideoId) {
      console.error('[Transcript Extract API] No video ID provided');
      return NextResponse.json(
        { error: 'Bad Request', details: 'Video ID or URL is required' },
        { status: 400 }
      );
    }

    // Fetch transcript from YouTube
    console.log('[Transcript Extract API] Fetching transcript from YouTube...');
    console.log('[Transcript Extract API] Video URL:', `https://www.youtube.com/watch?v=${extractedVideoId}`);

    try {
      console.log('[Transcript Extract API] About to call YoutubeTranscript.fetchTranscript...');
      const transcript = await YoutubeTranscript.fetchTranscript(extractedVideoId);
      console.log('[Transcript Extract API] fetchTranscript returned:', transcript);
      console.log('[Transcript Extract API] Transcript type:', typeof transcript);
      console.log('[Transcript Extract API] Is array:', Array.isArray(transcript));
      console.log('[Transcript Extract API] Length:', transcript?.length);

      if (!transcript) {
        console.log('[Transcript Extract API] Error: transcript is null/undefined');
        return NextResponse.json(
          { error: 'Transcript Extraction Failed', details: 'No transcript data returned' },
          { status: 500 }
        );
      }

      if (transcript.length === 0) {
        console.log('[Transcript Extract API] Warning: Transcript is empty - video may not have captions');
        return NextResponse.json(
          { error: 'No Transcript Available', details: 'This video does not have captions enabled' },
          { status: 404 }
        );
      }

      console.log('[Transcript Extract API] First transcript item:', transcript[0]);

      // Format the transcript data
      const formattedTranscript = transcript.map((item) => ({
        text: item.text,
        start: item.offset / 1000,
        duration: item.duration / 1000,
        timestamp: formatTimestamp(item.offset / 1000),
      }));

      // Increment usage counter after successful extraction
      try {
        await incrementUsage(userId);
        console.log(`[Transcript Extract API] Usage incremented for user ${userId}`);
      } catch (error) {
        console.error('[Transcript Extract API] Error incrementing usage (non-critical):', error);
        // Don't fail the request if usage increment fails
      }

      // Get updated usage stats to return in response
      const updatedStats = await checkUsageLimit(userId);

      // Save to history if user has access and saveToHistory is true
      if (saveToHistory) {
        const hasHistoryAccess = await canAccessHistory(userId);

        if (hasHistoryAccess) {
          try {
            // Get video metadata (simplified - could be enhanced with YouTube API)
            const videoTitle = `Video ${extractedVideoId}`; // Placeholder
            const fullTranscriptText = formattedTranscript.map((t) => t.text).join(' ');

            const transcriptId = await saveTranscript({
              userId,
              videoId: extractedVideoId,
              videoTitle,
              channelName: undefined,
              videoDuration: undefined,
              transcriptText: fullTranscriptText,
            });

            if (transcriptId) {
              console.log(`[Transcript Extract API] Saved transcript to history: ${transcriptId}`);
            } else {
              console.warn('[Transcript Extract API] Failed to save transcript to history (non-critical)');
            }
          } catch (error) {
            console.error('[Transcript Extract API] Error saving to history (non-critical):', error);
            // Don't fail the request if history save fails
          }
        } else {
          console.log('[Transcript Extract API] User does not have history access (Free tier)');
        }
      }

      // Return successful response with usage stats
      const response: TranscriptResponse = {
        transcript: formattedTranscript,
        metadata: {
          videoId: extractedVideoId,
          title: `Video ${extractedVideoId}`, // Placeholder
          language: 'en',
          origin: 'auto_generated',
        },
        usage: {
          currentUsage: updatedStats.currentUsage,
          dailyLimit: updatedStats.dailyLimit,
          tier: updatedStats.tier,
          resetTime: updatedStats.resetTime,
        },
      };

      console.log('[Transcript Extract API] Returning formatted transcript with usage stats');
      return NextResponse.json(response);
    } catch (transcriptError) {
      console.error('[Transcript Extract API] Error details:', {
        message: transcriptError instanceof Error ? transcriptError.message : 'Unknown error',
        stack: transcriptError instanceof Error ? transcriptError.stack : undefined,
        type: transcriptError?.constructor?.name,
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to fetch transcript';
      if (transcriptError instanceof Error) {
        if (transcriptError.message.includes('Could not find')) {
          errorMessage = 'No transcript available for this video. The video might not have captions enabled.';
        } else if (transcriptError.message.includes('Invalid video')) {
          errorMessage = 'Invalid video ID or video not found.';
        } else {
          errorMessage = transcriptError.message;
        }
      }

      return NextResponse.json({ error: 'Transcript Extraction Failed', details: errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error('[Transcript Extract API] Outer error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
