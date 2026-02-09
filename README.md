# Transcripty

YouTube transcript extraction SaaS built with Elixir, Phoenix LiveView, and Tailwind CSS.

## Features

- Extract transcripts from YouTube videos in 12+ languages
- Export as TXT, SRT, VTT, or JSON
- Magic link + password authentication
- Google & GitHub OAuth login
- Free tier (5/day) and Pro tier (unlimited) with Stripe billing
- Transcript history and search (Pro)
- Background job processing with Oban
- In-memory caching with Cachex
- Rate limiting with Hammer

## Setup

```bash
mix setup
mix phx.server
```

Visit [`localhost:4000`](http://localhost:4000).

## Environment Variables

Copy `.env.example` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY_BASE` - Phoenix secret key
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe integration
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth

## Stack

- **Runtime**: Elixir/BEAM
- **Framework**: Phoenix 1.8 + LiveView
- **Database**: PostgreSQL + Ecto
- **Auth**: phx.gen.auth + Ueberauth
- **Payments**: Stripe (stripity_stripe)
- **Jobs**: Oban
- **Cache**: Cachex
- **Rate Limiting**: Hammer v7
- **Email**: Swoosh
- **CSS**: Tailwind CSS + DaisyUI
