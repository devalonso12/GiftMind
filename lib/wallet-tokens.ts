import { Connection, PublicKey } from '@solana/web3.js';
import { getConnection } from './solana-config';

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// Well-known Devnet tokens
const KNOWN_TOKENS: Record<string, string> = {
  'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': 'SRM',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'wBTC',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963vox': 'wETH',
};

export async function fetchWalletTokens(address: string): Promise<{ mint: string; amount: number; symbol?: string }[]> {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(address);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey(TOKEN_PROGRAM_ID),
    });

    return tokenAccounts.value
      .map((account: any) => {
        const info = account.account.data.parsed.info;
        const mint = info.mint;
        const amount = parseFloat(info.tokenAmount.uiAmountString || '0');
        if (amount <= 0) return null;
        return {
          mint,
          amount,
          symbol: KNOWN_TOKENS[mint] || mint.slice(0, 6) + '...',
        };
      })
      .filter(Boolean) as { mint: string; amount: number; symbol?: string }[];
  } catch {
    return [];
  }
}
