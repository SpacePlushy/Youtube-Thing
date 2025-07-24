'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormatOptions } from '@/components/format-options';
import { SmoothProgressBar } from '@/components/smooth-progress-bar';
import { useTranscriptExtraction, useTranscriptFormatting, useClipboard } from '@/hooks';
import { TranscriptForm, TranscriptStatus, TranscriptDisplay, FormattedTranscriptDisplay } from '@/components/transcript';
import type { TranscriptOrigin, SupportedLanguage } from '@/lib/types';


export default function Home() {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [transcriptOrigin, setTranscriptOrigin] = useState<TranscriptOrigin>('auto_generated');

  // Use custom hooks
  const { 
    loading,
    error: extractionError,
    transcript,
    transcriptMetadata,
    usingCache,
    extractTranscript
  } = useTranscriptExtraction({ language, transcriptOrigin });

  const {
    formattedTranscript,
    isFormatting,
    formattingProgress,
    error: formattingError,
    formatTranscript,
    clearFormattingProgress,
    parseFormattedTranscript
  } = useTranscriptFormatting();

  const { copyNotification, copyToClipboard } = useClipboard();

  // Combine errors
  const error = extractionError || formattingError;

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    await extractTranscript(url);
  };
  
  const handleFormat = async (options: {
    style: string;
    includeTimestamps: boolean;
    paragraphLength: string;
  }) => {
    await formatTranscript(transcript, options);
  };
  
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Copy notification toast */}
      <AnimatePresence>
        {copyNotification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          >
            <div className="bg-card border border-border rounded-lg px-6 py-3 shadow-lg">
              <p className="text-base text-card-foreground font-medium">{copyNotification}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="w-full mx-auto px-4 py-4 lg:py-8 flex-1 flex flex-col max-w-[1600px] min-h-0">
        <div className="text-center mb-4 lg:mb-6">
          <h1 className="text-2xl lg:text-4xl font-bold text-foreground">
            YouTube Thing
          </h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
            Extract and format transcripts from any YouTube video. Get clean, readable text with AI-powered formatting and grammar corrections.
          </p>
        </div>
        
        {/* Main content - animated layout based on transcript */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {transcript.length === 0 ? (
              /* Centered layout when no transcript */
              <motion.div
                key="centered"
                className="absolute inset-0 flex items-start justify-center pt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  layoutId="input-card"
                  className="bg-card rounded-lg border border-border p-4 lg:p-6 w-full max-w-xl"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
              <TranscriptForm
                url={url}
                setUrl={setUrl}
                language={language}
                setLanguage={setLanguage}
                transcriptOrigin={transcriptOrigin}
                setTranscriptOrigin={setTranscriptOrigin}
                loading={loading}
                onSubmit={handleExtract}
              />
              
              <TranscriptStatus
                error={error}
                transcriptMetadata={transcriptMetadata}
                usingCache={usingCache}
              />
            
                </motion.div>
              </motion.div>
            ) : (
              /* Two-panel layout when transcript exists */
              <motion.div
                key="panels"
                className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Left Panel - Input Controls and Raw Transcript */}
                <motion.div 
                  layoutId="input-card"
                  className="bg-card rounded-lg border border-border p-4 lg:p-6 flex flex-col min-h-0 overflow-hidden h-auto lg:h-auto"
                  initial={false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
              <div className="mb-4">
                <TranscriptForm
                  url={url}
                  setUrl={setUrl}
                  language={language}
                  setLanguage={setLanguage}
                  transcriptOrigin={transcriptOrigin}
                  setTranscriptOrigin={setTranscriptOrigin}
                  loading={loading}
                  onSubmit={handleExtract}
                  autoFocus={false}
                />
              </div>
              
              <div className="mb-4">
                <TranscriptStatus
                  error={error}
                  transcriptMetadata={transcriptMetadata}
                  usingCache={usingCache}
                />
              </div>
              
              <TranscriptDisplay
                transcript={transcript}
                onCopy={copyToClipboard}
              />
            </motion.div>
            
            {/* Right Panel - AI Formatting Options and Formatted Transcript */}
            <motion.div 
              className="bg-card rounded-lg border border-border p-4 lg:p-6 flex flex-col min-h-0 overflow-hidden h-auto lg:h-auto"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <div className="flex-shrink-0">
                <FormatOptions 
                  transcriptLength={transcript.length}
                  onFormat={handleFormat}
                  isFormatting={isFormatting}
                />
              </div>
              
              {formattingProgress && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-border">
                  <SmoothProgressBar
                    progress={formattingProgress.progress}
                    message={formattingProgress.message}
                    onComplete={() => {
                      setTimeout(() => clearFormattingProgress(), 1000);
                    }}
                  />
                </div>
              )}
              
              {formattedTranscript && (
                <FormattedTranscriptDisplay
                  formattedTranscript={formattedTranscript}
                  isFormatting={isFormatting}
                  parseFormattedTranscript={parseFormattedTranscript}
                  onCopy={copyToClipboard}
                />
              )}
            </motion.div>
          </motion.div>
        )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}