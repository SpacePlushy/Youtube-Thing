# YouTube Transcript Extractor

A powerful SaaS platform for extracting and managing YouTube transcripts with authentication, usage tracking, and subscription tiers. Built with Next.js, Clerk, and Vercel Postgres.

## Features

### Core Features
- **Multi-language Support** - Extract transcripts in 12+ languages
- **Transcript Types** - Choose between auto-generated or uploader-provided captions
- **Smart Fallback** - Automatically falls back to available transcripts
- **Modern UI** - Glassmorphism design with smooth animations
- **One-Click Copy** - Instantly copy transcripts to clipboard
- **Easy Download** - Download transcripts as TXT or PDF files

### SaaS Features
- **User Authentication** - Secure sign-up/sign-in with Clerk (email, Google, GitHub OAuth)
- **Subscription Tiers** - Free, Starter ($9/mo), Pro ($29/mo), Enterprise ($99/mo)
- **Usage Tracking** - Daily transcript limits based on tier (5/day, 50/day, unlimited)
- **Transcript History** - Save and access past transcripts (Starter tier and above)
- **User Dashboard** - View usage stats, manage subscriptions, access history
- **Billing Management** - Integrated Stripe payments via Clerk

## Subscription Tiers

| Feature | Free | Starter ($9/mo) | Pro ($29/mo) | Enterprise ($99/mo) |
|---------|------|-----------------|--------------|---------------------|
| Daily Transcripts | 5 | 50 | Unlimited | Unlimited |
| History Retention | None | 30 days | Unlimited | Unlimited |
| Search | - | ✓ | ✓ | ✓ |
| Export Formats | TXT | TXT, PDF | All formats | All formats |
| API Access | - | - | 10k/month | 100k/month |
| Batch Processing | - | - | 10 videos | 50 videos |
| Support | Community | Priority Email | Priority | Dedicated |

## Tech Stack

