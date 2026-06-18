'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { getGiftByClaimCode, claimGift } from '../../../lib/supabase-client';
import { getExplorerLink } from '../../../lib/transaction';
import { CheckCircle, ExternalLink, Loader2, Sparkles, Wallet, Gift, MessageSquare, Clock, Zap, Shield } from 'lucide-react';
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
  created_at?: string;
  mint_address?: string;
  image_url?: string;
  gift_name?: string;
  description?: string;
}

interface ConnectedClaimWallet {
  address: string;
  providerName: string;
}

function shortenAddress(addr: string) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function GiftCardSkeleton() {
  return (
    <div className="surface-stellar-strong rounded-3xl p-8 animate-pulse">
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-slate-800/50" />
      </div>
      <div className="h-8 w-48 bg-slate-800/50 rounded-xl mx-auto mb-4" />
      <div className="h-4 w-32 bg-slate-800/30 rounded-lg mx-auto mb-8" />
      <div className="space-y-3">
        <div className="h-16 bg-slate-800/30 rounded-2xl" />
        <div className="h-12 bg-slate-800/20 rounded-2xl" />
      </div>
    </div>
  );
}

export default function ClaimPage() {
  const params = useParams();
  const claimCode = params.code as string;
  const [gift, setGift] = useState<DbGift | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [claimWallet, setClaimWallet] = useState<ConnectedClaimWallet | null>(null);
  const [revealAmount, setRevealAmount] = useState(false);
  const [step, setStep] = useState<'loading' | 'gift' | 'claiming' | 'claimed'>('loading');

  useEffect(() => {
    async function loadGift() {
      try {
        const data = await getGiftByClaimCode(claimCode);
        setGift(data);
        if (data.status === 'claimed') {
          setClaimed(true);
          setStep('claimed');
        } else {
          setStep('gift');
          setTimeout(() => setRevealAmount(true), 400);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || 'Gift not found');
      } finally { setLoading(false); }
    }
    if (claimCode) loadGift();
  }, [claimCode]);

  const connectClaimWallet = async () => {
    setError(null);
    setClaiming(true);
    try {
      const w = typeof window !== 'undefined' ? (window as any) : null;
      const provider =
        w?.solana?.isPhantom || w?.solana?.isBackpack || w?.solana?.isGlow || w?.solana?.isTorus
          ? w.solana
          : w?.solflare || w?.backpack || w?.solana;

      if (!provider) {
        throw new Error('Wallet provider not found. Install Phantom, Solflare, or Backpack to claim.');
      }

      if (typeof provider.connect !== 'function') {
        throw new Error('Wallet does not support connecting.');
      }

      const resp = await provider.connect();
      const address = resp?.publicKey?.toString?.() || provider.publicKey?.toString?.();
      if (!address) throw new Error('Wallet did not return an address.');

      if (gift?.recipient_wallet && gift.recipient_wallet !== address) {
        throw new Error('Connected wallet does not match this gift recipient.');
      }

      if (typeof provider.signMessage === 'function') {
        const message = new TextEncoder().encode(`GiftMind claim ${claimCode}: ${new Date().toISOString()}`);
        const signed = await provider.signMessage(message, 'utf8');
        if (!signed?.signature && !signed) {
          throw new Error('Wallet signature is required to claim.');
        }
      }

      const providerName = provider.isPhantom ? 'Phantom' : provider.isBackpack ? 'Backpack' : provider.isSolflare ? 'Solflare' : 'Wallet';
      const connected = { address, providerName };
      setClaimWallet(connected);
      return connected;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to connect wallet');
      return null;
    } finally {
      setClaiming(false);
    }
  };

  const handleClaim = async () => {
    if (!gift) return;
    setStep('claiming');
    setClaiming(true);
    try {
      const connectedWallet = claimWallet || await connectClaimWallet();
      if (!connectedWallet) {
        setStep('gift');
        return;
      }

      // Transfer from escrow to claimant
      if (gift.gift_type === 'NFT' && gift.mint_address) {
        const transferResp = await fetch('/api/nft/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mintAddress: gift.mint_address, recipientAddress: connectedWallet.address }),
        });
        const text = await transferResp.text();
        let transferResult: any;
        try { transferResult = JSON.parse(text); } catch {
          throw new Error(`NFT transfer failed: server returned ${transferResp.status} — ${text.slice(0, 200)}`);
        }
        if (!transferResp.ok) throw new Error(transferResult.error || 'NFT transfer failed');
        await claimGift(gift.id, claimCode, connectedWallet.address);
        setGift({ ...gift, recipient_wallet: connectedWallet.address, status: 'claimed', transaction_signature: transferResult.signature });
      } else if (gift.gift_type === 'SOL' && gift.gift_amount) {
        // Transfer SOL from escrow to claimant
        const solResp = await fetch('/api/sol/transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientAddress: connectedWallet.address, amount: gift.gift_amount }),
        });
        const solText = await solResp.text();
        let solResult: any;
        try { solResult = JSON.parse(solText); } catch {
          throw new Error(`SOL transfer failed: server returned ${solResp.status} — ${solText.slice(0, 200)}`);
        }
        if (!solResp.ok) throw new Error(solResult.error || 'SOL transfer failed');
        await claimGift(gift.id, claimCode, connectedWallet.address);
        setGift({ ...gift, recipient_wallet: connectedWallet.address, status: 'claimed', transaction_signature: solResult.signature });
      } else {
        await claimGift(gift.id, claimCode, connectedWallet.address);
        setGift({ ...gift, recipient_wallet: connectedWallet.address, status: 'claimed' });
      }

      setClaimed(true);
      setStep('claimed');
      setTimeout(() => setRevealAmount(true), 300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to claim');
      setStep('gift');
    } finally { setClaiming(false); }
  };

  if (loading) {
    return (
      <>
        <SolarSystemBG />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <GiftCardSkeleton />
          </div>
        </div>
      </>
    );
  }

  if (error || !gift) {
    return (
      <>
        <SolarSystemBG />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="surface-stellar-strong max-w-md w-full rounded-3xl p-10 text-center animate-slide-up">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-5">
              <Gift className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-solar mb-2">Gift Not Found</h2>
            <p className="text-slate-500 text-sm mb-6">{error || 'This claim link is invalid or has expired.'}</p>
            <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-solar text-sm">Send a Gift</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SolarSystemBG />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          {/* Header */}
          <div className={`text-center transition-all duration-700 ${step !== 'loading' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 rounded-full surface-stellar-strong flex items-center justify-center animate-pulse-solar">
                <img src="/favicon.svg" alt="GM" className="h-8 w-8 object-contain" />
              </div>
              <div className="absolute -inset-1.5 border border-amber-500/15 rounded-full animate-orbit" />
            </div>
            <h1 className={`text-2xl md:text-3xl font-black mb-1 transition-all duration-700 ${step === 'claimed' ? 'text-emerald-400' : 'text-solar'}`}>
              {step === 'claimed' ? 'Gift Claimed!' : "You've Received a Gift!"}
            </h1>
            <p className="text-slate-500 text-sm">A GiftMind gift on Solana Devnet</p>
          </div>

          {/* Gift Card */}
          <div className={`surface-stellar-strong rounded-3xl overflow-hidden transition-all duration-700 ${step !== 'loading' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
            {/* Amount Hero */}
            <div className="relative p-8 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 via-amber-500/10 to-orange-400/5" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
              <div className="relative">
                <div className={`transition-all duration-1000 ${revealAmount ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                  <p className="text-5xl md:text-6xl font-black text-solar mb-1">
                    {gift.gift_amount?.toFixed(4)}
                  </p>
                  <p className="text-lg text-amber-400/60 font-medium tracking-wide">{gift.gift_token || 'SOL'}</p>
                </div>
                <div className={`flex items-center justify-center gap-2 mt-4 transition-all duration-500 ${revealAmount ? 'opacity-100' : 'opacity-0'}`}>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                    claimed || gift.status === 'claimed'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                  }`}>
                    {claimed || gift.status === 'claimed' ? 'Claimed' : 'Pending'}
                  </span>
                  {gift.gift_type === 'NFT' && (
                    <span className="text-[10px] px-3 py-1 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-bold uppercase tracking-wider">
                      NFT
                    </span>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-6 pt-0 space-y-4">
              {/* Message */}
              {gift.sender_message && (
                <div className="p-4 rounded-2xl surface-void">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-3 w-3 text-amber-400/60" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">Message</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">&ldquo;{gift.sender_message}&rdquo;</p>
                </div>
              )}

              {/* AI Explanation */}
              {gift.ai_explanation && (
                <div className="p-4 rounded-2xl surface-void border border-amber-500/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3 w-3 text-amber-400/60" />
                    <span className="text-[10px] uppercase tracking-wider text-amber-400/60">Why this gift</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{gift.ai_explanation}</p>
                </div>
              )}

              {/* Signals */}
              <div className="grid grid-cols-2 gap-3">
                {gift.social_signals && Object.keys(gift.social_signals).length > 0 && (
                  <div className="p-3 rounded-xl surface-void border border-amber-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-amber-400/60 mb-1.5">Interests</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(gift.social_signals).map((key) => (
                        <span key={key} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/70">{key}</span>
                      ))}
                    </div>
                  </div>
                )}
                {gift.wallet_signals && Object.keys(gift.wallet_signals).length > 0 && (
                  <div className="p-3 rounded-xl surface-void border border-cyan-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-cyan-400/60 mb-1.5">Wallet</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(gift.wallet_signals).map((key) => (
                        <span key={key} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400/70">{key}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sender */}
              <div className="flex items-center justify-between p-3 rounded-xl surface-void">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3 w-3 text-slate-600" />
                  <span className="text-xs text-slate-500">From</span>
                  <span className="text-xs font-mono text-slate-400">{shortenAddress(gift.sender_wallet)}</span>
                </div>
                {gift.created_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-700" />
                    <span className="text-[10px] text-slate-700">{new Date(gift.created_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Explorer Link */}
              {gift.transaction_signature && (
                <a href={getExplorerLink(gift.transaction_signature, 'devnet')} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-xs text-amber-400/60 hover:text-amber-400 transition-colors p-2">
                  <ExternalLink className="h-3 w-3" />View on Explorer
                </a>
              )}
            </CardContent>
          </div>

          {/* Action Area */}
          <div className={`transition-all duration-700 ${step !== 'loading' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
            {step === 'gift' && (gift.status === 'completed' || gift.status === 'pending') && (
              <div className="space-y-3">
                {!claimWallet ? (
                  <button
                    onClick={connectClaimWallet}
                    disabled={claiming}
                    className="w-full h-14 rounded-2xl surface-stellar-strong border border-amber-500/20 text-amber-300 text-lg flex items-center justify-center gap-3 hover:border-amber-500/40 transition-all disabled:opacity-40"
                  >
                    {claiming ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <><Wallet className="h-5 w-5" />Connect Wallet to Claim</>
                    )}
                  </button>
                ) : (
                  <div className="surface-stellar-strong rounded-2xl p-4 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl surface-stellar flex items-center justify-center">
                        <Shield className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-400 font-medium">Wallet connected</p>
                        <p className="text-xs font-mono text-slate-500">{claimWallet.address.slice(0, 8)}...{claimWallet.address.slice(-6)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setClaimWallet(null)}
                      className="text-[10px] text-slate-600 hover:text-slate-400 px-3 py-1 rounded-lg surface-void"
                    >
                      Change
                    </button>
                  </div>
                )}

                <button
                  onClick={handleClaim}
                  disabled={claiming || !claimWallet}
                  className="w-full h-14 rounded-2xl btn-solar text-lg flex items-center justify-center gap-3 disabled:opacity-40 transition-all"
                >
                  {claiming ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <><Zap className="h-5 w-5" />Claim Gift</>
                  )}
                </button>
              </div>
            )}

            {step === 'claiming' && (
              <div className="surface-stellar-strong rounded-2xl p-8 text-center animate-slide-up">
                <div className="w-16 h-16 mx-auto rounded-full surface-stellar animate-pulse-solar flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-solar mb-1">Claiming Your Gift</h3>
                <p className="text-sm text-slate-500">Processing on Solana Devnet...</p>
              </div>
            )}

            {step === 'claimed' && (
              <div className="surface-stellar-strong rounded-3xl p-8 text-center border border-emerald-500/20 animate-slide-up">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="w-20 h-20 rounded-full surface-stellar flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                  </div>
                  <div className="absolute -inset-2 border border-emerald-500/20 rounded-full animate-orbit" />
                </div>
                <h3 className="text-xl font-bold text-solar mb-2">Successfully Claimed!</h3>
                {gift.gift_type === 'NFT' && gift.mint_address ? (
                  <div className="mb-6 space-y-2">
                    <p className="text-sm text-slate-400">1 NFT has been sent to your wallet.</p>
                    <p className="text-[10px] text-slate-600">Mint address:</p>
                    <p className="text-xs font-mono text-cyan-400 break-all bg-black/30 rounded-lg p-2">{gift.mint_address}</p>
                    <p className="text-[10px] text-slate-600 mt-1">Add this mint address in your wallet to see the NFT.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mb-6">{gift.gift_amount?.toFixed(4)} {gift.gift_token || 'SOL'} has been added to your wallet.</p>
                )}
                <div className="flex gap-3 justify-center">
                  <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-solar text-sm">
                    <Gift className="h-4 w-4" />Send a Gift
                  </a>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] text-slate-700 tracking-wide">GiftMind on Solana Devnet</p>
        </div>
      </div>
    </>
  );
}
