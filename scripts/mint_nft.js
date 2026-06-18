#!/usr/bin/env node
(async function main(){
  try {
    const web3 = require('@solana/web3.js');
    const splToken = require('@solana/spl-token');
    const bs58 = require('bs58');

    const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const payerSecret = process.env.SOLANA_SENDER_SECRET_KEY || process.env.SOLANA_ESCROW_SECRET_KEY;
    if (!payerSecret) {
      console.error('Set SOLANA_SENDER_SECRET_KEY or SOLANA_ESCROW_SECRET_KEY (JSON array or base58)');
      process.exit(1);
    }

    let payer;
    if (payerSecret.trim().startsWith('[')) {
      payer = web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(payerSecret)));
    } else {
      payer = web3.Keypair.fromSecretKey(bs58.decode(payerSecret));
    }

    const connection = new web3.Connection(rpc, 'confirmed');

    // Airdrop some SOL on devnet if needed (best-effort)
    try {
      const bal = await connection.getBalance(payer.publicKey);
      if (bal < web3.LAMPORTS_PER_SOL * 0.1) {
        await connection.requestAirdrop(payer.publicKey, web3.LAMPORTS_PER_SOL);
      }
    } catch (e) {
      // non-fatal
    }

    // Create mint (decimals = 0 for NFT-like) using legacy Token API
    const token = await splToken.Token.createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      0,
      splToken.TOKEN_PROGRAM_ID
    );

    // Get or create associated token account for payer
    const payerAta = await token.createAssociatedTokenAccount(payer.publicKey);

    // Mint 1 token to payer ATA (supply=1 -> NFT-like)
    const tx = await token.mintTo(payerAta, payer, [], 1);

    process.stdout.write(JSON.stringify({ mintAddress: token.publicKey.toBase58(), mintSignature: tx }));
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
})();