- **Frontend**: Next.js 15.3, React 18, TypeScript 5
- **Styling**: Tailwind CSS 3.4 with Glassmorphism theme
- **Animation**: Framer Motion
- **Authentication**: Clerk (with Stripe billing integration)
- **Database**: Vercel Postgres (transcript history storage)
- **Cache/Rate Limiting**: Upstash Redis
- **API**: youtube-transcript library
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Clerk account (sign up at [clerk.com](https://clerk.com))
- Vercel account for deployment (optional for local development)
- Stripe account for payments (linked through Clerk)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/youtube-transcript-extractor.git
cd youtube-transcript-extractor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure Clerk:
   - Create a new application in [Clerk Dashboard](https://dashboard.clerk.com)
   - Enable email/password, Google, and GitHub OAuth providers
   - Copy your publishable and secret keys
   - Follow the detailed setup guide: [CLERK_DASHBOARD_SETUP.md](./agent-os/specs/2025-11-02-subscription-clerk-auth/CLERK_DASHBOARD_SETUP.md)

5. Edit `.env.local` and add required variables:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Vercel Postgres (auto-populated by Vercel, or add your own)
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_USER=default
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=verceldb

# Upstash Redis (optional, for usage tracking)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

6. Initialize the database:
```bash
# Database tables are created automatically on first run
# Or manually run initialization:
node -e "require('./lib/db').initializeDatabase()"
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Production Build

```bash
npm run build
npm start
```

## Deployment to Vercel

### 1. Set up Vercel Postgres

1. In your Vercel project, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Follow the prompts to create a database
4. Environment variables will be automatically added to your project

### 2. Set up Upstash Redis (Optional)

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy the REST URL and REST Token
3. Add to Vercel environment variables

### 3. Configure Clerk for Production

1. In Clerk Dashboard, switch to **Production** instance
2. Add your production domain to allowed domains
3. Configure OAuth redirect URLs:
   - Sign-in redirect: `https://yourdomain.com/dashboard`
   - Sign-out redirect: `https://yourdomain.com`
4. Set up subscription tiers following [CLERK_DASHBOARD_SETUP.md](./agent-os/specs/2025-11-02-subscription-clerk-auth/CLERK_DASHBOARD_SETUP.md)

### 4. Deploy to Vercel

1. Push your code to GitHub
2. Import the project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production)
   - `CLERK_SECRET_KEY` (production)
   - All Clerk routing variables
   - Postgres variables (auto-added)
   - Redis variables (if using)
4. Deploy!

### 5. Post-Deployment Verification

- Visit your production URL and test sign-up flow
- Extract a test transcript
- Verify usage tracking works
- Test subscription upgrade flow
- Check that transcript history saves correctly

## Usage

### For End Users

1. **Sign Up** - Create an account with email or OAuth
2. **Extract Transcripts** - Enter a YouTube URL and click "Extract"
3. **View Dashboard** - Check your usage stats and history
4. **Upgrade Plan** - Increase limits by upgrading to Starter or Pro
5. **Manage Billing** - Update payment methods via Clerk portal

### API Endpoints

#### Authentication Required

- `POST /api/transcript/extract` - Extract transcript with usage tracking
  - Body: `{ videoId: string, videoUrl?: string, saveToHistory?: boolean }`
  - Returns: `{ transcript, metadata, usage }`
  - Errors: 401 (unauthorized), 429 (limit exceeded), 500 (extraction failed)

- `GET /api/transcript/history` - Get user's transcript history (paginated)
  - Query: `?page=1&limit=20&sortBy=created_at&order=desc`
  - Returns: `{ transcripts: [], pagination: {} }`
  - Access: Starter tier and above

- `GET /api/transcript/history/:id` - Get full transcript by ID
  - Returns: Full transcript with metadata
  - Access: Owner only

- `DELETE /api/transcript/history/:id` - Delete transcript
  - Returns: `{ success: true }`
  - Access: Owner only

- `GET /api/user/usage` - Get current usage stats
  - Returns: `{ currentUsage, dailyLimit, tier, resetTime }`

#### Public Endpoints

- `GET /pricing` - View subscription plans
- `GET /` - Home page with transcript extractor

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in page URL | Yes |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up page URL | Yes |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Redirect after sign-in | Yes |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Redirect after sign-up | Yes |
| `POSTGRES_URL` | Postgres connection string | Yes |
| `POSTGRES_PRISMA_URL` | Postgres Prisma URL | Yes |
| `POSTGRES_URL_NON_POOLING` | Postgres non-pooling URL | Yes |
| `POSTGRES_USER` | Postgres username | Yes |
| `POSTGRES_HOST` | Postgres host | Yes |
| `POSTGRES_PASSWORD` | Postgres password | Yes |
| `POSTGRES_DATABASE` | Postgres database name | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Optional* |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Optional* |

*Redis is optional for development but recommended for production usage tracking.

## Database Schema

### users_transcripts
```sql
CREATE TABLE users_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  video_id VARCHAR(255) NOT NULL,
  video_title TEXT NOT NULL,
  channel_name VARCHAR(500),
  video_duration INTEGER,
  transcript_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_created ON users_transcripts (user_id, created_at DESC);
CREATE INDEX idx_video ON users_transcripts (video_id);
```

### user_settings
```sql
CREATE TABLE user_settings (
  user_id VARCHAR(255) PRIMARY KEY,
  default_export_format VARCHAR(10) DEFAULT 'txt',
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

## Troubleshooting

### Database Connection Issues
- Verify `POSTGRES_URL` is set correctly
- Check Vercel Postgres dashboard for connection details
- Ensure database is in same region as Vercel deployment

### Redis Connection Issues
- Redis is optional for development
- In production, ensure `UPSTASH_REDIS_REST_URL` and token are set
- Check Upstash dashboard for connection status

### Clerk Authentication Issues
- Verify all Clerk environment variables are set
- Check OAuth providers are enabled in Clerk Dashboard
- Ensure production domain is added to allowed domains

### Usage Limit Not Enforcing
- Check Redis connection
- Verify middleware is running (check `/api/transcript/extract`)
- Clear Redis cache if testing: `redis-cli FLUSHDB` (development only)

### Transcript History Not Saving
- Verify user is on Starter tier or higher
- Check database connection
- Review server logs for database errors

For more troubleshooting, see [CLERK_DASHBOARD_SETUP.md](./agent-os/specs/2025-11-02-subscription-clerk-auth/CLERK_DASHBOARD_SETUP.md).

## Support

- Documentation: [GitHub Wiki](https://github.com/yourusername/youtube-transcript-extractor/wiki)
- Issues: [GitHub Issues](https://github.com/yourusername/youtube-transcript-extractor/issues)
- Email: support@example.com

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Roadmap

### Phase 3: Power User Features (Coming Soon)
- Collections and tags for organizing transcripts
- Full-text search across transcript history
- Batch processing for multiple videos
- Export to Markdown, JSON, SRT formats
- Priority processing queue

### Phase 4: Monetization & Scale
- API access for developers
- Team workspaces for collaboration
- Webhooks for automation
- Advanced analytics
- Custom integrations

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Authentication by [Clerk](https://clerk.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
