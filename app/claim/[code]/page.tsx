'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { getGiftByClaimCode, claimGift } from '../../../lib/supabase-client';
import { getExplorerLink } from '../../../lib/transaction';
import { Gift, CheckCircle, ExternalLink, Loader2, Sparkles, Wallet, Sun } from 'lucide-react';
import { SolarSystemBG } from '../../../components/solar-system-bg';

interface DbGift {
  id: string;
  sender_wallet: string;
  recipient_wallet?: string;
  gift_type: string;
  gift_amount?: number;
  gift_token?: string;
  sender_message?: string;
  ai_explanation?: string;
  social_signals?: Record<string, unknown>;
  wallet_signals?: Record<string, unknown>;
  transaction_signature?: string;
  status: string;
  claim_code: string;
}

export default function ClaimPage() {
  const params = useParams();
  const claimCode = params.code as string;
  const [gift, setGift] = useState<DbGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    async function loadGift() {
      try {
        const data = await getGiftByClaimCode(claimCode);
        setGift(data);
        if (data.status === 'claimed') setClaimed(true);
      } catch { setError('Gift not found'); }
      finally { setLoading(false); }
    }
    if (claimCode) loadGift();
  }, [claimCode]);

  const handleClaim = async () => {
    if (!gift) return;
    setClaiming(true);
    try { await claimGift(gift.id); setClaimed(true); }
    catch { setError('Failed to claim'); }
    finally { setClaiming(false); }
  };

  if (loading) {
    return (
      <>
        <SolarSystemBG />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      </>
    );
  }

  if (error || !gift) {
    return (
      <>
        <SolarSystemBG />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="surface-stellar-strong max-w-md w-full rounded-2xl p-8 text-center">
            <Gift className="h-12 w-12 mx-auto mb-4 text-red-400/60" />
            <h2 className="text-xl font-bold text-solar mb-2">Gift Not Found</h2>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SolarSystemBG />
      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8 animate-slide-up">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="w-20 h-20 rounded-full surface-stellar-strong flex items-center justify-center animate-pulse-solar">
                <Gift className="h-10 w-10 text-amber-400" />
              </div>
              <div className="absolute -inset-2 border border-amber-500/15 rounded-full animate-orbit" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-solar mb-2">You&apos;ve Received a Gift!</h1>
            <p className="text-slate-500 text-sm">A GiftMind gift on Solana</p>
          </div>

          <div className="surface-stellar-strong rounded-2xl mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <span className="text-2xl font-black text-solar">{gift.gift_amount?.toFixed(4)}</span>
                  <span className="text-lg text-slate-400">{gift.gift_token || 'SOL'}</span>
                </CardTitle>
                <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider ${
                  claimed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                }`}>
                  {claimed ? 'Claimed' : 'Pending'}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {gift.sender_message && (
                <div className="p-4 rounded-xl surface-void">
                  <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-1">Message</p>
                  <p className="text-sm text-slate-400 italic">&ldquo;{gift.sender_message}&rdquo;</p>
                </div>
              )}

              {gift.ai_explanation && (
                <div className="p-4 rounded-xl surface-void border border-amber-500/10">
                  <p className="text-[10px] uppercase tracking-wider text-amber-400/60 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />Why this gift</p>
                  <p className="text-xs text-slate-500">{gift.ai_explanation}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {gift.social_signals && Object.keys(gift.social_signals).length > 0 && (
                  <div className="p-3 rounded-xl surface-void border border-amber-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/60 mb-1.5">Social</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(gift.social_signals).map((key) => (<span key={key} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/70">{key}</span>))}
                    </div>
                  </div>
                )}
                {gift.wallet_signals && Object.keys(gift.wallet_signals).length > 0 && (
                  <div className="p-3 rounded-xl surface-void border border-cyan-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-cyan-400/60 mb-1.5">Wallet</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(gift.wallet_signals).map((key) => (<span key={key} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400/70">{key}</span>))}
                    </div>
                  </div>
                )}
              </div>

              {gift.transaction_signature && (
                <div className="pt-3 border-t border-slate-800/30">
                  <a href={getExplorerLink(gift.transaction_signature, 'devnet')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-amber-400/60 hover:text-amber-400 transition-colors">
                    <ExternalLink className="h-3 w-3" />View on Explorer
                  </a>
                </div>
              )}
            </CardContent>
          </div>

          {!claimed && gift.status === 'completed' && (
            <button onClick={handleClaim} disabled={claiming} className="w-full h-14 rounded-2xl btn-solar text-lg flex items-center justify-center gap-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {claiming ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle className="h-5 w-5" />Claim Gift</>}
            </button>
          )}

          {claimed && (
            <div className="surface-stellar-strong rounded-2xl p-6 text-center animate-slide-up border border-emerald-500/20">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-400" />
              <h3 className="text-xl font-bold text-solar mb-2">Gift Claimed!</h3>
              <p className="text-sm text-slate-500">{gift.gift_amount?.toFixed(4)} {gift.gift_token || 'SOL'} has been added to your wallet.</p>
            </div>
          )}

          <p className="text-center text-[10px] text-slate-700 mt-8 tracking-wide">GiftMind on Solana Devnet</p>
        </div>
      </div>
    </>
  );
}
