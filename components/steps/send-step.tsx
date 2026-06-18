'use client';

import React, { useEffect, useState } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, ArrowLeft, CheckCircle, ExternalLink, AlertCircle, Sun } from 'lucide-react';
import { createGift, updateGiftStatus } from '../../lib/supabase-client';
import { generateMockSignature, getExplorerLink, checkSufficientBalance } from '../../lib/transaction';
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
  const { toast } = useToast();

  useEffect(() => { sendGift(); }, []);

  const sendGift = async () => {
    if (!senderWallet || !recipientWallet) { setError('Missing wallet info'); return; }
    setSending(true);
    setLoading(true);
    setError(null);
    try {
      const { sufficient, balance } = await checkSufficientBalance(senderWallet.address, amount);
      if (!sufficient) throw new Error(`Insufficient balance: ${balance.toFixed(4)} SOL`);

      const claimCode = generateClaimCode();
      setClaimCode(claimCode);

      const giftData = await createGift({
        sender_wallet: senderWallet.address,
        recipient_wallet: recipientWallet,
        recipient_social_handle: recipientProfile?.socialHandle,
        recipient_social_platform: recipientProfile?.socialPlatform,
        gift_type: 'SOL',
        gift_amount: amount,
        gift_token: 'SOL',
        sender_message: senderMessage || recommendation?.personalizedMessage,
        ai_explanation: recommendation?.reason,
        social_signals: recipientProfile?.socialInterests as unknown as Record<string, unknown>,
        wallet_signals: recipientProfile?.walletInsights as unknown as Record<string, unknown>,
        relationship,
        claim_code: claimCode
      });

      setGiftId(giftData.id);
      await new Promise(r => setTimeout(r, 2000));

      const mockSig = generateMockSignature();
      setSignature(mockSig);
      await updateGiftStatus(giftData.id, 'completed', mockSig);
      await updateSenderBalance();
      toast({ title: 'Gift Sent!', description: `${amount} SOL delivered` });
      setStep('complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send';
      setError(message);
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
          <button onClick={sendGift} disabled={isLoading} className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2"><Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Retry</button>
        </div>
      </div>
    );
  }

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
