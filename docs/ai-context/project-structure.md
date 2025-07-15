# Youtube-Thing Project Structure

## Overview
Youtube-Thing is a modern web application for extracting and managing YouTube content metadata. Built with Next.js 15 App Router, it leverages server components, type-safe APIs via tRPC, and a serverless-first architecture.

## Technology Stack

### Core Framework
- **Next.js 15.3+** - React framework with App Router for server components
- **TypeScript 5.8+** - Type safety with strict mode enabled
- **React 19** - UI library with server component support

### Styling & UI
- **Tailwind CSS v4.1+** - Utility-first CSS framework with new CSS-based configuration
- **shadcn/ui** - Radix UI-based component library with Tailwind styling
- **next-themes** - Dark mode support with system preference detection

### API & Data Layer
- **tRPC v11+** - End-to-end type-safe APIs with TanStack Query integration
- **TanStack Query v5.83+** - Server state management with caching
- **Zod** - Runtime type validation for API inputs and data schemas

### Authentication & Security
- **Clerk v5.34+** - Complete authentication solution with user management
- **clerkMiddleware** - Route protection and authentication state

### Database & Storage
- **Upstash Redis v1.35+** - Serverless Redis for KV storage
- **JSON Storage Pattern** - Store structured data as JSON in Redis

### Development Tools
- **pnpm** - Fast, disk space efficient package manager
- **t3-env** - Type-safe environment variable validation
- **ESLint** - Code linting with Next.js configuration
- **Prettier** - Code formatting (optional)

## Directory Structure

```
youtube-thing/
├── app/                          # Next.js App Router directory
│   ├── (auth)/                   # Auth route group (public)
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx      # Clerk sign-in page
│   │   └── sign-up/
│   │       └── [[...sign-up]]/
│   │           └── page.tsx      # Clerk sign-up page
│   ├── (dashboard)/              # Protected route group
│   │   └── dashboard/
│   │       ├── page.tsx          # Main dashboard page
│   │       └── layout.tsx        # Dashboard layout wrapper
│   ├── api/
│   │   └── trpc/
│   │       └── [trpc]/
│   │           └── route.ts      # tRPC HTTP handler
│   ├── globals.css               # Global styles with Tailwind
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   └── ...                   # Other UI components
│   ├── theme-provider.tsx        # Dark mode provider
│   └── ...                       # Feature components
├── docs/
│   └── ai-context/               # AI-optimized documentation
│       ├── docs-overview.md      # Documentation registry
│       └── project-structure.md  # This file
├── lib/
│   ├── utils.ts                  # Utility functions
│   └── cn.ts                     # Class name helper
├── server/
│   ├── api/
│   │   ├── routers/
│   │   │   ├── youtube.ts        # YouTube extraction router
│   │   │   ├── user.ts           # User management router
│   │   │   └── _app.ts           # Root router combining all
│   │   └── trpc.ts               # tRPC initialization
│   └── db.ts                     # Database client (Redis)
├── types/
│   └── index.ts                  # Global type definitions
├── .env.local                    # Local environment variables
├── .gitignore                    # Git ignore file
├── CLAUDE.md                     # AI context and instructions
├── IMPLEMENTATION_PLAN.md        # Development roadmap
├── components.json               # shadcn/ui configuration
├── env.ts                        # Environment validation
├── middleware.ts                 # Clerk authentication middleware
├── next.config.ts                # Next.js configuration
├── package.json                  # Project dependencies
├── postcss.config.mjs            # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

## Key Architectural Patterns

### Route Organization
- **Route Groups**: `(auth)` for public routes, `(dashboard)` for protected routes
- **Dynamic Routes**: `[[...slug]]` for Clerk's catch-all routes
- **API Routes**: Centralized under `/api/trpc/[trpc]`

### Component Architecture
- **Server Components by Default**: All components are server components unless marked with "use client"
- **Client Components**: Only for interactivity (forms, modals, real-time updates)
- **Shared UI Components**: Reusable components in `/components/ui`

### Data Flow
1. **Server Components** fetch data directly in components
2. **Client Components** use tRPC hooks via TanStack Query
3. **Mutations** handled through tRPC procedures with optimistic updates
4. **Caching** managed by TanStack Query with smart invalidation

### State Management Strategy
- **Server State**: tRPC + TanStack Query
- **Client State**: React hooks (useState, useReducer)
- **Form State**: React Hook Form + Zod validation
- **Auth State**: Clerk hooks and helpers

### Type Safety Flow
1. **Environment Variables**: Validated at build time with t3-env
2. **API Inputs**: Validated with Zod schemas in tRPC procedures
3. **API Outputs**: Inferred from tRPC router definitions
4. **Database Models**: TypeScript interfaces for Redis JSON data

## Configuration Files

### next.config.ts
- TypeScript configuration support
- Environment variable handling
- Potential future optimizations

### tsconfig.json
- Strict mode enabled
- Path aliases configured (@/*)
- Next.js specific settings

### tailwind.config.ts
- Tailwind v4 configuration
- shadcn/ui theme extensions
- Dark mode support via class

### components.json
- shadcn/ui component installation config
- Style preferences
- Component aliases

### middleware.ts
- Clerk authentication middleware
- Protected route configuration
- Public route exceptions

## Development Conventions

### File Naming
- **Components**: PascalCase (e.g., `VideoCard.tsx`)
- **Utilities**: kebab-case (e.g., `format-date.ts`)
- **API Routes**: kebab-case folders, route.ts files
- **Types**: PascalCase for interfaces/types

### Import Organization
1. React/Next.js imports
2. Third-party libraries
3. Internal components
4. Internal utilities
5. Types

### Code Organization
- One component per file
- Colocate related components
- Extract reusable logic to hooks
- Keep files under 350 lines

## Database Schema (Redis)

### Key Patterns
```
user:{userId}              # User profile data
video:{videoId}            # Video metadata
user:{userId}:videos       # User's video list (set)
extraction:{extractionId}  # Extraction job data
```

### Data Structures
- **User**: JSON with profile, preferences
- **Video**: JSON with metadata, timestamps
- **Extraction**: JSON with status, results

## Security Considerations

### Authentication
- All routes protected by default via Clerk middleware
- Public routes explicitly defined
- User context available in tRPC procedures

### Data Validation
- Input validation with Zod on all endpoints
- Output sanitization for user-generated content
- URL validation for YouTube links

### Environment Security
- Secrets managed via environment variables
- Type-safe env access with t3-env
- No secrets in code or client bundles