'use client';

import React, { useEffect, useState } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Loader2, ArrowLeft, User, Sparkles, Wallet, Brain, Check, AtSign, Globe } from 'lucide-react';
import { RecipientProfile, SocialInterest, WalletInsight } from '../../lib/types';
import { discoverBySocialHandle, discoverByWallet } from '../../lib/social-discovery';
import { analyzeWallet } from '../../lib/wallet-intelligence';
import { saveWalletInsights } from '../../lib/supabase-client';

export function ProfileStep() {
  const {
    socialSearches, walletSearchQuery,
    setRecipientProfile, setRecipientWallet, setStep,
    isLoading, setLoading, setError
  } = useGiftFlow();
  const [profile, setProfile] = useState<RecipientProfile | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  useEffect(() => { buildProfile(); }, []);

  const buildProfile = async () => {
    setLoading(true);
    setError(null);

    const totalSteps = socialSearches.length + (walletSearchQuery ? 1 : 0);
    setProgress({ current: 0, total: totalSteps, status: 'Starting...' });

    try {
      const allInterests: SocialInterest[] = [];
      let combinedWalletAddress = walletSearchQuery.trim() || null;
      const sources: string[] = [];

      // Process each social profile
      for (let i = 0; i < socialSearches.length; i++) {
        const search = socialSearches[i];
        setProgress({ current: i + 1, total: totalSteps, status: `Analyzing @${search.handle} on ${search.platform}...` });

        const socialResult = await discoverBySocialHandle(search.handle, search.platform);

        // Merge interests from this platform
        socialResult.interests.forEach(interest => {
          const existing = allInterests.find(i => i.topic === interest.topic);
          if (existing) {
            existing.confidence = Math.max(existing.confidence, interest.confidence);
            if (!existing.sources.includes(search.platform)) {
              existing.sources.push(search.platform);
            }
          } else {
            allInterests.push({
              ...interest,
              sources: [search.platform]
            });
          }
        });

        // Check for verified wallet in social profile
        if (socialResult.web3Links && socialResult.web3Links.length > 0) {
          const walletLink = socialResult.web3Links.find(link => link.length > 30);
          if (walletLink && !combinedWalletAddress) {
            combinedWalletAddress = walletLink;
          }
        }

        sources.push(`${search.platform}: @${search.handle}`);
      }

      // Analyze wallet
      let walletAnalysis = {
        solBalance: 0,
        insights: [{ type: 'new', label: 'New User', confidence: 0.5 }] as WalletInsight[]
      };

      if (combinedWalletAddress) {
        setProgress({
          current: socialSearches.length + 1,
          total: totalSteps,
          status: 'Analyzing on-chain activity...'
        });

        try {
          walletAnalysis = await analyzeWallet(combinedWalletAddress);
          try {
            await saveWalletInsights(combinedWalletAddress, walletAnalysis);
          } catch {
            // ignore persistence errors
          }
        } catch {
          // Default values on error
        }

        if (combinedWalletAddress) {
          setRecipientWallet(combinedWalletAddress);
        }
      }

      // Sort interests by confidence
      allInterests.sort((a, b) => b.confidence - a.confidence);

      // Build combined profile
      const recipientProfile: RecipientProfile = {
        walletAddress: combinedWalletAddress || undefined,
        socialHandle: socialSearches.length > 0 ? socialSearches.map(s => `@${s.handle}`).join(', ') : undefined,
        socialPlatform: socialSearches.length > 0 ? socialSearches.map(s => s.platform).join(', ') : undefined,
        socialInterests: allInterests,
        walletInsights: walletAnalysis.insights,
        web3Interests: allInterests.slice(0, 5).map(i => i.topic),
        personalitySummary: generateSummary(allInterests, walletAnalysis, sources),
        confidenceScores: {}
      };

      allInterests.forEach(i => {
        recipientProfile.confidenceScores[i.topic] = i.confidence;
      });

      setProfile(recipientProfile);
      setRecipientProfile(recipientProfile);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = (interests: SocialInterest[], wallet: { solBalance: number }, sources: string[]): string => {
    const topInterests = interests.slice(0, 3).map(i => i.topic).join(', ');
    const hasWallet = wallet.solBalance > 0;
    const balance = wallet.solBalance.toFixed(2);

    let summary = `Based on ${sources.length} data source${sources.length > 1 ? 's' : ''}`;
    if (topInterests) summary += `, interested in ${topInterests}`;
    if (hasWallet) summary += `. Holds ${balance} SOL on-chain`;
    summary += '.';

    return summary;
  };

  if (isLoading) {
    return (
      <div className="surface-stellar-strong rounded-2xl p-16 text-center animate-slide-up">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl surface-stellar animate-pulse-solar flex items-center justify-center">
            <Brain className="h-10 w-10 text-amber-400" />
          </div>
          {/* Progress ring */}
          <svg className="absolute inset-0 w-20 h-20 -rotate-90">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="40" cy="40" r="36"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={226}
              strokeDashoffset={226 - (progress.current / progress.total) * 226}
              className="transition-all duration-500"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-solar mb-2">Building Recipient Profile</h3>
        <p className="text-slate-500 text-sm mb-1">{progress.status}</p>
        <p className="text-[10px] text-slate-600">{progress.current} of {progress.total} sources</p>
      </div>
    );
  }

  if (!profile) return null;

  const getTagClass = (topic: string) => {
    const t = topic.toLowerCase();
    if (t.includes('nft')) return 'tag-nft';
    if (t.includes('defi')) return 'tag-defi';
    if (t.includes('gaming')) return 'tag-gaming';
    if (t.includes('art')) return 'tag-art';
    if (t.includes('tech') || t.includes('dev')) return 'tag-tech';
    if (t.includes('music')) return 'tag-music';
    if (t.includes('dao') || t.includes('governance')) return 'tag-dao';
    if (t.includes('crypto') || t.includes('trading')) return 'tag-crypto';
    return 'tag-crypto';
  };

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5">
          <User className="h-8 w-8 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">Recipient Profile</h2>
        <p className="text-slate-500 text-sm">Combined analysis from social + on-chain data</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-6">
        {/* Data Sources Summary */}
        <div className="flex flex-col items-center gap-3 pb-5 border-b border-slate-800/50">
          {socialSearches.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {socialSearches.map((search, idx) => (
                <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <AtSign className="h-3 w-3 text-violet-400" />
                  <span className="text-xs font-medium text-violet-300">@{search.handle}</span>
                  <span className="text-[10px] text-violet-400/60">({search.platform})</span>
                </div>
              ))}
            </div>
          )}
          {profile.walletAddress && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg surface-void">
              <Wallet className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-mono text-slate-400">{profile.walletAddress.slice(0, 10)}...{profile.walletAddress.slice(-6)}</span>
            </div>
          )}
        </div>

        {/* Social Interests */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.socialInterests.map((interest, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${getTagClass(interest.topic)}`}
              >
                {interest.topic}
                <span className="ml-1.5 opacity-50 text-[10px]">{Math.round(interest.confidence * 100)}%</span>
                {interest.sources.length > 1 && (
                  <span title={`Found on ${interest.sources.length} platforms`} className="ml-1"><Globe className="h-2.5 w-2.5 opacity-40" /></span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Wallet Insights */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-cyan-400" />Wallet Insights
          </h3>
          <div className="grid gap-2">
            {profile.walletInsights.map((insight, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl surface-void">
                <div>
                  <p className="text-sm font-medium text-slate-300">{insight.label}</p>
                  {insight.details && <p className="text-xs text-slate-600 mt-0.5">{insight.details}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                      style={{ width: `${insight.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 w-8 text-right">{Math.round(insight.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-xl surface-void border border-amber-500/10">
          <p className="text-sm text-slate-400">{profile.personalitySummary}</p>
        </div>

        {/* Demo Notice */}
        <div className="text-center">
          <p className="text-[10px] text-slate-700 tracking-wide flex items-center justify-center gap-1">
            <Check className="h-3 w-3 text-emerald-400" />Wallet data from Solana Devnet
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep('search')}
            className="flex-1 h-11 rounded-xl surface-stellar text-slate-400 flex items-center justify-center gap-2 hover:border-slate-600 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <button
            onClick={() => setStep('recommend')}
            className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />Get Recommendation
          </button>
        </div>
      </div>
    </div>
  );
}
