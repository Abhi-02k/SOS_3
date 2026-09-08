'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export default function Logo({ size = 'md', showSubtitle = true }: LogoProps) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center space-x-2.5 select-none">
      {/* Tactical Glowing Shield Icon */}
      <div className={`relative flex items-center justify-center ${iconSizes[size]} shrink-0`}>
        {/* Pulsing Radar Aura */}
        <div className="absolute inset-0 rounded-full bg-red-600/30 animate-ping opacity-75"></div>
        
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]"
        >
          <defs>
            <linearGradient id="logoShield" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>
          <path
            d="M32 6 L52 14 V30 C52 44 42 54 32 58 C22 54 12 44 12 30 V14 Z"
            fill="url(#logoShield)"
            stroke="#f87171"
            strokeWidth="2"
          />
          <path
            d="M22 28 C22 22.5 26.5 18 32 18 C37.5 18 42 22.5 42 28"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M26 32 C26 28.7 28.7 26 32 26 C35.3 26 38 28.7 38 32"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="32" cy="37" r="4" fill="#ffffff" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-1.5 leading-none">
          <span className={`font-black tracking-wider text-white ${textSizes[size]}`}>
            SOS GUARDIAN
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[9px] font-mono tracking-widest text-red-400 uppercase font-semibold">
            EMERGENCY TELEMETRY NETWORK
          </span>
        )}
      </div>
    </div>
  );
}
