import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function POST(req: Request) {
  try {
    const { recipientAddress, amount } = await req.json();

    if (!recipientAddress || !amount) {
      return NextResponse.json({ error: 'Missing recipientAddress or amount' }, { status: 400 });
    }

    const solAmount = Number(amount);
    if (!isFinite(solAmount) || solAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const secretRaw = process.env.SOLANA_ESCROW_SECRET_KEY;
    if (!secretRaw) {
      return NextResponse.json({ error: 'SOLANA_ESCROW_SECRET_KEY not configured' }, { status: 500 });
    }

    let payer: Keypair;
    if (secretRaw.trim().startsWith('[')) {
      payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretRaw)));
    } else {
      const bs58 = await import('bs58');
      payer = Keypair.fromSecretKey((bs58 as any).default ? (bs58 as any).default.decode(secretRaw) : bs58.decode(secretRaw));
    }

    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!rpc) {
      return NextResponse.json({ error: 'SOLANA_RPC_URL not configured' }, { status: 500 });
    }
    const connection = new Connection(rpc, 'confirmed');

    const toPubkey = new PublicKey(recipientAddress);
    const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

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
