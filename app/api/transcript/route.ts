import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json() as { videoId: string };
    
    console.log('[Transcript API] Received request for video ID:', videoId);
    
    if (!videoId) {
      console.error('[Transcript API] No video ID provided');
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    // This runs on the server, so no CORS issues!
    console.log('[Transcript API] Fetching transcript from YouTube...');
    console.log('[Transcript API] Video URL:', `https://www.youtube.com/watch?v=${videoId}`);
    
    try {
      console.log('[Transcript API] About to call YoutubeTranscript.fetchTranscript...');
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      console.log('[Transcript API] fetchTranscript returned:', transcript);
      console.log('[Transcript API] Transcript type:', typeof transcript);
      console.log('[Transcript API] Is array:', Array.isArray(transcript));
      console.log('[Transcript API] Length:', transcript?.length);
      
      if (!transcript) {
        console.log('[Transcript API] Error: transcript is null/undefined');
        return NextResponse.json({ transcript: [] });
      }
      
      if (transcript.length === 0) {
        console.log('[Transcript API] Warning: Transcript is empty - video may not have captions or be rate limited');
        return NextResponse.json({ transcript: [] });
      } else {
        console.log('[Transcript API] First transcript item:', transcript[0]);
      }
      
      // Format the transcript data
      const formattedTranscript = transcript.map(item => ({
        text: item.text,
        start: item.offset / 1000,
        duration: item.duration / 1000,
        timestamp: formatTimestamp(item.offset / 1000)
      }));
      
      console.log('[Transcript API] Returning formatted transcript');
      return NextResponse.json({ transcript: formattedTranscript });
      
    } catch (transcriptError) {
      console.error('[Transcript API] Error details:', {
        message: transcriptError instanceof Error ? transcriptError.message : 'Unknown error',
        stack: transcriptError instanceof Error ? transcriptError.stack : undefined,
        type: transcriptError?.constructor?.name
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
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('[Transcript API] Outer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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