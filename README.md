# YouTube Thing

A simple, fast YouTube transcript extraction tool built with Next.js and Oxylabs API. Extract transcripts from any YouTube video and copy them instantly.

## Features

- 🌐 **Multi-language Support** - Extract transcripts in 12+ languages
- 📝 **Transcript Types** - Choose between auto-generated or uploader-provided captions
- 🔄 **Smart Fallback** - Automatically falls back to available transcripts
- 🎨 **Modern UI** - Glassmorphism design with smooth animations
- 📋 **One-Click Copy** - Instantly copy transcripts to clipboard
- 💾 **Easy Download** - Download transcripts as text files
- ⚡ **Fast & Reliable** - Powered by Oxylabs enterprise API

## Tech Stack

- **Frontend**: Next.js 15.3, React, TypeScript
- **Styling**: Tailwind CSS with Glassmorphism theme
- **Animation**: Framer Motion
- **API**: Oxylabs Web Scraper API
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Oxylabs account (sign up at [oxylabs.io](https://oxylabs.io))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/youtube-thing.git
cd youtube-thing
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your Oxylabs credentials:
```env
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
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

1. Push your code to GitHub
2. Import the project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `OXYLABS_USERNAME`
   - `OXYLABS_PASSWORD`
4. Deploy!

## Usage

1. Enter a YouTube video URL
2. Select your preferred language
3. Choose transcript type (auto-generated or uploader-provided)
4. Click "Extract Transcript"
5. Copy to clipboard or download as text file

The app will automatically fall back to available transcripts if your preferred option isn't available.

## API Routes

- `/api/transcript-oxylabs` - Main transcript extraction endpoint
- `/api/transcript` - Alternative transcript extraction endpoints (alt1, alt2, alt3)
- `/api/test-env` - Environment configuration test endpoint

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OXYLABS_USERNAME` | Your Oxylabs username | Yes |
| `OXYLABS_PASSWORD` | Your Oxylabs password | Yes |

## License

MIT
