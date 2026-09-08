'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Emergency } from '@/types/emergency';

interface DynamicMapProps {
  emergencies: Emergency[];
  selectedId: string | null;
  onSelectEmergency: (id: string) => void;
  onEndEmergency: (id: string) => void;
}

const EmergencyMap = dynamic(() => import('./EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-3">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      <span className="text-sm font-mono tracking-wider text-slate-300 uppercase">
        Initializing CartoDB Dark Matter Radar Map...
      </span>
    </div>
  ),
});

export default function DynamicMap(props: DynamicMapProps) {
  return <EmergencyMap {...props} />;
}
