'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/auth';
import Logo from '@/components/ui/Logo';
import {
  ShieldAlert,
  Radio,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Download,
  KeyRound,
  Zap,
} from 'lucide-react';

export default function RootAuthGatePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login, register, isInstallable, installPwa } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('CITIZEN');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatic redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
        router.push('/dashboard');
      } else {
        router.push('/mobile');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!email || !fullName) {
          setErrorMsg('Please provide your name and email address.');
          setIsSubmitting(false);
          return;
        }
        const profile = await register(email, fullName, role, phone);
        if (profile.role === 'ADMIN' || profile.role === 'DISPATCHER') {
          router.push('/dashboard');
        } else {
          router.push('/mobile');
        }
      } else {
        if (!email) {
          setErrorMsg('Please enter your email.');
          setIsSubmitting(false);
          return;
        }
        const profile = await login(email, role);
        if (profile.role === 'ADMIN' || profile.role === 'DISPATCHER') {
          router.push('/dashboard');
        } else {
          router.push('/mobile');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick 1-Click Demo Logins for Instant Testing
  const handleQuickLogin = async (demoRole: UserRole) => {
    setIsSubmitting(true);
    try {
      if (demoRole === 'ADMIN') {
        const profile = await login('admin@guardian.sos', 'ADMIN');
        router.push('/dashboard');
      } else {
        const profile = await login('driver@guardian.sos', 'CITIZEN');
        router.push('/mobile');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>Verifying Secure Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500 selection:text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-4 flex items-center justify-between z-20">
        <Logo size="md" showSubtitle={true} />

        {isInstallable && (
          <button
            onClick={installPwa}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install PWA App</span>
          </button>
        )}
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur space-y-6">
          {/* Headline */}
          <div className="text-center space-y-1">
            <div className="inline-flex p-2.5 rounded-xl bg-red-950/60 border border-red-800/50 text-red-400 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              {mode === 'login' ? 'SECURE ACCESS' : 'ENROLL AS RESPONDER'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'login'
                ? 'Sign in once to arm your emergency beacon and crash monitor.'
                : 'Register your device for real-time vehicular crash detection and dispatch.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl text-xs font-bold border border-slate-800">
            <button
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              New Citizen / Device
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'signup' && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="name@guardian.sos"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            {/* Discrete Portal Access Toggle */}
            <div className="pt-1">
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                Portal Security Scope
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-red-500"
              >
                <option value="CITIZEN">Citizen / Mobile Vehicle Driver</option>
                <option value="DISPATCHER">Command Dispatcher Officer</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-red-950 transition-all active:scale-95"
            >
              <span>{isSubmitting ? 'Authenticating...' : mode === 'login' ? 'Arm & Enter' : 'Complete Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Fast Demo Buttons */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block text-center">
              Quick Test Access (1-Click)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('CITIZEN')}
                disabled={isSubmitting}
                className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>Citizen Mobile</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                disabled={isSubmitting}
                className="py-2 px-2.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
              >
                <Radio className="w-3.5 h-3.5 text-red-400" />
                <span>Staff Dispatch</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 z-10">
        SOS Guardian • High-Security Emergency Telemetry Network
      </footer>
    </div>
  );
}
