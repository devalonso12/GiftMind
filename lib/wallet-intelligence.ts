import { Connection, PublicKey } from '@solana/web3.js';
import { WalletInsight } from './types';
import { getConnection, getBalanceWithFallback } from './solana-config';

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export interface WalletAnalysis {
  solBalance: number;
  tokenHoldings: { mint: string; amount: number }[];
  nftCount: number;
  transactionCount: number;
  insights: WalletInsight[];
  activityLevel: 'high' | 'medium' | 'low';
}

export async function analyzeWallet(walletAddress: string): Promise<WalletAnalysis> {
  let publicKey: any;

  try {
    publicKey = new PublicKey(walletAddress);
  } catch {
    throw new Error('Invalid wallet address');
  }

  const balance = await getBalanceWithFallback(publicKey);
  const solBalance = balance / 1_000_000_000;

  let tokenHoldings: { mint: string; amount: number }[] = [];
  for (const url of [
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    'https://api.devnet.solana.com',
    'https://solana-devnet-rpc.publicnode.com',
    'https://rpc.ankr.com/solana_devnet',
  ].filter(Boolean) as string[]) {
    try {
      const conn = new Connection(url, 'confirmed');
      const tokenAccounts = await conn.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey(TOKEN_PROGRAM_ID),
      });
      tokenHoldings = tokenAccounts.value.map((account: any) => {
        const info = account.account.data.parsed.info;
        return {
          mint: info.mint,
          amount: parseFloat(info.tokenAmount.uiAmountString || '0'),
        };
      }).filter((t: any) => t.amount > 0);
      break;
    } catch {
      continue;
    }
  }

  let signatures: { signature: string; blockTime?: number | null }[] = [];
  try {
    const connection = getConnection();
    signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });
  } catch {
    // No signatures
  }

  const transactionCount = signatures.length;

  const insights = generateWalletInsights(solBalance, tokenHoldings, transactionCount);
  const activityLevel = calculateActivityLevel(transactionCount);

  return {
    solBalance,
    tokenHoldings,
    nftCount: tokenHoldings.filter(t => t.amount === 1).length,
    transactionCount,
    insights,
    activityLevel
  };
}

function calculateActivityLevel(txCount: number): 'high' | 'medium' | 'low' {
  if (txCount >= 30) return 'high';
  if (txCount >= 10) return 'medium';
  return 'low';
}

function generateWalletInsights(
  solBalance: number,
  tokens: { mint: string; amount: number }[],
  txCount: number
): WalletInsight[] {
  const insights: WalletInsight[] = [];

  if (solBalance >= 10) {
    insights.push({
      type: 'holder',
      label: 'Significant SOL Holder',
      confidence: 0.9,
      details: `Holds ${solBalance.toFixed(2)} SOL`
    });
  } else if (solBalance >= 1) {
    insights.push({
      type: 'holder',
      label: 'Active SOL User',
      confidence: 0.8,
      details: `Holds ${solBalance.toFixed(2)} SOL`
    });
  }

  if (tokens.length >= 5) {
    insights.push({
      type: 'diversified',
      label: 'Diversified Token Portfolio',
      confidence: 0.85,
      details: `Holds ${tokens.length} different tokens`
    });
  }

  const nftCount = tokens.filter(t => t.amount === 1).length;
  if (nftCount >= 3) {
    insights.push({
      type: 'nft_collector',
      label: 'NFT Collector',
      confidence: 0.75,
      details: `Estimated ${nftCount}+ NFTs`
    });
  }

  if (txCount >= 20) {
    insights.push({
      type: 'active',
      label: 'Highly Active User',
      confidence: 0.9,
      details: `${txCount} transactions`
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'new',
      label: 'New to Solana',
      confidence: 0.6,
      details: 'Low activity detected'
    });
  }

  return insights;
}

export async function checkWalletExists(walletAddress: string): Promise<boolean> {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance >= 0;
  } catch {
    return false;
  }
}
