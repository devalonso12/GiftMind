import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;
function getAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE || '';
    if (!url || !key) throw new Error('Supabase not configured');
    _admin = createClient(url, key);
  }
  return _admin;
}

function parseSecretKey(envVal?: string) {
  if (!envVal) return null;
  try {
    // Expect a JSON array string like "[1,2,3,...]"
    const parsed = JSON.parse(envVal);
    if (Array.isArray(parsed)) return Uint8Array.from(parsed);
  } catch {
    // ignore
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, status, transactionSignature, claim_code, recipient_wallet } = body || {};
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

    // If claiming, validate claim_code then update DB (on-chain payout handled separately)
    if (status === 'claimed') {
      const { data: gift, error: fetchErr } = await getAdmin()
        .from('gifts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr) return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 });
      if (!gift) return new Response(JSON.stringify({ error: 'Gift not found' }), { status: 404 });
      if (gift.status === 'claimed') return new Response(JSON.stringify({ data: gift }), { status: 200 });

      // Require valid claim_code to authorize mark-as-claimed
      if (!claim_code || String(claim_code) !== String(gift.claim_code)) {
        return new Response(JSON.stringify({ error: 'Invalid or missing claim_code' }), { status: 403 });
      }

      if (!recipient_wallet) {
        return new Response(JSON.stringify({ error: 'Connect a wallet before claiming this gift' }), { status: 400 });
      }

      if (gift.recipient_wallet && String(gift.recipient_wallet) !== String(recipient_wallet)) {
        return new Response(JSON.stringify({ error: 'Connected wallet does not match this gift recipient' }), { status: 403 });
      }

      const updateData: Record<string, unknown> = {
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        recipient_wallet
      };
      if (transactionSignature) updateData.transaction_signature = transactionSignature;

      const { data, error } = await getAdmin()
        .from('gifts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      return new Response(JSON.stringify({ data }), { status: 200 });
    }

    // For non-claim updates (completed, etc.) just update DB
    const updateData: Record<string, unknown> = { status };
    if (transactionSignature) updateData.transaction_signature = transactionSignature;
    if (status === 'claimed') updateData.claimed_at = new Date().toISOString();

    const { data, error } = await getAdmin()
      .from('gifts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}
