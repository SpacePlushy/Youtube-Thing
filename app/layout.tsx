import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { BotIdClient } from 'botid/client'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YouTube Thing',
  description: 'Extract transcripts from any YouTube video',
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
  return (
    <html lang="en">
      <head>
        {/* Temporarily disabled BotID until properly configured */}
        {/* <BotIdClient protect={protectedRoutes} /> */}
      </head>
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}