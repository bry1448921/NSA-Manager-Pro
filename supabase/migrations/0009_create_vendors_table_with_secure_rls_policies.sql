-- Create vendors table
CREATE TABLE public.vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ein TEXT NOT NULL,
  w9_on_file BOOLEAN DEFAULT FALSE,
  w9_file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Policies: users can only manage their own vendors
CREATE POLICY "vendors_select_policy" ON public.vendors 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "vendors_insert_policy" ON public.vendors 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vendors_update_policy" ON public.vendors 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "vendors_delete_policy" ON public.vendors 
FOR DELETE TO authenticated USING (auth.uid() = user_id);