CREATE TABLE IF NOT EXISTS public.order_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('initial', 'signed', 'signer_id')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_documents_select" ON public.order_documents
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "order_documents_insert" ON public.order_documents
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_documents_update" ON public.order_documents
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "order_documents_delete" ON public.order_documents
FOR DELETE TO authenticated USING (auth.uid() = user_id);