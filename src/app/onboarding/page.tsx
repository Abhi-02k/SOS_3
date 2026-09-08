'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import FooterCredit from '@/components/ui/FooterCredit';
import { EmergencyContact } from '@/types/auth';
import {
  ShieldCheck,
  Heart,
  Users,
  Phone,
  Car,
  Bell,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Save,
  Lock,
} from 'lucide-react';
import {
  requestNotificationPermission,
  hasNotificationPermission,
} from '@/lib/notifications';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Primary Contact
  const [contact1Name, setContact1Name] = useState('');
  const [contact1Relation, setContact1Relation] = useState('Spouse');
  const [contact1Phone, setContact1Phone] = useState('');

  // Secondary Contact
  const [contact2Name, setContact2Name] = useState('');
  const [contact2Relation, setContact2Relation] = useState('Parent');
  const [contact2Phone, setContact2Phone] = useState('');

  // Permissions state
  const [gpsGranted, setGpsGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setNotifGranted(hasNotificationPermission());

    // Check GPS status
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsGranted(true),
        () => setGpsGranted(false),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Strict Authentication & Gatekeeper
  useEffect(() => {
    if (!isLoading && isMounted) {
      if (!isAuthenticated || !user) {
        const t = setTimeout(() => router.push('/'), 10);
        return () => clearTimeout(t);
      } else if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
        const t = setTimeout(() => router.push('/dashboard'), 10);
        return () => clearTimeout(t);
      } else if (user.onboardingCompleted) {
        const t = setTimeout(() => router.push('/mobile'), 10);
        return () => clearTimeout(t);
      } else {
        // Pre-fill existing fields if available
        if (user.phone) setPhone(user.phone);
        if (user.bloodGroup) setBloodGroup(user.bloodGroup);
        if (user.vehicleInfo) setVehicleInfo(user.vehicleInfo);
        if (user.medicalNotes) setMedicalNotes(user.medicalNotes);
        if (user.emergencyContacts && user.emergencyContacts.length > 0) {
          setContact1Name(user.emergencyContacts[0].name);
          setContact1Relation(user.emergencyContacts[0].relationship);
          setContact1Phone(user.emergencyContacts[0].phone);
          if (user.emergencyContacts.length > 1) {
            setContact2Name(user.emergencyContacts[1].name);
            setContact2Relation(user.emergencyContacts[1].relationship);
            setContact2Phone(user.emergencyContacts[1].phone);
          }
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router, isMounted]);

  const handleRequestGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsGranted(true),
        () => {
          alert('Please allow Location access in your browser to enable live crash telemetry.');
          setGpsGranted(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleRequestNotification = async () => {
    const res = await requestNotificationPermission();
    setNotifGranted(res === 'granted');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone.trim()) {
      setErrorMsg('Please provide your mobile phone number for emergency contact.');
      setStep(1);
      return;
    }

    if (!contact1Name.trim() || !contact1Phone.trim()) {
      setErrorMsg('Please specify at least one family emergency contact with their phone number.');
      setStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const contacts: EmergencyContact[] = [
        {
          name: contact1Name.trim(),
          relationship: contact1Relation.trim(),
          phone: contact1Phone.trim(),
        },
      ];

      if (contact2Name.trim() && contact2Phone.trim()) {
        contacts.push({
          name: contact2Name.trim(),
          relationship: contact2Relation.trim(),
          phone: contact2Phone.trim(),
        });
      }

      await updateProfile({
        phone: phone.trim(),
        bloodGroup,
        vehicleInfo: vehicleInfo.trim() || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
        emergencyContacts: contacts,
        onboardingCompleted: true,
      });

      // Routed straight to Mobile Emergency Beacon
      router.push('/mobile');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete setup';
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  if (isLoading || !isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>Loading Onboarding Security Gateway...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500 selection:text-white relative overflow-hidden">
      {/* Ambient Red/Cyan glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Bar */}
      <header className="p-4 border-b border-slate-900 flex items-center justify-between z-10">
        <Logo size="sm" showSubtitle={false} />
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted First-Responder Registration</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 my-4">
        <div className="max-w-xl w-full bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-2 border-b border-slate-800 pb-5">
            <div className="inline-flex p-3 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-500 shadow-inner">
              <ShieldCheck className="w-8 h-8 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              DRIVER &amp; EMERGENCY ONBOARDING
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              When a vehicular crash or SOS trigger occurs, these vital details and family contacts are transmitted immediately to emergency dispatchers.
            </p>
          </div>

          {/* User Account Verification Badge */}
          {user && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-red-950 border border-red-700/50 flex items-center justify-center text-red-400 font-bold shrink-0">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-white font-semibold truncate">{user.fullName}</div>
                  <div className="text-slate-400 text-[11px] truncate font-mono">{user.email}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold shrink-0">
                Google Verified
              </span>
            </div>
          )}

          {/* Stepper Navigation */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                step === 1
                  ? 'bg-red-950/70 border-red-700 text-red-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>1. Medical &amp; Vehicle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!phone.trim()) {
                  setErrorMsg('Please enter your mobile phone number before proceeding.');
                  return;
                }
                setErrorMsg('');
                setStep(2);
              }}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                step === 2
                  ? 'bg-red-950/70 border-red-700 text-red-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Family Contacts</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Driver Phone & Blood Group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Your Mobile Phone <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Blood Group <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="O+">O+ (Universal Donor)</option>
                      <option value="O-">O- (Universal Red Cell)</option>
                      <option value="A+">A+ (Positive)</option>
                      <option value="A-">A- (Negative)</option>
                      <option value="B+">B+ (Positive)</option>
                      <option value="B-">B- (Negative)</option>
                      <option value="AB+">AB+ (Universal Plasma)</option>
                      <option value="AB-">AB- (Negative)</option>
                    </select>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Vehicle Model &amp; License Plate (Optional)
                  </label>
                  <div className="relative">
                    <Car className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. White Tesla Model 3 (Plate: 8ABC123)"
                      value={vehicleInfo}
                      onChange={(e) => setVehicleInfo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Allergies or Medical Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Medical Notes &amp; Allergies (For Paramedics)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Severe Penicillin allergy, Type 1 Diabetic, Asthma..."
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                  ></textarea>
                </div>

                {/* Permission checks */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>GPS Radar</span>
                    </div>
                    {gpsGranted ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestGps}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-bold"
                      >
                        Grant
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                      <Bell className="w-3.5 h-3.5 text-blue-400" />
                      <span>Push Alert</span>
                    </div>
                    {notifGranted ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestNotification}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-bold"
                      >
                        Grant
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!phone.trim()) {
                      setErrorMsg('Please enter your mobile phone number before continuing.');
                      return;
                    }
                    setErrorMsg('');
                    setStep(2);
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg active:scale-98"
                >
                  <span>Continue to Family Relative Contacts</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Primary Family Contact */}
                <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-red-300 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" />
                    <span>Primary Family Contact (First to Call) *</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Relative Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jane Vance"
                        value={contact1Name}
                        onChange={(e) => setContact1Name(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Relationship</label>
                      <select
                        value={contact1Relation}
                        onChange={(e) => setContact1Relation(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="Spouse">Spouse / Partner</option>
                        <option value="Parent">Mother / Father</option>
                        <option value="Sibling">Brother / Sister</option>
                        <option value="Child">Son / Daughter</option>
                        <option value="Friend">Emergency Contact / Friend</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Relative Mobile Phone <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 987-6543"
                      value={contact1Phone}
                      onChange={(e) => setContact1Phone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Secondary Optional Contact */}
                <div className="space-y-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Secondary Family Contact (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Relative Name"
                      value={contact2Name}
                      onChange={(e) => setContact2Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-slate-600"
                    />
                    <select
                      value={contact2Relation}
                      onChange={(e) => setContact2Relation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-slate-600"
                    >
                      <option value="Parent">Mother / Father</option>
                      <option value="Spouse">Spouse / Partner</option>
                      <option value="Sibling">Brother / Sister</option>
                      <option value="Child">Son / Daughter</option>
                      <option value="Friend">Emergency Contact / Friend</option>
                    </select>
                  </div>

                  <input
                    type="tel"
                    placeholder="Relative Mobile Phone"
                    value={contact2Phone}
                    onChange={(e) => setContact2Phone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer active:scale-98"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Arming Beacon...' : 'Arm Beacon & Finish Setup'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Tamper-Proof Persistent Security & Author Credit Footer */}
      <FooterCredit showStatus />
    </div>
  );
}
