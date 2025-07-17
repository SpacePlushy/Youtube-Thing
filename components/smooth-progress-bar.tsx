'use client';

import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface SmoothProgressBarProps {
  progress: number; // 0-100
  message: string;
  onComplete?: () => void;
}

export function SmoothProgressBar({ progress, message, onComplete }: SmoothProgressBarProps) {
  const progressValue = useMotionValue(0);
  const progressWidth = useTransform(progressValue, [0, 100], ['0%', '100%']);
  const progressCompleteRef = useRef(false);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Subscribe to motion value changes
  useMotionValueEvent(progressValue, "change", (latest) => {
    setDisplayProgress(Math.round(latest));
  });

  useEffect(() => {
    // Animate to the target progress with smooth easing
    const controls = animate(progressValue, progress, {
      duration: 0.8,
      ease: [0.4, 0, 0.2, 1], // Cubic bezier for smooth acceleration/deceleration
      onComplete: () => {
        if (progress === 100 && !progressCompleteRef.current && onComplete) {
          progressCompleteRef.current = true;
          onComplete();
        }
      }
    });

    return controls.stop;
  }, [progress, progressValue, onComplete]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{message}</span>
        <span className="text-sm text-muted-foreground">
          {displayProgress}%
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <motion.div 
          className="bg-primary h-2 rounded-full"
          style={{ width: progressWidth }}
        />
      </div>
    </div>
  );
}