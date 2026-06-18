'use client';

import React, { useEffect, useState } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, ArrowLeft, Sparkles, RefreshCw, Heart, Users, Briefcase, Home, UserPlus, Star, Sun } from 'lucide-react';
import { Relationship } from '../../lib/types';
import { generateGiftRecommendation, regenerateRecommendation } from '../../lib/ai-recommendation';

const RELATIONSHIPS: { value: Relationship; label: string; icon: React.ElementType }[] = [
  { value: 'friend', label: 'Friend', icon: Users },
  { value: 'partner', label: 'Partner', icon: Heart },
  { value: 'parent', label: 'Parent', icon: Home },
  { value: 'sibling', label: 'Sibling', icon: UserPlus },
  { value: 'colleague', label: 'Colleague', icon: Briefcase },
  { value: 'teammate', label: 'Team', icon: Star },
  { value: 'custom', label: 'Other', icon: Sun }
];

export function RecommendStep() {
  const {
    recipientProfile, relationship, setRelationship,
    customRelationship, setCustomRelationship,
    setRecommendation, recommendation, setStep,
    isLoading, setLoading
  } = useGiftFlow();
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (recipientProfile && !recommendation) generateRec(); }, []);

  const generateRec = async () => {
    if (!recipientProfile) return;
    setGenerating(true);
    setLoading(true);
    try {
      const rec = await generateGiftRecommendation(recipientProfile, relationship, customRelationship);
      setRecommendation(rec);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!recipientProfile || !recommendation) return;
    setGenerating(true);
    try {
      const rec = await regenerateRecommendation(recipientProfile, relationship, recommendation);
      setRecommendation(rec);
    } finally { setGenerating(false); }
  };

  const handleRelationshipChange = async (value: Relationship) => {
    setRelationship(value);
    if (value !== 'custom') setCustomRelationship('');
    if (recipientProfile) {
      setGenerating(true);
      try {
        const rec = await generateGiftRecommendation(recipientProfile, value, customRelationship);
        setRecommendation(rec);
      } finally { setGenerating(false); }
    }
  };

  if (generating) {
    return (
      <div className="surface-stellar-strong rounded-2xl p-16 text-center animate-slide-up">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar animate-pulse-solar flex items-center justify-center mb-5">
          <Sparkles className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-solar mb-2">Generating Recommendation</h3>
        <p className="text-slate-500 text-sm">AI is crafting your personalized gift...</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5">
          <Sun className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">Gift Recommendation</h2>
        <p className="text-slate-500 text-sm">AI-powered personalized suggestion</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-6">
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your Relationship</Label>
          <RadioGroup value={relationship} onValueChange={handleRelationshipChange} className="grid grid-cols-4 gap-2">
            {RELATIONSHIPS.map((rel) => {
              const Icon = rel.icon;
              return (
                <div key={rel.value} className="flex items-center">
                  <RadioGroupItem value={rel.value} id={rel.value} className="peer sr-only" />
                  <label htmlFor={rel.value} className="flex-1 cursor-pointer rounded-xl surface-void p-3 text-center transition-all peer-checked:border-amber-500/50 peer-checked:bg-amber-500/10 hover:border-slate-600">
                    <Icon className={`h-4 w-4 mx-auto mb-1 ${relationship === rel.value ? 'text-amber-400' : 'text-slate-600'}`} />
                    <span className={`text-[11px] block ${relationship === rel.value ? 'text-amber-300' : 'text-slate-500'}`}>{rel.label}</span>
                  </label>
                </div>
              );
            })}
          </RadioGroup>
          {relationship === 'custom' && (
            <Input placeholder="Describe your relationship..." value={customRelationship} onChange={(e) => setCustomRelationship(e.target.value)} className="mt-2 bg-black/30 border-slate-700/50 text-slate-200" />
          )}
        </div>

        {recommendation && (
          <div className="space-y-5">
            <div className="relative p-6 rounded-2xl overflow-hidden depth-4d">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-amber-500/20 to-orange-400/10" />
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <div className="relative">
                <p className="text-xs text-amber-300/60 uppercase tracking-widest font-medium">Recommended Gift</p>
                <p className="text-4xl font-black mt-2 text-solar">{recommendation.amount} <span className="text-2xl">{recommendation.giftType}</span></p>
                <p className="text-xs text-amber-400/40 mt-1.5">GiftMind on Solana Devnet</p>
                <div className="absolute top-0 right-0">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                    {Math.round(recommendation.confidence * 100)}% match
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl surface-void">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Why this gift</h4>
              <p className="text-sm text-slate-400">{recommendation.reason}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl surface-void border border-amber-500/10">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-1.5">Social Signals</h4>
                <p className="text-xs text-slate-500">{recommendation.socialSignals}</p>
              </div>
              <div className="p-4 rounded-xl surface-void border border-cyan-500/10">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/60 mb-1.5">Wallet Signals</h4>
                <p className="text-xs text-slate-500">{recommendation.walletSignals}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl surface-void border border-amber-500/10">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-amber-400" />Suggested Message</h4>
              <p className="text-sm text-slate-400 italic">&ldquo;{recommendation.personalizedMessage}&rdquo;</p>
            </div>

            <button onClick={handleRegenerate} disabled={generating} className="w-full h-10 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-amber-500/30 transition-all text-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />Regenerate
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep('profile')} className="flex-1 h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-slate-600 transition-all">
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <button onClick={() => setStep('approve')} disabled={isLoading || !recommendation} className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2 disabled:opacity-40">
            Review & Approve
          </button>
        </div>
      </div>
    </div>
  );
}
