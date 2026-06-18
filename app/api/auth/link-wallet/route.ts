import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { userId, walletAddress } = await req.json()

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: 'Missing walletAddress' }), { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || ''
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (userId) {
      // Link to existing auth user
      const { error } = await supabase.from('profiles').upsert(
        { id: userId, wallet_address: walletAddress, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    } else {
      // Upsert profile by wallet address (wallet-as-identity)
      const { error } = await supabase.from('profiles').upsert(
        { wallet_address: walletAddress, display_name: walletAddress.slice(0, 8), updated_at: new Date().toISOString() },
        { onConflict: 'wallet_address' }
      )
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 })
  }
}
