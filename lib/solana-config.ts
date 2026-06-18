import { Connection } from '@solana/web3.js';

export const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com';

export const getConnection = () => new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');

export const LAMPORTS_PER_SOL = 1_000_000_000;

export const MIN_GIFT_AMOUNT = 0.01;
