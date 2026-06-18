#!/usr/bin/env node
(async function main(){
  try {
    const web3 = require('@solana/web3.js');
    const bs58 = require('bs58');

    const rpc = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const payerSecret = process.env.SOLANA_SENDER_SECRET_KEY || process.env.SOLANA_ESCROW_SECRET_KEY;
    const destination = process.argv[2];
    const solAmount = Number(process.argv[3] || '0.1');

    if (!destination) {
      console.error('Usage: node scripts/transfer_sol.js <DESTINATION_WALLET> [amount_in_SOL]');
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

    const toPubkey = new web3.PublicKey(destination);
    const lamports = Math.round(solAmount * web3.LAMPORTS_PER_SOL);

    const tx = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey,
        lamports,
      })
    );
    const latest = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = payer.publicKey;

    const sig = await web3.sendAndConfirmTransaction(connection, tx, [payer]);

    process.stdout.write(JSON.stringify({ signature: sig }));
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
})();
