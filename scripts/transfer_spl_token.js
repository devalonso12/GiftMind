#!/usr/bin/env node
(async function main(){
  try {
    const web3 = require('@solana/web3.js');
    const splToken = require('@solana/spl-token');
    const bs58 = require('bs58');

    const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const payerSecret = process.env.SOLANA_SENDER_SECRET_KEY || process.env.SOLANA_ESCROW_SECRET_KEY;
    const mintAddress = process.argv[2];
    const destination = process.argv[3];
    const amount = Number(process.argv[4] || '1');

    if (!mintAddress || !destination) {
      console.error('Usage: node scripts/transfer_spl_token.js <MINT_ADDRESS> <DESTINATION_WALLET> [amount]');
      process.exit(1);
    }
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

    // Ensure escrow has SOL for fees
    try {
      const bal = await connection.getBalance(payer.publicKey);
      if (bal < web3.LAMPORTS_PER_SOL * 0.05) {
        await connection.requestAirdrop(payer.publicKey, web3.LAMPORTS_PER_SOL);
      }
    } catch (e) {
      // non-fatal
    }

    const mint = new web3.PublicKey(mintAddress);
    const token = new splToken.Token(connection, mint, splToken.TOKEN_PROGRAM_ID, payer);

    // Get or create ATA for payer
    const fromAta = await token.getOrCreateAssociatedAccountInfo(payer.publicKey);
    // Get or create ATA for destination
    const toPubkey = new web3.PublicKey(destination);
    const toAta = await token.getOrCreateAssociatedAccountInfo(toPubkey);

    // Transfer amount (pass payer Keypair as owner so it signs)
    const tx = await token.transfer(fromAta.address, toAta.address, payer, [], amount);

    process.stdout.write(JSON.stringify({ signature: tx }));
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
})();
