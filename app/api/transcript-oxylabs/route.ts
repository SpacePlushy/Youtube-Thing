import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { extractVideoId } from '@/lib/youtube';

interface OxylabsResponse {
  results: Array<{
    content: any;
    created_at: string;
    updated_at: string;
    page: number;
    url: string;
    job_id: string;
    status_code: number;
  }>;
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    // BotID verification - protect against automated transcript extraction
    // Enhanced with proper error handling and CSP-compatible configuration
    try {
      console.log('[BotID] Starting bot verification...');
      
      // Log request headers for debugging
      const headers = Object.fromEntries(request.headers.entries());
      console.log('[BotID] Request headers:', {
        'user-agent': headers['user-agent'],
        'x-botid-token': headers['x-botid-token'] || 'NOT PRESENT',
        'x-botid-session': headers['x-botid-session'] || 'NOT PRESENT',
        'referer': headers['referer'],
        'origin': headers['origin']
      });
      
      const botVerification = await checkBotId();
      console.log('[BotID] Verification result:', { 
        isBot: botVerification.isBot,
        isHuman: botVerification.isHuman,
        isGoodBot: botVerification.isGoodBot,
        bypassed: botVerification.bypassed,
        env: process.env.NODE_ENV 
      });
      
      // Strict BotID check - no bypasses
      if (botVerification.isBot && !botVerification.isGoodBot) {
        const userAgent = request.headers.get('user-agent') || '';
        console.log('[BotID] Bot detected, blocking request:', {
          isBot: botVerification.isBot,
          isHuman: botVerification.isHuman,
          isGoodBot: botVerification.isGoodBot,
          bypassed: botVerification.bypassed,
          userAgent: userAgent.substring(0, 150)
        });
        return NextResponse.json({ 
          error: 'Access denied' 
        }, { status: 403 });
      }
      console.log('[BotID] Request verified as legitimate');
    } catch (botError) {
      console.warn('[BotID] Bot verification failed, allowing request to proceed (graceful degradation):', botError instanceof Error ? botError.message : 'Unknown error');
      // Continue with the request even if BotID fails - this ensures legitimate users are never blocked
    }

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
    
    console.log('[Oxylabs] Original input:', videoIdOrUrl);
    console.log('[Oxylabs] Input type detection - contains youtube.com:', videoIdOrUrl.includes('youtube.com'));
    console.log('[Oxylabs] Input type detection - contains youtu.be:', videoIdOrUrl.includes('youtu.be'));
    console.log('[Oxylabs] Input type detection - contains http:', videoIdOrUrl.includes('http'));
    
    // Check if it's a URL (contains youtube.com, youtu.be, or http)
    if (videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be') || videoIdOrUrl.includes('http')) {
      console.log('[Oxylabs] Detected URL format, extracting video ID...');
      const extractedId = extractVideoId(videoIdOrUrl);
      if (!extractedId) {
        console.error('[Oxylabs] Failed to extract video ID from URL:', videoIdOrUrl);
        return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      }
      videoId = extractedId;
      console.log('[Oxylabs] Successfully extracted video ID from URL:', videoIdOrUrl, '->', videoId);
    } else {
      console.log('[Oxylabs] Detected plain video ID format, using as-is:', videoId);
    }

    console.log('[Oxylabs] Extracting transcript for video:', videoId);
    console.log('[Oxylabs] Language:', language);
    console.log('[Oxylabs] Transcript origin:', transcriptOrigin);

    const username = process.env.OXYLABS_USERNAME;
    const password = process.env.OXYLABS_PASSWORD;

    if (!username || !password) {
      console.error('[Oxylabs] Missing credentials');
      return NextResponse.json({ 
        error: 'Oxylabs credentials not configured' 
      }, { status: 500 });
    }

    // Create basic auth header
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    // Prepare request payload
    const requestPayload = {
      source: 'youtube_transcript',
      query: videoId,
      context: [
        {
          key: 'language_code',
          value: language
        },
        {
          key: 'transcript_origin',
          value: transcriptOrigin
        }
      ]
    };

    console.log('[Oxylabs] Sending request to Oxylabs API with payload:', JSON.stringify(requestPayload, null, 2));
    console.log('[Oxylabs] Video ID being sent to Oxylabs:', videoId);
    console.log('[Oxylabs] Video ID length:', videoId.length);
    console.log('[Oxylabs] Video ID format validation (11 chars, alphanumeric):', /^[a-zA-Z0-9_-]{11}$/.test(videoId));

