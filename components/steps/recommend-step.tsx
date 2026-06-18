'use client';

import React, { useEffect, useState } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Label } from '../ui/label';
import { Loader2, ArrowLeft, Sparkles, RefreshCw, Sun, Check, ChevronRight } from 'lucide-react';
import { RankedRecommendation } from '../../lib/types';
import { generateRankedRecommendations } from '../../lib/ai-recommendation';

export function RecommendStep() {
  const {
    recipientProfile, relationship,
    setRecommendation, recommendation, setStep,
    isLoading, setLoading
  } = useGiftFlow();
  const [generating, setGenerating] = useState(false);
  const [rankedRecs, setRankedRecs] = useState<RankedRecommendation[]>([]);
  const [selectedRank, setSelectedRank] = useState(0);

  useEffect(() => {
    if (recipientProfile && rankedRecs.length === 0) generateRecs();
  }, []);

  const generateRecs = async () => {
    if (!recipientProfile) return;
    setGenerating(true);
    setLoading(true);
    try {
      const recs = await generateRankedRecommendations(recipientProfile, relationship);
      setRankedRecs(recs);
      setRecommendation(recs[0]);
      setSelectedRank(0);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!recipientProfile) return;
    setGenerating(true);
    try {
      const recs = await generateRankedRecommendations(recipientProfile, relationship);
      setRankedRecs(recs);
      setRecommendation(recs[0]);
      setSelectedRank(0);
    } finally { setGenerating(false); }
  };

  const selectRecommendation = (index: number) => {
    setSelectedRank(index);
    setRecommendation(rankedRecs[index]);
  };

  if (generating) {
    return (
      <div className="surface-stellar-strong rounded-2xl p-16 text-center animate-slide-up">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar animate-pulse-solar flex items-center justify-center mb-5">
          <Sparkles className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-solar mb-2">Generating Recommendations</h3>
        <p className="text-slate-500 text-sm">AI is analyzing their profile to find the perfect gift...</p>
      </div>
    );
  }

  const current = rankedRecs[selectedRank];

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5">
          <Sun className="h-8 w-8 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">
          Personalized Gift Recommendation
        </h2>
        <p className="text-slate-500 text-sm">AI-powered personalized recommendations</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-6">
        {current && (
          <>
            {rankedRecs.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Choose your favorite</Label>
                <div className="grid gap-2">
                  {rankedRecs.map((rec, i) => (
                    <button
                      key={i}
                      onClick={() => selectRecommendation(i)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        i === selectedRank
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : 'border-slate-700/30 surface-void hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === selectedRank ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200">{rec.label}</p>
                        <p className="text-[10px] text-slate-500 truncate">{rec.giftType === 'NFT' ? '1 NFT' : `${rec.amount} SOL`} — {rec.reason.slice(0, 60)}...</p>
                      </div>
                      {i === selectedRank && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div className="relative p-6 rounded-2xl overflow-hidden depth-4d">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-amber-500/20 to-orange-400/10" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
                <div className="relative">
                  <p className="text-xs text-amber-300/60 uppercase tracking-widest font-medium">
                    {current.label} — #{current.rank}
                  </p>
                  <p className="text-4xl font-black mt-2 text-solar">
                    {current.giftType === 'NFT' ? '1' : current.amount} <span className="text-2xl">{current.giftType}</span>
                  </p>
                  <p className="text-xs text-amber-400/40 mt-1.5">GiftMind on Solana Devnet</p>
                  <div className="absolute top-0 right-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20">
                      {Math.round((current.confidence || 0) * 100)}% match
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl surface-void">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Why this gift</h4>
                <p className="text-sm text-slate-400">{current.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl surface-void border border-amber-500/10">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-1.5">Social Signals</h4>
                  <p className="text-xs text-slate-500">{current.socialSignals}</p>
                </div>
                <div className="p-4 rounded-xl surface-void border border-cyan-500/10">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/60 mb-1.5">Wallet Signals</h4>
                  <p className="text-xs text-slate-500">{current.walletSignals}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl surface-void border border-amber-500/10">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-amber-400" />Suggested Message</h4>
                <p className="text-sm text-slate-400 italic">&ldquo;{current.personalizedMessage}&rdquo;</p>
              </div>

              <button onClick={handleRegenerate} disabled={generating} className="w-full h-10 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-amber-500/30 transition-all text-sm">
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                Refresh Recommendations
              </button>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep('profile')} className="flex-1 h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-slate-600 transition-all">
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <button onClick={() => setStep('approve')} disabled={isLoading || !recommendation} className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2 disabled:opacity-40">
            Review & Approve <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
