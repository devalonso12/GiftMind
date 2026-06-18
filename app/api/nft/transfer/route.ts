import { NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export async function POST(req: Request) {
  try {
    const { mintAddress, recipientAddress } = await req.json();

    if (!mintAddress || !recipientAddress) {
      return NextResponse.json({ error: 'Missing mintAddress or recipientAddress' }, { status: 400 });
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

    const mint = new PublicKey(mintAddress);
    const token = new Token(connection, mint, TOKEN_PROGRAM_ID, payer);

    const fromAta = await token.getOrCreateAssociatedAccountInfo(payer.publicKey);
    const toAta = await token.getOrCreateAssociatedAccountInfo(new PublicKey(recipientAddress));

    const signature = await token.transfer(fromAta.address, toAta.address, payer, [], 1);

    return NextResponse.json({ ok: true, signature });
  } catch (err: any) {
    const message = err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
