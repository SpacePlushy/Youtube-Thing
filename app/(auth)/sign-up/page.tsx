'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Loader2, AlertCircle, Play, ArrowLeft, Check } from 'lucide-react';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => { if (status === 'authenticated') router.push(callbackUrl); }, [status, router, callbackUrl]);

  const handleOAuthSignIn = async (provider: 'google' | 'github') => { setIsLoading(provider); setError(null); await signIn(provider, { callbackUrl }); };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setIsLoading('email'); setError(null);
    try {
      const result = await signIn('email', { email, callbackUrl, redirect: false });
      if (result?.error) { setError('Failed to send magic link.'); setIsLoading(null); }
      else { setEmailSent(true); setIsLoading(null); }
    } catch { setError('Failed to send magic link.'); setIsLoading(null); }
  };

  if (status === 'loading') return <div className="min-h-screen bg-[#f8f6f3] dark:bg-[#050505] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-vermillion-500" /></div>;

  const benefits = ['5 free transcripts per day', 'Support for 12+ languages', 'Export to TXT format', 'No credit card required'];

  return (
    <div className="min-h-screen bg-[#f8f6f3] dark:bg-[#050505] flex flex-col">
      <header className="p-6">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-body font-medium">Back</span>
          </Link>
          <Link href="/"><div className="w-8 h-8 flex items-center justify-center bg-vermillion-500 rounded-lg"><Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" /></div></Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {emailSent ? (
            <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4"><Mail className="w-7 h-7 text-emerald-600 dark:text-emerald-400" /></div>
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
              <p className="font-body text-gray-500 dark:text-gray-500 mb-4">We sent a magic link to <strong className="text-gray-900 dark:text-white">{email}</strong></p>
              <p className="font-body text-sm text-gray-400 dark:text-gray-600 mb-6">Don&apos;t see it? Check your spam folder.</p>
              <button onClick={() => setEmailSent(false)} className="text-vermillion-500 text-sm font-body font-medium hover:underline">Use a different email</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-8">
              <div className="text-center mb-6">
                <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Create your account</h1>
                <p className="font-body text-gray-500 dark:text-gray-500">Start transcribing YouTube videos for free</p>
              </div>

              <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.04] rounded-xl p-4 mb-6">
                <p className="text-xs font-mono font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-3">Free tier includes</p>
                <ul className="space-y-2">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-body text-gray-700 dark:text-gray-300">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />{b}
                    </li>
                  ))}
                </ul>
              </div>

              {error && (<div className="flex items-center gap-2 p-3 mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm font-body"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>)}

              <div className="space-y-3">
                <button onClick={() => handleOAuthSignIn('google')} disabled={!!isLoading} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors disabled:opacity-50">
                  {isLoading==='google'?<Loader2 className="w-5 h-5 animate-spin text-gray-400"/>:<svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
                  <span className="text-sm font-body font-medium text-gray-700 dark:text-gray-300">Continue with Google</span>
                </button>
                <button onClick={() => handleOAuthSignIn('github')} disabled={!!isLoading} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50">
                  {isLoading==='github'?<Loader2 className="w-5 h-5 animate-spin"/>:<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>}
                  <span className="text-sm font-body font-medium">Continue with GitHub</span>
                </button>
                <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-white/[0.06]"/></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-[#0f0f0f] px-3 font-mono text-gray-400 dark:text-gray-600 tracking-wider">or email</span></div></div>
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="input-field" disabled={!!isLoading}/>
                  <button type="submit" disabled={!!isLoading||!email} className="w-full btn-primary flex items-center justify-center gap-2 font-body text-sm">{isLoading==='email'?<Loader2 className="w-4 h-4 animate-spin"/>:<Mail className="w-4 h-4"/>}Send magic link</button>
                </form>
              </div>
              <p className="text-center text-sm font-body text-gray-500 dark:text-gray-500 mt-6">Already have an account?{' '}<Link href="/sign-in" className="text-vermillion-500 font-medium hover:underline">Sign in</Link></p>
              <p className="text-xs text-center font-body text-gray-400 dark:text-gray-600 mt-4">By signing up, you agree to our{' '}<a href="/terms" className="text-vermillion-500 hover:underline">Terms</a> and{' '}<a href="/privacy" className="text-vermillion-500 hover:underline">Privacy Policy</a></p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export default function SignUpPage() {
  return (<Suspense fallback={<div className="min-h-screen bg-[#f8f6f3] dark:bg-[#050505] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-vermillion-500"/></div>}><SignUpContent/></Suspense>);
}
