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
}) {
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

  const { data, error } = await supabase
    .from('gifts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function claimGift(id: string) {
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
