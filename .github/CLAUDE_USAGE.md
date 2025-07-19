# Claude AI Assistant Usage Guide

This repository is configured with Claude AI integration through GitHub Actions. Claude can help with development, code reviews, bug fixes, and more.

## How to Use Claude

### 1. In Pull Requests
- **Automatic Reviews**: Every PR automatically gets reviewed by Claude
- **Ask Questions**: Comment `@claude` followed by your question
- **Request Changes**: `@claude please add error handling to this function`

### 2. In Issues
- **Create Issues**: Use our issue templates for structured Claude assistance
- **Mention Claude**: Include `@claude` in comments or issue body

## Available Claude Commands

### Code Development
```
@claude implement a feature to extract playlists
@claude add TypeScript types for this function
@claude refactor this code for better performance
```

### Bug Fixes
```
@claude help me fix this error: [paste error]
@claude debug why transcripts aren't loading
@claude fix the rate limiting issue
```

### Code Reviews
```
@claude review this code for security issues
@claude suggest performance improvements
@claude check for TypeScript best practices
```

### Documentation
```
@claude create API documentation for all routes
@claude update the README with new features
@claude write tests for the transcript formatter
```

## Issue Templates

We have pre-configured templates for common Claude tasks:

1. **Claude Feature Development** - For implementing new features
2. **Claude Bug Fix** - For debugging and fixing issues
3. **Claude Security Audit** - For security reviews
4. **Claude Weekly Maintenance** - For regular code health checks
5. **Claude Code Review** - For detailed code reviews
6. **Claude Refactoring** - For code improvements
7. **Claude Documentation** - For docs creation/updates
8. **Claude Performance Optimization** - For performance improvements

## What Claude Can Do

### Allowed Tools
- ✅ Read and edit files
- ✅ Search the codebase (Grep, LS)
- ✅ Run build commands (`npm run build`)
- ✅ Run tests (`npm run test`)
- ✅ Run linting (`npm run lint`)
- ✅ Type checking (`npm run typecheck`)
- ✅ Create and modify multiple files

### Project Context
Claude knows about:
- YouTube Thing's architecture (Next.js 15, TypeScript)
- Our tech stack (Cerebras AI, Oxylabs, Upstash Redis)
- Rate limiting (1 request per 10 seconds)
- Security requirements (keeping API keys server-side)
- Performance goals (handling 3+ hour videos)

## Best Practices

1. **Be Specific**: The more context you provide, the better Claude can help
2. **Use Templates**: Our issue templates guide Claude effectively
3. **Review Output**: Always review Claude's suggestions before merging
4. **Security First**: Claude is configured to prioritize security

## Examples

### Example 1: Feature Request
```
@claude please implement a feature to download transcripts in SRT format. 
The feature should:
- Support timestamp conversion
- Handle special characters properly
- Add a download button to the UI
```

### Example 2: Bug Investigation
```
@claude I'm getting a "rate limit exceeded" error even though I'm waiting 10 seconds between requests. Can you investigate and fix this?
```

### Example 3: Performance Review
```
@claude analyze the transcript formatting performance for videos longer than 2 hours and suggest optimizations
```

## Workflow Integration

Claude integrates with our CI/CD pipeline:
1. Automatic PR reviews on every push
2. Can run tests and builds
3. Provides feedback directly in GitHub
4. Respects our security and coding standards

## Limitations

- Claude only responds in Issues and PRs (not commits or other areas)
- Requires `@claude` mention to activate (except for automatic PR reviews)
- Limited to the permissions we've configured
- Cannot access external services or make network requests

## Getting Help

If Claude isn't responding:
1. Check the Actions tab for workflow runs
2. Ensure you're using `@claude` in a supported location
3. Verify the workflow is enabled in repository settings
4. Check if your comment triggered the workflow conditions