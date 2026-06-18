'use client';

import React, { useState } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ArrowLeft, CheckCircle, Edit2, Wallet, Sparkles, Shield, Send } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export function ApproveStep() {
  const {
    recipientProfile, recipientWallet, recommendation, relationship,
    senderMessage, setSenderMessage, amount, setAmount, senderWallet,
    setStep, isLoading, setRecommendation
  } = useGiftFlow();
  const [editingAmount, setEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState(recommendation?.amount?.toString() || '0.1');
  const { toast } = useToast();
  const giftType = recommendation?.giftType || 'SOL';

  const handleAmountEdit = () => {
    const newAmount = parseFloat(tempAmount);
    if (isNaN(newAmount) || newAmount < 0.01 || newAmount > (senderWallet?.balance || 100)) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    setAmount(newAmount);
    setEditingAmount(false);
  };

  const handleGiftTypeChange = (nextGiftType: 'SOL' | 'NFT') => {
    if (!recommendation) return;
    const nextAmount = nextGiftType === 'NFT' ? 0.01 : recommendation.amount || 0.1;
    setRecommendation({
      ...recommendation,
      giftType: nextGiftType,
      amount: nextAmount,
      tokenSymbol: nextGiftType === 'NFT' ? 'NFT' : 'SOL',
      reason: nextGiftType === 'NFT'
        ? `An NFT keepsake fits their interests and creates a collectible memory on Solana. ${recommendation.reason}`
        : recommendation.reason
    });
    setAmount(nextAmount);
    setTempAmount(nextAmount.toString());
  };

  const handleApprove = () => {
    if (!senderMessage.trim() && recommendation?.personalizedMessage) {
      setSenderMessage(recommendation.personalizedMessage);
    }
    setStep('send');
  };

  if (!recommendation || !recipientProfile) {
    return (
      <div className="surface-stellar-strong rounded-2xl p-16 text-center">
        <p className="text-slate-500">No recommendation available</p>
        <button onClick={() => setStep('recommend')} className="mt-4 text-amber-400 text-sm">Get Recommendation</button>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5">
          <Shield className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">Review & Approve</h2>
        <p className="text-slate-500 text-sm">Confirm gift details before sending</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between p-4 rounded-xl surface-void">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-600">Sending to</p>
            <p className="font-semibold text-slate-200 mt-0.5">{recipientProfile.socialHandle ? `@${recipientProfile.socialHandle}` : 'Recipient'}</p>
            {recipientWallet ? (
              <p className="text-[10px] font-mono text-slate-600 mt-0.5">{recipientWallet.slice(0, 8)}...{recipientWallet.slice(-6)}</p>
            ) : (
              <p className="text-[10px] text-amber-400/60 mt-0.5">Recipient connects wallet when claiming</p>
            )}
          </div>
          <span className="platform-badge bg-amber-500/15 text-amber-400 border border-amber-500/20">{relationship}</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gift Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {(['SOL', 'NFT'] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleGiftTypeChange(type)}
                className={`p-4 rounded-xl text-left transition-all ${
                  giftType === type ? 'surface-solar border border-amber-500/40' : 'surface-void hover:border-slate-600'
                }`}
              >
                <p className="text-sm font-bold text-slate-200">{type === 'SOL' ? 'SOL Gift' : 'NFT Keepsake'}</p>
                <p className="text-[10px] text-slate-500 mt-1">{type === 'SOL' ? 'Claimable SOL payout' : 'Minted to claimant wallet'}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{giftType === 'NFT' ? 'Mint Fee Deposit' : 'Gift Amount'}</Label>
            {!editingAmount && <button onClick={() => setEditingAmount(true)} className="text-slate-600 hover:text-slate-400 transition-colors"><Edit2 className="h-3 w-3" /></button>}
          </div>
          {editingAmount ? (
            <div className="flex gap-2">
              <Input type="number" value={tempAmount} onChange={(e) => setTempAmount(e.target.value)} className="h-10 bg-black/30 border-slate-700/50 text-slate-200" step="0.01" min="0.01" />
              <button onClick={handleAmountEdit} className="px-4 h-10 rounded-lg btn-solar text-sm">Save</button>
            </div>
          ) : (
            <div className="relative p-5 rounded-xl overflow-hidden depth-4d">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-amber-500/20 to-orange-400/10" />
              <div className="relative">
                <p className="text-3xl font-black text-solar">{giftType === 'NFT' ? '1 NFT' : `${amount.toFixed(4)} SOL`}</p>
                {giftType === 'NFT' && <p className="text-xs text-amber-400/50 mt-1">Deposits {amount.toFixed(4)} SOL to escrow for minting fees</p>}
                <p className="text-xs text-amber-400/40 mt-1">Your balance: {senderWallet?.balance.toFixed(4)} SOL</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl surface-void border border-amber-500/10">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" />Social</h4>
            <div className="flex flex-wrap gap-1">
              {recipientProfile.socialInterests.slice(0, 3).map((i, idx) => (<span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/70">{i.topic}</span>))}
            </div>
          </div>
          <div className="p-3 rounded-xl surface-void border border-cyan-500/10">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/60 mb-2 flex items-center gap-1"><Wallet className="h-3 w-3" />Wallet</h4>
            <div className="flex flex-wrap gap-1">
              {recipientProfile.walletInsights.slice(0, 2).map((i, idx) => (<span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400/70">{i.label}</span>))}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl surface-void border border-amber-500/10">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">AI Reason</h4>
          <p className="text-xs text-slate-500">{recommendation.reason}</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Personal Message</Label>
          <Textarea
            placeholder={recommendation.personalizedMessage}
            value={senderMessage}
            onChange={(e) => setSenderMessage(e.target.value)}
            rows={3}
            className="bg-black/30 border-slate-700/50 text-slate-200 placeholder:text-slate-700 resize-none"
          />
        </div>

        <div className="p-3 rounded-xl surface-void border border-amber-500/15">
          <p className="text-xs text-amber-400/70"><strong>Demo:</strong> Real Devnet transaction. No real funds at risk.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep('recommend')} disabled={isLoading} className="flex-1 h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-slate-600 transition-all">
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <button onClick={handleApprove} disabled={isLoading} className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2">
            <Send className="h-4 w-4" />Approve & Send
          </button>
        </div>
      </div>
    </div>
  );
}
