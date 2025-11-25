'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '@/lib/analytics';
import {
  Loader2,
  Copy,
  Download,
  Play,
  Globe,
  Clock,
  Check,
  AlertCircle,
  ChevronDown,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import type { TranscriptSegment, TranscriptMetadata, TranscriptOrigin, SupportedLanguage } from '@/lib/types';
import Link from 'next/link';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [_transcriptMetadata, setTranscriptMetadata] = useState<TranscriptMetadata | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [transcriptOrigin, setTranscriptOrigin] = useState<TranscriptOrigin>('auto_generated');
  const [usingCache, setUsingCache] = useState(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

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
    setUsingCache(false);

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

  const resetToInitial = () => {
    setTranscript([]);
    setTranscriptMetadata(null);
    setUrl('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notification */}
      <AnimatePresence>
        {copyNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg">
              <Check className="w-4 h-4 text-emerald-400" />
              {copyNotification}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-semibold text-gray-900">Transcript</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <AnimatePresence mode="wait">
          {transcript.length === 0 ? (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              {/* Header */}
              <div className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
                  YouTube Transcript Extractor
                </h1>
                <p className="text-lg text-gray-500 max-w-lg mx-auto">
                  Extract and download transcripts from any YouTube video in seconds
                </p>
              </div>

              {/* Main input card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                <form onSubmit={handleExtract} className="space-y-5">
                  {/* URL Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video URL
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-base"
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  {/* Options toggle */}
                  <button
                    type="button"
                    onClick={() => setShowOptions(!showOptions)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} />
                    Advanced options
                  </button>

                  {/* Options */}
                  <AnimatePresence>
                    {showOptions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Language
                            </label>
                            <select
                              value={language}
                              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
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
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Source
                            </label>
                            <select
                              value={transcriptOrigin}
                              onChange={(e) => setTranscriptOrigin(e.target.value as TranscriptOrigin)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                              disabled={loading}
                            >
                              <option value="auto_generated">Auto-generated</option>
                              <option value="uploader_provided">Manual captions</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Extracting transcript...
                      </span>
                    ) : (
                      'Extract Transcript'
                    )}
                  </button>
                </form>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <div className="flex items-start gap-3 text-red-700">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Cache notice */}
                {usingCache && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
                  >
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Sparkles className="w-5 h-5" />
                      <p className="text-sm font-medium">Loaded from cache</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-6 mt-10">
                {[
                  { icon: Globe, title: '12+ Languages', desc: 'Multi-language support' },
                  { icon: Sparkles, title: 'Fast & Accurate', desc: 'Instant extraction' },
                  { icon: Clock, title: 'Timestamps', desc: 'Time-synced text' },
                ].map((feature, i) => (
                  <div key={i} className="text-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <feature.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">{feature.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              {/* Back button */}
              <button
                onClick={resetToInitial}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Extract another video
              </button>

              {/* Results card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>
                    <p className="text-sm text-gray-500">{transcript.length} segments</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
                        await copyToClipboard(fullText, 'Transcript');
                        analytics.trackExport('copy', 'raw');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
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
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Transcript content */}
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="divide-y divide-gray-50">
                    {transcript.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.01 }}
                        className="px-6 py-4 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex gap-4">
                          <span className="text-xs font-mono text-gray-400 pt-0.5 w-12 flex-shrink-0">
                            {item.timestamp}
                          </span>
                          <p className="text-gray-700 text-sm leading-relaxed">{item.text}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick new extraction */}
              <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
                <form onSubmit={handleExtract} className="flex gap-3">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste another YouTube URL..."
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-400 text-center">
            Extract transcripts from YouTube videos instantly
          </p>
        </div>
      </footer>
    </div>
  );
}
