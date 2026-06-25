import { NextResponse } from 'next/server';

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function bs58Encode(buf: Uint8Array): string {
  const d = Uint8Array.from(buf);
  const digits = [0];
  for (let i = 0; i < d.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += d[i];
    let c = 0;
    for (let j = 0; j < digits.length; j++) { digits[j] += c; c = (digits[j] / 58) | 0; digits[j] %= 58; }
    while (c) { digits.push(c % 58); c = (c / 58) | 0; }
  }
  for (let i = 0; i < d.length && d[i] === 0; i++) digits.push(0);
  return digits.reverse().map(x => ALPHABET[x]).join('');
}

function bs58Decode(s: string): Uint8Array {
  const decoded: number[] = [];
  for (const ch of s) {
    const d = ALPHABET.indexOf(ch);
    if (d === -1) throw new Error('Invalid base58');
    let carry = d;
    for (let j = 0; j < decoded.length; j++) { carry += decoded[j] * 58; decoded[j] = carry & 0xff; carry >>= 8; }
    while (carry > 0) { decoded.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of s) { if (ch === '1') decoded.push(0); else break; }
  return Uint8Array.from(decoded.reverse());
}

function u64LeBytes(v: number): Uint8Array {
  const buf = new Uint8Array(8);
  for (let i = 0; i < 8; i++) { buf[i] = v & 0xff; v = Math.floor(v / 256); }
  return buf;
}

async function rpcCall(url: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message}`);
  return data.result;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function buildAndSignTransfer(
  fromPubkey: Uint8Array, toPubkey: Uint8Array, sysProgId: Uint8Array,
  blockhash: Uint8Array, lamports: number, seed: Uint8Array,
  ed25519: any
): Uint8Array {
  const header = new Uint8Array([1, 0, 1]);

  const accountKeys = new Uint8Array(1 + 32 * 3);
  accountKeys[0] = 3;
  accountKeys.set(fromPubkey, 1);
  accountKeys.set(toPubkey, 33);
  accountKeys.set(sysProgId, 65);

  const b32 = new Uint8Array(32);
  b32.set(blockhash);

  const ixData = new Uint8Array(12);
  ixData[0] = 2; ixData[1] = 0; ixData[2] = 0; ixData[3] = 0;
  ixData.set(u64LeBytes(lamports), 4);

  const instruction = new Uint8Array(1 + 1 + 2 + 1 + 12);
  instruction[0] = 2;
  instruction[1] = 2;
  instruction[2] = 0;
  instruction[3] = 1;
  instruction[4] = 12;
  instruction.set(ixData, 5);

  const instructionsArr = new Uint8Array(1 + instruction.length);
  instructionsArr[0] = 1;
  instructionsArr.set(instruction, 1);

  const message = new Uint8Array(3 + accountKeys.length + 32 + instructionsArr.length);
  message.set(header, 0);
  message.set(accountKeys, 3);
  message.set(b32, 3 + accountKeys.length);
  message.set(instructionsArr, 3 + accountKeys.length + 32);

  const signature = ed25519.sign(message, seed);
  const sigArr = new Uint8Array(signature);

  const txBytes = new Uint8Array(1 + 64 + message.length);
  txBytes[0] = 1;
  txBytes.set(sigArr, 1);
  txBytes.set(message, 65);

  return txBytes;
}

export async function POST(req: Request) {
  try {
    const { recipientAddress, amount } = await req.json();
    if (!recipientAddress || !amount) return NextResponse.json({ error: 'Missing recipientAddress or amount' }, { status: 400 });

    const solAmount = Number(amount);
    if (!isFinite(solAmount) || solAmount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    const secretRaw = process.env.SOLANA_ESCROW_SECRET_KEY;
    if (!secretRaw) return NextResponse.json({ error: 'SOLANA_ESCROW_SECRET_KEY not configured' }, { status: 500 });

    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const lamports = Math.round(solAmount * 1_000_000_000);

    let secretBytes: Uint8Array;
    if (secretRaw.trim().startsWith('[')) secretBytes = Uint8Array.from(JSON.parse(secretRaw));
    else secretBytes = bs58Decode(secretRaw);
    const seed = secretBytes.slice(0, 32);

    const { ed25519 } = await import('@noble/curves/ed25519');
    const fromPubkeyBytes = ed25519.getPublicKey(seed);
    const toPubkeyBytes = bs58Decode(recipientAddress);
    const sysProgId = new Uint8Array(32);

    // Airdrop if needed
    const bal = await rpcCall(rpc, 'getBalance', [bs58Encode(fromPubkeyBytes), { commitment: 'confirmed' }]);
    if (bal.value < lamports + 10000) {
      try { await rpcCall(rpc, 'requestAirdrop', [bs58Encode(fromPubkeyBytes), 1_000_000_000]); await new Promise(r => setTimeout(r, 3000)); } catch {}
    }

    // Try sending with retries on blockhash expiry
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const bh = await rpcCall(rpc, 'getLatestBlockhash', [{ commitment: 'processed' }]);
        const blockhashBytes = bs58Decode(bh.value.blockhash);
        const txBytes = buildAndSignTransfer(fromPubkeyBytes, toPubkeyBytes, sysProgId, blockhashBytes, lamports, seed, ed25519);
        const txBase64 = uint8ArrayToBase64(txBytes);
        const result = await rpcCall(rpc, 'sendTransaction', [txBase64, { encoding: 'base64', skipPreflight: true, maxRetries: 5 }]);
        return NextResponse.json({ signature: result });
      } catch (e: any) {
        lastError = e;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw lastError || new Error('Transaction failed after retries');
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
