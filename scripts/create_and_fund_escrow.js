#!/usr/bin/env node
/*
 * Create a new Solana Devnet escrow keypair, airdrop SOL, and print env vars to set.
 * Usage: node scripts/create_and_fund_escrow.js [amount]
 * Example: `node scripts/create_and_fund_escrow.js 1` (1 SOL)
 */

const { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function main() {
  const amountArg = process.argv[2] || '1';
  const amount = parseFloat(amountArg) || 1;

  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('Creating new escrow keypair...');
  const escrow = Keypair.generate();
  const secretArray = Array.from(escrow.secretKey);

  console.log('\nEscrow Public Key:');
  console.log(escrow.publicKey.toBase58());

  console.log('\nEscrow Secret Key (JSON array) — keep this private:');
  console.log(JSON.stringify(secretArray));

  console.log(`\nRequesting airdrop of ${amount} SOL to escrow (Devnet)...`);
  try {
    const sig = await connection.requestAirdrop(escrow.publicKey, Math.round(amount * LAMPORTS_PER_SOL));
    console.log('Airdrop tx signature:', sig);
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: sig, ...latest });
    const balance = await connection.getBalance(escrow.publicKey);
    console.log(`Airdrop confirmed. Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (err) {
    console.error('Airdrop failed:', err?.message || err);
    console.log('You can manually fund the escrow using https://faucet.solana.com');
    console.log('Or set SOLANA_RPC_URL to a different RPC provider and retry.');
  }

  console.log('\nSet these environment variables in your .env.local or server environment:');
  console.log('SOLANA_ESCROW_SECRET_KEY=' + JSON.stringify(secretArray));
  console.log('NEXT_PUBLIC_SOLANA_ESCROW_PUBLIC_KEY=' + escrow.publicKey.toBase58());

  console.log('\nIMPORTANT: Keep the secret key private. Do NOT commit it to version control.');
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
