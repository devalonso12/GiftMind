import { getConnection, getBalanceWithFallback } from './solana-config';

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount?: number;
}

async function getWeb3() {
  return import('@solana/web3.js');
}

export async function isValidSolanaAddress(address: string): Promise<boolean> {
  try {
    const { PublicKey } = await getWeb3();
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
    const { PublicKey, LAMPORTS_PER_SOL } = await getWeb3();
    const publicKey = new PublicKey(walletAddress);
    const balance = await getBalanceWithFallback(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

export async function requestAirdrop(walletAddress: string, amountSol: number = 2): Promise<string | null> {
  try {
    const { PublicKey, LAMPORTS_PER_SOL } = await getWeb3();
    const connection = await getConnection();
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

export function generateMockSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 87; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
}
