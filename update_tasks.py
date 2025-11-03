#!/usr/bin/env python3
"""
Update tasks.md to mark completed items
"""

tasks_file = '/Users/spaceplushy/Development/Youtube-Thing/agent-os/specs/2025-11-02-subscription-clerk-auth/tasks.md'

# Read the file
with open(tasks_file, 'r') as f:
    content = f.read()

# Task Group 2 completed items
replacements = [
    ('- [ ] 2.0 Integrate Clerk authentication', '- [x] 2.0 Integrate Clerk authentication'),
    ('- [ ] 2.2 Wrap application with ClerkProvider', '- [x] 2.2 Wrap application with ClerkProvider'),
    ('- [ ] 2.3 Create authentication middleware', '- [x] 2.3 Create authentication middleware'),
    ('- [ ] 2.4 Create sign-in page', '- [x] 2.4 Create sign-in page'),
    ('- [ ] 2.5 Create sign-up page', '- [x] 2.5 Create sign-up page'),
    ('- [ ] 2.6 Create user profile page', '- [x] 2.6 Create user profile page'),

    # Task Group 4 completed items (tier helpers)
    ('- [ ] 4.0 Create tier permission helpers', '- [x] 4.0 Create tier permission helpers'),
    ('- [ ] 4.2 Create `lib/clerk-helpers.ts` file', '- [x] 4.2 Create `lib/clerk-helpers.ts` file'),
    ('- [ ] 4.3 Implement getUserSubscriptionTier function', '- [x] 4.3 Implement getUserSubscriptionTier function'),
    ('- [ ] 4.4 Implement getDailyTranscriptLimit function', '- [x] 4.4 Implement getDailyTranscriptLimit function'),
    ('- [ ] 4.5 Implement hasFeatureAccess function', '- [x] 4.5 Implement hasFeatureAccess function'),
    ('- [ ] 4.6 Implement canAccessHistory function', '- [x] 4.6 Implement canAccessHistory function'),
    ('- [ ] 4.7 Add TypeScript types', '- [x] 4.7 Add TypeScript types'),

    # Task Group 5 completed items (database)
    ('- [ ] 5.0 Create database schema for transcript history', '- [x] 5.0 Create database schema for transcript history'),
    ('- [ ] 5.2 Create database client module', '- [x] 5.2 Create database client module'),
    ('- [ ] 5.3 Create users_transcripts table migration', '- [x] 5.3 Create users_transcripts table migration'),
    ('- [ ] 5.4 Create user_settings table migration', '- [x] 5.4 Create user_settings table migration'),
    ('- [ ] 5.5 Add ON DELETE CASCADE constraints', '- [x] 5.5 Add ON DELETE CASCADE constraints'),

    # Task Group 6 completed items (usage tracking)
    ('- [ ] 6.0 Implement usage tracking infrastructure', '- [x] 6.0 Implement usage tracking infrastructure'),
    ('- [ ] 6.2 Create usage tracking module', '- [x] 6.2 Create usage tracking module'),
    ('- [ ] 6.3 Implement checkUsageLimit function', '- [x] 6.3 Implement checkUsageLimit function'),
    ('- [ ] 6.4 Implement incrementUsage function', '- [x] 6.4 Implement incrementUsage function'),
    ('- [ ] 6.5 Implement getUsageStats function', '- [x] 6.5 Implement getUsageStats function'),
    ('- [ ] 6.6 Add TypeScript types', '- [x] 6.6 Add TypeScript types'),
    ('- [ ] 6.7 Handle Redis unavailable gracefully', '- [x] 6.7 Handle Redis unavailable gracefully'),

    # Task Group 8 completed items (history API)
    ('- [ ] 8.0 Create transcript history API endpoints', '- [x] 8.0 Create transcript history API endpoints'),
    ('- [ ] 8.2 Create GET /api/transcript/history route', '- [x] 8.2 Create GET /api/transcript/history route'),
    ('- [ ] 8.3 Implement paginated query', '- [x] 8.3 Implement paginated query'),
    ('- [ ] 8.4 Format history response', '- [x] 8.4 Format history response'),
    ('- [ ] 8.5 Create GET /api/transcript/history/[id]/route.ts', '- [x] 8.5 Create GET /api/transcript/history/[id]/route.ts'),
    ('- [ ] 8.6 Create DELETE /api/transcript/history/[id]/route.ts', '- [x] 8.6 Create DELETE /api/transcript/history/[id]/route.ts'),
    ('- [ ] 8.7 Add TypeScript types for history responses', '- [x] 8.7 Add TypeScript types for history responses'),

    # Task Group 9 completed items (usage API)
    ('- [ ] 9.0 Create user usage stats API endpoint', '- [x] 9.0 Create user usage stats API endpoint'),
    ('- [ ] 9.2 Create GET /api/user/usage route', '- [x] 9.2 Create GET /api/user/usage route'),
    ('- [ ] 9.3 Fetch usage stats', '- [x] 9.3 Fetch usage stats'),
    ('- [ ] 9.4 Format response', '- [x] 9.4 Format response'),
]

# Apply replacements
for old, new in replacements:
    content = content.replace(old, new)

# Write back
with open(tasks_file, 'w') as f:
    f.write(content)

print("Tasks updated successfully!")
print(f"Marked {len(replacements)} items as complete")
