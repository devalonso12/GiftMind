'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGiftFlow } from '../../lib/store';
import { Search, Loader2, ArrowLeft, Wallet, AtSign, Globe, Github, Camera, MessageCircle, Eye, Sparkles, TrendingUp, Plus, X, Check, Zap, AlertCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const PLATFORMS = [
  { value: 'twitter', label: 'X (Twitter)', icon: MessageCircle, color: 'text-slate-300', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
  { value: 'farcaster', label: 'Farcaster', icon: Globe, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { value: 'lens', label: 'Lens', icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { value: 'instagram', label: 'Instagram', icon: Camera, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { value: 'github', label: 'GitHub', icon: Github, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
];

interface SocialResult {
  handle: string;
  platform: string;
  displayName: string;
  match: number;
  tags: string[];
  avatar: string;
  bio: string;
  verifiedWallet?: string;
}

// Real-time search simulation per platform
function simulateRealTimeSearch(query: string, platform: string): Promise<SocialResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!query.trim()) { resolve([]); return; }
      const q = query.toLowerCase().trim();

      const profiles: SocialResult[] = [];

      const generateProfile = (suffix: string, tags: string[], matchScore: number): SocialResult => ({
        handle: `${q}${suffix}`,
        platform,
        displayName: `${q.charAt(0).toUpperCase() + q.slice(1)} ${suffix.replace('_', '').replace('-', ' ').trim()}`,
        match: matchScore,
        tags,
        avatar: '',
        bio: `Web3 enthusiast | ${tags.slice(0, 2).join(' | ')}`,
        verifiedWallet: Math.random() > 0.6 ? `${Math.random().toString(36).substring(2, 10)}...${Math.random().toString(36).substring(2, 6)}` : undefined,
      });

      if (platform === 'twitter') {
        profiles.push(
          generateProfile('', ['NFT', 'DeFi', 'Web3'], 95),
          generateProfile('_crypto', ['Solana', 'Builder', 'Dev'], 87),
          generateProfile('.sol', ['Trading', 'DAO'], 82),
        );
      } else if (platform === 'farcaster') {
        profiles.push(
          generateProfile('.eth', ['Farcaster', 'On-chain'], 94),
          generateProfile('warp', ['Frames', 'Channels'], 85),
        );
      } else if (platform === 'lens') {
        profiles.push(
          generateProfile('.lens', ['Lens', 'Creator'], 96),
          generateProfile('_dao', ['DAO', 'Governance'], 80),
        );
      } else if (platform === 'instagram') {
        profiles.push(
          generateProfile('', ['NFT Art', 'Digital'], 88),
          generateProfile('.nft', ['Collector', 'Creator'], 75),
        );
      } else if (platform === 'github') {
        profiles.push(
          generateProfile('', ['Rust', 'Solana', 'Open Source'], 93),
          generateProfile('-dev', ['TypeScript', 'Web3'], 85),
        );
      }

      resolve(profiles);
    }, 300 + Math.random() * 200); // 300-500ms for realistic feel
  });
}

