import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createGift(giftData: {
  sender_wallet: string;
  recipient_wallet?: string;
  recipient_social_handle?: string;
  recipient_social_platform?: string;
  gift_type: string;
  gift_amount?: number;
  gift_token?: string;
  sender_message?: string;
  ai_explanation?: string;
  social_signals?: Record<string, unknown>;
  wallet_signals?: Record<string, unknown>;
  relationship?: string;
  claim_code: string;
  gift_name?: string;
  gift_symbol?: string;
  description?: string;
  image_url?: string;
  attributes_json?: string;
  seller_fee_basis_points?: number;
  mint_address?: string;
}) {
  // If running in the browser, route creation through the server endpoint
  if (typeof window !== 'undefined') {
    const resp = await fetch('/api/gifts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(giftData)
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Failed to create gift');
    return json.data;
  }

  const { data, error } = await supabase
    .from('gifts')
    .insert(giftData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGiftByClaimCode(claimCode: string) {
  const { data, error } = await supabase
    .from('gifts')
    .select('*')
    .eq('claim_code', claimCode)
    .single();

  if (error) throw error;
  return data;
}

export async function updateGiftStatus(id: string, status: string, transactionSignature?: string) {
  const updateData: Record<string, unknown> = { status };
  if (transactionSignature) updateData.transaction_signature = transactionSignature;

  // If running in a browser, call the server-side endpoint which uses the service role key.
  if (typeof window !== 'undefined') {
    const resp = await fetch('/api/gifts/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, transactionSignature })
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Failed to update gift status');
    return json.data;
  }

  const { data, error } = await supabase
    .from('gifts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function claimGift(id: string, claimCode?: string, recipientWallet?: string) {
  // Use server endpoint when in browser so we can update using service role key (RLS-safe)
  if (typeof window !== 'undefined') {
    const resp = await fetch('/api/gifts/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'claimed', claim_code: claimCode, recipient_wallet: recipientWallet })
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Failed to claim gift');
    return json.data;
  }

  const { data, error } = await supabase
    .from('gifts')
    .update({
      status: 'claimed',
      claimed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function checkSupabaseReady() {
  try {
    const { data, error } = await supabase.from('gifts').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveWalletInsights(walletAddress: string, insights: Record<string, unknown> | unknown) {
  try {
    const payload = {
      wallet_address: walletAddress,
      insights,
      created_at: new Date().toISOString()
    } as any;

    const { data, error } = await supabase
      .from('wallet_insights')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    throw err;
  }
}

export async function sendNotification(params: {
  giftId: string
  recipient: string
  type?: string
  subject?: string
  body?: string
}) {
  const resp = await fetch('/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const json = await resp.json()
  if (!resp.ok) throw new Error(json?.error || 'Failed to send notification')
  return json
}

export async function linkWalletToProfile(userId: string, walletAddress: string) {
  const resp = await fetch('/api/auth/link-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, walletAddress })
  })
  const json = await resp.json()
  if (!resp.ok) throw new Error(json?.error || 'Failed to link wallet')
  return json
}
