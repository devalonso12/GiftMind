import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

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

    const scriptPath = path.join(process.cwd(), 'scripts', 'transfer_sol.js');
    const cwd = process.cwd();
    const output = execSync(
      `node "${scriptPath}" "${recipientAddress}" ${amount}`,
      {
        cwd,
        env: {
          ...process.env,
          SOLANA_ESCROW_SECRET_KEY: secretRaw,
          SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        },
        timeout: 60000,
      }
    );

    const result = JSON.parse(output.toString().trim());
    return NextResponse.json(result);
  } catch (err: any) {
    const message = err?.stderr?.toString() || err?.stdout?.toString() || err?.message || String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
