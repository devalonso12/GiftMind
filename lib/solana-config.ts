import { Connection } from '@solana/web3.js';

const RPC_ENDPOINTS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  'https://api.devnet.solana.com',
  'https://solana-devnet-rpc.publicnode.com',
  'https://rpc.ankr.com/solana_devnet',
].filter(Boolean) as string[];

let currentRpcIndex = 0;

export const getConnection = () => {
  return new Connection(RPC_ENDPOINTS[currentRpcIndex] || RPC_ENDPOINTS[0], 'confirmed');
};

export const getBalanceWithFallback = async (publicKey: any): Promise<number> => {
  for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
    const idx = (currentRpcIndex + i) % RPC_ENDPOINTS.length;
    try {
      const conn = new Connection(RPC_ENDPOINTS[idx], 'confirmed');
      const bal = await conn.getBalance(publicKey);
      currentRpcIndex = idx;
      return bal;
    } catch {
      continue;
    }
  }
  throw new Error('All RPC endpoints unavailable');
};

export const LAMPORTS_PER_SOL = 1_000_000_000;

export const MIN_GIFT_AMOUNT = 0.01;
