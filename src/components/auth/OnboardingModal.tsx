'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { EmergencyContact, UserProfile } from '@/types/auth';
import {
  ShieldCheck,
  Heart,
  Users,
  Phone,
  Car,
  Bell,
  MapPin,
  Save,
  ArrowRight,
} from 'lucide-react';
import { requestNotificationPermission } from '@/lib/notifications';

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { user } = useAuth();

  const [phone, setPhone] = useState(user?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [medicalNotes, setMedicalNotes] = useState(user?.medicalNotes || '');
  const [vehicleInfo, setVehicleInfo] = useState(user?.vehicleInfo || '');

  // Emergency Contacts
  const [contact1Name, setContact1Name] = useState(user?.emergencyContacts?.[0]?.name || '');
  const [contact1Relation, setContact1Relation] = useState(user?.emergencyContacts?.[0]?.relationship || 'Spouse');
  const [contact1Phone, setContact1Phone] = useState(user?.emergencyContacts?.[0]?.phone || '');

  const [contact2Name, setContact2Name] = useState(user?.emergencyContacts?.[1]?.name || '');
  const [contact2Relation, setContact2Relation] = useState(user?.emergencyContacts?.[1]?.relationship || 'Parent');
  const [contact2Phone, setContact2Phone] = useState(user?.emergencyContacts?.[1]?.phone || '');

  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isSaving, setIsSaving] = useState(false);

  const handleAskNotifications = async () => {
    const res = await requestNotificationPermission();
    if (res === 'granted') setNotificationsGranted(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact1Name || !contact1Phone) {
      alert('Please provide at least one emergency family contact so first responders can reach your relatives.');
      return;
    }

    setIsSaving(true);
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

    const updatedUser: UserProfile = {
      ...(user || {
        id: `usr_${Date.now()}`,
        email: 'user@guardian.sos',
        fullName: 'Citizen Responder',
        role: 'CITIZEN',
        createdAt: new Date().toISOString(),
      }),
      phone: phone.trim(),
      bloodGroup,
      medicalNotes: medicalNotes.trim(),
      vehicleInfo: vehicleInfo.trim(),
      emergencyContacts: contacts,
      onboardingCompleted: true,
    };

    // Save to localStorage session
    localStorage.setItem('sos_guardian_auth_session', JSON.stringify({ user: updatedUser }));
    // Save to profiles list
    const raw = localStorage.getItem('sos_guardian_local_profiles');
    const list: UserProfile[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((p) => p.email.toLowerCase() === updatedUser.email.toLowerCase());
    if (idx >= 0) list[idx] = updatedUser;
    else list.push(updatedUser);
    localStorage.setItem('sos_guardian_local_profiles', JSON.stringify(list));

    // Sync to API
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });
    } catch {
      // Ignored
    }

    setIsSaving(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-4">
          <div className="inline-flex p-3 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-500">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            EMERGENCY PROFILE & RELATIVE SETUP
          </h2>
          <p className="text-xs text-slate-400">
            In the event of a crash or SOS trigger, these details and family contacts are instantly dispatched to the emergency command center.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300 pb-1 border-b border-slate-800/60">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Driver & Medical Information</span>
              </div>

              {/* Phone & Blood Group */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Your Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="A+">A+ (Positive)</option>
                    <option value="A-">A- (Negative)</option>
                    <option value="B+">B+ (Positive)</option>
                    <option value="B-">B- (Negative)</option>
                    <option value="O+">O+ (Positive)</option>
                    <option value="O-">O- (Negative)</option>
                    <option value="AB+">AB+ (Positive)</option>
                    <option value="AB-">AB- (Negative)</option>
                  </select>
                </div>
              </div>

              {/* Vehicle info */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Vehicle Make / Plate (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Tesla Model 3 (Plate: 8ABC123) or Honda Civic"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Medical Allergies */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Allergies or Medical Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Penicillin allergy, Diabetic, Asthma..."
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                ></textarea>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all"
              >
                <span>Continue to Family Relative Contacts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300 pb-1 border-b border-slate-800/60">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Primary Family Emergency Contact</span>
              </div>

              {/* Contact 1 */}
              <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Relative Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Vance"
                      value={contact1Name}
                      onChange={(e) => setContact1Name(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Relationship</label>
                    <select
                      value={contact1Relation}
                      onChange={(e) => setContact1Relation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Spouse">Spouse / Partner</option>
                      <option value="Parent">Mother / Father</option>
                      <option value="Sibling">Brother / Sister</option>
                      <option value="Child">Son / Daughter</option>
                      <option value="Friend">Close Friend / Relative</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Relative Contact Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 123-4567"
                    value={contact1Phone}
                    onChange={(e) => setContact1Phone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Secondary Optional Contact */}
              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block">Secondary Contact (Optional)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={contact2Name}
                    onChange={(e) => setContact2Name(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={contact2Phone}
                    onChange={(e) => setContact2Phone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Push Alert Permission prompt */}
              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <Bell className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Browser Emergency Push Alerts</span>
                </div>
                <button
                  type="button"
                  onClick={handleAskNotifications}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    notificationsGranted
                      ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                      : 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white'
                  }`}
                >
                  {notificationsGranted ? 'Enabled' : 'Enable'}
                </button>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Arm Beacon & Finish Setup'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
