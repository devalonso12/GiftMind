#!/usr/bin/env node
/*
 * Worker script to finalize payouts from escrow for claimed gifts.
 * Usage: node scripts/finalize_payouts.js
 * Reads env vars from process.env or .env.local if present.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, Connection, clusterApiUrl } = require('@solana/web3.js');

const LAMPORTS_PER_SOL = 1_000_000_000;

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2] || '';
    // strip surrounding quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

function parseSecretKey(envVal) {
  if (!envVal) return null;
  const bs58 = require('bs58');
  let v = envVal.trim();
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return Uint8Array.from(parsed);
  } catch (e) {
    // fallback: try splitting by comma, then base58
    const cleaned = v.replace(/\[|\]|\s/g, '');
    const parts = cleaned.split(',').map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n));
    if (parts.length > 0) return Uint8Array.from(parts);
  }
  try {
    return bs58.decode(v);
  } catch {
    return null;
  }
  return null;
}

function isMissingColumnError(error) {
  return Boolean(error?.message && /column|schema cache/i.test(error.message));
}

async function updateGiftWithFallback(supabase, id, fullUpdate, fallbackUpdate) {
  const { error } = await supabase
    .from('gifts')
    .update(fullUpdate)
    .eq('id', id)
    .select()
    .single();

  if (!error || !isMissingColumnError(error)) return error;

  const { error: fallbackError } = await supabase
    .from('gifts')
    .update(fallbackUpdate)
    .eq('id', id)
    .select()
    .single();

  return fallbackError;
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or service role key in env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Load escrow key
  const secretRaw = process.env.SOLANA_ESCROW_SECRET_KEY || process.env.SOLANA_ESCROW_SECRET;
  const secret = parseSecretKey(secretRaw);
  if (!secret) {
    console.error('Escrow secret key not found in env or .env.local (SOLANA_ESCROW_SECRET_KEY)');
    process.exit(2);
  }
  const escrow = Keypair.fromSecretKey(secret);

  const connection = new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed');
  const splToken = require('@solana/spl-token');

  console.log('Connecting to Supabase and scanning for claimed gifts needing payout...');
  const { data: gifts, error } = await supabase
    .from('gifts')
    .select('*')
    .eq('status', 'claimed')
    .limit(100);

  if (error) {
    console.error('Supabase query error:', error.message || error);
    process.exit(3);
  }

  if (!gifts || gifts.length === 0) {
    console.log('No claimed gifts pending payouts.');
    return;
  }

  console.log(`Found ${gifts.length} gift(s) to process.`);

  console.log('Starting payouts run.');

  for (const gift of gifts) {
    try {
      const id = gift.id;
      const recipient = gift.recipient_wallet;
      const amount = Number(gift.gift_amount || 0);
      const giftType = (gift.gift_type || 'SOL').toString().toLowerCase();

      if (!recipient) {
        console.log(`Skipping ${id}: missing recipient wallet.`);
        await supabase.from('gifts').update({ status: 'failed' }).eq('id', id);
        continue;
      }

      // validate recipient public key early to avoid runtime errors
      let recipientPub;
      try {
        recipientPub = new PublicKey(recipient);
      } catch (pkErr) {
        console.error(`Invalid recipient public key for ${id}:`, pkErr?.message || pkErr);
        await supabase.from('gifts').update({ status: 'failed' }).eq('id', id);
        continue;
      }

      try {
        if (giftType === 'sol' || gift.gift_token === 'SOL') {
          if (!amount || amount <= 0) {
            console.log(`Skipping ${id}: invalid SOL amount.`);
            continue;
          }

          const lamports = Math.round(amount * LAMPORTS_PER_SOL);
          const currentBalance = await connection.getBalance(escrow.publicKey);
          if (currentBalance < lamports) {
            console.error(`Insufficient escrow SOL for gift ${id} (needs ${lamports} lamports).`);
            continue;
          }

          const recipientBalance = await connection.getBalance(recipientPub);
          const minimumAccountBalance = await connection.getMinimumBalanceForRentExemption(0);
          if (recipientBalance === 0 && lamports < minimumAccountBalance) {
            console.error(`Skipping ${id}: amount is too small to fund a new recipient account rent-exempt.`);
            await supabase.from('gifts').update({ status: 'failed' }).eq('id', id);
            continue;
          }

          console.log(`Sending ${amount} SOL to ${recipient} for gift ${id}...`);
          const toPub = recipientPub;
          const tx = new Transaction().add(
            SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: toPub, lamports })
          );

          const signature = await sendAndConfirmTransaction(connection, tx, [escrow]);
          console.log('SOL transfer confirmed. Signature:', signature);

          const { data, error: updErr } = await supabase
            .from('gifts')
            .update({ transaction_signature: signature, status: 'completed', claimed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

          if (updErr) console.error('Failed to update gift record', id, updErr.message || updErr);
          else console.log('Gift updated in DB:', id);
        } else if (giftType === 'spl' || (gift.gift_token && gift.gift_token !== 'SOL' && !giftType.startsWith('nft'))) {
          // SPL token transfer: gift.gift_token should be the mint address
          const mintAddr = gift.gift_token;
          if (!mintAddr) {
            console.error(`Skipping ${id}: missing mint address for SPL transfer.`);
            continue;
          }

          console.log(`Performing SPL transfer for gift ${id} (${amount} tokens of ${mintAddr}) to ${recipient}...`);
          const mintPub = new PublicKey(mintAddr);

          // fetch mint to get decimals
          let decimals = 0;
          try {
            const mintInfo = await splToken.getMint(connection, mintPub);
            decimals = mintInfo.decimals || 0;
          } catch (mErr) {
            console.warn('Could not fetch mint info, assuming 0 decimals', mErr?.message || mErr);
          }

          const scaledAmount = Math.round((amount || 0) * Math.pow(10, decimals));
          if (!scaledAmount || scaledAmount <= 0) {
            console.error(`Skipping ${id}: invalid SPL transfer amount (${amount}).`);
            continue;
          }

          // ensure escrow has ATA with balance
          const fromAta = await splToken.getOrCreateAssociatedTokenAccount(connection, escrow, mintPub, escrow.publicKey);
          const tokenBal = Number((await connection.getTokenAccountBalance(fromAta.address)).value.amount || 0);
          if (tokenBal < scaledAmount) {
            console.error(`Escrow token balance low for gift ${id} (has ${tokenBal}, needs ${scaledAmount}).`);
            continue;
          }

          const toAta = await splToken.getOrCreateAssociatedTokenAccount(connection, escrow, mintPub, recipientPub);
          const sig = await splToken.transfer(connection, escrow, fromAta.address, toAta.address, escrow.publicKey, scaledAmount);
          console.log('SPL transfer signature:', sig);

          const { error: updErr } = await supabase
            .from('gifts')
            .update({ transaction_signature: sig, status: 'completed', claimed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          if (updErr) console.error('Failed to update gift record', id, updErr.message || updErr);
          else console.log('SPL gift completed:', id);
        } else if (giftType === 'nft' || gift.gift_type.toLowerCase().startsWith('nft')) {
          // Mint a new NFT-like token (decimals=0, supply=1) and deliver to recipient, then create Metaplex metadata if available
          console.log(`Minting NFT for gift ${id} and sending to ${recipient}...`);
          const decimals = 0;
          const mint = await splToken.createMint(connection, escrow, escrow.publicKey, null, decimals);
          const toAta = await splToken.getOrCreateAssociatedTokenAccount(connection, escrow, mint, new PublicKey(recipient));
          const sig = await splToken.mintTo(connection, escrow, mint, toAta.address, escrow.publicKey, 1);
          console.log('Minted NFT mint:', mint.toBase58(), 'tx:', sig);

          const appBase = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          let metadataUri = gift.metadata_uri || `${appBase.replace(/\/$/, '')}/api/nft-metadata/${id}`;

          // Try to create Metaplex metadata (optional dependency)
          try {
            // optionally upload metadata to IPFS using nft.storage when API key provided
            if (!gift.metadata_uri && process.env.NFT_STORAGE_API_KEY) {
              try {
                const { NFTStorage, File } = require('nft.storage');
                const nftClient = new NFTStorage({ token: process.env.NFT_STORAGE_API_KEY });

                // attempt to fetch image and include it in the metadata upload
                let imageFile = undefined;
                const imageUrl = gift.image_url || gift.image || process.env.DEFAULT_NFT_IMAGE;
                if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
                  try {
                    const resp = await fetch(imageUrl);
                    if (resp.ok) {
                      const arrayBuffer = await resp.arrayBuffer();
                      const buffer = Buffer.from(arrayBuffer);
                      const contentType = resp.headers.get('content-type') || 'application/octet-stream';
                      // derive extension from content-type
                      let ext = 'png';
                      const mt = contentType.match(/image\/(\w+)/i);
                      if (mt && mt[1]) ext = mt[1];
                      imageFile = new File([buffer], `image.${ext}`, { type: contentType });
                    } else {
                      console.warn('Failed to fetch image for IPFS upload:', resp.status);
                    }
                  } catch (fErr) {
                    console.warn('Image fetch failed for IPFS upload:', fErr?.message || fErr);
                  }
                }

                const metadataToStore = {
                  name: (gift.gift_name || gift.title || `Gift-${id}`).slice(0, 32),
                  description: gift.description || `A gift from Giftmind (${id})`,
                  image: imageFile,
                  properties: gift.attributes_json ? { attributes: (() => { try { return JSON.parse(gift.attributes_json); } catch { return []; } })() } : {}
                };

                const stored = await nftClient.store(metadataToStore);
                // stored.url is like ipfs://bafy.../metadata.json
                metadataUri = stored.url || `ipfs://${stored.ipnft}/metadata.json`;
                console.log('Uploaded metadata to IPFS:', metadataUri);

                // persist metadata uri to DB so create metadata uses the IPFS URI
                await supabase.from('gifts').update({ metadata_uri: metadataUri }).eq('id', id);
              } catch (ipfsErr) {
                console.warn('IPFS upload failed, falling back to hosted metadata:', ipfsErr?.message || ipfsErr);
              }
            }

            const mpl = await import('@metaplex-foundation/mpl-token-metadata');
            if (typeof mpl.createCreateMetadataAccountV2Instruction !== 'function') {
              throw new Error('Installed mpl-token-metadata package does not expose legacy web3 metadata instruction');
            }
            const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
            const [metadataPDA] = await PublicKey.findProgramAddress(
              [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
              TOKEN_METADATA_PROGRAM_ID
            );

            const metadataData = {
              name: (gift.gift_name || gift.title || `Gift-${id}`).slice(0, 32),
              symbol: (gift.gift_symbol || 'GFT').slice(0, 10),
              uri: metadataUri,
              sellerFeeBasisPoints: Number(gift.seller_fee_basis_points || 0),
              creators: null,
              collection: null,
              uses: null
            };

            const ix = mpl.createCreateMetadataAccountV2Instruction(
              {
                metadata: metadataPDA,
                mint: mint,
                mintAuthority: escrow.publicKey,
                payer: escrow.publicKey,
                updateAuthority: escrow.publicKey,
              },
              {
                createMetadataAccountArgsV2: {
                  data: metadataData,
                  isMutable: true
                }
              }
            );

            const tx2 = new Transaction().add(ix);
            const metaSig = await sendAndConfirmTransaction(connection, tx2, [escrow]);
            console.log('Metadata created with sig', metaSig, 'pda', metadataPDA.toBase58());

            // persist metadata PDA, metadata URI and mint to DB
            const completedAt = new Date().toISOString();
            const metaUpdErr = await updateGiftWithFallback(
              supabase,
              id,
              { gift_token: mint.toBase58(), transaction_signature: sig, metadata_pda: metadataPDA.toBase58(), metadata_uri: metadataUri, status: 'completed', claimed_at: completedAt },
              { gift_token: mint.toBase58(), transaction_signature: sig, status: 'completed', claimed_at: completedAt }
            );
            if (metaUpdErr) console.error('Failed to update gift record with NFT mint+metadata', id, metaUpdErr.message || metaUpdErr);
            else console.log('NFT gift with metadata completed:', id);
          } catch (metaErr) {
            console.warn('Metaplex metadata creation skipped or failed:', metaErr?.message || metaErr);
            const completedAt = new Date().toISOString();
            const updErr = await updateGiftWithFallback(
              supabase,
              id,
              { gift_token: mint.toBase58(), transaction_signature: sig, metadata_uri: metadataUri, status: 'completed', claimed_at: completedAt },
              { gift_token: mint.toBase58(), transaction_signature: sig, status: 'completed', claimed_at: completedAt }
            );
            if (updErr) console.error('Failed to update gift record with NFT mint', id, updErr.message || updErr);
            else console.log('NFT gift completed (no metadata):', id);
          }
        } else {
          console.error(`Unknown gift type for ${id}: ${gift.gift_type}`);
        }
      } catch (innerErr) {
        console.error('Error processing gift', id, innerErr?.message || innerErr);
      }
    } catch (e) {
      console.error('Error processing gift', gift.id, e?.message || e);
    }
  }
}

main().catch(err => {
  console.error('Worker error:', err?.message || err);
  process.exit(1);
});