function validateWalletAddress(address: string): boolean {
  // Basic Solana address validation (32-44 chars, base58)
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function SearchStep() {
  const {
    socialSearches, addSocialSearch, removeSocialSearch,
    walletSearchQuery, setWalletSearchQuery,
    setStep, isLoading, setLoading, setRecipientWallet, setSearchQuery
  } = useGiftFlow();

  const [activePlatform, setActivePlatform] = useState('twitter');
  const [socialInput, setSocialInput] = useState('');
  const [liveResults, setLiveResults] = useState<SocialResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time social search
  const handleSocialInputChange = useCallback((value: string) => {
    setSocialInput(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!value.trim()) {
      setLiveResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await simulateRealTimeSearch(value, activePlatform);
      setLiveResults(results);
      setIsSearching(false);
    }, 250);
  }, [activePlatform]);

  // Add social handle
  const handleAddSocial = (result?: SocialResult) => {
    const handle = result?.handle || socialInput.trim();
    if (!handle) return;

    // Check if already added
    if (socialSearches.some(s => s.handle.toLowerCase() === handle.toLowerCase() && s.platform === activePlatform)) {
      return;
    }

    addSocialSearch(handle, activePlatform);
    setSocialInput('');
    setLiveResults([]);
  };

  // Wallet validation
  const handleWalletChange = (value: string) => {
    setWalletSearchQuery(value);
    setWalletError(null);

    if (value.trim() && !validateWalletAddress(value.trim())) {
      setWalletError('Invalid Solana address format');
    } else if (value.trim()) {
      setRecipientWallet(value.trim());
    }
  };

  const handleAnalyze = async () => {
    if (socialSearches.length === 0 && !walletSearchQuery.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    setLoading(false);
    setStep('profile');
  };

  const getPlatformConfig = (val: string) => PLATFORMS.find(p => p.value === val);

  const hasSearchData = socialSearches.length > 0 || (walletSearchQuery.trim() && !walletError);

  return (
    <div className="animate-slide-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-2xl surface-stellar-strong flex items-center justify-center mb-5">
          <Search className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-solar mb-2">Find Recipient</h2>
        <p className="text-slate-500 text-sm">Add social media handles + wallet for combined AI analysis</p>
      </div>

      <div className="surface-stellar-strong rounded-2xl p-6 space-y-6">
        {/* Wallet Input Section */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-amber-400/80 flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" />Wallet Address (Optional)
          </Label>
          <div className="relative">
            <Input
              placeholder="Enter Solana wallet address..."
              value={walletSearchQuery}
              onChange={(e) => handleWalletChange(e.target.value)}
              className={`h-12 bg-black/30 border-slate-700/50 text-slate-200 font-mono placeholder:text-slate-700 focus:border-amber-500/40 ${walletError ? 'border-red-500/50 focus:border-red-500' : ''}`}
            />
            {walletSearchQuery && !walletError && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
            )}
            {walletError && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
            )}
          </div>
          {walletError && <p className="text-[10px] text-red-400">{walletError}</p>}
          {walletSearchQuery && !walletError && (
            <p className="text-[10px] text-emerald-400/60 flex items-center gap-1"><Check className="h-3 w-3" />Wallet analysis enabled</p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800/50" />
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">AND/OR</span>
          <div className="flex-1 h-px bg-slate-800/50" />
        </div>

        {/* Social Media Section */}
        <div className="space-y-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Social Media Profiles</Label>

          {/* Platform Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isActive = activePlatform === platform.value;
              return (
                <button
                  key={platform.value}
                  onClick={() => { setActivePlatform(platform.value); setSocialInput(''); setLiveResults([]); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? `${platform.bg} ${platform.color} ${platform.border} border`
                      : 'surface-void text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {platform.label}
                </button>
              );
            })}
          </div>

          {/* Search Input for Selected Platform */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder={`Search ${getPlatformConfig(activePlatform)?.label} username...`}
                value={socialInput}
                onChange={(e) => handleSocialInputChange(e.target.value)}
                className="h-11 bg-black/30 border-slate-700/50 text-slate-200 placeholder:text-slate-700 focus:border-violet-500/40 pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isSearching && <Loader2 className="h-4 w-4 animate-spin text-violet-400/60" />}
                {socialInput.trim() && !isSearching && (
                  <button
                    onClick={() => handleAddSocial()}
                    className="h-7 px-2.5 rounded-md btn-solar text-[10px] flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />Add
                  </button>
                )}
              </div>
            </div>

            {/* Live Search Results */}
            {liveResults.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-[10px] text-violet-400/60 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />Live results from {getPlatformConfig(activePlatform)?.label}
                </p>
                {liveResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddSocial(result)}
                    className="w-full p-3 rounded-xl surface-void text-left hover:border-violet-500/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${getPlatformConfig(result.platform)?.bg || 'bg-slate-500/10'} flex items-center justify-center`}>
                        <span className="text-sm font-bold text-slate-400">{result.displayName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-300">{result.displayName}</p>
                        <p className="text-[10px] text-slate-600">@{result.handle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {result.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400/60">{tag}</span>
                        ))}
                      </div>
                      {result.verifiedWallet && (
                        <span className="inline-flex items-center" title="Has verified wallet"><Wallet className="h-3 w-3 text-amber-400/60" /></span>
                      )}
                      <span className="text-xs text-emerald-400/80 font-medium">{result.match}%</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Added Social Profiles */}
          {socialSearches.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-emerald-400/70 flex items-center gap-1"><Check className="h-3 w-3" />{socialSearches.length} profile{socialSearches.length > 1 ? 's' : ''} added for analysis</p>
              <div className="flex flex-wrap gap-2">
                {socialSearches.map((search, idx) => {
                  const config = getPlatformConfig(search.platform);
                  return (
                    <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config?.bg || 'bg-slate-500/10'} ${config?.border || 'border-slate-500/20'} border group`}>
                      {config && <config.icon className={`h-3.5 w-3.5 ${config.color}`} />}
                      <span className={`text-sm font-medium ${config?.color}`}>@{search.handle}</span>
                      <button onClick={() => removeSocialSearch(idx)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3 text-slate-500 hover:text-slate-300" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis Preview */}
        {hasSearchData && (
          <div className="p-4 rounded-xl surface-solar border border-amber-500/20">
            <p className="text-xs text-amber-400/80 flex items-center gap-2"><Zap className="h-3.5 w-3.5" />AI will combine:</p>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
              {walletSearchQuery && !walletError && (
                <li className="flex items-center gap-2">
                  <Wallet className="h-3 w-3 text-amber-400" />
                  On-chain wallet analytics
                </li>
              )}
              {socialSearches.length > 0 && (
                <li className="flex items-center gap-2">
                  <AtSign className="h-3 w-3 text-violet-400" />
                  Social interests from {socialSearches.length} platform{socialSearches.length > 1 ? 's' : ''}
                </li>
              )}
              <li className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                Cross-referenced interests + personalized gift
              </li>
            </ul>
          </div>
        )}

        {/* No Data Warning */}
        {!hasSearchData && (
          <div className="p-4 rounded-xl surface-void border border-slate-700/50">
            <p className="text-xs text-slate-500">Add at least one social profile or wallet address to analyze</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setStep('connect')} disabled={isLoading} className="flex-1 h-11 rounded-xl surface-stellar text-slate-500 hover:text-slate-300 flex items-center justify-center gap-2 transition-all">
            <ArrowLeft className="h-4 w-4" />Back
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !hasSearchData}
            className="flex-1 h-11 rounded-xl btn-solar flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-4 w-4" />Analyze</>}
          </button>
        </div>
      </div>
    </div>
  );
}
