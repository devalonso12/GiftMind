#!/usr/bin/env node
/**
 * Insert a test gift row into Supabase and mark it claimed so the finalize worker picks it up.
 * Usage: node scripts/insert_test_gift.js [amount] [sol|nft] [recipient_wallet]
 */
const { createClient } = require('@supabase/supabase-js');
const { Keypair } = require('@solana/web3.js');
const path = require('path');
const fs = require('fs');

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2] || '';
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

function isMissingColumnError(error) {
  return Boolean(error?.message && /column|schema cache/i.test(error.message));
}

async function main() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase service role key not found in env. Set SUPABASE_SECRET_KEY.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const amountArg = process.argv[2] || '0.05';
  const amount = parseFloat(amountArg) || 0.05;
  const giftType = (process.argv[3] || 'sol').toLowerCase();
  const providedRecipient = process.argv[4];

  // generate a recipient keypair for testing
  const recipient = providedRecipient ? null : Keypair.generate();
  const recipientPub = providedRecipient || recipient.publicKey.toBase58();

  // sender: use escrow pubkey if available, otherwise random
  const sender = process.env.NEXT_PUBLIC_SOLANA_ESCROW_PUBLIC_KEY || Keypair.generate().publicKey.toBase58();

  const claimCode = `test-claim-${Date.now()}`;

  const payload = {
    sender_wallet: sender,
    recipient_wallet: recipientPub,
    gift_type: giftType,
    gift_amount: giftType === 'nft' ? 1 : amount,
    gift_token: giftType === 'nft' ? 'NFT' : 'SOL',
    claim_code: claimCode,
    status: 'claimed',
    created_at: new Date().toISOString(),
    claimed_at: new Date().toISOString()
  };

  if (giftType === 'nft') {
    Object.assign(payload, {
      gift_name: 'GiftMind Test NFT',
      gift_symbol: 'GFT',
      description: 'A test NFT gift minted by the GiftMind finalize worker.',
      image_url: process.env.DEFAULT_NFT_IMAGE || 'https://placehold.co/600x600/png',
      attributes_json: JSON.stringify([
        { trait_type: 'Source', value: 'GiftMind test script' },
        { trait_type: 'Network', value: 'Solana devnet' }
      ]),
      seller_fee_basis_points: 0
    });
  }

  console.log('Inserting test gift:', payload);
  let { data, error } = await supabase.from('gifts').insert(payload).select().single();
  if (error && isMissingColumnError(error)) {
    console.warn('Metadata columns are not available yet; retrying insert without optional NFT metadata.');
    delete payload.gift_name;
    delete payload.gift_symbol;
    delete payload.description;
    delete payload.image_url;
    delete payload.attributes_json;
    delete payload.seller_fee_basis_points;
    ({ data, error } = await supabase.from('gifts').insert(payload).select().single());
  }
  if (error) {
    console.error('Insert failed:', error.message || error);
    process.exit(2);
  }

  console.log('Inserted gift id:', data.id, 'claim_code:', data.claim_code, 'recipient:', recipientPub);
  console.log('You can watch the worker run to finalize this gift.');
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});
