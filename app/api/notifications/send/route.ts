import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || ''

export async function POST(req: Request) {
  try {
    const { gift_id, type, recipient, subject, body } = await req.json()

    if (!gift_id || !recipient) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Notifications disabled: Supabase service key not configured')
      return new Response(JSON.stringify({ ok: true, note: 'Notifications disabled' }), { status: 200 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Queue the notification
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: type || 'email',
        channel: type || 'email',
        recipient,
        subject,
        body,
        status: 'pending',
        related_gift_id: gift_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    // Attempt to send via console (placeholder for real provider like Resend/SendGrid)
    console.log(`[Notification] To: ${recipient} | Subject: ${subject || '(no subject)'} | Gift: ${gift_id}`)

    // Mark as sent
    await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', data.id)

    return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 })
  }
}
