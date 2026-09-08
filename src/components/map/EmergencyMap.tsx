'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Emergency } from '@/types/emergency';
import { AlertTriangle, Clock, MapPin, Gauge, ShieldAlert, CheckCircle, Layers } from 'lucide-react';
import { TILE_PROVIDERS } from './TileProviders';

interface EmergencyMapProps {
  emergencies: Emergency[];
  selectedId: string | null;
  onSelectEmergency: (id: string) => void;
  onEndEmergency: (id: string) => void;
}

// Controller component to smoothly center/pan map
function MapPanController({
  selectedEmergency,
  emergencies,
}: {
  selectedEmergency: Emergency | null;
  emergencies: Emergency[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedEmergency) {
      map.flyTo([selectedEmergency.lat, selectedEmergency.lng], 16, {
        animate: true,
        duration: 1.2,
      });
    } else if (emergencies.length > 0) {
      // Fit all markers if no specific selection
      try {
        const bounds = L.latLngBounds(
          emergencies.map((e) => [e.lat, e.lng] as [number, number])
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } catch {
        // Ignored
      }
    }
  }, [selectedEmergency, emergencies, map]);

  return null;
}

// Custom Leaflet Pulsing DivIcon generator
function getEmergencyIcon(type: 'MANUAL' | 'AUTO', isSelected: boolean) {
  const isAuto = type === 'AUTO';
  const pulseColor = isAuto ? 'bg-red-500/40' : 'bg-amber-500/40';
  const innerColor = isAuto ? 'bg-red-600' : 'bg-amber-500';
  const glow = isAuto ? 'shadow-[0_0_16px_#ef4444]' : 'shadow-[0_0_16px_#f59e0b]';

  return L.divIcon({
    className: 'leaflet-pulse-icon',
    html: `
      <div class="relative flex items-center justify-center w-12 h-12 cursor-pointer group">
        <div class="absolute w-12 h-12 rounded-full ${pulseColor} radar-wave"></div>
        <div class="absolute w-8 h-8 rounded-full ${pulseColor} radar-wave-delayed"></div>
        <div class="relative z-10 w-5 h-5 rounded-full ${innerColor} border-2 border-white ${glow} flex items-center justify-center transition-transform group-hover:scale-125 ${
      isSelected ? 'ring-4 ring-white' : ''
    }">
          <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20],
  });
}

export default function EmergencyMap({
  emergencies,
  selectedId,
  onSelectEmergency,
  onEndEmergency,
}: EmergencyMapProps) {
  const [providerKey, setProviderKey] = useState<'osm' | 'dark' | 'satellite'>('osm');
  const provider = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.osm;

  const safeEmergencies = Array.isArray(emergencies) ? emergencies : [];

  const selectedEmergency = useMemo(
    () => safeEmergencies.find((e) => e.emergencyId === selectedId) || null,
    [safeEmergencies, selectedId]
  );

  // Default center (San Francisco) if no emergencies exist
  const defaultCenter: [number, number] = [37.7749, -122.4194];

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Public Map Tiles with Switcher & Fast Caching */}
        <TileLayer
          key={provider.id}
          attribution={provider.attribution}
          url={provider.url}
          subdomains={provider.subdomains || 'abc'}
          maxZoom={provider.maxZoom}
          keepBuffer={8}
          updateWhenIdle={false}
          crossOrigin="anonymous"
        />

        <MapPanController
          selectedEmergency={selectedEmergency}
          emergencies={safeEmergencies}
        />

        {safeEmergencies.map((incident) => {
          const isSelected = incident.emergencyId === selectedId;
          const isAuto = incident.type === 'AUTO';
          const timeSince = Math.max(
            0,
            Math.round((Date.now() - incident.timestamp) / 1000)
          );

          return (
            <Marker
              key={incident.emergencyId}
              position={[incident.lat, incident.lng]}
              icon={getEmergencyIcon(incident.type, isSelected)}
              eventHandlers={{
                click: () => onSelectEmergency(incident.emergencyId),
              }}
            >
              <Popup className="emergency-popup">
                <div className="p-2 space-y-2 min-w-[240px] text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <div className="flex items-center space-x-1.5">
                      {isAuto ? (
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                      <span
                        className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                          isAuto
                            ? 'bg-red-950 text-red-300 border border-red-700'
                            : 'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}
                      >
                        {isAuto ? 'VEHICULAR CRASH' : 'MANUAL SOS'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Device ID:</span>
                      <span className="font-bold text-white">{incident.deviceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Incident:</span>
                      <span className="text-slate-300">{incident.emergencyId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Coordinates:</span>
                      <span>
                        {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Speed:</span>
                      <span>{incident.speed ? `${incident.speed} km/h` : 'Stationary'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Elapsed:</span>
                      <span className="text-amber-400 font-bold">{timeSince}s ago</span>
                    </div>
                  </div>

                  {/* Citizen Identity & Medical Notes */}
                  {incident.userName && (
                    <div className="pt-2 border-t border-slate-700/60 text-xs space-y-0.5">
                      <div className="font-bold text-white flex items-center justify-between">
                        <span>{incident.userName}</span>
                        {incident.bloodGroup && (
                          <span className="px-1.5 py-0.5 bg-red-950 text-red-300 border border-red-800 rounded text-[10px]">
                            Blood: {incident.bloodGroup}
                          </span>
                        )}
                      </div>
                      {incident.userPhone && (
                        <a href={`tel:${incident.userPhone}`} className="text-blue-400 hover:underline text-[11px] block font-mono">
                          Driver: {incident.userPhone}
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

                  {/* Emergency Family Relative Contacts */}
                  {incident.emergencyContacts && incident.emergencyContacts.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/60 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Family Emergency Contacts:</div>
                      {incident.emergencyContacts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-950/80 p-1.5 rounded border border-slate-800 text-[11px]">
                          <div>
                            <span className="font-bold text-white block">{c.name}</span>
                            <span className="text-[9px] text-slate-400">({c.relationship})</span>
                          </div>
                          <a
                            href={`tel:${c.phone}`}
                            className="px-2 py-0.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded text-[10px] font-bold"
                          >
                            Call: {c.phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => onEndEmergency(incident.emergencyId)}
                    className="w-full mt-2 py-1.5 px-3 bg-red-900/60 hover:bg-red-800 border border-red-600 rounded text-xs font-bold text-red-100 flex items-center justify-center space-x-1 transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>TERMINATE & RESOLVE</span>
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Style Selector */}
      <div className="absolute top-4 left-14 z-[1000] flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
        <button
          onClick={() => setProviderKey('osm')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            providerKey === 'osm'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          OpenStreetMap (Public)
        </button>
        <button
          onClick={() => setProviderKey('dark')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            providerKey === 'dark'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Dark Matter
        </button>
        <button
          onClick={() => setProviderKey('satellite')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            providerKey === 'satellite'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}
