import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: gift, error } = await supabase.from('gifts').select('*').eq('id', id).maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message || error }), { status: 500 });
    }

    const name = gift?.gift_name || gift?.title || `Gift-${id}`;
    const symbol = gift?.gift_symbol || 'GFT';
    const description = gift?.description || `A gift from Giftmind (${id})`;
    const image = gift?.image_url || gift?.image || (process.env.DEFAULT_NFT_IMAGE || 'https://placehold.co/600x600');
    const external_url = process.env.SITE_URL || process.env.APP_BASE_URL || 'https://example.com';

    const metadata = {
      name,
      symbol,
      description,
      image,
      external_url,
      attributes: gift?.attributes_json ? JSON.parse(gift.attributes_json) : [],
      seller_fee_basis_points: Number(gift?.seller_fee_basis_points || 0),
      properties: {
        files: [{ uri: image, type: 'image/png' }],
        category: 'image',
        creators: gift?.creators || null
      }
    };

    return new Response(JSON.stringify(metadata), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}
