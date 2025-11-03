# Tech Stack

## Framework & Runtime
- **Application Framework:** Next.js 15.3 (App Router)
  - *Why:* Server-side rendering for SEO, API routes for backend logic, optimal for Vercel deployment, React Server Components for performance
- **Language/Runtime:** TypeScript 5.x on Node.js
  - *Why:* Type safety reduces bugs in production, better DX with autocomplete, industry standard for modern web apps
- **Package Manager:** npm
  - *Why:* Default for Node.js ecosystem, lockfile ensures consistent dependencies across environments

## Frontend
- **JavaScript Framework:** React 18
  - *Why:* Component-based architecture, massive ecosystem, seamless Next.js integration
- **CSS Framework:** Tailwind CSS 3.4
  - *Why:* Utility-first approach speeds development, consistent design system, excellent performance with purging unused styles
- **UI Components:** Lucide React (icons)
  - *Why:* Lightweight, tree-shakeable icon library, consistent visual language
- **Animation:** Framer Motion 12
  - *Why:* Smooth, production-ready animations for UI feedback (copy success, loading states), declarative API

## Database & Storage
- **Primary Storage:** Upstash Redis
  - *Why:* Serverless Redis for fast caching of transcripts, rate limiting, and session storage. No infrastructure management, pay-per-request pricing
- **User Data (Future):** Vercel Postgres (planned for Phase 2)
  - *Why:* Serverless PostgreSQL for persistent user data (transcript history, user accounts), seamless Vercel integration
- **Caching Strategy:** Multi-tier caching
  - LRU cache (lru-cache package) for in-memory hot data
  - Upstash Redis for distributed caching across serverless functions
  - Vercel KV for edge caching near users

## Authentication & User Management
- **Authentication:** Clerk (to be integrated in Phase 2)
  - *Why:* Production-ready auth with OAuth (Google, GitHub), email/password, pre-built UI components, compliance (GDPR, SOC 2), user management dashboard
  - *Note:* Implementation exists on `feature/clerk-authentication` branch
- **Session Management:** Clerk handles sessions with secure cookies and JWT tokens

## Payment & Monetization
- **Subscription Billing:** Stripe (planned for Phase 4)
  - *Why:* Industry-standard payment processing, robust subscription management, excellent documentation, support for global payments
- **Usage Tracking:** Custom middleware + Upstash Redis
  - *Why:* Track daily transcript limits per user tier, enforce rate limits, minimal latency impact

## APIs & Third-Party Services

### Transcript Extraction
- **Primary:** youtube-transcript package
  - *Why:* Fast, reliable extraction from YouTube's native transcript data
- **Fallback:** Oxylabs API (configured but optional)
  - *Why:* Backup extraction method for videos where native method fails, robust proxy infrastructure
- **Alternative Libraries:** ytdl-core, get-video-id
  - *Why:* Video metadata extraction, URL parsing, video ID normalization

### Rate Limiting & DDoS Protection
- **Rate Limiting:** @upstash/ratelimit
  - *Why:* Protect API from abuse, enforce tier limits, distributed rate limiting across serverless functions
- **Redis Client:** @upstash/redis
  - *Why:* Serverless-native Redis client, automatic connection pooling

## Testing & Quality
- **Linting/Formatting:** ESLint, Next.js config
  - *Why:* Enforce code quality, catch errors early, maintain consistent style
- **Type Checking:** TypeScript + Zod
  - *Why:* Runtime validation for API inputs/outputs, type-safe environment variables
- **Validation:** Zod 3.25
  - *Why:* Schema validation for YouTube URLs, API responses, user inputs with TypeScript inference

## Deployment & Infrastructure
- **Hosting:** Vercel
  - *Why:* Zero-config Next.js deployment, global CDN, automatic HTTPS, preview deployments for PRs, serverless functions at edge
- **CI/CD:** Vercel + GitHub integration
  - *Why:* Automatic deploys on push to main, preview environments for feature branches
- **Analytics:** @vercel/analytics
  - *Why:* Privacy-friendly analytics, page view tracking, performance monitoring
- **Environment Management:** Vercel environment variables
  - *Why:* Secure secret storage, separate dev/preview/production configs

## Monitoring & Observability
- **Error Tracking:** (Planned: Sentry)
  - *Why:* Real-time error monitoring, stack traces, user context for debugging production issues
- **Performance Monitoring:** Vercel Analytics + Web Vitals
  - *Why:* Track Core Web Vitals, page load times, identify performance bottlenecks
- **Uptime Monitoring:** (Planned: Better Uptime or similar)
  - *Why:* SLA compliance for Enterprise tier, automatic incident alerting

## Developer Tools
- **Version Control:** Git + GitHub
  - *Why:* Industry standard, excellent PR workflow, integrations with Vercel
- **API Development:** Next.js API routes
  - *Why:* Co-located with frontend, no separate backend deployment, edge runtime support
- **Code Splitting:** Automatic via Next.js
  - *Why:* Faster initial page loads, optimized bundle sizes

## Removed Technologies
- **@ai-sdk/cerebras:** REMOVED in current product strategy
  - *Why removed:* AI summarization feature out of scope, focusing on simple transcript extraction
- **@ai-sdk/openai:** REMOVED in current product strategy
  - *Why removed:* No AI processing features in simplified product vision
- **@deepgram/sdk:** REMOVED (not actively used)
  - *Why removed:* YouTube native transcripts sufficient, no audio processing needed
- **@langchain/textsplitters:** REMOVED (not actively used)
  - *Why removed:* No chunking needed without AI summarization feature

## Future Considerations

### Phase 3-4 Additions
- **API Gateway:** (For Developer API feature)
  - Consider: Vercel Edge Functions with built-in auth, or dedicated API platform like Kong/Tyk
- **Database Migration:** (When scaling beyond Redis)
  - Vercel Postgres or Supabase for relational data (user accounts, transcript metadata)
  - Keep Redis for caching and rate limiting
- **Background Jobs:** (For batch processing)
  - Vercel Cron Jobs or Upstash QStash for queued transcript processing
- **CDN for Downloads:** (For large batch exports)
  - Vercel Blob Storage or AWS S3 + CloudFront for temporary file storage

## Security & Compliance
- **HTTPS:** Automatic via Vercel
- **Environment Secrets:** Vercel encrypted environment variables
- **API Security:** Rate limiting, input validation (Zod), CORS configuration
- **Authentication Security:** Clerk handles password hashing, session management, OAuth flows
- **PCI Compliance:** Stripe handles all payment data (never touches our servers)

## Scalability Strategy
- **Serverless Architecture:** Auto-scaling via Vercel, no server management
- **Edge Caching:** Vercel CDN + Edge Runtime for global low latency
- **Database:** Upstash Redis auto-scales, Vercel Postgres has connection pooling
- **Cost Optimization:** Pay-per-request pricing on Upstash/Vercel aligns costs with usage
