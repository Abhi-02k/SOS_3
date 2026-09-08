'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Radio,
  Smartphone,
  MapPin,
  Activity,
  Layers,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import Image from 'next/image';

export default function HomePage() {
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/emergencies')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.emergencies)) {
          setActiveCount(data.emergencies.length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Logo size="md" showSubtitle={false} />
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
              v1.0 Sentinel
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400">Status:</span>
              <span className="text-white font-bold">
                {activeCount !== null ? `${activeCount} Active` : 'Online'}
              </span>
            </div>

            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-red-900/40 transition-all active:scale-95"
            >
              Open Dispatch
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/50 text-red-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-red-400" />
            <span>Real-Time Vehicular Crash Detection & Beacon Network</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Autonomous Emergency Telemetry & Dispatch
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Stateless Vercel-ready architecture engineered for zero latency. Monitors vehicular G-force spikes, triggers automated SOS dispatches, and streams live telemetry to mission-control radar maps.
          </p>
        </div>

        {/* Dual Portal Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full mt-10">
          {/* Mobile Client Portal */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-all"></div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-red-950/60 border border-red-800/50 text-red-400 rounded-xl">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
                  CLIENT / DRIVER
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">Mobile Emergency Beacon</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Mobile-first interface with DeviceMotion accelerometer crash detection (&gt;25 m/s²), 10s countdown safety overlay, test crash simulator, and 5-second GPS beaconing loop.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Accelerometer vector spike analysis (iOS & Android)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>10-Second audio alarm & haptic warning override</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Continuous high-precision GPS coordinate stream</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 relative z-10">
              <Link
                href="/mobile"
                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-red-950 transition-all active:scale-95"
              >
                <span>Launch Mobile Beacon</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Dispatch Command Center Portal */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all relative overflow-hidden group shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl group-hover:bg-blue-600/20 transition-all"></div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-950/60 border border-blue-800/50 text-blue-400 rounded-xl">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md">
                  DISPATCH / HQ
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">Mission Dispatch Command</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Desktop control room rendering dynamic Leaflet Dark Matter radar tiles, pulsating incident markers, telemetry popups, audio chimes, and 2-second live Redis synchronization.
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Leaflet CartoDB Dark Matter tiles (SSR-safe dynamic import)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time polling engine with auto-pan & zoom controls</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Incident triage, filtering, and instant remote resolution</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 relative z-10">
              <Link
                href="/dashboard"
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl border border-slate-700 flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95"
              >
                <span>Launch Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Security & Architecture Highlights */}
        <div className="mt-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 max-w-4xl mx-auto w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-white block">Secured Stateless Architecture</span>
                <span className="text-slate-400">
                  Strict input sanitization, coordinate bounds validation, rate limiting, and server-side secret isolation.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Next.js 16</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Upstash Redis</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Supabase</span>
              <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">Leaflet</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        SOS Guardian • High-Reliability Emergency Telemetry System
      </footer>
    </div>
  );
}
