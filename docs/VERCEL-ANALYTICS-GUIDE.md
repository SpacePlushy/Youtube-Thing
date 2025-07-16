# Vercel Web Analytics Implementation Guide

This guide covers the implementation of Vercel Web Analytics in the YouTube Thing project for business analytics purposes.

## Implementation Status

✅ **Basic Analytics Implemented**
- Installed `@vercel/analytics` package
- Added `<Analytics />` component to root layout
- Automatic page view tracking enabled

✅ **Custom Event Tracking Implemented**
- Created analytics utility (`/lib/analytics.ts`)
- Integrated tracking in main page (`/app/page.tsx`)
- Integrated tracking in transcript viewer (`/components/transcript-viewer.tsx`)
- Tracking the following events:
  - Transcript extraction (with cache status)
  - AI formatting (with duration and errors)
  - Export actions (copy/download for raw/formatted)
  - Cache actions (hit/miss/clear)
  - Error tracking

## Basic Setup (Completed)

### 1. Installation
```bash
npm install @vercel/analytics
```

### 2. Integration in Layout
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 3. Enable in Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on "Analytics" tab
4. Click "Enable"

## Advanced Configuration Options

### Debug Mode
For development debugging, you can enable console logging:

```tsx
<Analytics debug={true} />
```

### Custom Configuration
```tsx
<Analytics
  mode={'production'} // Force production mode
  debug={false}       // Disable debug logging
  beforeSend={(event) => {
    // Modify or filter events before sending
    if (event.url.includes('/private')) {
      return null; // Don't track private pages
    }
    return event;
  }}
/>
```

## Custom Event Tracking (Pro/Enterprise Feature)

For tracking specific user actions like button clicks or form submissions:

### 1. Install the SDK
```bash
npm install @vercel/analytics
```

### 2. Track Custom Events
```tsx
import { track } from '@vercel/analytics';

// Track transcript extraction
const handleExtract = async () => {
  // ... existing code ...
  
  track('transcript_extracted', {
    videoId: extractedVideoId,
    language: selectedLanguage,
    transcriptType: transcriptOrigin,
    source: usingCache ? 'cache' : 'api'
  });
};

// Track AI formatting
const handleFormat = async (options) => {
  track('transcript_formatted', {
    style: options.style,
    includeTimestamps: options.includeTimestamps,
    paragraphLength: options.paragraphLength,
    transcriptLength: transcript.length
  });
  
  // ... existing formatting code ...
};

// Track exports
const handleCopy = () => {
  track('transcript_copied');
  // ... copy logic ...
};

const handleDownload = () => {
  track('transcript_downloaded');
  // ... download logic ...
};
```

## Implementing Business Analytics

### Key Metrics to Track

1. **User Engagement**
   - Page views (automatic)
   - Unique visitors
   - Session duration
   - Bounce rate

2. **Feature Usage** (requires custom events)
   - Transcript extractions per day
   - Most used languages
   - Transcript types (auto-generated vs uploader-provided)
   - AI formatting usage
   - Export methods (copy vs download)

3. **Performance Metrics**
   - Cache hit rate
   - API response times
   - Error rates

### Example Implementation for Business Metrics

Create a utility file for analytics:

```tsx
// lib/analytics.ts
import { track } from '@vercel/analytics';

export const analytics = {
  // Track successful transcript extraction
  trackExtraction: (data: {
    videoId: string;
    language: string;
    transcriptType: string;
    cached: boolean;
    duration?: number;
  }) => {
    track('transcript_extraction', data);
  },

  // Track AI formatting
  trackFormatting: (data: {
    style: string;
    transcriptLength: number;
    duration?: number;
    error?: boolean;
  }) => {
    track('ai_formatting', data);
  },

  // Track errors
  trackError: (data: {
    type: 'extraction' | 'formatting' | 'api';
    error: string;
    context?: any;
  }) => {
    track('error_occurred', data);
  },

  // Track user actions
  trackAction: (action: string, data?: any) => {
    track(action, data);
  }
};
```

### Integration Example

```tsx
// In your page.tsx
import { analytics } from '@/lib/analytics';

const handleExtract = async (e: React.FormEvent) => {
  const startTime = Date.now();
  
  try {
    // ... extraction logic ...
    
    analytics.trackExtraction({
      videoId,
      language,
      transcriptType: transcriptOrigin,
      cached: usingCache,
      duration: Date.now() - startTime
    });
  } catch (error) {
    analytics.trackError({
      type: 'extraction',
      error: error.message,
      context: { videoId, language }
    });
  }
};
```

## Data Access and Analysis

### Viewing Analytics

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on "Analytics" tab
4. View metrics:
   - Visitors
   - Page Views
   - Top Pages
   - Top Referrers
   - Countries
   - Operating Systems
   - Browsers

### Custom Events (Pro/Enterprise)
- Event names
- Event counts
- Event properties
- Conversion funnels

## Important Notes

### Pricing
- **Hobby Plan**: Basic web analytics (page views, visitors)
- **Pro Plan**: Custom events + advanced analytics
- **Enterprise**: Full feature set + data export

### Privacy
- Vercel Analytics is privacy-friendly
- No cookies required
- GDPR compliant
- No personal data collected

### Development
- Analytics are NOT tracked in development mode by default
- Use `debug={true}` to test in development
- Events show up in dashboard within minutes

### Limitations
- 10MB max payload per event
- Events older than 90 days are archived
- Rate limiting applies to prevent abuse

## Next Steps

1. **Deploy to Vercel** to start collecting data
2. **Monitor initial metrics** for baseline
3. **Implement custom events** if on Pro plan
4. **Set up alerts** for important metrics
5. **Create monthly reports** for business insights

## Troubleshooting

### Analytics Not Showing
1. Ensure Analytics is enabled in Vercel Dashboard
2. Check that you're in production (not development)
3. Verify `<Analytics />` is in root layout
4. Check browser network tab for `/_vercel/insights/view` requests

### Custom Events Not Working
1. Verify you're on Pro or Enterprise plan
2. Check event name format (no spaces, lowercase)
3. Ensure data payload is under 10MB
4. Check browser console for errors with `debug={true}`

## Resources

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Pricing Details](https://vercel.com/pricing)
- [Privacy Policy](https://vercel.com/legal/privacy-policy)