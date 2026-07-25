import { NextRequest, NextResponse } from 'next/server';
import { extractVideoId } from '@/lib/youtube';

interface YoutubeTranscriptIoTrack {
  language: string;
  transcript: Array<{
    text: string;
    start: string;
    dur: string;
  }>;
}

interface YoutubeTranscriptIoResult {
  id: string;
  title?: string;
  isLoginRequired?: boolean;
  languages?: Array<{ label: string; languageCode: string }>;
  tracks?: YoutubeTranscriptIoTrack[];
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { videoId: videoIdOrUrl, language = 'en', transcriptOrigin = 'auto_generated' } = await request.json() as {
      videoId: string;
      language?: string;
      transcriptOrigin?: 'auto_generated' | 'uploader_provided';
    };

    if (!videoIdOrUrl) {
      return NextResponse.json({ error: 'Video ID or URL is required' }, { status: 400 });
    }

    // Handle both video ID and full URLs
    let videoId = videoIdOrUrl;

    if (videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be') || videoIdOrUrl.includes('http')) {
      const extractedId = extractVideoId(videoIdOrUrl);
      if (!extractedId) {
        console.error('[YoutubeTranscriptIo] Failed to extract video ID from URL:', videoIdOrUrl);
        return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      }
      videoId = extractedId;
    }

    console.log('[YoutubeTranscriptIo] Extracting transcript for video:', videoId);

    const token = process.env.YOUTUBE_TRANSCRIPT_IO_TOKEN;

    if (!token) {
      console.error('[YoutubeTranscriptIo] Missing API token');
      return NextResponse.json({
        error: 'Transcript service not configured'
      }, { status: 500 });
    }

    const apiResponse = await fetch('https://www.youtube-transcript.io/api/transcripts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${token}`,
      },
      body: JSON.stringify({ ids: [videoId] }),
    });

    console.log('[YoutubeTranscriptIo] Response status:', apiResponse.status);

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('[YoutubeTranscriptIo] API error:', errorText);

      if (apiResponse.status === 400) {
        return NextResponse.json({
          error: 'Invalid YouTube video. Please check the URL and try again.'
        }, { status: 400 });
      }

      if (apiResponse.status === 401) {
        return NextResponse.json({
          error: 'Transcript service not configured'
        }, { status: 500 });
      }

      if (apiResponse.status === 429) {
        return NextResponse.json({
          error: 'Too many requests. Please try again shortly.'
        }, { status: 429 });
      }

      return NextResponse.json({
        error: 'Failed to fetch transcript. Please try again later.'
      }, { status: 500 });
    }

    const results = await apiResponse.json() as YoutubeTranscriptIoResult[];
    const result = results?.[0];

    if (!result || result.isLoginRequired || !result.tracks || result.tracks.length === 0) {
      return NextResponse.json({
        error: 'No transcript available for this video'
      }, { status: 404 });
    }

    // Resolve which track matches the requested language, falling back to
    // English, then to whatever track is available — the API has no concept
    // of auto-generated vs. uploader-provided, so transcriptOrigin can't be
    // matched against anything and is only echoed back.
    const languages = result.languages || [];
    const findTrack = (languageCode: string) => {
      const label = languages.find(l => l.languageCode === languageCode)?.label;
      return label ? result.tracks!.find(t => t.language === label) : undefined;
    };

    let track = findTrack(language);
    let actualLanguage = language;

    if (!track) {
      track = findTrack('en');
      actualLanguage = 'en';
    }

    if (!track) {
      track = result.tracks[0];
      actualLanguage = languages.find(l => l.label === track!.language)?.languageCode || track.language;
    }

    const transcript: TranscriptSegment[] = track.transcript
      .map(item => {
        const start = parseFloat(item.start) || 0;
        return {
          text: item.text.trim(),
          start,
          duration: parseFloat(item.dur) || 0,
          timestamp: formatTimestamp(start)
        };
      })
      .filter(segment => segment.text.length > 0);

    if (transcript.length === 0) {
      return NextResponse.json({
        error: 'Failed to parse transcript content'
      }, { status: 500 });
    }

    console.log('[YoutubeTranscriptIo] Successfully parsed', transcript.length, 'transcript segments');

    return NextResponse.json({
      transcript,
      success: true,
      provider: 'youtube-transcript-io',
      segmentCount: transcript.length,
      metadata: {
        requestedLanguage: language,
        actualLanguage,
        requestedOrigin: transcriptOrigin,
        actualOrigin: transcriptOrigin,
        hadToFallback: actualLanguage !== language
      }
    });

  } catch (error) {
    console.error('[YoutubeTranscriptIo] Exception:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
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
