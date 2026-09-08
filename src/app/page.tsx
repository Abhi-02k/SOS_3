'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import FooterCredit from '@/components/ui/FooterCredit';
import {
  Lock,
  AlertCircle,
  Download,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export default function StrictGoogleAuthPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    loginGoogle,
    logout,
    isInstallable,
    installPwa,
  } = useAuth();

  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Post-login route director based on role
  const directUserByRole = (profile: { role: string; onboardingCompleted?: boolean }) => {
    if (profile.role === 'ADMIN' || profile.role === 'DISPATCHER') {
      router.push('/dashboard');
    } else if (!profile.onboardingCompleted) {
      router.push('/onboarding');
    } else {
      router.push('/mobile');
    }
  };

  // Primary: Real Google Sign In via Supabase OAuth
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsAuthenticating(true);
    try {
      await loginGoogle();
      // Supabase redirects to Google OAuth endpoint automatically
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth failed';
      setErrorMsg(msg);
      setIsAuthenticating(false);
    }
  };

  if (isLoading || !isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>Loading Client Authentication Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500 selection:text-white relative overflow-hidden">
      {/* Ambient Tactical Backdrop Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header with Logo & PWA Download */}
      <header className="p-4 flex items-center justify-between z-10 border-b border-slate-900/60">
        <Logo size="sm" showSubtitle={false} />
        {isInstallable && (
          <button
            onClick={installPwa}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        )}
      </header>

      {/* Strict Centered Login Box — NO DEMOS OR MARKETING FLUFF */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 my-6">
        <div className="max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur text-center space-y-6 animate-in zoom-in-95 duration-200">
          {/* Glowing Lock Badge */}
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-400 shadow-inner">
              <Lock className="w-8 h-8 text-red-500 animate-pulse" />
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold tracking-widest text-red-400 uppercase bg-red-950/70 border border-red-800/60 px-2.5 py-0.5 rounded-full inline-block">
              Client &amp; Responder Access
            </span>
            <h1 className="text-2xl font-black text-white tracking-wide">
              SOS GUARDIAN
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Sign in with Google to arm your vehicle crash beacon. Authorized dispatch personnel will be routed directly to the Command Center.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-xl flex items-start space-x-2 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Active Session Card (if already authenticated) */}
          {isAuthenticated && user && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">
                  Active User Session
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    user.role === 'ADMIN'
                      ? 'bg-red-950 border-red-700 text-red-300'
                      : user.role === 'DISPATCHER'
                      ? 'bg-amber-950 border-amber-700 text-amber-300'
                      : 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-red-950 border border-red-700 flex items-center justify-center text-red-300 font-bold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="truncate flex-1">
                  <div className="text-sm font-bold text-white truncate">{user.fullName}</div>
                  <div className="text-xs text-slate-400 font-mono truncate">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => directUserByRole(user)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer"
                >
                  <span>
                    {user.role === 'ADMIN' || user.role === 'DISPATCHER'
                      ? 'Enter Command Dashboard'
                      : 'Enter Mobile Client Beacon'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="p-2.5 rounded-lg bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PRIMARY REAL GOOGLE SIGN-IN BUTTON */}
          <div className="pt-1">
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-bold rounded-xl text-sm flex items-center justify-center space-x-3 shadow-xl hover:shadow-2xl transition-all active:scale-98 border border-slate-200 cursor-pointer"
            >
              {/* Google Multicolored "G" Vector Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{isAuthenticating ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Tamper-Proof Persistent Security & Author Credit Footer */}
      <FooterCredit showStatus />
    </div>
  );
}
