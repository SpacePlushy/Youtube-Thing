# Youtube-Thing Project Structure

## Overview
Youtube-Thing is a modern web application for extracting and formatting YouTube video transcripts. Built with Next.js 15 App Router, it provides a seamless interface for transcript extraction with AI-powered formatting capabilities.

## Technology Stack

### Core Framework
- **Next.js 15.3.2** - React framework with App Router for server components
- **TypeScript 5.8+** - Type safety with strict mode enabled
- **React 18** - UI library with server component support

### Styling & UI
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **CSS Variables** - Dark theme support with semantic color tokens
- **Lucide React** - Icon library for UI elements

### AI & Processing
- **ai 4.3.19** - Vercel AI SDK for streaming responses
- **@ai-sdk/groq 1.2.9** - Groq provider for ultra-fast AI processing
- **groq-sdk 0.27.0** - Direct Groq API integration

### API & External Services
- **Oxylabs Web Scraper API** - Primary transcript extraction service
- **Groq LPU™** - Primary AI-powered transcript formatting (ultra-fast)
- **YouTube Transcript** - Fallback transcript extraction library
- **Vercel AI SDK** - Unified streaming interface for AI providers

### Development Tools
- **npm** - Package manager
- **ESLint** - Code linting with Next.js configuration
- **Environment Variables** - Secure credential management

## Directory Structure

```
youtube-thing/
├── app/                          # Next.js App Router directory
│   ├── api/                      # API routes
│   │   ├── format-transcript/
│   │   │   └── route.ts          # AI formatting endpoint (Groq via AI SDK)
│   │   ├── transcript/
│   │   │   └── route.ts          # YouTube transcript library endpoint
│   │   └── transcript-oxylabs/
│   │       └── route.ts          # Oxylabs extraction endpoint
│   ├── globals.css               # Global styles with Tailwind
│   ├── layout.tsx                # Root layout with dark theme
│   └── page.tsx                  # Main application page
├── components/                   # React components
│   ├── format-options.tsx        # Formatting controls UI
│   └── transcript-viewer.tsx     # Transcript display component
├── docs/                         # Documentation
│   ├── ai-context/               # AI-optimized documentation
│   │   ├── docs-overview.md      # Documentation registry
│   │   ├── handoff.md            # Task management & session continuity
│   │   └── project-structure.md  # This file
│   ├── ARCHITECTURE-DECISIONS.md # Architectural decision records
│   └── SECURITY-BEST-PRACTICES.md # Security implementation guide
├── lib/                          # Utility libraries
│   ├── ai-formatter.ts           # AI formatting utilities
│   ├── ai-prompts.ts             # Proprietary prompt templates (server-only)
│   ├── constants.ts              # Application-wide constants and types
│   ├── env-config.ts             # Environment variable configuration
│   ├── route-config.ts           # Route segment configuration docs
│   ├── transcript-cache.ts       # Browser caching implementation
│   ├── types.ts                  # Centralized type definitions
│   └── youtube.ts                # YouTube URL parsing & API calls
├── public/                       # Static assets
│   └── favicon.ico               # Site favicon
├── .env.local                    # Local environment variables
├── .gitignore                    # Git ignore file
├── CLAUDE.md                     # AI context and instructions
├── next.config.js                # Next.js configuration
├── package.json                  # Project dependencies
├── postcss.config.mjs            # PostCSS configuration
├── README.md                     # Project documentation
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
└── vercel.json                   # Vercel deployment config
```

## Key Architectural Patterns

### Client-Server Architecture
- **Client Components**: Interactive UI (`'use client'` directive)
- **Server Components**: API routes for secure operations
- **Streaming Responses**: Real-time AI formatting with Vercel AI SDK
- **Security by Design**: Proprietary logic isolated server-side

### Configuration Architecture
- **Multi-tier System**: Constants → Environment → Runtime
- **Type Safety**: All configuration values are typed
- **No Magic Numbers**: All values defined in centralized locations
- **Build-time vs Runtime**: Clear separation of concerns

### Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Grid Layouts**: `grid-cols-1 lg:grid-cols-2` for adaptive UI
- **Viewport Optimization**: Single-page mobile experience
- **Selective Scrolling**: Only transcript areas scroll on mobile

### API Route Organization
- `/api/transcript-oxylabs` - Primary extraction endpoint
- `/api/format-transcript` - AI formatting with streaming
- `/api/transcript` - Fallback extraction method

### Component Architecture
- **Page Component** (`app/page.tsx`): Main application logic
- **Format Options** (`components/format-options.tsx`): Formatting controls
- **Transcript Viewer** (`components/transcript-viewer.tsx`): Display component

### Data Flow
1. **URL Input** → Extract video ID → Call extraction API
2. **Transcript Data** → Cache in browser → Display to user
3. **Format Request** → Stream AI response → Real-time updates
4. **Export Options** → Copy to clipboard or download file

### Caching Strategy
- **Browser Storage**: localStorage with TTL (7 days)
- **Cache Key**: `videoId:language:transcriptOrigin`
- **Automatic Cleanup**: Expired entries removed on access

### Error Handling
- **Graceful Fallbacks**: Auto-switch transcript types if unavailable
- **User Feedback**: Clear error messages with retry options
- **Logging**: Detailed console logs for debugging

## Configuration Files

### next.config.js
- Standard Next.js configuration
- Environment variable support
- Production optimizations

### tsconfig.json
- Strict mode enabled
- Path aliases configured (@/*)
- Next.js specific settings

### tailwind.config.ts
- Dark mode via CSS variables
- Custom color palette
- Responsive design utilities

### Environment Variables
```env
OXYLABS_USERNAME=       # Oxylabs API credentials (required)
OXYLABS_PASSWORD=       # Oxylabs API password (required)
GROQ_API_KEY=           # Groq API key for AI formatting (required for AI features)
```

## Development Conventions

### File Naming
- **Components**: kebab-case (e.g., `transcript-viewer.tsx`)
- **Utilities**: camelCase (e.g., `youtube.ts`)
- **API Routes**: kebab-case folders with `route.ts`

### Code Organization
- Single responsibility per file
- Colocate related functionality
- Extract reusable utilities to `/lib`
- Keep components focused and composable

### Type Safety
- Define interfaces for all data structures
- Use TypeScript strict mode
- Avoid `any` type usage
- Type all function parameters and returns

## API Integration Details

### Oxylabs Integration
- Endpoint: Web Scraper API
- Authentication: Basic auth with username/password
- Request format: YouTube URL with language/origin options
- Response: Structured transcript data with metadata

### Groq AI Integration
- Model: `llama-3.1-8b-instant` (ultra-fast LPU™ technology)
- Streaming: Vercel AI SDK `streamText` for real-time output
- Processing Speed: Up to 1,500 tokens/second
- Formatting styles: Summary, chapters, clean, bullets, timestamps
- Rate Limits: 6000 TPM (free tier), suitable for most use cases

### Error Recovery
- Network failures: User-friendly error messages
- API limits: Graceful degradation with fallbacks
- Invalid URLs: Input validation with clear feedback
- Missing transcripts: Automatic fallback to available options

## Performance Considerations

### Client-Side Optimization
- Transcript caching reduces API calls
- Streaming UI updates for better UX
- Debounced user inputs
- Lazy component rendering

### Server-Side Optimization
- API route caching headers
- Efficient data processing
- Stream large responses
- Minimize API round trips

## Security Considerations

### API Security
- Credentials stored in environment variables
- Server-side API calls only
- Input validation for all user data
- No sensitive data in client bundles
- Proprietary prompts isolated in server-only modules
- Generic error messages to prevent information disclosure
- Technology stack obscured from client-side code

### Data Privacy
- No user data persistence
- Local caching only
- No analytics or tracking
- Clear data handling practices