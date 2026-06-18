import { NextResponse } from 'next/server';

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

    const [{ Connection, Keypair, PublicKey }, { Token, TOKEN_PROGRAM_ID }] = await Promise.all([
      import('@solana/web3.js'),
      import('@solana/spl-token'),
    ]);

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

    const mint = new PublicKey(mintAddress);
    const token = new Token(connection, mint, TOKEN_PROGRAM_ID, payer);

    const fromAta = await token.getOrCreateAssociatedAccountInfo(payer.publicKey);
    const toAta = await token.getOrCreateAssociatedAccountInfo(new PublicKey(recipientAddress));

    const signature = await token.transfer(fromAta.address, toAta.address, payer, [], 1);

    return NextResponse.json({ ok: true, signature });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
