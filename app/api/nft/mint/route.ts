import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { recipientAddress } = await req.json();

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

    const token = await Token.createMint(connection, payer, payer.publicKey, null, 0, TOKEN_PROGRAM_ID);

    const recipient = recipientAddress ? new PublicKey(recipientAddress) : payer.publicKey;
    const ata = await token.getOrCreateAssociatedAccountInfo(recipient);

    await token.mintTo(ata.address, payer, [], 1);

    return NextResponse.json({
      ok: true,
      mint: token.publicKey.toBase58(),
      ata: ata.address.toBase58(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
