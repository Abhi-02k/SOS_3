'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types/auth';
import {
  getStoredSession,
  saveStoredSession,
  clearStoredSession,
  loginWithEmail,
  registerUser,
  signInWithGoogle,
  loginWithGoogleMock,
  updateUserProfile,
  getLocalProfiles,
  saveLocalProfiles,
} from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<UserProfile>;
  register: (email: string, fullName: string, role: UserRole, phone?: string) => Promise<UserProfile>;
  loginGoogle: () => Promise<void>;
  loginGoogleDemo: (email: string, name?: string) => Promise<UserProfile>;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => void;
  isInstallable: boolean;
  installPwa: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Sync Supabase Auth User with App Profile
  const syncSupabaseUser = useCallback(async (sbUser: any) => {
    if (!sbUser || !sbUser.email) return;
    const cleanEmail = sbUser.email.trim().toLowerCase();
    const profiles = getLocalProfiles();
    const found = profiles.find((p) => p.email.toLowerCase() === cleanEmail);

    let assignedRole: UserRole = 'CITIZEN';
    if (found) {
      assignedRole = found.role;
    } else if (cleanEmail.includes('admin')) {
      assignedRole = 'ADMIN';
    } else if (cleanEmail.includes('dispatch')) {
      assignedRole = 'DISPATCHER';
    }

    const resolvedUser: UserProfile = {
      id: sbUser.id || found?.id || `usr_${Date.now()}`,
      email: cleanEmail,
      fullName:
        sbUser.user_metadata?.full_name ||
        sbUser.user_metadata?.name ||
        found?.fullName ||
        cleanEmail.split('@')[0],
      avatarUrl: sbUser.user_metadata?.avatar_url || found?.avatarUrl,
      role: assignedRole,
      phone: found?.phone,
      deviceId: found?.deviceId || `DEV-G-${Math.floor(1000 + Math.random() * 9000)}`,
      bloodGroup: found?.bloodGroup,
      medicalNotes: found?.medicalNotes,
      vehicleInfo: found?.vehicleInfo,
      emergencyContacts: found?.emergencyContacts || [],
      onboardingCompleted: assignedRole !== 'CITIZEN' ? true : Boolean(found?.onboardingCompleted),
      createdAt: found?.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    saveStoredSession({ user: resolvedUser, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });
    setUser(resolvedUser);

    // Save to local cache & sync to DB
    const idx = profiles.findIndex((p) => p.id === resolvedUser.id || p.email.toLowerCase() === cleanEmail);
    if (idx >= 0) profiles[idx] = resolvedUser;
    else profiles.push(resolvedUser);
    saveLocalProfiles(profiles);

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolvedUser),
      });
    } catch {}
  }, []);

  // Restore one-time persistent session on initial mount
  useEffect(() => {
    const session = getStoredSession();
    if (session && session.user) {
      setUser(session.user);
      setIsLoading(false);
    } else {
      // Check Supabase session
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data?.session?.user) {
            syncSupabaseUser(data.session.user).finally(() => setIsLoading(false));
          } else {
            setIsLoading(false);
          }
        })
        .catch(() => {
          setIsLoading(false);
        });
    }

    // Subscribe to Supabase Auth State changes
    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncSupabaseUser(session.user);
      }
    });

    // Register Service Worker for PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
    }

    // Capture PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      authSubscription.subscription.unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [syncSupabaseUser]);

  const login = async (email: string, role: UserRole = 'CITIZEN'): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const profile = await loginWithEmail(email, role);
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    fullName: string,
    role: UserRole = 'CITIZEN',
    phone?: string
  ): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const profile = await registerUser(email, fullName, role, phone);
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const loginGoogle = async () => {
    const result = await signInWithGoogle();
    if (result.error) {
      throw new Error(result.error);
    }
  };

  const loginGoogleDemo = async (email: string, name?: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const profile = await loginWithGoogleMock(email, name);
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const updated = await updateUserProfile(data);
      setUser(updated);
      return updated;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredSession();
    supabase.auth.signOut().catch(() => {});
    setUser(null);
  };

  const installPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginGoogle,
        loginGoogleDemo,
        updateProfile,
        logout,
        isInstallable,
        installPwa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
