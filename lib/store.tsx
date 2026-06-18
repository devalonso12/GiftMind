'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { RecipientProfile, GiftRecommendation, Relationship } from './types';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getBalanceWithFallback } from './solana-config';

interface SocialSearch {
  handle: string;
  platform: string;
}

interface GiftFlowState {
  currentStep: 'connect' | 'relationship' | 'search' | 'profile' | 'recommend' | 'approve' | 'send' | 'complete';
  senderWallet: { address: string; balance: number; connected: boolean; tokens?: { mint: string; amount: number; symbol?: string }[] } | null;
  socialSearches: SocialSearch[];
  walletSearchQuery: string;
  searchType: 'wallet' | 'social' | 'combined';
  searchQuery: string;
  searchPlatform: string;
  recipientProfile: RecipientProfile | null;
  recipientWallet: string | null;
  relationship: Relationship;
  customRelationship: string;
  recommendation: GiftRecommendation | null;
  transactionSignature: string | null;
  amount: number;
  giftId: string | null;
  claimCode: string | null;
  senderMessage: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: GiftFlowState = {
  currentStep: 'connect',
  senderWallet: null,
  socialSearches: [],
  walletSearchQuery: '',
  searchType: 'combined',
  searchQuery: '',
  searchPlatform: 'twitter',
  recipientProfile: null,
  recipientWallet: null,
  relationship: 'sibling',
  customRelationship: '',
  recommendation: null,
  transactionSignature: null,
  amount: 0.1,
  giftId: null,
  claimCode: null,
  senderMessage: '',
  isLoading: false,
  error: null
};

interface GiftFlowContextType extends GiftFlowState {
  setStep: (step: GiftFlowState['currentStep']) => void;
  setSenderWallet: (wallet: GiftFlowState['senderWallet']) => void;
  disconnectWallet: () => void;
  setSocialSearches: (searches: SocialSearch[]) => void;
  addSocialSearch: (handle: string, platform: string) => void;
  removeSocialSearch: (index: number) => void;
  setWalletSearchQuery: (query: string) => void;
  setSearchType: (type: 'wallet' | 'social' | 'combined') => void;
  setSearchQuery: (query: string) => void;
  setSearchPlatform: (platform: string) => void;
  setRecipientProfile: (profile: RecipientProfile | null) => void;
  setRecipientWallet: (wallet: string | null) => void;
  setRelationship: (relationship: Relationship) => void;
  setCustomRelationship: (relationship: string) => void;
  setRecommendation: (recommendation: GiftRecommendation | null) => void;
  setTransactionSignature: (signature: string | null) => void;
  setAmount: (amount: number) => void;
  setSenderMessage: (message: string) => void;
  setGiftId: (id: string | null) => void;
  setClaimCode: (code: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetFlow: () => void;
  updateSenderBalance: () => Promise<void>;
}

const GiftFlowContext = createContext<GiftFlowContextType | null>(null);

export function GiftFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GiftFlowState>(initialState);

  const setStep = useCallback((step: GiftFlowState['currentStep']) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setSenderWallet = useCallback((wallet: GiftFlowState['senderWallet']) => {
    setState(prev => ({ ...prev, senderWallet: wallet }));
  }, []);

  const disconnectWallet = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        const w = window as unknown as any;
        if (w.solana && typeof w.solana.disconnect === 'function') {
          try { w.solana.disconnect(); } catch (_) { /* ignore */ }
        }
        if (w.solflare && typeof w.solflare.disconnect === 'function') {
          try { w.solflare.disconnect(); } catch (_) { /* ignore */ }
        }
      }
    } catch (e) {
      // ignore provider disconnect errors
    } finally {
      setState({
        ...initialState,
      });
    }
  }, []);

  const setSocialSearches = useCallback((searches: SocialSearch[]) => {
    setState(prev => ({ ...prev, socialSearches: searches }));
  }, []);

  const addSocialSearch = useCallback((handle: string, platform: string) => {
    setState(prev => ({
      ...prev,
      socialSearches: [...prev.socialSearches, { handle, platform }]
    }));
  }, []);

  const removeSocialSearch = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      socialSearches: prev.socialSearches.filter((_, i) => i !== index)
    }));
  }, []);

  const setWalletSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, walletSearchQuery: query }));
  }, []);

  const setSearchType = useCallback((type: 'wallet' | 'social' | 'combined') => {
    setState(prev => ({ ...prev, searchType: type }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setSearchPlatform = useCallback((platform: string) => {
    setState(prev => ({ ...prev, searchPlatform: platform }));
  }, []);

  const setRecipientProfile = useCallback((profile: RecipientProfile | null) => {
    setState(prev => ({ ...prev, recipientProfile: profile }));
  }, []);

  const setRecipientWallet = useCallback((wallet: string | null) => {
    setState(prev => ({ ...prev, recipientWallet: wallet }));
  }, []);

  const setRelationship = useCallback((relationship: Relationship) => {
    setState(prev => ({ ...prev, relationship }));
  }, []);

  const setCustomRelationship = useCallback((relationship: string) => {
    setState(prev => ({ ...prev, customRelationship: relationship }));
  }, []);

  const setRecommendation = useCallback((recommendation: GiftRecommendation | null) => {
    setState(prev => ({ ...prev, recommendation }));
  }, []);

  const setTransactionSignature = useCallback((signature: string | null) => {
    setState(prev => ({ ...prev, transactionSignature: signature }));
  }, []);

  const setAmount = useCallback((amount: number) => {
    setState(prev => ({ ...prev, amount }));
  }, []);

  const setSenderMessage = useCallback((message: string) => {
    setState(prev => ({ ...prev, senderMessage: message }));
  }, []);

  const setGiftId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, giftId: id }));
  }, []);

  const setClaimCode = useCallback((code: string | null) => {
    setState(prev => ({ ...prev, claimCode: code }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const resetFlow = useCallback(() => {
    setState(prev => ({
      ...initialState,
      senderWallet: prev.senderWallet // Keep wallet connected on reset
    }));
  }, []);

  const updateSenderBalance = useCallback(async () => {
    if (!state.senderWallet?.address) return;
    try {
      const { PublicKey } = await import('@solana/web3.js');
      const publicKey = new PublicKey(state.senderWallet.address);
      const balance = await getBalanceWithFallback(publicKey);
      setState(prev => ({
        ...prev,
        senderWallet: prev.senderWallet
          ? { ...prev.senderWallet, balance: balance / LAMPORTS_PER_SOL }
          : null
      }));
    } catch {
      // Silent fail
    }
  }, [state.senderWallet?.address]);

  return (
    <GiftFlowContext.Provider value={{
      ...state,
      setStep,
      setSenderWallet,
      disconnectWallet,
      setSocialSearches,
      addSocialSearch,
      removeSocialSearch,
      setWalletSearchQuery,
      setSearchType,
      setSearchQuery,
      setSearchPlatform,
      setRecipientProfile,
      setRecipientWallet,
      setRelationship,
      setCustomRelationship,
      setRecommendation,
      setTransactionSignature,
      setAmount,
      setSenderMessage,
      setGiftId,
      setClaimCode,
      setLoading,
      setError,
      resetFlow,
      updateSenderBalance
    }}>
      {children}
    </GiftFlowContext.Provider>
  );
}

export function useGiftFlow() {
  const context = useContext(GiftFlowContext);
  if (!context) {
    throw new Error('useGiftFlow must be used within GiftFlowProvider');
  }
  return context;
}
