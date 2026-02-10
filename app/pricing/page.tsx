'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Check, X, Mail, ArrowRight, LayoutDashboard, Loader2, Play } from 'lucide-react';
import Link from 'next/link';
import { SignInModal } from '@/components/sign-in-modal';
import { UserMenu } from '@/components/user-menu';

export default function PricingPage() {
  const { data: session, status } = useSession();
  const isSignedIn = !!session?.user;
  const isLoaded = status !== 'loading';
  const [showSignIn, setShowSignIn] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      setShowSignIn(true);
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session');
        setCheckoutLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f3] dark:bg-[#050505]">
      {/* Navigation */}
      <nav className="border-b border-gray-200/60 dark:border-white/[0.06] bg-[#f8f6f3]/80 dark:bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center bg-vermillion-500 rounded-lg">
              <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
            </div>
            <span className="font-display font-semibold text-gray-900 dark:text-white hidden sm:inline tracking-tight">Transcript</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link href="/pricing" className="px-3 py-1.5 text-sm font-body font-medium text-vermillion-500">Pricing</Link>
            {isLoaded && isSignedIn && (
              <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-body text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
                <LayoutDashboard className="w-3.5 h-3.5" /><span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            {isLoaded && (
              isSignedIn ? <UserMenu /> : (
                <button onClick={() => setShowSignIn(true)} className="ml-1 px-4 py-1.5 text-sm font-medium font-body text-white bg-vermillion-500 hover:bg-vermillion-600 rounded-lg transition-all duration-200 shadow-[0_1px_2px_rgba(255,68,0,0.2)]">Sign In</button>
              )
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-16">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Simple pricing</h1>
          <p className="font-body text-gray-500 dark:text-gray-500 text-lg max-w-md mx-auto">Start free, upgrade when you need more.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
          {/* Free */}
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] p-8 flex flex-col">
            <div className="mb-8">
              <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider">Free</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="font-display text-5xl font-bold text-gray-900 dark:text-white tracking-tight">$0</span>
                <span className="font-body text-gray-400 dark:text-gray-600">/mo</span>
              </div>
              <p className="font-body text-sm text-gray-500 dark:text-gray-500 mt-2">Perfect for getting started</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[{ok:true,t:'5 transcripts per day'},{ok:true,t:'Copy & download'},{ok:true,t:'12+ languages'},{ok:false,t:'Transcript history'},{ok:false,t:'Priority support'}].map((item,i)=>(
                <li key={i} className={`flex items-center gap-3 ${item.ok?'':'opacity-40'}`}>
                  {item.ok?<Check className="w-4 h-4 text-emerald-500 flex-shrink-0"/>:<X className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0"/>}
                  <span className="font-body text-sm text-gray-700 dark:text-gray-300">{item.t}</span>
                </li>
              ))}
            </ul>
            {isSignedIn?(
              <div className="w-full py-3 text-center text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-white/[0.04] rounded-lg font-body font-medium text-sm">
                {session?.user?.subscriptionTier==='free'?'Current Plan':'Included'}
              </div>
            ):(
              <button onClick={()=>setShowSignIn(true)} className="w-full btn-secondary font-body text-sm">Get Started</button>
            )}
          </div>

          {/* Pro */}
          <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl border-2 border-vermillion-500/30 dark:border-vermillion-500/20 p-8 relative flex flex-col">
            <div className="absolute -top-3 left-6">
              <span className="bg-vermillion-500 text-white text-xs font-mono font-medium px-3 py-1 rounded-full uppercase tracking-wider">Popular</span>
            </div>
            <div className="mb-8">
              <span className="text-xs font-mono font-medium text-vermillion-500 uppercase tracking-wider">Pro</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="font-display text-5xl font-bold text-gray-900 dark:text-white tracking-tight">$10</span>
                <span className="font-body text-gray-400 dark:text-gray-600">/mo</span>
              </div>
              <p className="font-body text-sm text-gray-500 dark:text-gray-500 mt-2">For power users</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[{t:'Unlimited transcripts',b:true},{t:'Copy & download',b:false},{t:'12+ languages',b:false},{t:'Unlimited history',b:true},{t:'Priority support',b:false}].map((item,i)=>(
                <li key={i} className="flex items-center gap-3">
                  <Check className="w-4 h-4 text-vermillion-500 flex-shrink-0"/>
                  <span className={`font-body text-sm text-gray-700 dark:text-gray-300 ${item.b?'font-medium':''}`}>{item.t}</span>
                </li>
              ))}
            </ul>
            {isSignedIn && session?.user?.subscriptionTier==='pro'?(
              <div className="w-full py-3 text-center text-vermillion-500 bg-vermillion-500/8 dark:bg-vermillion-500/10 rounded-lg font-body font-medium text-sm">Current Plan</div>
            ):(
              <button onClick={handleUpgrade} disabled={checkoutLoading} className="w-full btn-primary flex items-center justify-center gap-2 font-body text-sm">
                {checkoutLoading?<Loader2 className="w-4 h-4 animate-spin"/>:(<>Upgrade to Pro<ArrowRight className="w-4 h-4"/></>)}
              </button>
            )}
          </div>
        </motion.div>

        {/* Comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white dark:bg-[#0f0f0f] rounded-2xl border border-gray-200/80 dark:border-white/[0.06] overflow-hidden mb-16">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-white/[0.04]">
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Compare plans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.04]">
                  <th className="text-left py-3 px-6 text-xs font-mono font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider">Feature</th>
                  <th className="text-center py-3 px-4 text-xs font-mono font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider">Free</th>
                  <th className="text-center py-3 px-4 text-xs font-mono font-medium text-vermillion-500 uppercase tracking-wider">Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm font-body">
                <tr className="border-b border-gray-50 dark:border-white/[0.02]">
                  <td className="py-3.5 px-6 text-gray-700 dark:text-gray-300">Daily Transcripts</td>
                  <td className="py-3.5 px-4 text-center text-gray-500 dark:text-gray-500">5</td>
                  <td className="py-3.5 px-4 text-center text-vermillion-500 font-medium">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-white/[0.02]">
                  <td className="py-3.5 px-6 text-gray-700 dark:text-gray-300">Transcript History</td>
                  <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 text-gray-300 dark:text-gray-700 mx-auto" /></td>
                  <td className="py-3.5 px-4 text-center text-vermillion-500 font-medium">Unlimited</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-white/[0.02]">
                  <td className="py-3.5 px-6 text-gray-700 dark:text-gray-300">Languages</td>
                  <td className="py-3.5 px-4 text-center text-gray-500 dark:text-gray-500">12+</td>
                  <td className="py-3.5 px-4 text-center text-gray-500 dark:text-gray-500">12+</td>
                </tr>
                <tr className="border-b border-gray-50 dark:border-white/[0.02]">
                  <td className="py-3.5 px-6 text-gray-700 dark:text-gray-300">Copy & Download</td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 text-gray-700 dark:text-gray-300">Support</td>
                  <td className="py-3.5 px-4 text-center text-gray-500 dark:text-gray-500">Community</td>
                  <td className="py-3.5 px-4 text-center text-gray-500 dark:text-gray-500">Priority</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Help */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="text-center">
          <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-2">Need help?</h2>
          <p className="font-body text-gray-500 dark:text-gray-500 mb-6 max-w-sm mx-auto">We&apos;re here to help you choose.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/dashboard"><button className="btn-secondary flex items-center gap-2 font-body text-sm">Dashboard<ArrowRight className="w-4 h-4"/></button></Link>
            <a href="mailto:support@youtubething.com"><button className="btn-primary flex items-center gap-2 font-body text-sm"><Mail className="w-4 h-4"/>Contact</button></a>
          </div>
        </motion.div>
      </div>

      <SignInModal isOpen={showSignIn} onClose={()=>setShowSignIn(false)}/>
    </div>
  );
}
