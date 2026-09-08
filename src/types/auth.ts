export type UserRole = 'ADMIN' | 'DISPATCHER' | 'CITIZEN';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  deviceId?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  vehicleInfo?: string;
  emergencyContacts?: EmergencyContact[];
  onboardingCompleted?: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: UserProfile;
  token?: string;
  expiresAt?: number;
}
