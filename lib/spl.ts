// Server-side helpers for SPL token / NFT flows.
// These functions perform best-effort operations and must be executed in a trusted server/worker environment.

type KeyInput = string | number[] | Uint8Array;

function parseKey(input: KeyInput) {
  const web3 = require('@solana/web3.js');
  const bs58 = require('bs58');
  if (!input) throw new Error('Missing secret key');
  if (typeof input === 'string') {
    const s = input.trim();
    if (s.startsWith('[')) return web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(s)));
    return web3.Keypair.fromSecretKey(bs58.decode(s));
  }
  if (Array.isArray(input)) return require('@solana/web3.js').Keypair.fromSecretKey(Uint8Array.from(input));
  return require('@solana/web3.js').Keypair.fromSecretKey(input);
}

export async function transferSPLToken(opts: {
  payerSecret: KeyInput; // JSON array or base58 string
  mintAddress: string;
  destination: string;
  amount: number; // in base token units (not decimals-adjusted)
  rpcUrl?: string;
}) {
  const { payerSecret, mintAddress, destination, amount, rpcUrl } = opts;
  const web3 = await import('@solana/web3.js');
  const splToken = await import('@solana/spl-token');

  const payer = parseKey(payerSecret as any);
  const connection = new web3.Connection(rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

  // get mint and ATAs
  const mint = new web3.PublicKey(mintAddress);
  const fromAta = await (splToken as any).getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  const toAta = await (splToken as any).getOrCreateAssociatedTokenAccount(connection, payer, mint, new web3.PublicKey(destination));

  // perform transfer
  const sig = await (splToken as any).transfer(
    connection,
    payer,
    fromAta.address,
    toAta.address,
    payer.publicKey,
    amount
  );

  return { ok: true, signature: sig };
}

export async function mintNFT(opts: {
  payerSecret: KeyInput;
  rpcUrl?: string;
  decimals?: number; // for NFT-like use 0
  supply?: number; // default 1
}) {
  const { payerSecret, rpcUrl, decimals = 0, supply = 1 } = opts;
  const web3 = await import('@solana/web3.js');
  const splToken = await import('@solana/spl-token');

  const payer = parseKey(payerSecret as any);
  const connection = new web3.Connection(rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

  // create mint
  const mint = await (splToken as any).createMint(connection, payer, payer.publicKey, null, decimals);

  // create associated token account and mint to it
  const ata = await (splToken as any).getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  const tx = await (splToken as any).mintTo(connection, payer, mint, ata.address, payer.publicKey, supply);

  return { ok: true, mint: mint.toBase58(), ata: ata.address.toBase58(), tx }; 
}
