# YouTube Thing - Project Structure

This document provides the complete technology stack and file tree structure for the YouTube Thing project. **AI agents MUST read this file to understand the project organization before making any changes.**

## Technology Stack

### Frontend Technologies
- **Next.js 15** with App Router - React framework with server-side rendering
- **TypeScript** - Type-safe JavaScript development
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Framer Motion** - Animation library for smooth progress bars
- **Lucide React** - Icon library for UI components

### Backend Technologies
- **Next.js API Routes** - Server-side API endpoints
- **Node.js** - JavaScript runtime environment
- **TypeScript** - Type-safe server-side development

### Integration Services & APIs
- **Oxylabs API** - Primary transcript extraction service
- **Groq LPU™** - Ultra-fast AI formatting service
- **Vercel AI SDK** - Unified streaming for AI responses
- **get-video-id** - Robust YouTube URL parsing library

### Rate Limiting & Caching
- **Upstash Redis** - Distributed rate limiting (1 request per 10 seconds)
- **Browser localStorage** - Client-side transcript caching (7-day TTL)

### Development & Quality Tools
- **ESLint** - Code linting and quality checks
- **Prettier** - Code formatting (assumed)
- **TypeScript** - Static type checking
- **npm** - Package management

## Complete Project Structure

```
Youtube-Thing/
├── README.md                           # Project overview and setup
├── CLAUDE.md                           # Master AI context file
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Locked dependency versions
├── next.config.js                      # Next.js configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── tsconfig.json                       # TypeScript configuration
├── postcss.config.mjs                  # PostCSS configuration
├── vercel.json                         # Vercel deployment configuration
├── middleware.ts                       # Next.js middleware
├── .gitignore                          # Git ignore patterns
├── app/                                # Next.js App Router directory
│   ├── layout.tsx                      # Root layout component
│   ├── page.tsx                        # Main application page
│   ├── globals.css                     # Global styles
│   └── api/                            # API routes
│       ├── transcript-oxylabs/         # Oxylabs API integration
│       │   └── route.ts                # Oxylabs transcript extraction
│       ├── transcript-primary/         # Primary transcript API (proxy)
│       │   └── route.ts                # Proxies to Oxylabs
│       ├── transcript-alt1/            # Alternative API 1 (placeholder)
│       │   └── route.ts                # Future Deepgram integration
│       ├── transcript-alt2/            # Alternative API 2 (placeholder)
│       │   └── route.ts                # Future Brightdata integration
│       ├── transcript-alt3/            # Alternative API 3 (placeholder)
│       │   └── route.ts                # Future Brightdata Proxy
│       ├── format-transcript/          # AI formatting endpoint
│       │   └── route.ts                # Groq-powered transcript formatting
│       ├── transcript/                 # Legacy transcript endpoints
│       │   ├── route.ts                # Original transcript route
│       │   └── unified-route.ts        # Unified transcript handling
│       ├── test-env/                   # Environment testing endpoint
│       ├── test-groq/                  # Groq API testing endpoint
│       │   └── route.ts                # Groq connectivity test
│       ├── test-rate-limit/            # Rate limiting testing endpoint
│       │   └── route.ts                # Rate limit verification
│       └── v1/                         # Versioned API endpoints
│           └── process/                # Legacy processing endpoints
│               ├── route.ts            # Original process route
│               └── enhanced-route.ts   # Enhanced process route
├── components/                         # React components
│   ├── format-options.tsx              # AI formatting options UI
│   ├── smooth-progress-bar.tsx         # Animated progress bar component
│   └── transcript-viewer.tsx           # Transcript display component
├── lib/                                # Utility libraries
│   ├── youtube.ts                      # YouTube URL parsing and API calls
│   ├── transcript-cache.ts             # Browser caching implementation
│   ├── rate-limiter-upstash.ts         # Upstash Redis rate limiting
│   ├── analytics.ts                    # Usage analytics tracking
│   ├── ai-prompts.ts                   # AI formatting prompts
│   ├── api-client.ts                   # API client utilities
│   ├── constants.ts                    # Application constants
│   ├── types.ts                        # TypeScript type definitions
│   ├── env-config.ts                   # Environment configuration
│   ├── route-config.ts                 # API route configuration
│   ├── crypto-storage.ts               # Encrypted storage utilities
│   ├── secure-storage.ts               # Secure storage implementation
│   ├── youtube-secure.ts               # Secure YouTube processing
│   └── langchain-splitter.ts           # Text splitting utilities
├── docs/                               # Documentation
│   ├── README.md                       # Documentation overview
│   ├── ARCHITECTURE-DECISIONS.md       # Architectural decisions record
│   ├── SECURITY-GUIDE.md               # Security implementation guide
│   ├── ENHANCED-SECURITY-GUIDE.md      # Enhanced security features
│   ├── SECURITY-BEST-PRACTICES.md      # Security best practices
│   ├── VERCEL-ANALYTICS-GUIDE.md       # Vercel analytics integration
│   ├── rate-limiting.md                # Rate limiting documentation
│   ├── CONTEXT-tier2-component.md      # Component-level context
│   ├── CONTEXT-tier3-feature.md        # Feature-specific context
│   ├── DOCUMENTATION-UPDATE-SUMMARY.md # Documentation update log
│   ├── ai-context/                     # AI-specific documentation
│   │   ├── project-structure.md        # This file
│   │   ├── docs-overview.md            # Documentation architecture
│   │   ├── system-integration.md       # Integration patterns
│   │   ├── deployment-infrastructure.md # Infrastructure documentation
│   │   └── handoff.md                  # Task management
│   ├── specs/                          # Technical specifications
│   │   ├── example-api-integration-spec.md # API integration example
│   │   └── example-feature-specification.md # Feature spec example
│   └── open-issues/                    # Open issues tracking
│       └── example-api-performance-issue.md # Performance issue example
├── public/                             # Static assets
│   └── favicon.ico                     # Website favicon
├── logs/                               # Application logs directory
├── MCP-ASSISTANT-RULES.md              # MCP assistant configuration
├── OXYLABS_SETUP.md                    # Oxylabs setup instructions
├── next-env.d.ts                       # Next.js TypeScript definitions
├── tsconfig.tsbuildinfo                # TypeScript build info
└── node_modules/                       # Node.js dependencies
```

## Key Implementation Patterns

### URL/ID Processing
- Supports both YouTube URLs and plain video IDs (11 characters)
- Uses `get-video-id` library for robust URL parsing
- Comprehensive input validation and error handling

### API Security
- Proprietary service names hidden from client-side code
- Generic error messages for user-facing responses
- Detailed server-side logging for debugging

### Performance Optimization
- Browser-based caching with 7-day TTL
- Rate limiting (1 request per 10 seconds)
- Streaming responses for AI formatting
- Cache clearing disabled to reduce API costs

### State Management
- React hooks for local component state
- Browser localStorage for transcript caching
- Real-time progress tracking with smooth animations

---

*This documentation reflects the current state of the YouTube Thing project as of version 1.0.*