    // First, try with user's preferred settings
    let oxylabsResponse = await fetch('https://realtime.oxylabs.io/v1/queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify(requestPayload),
    });

    console.log('[Oxylabs] Response status:', oxylabsResponse.status);

    // Track what we actually get
    let actualLanguage = language;
    let actualOrigin = transcriptOrigin;

    // If preferred transcript not found, try fallback options
    if (oxylabsResponse.status === 404) {
      console.log('[Oxylabs] Preferred transcript not found, trying fallback...');
      
      // Fallback 1: If uploader_provided failed, try auto_generated
      if (transcriptOrigin === 'uploader_provided') {
        console.log('[Oxylabs] Trying auto-generated transcript...');
        actualOrigin = 'auto_generated';
        oxylabsResponse = await fetch('https://realtime.oxylabs.io/v1/queries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`,
          },
          body: JSON.stringify({
            source: 'youtube_transcript',
            query: videoId,
            context: [
              {
                key: 'language_code',
                value: language
              },
              {
                key: 'transcript_origin',
                value: 'auto_generated'
              }
            ]
          }),
        });
      }
      
      // Fallback 2: If specific language failed, try English
      if (oxylabsResponse.status === 404 && language !== 'en') {
        console.log('[Oxylabs] Trying English transcript...');
        actualLanguage = 'en';
        actualOrigin = 'auto_generated';
        oxylabsResponse = await fetch('https://realtime.oxylabs.io/v1/queries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${credentials}`,
          },
          body: JSON.stringify({
            source: 'youtube_transcript',
            query: videoId,
            context: [
              {
                key: 'language_code',
                value: 'en'
              },
              {
                key: 'transcript_origin',
                value: 'auto_generated'
              }
            ]
          }),
        });
      }
    }

    if (!oxylabsResponse.ok) {
      const errorText = await oxylabsResponse.text();
      console.error('[Oxylabs] API error:', errorText);
      
      if (oxylabsResponse.status === 404) {
        return NextResponse.json({ 
          error: 'No transcript available for this video' 
        }, { status: 404 });
      }
      
      if (oxylabsResponse.status === 400) {
        // Invalid video ID or URL
        return NextResponse.json({ 
          error: 'Invalid YouTube video. Please check the URL and try again.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch transcript. Please try again later.' 
      }, { status: 500 });
    }

    const data = await oxylabsResponse.json() as OxylabsResponse;
    console.log('[Oxylabs] Received response with', data.results?.length || 0, 'results');

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ 
        error: 'No transcript data received' 
      }, { status: 404 });
    }

    const result = data.results[0];
    if (result.status_code !== 200) {
      console.error('[Oxylabs] Result status code:', result.status_code);
      
      // If we get a 404 in the result, trigger fallback logic
      if (result.status_code === 404) {
        console.log('[Oxylabs] Transcript not found (404 in result), trying fallback...');
        
        // Fallback 1: If uploader_provided failed, try auto_generated
        if (transcriptOrigin === 'uploader_provided' && actualOrigin === 'uploader_provided') {
          console.log('[Oxylabs] Trying auto-generated transcript...');
          actualOrigin = 'auto_generated';
          
          const fallbackResponse = await fetch('https://realtime.oxylabs.io/v1/queries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
              source: 'youtube_transcript',
              query: videoId,
              context: [
                {
                  key: 'language_code',
                  value: actualLanguage
                },
                {
                  key: 'transcript_origin',
                  value: 'auto_generated'
                }
              ]
            }),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json() as OxylabsResponse;
            if (fallbackData.results?.[0]?.status_code === 200) {
              // Use the fallback result
              const fallbackContent = fallbackData.results[0].content;
              const transcript = parseOxylabsTranscript(fallbackContent);
              
              if (transcript && transcript.length > 0) {
                console.log('[Oxylabs] Fallback successful with', transcript.length, 'segments');
                return NextResponse.json({ 
                  transcript,
                  success: true,
                  provider: 'oxylabs',
                  segmentCount: transcript.length,
                  metadata: {
                    requestedLanguage: language,
                    actualLanguage,
                    requestedOrigin: transcriptOrigin,
                    actualOrigin,
                    hadToFallback: true
                  }
                });
              }
            }
          }
        }
        
        // Fallback 2: If specific language failed, try English
        if (actualLanguage !== 'en') {
          console.log('[Oxylabs] Trying English transcript...');
          actualLanguage = 'en';
          actualOrigin = 'auto_generated';
          
          const fallbackResponse = await fetch('https://realtime.oxylabs.io/v1/queries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
              source: 'youtube_transcript',
              query: videoId,
              context: [
                {
                  key: 'language_code',
                  value: 'en'
                },
                {
                  key: 'transcript_origin',
                  value: 'auto_generated'
                }
              ]
            }),
          });

          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json() as OxylabsResponse;
            if (fallbackData.results?.[0]?.status_code === 200) {
              // Use the fallback result
              const fallbackContent = fallbackData.results[0].content;
              const transcript = parseOxylabsTranscript(fallbackContent);
              
              if (transcript && transcript.length > 0) {
                console.log('[Oxylabs] English fallback successful with', transcript.length, 'segments');
                return NextResponse.json({ 
                  transcript,
                  success: true,
                  provider: 'oxylabs',
                  segmentCount: transcript.length,
                  metadata: {
                    requestedLanguage: language,
                    actualLanguage,
                    requestedOrigin: transcriptOrigin,
                    actualOrigin,
                    hadToFallback: true
                  }
                });
              }
            }
          }
        }
      }
      
      return NextResponse.json({ 
        error: `Failed to extract transcript: ${result.status_code}` 
      }, { status: 500 });
    }

    const transcriptContent = result.content;
    console.log('[Oxylabs] Raw content type:', typeof transcriptContent);
    console.log('[Oxylabs] Content preview:', JSON.stringify(transcriptContent).substring(0, 200));

    // Parse the transcript content
    const transcript = parseOxylabsTranscript(transcriptContent);
    
    if (!transcript || transcript.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to parse transcript content' 
      }, { status: 500 });
    }

    console.log('[Oxylabs] Successfully parsed', transcript.length, 'transcript segments');

    return NextResponse.json({ 
      transcript,
      success: true,
      provider: 'oxylabs',
      segmentCount: transcript.length,
      metadata: {
        requestedLanguage: language,
        actualLanguage,
        requestedOrigin: transcriptOrigin,
        actualOrigin,
        hadToFallback: actualLanguage !== language || actualOrigin !== transcriptOrigin
      }
    });

  } catch (error) {
    console.error('[Oxylabs] Exception:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

function parseOxylabsTranscript(content: any): TranscriptSegment[] {
  try {
    console.log('[Oxylabs Parser] Raw content structure:', JSON.stringify(content).substring(0, 500));
    
    // Oxylabs returns transcript segments in transcriptSegmentRenderer format
    let transcriptData = content;
    
    // If content is an array, use it directly
    if (Array.isArray(content)) {
      transcriptData = content;
    }

    if (!Array.isArray(transcriptData)) {
      console.error('[Oxylabs Parser] Expected array, got:', typeof transcriptData);
      return [];
    }

    const segments: TranscriptSegment[] = [];
    
    for (const item of transcriptData) {
      // Handle Oxylabs transcriptSegmentRenderer format
      if (item.transcriptSegmentRenderer) {
        const renderer = item.transcriptSegmentRenderer;
        
        // Extract text from snippet.runs
        let text = '';
        if (renderer.snippet && renderer.snippet.runs) {
          text = renderer.snippet.runs.map((run: any) => run.text || '').join('');
        }
        
        // Extract timing information
        const startMs = parseInt(renderer.startMs || '0');
        const endMs = parseInt(renderer.endMs || '0');
        const start = startMs / 1000; // Convert to seconds
        const duration = (endMs - startMs) / 1000; // Duration in seconds

        if (text && text.trim()) {
          segments.push({
            text: text.trim(),
            start,
            duration,
            timestamp: formatTimestamp(start)
          });
        }
      }
      // Handle other possible formats as fallback
      else if (typeof item === 'string') {
        segments.push({
          text: item.trim(),
          start: segments.length * 2,
          duration: 2,
          timestamp: formatTimestamp(segments.length * 2)
        });
      }
      else if (item.text || item.content) {
        const text = item.text || item.content || '';
        const start = parseFloat(item.start || item.startTime || item.time || 0);
        const duration = parseFloat(item.duration || item.dur || 2);
        
        if (text && text.trim()) {
          segments.push({
            text: text.trim(),
            start,
            duration,
            timestamp: formatTimestamp(start)
          });
        }
      }
    }

    console.log('[Oxylabs Parser] Parsed', segments.length, 'segments');
    return segments;
  } catch (error) {
    console.error('[Oxylabs Parser] Error parsing transcript:', error);
    return [];
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