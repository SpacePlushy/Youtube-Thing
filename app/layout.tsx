import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YouTube Transcript - Extract Video Transcripts Instantly',
  description: 'Extract transcripts from any YouTube video instantly. Support for 12+ languages, clean timestamps, and fast processing. Free online tool.',
  keywords: ['YouTube transcript', 'video transcript extractor', 'YouTube captions', 'video text extraction', 'transcript generator', 'YouTube subtitles'],
  authors: [{ name: 'YouTube Transcript' }],
  creator: 'YouTube Transcript',
  publisher: 'YouTube Transcript',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://youtubething.com',
    title: 'YouTube Transcript - Extract Video Transcripts Instantly',
    description: 'Extract transcripts from any YouTube video instantly. Support for 12+ languages, clean timestamps, and fast processing.',
    siteName: 'YouTube Transcript',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'YouTube Transcript - Extract Video Transcripts Instantly',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Transcript - Extract Video Transcripts Instantly',
    description: 'Extract transcripts from any YouTube video instantly. Support for 12+ languages, clean timestamps, and fast processing.',
    images: ['/og-image.png'],
    creator: '@youtubething',
  },
  alternates: {
    canonical: 'https://youtubething.com',
  },
  other: {
    'theme-color': '#1e1b4b',
    'msapplication-TileColor': '#1e1b4b',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "YouTube Transcript",
    "description": "Extract transcripts from any YouTube video instantly. Support for 12+ languages, clean timestamps, and fast processing.",
    "url": "https://youtubething.com",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "YouTube transcript extraction",
      "12+ language support",
      "Clean timestamps",
      "Fast processing",
      "Copy & download functionality",
      "Auto-generated and uploader captions"
    ],
    "publisher": {
      "@type": "Organization",
      "name": "YouTube Transcript"
    }
  };

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#7c3aed',
          colorBackground: '#0f172a',
          colorText: '#f1f5f9',
          colorTextSecondary: '#cbd5e1',
          colorInputBackground: '#1e293b',
          colorInputText: '#f1f5f9',
          borderRadius: '1rem',
        },
        elements: {
          formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500',
          card: 'backdrop-blur-2xl bg-white/10 border-white/20',
          headerTitle: 'text-white',
          headerSubtitle: 'text-slate-300',
          socialButtonsBlockButton: 'backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20',
          formFieldLabel: 'text-white/90',
          formFieldInput: 'bg-white/5 border-white/10 text-white placeholder:text-white/40',
          footerActionLink: 'text-purple-400 hover:text-purple-300',
        },
      }}
    >
      <html lang="en">
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        </head>
        <body className={inter.className}>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
