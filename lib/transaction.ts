import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getBalanceWithFallback } from './solana-config';

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount?: number;
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function getExplorerLink(signature: string, cluster: 'devnet' | 'mainnet' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export async function checkBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await getBalanceWithFallback(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

export async function requestAirdrop(walletAddress: string, amountSol: number = 2): Promise<string | null> {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletAddress);
    const signature = await connection.requestAirdrop(publicKey, amountSol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  } catch {
    return null;
  }
}

export async function checkSufficientBalance(
  walletAddress: string,
  requiredSol: number
): Promise<{ sufficient: boolean; balance: number }> {
  try {
    const balance = await checkBalance(walletAddress);
    return {
      sufficient: balance >= requiredSol + 0.001,
      balance
    };
  } catch {
    return { sufficient: false, balance: 0 };
  }
}

// Generate mock signature for demo
export function generateMockSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 87; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
}
