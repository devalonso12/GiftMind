'use client';

import React from 'react';
import { Gift, Orbit, LogOut, Wallet } from 'lucide-react';
import { useGiftFlow } from '../lib/store';

interface HeaderProps {
  showDisconnect?: boolean;
}

export function Header({ showDisconnect = false }: HeaderProps) {
  const { senderWallet, disconnectWallet } = useGiftFlow();

  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <header className="bg-[#06050d]/90 backdrop-blur-xl border-b border-amber-500/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl surface-stellar-strong flex items-center justify-center">
              <Gift className="h-5 w-5 text-amber-400" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-solar">Gift</span><span className="text-stellar">Mind</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {showDisconnect && senderWallet?.connected && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-stellar">
                  <Wallet className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs font-mono text-slate-300">{shortenAddress(senderWallet.address)}</span>
                  <span className="text-[10px] text-slate-600">{senderWallet.balance.toFixed(2)} SOL</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-void text-red-400/70 hover:text-red-400 hover:border-red-500/30 transition-all text-xs"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-void text-xs text-violet-400/70 font-medium">
              <Orbit className="h-3 w-3" />
              Devnet
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
