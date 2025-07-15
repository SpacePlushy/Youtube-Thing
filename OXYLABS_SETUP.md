# Oxylabs YouTube Transcript API Setup

## Required Environment Variables

Copy `.env.example` to `.env.local` and add your Oxylabs credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual credentials from Oxylabs.

## Getting Oxylabs Credentials

1. Visit [Oxylabs](https://oxylabs.io) and create an account
2. Subscribe to their Web Scraper API plan that includes YouTube transcript access
3. Get your username and password from the dashboard
4. Add them to your environment variables

## Testing the API

The new Oxylabs API is now the default provider. Test with any YouTube video ID:

```bash
curl -X POST http://localhost:3000/api/transcript-oxylabs \
  -H "Content-Type: application/json" \
  -d '{"videoId":"dQw4w9WgXcQ"}'
```

## Features

- ✅ Enterprise-grade reliability
- ✅ No rate limiting issues
- ✅ Integrated directly in Vercel
- ✅ Automatic language detection (English priority)
- ✅ Auto-generated and uploader-provided transcript support
- ✅ Proper error handling for missing transcripts

## API Response Format

```json
{
  "transcript": [
    {
      "text": "transcript text here",
      "start": 0.0,
      "duration": 2.0,
      "timestamp": "0:00"
    }
  ],
  "success": true,
  "provider": "oxylabs",
  "segmentCount": 150
}
```