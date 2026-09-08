'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import DynamicMap from '@/components/map/DynamicMap';
import { Emergency, EmergencyType } from '@/types/emergency';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  Clock,
  Compass,
  CheckCircle,
  ExternalLink,
  Volume2,
  VolumeX,
  RefreshCw,
  PlusCircle,
  Activity,
  ChevronRight,
  MapPin,
  Flame,
  Users,
  LogOut,
  Phone,
  Heart,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';
import FooterCredit from '@/components/ui/FooterCredit';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DispatchDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Strict Dispatcher & Admin security guard
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const t = setTimeout(() => router.push('/'), 10);
        return () => clearTimeout(t);
      } else if (user?.role === 'CITIZEN') {
        const t = setTimeout(() => router.push('/mobile'), 10);
        return () => clearTimeout(t);
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'AUTO' | 'MANUAL'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const prevEmergencyCountRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio synthesizer chime for newly arrived emergencies
  const playAlertChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio might require initial user interaction
    }
  }, [soundEnabled]);

  // Polling loop: fetch emergencies every 2 seconds
  const fetchEmergencies = useCallback(async () => {
    try {
      const res = await fetch('/api/emergencies', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const list: Emergency[] = data.emergencies || [];

      // Check if count increased -> trigger chime
      if (list.length > prevEmergencyCountRef.current && prevEmergencyCountRef.current !== 0) {
        playAlertChime();
      }
      prevEmergencyCountRef.current = list.length;

      setEmergencies(list);
      setLastUpdated(new Date());

      // If selected emergency was removed, deselect
      if (selectedId && !list.some((e) => e.emergencyId === selectedId)) {
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Error fetching emergencies:', err);
    }
  }, [selectedId, playAlertChime]);

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 2000);
    return () => clearInterval(interval);
  }, [fetchEmergencies]);

  // End an emergency from dashboard
  const handleEndEmergency = async (id: string) => {
    try {
      const res = await fetch('/api/emergency/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyId: id }),
      });

      if (res.ok) {
        setEmergencies((prev) => prev.filter((e) => e.emergencyId !== id));
        if (selectedId === id) setSelectedId(null);
      }
    } catch (err) {
      console.error('Failed to end emergency:', err);
    }
  };

  // Filtered incidents
  const filteredEmergencies = emergencies.filter((e) => {
    if (filter === 'AUTO') return e.type === 'AUTO';
    if (filter === 'MANUAL') return e.type === 'MANUAL';
    return true;
  });

  const autoCount = emergencies.filter((e) => e.type === 'AUTO').length;
  const manualCount = emergencies.filter((e) => e.type === 'MANUAL').length;

  if (isLoading || !isAuthenticated || user?.role === 'CITIZEN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>Verifying Command Dispatch Authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Mission Control Bar */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Logo size="sm" showSubtitle={false} />
            <span className="text-[11px] font-mono font-normal text-slate-400 border border-slate-700 bg-slate-800 px-2 py-0.5 rounded">
              DISPATCH COMMAND
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-slate-800 text-xs">
            <span className="flex items-center space-x-1 text-emerald-400 font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>LIVE 2S TELEMETRY</span>
            </span>
            <span className="text-slate-600">•</span>
            <span suppressHydrationWarning className="font-mono text-slate-400">CLOCK {isMounted && currentTime ? currentTime : '--:--:--'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition-all"
            title={soundEnabled ? 'Mute Alert Chime' : 'Unmute Alert Chime'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Admin User Management */}
          <Link
            href="/admin/users"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Manage Responders, Citizens, and User Roles"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Personnel Roster</span>
          </Link>

          {/* Staff Profile Chip */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-200 font-bold max-w-[120px] truncate">{user?.fullName || 'Staff'}</span>
            <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-red-300 border border-slate-700">
              {user?.role || 'ADMIN'}
            </span>
          </div>

          {/* Sign Out */}
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 border border-slate-700 hover:border-red-800 text-slate-400 hover:text-red-300 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace: Sidebar + Map */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Map taking up primary viewport */}
        <div className="flex-1 h-[55vh] md:h-full relative order-2 md:order-1">
          <DynamicMap
            emergencies={filteredEmergencies}
            selectedId={selectedId}
            onSelectEmergency={(id) => setSelectedId(id)}
            onEndEmergency={handleEndEmergency}
          />

          {/* Floating Map Legend & Stats Overlay */}
          <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs space-y-2 shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between space-x-4">
              <span className="font-bold text-slate-300">ACTIVE EMERGENCIES</span>
              <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-red-600 text-white text-[11px]">
                {emergencies.length}
              </span>
            </div>
            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                <span>Crash Detected (AUTO): <strong className="text-white">{autoCount}</strong></span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
                <span>Manual SOS Beacon: <strong className="text-white">{manualCount}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Incident Command List */}
        <aside className="w-full md:w-96 h-[45vh] md:h-full bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col order-1 md:order-2 z-20 shadow-2xl">
          {/* Sidebar Header & Filters */}
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Active Incidents Queue
              </span>
              <span suppressHydrationWarning className="text-[10px] font-mono text-slate-500">
                Updated {isMounted && lastUpdated ? lastUpdated.toLocaleTimeString() : 'Syncing...'}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`py-1 rounded font-semibold transition-colors ${
                  filter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({emergencies.length})
              </button>
              <button
                onClick={() => setFilter('AUTO')}
                className={`py-1 rounded font-semibold transition-colors ${
                  filter === 'AUTO'
                    ? 'bg-red-950 text-red-200 border border-red-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-red-400'
                }`}
              >
                Crash ({autoCount})
              </button>
              <button
                onClick={() => setFilter('MANUAL')}
                className={`py-1 rounded font-semibold transition-colors ${
                  filter === 'MANUAL'
                    ? 'bg-amber-950 text-amber-200 border border-amber-800/60 shadow-sm'
                    : 'text-slate-400 hover:text-amber-400'
                }`}
              >
                SOS ({manualCount})
              </button>
            </div>
          </div>

          {/* Scrollable Incident Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
            {filteredEmergencies.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500/50" />
                <div>
                  <h3 className="text-sm font-bold text-slate-300">All Sectors Clear</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No active emergency beacons or crash impacts detected across the network.
                  </p>
                </div>
              </div>
            ) : (
              filteredEmergencies.map((incident) => {
                const isSelected = incident.emergencyId === selectedId;
                const isAuto = incident.type === 'AUTO';
                const timeAgo = Math.max(
                  0,
                  Math.round((Date.now() - incident.timestamp) / 1000)
                );

                return (
                  <div
                    key={incident.emergencyId}
                    onClick={() => setSelectedId(incident.emergencyId)}
                    className={`pt-2.5 first:pt-0 cursor-pointer transition-all`}
                  >
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-slate-800/90 border-blue-500 ring-1 ring-blue-500/50 shadow-lg'
                          : isAuto
                          ? 'bg-red-950/20 border-red-900/40 hover:bg-red-950/40'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Badge & Timestamp Header */}
                      <div className="flex items-center justify-between pb-2">
                        <span
                          className={`inline-flex items-center space-x-1 text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isAuto
                              ? 'bg-red-900 text-red-200 border border-red-700'
                              : 'bg-amber-900 text-amber-200 border border-amber-700'
                          }`}
                        >
                          {isAuto ? (
                            <ShieldAlert className="w-3 h-3 text-red-300" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-amber-300" />
                          )}
                          <span>{isAuto ? 'AUTO IMPACT' : 'MANUAL SOS'}</span>
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{timeAgo}s ago</span>
                        </span>
                      </div>

                      {/* Device & Coords */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">
                            {incident.deviceId}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {incident.emergencyId.substring(0, 16)}...
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 text-slate-400 text-[11px] font-mono">
                          <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                          <span>
                            {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                          </span>
                          {incident.speed ? (
                            <span className="text-slate-300 font-semibold pl-2">
                              • {incident.speed} km/h
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Driver Profile, Blood Group & Medical Notes */}
                      {incident.userName && (
                        <div className="pt-2 border-t border-slate-800/80 mt-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{incident.userName}</span>
                            {incident.bloodGroup && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-950 text-red-300 border border-red-800">
                                {incident.bloodGroup}
                              </span>
                            )}
                          </div>
                          {incident.userPhone && (
                            <a
                              href={`tel:${incident.userPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-400 hover:underline text-[11px] block font-mono"
                            >
                              📞 Driver: {incident.userPhone}
                            </a>
                          )}
                          {incident.vehicleInfo && (
                            <div className="text-[10px] text-slate-400">Car: {incident.vehicleInfo}</div>
                          )}
                          {incident.medicalNotes && (
                            <div className="text-[10px] text-amber-300 italic">Medical: {incident.medicalNotes}</div>
                          )}
                        </div>
                      )}

                      {/* Family Emergency Contacts with Quick Dial */}
                      {incident.emergencyContacts && incident.emergencyContacts.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-800/60 mt-1.5 space-y-1">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Emergency Family Relatives:</div>
                          {incident.emergencyContacts.map((c, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-950/80 p-1.5 rounded border border-slate-800 text-[11px]">
                              <div>
                                <span className="font-bold text-white block">{c.name}</span>
                                <span className="text-[9px] text-slate-400">({c.relationship})</span>
                              </div>
                              <a
                                href={`tel:${c.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded text-[10px] font-bold"
                              >
                                Call: {c.phone}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 pt-3 border-t border-slate-800/60 mt-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(incident.emergencyId);
                          }}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center space-x-1 transition-all"
                        >
                          <Compass className="w-3 h-3 text-blue-400" />
                          <span>Locate</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEndEmergency(incident.emergencyId);
                          }}
                          className="flex-1 py-1.5 bg-red-950/50 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>Resolve</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {/* Tamper-Proof Persistent Security & Author Credit Footer */}
      <FooterCredit className="py-2 shrink-0 border-t border-slate-800" showStatus />
    </div>
  );
}
