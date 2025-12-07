'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';
import { UserMenu } from '@/components/user-menu';
import { SignInModal } from '@/components/sign-in-modal';
import {
  Loader2,
  Copy,
  Download,
  Youtube,
  Zap,
  FileText,
  Globe,
  ChevronDown,
  Check,
  AlertCircle,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import type { TranscriptSegment, TranscriptMetadata, TranscriptOrigin, SupportedLanguage } from '@/lib/types';


export default function Home() {
  const { data: session, status } = useSession();
  const isSignedIn = !!session;
  const isLoaded = status !== 'loading';
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [_transcriptMetadata, setTranscriptMetadata] = useState<TranscriptMetadata | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [transcriptOrigin, setTranscriptOrigin] = useState<TranscriptOrigin>('auto_generated');
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(`${label} copied!`);
      setTimeout(() => setCopyNotification(null), 2000);
    } catch {
      setCopyNotification('Failed to copy');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a YouTube URL or video ID');
      return;
    }

    setLoading(true);
    setError('');
    setTranscript([]);
    setTranscriptMetadata(null);

    const startTime = Date.now();

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockTranscript: TranscriptSegment[] = [
        { text: "Welcome to this comprehensive tutorial on building modern web applications.", duration: 3.5, timestamp: "0:00" },
        { text: "In this video, we're going to explore the fundamentals of React and Next.js.", duration: 4.2, timestamp: "0:03" },
        { text: "First, let's talk about why component-based architecture has become so popular.", duration: 4.8, timestamp: "0:07" },
        { text: "Component-based development allows us to break down complex UIs into smaller, reusable pieces.", duration: 5.1, timestamp: "0:12" },
        { text: "This approach makes our code more maintainable and easier to test.", duration: 3.9, timestamp: "0:17" },
        { text: "Now, let's dive into setting up our development environment.", duration: 3.2, timestamp: "0:21" },
        { text: "You'll need Node.js installed on your machine, preferably version 18 or higher.", duration: 4.5, timestamp: "0:24" },
        { text: "Once you have Node installed, we can use npm or yarn to create our project.", duration: 4.3, timestamp: "0:29" },
        { text: "I personally prefer using the Next.js CLI for creating new projects.", duration: 3.8, timestamp: "0:33" },
        { text: "It sets up everything we need with a single command: npx create-next-app.", duration: 4.6, timestamp: "0:37" },
        { text: "The CLI will ask you several questions about your project configuration.", duration: 4.1, timestamp: "0:41" },
        { text: "Make sure to select TypeScript if you want type safety in your application.", duration: 4.2, timestamp: "0:46" },
        { text: "Also, I recommend enabling the App Router, which is the modern way to handle routing in Next.js.", duration: 5.3, timestamp: "0:50" },
        { text: "For styling, you can choose between CSS modules, Tailwind CSS, or styled-components.", duration: 5.1, timestamp: "0:55" },
        { text: "Tailwind has become incredibly popular due to its utility-first approach.", duration: 4.2, timestamp: "1:00" },
        { text: "Alright, now that our project is set up, let's explore the folder structure.", duration: 4.0, timestamp: "1:04" },
        { text: "The app directory is where all our routes and pages will live.", duration: 3.7, timestamp: "1:08" },
        { text: "Each folder in the app directory represents a route segment.", duration: 3.5, timestamp: "1:12" },
        { text: "And special files like page.tsx and layout.tsx have specific meanings in Next.js.", duration: 4.8, timestamp: "1:16" },
        { text: "Let's create our first component and see how everything connects together.", duration: 4.2, timestamp: "1:20" },
        { text: "Remember to keep your components small and focused on a single responsibility.", duration: 4.5, timestamp: "1:25" },
        { text: "This makes them easier to test and reuse throughout your application.", duration: 3.8, timestamp: "1:29" },
        { text: "Thank you for watching this introduction to modern web development!", duration: 3.9, timestamp: "1:33" },
        { text: "In the next video, we'll dive deeper into state management and data fetching.", duration: 4.5, timestamp: "1:37" },
        { text: "Don't forget to subscribe and hit the notification bell for more tutorials.", duration: 4.1, timestamp: "1:41" }
      ];

      setTranscript(mockTranscript);
      setTranscriptMetadata({
        videoId: 'mock-video-id',
        language: language,
        origin: transcriptOrigin,
        actualLanguage: language,
        actualOrigin: transcriptOrigin,
        hadToFallback: false
      });

      analytics.trackExtraction({
        videoId: 'mock-video-id',
        language,
        transcriptType: transcriptOrigin,
        cached: false,
        duration: Date.now() - startTime
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract transcript';
      setError(errorMessage);

      analytics.trackError({
        type: 'extraction',
        error: errorMessage,
        context: { videoId: 'mock', language, transcriptOrigin }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTranscript([]);
    setUrl('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-red-100 dark:bg-red-950 rounded-lg">
              <Youtube className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white hidden sm:inline">YouTube Transcript</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/pricing"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Pricing
            </Link>

            {isLoaded && isSignedIn && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}

            {isLoaded && (
              isSignedIn ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => setShowSignInModal(true)}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Copy notification */}
      <AnimatePresence>
        {copyNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
              <Check className="w-4 h-4" />
              {copyNotification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto px-4 py-12 lg:py-20">
        <AnimatePresence mode="wait">
          {transcript.length === 0 ? (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 dark:bg-red-950 rounded-2xl mb-6">
                  <Youtube className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white mb-3">
                  YouTube Transcript
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Extract transcripts from any YouTube video instantly
                </p>
              </div>

              {/* Main form card */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 sm:p-8 shadow-sm">
                <form onSubmit={handleExtract} className="space-y-5">
                  {/* URL Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Video URL or ID
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="input-field"
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  {/* Options row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <div className="relative">
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                          className="input-field appearance-none pr-10"
                          disabled={loading}
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                          <option value="it">Italian</option>
                          <option value="pt">Portuguese</option>
                          <option value="ru">Russian</option>
                          <option value="ja">Japanese</option>
                          <option value="ko">Korean</option>
                          <option value="zh">Chinese</option>
                          <option value="ar">Arabic</option>
                          <option value="hi">Hindi</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Transcript type
                      </label>
                      <div className="relative">
                        <select
                          value={transcriptOrigin}
                          onChange={(e) => setTranscriptOrigin(e.target.value as TranscriptOrigin)}
                          className="input-field appearance-none pr-10"
                          disabled={loading}
                        >
                          <option value="auto_generated">Auto-generated</option>
                          <option value="uploader_provided">Uploader provided</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Extract Transcript
                      </>
                    )}
                  </button>
                </form>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 rounded-lg"
                  >
                    <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { icon: Globe, label: '12+ Languages' },
                  { icon: Zap, label: 'Ultra-Fast' },
                  { icon: FileText, label: 'Clean Output' },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 p-4 text-center"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-xl">
                      <feature.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{feature.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Results view */
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Back button and header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">New transcript</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
                      await copyToClipboard(fullText, 'Transcript');
                      analytics.trackExport('copy', 'raw');
                    }}
                    className="btn-ghost flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                  <button
                    onClick={() => {
                      const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
                      const blob = new Blob([fullText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'transcript.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                      analytics.trackExport('download', 'raw');
                    }}
                    className="btn-ghost flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>

              {/* Transcript card */}
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 dark:bg-indigo-950 rounded-lg">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-900 dark:text-white">Transcript</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{transcript.length} segments</p>
                    </div>
                  </div>
                </div>

                {/* Transcript content */}
                <div className="max-h-[500px] overflow-y-auto">
                  <div className="p-6 space-y-4">
                    {transcript.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex gap-4"
                      >
                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded h-fit min-w-[52px] text-center">
                          {item.timestamp}
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{item.text}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick extract another */}
              <div className="mt-6">
                <form onSubmit={handleExtract} className="flex gap-3">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste another YouTube URL..."
                    className="input-field flex-1"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary whitespace-nowrap"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </div>
  );
}
