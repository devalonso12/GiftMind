-- Create wallet_insights table
CREATE TABLE IF NOT EXISTS public.wallet_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  insights jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_insights_wallet ON public.wallet_insights (wallet_address);
