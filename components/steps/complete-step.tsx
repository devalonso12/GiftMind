'use client';

import React, { useState, useEffect } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Gift, Copy, ExternalLink, CheckCircle, Share2, RotateCcw, Sparkles, Sun } from 'lucide-react';
import { getExplorerLink } from '../../lib/transaction';
import { useToast } from '../../hooks/use-toast';

export function CompleteStep() {
  const { amount, claimCode, transactionSignature, recommendation, resetFlow } = useGiftFlow();
  const { toast } = useToast();
  const [claimUrl, setClaimUrl] = useState('');

  useEffect(() => {
    if (claimCode) {
      setClaimUrl(`${window.location.origin}/claim/${claimCode}`);
    }
  }, [claimCode]);

  const copyLink = () => {
    navigator.clipboard.writeText(claimUrl);
    toast({ title: 'Copied!', description: 'Claim link copied' });
  };

  const shareGift = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'GM Gift!', text: `Someone sent you ${amount} SOL!`, url: claimUrl }); }
      catch { copyLink(); }
    } else { copyLink(); }
  };

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className="w-20 h-20 rounded-full surface-stellar-strong flex items-center justify-center animate-pulse-solar">
            <Sun className="h-10 w-10 text-amber-400" />
          </div>
          <div className="absolute -inset-2 border border-amber-500/20 rounded-full animate-orbit" />
        </div>
        <h2 className="text-3xl font-black text-solar">Gift Sent!</h2>
        <p className="text-slate-500 text-sm mt-2">Your GiftMind gift is on its way</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-6">
        <div className="relative p-8 rounded-2xl overflow-hidden depth-4d text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-amber-500/20 to-orange-400/10" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
          <div className="relative">
            <Gift className="h-8 w-8 mx-auto mb-3 text-amber-300/60" />
            <p className="text-4xl font-black text-solar">{amount} SOL</p>
            <p className="text-xs text-amber-400/40 mt-2">sent on Solana Devnet</p>
          </div>
        </div>

        {transactionSignature && (
          <button onClick={() => window.open(getExplorerLink(transactionSignature), '_blank')} className="w-full h-10 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-amber-500/30 transition-all text-sm">
            <ExternalLink className="h-3.5 w-3.5" />View on Explorer
          </button>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Claim Link</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/60 border border-amber-500/15">Shareable</span>
          </div>
          <div className="p-3 rounded-xl surface-void">
            <p className="text-xs font-mono text-slate-400 truncate">{claimUrl}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={copyLink} className="h-11 rounded-xl surface-stellar text-slate-300 flex items-center justify-center gap-2 hover:border-slate-600 transition-all text-sm">
              <Copy className="h-4 w-4" />Copy
            </button>
            <button onClick={shareGift} className="h-11 rounded-xl btn-solar flex items-center justify-center gap-2 text-sm">
              <Share2 className="h-4 w-4" />Share
            </button>
          </div>
        </div>

        {recommendation?.personalizedMessage && (
          <div className="p-4 rounded-xl surface-void border border-amber-500/10">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3" />Your Message</h4>
            <p className="text-xs text-slate-400 italic">&ldquo;{recommendation.personalizedMessage}&rdquo;</p>
          </div>
        )}

        <button onClick={resetFlow} className="w-full h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-slate-600 transition-all">
          <RotateCcw className="h-4 w-4" />Send Another Gift
        </button>

        <p className="text-center text-[10px] text-slate-700 tracking-wide">GiftMind on Solana Devnet</p>
      </div>
    </div>
  );
}
