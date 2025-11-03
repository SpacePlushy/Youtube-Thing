# Spec Requirements: Remove AI Integration

## Initial Description

"Remove the AI part of this website. There's an AI integration with Cerebras, but I don't want this website to really do any AI stuff, so let's remove all that from the website."

### Context from Product Planning

- The website currently has AI summarization features using Cerebras AI
- User wants to focus on simple transcript extraction and copying
- The product mission is now focused on being a fast, simple tool for getting YouTube transcripts (mainly for users to paste into their own AI tools)
- This aligns with removing the built-in AI features

## Requirements Discussion

### Confirmed Requirements Summary

All requirements were confirmed directly by the user in the orchestrator discussion. No follow-up questions were necessary as the scope was clearly defined.

**Requirement 1: Complete AI Code Removal**
**Scope:** Remove ALL traces of AI-related code including imports, dependencies, commented-out code, configuration files, and environment variables (CEREBRAS_API_KEY, OPENAI_API_KEY, etc.)
**Strategy:** Complete deletion (Answer: 2A - "Delete it all - I want it gone completely")

**Requirement 2: Areas to Clean**
The following areas contain AI code that must be removed:
- API routes in `app/api/` - remove AI endpoints
- React components with AI summarization features
- `package.json` dependencies (@ai-sdk/cerebras, @ai-sdk/openai, @langchain/textsplitters, @deepgram/sdk)
- Environment variable files (.env, .env.example)
- Backend logic (summarization endpoints, streaming responses, token counting)

**Requirement 3: UI Replacement Strategy**
**Approach:** Replace AI features with more prominent copy/download buttons for transcripts (Answer: 1A)
- Emphasize one-click copy functionality
- Make download options more visible
- Follow existing UI patterns in the codebase
- No new UI patterns needed

**Requirement 4: Context and Urgency**
**Purpose:** Codebase cleanup before public launch
**User Communication:** None needed (Answer: 3A - "This is just cleanup before going live")

**Requirement 5: Documentation Updates**
- Update README to remove mentions of AI features
- Update any documentation that references AI capabilities
- Ensure tech stack documentation reflects removal

**Requirement 6: Dependency Management**
- Remove AI packages from package.json
- Run npm install to update package-lock.json
- Clean up any unused imports resulting from removals

### Existing Code to Reference

No similar features were identified for reference. The task is pure removal rather than replacement or refactoring.

### Follow-up Questions

No follow-up questions were needed. The requirements were clear and complete from the initial discussion.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
Not applicable - working from existing codebase patterns.

## Requirements Summary

### Functional Requirements

#### Core Functionality After Removal
- Maintain transcript extraction capability (primary feature)
- Preserve one-click copy to clipboard functionality
- Maintain download functionality (TXT, PDF formats)
- Keep all non-AI related features intact
- Ensure no broken dependencies or imports remain

#### User Actions Enabled
- Extract transcripts from YouTube URLs
- Copy transcripts to clipboard with one click
- Download transcripts in multiple formats
- Access transcript history (if applicable)
- Search through transcripts (if applicable)

#### Data to Be Managed
- No AI-related data will be stored or processed
- Transcript data remains the primary data type
- User preferences and history unaffected by AI removal

### Scope Boundaries

#### In Scope
- Complete removal of all AI-related code
- Removal of AI dependencies from package.json
- Removal of AI-related environment variables
- Deletion of AI API routes and endpoints
- Removal of AI features from React components
- Documentation updates reflecting AI removal
- Verification that app works correctly without AI code
- UI adjustments to emphasize copy/download over AI features

#### Out of Scope
- Adding new features to replace AI functionality
- Major UI redesigns (use existing patterns)
- Changes to transcript extraction logic
- Changes to core app functionality
- User data migration or communication
- Performance optimization (unless directly related to removal)

#### Explicitly Excluded (User Confirmed)
- Keeping any AI code for potential future use
- Creating fallback options or feature flags
- Gradual deprecation approach

### Technical Considerations

#### Files and Directories to Modify or Remove

**API Routes (app/api/):**
- Remove or modify routes handling AI summarization
- Remove streaming response endpoints
- Remove token counting endpoints
- Clean up any AI-related utility functions

**React Components:**
- Remove AI summarization UI components
- Remove AI feature toggles or buttons
- Enhance visibility of copy/download buttons
- Remove AI loading states and indicators

**Dependencies (package.json):**
- Remove: @ai-sdk/cerebras
- Remove: @ai-sdk/openai
- Remove: @langchain/textsplitters
- Remove: @deepgram/sdk (if present)
- Any other AI-related packages discovered during implementation

**Environment Variables:**
- Remove from .env: CEREBRAS_API_KEY, OPENAI_API_KEY
- Remove from .env.example: all AI-related variable examples
- Remove from Vercel deployment environment: AI API keys

**Documentation:**
- README.md: Remove AI feature descriptions
- Update feature lists to reflect transcript-only focus
- Any API documentation mentioning AI endpoints
- Tech stack documentation (already notes removal)

**Configuration Files:**
- Review TypeScript types for AI-related interfaces
- Remove AI-related validation schemas (if any Zod schemas)
- Clean up any AI-specific constants or config objects

#### Integration Points

