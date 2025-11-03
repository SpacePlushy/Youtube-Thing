'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect } from 'react';

export type ToastType = 'error' | 'success' | 'info';

interface ErrorToastProps {
  isOpen: boolean;
  onClose: () => void;
  type?: ToastType;
  title: string;
  message?: string;
  autoClose?: boolean;
  autoCloseDuration?: number;
}

export function ErrorToast({
  isOpen,
  onClose,
  type = 'error',
  title,
  message,
  autoClose = true,
  autoCloseDuration = 5000,
}: ErrorToastProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDuration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-400" />;
      case 'error':
      default:
        return <AlertCircle className="w-6 h-6 text-red-400" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/10';
      case 'info':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'error':
      default:
        return 'border-red-500/30 bg-red-500/10';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`backdrop-blur-2xl bg-white/10 border ${getColorClasses()} rounded-2xl p-4 shadow-2xl`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold mb-1">{title}</h3>
                {message && <p className="text-gray-300 text-sm">{message}</p>}
              </div>

              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Progress bar for auto-close */}
            {autoClose && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoCloseDuration / 1000, ease: 'linear' }}
                className={`mt-3 h-1 rounded-full ${
                  type === 'error' ? 'bg-red-400' : type === 'success' ? 'bg-green-400' : 'bg-blue-400'
                }`}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
