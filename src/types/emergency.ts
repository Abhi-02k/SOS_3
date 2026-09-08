import { EmergencyContact } from './auth';

export type EmergencyType = 'MANUAL' | 'AUTO';

export interface Emergency {
  emergencyId: string;
  deviceId: string;
  type: EmergencyType;
  lat: number;
  lng: number;
  active: boolean;
  timestamp: number;
  lastPing: number;
  speed?: number | null;
  accuracy?: number | null;
  address?: string;
  notes?: string;

  // Family & Medical First-Responder Telemetry
  userName?: string;
  userPhone?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  vehicleInfo?: string;
  emergencyContacts?: EmergencyContact[];
}

export interface SosPayload {
  deviceId: string;
  lat: number;
  lng: number;
  type: EmergencyType;
  speed?: number | null;
  accuracy?: number | null;

  // Attached identity and family contact details
  userName?: string;
  userPhone?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  vehicleInfo?: string;
  emergencyContacts?: EmergencyContact[];
}

export interface LocationUpdatePayload {
  emergencyId: string;
  lat: number;
  lng: number;
  speed?: number | null;
  accuracy?: number | null;
}

export interface EndEmergencyPayload {
  emergencyId: string;
}
