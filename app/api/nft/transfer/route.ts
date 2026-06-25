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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function rpcCall(url: string, method: string, params: any[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

function buildTx(signers: { seed: Uint8Array }[], accounts: Uint8Array[], header: Uint8Array, blockhash: Uint8Array, instructions: { programIdIndex: number; accounts: number[]; data: Uint8Array }[], ed25519: any): Uint8Array {
  const accountsCompact = new Uint8Array(1 + accounts.length * 32);
  accountsCompact[0] = accounts.length;
  for (let i = 0; i < accounts.length; i++) accountsCompact.set(accounts[i], 1 + i * 32);

  let ixBody = new Uint8Array(0);
  for (const ix of instructions) {
    const part = new Uint8Array(1 + 1 + ix.accounts.length + 1 + ix.data.length);
    part[0] = ix.programIdIndex;
    part[1] = ix.accounts.length;
    for (let j = 0; j < ix.accounts.length; j++) part[2 + j] = ix.accounts[j];
    part[2 + ix.accounts.length] = ix.data.length;
    part.set(ix.data, 3 + ix.accounts.length);
    const newBody = new Uint8Array(ixBody.length + part.length);
    newBody.set(ixBody, 0); newBody.set(part, ixBody.length);
    ixBody = newBody;
  }

  const b32 = new Uint8Array(32);
  b32.set(blockhash);

  const message = new Uint8Array(3 + accountsCompact.length + 32 + 1 + ixBody.length);
  message.set(header, 0);
  message.set(accountsCompact, 3);
  message.set(b32, 3 + accountsCompact.length);
  message[3 + accountsCompact.length + 32] = instructions.length;
  message.set(ixBody, 3 + accountsCompact.length + 33);

  const txBytes = new Uint8Array(1 + signers.length * 64 + message.length);
  txBytes[0] = signers.length;
  for (let i = 0; i < signers.length; i++) {
    const sig = ed25519.sign(message, signers[i].seed);
    txBytes.set(sig, 1 + i * 64);
  }
  txBytes.set(message, 1 + signers.length * 64);
  return txBytes;
}

async function findAtaAddress(wallet: Uint8Array, mint: Uint8Array, tokenProgId: Uint8Array, ataProgId: Uint8Array): Promise<Uint8Array> {
  const PREFIX = new TextEncoder().encode('ProgramDerivedAddress');
  for (let bump = 255; bump >= 0; bump--) {
    const inp = new Uint8Array(wallet.length + tokenProgId.length + mint.length + 1 + ataProgId.length + PREFIX.length);
    inp.set(wallet, 0);
    inp.set(tokenProgId, wallet.length);
    inp.set(mint, wallet.length + tokenProgId.length);
    inp[wallet.length + tokenProgId.length + mint.length] = bump;
    inp.set(ataProgId, wallet.length + tokenProgId.length + mint.length + 1);
    inp.set(PREFIX, wallet.length + tokenProgId.length + mint.length + 1 + ataProgId.length);
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', inp));
    const y = new Uint8Array(hash.slice(0, 32));
    y[31] &= 0x7f;
    const p = new Uint8Array([237, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 127]);
    let less = false;
    for (let i = 31; i >= 0; i--) {
      if (y[i] < p[i]) { less = true; break; }
      if (y[i] > p[i]) { break; }
    }
    if (less) return hash.slice(0, 32);
  }
  throw new Error('Could not find ATA address');
}

export async function POST(req: Request) {
  try {
    const { mintAddress, recipientAddress } = await req.json();
    if (!mintAddress || !recipientAddress) {
      return NextResponse.json({ error: 'Missing mintAddress or recipientAddress' }, { status: 400 });
    }

    const secretRaw = process.env.SOLANA_ESCROW_SECRET_KEY;
    if (!secretRaw) return NextResponse.json({ error: 'SOLANA_ESCROW_SECRET_KEY not configured' }, { status: 500 });

    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

    let secretBytes: Uint8Array;
    if (secretRaw.trim().startsWith('[')) secretBytes = Uint8Array.from(JSON.parse(secretRaw));
    else secretBytes = bs58Decode(secretRaw);
    const payerSeed = secretBytes.slice(0, 32);

    const { ed25519 } = await import('@noble/curves/ed25519');
    const payerPubkey = ed25519.getPublicKey(payerSeed);
    const mintPk = bs58Decode(mintAddress);
    const recipientPk = bs58Decode(recipientAddress);

    const sysProgId = new Uint8Array(32);
    const tokenProgId = bs58Decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ataProgId = bs58Decode('ATokenGPvbdGVxr1b2hvZbsiqW5xr25ot9nBqF4CxY9P');

    // Derive source and destination ATA
    const sourceAta = await findAtaAddress(payerPubkey, mintPk, tokenProgId, ataProgId);
    const destAta = await findAtaAddress(recipientPk, mintPk, tokenProgId, ataProgId);

    // Ensure recipient has an ATA (Create if needed)
    // Check if destAta exists
    const destAcctInfo = await rpcCall(rpc, 'getAccountInfo', [bs58Encode(destAta), { commitment: 'confirmed' }]);
    if (!destAcctInfo) {
      // Create ATA for recipient
      const bh = await rpcCall(rpc, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
      const bhBytes = bs58Decode(bh.value.blockhash);
      const accts = [payerPubkey, destAta, recipientPk, mintPk, sysProgId, tokenProgId, ataProgId];
      const hdr = new Uint8Array([1, 0, 5]);
      const tx = buildTx(
        [{ seed: payerSeed }], accts, hdr, bhBytes,
        [{ programIdIndex: 5, accounts: [0, 6, 1, 2, 3, 4], data: new Uint8Array(0) }],
        ed25519
      );
      await rpcCall(rpc, 'sendTransaction', [uint8ArrayToBase64(tx), { encoding: 'base64', skipPreflight: true }]);
    }

    // Transfer 1 token: Transfer instruction (tag 3)
    // Accounts: [source, destination, owner]
    // Data: tag(u8=3) + amount(u64=1)
    const transferData = new Uint8Array(9);
    transferData[0] = 3;
    transferData.set(u64LeBytes(1), 1);

    const bh = await rpcCall(rpc, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
    const bhBytes = bs58Decode(bh.value.blockhash);

    // Accounts: [payer, tokenProg, sourceAta, destAta]
    // header [1,0,1]: payer signer, tokenProg readonly, source+dest writable unsigned
    // instruction: programIdIndex=1 (tokenProg), accounts=[2,3,0] (source, dest, owner)
    const accts = [payerPubkey, tokenProgId, sourceAta, destAta];
    const hdr = new Uint8Array([1, 0, 1]);
    const sig = await rpcCall(rpc, 'sendTransaction', [
      uint8ArrayToBase64(buildTx([{ seed: payerSeed }], accts, hdr, bhBytes, [{ programIdIndex: 1, accounts: [2, 3, 0], data: transferData }], ed25519)),
      { encoding: 'base64', skipPreflight: true }
    ]);

    return NextResponse.json({ ok: true, signature: sig });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
