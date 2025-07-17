import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { BotIdClient } from 'botid/client'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YouTube Thing - Extract & Format Video Transcripts with AI',
  description: 'Extract transcripts from any YouTube video and format them with AI. Get clean, readable text with grammar corrections, timestamps, and professional formatting. Free online tool.',
  keywords: ['YouTube transcript', 'video transcript extractor', 'AI transcript formatting', 'YouTube captions', 'video text extraction', 'transcript generator'],
  authors: [{ name: 'YouTube Thing' }],
  creator: 'YouTube Thing',
  publisher: 'YouTube Thing',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://youtubething.com',
    title: 'YouTube Thing - Extract & Format Video Transcripts with AI',
    description: 'Extract transcripts from any YouTube video and format them with AI. Get clean, readable text with grammar corrections, timestamps, and professional formatting. Free online tool.',
    siteName: 'YouTube Thing',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'YouTube Thing - Extract & Format Video Transcripts with AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Thing - Extract & Format Video Transcripts with AI',
    description: 'Extract transcripts from any YouTube video and format them with AI. Get clean, readable text with grammar corrections, timestamps, and professional formatting.',
    images: ['/og-image.png'],
    creator: '@youtubething',
  },
  alternates: {
    canonical: 'https://youtubething.com',
  },
  other: {
    'theme-color': 'hsl(0 0% 8%)',
    'msapplication-TileColor': 'hsl(0 0% 8%)',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const protectedRoutes = [
  {
    path: '/api/*',
    method: 'POST',
  },
  {
    path: '/api/*',
    method: 'PUT',
  },
  {
    path: '/api/*',
    method: 'DELETE',
  },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "YouTube Thing",
    "description": "Extract transcripts from any YouTube video and format them with AI. Get clean, readable text with grammar corrections, timestamps, and professional formatting.",
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
      "AI-powered text formatting",
      "Grammar corrections",
      "Timestamp preservation",
      "Multiple language support",
      "Export functionality"
    ],
    "publisher": {
      "@type": "Organization",
      "name": "YouTube Thing"
    }
  };

  return (
    <html lang="en">
      <head>
        {/* Temporarily disabled BotID until properly configured */}
        {/* <BotIdClient protect={protectedRoutes} /> */}
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
  )
}