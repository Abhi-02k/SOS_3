'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Loader2 } from 'lucide-react';

interface DynamicMobileMapProps {
  lat: number;
  lng: number;
  accuracy?: number | null;
  isEmergencyActive?: boolean;
}

const MobileLiveMap = dynamic(() => import('./MobileLiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 sm:h-56 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 space-y-2">
      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      <span className="text-[11px] font-mono text-slate-400">Loading Live GPS Public Map...</span>
    </div>
  ),
});

export default function DynamicMobileMap(props: DynamicMobileMapProps) {
  return <MobileLiveMap {...props} />;
}
