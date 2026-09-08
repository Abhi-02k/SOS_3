'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Radio,
  Shield,
  ShieldAlert,
  MapPin,
  Activity,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronLeft,
  Bell,
  Download,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { Emergency, EmergencyType } from '@/types/emergency';
import DynamicMobileMap from '@/components/map/DynamicMobileMap';
import Logo from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import OnboardingModal from '@/components/auth/OnboardingModal';
import {
  requestNotificationPermission,
  hasNotificationPermission,
  sendLocalNotification,
} from '@/lib/notifications';

export default function MobileEmergencyPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, isInstallable, installPwa } = useAuth();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  // Strict Login Gate
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    } else if (user && !user.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    setNotificationsGranted(hasNotificationPermission());
  }, []);

  // Device & GPS State
  const [deviceId, setDeviceId] = useState<string>('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'requesting' | 'locked' | 'denied'>('requesting');

  // Accelerometer & Monitoring State
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [motionSupported, setMotionSupported] = useState<boolean | null>(null);
  const [currentAccel, setCurrentAccel] = useState<{ x: number; y: number; z: number; mag: number }>({
    x: 0,
    y: 0,
    z: 0,
    mag: 0,
  });
  const [peakAccel, setPeakAccel] = useState<number>(0);

  // Crash Alert Overlay State
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [countdownTriggerType, setCountdownTriggerType] = useState<EmergencyType>('AUTO');

  // Active Emergency Broadcast State
  const [activeEmergency, setActiveEmergency] = useState<Emergency | null>(null);
  const [pingCount, setPingCount] = useState(0);
  const [lastPingStatus, setLastPingStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [audioMuted, setAudioMuted] = useState(false);

  // Refs for timers & listeners
  const consecutiveSpikesRef = useRef(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const beaconIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const coordsRef = useRef(coords);
  const deviceIdRef = useRef(deviceId);

  coordsRef.current = coords;
  deviceIdRef.current = deviceId;

  // Initialize or restore persistent Device ID
  useEffect(() => {
    let id = localStorage.getItem('sos_device_id');
    if (!id) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      id = `GUARDIAN-${rand}`;
      localStorage.setItem('sos_device_id', id);
    }
    setDeviceId(id);
  }, []);

  // Web Audio Alarm Synthesizer (Buzzer sound without external assets)
  const playAlarmTone = useCallback(() => {
    if (audioMuted || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context may be restricted by browser policy
    }
  }, [audioMuted]);

  // Request & Watch Geolocation on Load
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsSpeed(pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0); // convert m/s to km/h
        setGpsStatus('locked');
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        // Fallback default coordinates (e.g. San Francisco downtown) if permission denied so user can still test
        setCoords((prev) => prev || { lat: 37.7749, lng: -122.4194 });
        setGpsStatus('denied');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Send SOS API Dispatch
  const sendSos = useCallback(
    async (type: EmergencyType = 'MANUAL') => {
      // Vibrate device if supported
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([300, 150, 300, 150, 500]);
        } catch {
          // Ignored
        }
      }

      const currentPosition = coordsRef.current || { lat: 37.7749, lng: -122.4194 };
      const currentDevId = deviceIdRef.current || user?.deviceId || 'GUARDIAN-MOBILE';

      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: currentDevId,
            lat: currentPosition.lat,
            lng: currentPosition.lng,
            type,
            speed: gpsSpeed,
            accuracy: gpsAccuracy,
            userName: user?.fullName,
            userPhone: user?.phone,
            bloodGroup: user?.bloodGroup,
            medicalNotes: user?.medicalNotes,
            vehicleInfo: user?.vehicleInfo,
            emergencyContacts: user?.emergencyContacts || [],
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setActiveEmergency(data.incident);
          setPingCount(0);
          setLastPingStatus('success');
        } else {
          alert(`SOS dispatch error: ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Failed to trigger SOS:', err);
        alert('Network error communicating with emergency dispatch server.');
      }
    },
    [gpsSpeed, gpsAccuracy, user]
  );

  // Trigger 10-second crash countdown
  const startCrashCountdown = useCallback(
    (type: EmergencyType = 'AUTO') => {
      setIsCountingDown(true);
      setCountdown(10);
      setCountdownTriggerType(type);

      // Send local push notification
      sendLocalNotification(
        'VEHICULAR CRASH DETECTED!',
        'Severe impact collision detected. Emergency services & family relatives dispatching in 10s.'
      );

      // Play audio loop
      playAlarmTone();
      audioIntervalRef.current = setInterval(playAlarmTone, 1000);

      // Vibration pattern
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([500, 250, 500, 250, 1000]);
        } catch {
          // Ignored
        }
      }
    },
    [playAlarmTone]
  );

  // Countdown timer effect
  useEffect(() => {
    if (!isCountingDown) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto SOS trigger!
          clearInterval(countdownIntervalRef.current!);
          if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
          setIsCountingDown(false);
          sendSos(countdownTriggerType);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [isCountingDown, countdownTriggerType, sendSos]);

  // Cancel countdown ("I'M OK")
  const cancelCountdown = () => {
    setIsCountingDown(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    consecutiveSpikesRef.current = 0;
  };

  // Accelerometer / DeviceMotion Handler
  const handleDeviceMotion = useCallback(
    (event: DeviceMotionEvent) => {
      // Prioritize acceleration without gravity; fallback to accelerationIncludingGravity
      const accel = event.acceleration || event.accelerationIncludingGravity;
      if (!accel) return;

      const ax = accel.x || 0;
      const ay = accel.y || 0;
      let az = accel.z || 0;

      // Compensate for 1g (9.8 m/s²) if using accelerationIncludingGravity
      if (!event.acceleration && accel.z !== null) {
        az = az - 9.8;
      }

      const mag = Math.sqrt(ax * ax + ay * ay + az * az);

      setCurrentAccel({ x: ax, y: ay, z: az, mag });
      setPeakAccel((prev) => Math.max(prev, mag));

      // Check spike > 25 m/s² over 2 consecutive frames
      const CRASH_SPIKE_THRESHOLD = 25.0;

      if (mag > CRASH_SPIKE_THRESHOLD) {
        consecutiveSpikesRef.current += 1;
        if (consecutiveSpikesRef.current >= 2 && !isCountingDown && !activeEmergency) {
          consecutiveSpikesRef.current = 0;
          startCrashCountdown('AUTO');
        }
      } else {
        consecutiveSpikesRef.current = 0;
      }
    },
    [isCountingDown, activeEmergency, startCrashCountdown]
  );

  // Toggle Motion Monitoring (including iOS permission handling)
  const toggleMonitoring = async () => {
    if (isMonitoring) {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      setIsMonitoring(false);
      return;
    }

    try {
      // iOS 13+ permission request
      const motionEvent = window.DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };

      if (typeof motionEvent?.requestPermission === 'function') {
        const response = await motionEvent.requestPermission();
        if (response !== 'granted') {
          alert('Accelerometer access was denied. Automatic crash detection is inactive.');
          setMotionSupported(false);
          return;
        }
      }

      window.addEventListener('devicemotion', handleDeviceMotion);
      setIsMonitoring(true);
      setMotionSupported(true);
    } catch (err) {
      console.warn('DeviceMotion error:', err);
      // Fallback for standard environments
      window.addEventListener('devicemotion', handleDeviceMotion);
      setIsMonitoring(true);
      setMotionSupported(true);
    }
  };

  // 5-second Beaconing Loop when Emergency is active
  useEffect(() => {
    if (!activeEmergency) {
      if (beaconIntervalRef.current) clearInterval(beaconIntervalRef.current);
      return;
    }

    beaconIntervalRef.current = setInterval(async () => {
      const curPos = coordsRef.current || { lat: 37.7749, lng: -122.4194 };

      try {
        const res = await fetch('/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emergencyId: activeEmergency.emergencyId,
            lat: curPos.lat,
            lng: curPos.lng,
            speed: gpsSpeed,
            accuracy: gpsAccuracy,
          }),
        });

        if (res.ok) {
          setPingCount((c) => c + 1);
          setLastPingStatus('success');
        } else {
          setLastPingStatus('error');
        }
      } catch {
        setLastPingStatus('error');
      }
    }, 5000);

    return () => {
      if (beaconIntervalRef.current) clearInterval(beaconIntervalRef.current);
    };
  }, [activeEmergency, gpsSpeed, gpsAccuracy]);

  // End Active Emergency
  const endEmergency = async () => {
    if (!activeEmergency) return;
    try {
      const res = await fetch('/api/emergency/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyId: activeEmergency.emergencyId }),
      });

      if (res.ok) {
        setActiveEmergency(null);
        setPingCount(0);
      } else {
        alert('Could not terminate emergency beacon.');
      }
    } catch {
      alert('Network error ending emergency.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 max-w-md mx-auto relative select-none">
      {/* Confidential Client Header - NO ADMIN LINKS */}
      <header className="flex items-center justify-between py-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Link href="/" className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Logo size="sm" showSubtitle={false} />
        </div>

        <div className="flex items-center space-x-2">
          {/* Notification Permission Request */}
          <button
            onClick={async () => {
              const res = await requestNotificationPermission();
              setNotificationsGranted(res === 'granted');
            }}
            className={`p-1.5 rounded-lg border text-xs transition-all ${
              notificationsGranted
                ? 'bg-slate-900 border-slate-800 text-emerald-400'
                : 'bg-blue-950/60 border-blue-700 text-blue-300 animate-pulse'
            }`}
            title={notificationsGranted ? 'Push Alerts Active' : 'Enable Emergency Push Alerts'}
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Sound Alarm Mute */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title={audioMuted ? 'Unmute Alarms' : 'Mute Alarms'}
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* PWA Download to Device */}
          {isInstallable && (
            <button
              onClick={installPwa}
              className="p-1.5 rounded-lg bg-red-950/60 border border-red-700 text-red-200 text-xs font-bold"
              title="Install SOS Guardian as Native App"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800 text-slate-400 hover:text-red-300 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* First-time Relative & Medical Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Main Body */}
      <main className="flex-1 flex flex-col justify-around py-4 space-y-4">
        {/* Device & GPS Status Bar */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 shadow-md backdrop-blur">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400">Device:</span>
              <span className="font-mono font-bold text-slate-200">{deviceId || 'Initializing...'}</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {gpsStatus === 'locked' ? (
                  <span className="text-emerald-400 font-medium">GPS Locked ({gpsAccuracy ? `±${gpsAccuracy}m` : 'High'})</span>
                ) : gpsStatus === 'requesting' ? (
                  <span className="text-amber-400">Acquiring GPS...</span>
                ) : (
                  <span className="text-red-400">Simulation Coords</span>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Coordinates</span>
              <span className="font-mono text-slate-300">
                {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Waiting fix...'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Velocity</span>
              <span className="font-mono text-slate-300">{gpsSpeed ?? 0} km/h</span>
            </div>
          </div>
        </div>

        {/* LIVE GPS PUBLIC MAP */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>LIVE GPS RADAR MAP</span>
            </span>
            <span className="font-mono text-emerald-400 text-[10px]">OSM PUBLIC LAYER ACTIVE</span>
          </div>
          <DynamicMobileMap
            lat={coords?.lat ?? 37.7749}
            lng={coords?.lng ?? -122.4194}
            accuracy={gpsAccuracy}
            isEmergencyActive={!!activeEmergency}
          />
        </div>

        {/* ACTIVE BROADCAST BANNER (if emergency is active) */}
        {activeEmergency && (
          <div className="bg-red-950/80 border-2 border-red-600 rounded-xl p-4 shadow-xl siren-glow text-center space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Radio className="w-6 h-6 text-red-500 animate-spin" />
              <h2 className="text-lg font-black tracking-wider text-red-100 uppercase">
                EMERGENCY BEACON ACTIVE
              </h2>
            </div>

            <p className="text-xs text-red-200">
              Broadcasting real-time coordinates to emergency dispatch services every 5 seconds.
            </p>

            <div className="bg-black/50 p-2.5 rounded-lg font-mono text-xs text-left space-y-1 text-red-300">
              <div className="flex justify-between">
                <span>Incident ID:</span>
                <span className="font-bold text-white">{activeEmergency.emergencyId}</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="font-bold uppercase text-amber-300">{activeEmergency.type}</span>
              </div>
              <div className="flex justify-between">
                <span>Telemetry Pings:</span>
                <span className="font-bold text-emerald-400">{pingCount} sent</span>
              </div>
            </div>

            <button
              onClick={endEmergency}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-lg text-sm transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>TERMINATE EMERGENCY BEACON</span>
            </button>
          </div>
        )}

        {/* PRIMARY SEND SOS BUTTON */}
        {!activeEmergency && (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative flex items-center justify-center">
              {/* Pulsing Aura */}
              <div className="absolute w-56 h-56 rounded-full bg-red-600/20 radar-wave"></div>
              <div className="absolute w-56 h-56 rounded-full bg-red-600/15 radar-wave-delayed"></div>

              {/* Physical Tap Button */}
              <button
                onClick={() => sendSos('MANUAL')}
                className="relative z-10 w-48 h-48 rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-800 border-4 border-red-400 shadow-2xl flex flex-col items-center justify-center text-white active:scale-95 transition-transform duration-150 focus:outline-none focus:ring-4 focus:ring-red-500/50"
              >
                <AlertTriangle className="w-12 h-12 mb-1 text-white animate-bounce" />
                <span className="text-3xl font-black tracking-widest drop-shadow-md">SEND SOS</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-red-200 mt-1">
                  TAP FOR DISPATCH
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center max-w-xs">
              Pressing this sends your instantaneous GPS coordinates and device beacon to the dispatch control center.
            </p>
          </div>
        )}

        {/* Crash Detection & Telemetry Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-xs text-slate-200">Crash & Impact Guard</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isMonitoring
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isMonitoring ? 'MONITORING ARMED' : 'STANDBY'}
            </span>
          </div>

          {/* Acceleration G-Force Gauge */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Impact Acceleration (Threshold: 25 m/s²)</span>
              <span className="font-mono font-bold text-slate-200">
                {currentAccel.mag.toFixed(1)} m/s² (Peak: {peakAccel.toFixed(1)})
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  currentAccel.mag > 25
                    ? 'bg-red-500'
                    : currentAccel.mag > 15
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (currentAccel.mag / 30) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Monitoring Controls */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={toggleMonitoring}
              className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center space-x-1.5 transition-all ${
                isMonitoring
                  ? 'bg-red-950/40 border-red-700/60 text-red-300 hover:bg-red-900/50'
                  : 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isMonitoring ? 'STOP SENSOR' : 'START MONITORING'}</span>
            </button>

            <button
              onClick={() => startCrashCountdown('AUTO')}
              className="py-2 px-3 text-xs font-bold rounded-lg border border-amber-600/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>TEST SIMULATE CRASH</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="text-center text-[10px] text-slate-600 py-1">
        Vercel Serverless Stateless Engine • Upstash Redis Real-Time State
      </footer>

      {/* FULL-SCREEN 10-SECOND CRASH COUNTDOWN OVERLAY */}
      {isCountingDown && (
        <div className="fixed inset-0 z-50 bg-red-950/95 flex flex-col items-center justify-between p-6 siren-glow backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div className="text-center pt-8 space-y-2">
            <div className="inline-flex p-3 rounded-full bg-red-600 text-white animate-bounce">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-black tracking-wider text-white">CRASH DETECTED!</h1>
            <p className="text-sm text-red-200 font-medium">
              High impact collision force detected. Calling emergency services in:
            </p>
          </div>

          {/* Large Circular Countdown Display */}
          <div className="relative flex items-center justify-center my-4">
            <div className="w-48 h-48 rounded-full border-8 border-red-500/40 flex items-center justify-center">
              <span className="font-mono text-7xl font-black text-white tracking-tighter animate-pulse">
                {countdown}
              </span>
            </div>
          </div>

          {/* Tactile "I'M OK" Button */}
          <div className="w-full space-y-3 pb-8">
            <button
              onClick={cancelCountdown}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 border-2 border-emerald-400 text-white font-black text-2xl rounded-2xl shadow-2xl transition-transform flex items-center justify-center space-x-3"
            >
              <CheckCircle2 className="w-8 h-8" />
              <span>I&apos;M OK — CANCEL SOS</span>
            </button>

            <button
              onClick={() => {
                cancelCountdown();
                sendSos('AUTO');
              }}
              className="w-full py-3 bg-red-800 hover:bg-red-700 text-red-100 font-bold text-sm rounded-xl border border-red-600"
            >
              DISPATCH NOW (DON&apos;T WAIT)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
