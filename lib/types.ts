// GiftMind Types

export interface SocialInterest {
  topic: string;
  confidence: number;
  sources: string[];
}

export interface WalletInsight {
  type: string;
  label: string;
  confidence: number;
  details?: string;
}

export interface RecipientProfile {
  walletAddress?: string;
  socialHandle?: string;
  socialPlatform?: string;
  socialInterests: SocialInterest[];
  walletInsights: WalletInsight[];
  web3Interests: string[];
  personalitySummary: string;
  confidenceScores: Record<string, number>;
}

export interface GiftRecommendation {
  giftType: 'SOL' | 'NFT' | 'TOKEN';
  amount?: number;
  tokenSymbol?: string;
  reason: string;
  socialSignals: string;
  walletSignals: string;
  personalizedMessage: string;
  confidence: number;
}

export interface RankedRecommendation extends GiftRecommendation {
  rank: number;
  label: string;
}

export interface Gift {
  id: string;
  senderWallet: string;
  recipientWallet?: string;
  recipientSocialHandle?: string;
  recipientSocialPlatform?: string;
  giftType: string;
  giftAmount?: number;
  giftToken: string;
  senderMessage?: string;
  aiExplanation?: string;
  socialSignals?: Record<string, unknown>;
  walletSignals?: Record<string, unknown>;
  relationship?: string;
  transactionSignature?: string;
  status: 'pending' | 'completed' | 'claimed' | 'failed';
  claimCode: string;
  createdAt: string;
  claimedAt?: string;
}

export type Relationship = 'father' | 'boyfriend' | 'sibling';

export interface MockSocialProfile {
  handle: string;
  platform: string;
  bio: string;
  interests: string[];
  hashtags: string[];
  followers: number;
  verifiedWallet?: string;
  web3Identity?: string;
}
