import { checkSupabaseReady } from '../../../lib/supabase-client';

export async function GET() {
  const status = await checkSupabaseReady();
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
