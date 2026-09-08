import { UserProfile, UserRole, AuthSession } from '@/types/auth';
import { supabase } from './supabaseClient';

const SESSION_KEY = 'sos_guardian_auth_session';
const PROFILES_STORAGE_KEY = 'sos_guardian_local_profiles';

// Default initial profiles
const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'usr_admin_001',
    email: 'admin@guardian.sos',
    fullName: 'Commander Alex Vance',
    role: 'ADMIN',
    phone: '+1 (555) 911-0001',
    deviceId: 'DISPATCH-HQ-01',
    emergencyContacts: [],
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_disp_002',
    email: 'dispatcher@guardian.sos',
    fullName: 'Officer Sarah Connor',
    role: 'DISPATCHER',
    phone: '+1 (555) 911-0002',
    deviceId: 'DISPATCH-UNIT-02',
    emergencyContacts: [],
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_citizen_003',
    email: 'citizen@guardian.sos',
    fullName: 'John Doe (Driver)',
    role: 'CITIZEN',
    phone: '+1 (555) 911-0003',
    deviceId: 'GUARDIAN-MOBILE-7821',
    emergencyContacts: [
      {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '+1 (555) 999-8877',
      },
    ],
    bloodGroup: 'O+',
    medicalNotes: 'No known drug allergies',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Retrieve current persistent session from localStorage
 */
export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/**
 * Persist active session to localStorage (one-time login)
 */
export function saveStoredSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Clear session on logout
 */
export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Get all profiles from localStorage cache
 */
export function getLocalProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return DEFAULT_PROFILES;
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    return JSON.parse(raw) as UserProfile[];
  } catch {
    return DEFAULT_PROFILES;
  }
}

/**
 * Save updated profiles to localStorage
 */
export function saveLocalProfiles(profiles: UserProfile[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

/**
 * Login with Email (matches existing or creates profile)
 */
export async function loginWithEmail(email: string, requestedRole: UserRole = 'CITIZEN'): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const profiles = getLocalProfiles();
  const found = profiles.find((p) => p.email.toLowerCase() === cleanEmail);

  let user: UserProfile;

  if (!found) {
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      fullName: cleanEmail.split('@')[0].toUpperCase(),
      role: requestedRole,
      emergencyContacts: [],
      onboardingCompleted: requestedRole !== 'CITIZEN',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    profiles.push(user);
    saveLocalProfiles(profiles);
  } else {
    user = { ...found, lastLogin: new Date().toISOString() };
    const idx = profiles.findIndex((p) => p.id === user.id);
    if (idx >= 0) profiles[idx] = user;
    saveLocalProfiles(profiles);
  }

  // Save persistent session
  saveStoredSession({ user, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });

  // Sync to API
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  } catch {
    // Local storage works immediately
  }

  return user;
}

/**
 * Register New User Profile
 */
export async function registerUser(
  email: string,
  fullName: string,
  role: UserRole,
  phone?: string,
  deviceId?: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const profiles = getLocalProfiles();
  const existingIndex = profiles.findIndex((p) => p.email.toLowerCase() === cleanEmail);

  const newUser: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: cleanEmail,
    fullName: fullName.trim() || 'Citizen Responder',
    role,
    phone: phone?.trim(),
    deviceId: deviceId?.trim() || `DEV-${Math.floor(1000 + Math.random() * 9000)}`,
    emergencyContacts: [],
    onboardingCompleted: role !== 'CITIZEN',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    profiles[existingIndex] = newUser;
  } else {
    profiles.push(newUser);
  }
  saveLocalProfiles(profiles);

  saveStoredSession({ user: newUser, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });

  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
  } catch {
    // Local storage works immediately
  }

  return newUser;
}

/**
 * Trigger Real Google OAuth via Supabase
 */
export async function signInWithGoogle(): Promise<{ error?: string; url?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
      return { url: data.url };
    }
    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google OAuth failed';
    console.warn('Supabase Google OAuth:', message);
    return { error: message };
  }
}

/**
 * Simulated Instant Google Login (for testing before Google Cloud Console keys are entered)
 */
export async function loginWithGoogleMock(email: string, name?: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const profiles = getLocalProfiles();
  const found = profiles.find((p) => p.email.toLowerCase() === cleanEmail);

  // Automatic role recognition:
  // If email has 'admin' or matches existing admin -> ADMIN
  // If email has 'dispatch' -> DISPATCHER
  // Else -> CITIZEN
  let assignedRole: UserRole = 'CITIZEN';
  if (found) {
    assignedRole = found.role;
  } else if (cleanEmail.includes('admin')) {
    assignedRole = 'ADMIN';
  } else if (cleanEmail.includes('dispatch')) {
    assignedRole = 'DISPATCHER';
  }

  const user: UserProfile = {
    id: found?.id || `usr_g_${Date.now()}`,
    email: cleanEmail,
    fullName: name || cleanEmail.split('@')[0],
    role: assignedRole,
    phone: found?.phone,
    deviceId: found?.deviceId || `DEV-G-${Math.floor(1000 + Math.random() * 9000)}`,
    emergencyContacts: found?.emergencyContacts || [],
    onboardingCompleted: assignedRole !== 'CITIZEN' ? true : Boolean(found?.onboardingCompleted),
    createdAt: found?.createdAt || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  const idx = profiles.findIndex((p) => p.id === user.id || p.email.toLowerCase() === cleanEmail);
  if (idx >= 0) profiles[idx] = user;
  else profiles.push(user);
  saveLocalProfiles(profiles);

  saveStoredSession({ user, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });

  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  } catch {}

  return user;
}

/**
 * Update active user profile and synchronize with storage and API
 */
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const session = getStoredSession();
  const currentUser = session?.user;
  if (!currentUser) {
    throw new Error('No active user session to update');
  }

  const updatedUser: UserProfile = {
    ...currentUser,
    ...updates,
    lastLogin: new Date().toISOString(),
  };

  // Save persistent session
  saveStoredSession({ user: updatedUser, expiresAt: Date.now() + 30 * 24 * 3600 * 1000 });

  // Update in local profiles cache
  const profiles = getLocalProfiles();
  const idx = profiles.findIndex((p) => p.id === updatedUser.id || p.email.toLowerCase() === updatedUser.email.toLowerCase());
  if (idx >= 0) {
    profiles[idx] = updatedUser;
  } else {
    profiles.push(updatedUser);
  }
  saveLocalProfiles(profiles);

  // Sync with API
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    });
  } catch {}

  return updatedUser;
}
