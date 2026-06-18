import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

type KeyInput = string | number[] | Uint8Array;

function parseKey(input: KeyInput): Keypair {
  if (!input) throw new Error('Missing secret key');
  if (typeof input === 'string') {
    const s = input.trim();
    if (s.startsWith('[')) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s)));
    return Keypair.fromSecretKey(bs58.decode(s));
  }
  if (Array.isArray(input)) return Keypair.fromSecretKey(Uint8Array.from(input));
  return Keypair.fromSecretKey(input);
}

export async function transferSPLToken(opts: {
  payerSecret: KeyInput;
  mintAddress: string;
  destination: string;
  amount: number;
  rpcUrl?: string;
}) {
  const { payerSecret, mintAddress, destination, amount, rpcUrl } = opts;
  const payer = parseKey(payerSecret);
  const rpc = rpcUrl || process.env.SOLANA_RPC_URL;
  if (!rpc) throw new Error('RPC URL not configured');
  const connection = new Connection(rpc, 'confirmed');

  const mint = new PublicKey(mintAddress);
  const token = new Token(connection, mint, TOKEN_PROGRAM_ID, payer);

  const fromAta = await token.getOrCreateAssociatedAccountInfo(payer.publicKey);
  const toAta = await token.getOrCreateAssociatedAccountInfo(new PublicKey(destination));

  const signature = await token.transfer(fromAta.address, toAta.address, payer, [], amount);

  return { ok: true, signature };
}

export async function mintNFT(opts: {
  payerSecret: KeyInput;
  rpcUrl?: string;
  decimals?: number;
  supply?: number;
}) {
  const { payerSecret, rpcUrl, decimals = 0, supply = 1 } = opts;
  const payer = parseKey(payerSecret);
  const rpc = rpcUrl || process.env.SOLANA_RPC_URL;
  if (!rpc) throw new Error('RPC URL not configured');
  const connection = new Connection(rpc, 'confirmed');

  const token = await Token.createMint(connection, payer, payer.publicKey, null, decimals, TOKEN_PROGRAM_ID);

  const ata = await token.getOrCreateAssociatedAccountInfo(payer.publicKey);
  await token.mintTo(ata.address, payer, [], supply);

  return { ok: true, mint: token.publicKey.toBase58(), ata: ata.address.toBase58() };
}
