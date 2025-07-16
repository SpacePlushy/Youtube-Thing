# Architecture Decisions

This document records important architectural decisions and their rationale for the Youtube-Thing project.

## 1. Configuration Management

### Decision: Multi-Layered Configuration System

We implement a three-tier configuration system:

1. **Build-time Constants** (`lib/constants.ts`)
   - Compile-time values that never change
   - Type-safe constants with `as const`
   - Exported types for type safety

2. **Environment Configuration** (`lib/env-config.ts`)
   - Runtime configuration from environment variables
   - Centralized access with defaults from constants
   - Validation functions for required values

3. **Route Configuration** (`lib/route-config.ts`)
   - Documentation for Next.js route segment configs
   - Explains why literal values are required

### Rationale

- **Type Safety**: All configurations are strongly typed
- **No Magic Numbers**: Every value has a named constant
- **Single Source of Truth**: Each type of configuration has one location
- **Build Compatibility**: Works with Next.js build requirements
- **Environment Flexibility**: Can override via environment variables

### Trade-offs

- Route configs must use literal values (Next.js limitation)
- Requires discipline to maintain consistency
- Additional abstraction layers

## 2. Security Architecture

### Decision: Server-Side Business Logic Protection

All proprietary AI formatting logic is kept server-side:

1. **Prompt Templates** (`lib/ai-prompts.ts`)
   - Never exposed to client
   - Abstracted into functions
   - Configurable via environment

2. **Generic Client Interface**
   - No technology mentions in UI
   - Generic error messages
   - No implementation details

### Rationale

- Protects intellectual property
- Prevents reverse engineering
- Allows algorithm updates without client changes

## 3. Error Handling Strategy

### Decision: Generic User-Facing Errors

- Client receives generic error messages
- Detailed errors logged server-side only
- Consistent error response format

### Rationale

- Prevents information leakage
- Better security posture
- Consistent user experience

## 4. Type System Architecture

### Decision: Centralized Type Definitions

1. **Constants with Type Exports** (`lib/constants.ts`)
   - String literal types from constants
   - Type aliases for common patterns

2. **Domain Types** (`lib/types.ts`)
   - Business domain interfaces
   - API contracts
   - Shared across client/server

### Rationale

- Single source of truth for types
- Prevents type drift
- Better IDE support

## 5. Module Organization

### Decision: Feature-Based Structure

```
lib/
  ai-prompts.ts      # AI-specific logic
  constants.ts       # Application constants
  env-config.ts      # Environment configuration
  types.ts          # Type definitions
  route-config.ts    # Route documentation
```

### Rationale

- Clear separation of concerns
- Easy to locate functionality
- Supports future scaling

## 6. Build Process Considerations

### Decision: Literal Values for Route Configs

Due to Next.js build-time requirements:
- Route segment configs use literal values
- Documentation references explain the values
- Constants file documents the rationale

### Rationale

- Only way to satisfy Next.js builder
- Maintains documentation trail
- Prevents accidental changes

## 7. Future Considerations

### Potential Improvements

1. **Configuration Validation**
   - Runtime validation of all configs
   - Type guards for external data

2. **Feature Flags**
   - Environment-based feature toggles
   - A/B testing support

3. **Monitoring**
   - Performance metrics
   - Error tracking
   - Usage analytics

### Scaling Considerations

- Move to microservices if needed
- Consider API gateway for additional security
- Implement rate limiting at infrastructure level

## 8. AI Provider Selection

### Decision: Groq as Primary AI Provider

We selected Groq LPU™ as the primary AI formatting provider:

1. **Ultra-Fast Processing**
   - Up to 1,500 tokens/second
   - 5x+ faster than traditional providers
   - Sub-minute processing for any transcript

2. **Integration via Vercel AI SDK**
   - Unified streaming interface
   - Clean error handling
   - Provider flexibility

### Rationale

- **Performance**: Dramatically better user experience
- **Cost**: Generous free tier (6000 TPM)
- **Simplicity**: AI SDK reduces implementation complexity
- **Future-Proof**: Easy to add additional providers

### Trade-offs

- Dependency on Groq availability
- Less model variety than other providers
- Rate limits require consideration

## 9. Streaming Architecture

### Decision: Vercel AI SDK for Streaming

Replaced custom SSE/JSON streaming with Vercel AI SDK:

1. **Simplified Implementation**
   - From 750+ lines to ~180 lines
   - No custom buffer management
   - Native stream safety

2. **Text Streaming**
   - Plain text instead of JSON
   - No complex parsing required
   - Real-time updates

### Rationale

- **Maintainability**: Standard patterns, less code
- **Reliability**: Battle-tested SDK
- **Performance**: Eliminated parsing overhead
- **Developer Experience**: Easier to understand and modify

## 10. Responsive Design Strategy

### Decision: Mobile-First with Selective Scrolling

Implemented adaptive layouts:

1. **Desktop**: Side-by-side cards (≥1024px)
2. **Mobile**: 
   - Stacked cards
   - Viewport-contained layout
   - Only transcript areas scroll

### Rationale

- **Usability**: Everything accessible without page scrolling on mobile
- **Performance**: Reduced reflows and repaints
- **Accessibility**: Better for one-handed mobile use

### Implementation

- Tailwind responsive utilities (`lg:` breakpoint)
- CSS Grid with `grid-cols-1 lg:grid-cols-2`
- Fixed heights with `overflow-y-auto` for scrollable areas