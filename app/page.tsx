'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { TranscriptCache } from '@/lib/transcript-cache'; // Unused in mock implementation
import { analytics } from '@/lib/analytics';
import {
  Loader2,
  Copy,
  Download,
  Youtube,
  Zap,
  FileText,
  Globe,
  Settings,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import type { TranscriptSegment, TranscriptMetadata, TranscriptOrigin, SupportedLanguage } from '@/lib/types';


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

  // Helper function to copy with notification
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
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock transcript data
      const mockTranscript: TranscriptSegment[] = [
        {
          text: "Welcome to this comprehensive tutorial on building modern web applications.",
          duration: 3.5,
          timestamp: "0:00"
        },
        {
          text: "In this video, we're going to explore the fundamentals of React and Next.js.",
          duration: 4.2,
          timestamp: "0:03"
        },
        {
          text: "First, let's talk about why component-based architecture has become so popular.",
          duration: 4.8,
          timestamp: "0:07"
        },
        {
          text: "Component-based development allows us to break down complex UIs into smaller, reusable pieces.",
          duration: 5.1,
          timestamp: "0:12"
        },
        {
          text: "This approach makes our code more maintainable and easier to test.",
          duration: 3.9,
          timestamp: "0:17"
        },
        {
          text: "Now, let's dive into setting up our development environment.",
          duration: 3.2,
          timestamp: "0:21"
        },
        {
          text: "You'll need Node.js installed on your machine, preferably version 18 or higher.",
          duration: 4.5,
          timestamp: "0:24"
        },
        {
          text: "Once you have Node installed, we can use npm or yarn to create our project.",
          duration: 4.3,
          timestamp: "0:29"
        },
        {
          text: "I personally prefer using the Next.js CLI for creating new projects.",
          duration: 3.8,
          timestamp: "0:33"
        },
        {
          text: "It sets up everything we need with a single command: npx create-next-app.",
          duration: 4.6,
          timestamp: "0:37"
        },
        {
          text: "The CLI will ask you several questions about your project configuration.",
          duration: 4.1,
          timestamp: "0:41"
        },
        {
          text: "Make sure to select TypeScript if you want type safety in your application.",
          duration: 4.2,
          timestamp: "0:46"
        },
        {
          text: "Also, I recommend enabling the App Router, which is the modern way to handle routing in Next.js.",
          duration: 5.3,
          timestamp: "0:50"
        },
        {
          text: "For styling, you can choose between CSS modules, Tailwind CSS, or styled-components.",
          duration: 5.1,
          timestamp: "0:55"
        },
        {
          text: "Tailwind has become incredibly popular due to its utility-first approach.",
          duration: 4.2,
          timestamp: "1:00"
        },
        {
          text: "Alright, now that our project is set up, let's explore the folder structure.",
          duration: 4.0,
          timestamp: "1:04"
        },
        {
          text: "The app directory is where all our routes and pages will live.",
          duration: 3.7,
          timestamp: "1:08"
        },
        {
          text: "Each folder in the app directory represents a route segment.",
          duration: 3.5,
          timestamp: "1:12"
        },
        {
          text: "And special files like page.tsx and layout.tsx have specific meanings in Next.js.",
          duration: 4.8,
          timestamp: "1:16"
        },
        {
          text: "Let's create our first component and see how everything connects together.",
          duration: 4.2,
          timestamp: "1:20"
        },
        {
          text: "Remember to keep your components small and focused on a single responsibility.",
          duration: 4.5,
          timestamp: "1:25"
        },
        {
          text: "This makes them easier to test and reuse throughout your application.",
          duration: 3.8,
          timestamp: "1:29"
        },
        {
          text: "Thank you for watching this introduction to modern web development!",
          duration: 3.9,
          timestamp: "1:33"
        },
        {
          text: "In the next video, we'll dive deeper into state management and data fetching.",
          duration: 4.5,
          timestamp: "1:37"
        },
        {
          text: "Don't forget to subscribe and hit the notification bell for more tutorials.",
          duration: 4.1,
          timestamp: "1:41"
        }
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      {/* Copy notification toast */}
      <AnimatePresence>
        {copyNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-6 py-3 shadow-2xl">
              <div className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="font-medium">{copyNotification}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 lg:mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Youtube className="w-10 h-10 lg:w-12 lg:h-12 text-red-500" />
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
              YouTube Transcript
            </h1>
          </div>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Extract transcripts from any YouTube video instantly
          </p>
        </motion.div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          {transcript.length === 0 ? (
            /* Initial state - centered input */
            <motion.div
              key="initial"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              {/* Glass input card */}
              <motion.div
                className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleExtract} className="space-y-6">
                  {/* URL Input */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-white/90">
                      <Youtube className="w-4 h-4" />
                      Video URL or ID
                    </label>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  {/* Language and Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-white/90">
                        <Globe className="w-4 h-4" />
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                        className="w-full px-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer"
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

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-white/90">
                        <Settings className="w-4 h-4" />
                        Type
                      </label>
                      <select
                        value={transcriptOrigin}
                        onChange={(e) => setTranscriptOrigin(e.target.value as TranscriptOrigin)}
                        className="w-full px-4 py-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer"
                        disabled={loading}
                      >
                        <option value="auto_generated">Auto-generated</option>
                        <option value="uploader_provided">Uploader</option>
                      </select>
                    </div>
                  </div>

                  {/* Extract Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Extract Transcript
                        </>
                      )}
                    </span>
                  </motion.button>
                </form>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-2xl"
                  >
                    <div className="flex items-start gap-2 text-red-300">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Cache notification */}
                {usingCache && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 backdrop-blur-xl bg-green-500/10 border border-green-500/30 rounded-2xl"
                  >
                    <div className="flex items-center gap-2 text-green-300">
                      <TrendingUp className="w-5 h-5" />
                      <p className="text-sm font-medium">Loaded from cache</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8"
              >
                {[
                  { icon: Globe, text: '12+ Languages' },
                  { icon: Zap, text: 'Ultra-Fast Processing' },
                  { icon: FileText, text: 'Clean Timestamps' },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 text-center"
                  >
                    <feature.icon className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                    <p className="text-sm text-white/80">{feature.text}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            /* Results view - single centered panel */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto"
            >
              {/* Transcript panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col"
              >
                {/* New extraction form (collapsed) */}
                <form onSubmit={handleExtract} className="space-y-4 mb-6">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="New YouTube URL..."
                    className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    disabled={loading}
                  />

                  <div className="flex gap-3">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                      className="flex-1 px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-purple-500/50"
                      disabled={loading}
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
                    </motion.button>
                  </div>
                </form>

                {/* Transcript header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Transcript</h3>
                    <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-lg">
                      {transcript.length} segments
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      onClick={async () => {
                        const fullText = transcript.map(item => `[${item.timestamp}] ${item.text}`).join('\n');
                        await copyToClipboard(fullText, 'Transcript');
                        analytics.trackExport('copy', 'raw');
                      }}
                      className="p-2 backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Copy className="w-4 h-4 text-white" />
                    </motion.button>
                    <motion.button
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
                      className="p-2 backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Download className="w-4 h-4 text-white" />
                    </motion.button>
                  </div>
                </div>

                {/* Transcript content */}
                <div className="flex-1 overflow-y-auto bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10 max-h-[600px]">
                  <div className="space-y-3">
                    {transcript.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.01 }}
                        className="flex gap-3"
                      >
                        <span className="text-xs text-purple-400 font-mono min-w-[60px]">
                          {item.timestamp}
                        </span>
                        <p className="text-sm text-white/90">{item.text}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
