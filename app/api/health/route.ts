import { checkSupabaseReady } from '../../../lib/supabase-client';

export async function GET() {
  try {
    const status = await checkSupabaseReady();
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
