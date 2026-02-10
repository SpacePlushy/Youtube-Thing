'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, CreditCard, LogOut } from 'lucide-react';

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (!session?.user) return null;

  const { user } = session;
  const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const isPro = user.subscriptionTier === 'pro';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus:ring-2 focus:ring-vermillion-500/30 focus:ring-offset-2 dark:focus:ring-offset-[#050505]"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.image ? (
          <Image src={user.image} alt={user.name || 'User avatar'} width={32} height={32} className="rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-vermillion-500 flex items-center justify-center text-white text-sm font-body font-medium">{initials}</div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0f0f0f] rounded-xl border border-gray-200/80 dark:border-white/[0.08] shadow-lg dark:shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-100 dark:border-white/[0.04]">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image src={user.image} alt={user.name || ''} width={40} height={40} className="rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-vermillion-500 flex items-center justify-center text-white font-body font-medium">{initials}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-gray-900 dark:text-white truncate">{user.name || 'User'}</p>
                  <p className="text-sm font-body text-gray-500 dark:text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="mt-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium tracking-wider uppercase ${
                  isPro
                    ? 'bg-vermillion-500/10 text-vermillion-500'
                    : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400'
                }`}>
                  {isPro ? 'Pro' : 'Free'}
                </span>
              </div>
            </div>

            <div className="p-1.5">
              <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-body text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors">
                <LayoutDashboard className="w-4 h-4 text-gray-400 dark:text-gray-600" />Dashboard
              </Link>
              <Link href="/pricing" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm font-body text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors">
                <CreditCard className="w-4 h-4 text-gray-400 dark:text-gray-600" />{isPro ? 'Manage Billing' : 'Upgrade to Pro'}
              </Link>
            </div>

            <div className="p-1.5 border-t border-gray-100 dark:border-white/[0.04]">
              <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-body text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                <LogOut className="w-4 h-4" />Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
