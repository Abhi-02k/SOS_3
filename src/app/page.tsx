'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import { Lock, ArrowRight, AlertCircle, Download } from 'lucide-react';

export default function StrictGoogleAuthPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    loginGoogle,
    loginGoogleDemo,
    isInstallable,
    installPwa,
  } = useAuth();

  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Automatic role-based redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
        router.push('/dashboard');
      } else {
        router.push('/mobile');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Primary: Google Sign In via Supabase OAuth
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsAuthenticating(true);
    try {
      await loginGoogle();
      // Supabase redirects to Google OAuth endpoint automatically
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth failed';
      if (
        msg.includes('provider is not enabled') ||
        msg.includes('oauth') ||
        msg.includes('fetch')
      ) {
        setErrorMsg(
          'Google Provider is not yet enabled in your Supabase Dashboard. Use the Instant Sign-In button below while setting up your Google Cloud keys!'
        );
      } else {
        setErrorMsg(msg);
      }
      setIsAuthenticating(false);
    }
  };

  // Instant 1-Click Google Test Sign-in
  const handleInstantGoogleLogin = async (email: string, name: string) => {
    setErrorMsg('');
    setIsAuthenticating(true);
    try {
      const profile = await loginGoogleDemo(email, name);
      if (profile.role === 'ADMIN' || profile.role === 'DISPATCHER') {
        router.push('/dashboard');
      } else {
        router.push('/mobile');
      }
    } catch {
      setErrorMsg('Login failed.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>Checking Authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500 selection:text-white relative overflow-hidden">
      {/* Ambient Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header with Logo & PWA Download */}
      <header className="p-4 flex items-center justify-between z-10">
        <Logo size="sm" showSubtitle={false} />
        {isInstallable && (
          <button
            onClick={installPwa}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}
      </header>

      {/* Strict Centered Google Login Box — NO FRONT PAGES */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        <div className="max-w-sm w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur text-center space-y-6">
          {/* Brand Icon */}
          <div className="flex justify-center">
            <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-400 shadow-inner">
              <Lock className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-white tracking-wide">
              SOS GUARDIAN
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sign in with Google to arm your crash beacon or access incident dispatch.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-xl flex items-start space-x-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* PRIMARY GOOGLE SIGN-IN BUTTON */}
          <div className="space-y-3 pt-1">
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-sm flex items-center justify-center space-x-3 shadow-xl hover:shadow-2xl transition-all active:scale-95 border border-slate-200 cursor-pointer"
            >
              {/* Google Multicolored "G" Vector Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>

            {/* Direct 1-Click Instant Sign-In (Bypasses Google Setup during local dev) */}
            <button
              type="button"
              onClick={() => handleInstantGoogleLogin('driver@gmail.com', 'Driver User')}
              disabled={isAuthenticating}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all cursor-pointer"
            >
              <span>Instant Sign-In with Google (Demo)</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="py-4 text-center text-[10px] text-slate-600 z-10 font-mono">
        Secured by Supabase &amp; Upstash Redis
      </footer>
    </div>
  );
}
