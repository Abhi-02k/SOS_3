'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TILE_PROVIDERS } from './TileProviders';
import { Layers, Crosshair, MapPin } from 'lucide-react';

interface MobileLiveMapProps {
  lat: number;
  lng: number;
  accuracy?: number | null;
  isEmergencyActive?: boolean;
}

// Controller to smoothly pan when coordinates update
function PanToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}

// Custom Leaflet Icons
function getUserMarkerIcon(isEmergencyActive: boolean) {
  if (isEmergencyActive) {
    return L.divIcon({
      className: 'custom-mobile-marker',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <div class="absolute w-10 h-10 rounded-full bg-red-500/40 radar-wave"></div>
          <div class="absolute w-7 h-7 rounded-full bg-red-600/50 radar-wave-delayed"></div>
          <div class="relative z-10 w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-[0_0_12px_#ef4444] flex items-center justify-center">
            <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  return L.divIcon({
    className: 'custom-mobile-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="relative z-10 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_8px_#3b82f6] flex items-center justify-center">
          <span class="w-1 h-1 rounded-full bg-white"></span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function MobileLiveMap({
  lat,
  lng,
  accuracy,
  isEmergencyActive = false,
}: MobileLiveMapProps) {
  // Default to OpenStreetMap (Public & 100% Free)
  const [providerKey, setProviderKey] = useState<'osm' | 'dark' | 'satellite'>('osm');
  const provider = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.osm;

  const cycleTileProvider = () => {
    setProviderKey((prev) => {
      if (prev === 'osm') return 'dark';
      if (prev === 'dark') return 'satellite';
      return 'osm';
    });
  };

  return (
    <div className="w-full h-48 sm:h-56 rounded-xl overflow-hidden border border-slate-800 relative shadow-inner bg-slate-900">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          key={provider.id}
          url={provider.url}
          attribution={provider.attribution}
          subdomains={provider.subdomains || 'abc'}
          maxZoom={provider.maxZoom}
          keepBuffer={8}
          updateWhenIdle={false}
          crossOrigin="anonymous"
        />

        <PanToUser lat={lat} lng={lng} />

        <Marker
          position={[lat, lng]}
          icon={getUserMarkerIcon(isEmergencyActive)}
        />

        {accuracy && accuracy > 0 && (
          <Circle
            center={[lat, lng]}
            radius={Math.min(accuracy, 200)}
            pathOptions={{
              color: isEmergencyActive ? '#ef4444' : '#3b82f6',
              fillColor: isEmergencyActive ? '#ef4444' : '#3b82f6',
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
        )}
      </MapContainer>

      {/* Floating Controls Overlay */}
      <div className="absolute top-2 right-2 z-[1000] flex items-center space-x-1">
        {/* Layer Switcher */}
        <button
          onClick={cycleTileProvider}
          className="px-2 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-[10px] font-mono font-bold rounded-md border border-slate-700 shadow-md backdrop-blur flex items-center space-x-1"
          title="Switch Map Tiles (Public OpenStreetMap / Dark Matter / Satellite)"
        >
          <Layers className="w-3 h-3 text-blue-400" />
          <span>{providerKey.toUpperCase()}</span>
        </button>
      </div>

      {/* Live Badge */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-slate-950/90 text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-800 flex items-center space-x-1.5 shadow-md">
        <span className={`w-1.5 h-1.5 rounded-full ${isEmergencyActive ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`}></span>
        <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
    </div>
  );
}
