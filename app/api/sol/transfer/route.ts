import { NextResponse } from 'next/server';

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

    const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

    let payer: any;
    if (secretRaw.trim().startsWith('[')) {
      payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretRaw)));
    } else {
      const bs58 = await import('bs58');
      const decode = (bs58 as any).default?.decode || (bs58 as any).decode;
      payer = Keypair.fromSecretKey(decode(secretRaw));
    }

    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpc, 'confirmed');

    const toPubkey = new PublicKey(recipientAddress);
    const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey, lamports })
    );
    const latest = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = latest.blockhash;
    tx.feePayer = payer.publicKey;

    const signature = await sendAndConfirmTransaction(connection, tx, [payer]);

    return NextResponse.json({ signature });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
