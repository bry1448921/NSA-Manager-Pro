CREATE TABLE IF NOT EXISTS public.order_signers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_signers_select" ON public.order_signers
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "order_signers_insert" ON public.order_signers
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_signers_update" ON public.order_signers
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "order_signers_delete" ON public.order_signers
FOR DELETE TO authenticated USING (auth.uid() = user_id);