import { WalletInsight } from './types';
import { getConnection, getBalanceWithFallback } from './solana-config';

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export interface WalletAnalysis {
  solBalance: number;
  insights: WalletInsight[];
  score?: number;
}

let web3Promise: Promise<any> | null = null;
async function getWeb3() {
  if (!web3Promise) web3Promise = import('@solana/web3.js');
  return web3Promise;
}

export async function analyzeWallet(walletAddress: string): Promise<WalletAnalysis> {
  const { PublicKey } = await getWeb3();

  let publicKey: any;
  try { publicKey = new PublicKey(walletAddress); } catch {
    throw new Error('Invalid wallet address');
  }

  const balance = await getBalanceWithFallback(publicKey);

  const RPC_ENDPOINTS = [
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    'https://api.devnet.solana.com',
    'https://solana-devnet-rpc.publicnode.com',
    'https://rpc.ankr.com/solana_devnet',
  ].filter(Boolean) as string[];

  let tokenHoldings: { mint: string; amount: number }[] = [];
  for (const url of RPC_ENDPOINTS) {
    try {
      const { Connection } = await getWeb3();
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
      });
      break;
    } catch { continue; }
  }

  const nftCount = tokenHoldings.filter(t => t.amount === 1).length;
  const activityScore = Math.min(100, (balance / 10) * 50 + nftCount * 5);
  const score = Math.round(activityScore);

  const insights: WalletInsight[] = [];
  if (balance > 5e9) insights.push({ type: 'whale', label: 'High-Value Wallet', confidence: 0.9 });
  if (nftCount > 5) insights.push({ type: 'collector', label: 'NFT Collector', confidence: 0.85 });
  if (tokenHoldings.length > 10) insights.push({ type: 'trader', label: 'Active Trader', confidence: 0.75 });

  return {
    solBalance: balance / 1e9,
    insights,
    score,
  };
}
