import { NextResponse } from 'next/server';
import crypto from 'crypto';

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

function buildTx(signers: { seed: Uint8Array; pubkey: Uint8Array }[], accounts: Uint8Array[], header: Uint8Array, blockhash: Uint8Array, instructions: { programIdIndex: number; accounts: number[]; data: Uint8Array }[], ed25519: any): Uint8Array {
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
    const { recipientAddress } = await req.json();
    const secretRaw = process.env.SOLANA_ESCROW_SECRET_KEY;
    if (!secretRaw) return NextResponse.json({ error: 'SOLANA_ESCROW_SECRET_KEY not configured' }, { status: 500 });

    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

    let secretBytes: Uint8Array;
    if (secretRaw.trim().startsWith('[')) secretBytes = Uint8Array.from(JSON.parse(secretRaw));
    else secretBytes = bs58Decode(secretRaw);
    const payerSeed = secretBytes.slice(0, 32);

    const { ed25519 } = await import('@noble/curves/ed25519');
    const payerPubkey = ed25519.getPublicKey(payerSeed);
    const recipientPk = recipientAddress ? bs58Decode(recipientAddress) : payerPubkey;
    const payerAddr = bs58Encode(payerPubkey);

    const bal = await rpcCall(rpc, 'getBalance', [payerAddr, { commitment: 'confirmed' }]);
    if (bal.value < 2000000) {
      try { await rpcCall(rpc, 'requestAirdrop', [payerAddr, 2_000_000_000]); await new Promise(r => setTimeout(r, 3000)); } catch {}
    }

    const sysProgId = new Uint8Array(32);
    const tokenProgId = bs58Decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const ataProgId = bs58Decode('ATokenGPvbdGVxr1b2hvZbsiqW5xr25ot9nBqF4CxY9P');

    const mintSeed = crypto.randomBytes(32);
    const mintPubkey = ed25519.getPublicKey(mintSeed);
    const mintSpace = 82;
    const mintRent = await rpcCall(rpc, 'getMinimumBalanceForRentExemption', [mintSpace]);
    const ataPubkey = await findAtaAddress(recipientPk, mintPubkey, tokenProgId, ataProgId);

    // Tx 1: CreateAccount + InitializeMint2 (2 signers: payer + mint)
    const createAcctData = new Uint8Array(4 + 8 + 8 + 32);
    createAcctData.set(u64LeBytes(mintRent), 4);
    createAcctData.set(u64LeBytes(mintSpace), 12);
    createAcctData.set(tokenProgId, 20);

    const initMintData = new Uint8Array(35);
    initMintData[0] = 19; initMintData[1] = 0;
    initMintData.set(payerPubkey, 2);
    initMintData[34] = 0;

    const bh1 = await rpcCall(rpc, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
    const bhBytes1 = bs58Decode(bh1.value.blockhash);
    const accts1 = [payerPubkey, mintPubkey, sysProgId, tokenProgId];
    const hdr1 = new Uint8Array([2, 0, 1]);
    const tx1 = buildTx(
      [{ seed: payerSeed, pubkey: payerPubkey }, { seed: mintSeed, pubkey: mintPubkey }],
      accts1, hdr1, bhBytes1,
      [{ programIdIndex: 2, accounts: [0, 1], data: createAcctData },
       { programIdIndex: 3, accounts: [1], data: initMintData }],
      ed25519
    );
    const sig1 = await rpcCall(rpc, 'sendTransaction', [uint8ArrayToBase64(tx1), { encoding: 'base64', skipPreflight: true }]);

    // Tx 2: CreateAssociatedTokenAccount (1 signer: payer)
    // ATA program instruction expects: [funding, ata, wallet, mint, sysprog, tokenprog]
    // Accounts reordered so readonly come before writable-unsigned in the message header:
    // [funding(0/signer/writable), wallet(1/readonly), mint(2/readonly), sysprog(3/readonly), tokenprog(4/readonly), ataProg(5/readonly), ata(6/writable)]
    // Instruction: programIdIndex=5, accounts=[0,6,1,2,3,4]
    const bh2 = await rpcCall(rpc, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
    const bhBytes2 = bs58Decode(bh2.value.blockhash);
    const accts2 = [payerPubkey, recipientPk, mintPubkey, sysProgId, tokenProgId, ataProgId, ataPubkey];
    const hdr2 = new Uint8Array([1, 0, 5]);
    const tx2 = buildTx(
      [{ seed: payerSeed, pubkey: payerPubkey }],
      accts2, hdr2, bhBytes2,
      [{ programIdIndex: 5, accounts: [0, 6, 1, 2, 3, 4], data: new Uint8Array(0) }],
      ed25519
    );
    const sig2 = await rpcCall(rpc, 'sendTransaction', [uint8ArrayToBase64(tx2), { encoding: 'base64', skipPreflight: true }]);

    // Tx 3: MintTo (1 signer: payer)
    const mintToData = new Uint8Array(9);
    mintToData[0] = 7;
    mintToData.set(u64LeBytes(1), 1);
    const bh3 = await rpcCall(rpc, 'getLatestBlockhash', [{ commitment: 'confirmed' }]);
    const bhBytes3 = bs58Decode(bh3.value.blockhash);
    // Accounts: [payer, tokenProg, mint, ata]
    // header [1,0,1]: payer signer, tokenProg readonly, mint+ata writable unsigned
    const accts3 = [payerPubkey, tokenProgId, mintPubkey, ataPubkey];
    const hdr3 = new Uint8Array([1, 0, 1]);
    const tx3 = buildTx(
      [{ seed: payerSeed, pubkey: payerPubkey }],
      accts3, hdr3, bhBytes3,
      [{ programIdIndex: 1, accounts: [2, 3, 0], data: mintToData }],
      ed25519
    );
    const sig3 = await rpcCall(rpc, 'sendTransaction', [uint8ArrayToBase64(tx3), { encoding: 'base64', skipPreflight: true }]);

    return NextResponse.json({
      ok: true,
      mint: bs58Encode(mintPubkey),
      ata: bs58Encode(ataPubkey),
      signatures: [sig1, sig2, sig3],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
