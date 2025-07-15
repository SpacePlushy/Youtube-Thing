# Youtube-Thing Documentation Overview

This project uses a **3-tier documentation system** that organizes knowledge by stability and scope, enabling efficient AI context loading and scalable development.

## How the 3-Tier System Works

**Tier 1 (Foundation)**: Stable, system-wide documentation that rarely changes - architectural principles, technology decisions, cross-component patterns, and core development protocols.

**Tier 2 (Component)**: Architectural documentation for major system components - high-level design principles, integration patterns, and component-wide conventions.

**Tier 3 (Feature-Specific)**: Granular documentation co-located with code - specific implementation patterns, technical details, and local architectural decisions that evolve with features.

## Documentation Principles
- **Co-location**: Documentation lives near relevant code
- **AI-First**: Optimized for efficient AI context loading and machine-readable patterns
- **Progressive Detail**: Start with high-level context, drill down as needed

## Tier 1: Foundational Documentation (System-Wide)

- **[Master Context](/CLAUDE.md)** - *Essential for every session.* Coding standards, security requirements, MCP server integration patterns, and development protocols
- **[Project Structure](/docs/ai-context/project-structure.md)** - *REQUIRED reading.* Complete technology stack (Next.js 15, tRPC, Clerk, Upstash Redis), file tree, and system architecture
- **[Implementation Plan](/IMPLEMENTATION_PLAN.md)** - *Development roadmap.* Step-by-step setup guide, architecture decisions, and feature implementation order
- **[Task Management](/docs/ai-context/handoff.md)** - *Session continuity.* Current tasks, progress tracking, and next session goals (when created)

## Tier 2: Component-Level Documentation

### Core Application Components
- **[Server API](/server/CONTEXT.md)** - *tRPC implementation.* Router patterns, procedures, middleware, and type safety (when created)
- **[Authentication](/app/(auth)/CONTEXT.md)** - *Clerk integration.* Auth flows, protected routes, and user management (when created)
- **[Dashboard](/app/(dashboard)/CONTEXT.md)** - *Protected features.* User interface patterns, data visualization, and user workflows (when created)

### Data & Integration Components
- **[YouTube Integration](/server/api/routers/youtube/CONTEXT.md)** - *YouTube API patterns.* Data extraction, rate limiting, and metadata processing (when created)
- **[Redis Storage](/server/db/CONTEXT.md)** - *Upstash Redis patterns.* Key structures, JSON storage, and caching strategies (when created)

### UI Components
- **[Component Library](/components/CONTEXT.md)** - *shadcn/ui patterns.* Reusable components, theming, and composition patterns (when created)
- **[Layouts](/app/CONTEXT.md)** - *Next.js App Router.* Layout patterns, metadata, and route groups (when created)

## Tier 3: Feature-Specific Documentation

Granular CONTEXT.md files co-located with code:

### API Features
- **[YouTube Router](/server/api/routers/youtube.ts)** - Video extraction procedures, rate limiting, error handling
- **[User Router](/server/api/routers/user.ts)** - User preferences, saved videos, profile management
- **[tRPC Context](/server/api/trpc.ts)** - Context creation, authentication integration, type inference

### UI Features
- **[Video Card](/components/video-card/CONTEXT.md)** - Display patterns, interaction states, data binding (when created)
- **[Extraction Form](/components/extraction-form/CONTEXT.md)** - Form validation, URL parsing, submission flow (when created)
- **[Results Display](/components/results-display/CONTEXT.md)** - Data presentation, export options, sharing features (when created)

### Utility Features
- **[YouTube Parser](/lib/youtube-parser/CONTEXT.md)** - URL validation, ID extraction, metadata parsing (when created)
- **[Export Utilities](/lib/export/CONTEXT.md)** - Format converters, download generation, data transformers (when created)

## Quick Reference Guide

### For New Features
1. Read `/CLAUDE.md` for coding standards and conventions
2. Check `/docs/ai-context/project-structure.md` for architecture patterns
3. Review `/IMPLEMENTATION_PLAN.md` for development approach
4. Find relevant Tier 2 component docs

### For Bug Fixes
1. Understand the architecture via `project-structure.md`
2. Check relevant Tier 3 feature documentation
3. Follow debugging patterns in `/CLAUDE.md`

### For Performance Optimization
1. Review current architecture in `project-structure.md`
2. Check Redis caching patterns in data storage docs
3. Follow Next.js server component best practices

## Search Keywords

**Architecture**: project-structure.md, CLAUDE.md, middleware.ts, server components
**Authentication**: Clerk, middleware.ts, protected routes, clerkMiddleware
**Database**: Redis, Upstash, KV storage, JSON patterns, key structures
**API**: tRPC, routers, procedures, type safety, TanStack Query
**UI**: shadcn/ui, Tailwind CSS v4, Radix UI, server components
**YouTube**: extraction, metadata, video data, YouTube API
**Testing**: (to be documented)
**Deployment**: (to be documented)

## Documentation Standards

### File Organization
- Core docs in `/docs/ai-context/` - AI-optimized context
- Component docs as `CONTEXT.md` in component directories
- Feature docs co-located with implementation code

### Writing Guidelines
- Start with purpose and key concepts
- Include code examples for complex patterns
- Reference parent tier docs for context
- Keep technical details in Tier 3

### Maintenance
- Update when architecture changes
- Keep version numbers current
- Add new patterns as they emerge
- Remove obsolete documentation

## Next Steps for Documentation
1. Create Tier 2 component CONTEXT.md files as components are built
2. Add Tier 3 feature docs during implementation
3. Document testing strategies and patterns
4. Add deployment and monitoring guides
5. Create troubleshooting guides for common issues