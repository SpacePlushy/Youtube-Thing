# Product Roadmap

## Phase 1: MVP - Core Transcript Experience (Free Tier Foundation)

1. [ ] **Transcript Display UI** — Build clean, readable transcript viewer with video metadata (title, channel, duration) and responsive design for mobile/desktop. `S`
2. [ ] **One-Click Copy Functionality** — Implement optimized clipboard API integration that copies clean, AI-ready text without timestamps, with visual feedback and success confirmation. `XS`
3. [ ] **Download as TXT** — Add button to download transcript as plain text file with proper filename formatting (video-title-transcript.txt) and UTF-8 encoding. `XS`
4. [ ] **Download as PDF** — Generate formatted PDF with video metadata header, readable typography, and proper page breaks for printing and annotation. `M`

## Phase 2: User Accounts & History (Starter/Pro Tier Foundation)

5. [ ] **Clerk Authentication Integration** — Integrate Clerk for user signup/login with email, Google, and GitHub OAuth options, protected routes, and session management. `M`
6. [ ] **Transcript History Storage** — Build database schema and API endpoints to save extracted transcripts with metadata (URL, title, timestamp, user ID) using Vercel Postgres or Upstash Redis. `L`
7. [ ] **History Dashboard** — Create user dashboard showing all extracted transcripts with sorting (date, title), filtering, pagination, and quick actions (view, copy, download, delete). `L`
8. [ ] **Usage Tracking & Limits** — Implement tier-based usage limits (free: 5/day, starter: 50/day, pro: unlimited) with clear UI showing remaining quota and upgrade prompts. `M`

## Phase 3: Power User Features (Pro/Enterprise Tiers)

9. [ ] **Batch Processing UI** — Build interface to paste multiple YouTube URLs (up to 10 for Pro, 50 for Enterprise), queue processing jobs, and display progress with success/error status. `L`
10. [ ] **Batch Download & Export** — Add ability to download all queued transcripts as ZIP archive with organized folder structure and bulk copy functionality. `M`
11. [ ] **Full-Text Transcript Search** — Implement search across user's transcript history with keyword highlighting, filters by date/channel, and instant results. `L`
12. [ ] **Collections & Organization** — Add ability to create custom folders/tags for organizing transcripts by project, topic, or client with drag-and-drop organization. `M`

## Phase 4: Monetization & Scale

13. [ ] **Stripe Subscription Integration** — Implement subscription billing with Stripe for Free/Starter/Pro/Enterprise tiers, upgrade/downgrade flows, and payment management dashboard. `L`
14. [ ] **API Access for Developers** — Build RESTful API with authentication, rate limiting, and documentation for Pro/Enterprise users to integrate transcript extraction into their own tools. `XL`
15. [ ] **Advanced Export Options** — Add exports to Markdown, JSON, and SRT subtitle formats for advanced users and developer workflows. `M`
16. [ ] **Team Accounts & Sharing** — Enable Enterprise users to create team workspaces with shared transcript libraries, role-based permissions, and usage analytics. `XL`

## Subscription Tier Model

### Free Tier
- 5 transcripts per day
- Core features: transcript display, one-click copy, TXT/PDF download
- No account history (session-based only)
- Community support

**Target:** Students, casual users, trial for potential customers

### Starter Tier ($9/month)
- 50 transcripts per day
- Everything in Free, plus:
- User account with 30-day history
- Full-text search across history
- Priority email support

**Target:** Individual professionals, content creators, researchers

### Pro Tier ($29/month)
- Unlimited transcripts
- Everything in Starter, plus:
- Batch processing (up to 10 videos at once)
- Unlimited history with collections/tags
- All export formats (MD, JSON, SRT)
- API access (10,000 requests/month)
- Priority processing (skip queues)
- Priority support (24hr response)

**Target:** Power users, marketing teams, AI enthusiasts, developers

### Enterprise Tier ($99/month)
- Everything in Pro, plus:
- Batch processing (up to 50 videos at once)
- Team workspaces (up to 10 users)
- API access (100,000 requests/month)
- Dedicated processing resources
- Custom integrations support
- SLA guarantee (99.9% uptime)
- Dedicated account manager

**Target:** Agencies, research institutions, large content teams

> Notes
> - Roadmap ordered by technical dependencies and path to revenue
> - Phase 1-2 focus on building compelling free-to-paid conversion funnel
> - Phase 3-4 increase ARPU and enable Enterprise sales
> - Each item represents end-to-end (frontend + backend) functional feature
> - Pricing model balances accessibility (low-cost Starter) with premium value (Pro/Enterprise)
