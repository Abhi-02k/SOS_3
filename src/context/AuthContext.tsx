'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/types/auth';
import {
  getStoredSession,
  saveStoredSession,
  clearStoredSession,
  loginWithEmail,
  registerUser,
  signInWithGoogle,
  loginWithGoogleMock,
} from '@/lib/auth';

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

  // Restore one-time persistent session on initial mount
  useEffect(() => {
    const session = getStoredSession();
    if (session && session.user) {
      setUser(session.user);
    }
    setIsLoading(false);

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
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

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

  const logout = () => {
    clearStoredSession();
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
