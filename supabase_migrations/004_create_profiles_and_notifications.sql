CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text UNIQUE,
  display_name text,
  email text,
  notification_email boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles (wallet_address);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'email',
  channel text NOT NULL DEFAULT 'email',
  recipient text NOT NULL,
  subject text,
  body text,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  related_gift_id uuid REFERENCES public.gifts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications (status);

ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS sender_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS recipient_email text;

CREATE INDEX IF NOT EXISTS idx_gifts_sender_user ON public.gifts (sender_user_id);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient_email ON public.gifts (recipient_email);
CREATE INDEX IF NOT EXISTS idx_gifts_status_created ON public.gifts (status, created_at);
