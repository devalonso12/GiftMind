'use client';

import React from 'react';
import { Orbit, LogOut, Wallet, Coins } from 'lucide-react';
import Link from 'next/link';
import { useGiftFlow } from '../lib/store';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  showDisconnect?: boolean;
}

export function Header({ showDisconnect = false }: HeaderProps) {
  const { senderWallet, disconnectWallet } = useGiftFlow();
  const pathname = usePathname();

  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const topTokens = (senderWallet?.tokens || []).slice(0, 3);
  const hasTokens = topTokens.length > 0;

  return (
    <header className="bg-[#06050d]/90 backdrop-blur-xl border-b border-amber-500/10 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl surface-stellar-strong flex items-center justify-center">
              <img src="/favicon.svg" alt="GM" className="h-5 w-5 object-contain" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-solar">Gift</span><span className="text-stellar">Mind</span>
            </h1>
          </Link>
          <div className="flex items-center gap-3">

            {showDisconnect && senderWallet?.connected && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-stellar">
                  <Wallet className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs font-mono text-slate-300">{shortenAddress(senderWallet.address)}</span>
                  <span className={`text-[10px] ${senderWallet.balance > 0 ? 'text-slate-600' : 'text-amber-400/60'}`}>
                    {senderWallet.balance > 0 ? `${senderWallet.balance.toFixed(4)} SOL` : '0 SOL'}
                  </span>
                  {hasTokens && (
                    <span className="text-[10px] text-cyan-500/60 flex items-center gap-0.5">
                      <Coins className="h-2.5 w-2.5" />
                      {topTokens.map(t => `${t.amount} ${t.symbol || '?'}`).join(', ')}
                      {(senderWallet.tokens?.length || 0) > 3 && ' +more'}
                    </span>
                  )}
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
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-400/60 font-semibold">
              BOHBOO
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
