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

- **[Master Context](/CLAUDE.md)** - *Essential for every session.* Coding standards, project overview, key technical patterns, and development workflow
- **[Project Structure](/docs/ai-context/project-structure.md)** - *REQUIRED reading.* Complete technology stack (Next.js 15, Oxylabs, Gemini AI), file tree, and system architecture
- **[README](/README.md)** - *Public documentation.* Setup instructions, feature overview, and deployment guide
- **[Oxylabs Setup](/OXYLABS_SETUP.md)** - *API configuration.* Detailed Oxylabs integration guide and troubleshooting (when created)

## Tier 2: Component-Level Documentation

### Core Application Components
- **[API Routes](/app/api/CONTEXT.md)** - *Server endpoints.* Transcript extraction, AI formatting, streaming patterns (when created)
- **[Main Application](/app/CONTEXT.md)** - *Client interface.* Page structure, state management, user interactions (when created)
- **[Components](/components/CONTEXT.md)** - *UI components.* Transcript viewer, format options, component patterns (when created)

### Integration Components
- **[Library Utilities](/lib/CONTEXT.md)** - *Core utilities.* YouTube parsing, caching system, AI formatting helpers (when created)
- **[External Services](/docs/integrations/CONTEXT.md)** - *API integrations.* Oxylabs setup, Gemini configuration, fallback strategies (when created)

## Tier 3: Feature-Specific Documentation

Granular CONTEXT.md files co-located with code:

### API Features
- **[Oxylabs Route](/app/api/transcript-oxylabs/CONTEXT.md)** - Oxylabs API integration, request/response handling, error recovery (when created)
- **[Format Route](/app/api/format-transcript/CONTEXT.md)** - Gemini streaming, chunk processing, format styles (when created)
- **[Fallback Route](/app/api/transcript/CONTEXT.md)** - YouTube-transcript library usage, fallback logic (when created)

### UI Features
- **[Transcript Viewer](/components/transcript-viewer/CONTEXT.md)** - Display logic, segment rendering, export functionality (when created)
- **[Format Options](/components/format-options/CONTEXT.md)** - UI controls, format selection, streaming status (when created)

### Utility Features
- **[Transcript Cache](/lib/transcript-cache/CONTEXT.md)** - localStorage implementation, TTL management, cache keys (when created)
- **[YouTube Parser](/lib/youtube/CONTEXT.md)** - URL validation, video ID extraction, API client (when created)
- **[AI Formatter](/lib/ai-formatter/CONTEXT.md)** - Prompt engineering, chunk processing, streaming helpers (when created)

## Quick Reference Guide

### For New Features
1. Read `/CLAUDE.md` for coding standards and project overview
2. Check `/docs/ai-context/project-structure.md` for architecture patterns
3. Review relevant component documentation
4. Follow established patterns for similar features

### For Bug Fixes
1. Understand the architecture via `project-structure.md`
2. Check relevant feature documentation
3. Review error handling patterns in `/CLAUDE.md`
4. Test with various YouTube URLs and options

### For Performance Optimization
1. Review caching implementation in transcript-cache
2. Check streaming patterns in format-transcript
3. Profile with Chrome DevTools
4. Follow Next.js optimization best practices

## Search Keywords

**Architecture**: project-structure.md, CLAUDE.md, Next.js 15, App Router
**Transcript Extraction**: Oxylabs, youtube-transcript, API routes, fallback
**AI Formatting**: Gemini, streaming, SSE, format styles, chunks
**Caching**: localStorage, TTL, browser storage, performance
**UI Components**: transcript-viewer, format-options, Tailwind CSS
**Error Handling**: fallback, retry, validation, user feedback
**Deployment**: Vercel, environment variables, production build

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
1. Create component-level CONTEXT.md files as needed
2. Add feature-specific documentation for complex implementations
3. Document any new API integrations
4. Create troubleshooting guides for common issues
5. Add performance optimization guides