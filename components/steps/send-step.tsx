'use client';

import React, { useEffect, useState } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, ArrowLeft, CheckCircle, ExternalLink, AlertCircle, Sun } from 'lucide-react';
import { createGift, updateGiftStatus } from '../../lib/supabase-client';
import { getExplorerLink, checkSufficientBalance } from '../../lib/transaction';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { getConnection, LAMPORTS_PER_SOL } from '../../lib/solana-config';
import { useToast } from '../../hooks/use-toast';

function generateClaimCode(): string {
  return crypto.randomUUID().split('-')[0].toUpperCase();
}

export function SendStep() {
  const {
    senderWallet, recipientWallet, recipientProfile, recommendation,
    amount, senderMessage, relationship, setClaimCode, setGiftId,
    setStep, isLoading, setLoading, setError, error, updateSenderBalance
  } = useGiftFlow();
  const [signature, setSignature] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  const sendGift = async () => {
    if (!senderWallet) { setError('Missing sender wallet info'); return; }
    setConfirming(true);
    setSending(true);
    setLoading(true);
    setError(null);
    try {
      const giftType = recommendation?.giftType === 'NFT' ? 'NFT' : 'SOL';
      const claimCode = generateClaimCode();
      setClaimCode(claimCode);

      let txSig: string | undefined;
      let nftMintAddress: string | undefined;

      if (giftType === 'NFT') {
        // NFT flow: server-side mint via escrow wallet (only deposit fee from sender)
        const feeDeposit = Math.max(amount || 0.01, 0.01);
        const { sufficient, balance } = await checkSufficientBalance(senderWallet.address, feeDeposit);
        if (!sufficient) throw new Error(`Insufficient balance: ${balance.toFixed(4)} SOL`);

        const escrowPub = process.env.NEXT_PUBLIC_SOLANA_ESCROW_PUBLIC_KEY;
        if (!escrowPub) throw new Error('Escrow public key not configured');
        const connection = getConnection();
        const toPub = new PublicKey(escrowPub);
        const fromPub = new PublicKey(senderWallet.address);
        const lamports = Math.round(feeDeposit * LAMPORTS_PER_SOL);

        const tx = new Transaction().add(
          SystemProgram.transfer({ fromPubkey: fromPub, toPubkey: toPub, lamports })
        );
        const latest = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = latest.blockhash;
        tx.feePayer = fromPub;

        const w = typeof window !== 'undefined' ? (window as any) : null;
        const provider = w?.solana || w?.solflare || w?.backpack || null;
        if (!provider) throw new Error('Wallet provider not found');

        if (provider.signAndSendTransaction) {
          const res = await provider.signAndSendTransaction(tx);
          txSig = res?.signature || res;
          if (!txSig) throw new Error('Wallet did not return a signature');
          await connection.confirmTransaction(txSig, 'confirmed');
        } else if (provider.signTransaction) {
          const signed = await provider.signTransaction(tx);
          const raw = signed.serialize();
          txSig = await connection.sendRawTransaction(raw);
          if (!txSig) throw new Error('Wallet did not return a signature');
          await connection.confirmTransaction(txSig, 'confirmed');
        } else {
          throw new Error('Wallet does not support signing');
        }

        // Mint NFT on-chain via server endpoint
        const mintResp = await fetch('/api/nft/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'GiftMind Keepsake',
            symbol: 'GFT',
            uri: process.env.NEXT_PUBLIC_DEFAULT_NFT_IMAGE || 'https://placehold.co/600x600/png',
          }),
        });
        const mintText = await mintResp.text();
        let mintResult: any;
        try { mintResult = JSON.parse(mintText); } catch {
          throw new Error(`NFT mint failed: server returned ${mintResp.status} — ${mintText.slice(0, 200)}`);
        }
        if (!mintResp.ok) throw new Error(mintResult.error || 'NFT minting failed');
        nftMintAddress = mintResult.mintAddress;
        setSignature(mintResult.mintSignature);
      } else {
        // SOL flow: transfer sender → escrow
        const escrowPub = process.env.NEXT_PUBLIC_SOLANA_ESCROW_PUBLIC_KEY;
        if (!escrowPub) throw new Error('Escrow public key not configured');
        const { sufficient, balance } = await checkSufficientBalance(senderWallet.address, amount);
        if (!sufficient) throw new Error(`Insufficient balance: ${balance.toFixed(4)} SOL`);

        const connection = getConnection();
        const toPub = new PublicKey(escrowPub);
        const fromPub = new PublicKey(senderWallet.address);
        const lamports = Math.round(amount * LAMPORTS_PER_SOL);

        const tx = new Transaction().add(
          SystemProgram.transfer({ fromPubkey: fromPub, toPubkey: toPub, lamports })
        );
        const latest = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = latest.blockhash;
        tx.feePayer = fromPub;

        const w = typeof window !== 'undefined' ? (window as any) : null;
        const provider = w?.solana || w?.solflare || w?.backpack || null;
        if (!provider) throw new Error('Wallet provider not found');

        if (provider.signAndSendTransaction) {
          const res = await provider.signAndSendTransaction(tx);
          txSig = res?.signature || res;
          if (!txSig) throw new Error('Wallet did not return a signature');
          await connection.confirmTransaction(txSig, 'confirmed');
        } else if (provider.signTransaction) {
          const signed = await provider.signTransaction(tx);
          const raw = signed.serialize();
          txSig = await connection.sendRawTransaction(raw);
          if (!txSig) throw new Error('Wallet did not return a signature');
          await connection.confirmTransaction(txSig, 'confirmed');
        } else {
          throw new Error('Wallet does not support signing');
        }
        setSignature(txSig);
      }

      // Create gift record
      const giftData = await createGift({
        sender_wallet: senderWallet.address,
        recipient_wallet: recipientWallet || undefined,
        recipient_social_handle: recipientProfile?.socialHandle,
        recipient_social_platform: recipientProfile?.socialPlatform,
        gift_type: giftType,
        gift_amount: giftType === 'NFT' ? 1 : amount,
        gift_token: giftType === 'NFT' ? 'NFT' : 'SOL',
        sender_message: senderMessage || recommendation?.personalizedMessage,
        ai_explanation: recommendation?.reason,
        social_signals: recipientProfile?.socialInterests as unknown as Record<string, unknown>,
        wallet_signals: recipientProfile?.walletInsights as unknown as Record<string, unknown>,
        relationship,
        claim_code: claimCode,
        gift_name: giftType === 'NFT' ? 'GiftMind Keepsake' : undefined,
        gift_symbol: giftType === 'NFT' ? 'GFT' : undefined,
        description: giftType === 'NFT' ? (senderMessage || recommendation?.personalizedMessage || 'A personalized GiftMind NFT keepsake.') : undefined,
        image_url: giftType === 'NFT' ? (process.env.NEXT_PUBLIC_DEFAULT_NFT_IMAGE || 'https://placehold.co/600x600/png') : undefined,
        attributes_json: giftType === 'NFT' ? JSON.stringify([
          { trait_type: 'Gift Type', value: 'GiftMind Keepsake' },
          { trait_type: 'Relationship', value: relationship },
          { trait_type: 'Network', value: 'Solana Devnet' }
        ]) : undefined,
        seller_fee_basis_points: giftType === 'NFT' ? 0 : undefined,
        mint_address: nftMintAddress,
      });

      setGiftId(giftData.id);

      await updateGiftStatus(giftData.id, 'completed', txSig);
      await updateSenderBalance();
      toast({
        title: 'Gift Sent!',
        description: giftType === 'NFT'
          ? `NFT minted on-chain — claim link ready`
          : `${amount} SOL delivered to escrow`
      });
      setStep('complete');
    } catch (err) {
        console.error('Send gift error:', err);
        let message = 'Failed to send';
        if (err instanceof Error) message = err.message;
        else if (typeof err === 'string') message = err;
        else if (err && typeof err === 'object') {
          try { message = JSON.stringify(err); } catch { /* ignore */ }
        }

        // Map common errors to actionable suggestions
        const lower = message.toLowerCase();
        let action: { type: 'faucet' | 'wallet' | 'retry' | null; href?: string } = { type: null };
        if (lower.includes('insufficient balance') || lower.includes('insufficient funds') || lower.includes('insufficient lamports')) {
          action = { type: 'faucet', href: 'https://faucet.solana.com' };
        } else if (lower.includes('wallet provider not found') || lower.includes('wallet not found')) {
          action = { type: 'wallet', href: 'https://phantom.app/' };
        } else if (lower.includes('user rejected') || lower.includes('request rejected') || lower.includes('signature')) {
          action = { type: 'retry' };
        }

        setError(message);
        // show a toast with suggestion
        if (action.type === 'faucet') {
          toast({ title: 'Insufficient funds', description: 'Add Devnet SOL from the Solana faucet to continue.' });
        } else if (action.type === 'wallet') {
          toast({ title: 'Wallet not found', description: 'Please install or open a supported wallet extension (Phantom, Solflare, Backpack).' });
        }
    } finally {
      setSending(false);
      setLoading(false);
    }
  };

  if (sending) {
    return (
      <div className="surface-stellar-strong rounded-2xl p-16 text-center animate-slide-up">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar animate-pulse-solar flex items-center justify-center mb-5">
          <Sun className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-solar mb-2">Sending Gift</h3>
        <p className="text-slate-500 text-sm">Processing on Solana Devnet...</p>
        <div className="flex justify-center mt-4 gap-1">
          {[0, 1, 2].map(i => (<div key={i} className="w-2 h-2 rounded-full bg-amber-400/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-stellar-strong rounded-2xl p-8 animate-slide-up">
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setStep('approve')} className="flex-1 h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2"><ArrowLeft className="h-4 w-4" />Back</button>
          <div className="flex-1 flex gap-2">
            <button onClick={sendGift} disabled={isLoading} className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2"><Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Retry</button>
            {/* Helpful quick action for common errors */}
            {error.toLowerCase().includes('insufficient') && (
              <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="h-11 inline-flex items-center justify-center rounded-xl border border-amber-400/20 px-4 text-amber-300">Get Devnet SOL</a>
            )}
            {error.toLowerCase().includes('wallet') && (
              <a href="https://phantom.app/" target="_blank" rel="noreferrer" className="h-11 inline-flex items-center justify-center rounded-xl border border-amber-400/20 px-4 text-amber-300">Open Wallet</a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="surface-stellar-strong rounded-2xl p-8 text-center animate-slide-up">
        <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
        <h3 className="text-lg font-semibold text-solar mb-2">Confirming</h3>
        <p className="text-slate-500 text-sm">Waiting for blockchain confirmation...</p>
        {signature && (
          <button onClick={() => window.open(getExplorerLink(signature), '_blank')} className="mt-4 text-xs text-amber-400 flex items-center gap-1.5 mx-auto">
            <ExternalLink className="h-3 w-3" />View on Explorer
          </button>
        )}
      </div>
    );
  }

  const giftType = recommendation?.giftType === 'NFT' ? 'NFT' : 'SOL';
  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5">
          <Sun className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">Send Gift</h2>
        <p className="text-slate-500 text-sm">Review and confirm your gift</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-5">
        <div className="relative p-6 rounded-2xl overflow-hidden depth-4d text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-amber-500/20 to-orange-400/10" />
          <div className="relative">
            <p className="text-4xl font-black text-solar">
              {giftType === 'NFT' ? '1 NFT' : `${amount} SOL`}
            </p>
            <p className="text-xs text-amber-400/40 mt-1">
              {giftType === 'NFT' ? 'Minted on Solana Devnet' : 'Delivered to escrow'}
            </p>
          </div>
        </div>

        {recommendation?.reason && (
          <div className="p-3 rounded-xl surface-void">
            <p className="text-xs text-slate-400 italic">{recommendation.reason}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep('approve')} disabled={isLoading} className="flex-1 h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-slate-600 transition-all">
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <button onClick={sendGift} disabled={isLoading} className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2 disabled:opacity-40">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" />Send Gift</>}
          </button>
        </div>
      </div>
    </div>
  );
}
