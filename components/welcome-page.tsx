'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Wallet, Users, Sun, Brain, Gift } from 'lucide-react';

interface WelcomePageProps {
  onEnter: () => void;
}

export function WelcomePage({ onEnter }: WelcomePageProps) {
  const [mounted, setMounted] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo mark */}
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-3xl surface-stellar-strong flex items-center justify-center animate-pulse-solar">
              <Gift className="h-12 w-12 text-amber-400" />
            </div>
            <div className="absolute -inset-3 border border-amber-500/20 rounded-full animate-orbit" />
            <div className="absolute -inset-6 border border-violet-500/10 rounded-full animate-orbit" style={{ animationDirection: 'reverse', animationDuration: '30s' }} />
          </div>
        </div>

        {/* Title */}
        <div className={`text-center mb-4 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '200ms' }}>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight">
            <span className="text-solar">Gift</span>
            <span className="text-stellar">Mind</span>
          </h1>
        </div>

        {/* Tagline */}
        <div className={`text-center mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '400ms' }}>
          <p className="text-lg md:text-xl text-slate-400 font-light tracking-wide">
            AI-Powered Web3 Gifting on Solana
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/40" />
            <span className="text-xs text-amber-500/60 uppercase tracking-[0.3em] font-medium">Devnet</span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/40" />
          </div>
        </div>

        {/* Feature pills */}
        <div className={`flex flex-wrap justify-center gap-3 mb-16 max-w-lg transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '500ms' }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full surface-stellar text-sm text-slate-300">
            <Wallet className="h-3.5 w-3.5 text-amber-400" />Wallet Intel
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full surface-stellar text-sm text-slate-300">
            <Users className="h-3.5 w-3.5 text-violet-400" />Social Discovery
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full surface-stellar text-sm text-slate-300">
            <Brain className="h-3.5 w-3.5 text-cyan-300" />AI Recs
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full surface-stellar text-sm text-slate-300">
            <Sun className="h-3.5 w-3.5 text-amber-300" />On-Chain
          </div>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '700ms' }}>
          <button
            onClick={onEnter}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="group relative px-10 py-4 rounded-2xl btn-solar text-lg transition-all duration-500"
          >
            <span className="relative z-10 flex items-center gap-3">
              Launch GiftMind
              <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${hovering ? 'translate-x-1' : ''}`} />
            </span>
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          </button>
        </div>

        {/* Bottom */}
        <div className={`mt-16 text-center transition-all duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '900ms' }}>
          <p className="text-xs text-slate-600 tracking-wide">
            Solana Devnet. No real funds. Demo social data.
          </p>
        </div>
      </div>
    </div>
  );
}
