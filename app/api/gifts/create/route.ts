import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(error?.message && /column|schema cache/i.test(error.message));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sender_wallet,
      recipient_wallet,
      recipient_social_handle,
      recipient_social_platform,
      gift_type,
      gift_amount,
      gift_token,
      sender_message,
      ai_explanation,
      social_signals,
      wallet_signals,
      relationship,
      claim_code,
      gift_name,
      gift_symbol,
      description,
      image_url,
      attributes_json,
      seller_fee_basis_points,
      mint_address,
    } = body || {};

    if (!sender_wallet || !gift_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields: sender_wallet and gift_type' }), { status: 400 });
    }

    const code = claim_code || `claim-${(typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`}`;

    const payload: Record<string, unknown> = {
      sender_wallet,
      recipient_wallet: recipient_wallet || null,
      recipient_social_handle: recipient_social_handle || null,
      recipient_social_platform: recipient_social_platform || null,
      gift_type,
      gift_amount: gift_amount ?? null,
      gift_token: gift_token ?? null,
      sender_message: sender_message ?? null,
      ai_explanation: ai_explanation ?? null,
      social_signals: social_signals ?? null,
      wallet_signals: wallet_signals ?? null,
      relationship: relationship ?? null,
      claim_code: code,
      gift_name: gift_name ?? null,
      gift_symbol: gift_symbol ?? null,
      description: description ?? null,
      image_url: image_url ?? null,
      attributes_json: attributes_json ?? null,
      seller_fee_basis_points: seller_fee_basis_points ?? 0,
      mint_address: mint_address ?? null,
      status: 'created',
      created_at: new Date().toISOString()
    };

    let { data, error } = await supabaseAdmin.from('gifts').insert(payload).select().single();
    if (error && isMissingColumnError(error)) {
      delete payload.gift_name;
      delete payload.gift_symbol;
      delete payload.description;
      delete payload.image_url;
      delete payload.attributes_json;
      delete payload.seller_fee_basis_points;
      delete payload.mint_address;
      ({ data, error } = await supabaseAdmin.from('gifts').insert(payload).select().single());
    }
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}