**Preserved Integrations:**
- YouTube transcript extraction (youtube-transcript package)
- Clerk authentication (if implemented)
- Upstash Redis for caching
- Vercel analytics
- All non-AI third-party services

**Removed Integrations:**
- Cerebras AI API
- OpenAI API
- Deepgram SDK
- LangChain text splitters

#### Technology Preferences

**Follow Existing Stack:**
- Next.js 15.3 with App Router
- TypeScript 5.x
- React 18
- Tailwind CSS 3.4 for any UI adjustments
- Framer Motion for animations (if adjusting UI)

**Code Quality:**
- Maintain TypeScript type safety throughout
- Use Zod for any input validation
- Follow ESLint rules
- Ensure no unused imports remain
- Clean up any orphaned utility functions

#### Error Handling

**Removal Impact on Error Handling:**
- Remove AI-specific error handling code
- Remove error messages related to AI failures
- Remove AI API timeout handling
- Keep general error handling patterns intact

**Testing After Removal:**
- Verify no broken imports or missing modules
- Test that app starts without AI environment variables
- Confirm no console errors related to missing AI packages
- Verify all remaining features work as expected

### Reusability Opportunities

Not applicable - this is a removal task focused on cleaning up unused AI code rather than building new features.

### Testing Considerations

#### Pre-Implementation Testing
- Document current AI features for verification of complete removal
- List all AI-related endpoints to ensure none are missed
- Identify all components using AI features

#### Post-Implementation Verification
- App builds successfully with npm run build
- No TypeScript compilation errors
- No runtime errors when starting the app
- All environment variables validated correctly (no missing AI keys)
- package-lock.json updated correctly
- No AI-related imports in any files
- README and docs accurately reflect new feature set

#### Functional Testing
- Transcript extraction still works
- Copy to clipboard functionality intact
- Download functionality (TXT, PDF) works
- UI displays correctly without AI components
- No broken links or buttons from removed features
- Enhanced copy/download buttons are prominent and functional

#### Regression Testing Focus
- Core transcript features unaffected
- User authentication (if implemented) works
- Caching functionality intact
- Rate limiting still functional
- All non-AI API routes work correctly

### Dependencies to Remove

**NPM Packages:**
```json
"@ai-sdk/cerebras"
"@ai-sdk/openai"
"@langchain/textsplitters"
"@deepgram/sdk"
```

**Environment Variables:**
```
CEREBRAS_API_KEY
OPENAI_API_KEY
[Any other AI-related keys discovered]
```

**Post-Removal Actions:**
1. Run `npm install` to update package-lock.json
2. Verify no peer dependency warnings related to removed packages
3. Check for any unused dependencies that were only used by AI code
4. Update .env.example to remove AI variable examples
5. Clear any cached environment variables in Vercel deployment

### Documentation Requirements

#### README.md Updates
- Remove all mentions of AI summarization features
- Remove AI-related setup instructions (API keys, etc.)
- Update feature list to focus on transcript extraction
- Emphasize copy/download functionality
- Ensure mission alignment with "simple transcript tool"

#### Other Documentation
- Update any API documentation removing AI endpoints
- Review tech-stack.md (already documents removal)
- Update any user guides or help documentation

### UI/UX Changes

#### Removal Actions
- Remove AI summarization buttons or toggles
- Remove AI processing indicators or loading states
- Remove AI-related success/error messages
- Remove any "Summarize" or "AI Analysis" UI elements

#### Enhancement Actions
- Make copy button more prominent (primary CTA)
- Enhance download button visibility
- Follow existing glassmorphism theme from recent UI redesign
- Use existing Tailwind utility classes and color scheme
- Maintain existing animation patterns with Framer Motion

#### No New Patterns Needed
- Work within current design system
- Use existing button components
- Follow current layout patterns
- Maintain existing responsive design approach

### Success Criteria

#### Complete When:
1. All AI code removed from codebase (verified via search)
2. All AI dependencies removed from package.json
3. App builds and runs without errors
4. No AI-related environment variables required
5. README and docs updated
6. Copy/download buttons prominently displayed
7. All core features (transcript extraction, copy, download) working
8. No console errors or warnings related to AI
9. TypeScript compilation successful with no AI-related type errors
10. Clean git diff showing only intentional removals and UI enhancements

## Implementation Priority

### Phase 1: Dependency and Environment Cleanup
1. Remove AI packages from package.json
2. Run npm install
3. Remove AI environment variables from .env and .env.example
4. Update Vercel environment variables (remove AI keys)

### Phase 2: Code Removal
1. Remove AI API routes and endpoints
2. Remove AI-related components and UI elements
3. Remove AI imports and utility functions
4. Clean up types and interfaces
5. Remove validation schemas for AI features

### Phase 3: UI Enhancement
1. Enhance copy button visibility
2. Enhance download button visibility
3. Remove AI feature placeholders
4. Test UI responsiveness

### Phase 4: Documentation and Verification
1. Update README.md
2. Update other documentation
3. Run full build and test
4. Verify all functionality works
5. Final code review for missed AI references

## Notes

- This is a straightforward removal task with clear scope
- User explicitly wants complete deletion, not preservation
- No user communication needed - internal cleanup
- Focus on making copy/download features shine after AI removal
- Align final product with mission: fast, simple transcript extraction tool
