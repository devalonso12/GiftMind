import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-runner-secret') || '';
    const expected = process.env.RUNNER_HOOK_SECRET || process.env.SUPABASE_SECRET_KEY || '';
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pendingGifts, error: fetchError } = await supabase
      .from('gifts')
      .select('*')
      .in('status', ['pending', 'completed'])
      .is('claimed_at', null)
      .limit(50);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const now = new Date().toISOString();
    const results = [];

    for (const gift of pendingGifts || []) {
      const { error: updateError } = await supabase
        .from('gifts')
        .update({ status: 'expired', updated_at: now })
        .eq('id', gift.id)
        .eq('status', gift.status);

      results.push({
        id: gift.id,
        claim_code: gift.claim_code,
        updated: !updateError,
        error: updateError?.message || null,
      });
    }

    return NextResponse.json({ finalized: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
