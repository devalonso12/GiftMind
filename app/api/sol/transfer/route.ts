import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

export async function POST(req: Request) {
  try {
    const { recipientAddress, amount } = await req.json();

    if (!recipientAddress || !amount) {
      return NextResponse.json({ error: 'Missing recipientAddress or amount' }, { status: 400 });
    }

    const secretRaw = process.env.SOLANA_ESCROW_SECRET_KEY;
    if (!secretRaw) {
      return NextResponse.json({ error: 'SOLANA_ESCROW_SECRET_KEY not configured' }, { status: 500 });
    }

    let payer: Keypair;
    if (secretRaw.trim().startsWith('[')) {
      payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretRaw)));
    } else {
      payer = Keypair.fromSecretKey(bs58.decode(secretRaw));
    }

    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpc, 'confirmed');

    const bal = await connection.getBalance(payer.publicKey);
    if (bal < LAMPORTS_PER_SOL * 0.05) {
      await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL).catch(() => {});
    }

    const toPubkey = new PublicKey(recipientAddress);
    const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey,
        lamports,
      })
    );
    const latest = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = payer.publicKey;

    const signature = await sendAndConfirmTransaction(connection, tx, [payer]);

    return NextResponse.json({ signature });
  } catch (err: any) {
    const message = err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
