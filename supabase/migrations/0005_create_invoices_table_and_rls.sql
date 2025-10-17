CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, sent, paid, void
  total_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select" ON public.invoices
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "invoices_insert" ON public.invoices
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_update" ON public.invoices
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "invoices_delete" ON public.invoices
FOR DELETE TO authenticated USING (auth.uid() = user_id);