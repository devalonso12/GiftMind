import { getConnection } from './solana-config';

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

const KNOWN_TOKENS: Record<string, string> = {
  'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': 'SRM',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': 'SAMO',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'wBTC',
  '2FPyTwcZLUg1MDrwsBk3BcM89T3iCByB8ePKwbK4UaYP': 'SOLAR',
  'AZsHEMXd36Bj1EMNXhowJ4un2A31M6JXwMyQ3Wr2KbpQ': 'SHDW',
  '8LH3QkC1PfN2hcSNWX6FBps2YYUYfJzMYCXLZFYTNdY9': 'SCNSOL',
};

export async function fetchWalletTokens(address: string) {
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const connection = await getConnection();
  const publicKey = new PublicKey(address);

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });

  const tokens = tokenAccounts.value
    .filter((account: any) => {
      const info = account.account.data.parsed.info;
      const amount = parseInt(info.tokenAmount.amount);
      return amount > 0;
    })
    .map((account: any) => {
      const info = account.account.data.parsed.info;
      const mint = info.mint;
      const amount = parseFloat(info.tokenAmount.uiAmountString || '0');
      const symbol = KNOWN_TOKENS[mint] || mint.slice(0, 6) + '...';

      return {
        mint,
        symbol,
        amount,
        decimals: info.tokenAmount.decimals,
      };
    });

  return tokens;
}
