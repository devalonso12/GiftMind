-- Create gifts table
CREATE TABLE IF NOT EXISTS public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_wallet text NOT NULL,
  recipient_wallet text,
  recipient_social_handle text,
  recipient_social_platform text,
  gift_type text,
  gift_amount numeric,
  gift_token text,
  sender_message text,
  ai_explanation text,
  social_signals jsonb,
  wallet_signals jsonb,
  relationship text,
  claim_code text UNIQUE,
  status text DEFAULT 'pending',
  transaction_signature text,
  created_at timestamptz DEFAULT now(),
  claimed_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gifts_sender_wallet ON public.gifts (sender_wallet);
CREATE INDEX IF NOT EXISTS idx_gifts_claim_code ON public.gifts (claim_code);

-- NFT metadata columns used by the finalize worker and metadata endpoint.
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS gift_name text;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS gift_symbol text;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS attributes_json text;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS seller_fee_basis_points integer DEFAULT 0;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS creators jsonb;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS metadata_uri text;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS metadata_pda text;
