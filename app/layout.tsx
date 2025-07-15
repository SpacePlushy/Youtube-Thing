import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { BotIdClient } from 'botid/client'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Youtube-Thing',
  description: 'Extract transcripts from any YouTube video',
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
      <body className={inter.className}>{children}</body>
    </html>
  )
}