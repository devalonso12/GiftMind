#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2] || '';
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

async function main() {
  loadLocalEnv();
  const pub = process.env.NEXT_PUBLIC_SOLANA_ESCROW_PUBLIC_KEY;
  if (!pub) {
    console.error('No NEXT_PUBLIC_SOLANA_ESCROW_PUBLIC_KEY found in env or .env.local');
    process.exit(1);
  }
  const amountArg = process.argv[2] || '1';
  const amount = parseFloat(amountArg) || 1;
  const rpc = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpc, 'confirmed');
  try {
    console.log(`Requesting airdrop of ${amount} SOL to ${pub} via ${rpc}...`);
    const sig = await connection.requestAirdrop(new PublicKey(pub), Math.round(amount * LAMPORTS_PER_SOL));
    console.log('Airdrop tx signature:', sig);
    const latest = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ signature: sig, ...latest });
    const balance = await connection.getBalance(new PublicKey(pub));
    console.log(`Airdrop confirmed. Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  } catch (err) {
    console.error('Airdrop failed:', err?.message || err);
    process.exit(2);
  }
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
