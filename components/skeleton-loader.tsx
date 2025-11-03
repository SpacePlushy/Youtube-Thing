'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'avatar' | 'button';
  count?: number;
  className?: string;
}

export function SkeletonLoader({ variant = 'card', count = 1, className = '' }: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8 ${className}`}>
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-white/10 rounded-xl w-1/3" />
              <div className="h-4 bg-white/10 rounded-lg w-full" />
              <div className="h-4 bg-white/10 rounded-lg w-5/6" />
              <div className="h-4 bg-white/10 rounded-lg w-4/6" />
            </div>
          </div>
        );

      case 'text':
        return (
          <div className={`animate-pulse space-y-2 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="h-4 bg-white/10 rounded-lg" style={{ width: `${100 - i * 10}%` }} />
            ))}
          </div>
        );

      case 'avatar':
        return <div className={`w-12 h-12 bg-white/10 rounded-full animate-pulse ${className}`} />;

      case 'button':
        return <div className={`h-12 bg-white/10 rounded-xl animate-pulse ${className}`} />;

      default:
        return null;
    }
  };

  if (count > 1 && variant !== 'text') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
            {renderSkeleton()}
          </motion.div>
        ))}
      </div>
    );
  }

  return <>{renderSkeleton()}</>;
}

// Specific skeleton components for common patterns
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonLoader variant="card" className="h-64" />
      <SkeletonLoader variant="card" className="h-96" />
      <SkeletonLoader variant="card" className="h-48" />
    </div>
  );
}

export function TranscriptHistorySkeleton() {
  return (
    <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/10 rounded-xl w-48 mb-6" />

        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex gap-4">
              <div className="w-40 h-24 bg-white/10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-white/10 rounded-lg w-3/4" />
                <div className="h-4 bg-white/10 rounded-lg w-1/2" />
                <div className="h-3 bg-white/10 rounded-lg w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsageStatsSkeleton() {
  return (
    <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-6 sm:p-8">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-6 bg-white/10 rounded-lg w-32" />
              <div className="h-4 bg-white/10 rounded-lg w-24" />
            </div>
          </div>
          <div className="w-24 h-8 bg-white/10 rounded-full" />
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-baseline gap-2">
            <div className="h-12 bg-white/10 rounded-lg w-20" />
            <div className="h-8 bg-white/10 rounded-lg w-16" />
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full" />
          <div className="h-4 bg-white/10 rounded-lg w-48" />
        </div>

        <div className="h-16 bg-white/10 rounded-xl" />
      </div>
    </div>
  );
}
