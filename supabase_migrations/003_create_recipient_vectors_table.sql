-- Create recipient_vectors table to store profile embeddings and metadata
CREATE TABLE IF NOT EXISTS public.recipient_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text,
  platform text,
  profile jsonb,
  embedding jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipient_vectors_handle ON public.recipient_vectors (handle);
