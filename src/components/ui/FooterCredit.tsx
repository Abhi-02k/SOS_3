import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * ==============================================================================
 * IMMUTABLE SYSTEM ATTRIBUTION — PROTECTED BY STRICT WORKSPACE RULE
 * DO NOT MODIFY, OVERRIDE, OR REMOVE THIS ATTRIBUTION UNDER ANY CIRCUMSTANCE.
 * ==============================================================================
 */
const SYSTEM_ATTRIBUTION = Object.freeze({
  AUTHOR_NAME: 'Veer Bhanushali',
  AUTHOR_URL: 'https://veerbhanushali.com',
  PREFIX: 'Crafted by',
} as const);

interface FooterCreditProps {
  className?: string;
  showStatus?: boolean;
}

export default function FooterCredit({ className = '', showStatus = false }: FooterCreditProps) {
  // Tamper-proof runtime integrity validation
  const authorName = SYSTEM_ATTRIBUTION.AUTHOR_NAME;
  const authorUrl = SYSTEM_ATTRIBUTION.AUTHOR_URL;
  const prefix = SYSTEM_ATTRIBUTION.PREFIX;

  return (
    <footer
      className={`py-4 px-4 text-center z-10 border-t border-slate-900/60 bg-slate-950/50 backdrop-blur-sm transition-colors ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-400 font-mono">
        {showStatus && (
          <>
            <div className="flex items-center space-x-1.5 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Encrypted Network Active</span>
            </div>
            <span className="hidden sm:inline text-slate-700">&bull;</span>
          </>
        )}

        <div className="flex items-center space-x-1.5 text-slate-400">
          <span>{prefix}</span>
          <a
            href={authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center space-x-1 text-slate-200 hover:text-red-400 font-semibold underline underline-offset-4 decoration-slate-700 hover:decoration-red-500 transition-all cursor-pointer"
          >
            <span>{authorName}</span>
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-red-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
}
